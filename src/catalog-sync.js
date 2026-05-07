// Tjekker MS Learn for pensionerings- og lukningsstatus på alle eksamener
// i priority-report.json. Skriver catalog-check.json som notify.js læser,
// og sender advarselsmails direkte til konsulenter med aktivt klippekort.
const fs             = require('fs');
const path           = require('path');
const { execFileSync } = require('child_process');
const os             = require('os');

const ROOT         = path.join(__dirname, '..');
const REPORT_FILE  = path.join(ROOT, 'priority-report.json');
const CATALOG_FILE = path.join(ROOT, 'catalog-check.json');
const KORT_FILE    = path.join(ROOT, 'klippekort.json');
const LOG_FILE     = path.join(ROOT, 'notify-runner.log');
const LOGO_FILE    = path.join(ROOT, 'logo-b64.txt');

const EXAM_URL  = kode =>
  `https://learn.microsoft.com/en-us/credentials/certifications/exams/${kode.toLowerCase()}/`;
const BRAND     = '#0D93D2';

function log(msg) {
  const line = `${new Date().toISOString()} [catalog-sync] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function dageAlt(datoStr) {
  return Math.ceil((new Date(datoStr) - new Date()) / 86400000);
}

function formatDato(d) {
  return new Date(d).toLocaleDateString('da-DK', { day: '2-digit', month: 'long', year: 'numeric' });
}

function erAktivtKort(kort) {
  const nu  = new Date();
  const fra = new Date(kort.start);
  const til = new Date(kort.slut);
  return fra <= nu && nu <= til;
}

// ---- Email ----------------------------------------------------------------

function sendMail(to, cc, subject, htmlBody) {
  const bodyFile = path.join(os.tmpdir(), 'cs-mail-body.html');
  const psFile   = path.join(os.tmpdir(), 'cs-mail-send.ps1');
  fs.writeFileSync(bodyFile, htmlBody, 'utf8');
  const ccLine = cc ? `$mail.CC = '${cc}'` : '';
  const ps = `
$ErrorActionPreference = 'Stop'
$body = [System.IO.File]::ReadAllText('${bodyFile.replace(/\\/g, '\\\\')}', [System.Text.Encoding]::UTF8)
$outlook = New-Object -ComObject Outlook.Application
$mail = $outlook.CreateItem(0)
$mail.Subject = '${subject.replace(/'/g, "''")}'
$mail.To = '${to}'
${ccLine}
$mail.HTMLBody = $body
$mail.Send()
Write-Output 'SENDT'
`.trim();
  fs.writeFileSync(psFile, ps, 'utf8');
  try {
    return execFileSync('powershell', ['-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', psFile], {
      encoding: 'utf8', timeout: 30000
    }).trim();
  } finally {
    try { fs.unlinkSync(bodyFile); } catch {}
    try { fs.unlinkSync(psFile); } catch {}
  }
}

function buildAdvarselsmail(navn, kode, status, retirementDate, replacement, prioritet) {
  const fornavn  = navn.split(' ')[0];
  const logob64  = fs.existsSync(LOGO_FILE) ? fs.readFileSync(LOGO_FILE, 'utf8').trim() : '';
  const logoImg  = logob64
    ? `<img src="data:image/png;base64,${logob64}" alt="zentura" height="40" style="display:block">`
    : '';

  const erLukket = status === 'lukket';

  const overskrift = erLukket
    ? `Eksamen ${kode} er ikke længere tilgaengelig`
    : `Eksamen ${kode} pensioneres om ${dageAlt(retirementDate)} dage`;

  const forklaring = erLukket
    ? `<strong>${kode}</strong> blev pensioneret af Microsoft den <strong>${formatDato(retirementDate)}</strong> og er ikke laengere tilgaengelig som eksamen.`
    : `<strong>${kode}</strong> pensioneres af Microsoft den <strong>${formatDato(retirementDate)}</strong>. Herefter kan eksamen ikke laengere aflaegges.`;

  const erstatning = replacement
    ? `<p style="margin:12px 0 0 0;font-size:14px;color:#374151">Microsoft anbefaler at skifte til <strong style="color:${BRAND}">${replacement}</strong> som erstatning.</p>`
    : `<p style="margin:12px 0 0 0;font-size:14px;color:#374151">Microsoft har ikke annonceret en direkte erstatning endnu.</p>`;

  const hvadGor = `
    <tr><td style="padding:0 40px 28px">
      <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px">Hvad skal du gore?</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <tr><td style="padding:16px 20px;font-size:14px;color:#374151;line-height:1.7">
          <p style="margin:0 0 8px 0">1. <strong>Kontakt Readynez</strong> og informer dem om, at du oensker at aendre din laeringsplan.</p>
          <p style="margin:0 0 8px 0">2. <strong>Aftal med Tony</strong> hvilken eksamen der skal erstatte ${kode} i dine prioriteter.</p>
          <p style="margin:0">3. Har du allerede paabegyndt forberedelse til ${kode}? Din adgang til relaterede kurser paa Readynez er stadig aktiv.</p>
        </td></tr>
      </table>
    </td></tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f6;font-family:Inter,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f6;padding:32px 16px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

  <tr><td style="padding:20px 32px 18px;border-bottom:3px solid #e53e3e">
    ${logoImg}
  </td></tr>

  <tr><td style="padding:32px 40px 24px">
    <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280">Hej ${fornavn},</p>
    <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;line-height:1.3">${overskrift}</h1>
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7">${forklaring}</p>
    ${erstatning}
  </td></tr>

  <tr><td style="padding:0 40px 24px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fee2e2;background:#fff5f5;border-radius:8px;overflow:hidden">
      <tr><td style="padding:14px 20px">
        <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:.5px">Berort prioritet</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#1a1a2e">#${prioritet} &mdash; ${kode}</p>
      </td></tr>
    </table>
  </td></tr>

  ${hvadGor}

  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 32px">
    <p style="margin:0;font-size:12px;color:#9ca3af">Sporgsmal? Kontakt <a href="mailto:tony.andersen@zentura.dk" style="color:${BRAND};text-decoration:none">tony.andersen@zentura.dk</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

