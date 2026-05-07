const fs   = require('fs');
const path = require('path');

const ROOT        = path.join(__dirname, '..');
const DATA_FILE   = path.join(ROOT, 'klippekort.json');
const REPORT_FILE = path.join(ROOT, 'priority-report.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    console.error('klippekort.json ikke fundet. Kør fra Uddannelsessystem-mappen.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function dageAlt(datoStr) {
  const ms = new Date(datoStr) - new Date();
  return Math.ceil(ms / 86400000);
}

function formatDato(datoStr) {
  if (!datoStr || datoStr === 'UDFYLD') return '—';
  const d = new Date(datoStr);
  return d.toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusCmd() {
  const data = load();

  console.log('\n=== KLIPPEKORT ===\n');
  for (const k of data.kort) {
    const slut = k.slut !== 'UDFYLD' ? `${formatDato(k.slut)} (om ${dageAlt(k.slut)} dage)` : '—';
    const frist = k.betalingsFrist !== 'UDFYLD' ? `${formatDato(k.betalingsFrist)} (om ${dageAlt(k.betalingsFrist)} dage)` : '—';
    console.log(`Kort #${k.id}: ${k.konsulent}`);
    console.log(`  Start:          ${formatDato(k.start)}`);
    console.log(`  Deltager skifter: ${slut}`);
    console.log(`  Betaling:       ${frist}`);
    console.log();
  }

  console.log('=== KØ ===\n');
  if (data.koe.length === 0) {
    console.log('  (tom)');
  } else {
    data.koe.forEach((navn, i) => console.log(`  ${i + 1}. ${navn}`));
  }

  console.log('\n=== KOMMANDOER ===');
  console.log('  node src/klippekort.js roter <1|2>     — Rotér kort til næste i kø');
  console.log('  node src/klippekort.js koe list        — Vis kø');
  console.log('  node src/klippekort.js koe add "Navn"  — Tilføj til kø');
  console.log('  node src/klippekort.js koe rm "Navn"   — Fjern fra kø\n');
}

function roterCmd(kortId) {
  const data = load();
  const kort = data.kort.find(k => k.id === parseInt(kortId));
  if (!kort) {
    console.error(`Kort #${kortId} ikke fundet.`);
    process.exit(1);
  }
  if (data.koe.length === 0) {
    console.error('Køen er tom — ingen at rotere til.');
    process.exit(1);
  }

  const forrige = kort.konsulent;
  const naeste  = data.koe.shift();

  if (forrige && forrige !== 'UDFYLD') {
    data.koe.push(forrige);
  }

  const startDato = new Date();
  const slutDato  = new Date(startDato);
  slutDato.setMonth(slutDato.getMonth() + 6);
  const fornyDato = new Date(startDato);
  fornyDato.setMonth(fornyDato.getMonth() + 5);

  kort.konsulent  = naeste;
  kort.start      = startDato.toISOString().slice(0, 10);
  kort.slut       = slutDato.toISOString().slice(0, 10);
  kort.betalingsFrist = fornyDato.toISOString().slice(0, 10);

  save(data);

  console.log(`\nKort #${kortId} roteret:`);
  console.log(`  Var:  ${forrige}`);
  console.log(`  Nu:   ${naeste}`);
  console.log(`  Slut: ${formatDato(kort.slut)}`);

  // Hent prioriteter til aktiveringsbesked
  let prios = [];
  if (fs.existsSync(REPORT_FILE)) {
    const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
    const konsulent = report.find(k => k.navn === naeste);
    if (konsulent) {
      prios = konsulent.prioritized
        .filter(p => p.status !== 'bestået')
        .slice(0, 5)
        .map(p => `Prio ${p.prioritet}: ${p.examCode}`);
    }
  }

  // Byg aktiveringsbesked
  const prioTekst = prios.length > 0
    ? '\n\nDine prioriterede eksamener:\n' + prios.map(p => `  • ${p}`).join('\n')
    : '';

  console.log('\n--- AKTIVERINGSBESKED TIL KONSULENT ---');
  console.log(`Hej ${naeste}! Dit Readynez-klippekort er aktivt fra i dag frem til ${formatDato(kort.slut)}.`);
  console.log(`Kortet giver dig adgang til alle Microsoft Learn-kurser i 6 måneder.${prioTekst}`);
  console.log('---------------------------------------\n');

  // Send Teams-besked hvis webhook er konfigureret
  const webhook = data.teams?.webhook;
  if (webhook) {
    const { sendTeams } = require('./notify');
    const besked = `**🎓 Readynez-klippekort aktiveret — ${naeste}**\n\nKort #${kortId} er nu aktivt frem til **${formatDato(kort.slut)}**.${prioTekst ? '\n\n' + prios.map(p => `• ${p}`).join('\n') : ''}`;
    sendTeams(webhook, besked).then(() => console.log('Teams-besked sendt.'));
  } else {
    console.log('(Teams webhook ikke konfigureret — besked ikke sendt)');
  }
}

function koeCmd(args) {
  const sub  = args[0];
  const navn = args.slice(1).join(' ');
  const data = load();

  if (!sub || sub === 'list') {
    if (data.koe.length === 0) {
      console.log('\nKøen er tom.');
    } else {
      console.log('\nAktuel kø:');
      data.koe.forEach((n, i) => console.log(`  ${i + 1}. ${n}`));
    }
    return;
  }

  if (sub === 'add') {
    if (!navn) { console.error('Angiv navn: node src/klippekort.js koe add "Fuldt Navn"'); process.exit(1); }
    if (data.koe.includes(navn)) { console.log(`${navn} er allerede i køen.`); return; }
    data.koe.push(navn);
    save(data);
    console.log(`${navn} tilføjet til køen (position ${data.koe.length}).`);
    return;
  }

  if (sub === 'rm' || sub === 'remove') {
    if (!navn) { console.error('Angiv navn: node src/klippekort.js koe rm "Fuldt Navn"'); process.exit(1); }
    const idx = data.koe.indexOf(navn);
    if (idx === -1) { console.log(`${navn} ikke fundet i køen.`); return; }
    data.koe.splice(idx, 1);
    save(data);
    console.log(`${navn} fjernet fra køen.`);
    return;
  }

  console.error(`Ukendt kø-kommando: ${sub}`);
}

const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'roter':  roterCmd(args[0]); break;
  case 'koe':    koeCmd(args); break;
  default:       statusCmd(); break;
}