// ---- MS Learn tjek --------------------------------------------------------

async function tjekEksamen(kode) {
  const url = EXAM_URL(kode);
  let html;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (res.status === 404) return { kode, status: 'ikke-fundet' };
    html = await res.text();
  } catch {
    return { kode, status: 'fejl' };
  }

  const retireMeta = html.match(/<meta\s+name="retirementDate"\s+content="([^"]+)"/i);
  if (!retireMeta) return { kode, status: 'aktiv' };

  const retirementDate = retireMeta[1].slice(0, 10);
  const dage           = dageAlt(retirementDate);
  const superMeta      = html.match(/<meta\s+name="supersededBy"\s+content="([^"]+)"/i);
  const superText      = html.match(/replaced by[^<]{0,60}([A-Z]{2}-\d{3})/i);
  const replacement    = superMeta?.[1] || superText?.[1] || null;

  return { kode, status: dage < 0 ? 'lukket' : 'pensioneres', retirementDate, dage, replacement };
}

// ---- Hoved ---------------------------------------------------------------

async function main() {
  if (!fs.existsSync(REPORT_FILE)) {
    log('priority-report.json mangler - springer over');
    return;
  }

  const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
  const kortData = fs.existsSync(KORT_FILE)
    ? JSON.parse(fs.readFileSync(KORT_FILE, 'utf8'))
    : null;

  // Saml aktive eksamen-koder (ikke bestaet)
  const koder = new Set();
  for (const k of report) {
    for (const p of (k.prioritized || [])) {
      if (p.examCode && p.status !== 'bestået') koder.add(p.examCode.toUpperCase());
    }
  }

  log(`Tjekker ${koder.size} eksamen-koder: ${[...koder].join(', ')}`);
  const resultater = await Promise.all([...koder].map(tjekEksamen));

  const retiring = [];
  const lukket   = [];

  for (const r of resultater) {
    if (r.status === 'aktiv') {
      log(`  OK: ${r.kode}`);
    } else if (r.status === 'pensioneres') {
      log(`  PENSIONERES: ${r.kode} om ${r.dage} dage (${r.retirementDate})${r.replacement ? ' -> ' + r.replacement : ''}`);
      retiring.push({ code: r.kode, retirementDate: r.retirementDate, daysLeft: r.dage, replacement: r.replacement });
    } else if (r.status === 'lukket') {
      log(`  LUKKET: ${r.kode} - pensioneret ${r.retirementDate}`);
      lukket.push({ code: r.kode, retiredDate: r.retirementDate, replacement: r.replacement });
    } else if (r.status === 'ikke-fundet') {
      log(`  IKKE FUNDET: ${r.kode} - 404`);
      lukket.push({ code: r.kode, retiredDate: null, replacement: null });
    } else {
      log(`  FEJL: ${r.kode} - kunne ikke hentes`);
    }
  }

  fs.writeFileSync(CATALOG_FILE, JSON.stringify(
    { opdateret: new Date().toISOString(), retiring, lukket }, null, 2
  ), 'utf8');
  log(`catalog-check.json skrevet (${retiring.length} pensioneres, ${lukket.length} lukkede)`);

  // ---- Send advarselsmails til berørte konsulenter med aktivt klippekort --
  if (!kortData) return;

  // Byg opslag: konsulentNavn -> email
  const emailMap = kortData.konsulenter || {};

  // Find konsulenter med aktivt klippekort lige nu
  const aktivtKortKons = new Set(
    (kortData.kort || [])
      .filter(erAktivtKort)
      .map(k => k.konsulent)
  );

  // Problematiske koder: lukket + pensioneres inden for 90 dage
  const problemer = [
    ...lukket.map(r => ({ ...r, status: 'lukket' })),
    ...retiring.filter(r => r.daysLeft <= 90).map(r => ({ ...r, status: 'pensioneres' })),
  ];

  if (problemer.length === 0) return;

  const tony = 'tony.andersen@zentura.dk';

  for (const prob of problemer) {
    // Find konsulenter der har denne eksamen som aktiv prioritet
    for (const kons of report) {
      if (!aktivtKortKons.has(kons.navn)) continue;
      const prioritetPost = (kons.prioritized || []).find(
        p => p.examCode?.toUpperCase() === prob.code && p.status !== 'bestået'
      );
      if (!prioritetPost) continue;

      const email = emailMap[kons.navn];
      if (!email) {
        log(`  ADVARSEL: ingen email fundet for ${kons.navn}`);
        continue;
      }

      const subject = prob.status === 'lukket'
        ? `Vigtig besked: ${prob.code} er ikke laengere tilgaengelig`
        : `Vigtig besked: ${prob.code} pensioneres om ${prob.daysLeft} dage`;

      const html = buildAdvarselsmail(
        kons.navn, prob.code, prob.status,
        prob.retiredDate || prob.retirementDate,
        prob.replacement,
        prioritetPost.prioritet
      );

      try {
        const res = sendMail(email, tony, subject, html);
        log(`  Mail sendt til ${kons.navn} (${email}) om ${prob.code}: ${res}`);
      } catch (e) {
        log(`  FEJL ved mail til ${kons.navn}: ${e.message}`);
      }
    }
  }
}

main().catch(e => { log(`FEJL: ${e.message}`); process.exit(1); });
