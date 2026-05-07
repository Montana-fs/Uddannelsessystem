const fs             = require('fs');
const path           = require('path');
const { execFileSync } = require('child_process');
const os             = require('os');

const ROOT         = path.join(__dirname, '..');
const KORT_FILE    = path.join(ROOT, 'klippekort.json');
const REPORT_FILE  = path.join(ROOT, 'priority-report.json');
const CATALOG_FILE = path.join(ROOT, 'catalog-check.json');
const LOG_FILE     = path.join(ROOT, 'notify-log.json');
const PENDING_FILE = path.join(ROOT, 'pending-notifications.json');
const LOGO_FILE    = path.join(ROOT, 'logo-b64.txt');

const BRAND      = '#0D93D2';
const TONY_EMAIL = 'tony.andersen@zentura.dk';

function loadLog() {
  return fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : {};
}

function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2), 'utf8');
}

function datoLabel(datoStr) {
  return new Date(datoStr).toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function dageAlt(datoStr) {
  return Math.ceil((new Date(datoStr) - new Date()) / 86400000);
}

function ugerMedKort(startStr) {
  const dage = Math.floor((new Date() - new Date(startStr)) / 86400000);
  return Math.max(0, Math.floor(dage / 7));
}

// Én notifikation pr. konsulent pr. tærskel pr. uge
function varselNøgle(type, navn, ekstra) {
  const uge = Math.floor(Date.now() / (7 * 86400000));
  return `${type}|${navn}|${ekstra}|${uge}`;
}

function tilføjPending(liste, nøgle, tekst, type) {
  liste.push({ nøgle, type, tekst, timestamp: new Date().toISOString() });
}

function loadKort() {
  if (!fs.existsSync(KORT_FILE)) return null;
  return JSON.parse(fs.readFileSync(KORT_FILE, 'utf8'));
}

function sendMail(to, cc, subject, htmlBody) {
  const bodyFile = path.join(os.tmpdir(), 'nf-mail-body.html');
  const psFile   = path.join(os.tmpdir(), 'nf-mail-send.ps1');
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

function buildMidvejsMail(navn, kortId, licensKey, slutDato, dageIgjen, prios) {
  const fornavn = navn.split(' ')[0];
  const logob64 = fs.existsSync(LOGO_FILE) ? fs.readFileSync(LOGO_FILE, 'utf8').trim() : '';
  const logoImg = logob64
    ? `<img src="data:image/png;base64,${logob64}" alt="zentura" height="40" style="display:block">`
    : '';

  const bestået  = prios.filter(p => p.status === 'bestået');
  const mangler  = prios.filter(p => p.status !== 'bestået');
  const ugerIgjen = Math.ceil(dageIgjen / 7);

  const prioRækker = mangler.map(p => `
    <tr style="border-top:1px solid #e8f0f2">
      <td style="padding:11px 16px;color:${BRAND};font-weight:700;font-size:15px;width:40px;text-align:center">${p.prioritet}</td>
      <td style="padding:11px 16px;font-weight:600;color:#1a1a2e;font-size:14px">${p.examCode}</td>
      <td style="padding:11px 16px;font-size:13px;color:#6b7280">${p.status === 'bestået' ? 'Bestaat' : 'Mangler'}</td>
    </tr>`).join('');

  const bestaetRækker = bestået.length > 0 ? bestået.map(p => `
    <tr style="border-top:1px solid #e8f0f2">
      <td style="padding:11px 16px;font-weight:700;font-size:15px;width:40px;text-align:center">✓</td>
      <td style="padding:11px 16px;font-weight:600;color:#374151;font-size:14px;text-decoration:line-through">${p.examCode}</td>
      <td style="padding:11px 16px;font-size:13px;color:#16a34a">Bestaat</td>
    </tr>`).join('') : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f6;font-family:Inter,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f6;padding:32px 16px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

  <tr><td style="padding:20px 32px 18px;border-bottom:3px solid ${BRAND}">
    ${logoImg}
  </td></tr>

  <tr><td style="padding:32px 40px 24px">
    <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280">Hej ${fornavn},</p>
    <h1 style="margin:0 0 12px 0;font-size:23px;font-weight:700;color:#111827;line-height:1.3">Halvdelen af din Readynez-adgang er brugt</h1>
    <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.7">Du har nu brugt halvdelen af dine 6 maaneder pa Readynez. Du har <strong>${dageIgjen} dage</strong> (ca. ${ugerIgjen} uger) tilbage af din adgang. Nu er det et godt tidspunkt at tage et kig pa dine prioriteter og sikre at du nar dine maal inden kortet roterer.</p>
  </td></tr>

  <tr><td style="padding:0 40px 24px">
    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px">Kortdetaljer</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px">
      <tr style="background:#f8fafc">
        <td style="padding:11px 16px;color:#6b7280;width:130px">Licens-ID</td>
        <td style="padding:11px 16px;font-weight:700;color:${BRAND};letter-spacing:.5px">${licensKey}</td>
      </tr>
      <tr style="border-top:1px solid #e5e7eb">
        <td style="padding:11px 16px;color:#6b7280">Aktiv til</td>
        <td style="padding:11px 16px;font-weight:600;color:#111827">${datoLabel(slutDato)}</td>
      </tr>
      <tr style="background:#f8fafc;border-top:1px solid #e5e7eb">
        <td style="padding:11px 16px;color:#6b7280">Dage tilbage</td>
        <td style="padding:11px 16px;font-weight:700;color:${dageIgjen <= 30 ? '#e53e3e' : dageIgjen <= 60 ? '#d97706' : '#111827'}">${dageIgjen} dage</td>
      </tr>
    </table>
  </td></tr>

  ${(mangler.length > 0 || bestået.length > 0) ? `
  <tr><td style="padding:0 40px 28px">
    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px">Dine eksamenprioriteter</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px">
      <tr style="background:${BRAND}">
        <th style="padding:9px 16px;color:#fff;font-size:11px;text-align:center;font-weight:600;width:44px">#</th>
        <th style="padding:9px 16px;color:#fff;font-size:11px;text-align:left;font-weight:600">Eksamen</th>
        <th style="padding:9px 16px;color:#fff;font-size:11px;text-align:left;font-weight:600">Status</th>
      </tr>
      ${prioRækker}${bestaetRækker}
    </table>
  </td></tr>` : ''}

  <tr><td style="padding:4px 40px 36px">
    <a href="https://www.readynez.com/en/my-profile/" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 28px;border-radius:6px">Log ind pa Readynez &rarr;</a>
  </td></tr>

  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 32px">
    <p style="margin:0;font-size:12px;color:#9ca3af">Sporgsmal? Kontakt <a href="mailto:${TONY_EMAIL}" style="color:${BRAND};text-decoration:none">${TONY_EMAIL}</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

async function main() {
  const log      = loadLog();
  const kortData = loadKort();
  const pending  = [];

  // --- Klippekort-varsler ---
  if (kortData) {
    for (const k of kortData.kort) {
      if (!k.konsulent || k.konsulent === 'UDFYLD') continue;
      if (!k.slut || k.slut === 'UDFYLD') continue;

      const dageSlut  = dageAlt(k.slut);
      const dageBetaling = k.betalingsFrist && k.betalingsFrist !== 'UDFYLD' ? dageAlt(k.betalingsFrist) : null;
      const uger      = k.start && k.start !== 'UDFYLD' ? ugerMedKort(k.start) : null;

      // Ugentlig fremdriftsrapport til Tony (hver mandag = uge-nøgle ændres)
      if (uger !== null) {
        const nøgle = varselNøgle('kort-progress', `kort${k.id}`, uger);
        if (!log[nøgle]) {
          let progressTekst = '';
          if (fs.existsSync(REPORT_FILE)) {
            const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
            const kons = report.find(r => r.navn === k.konsulent);
            if (kons) {
              const bestået = kons.prioritized.filter(p => p.status === 'bestået').length;
              const total   = kons.prioritized.length;
              const mangler = kons.prioritized.filter(p => p.status !== 'bestået').map(p => `${p.examCode}`).join(', ') || 'ingen';
              progressTekst = `\n\nPrioritetsfremgang: ${bestået}/${total} bestået\nMangler: ${mangler}`;
            }
          }
          tilføjPending(pending, nøgle,
            `📋 **Klippekort #${k.id} — uge ${uger} af 26**\n\n${k.konsulent} har haft kortet i ${uger} uger (siden ${datoLabel(k.start)}).\nKortet skifter senest **${datoLabel(k.slut)}**${progressTekst}`,
            'kort-progress'
          );
        }
      }

      // Varsel: kort kan skifte om ≤30 dage
      if (dageSlut <= 30 && dageSlut >= 0) {
        const nøgle = varselNøgle('kortslut', k.konsulent, dageSlut <= 30 ? '30d' : '7d');
        if (!log[nøgle]) {
          tilføjPending(pending, nøgle,
            `⚠️ **Klippekort #${k.id} skal roteres snart**\n\n${k.konsulent} har kortet til **${datoLabel(k.slut)}** (om ${dageSlut} dage).\nHusk at skifte deltager i Readynez-portalen inden da — ellers bindes kortet yderligere 6 måneder.`,
            'kortslut'
          );
        }
      }

      // Midvejs-mail direkte til konsulenten (sendes kun én gang)
      if (k.start && k.start !== 'UDFYLD' && dageSlut >= 0) {
        const totalDage  = Math.round((new Date(k.slut) - new Date(k.start)) / 86400000);
        const brugteDage = Math.round((new Date() - new Date(k.start)) / 86400000);
        const nøgleMidvejs = `midvejs|kort${k.id}`; // ingen uge-suffix → sendes kun én gang
        if (brugteDage >= totalDage / 2 && !log[nøgleMidvejs]) {
          const email = kortData.konsulenter?.[k.konsulent];
          if (email) {
            const report = fs.existsSync(REPORT_FILE)
              ? JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'))
              : [];
            const konsData = report.find(r => r.navn === k.konsulent);
            const prios    = konsData?.prioritized || [];
            const html     = buildMidvejsMail(k.konsulent, k.id, k.licensnøgle, k.slut, dageSlut, prios);
            const subject  = `Halvdelen af din Readynez-adgang er brugt - ${k.licensnøgle}`;
            try {
              const res = sendMail(email, TONY_EMAIL, subject, html);
              console.log(`Midvejs-mail sendt til ${k.konsulent} (${email}): ${res}`);
              log[nøgleMidvejs] = new Date().toISOString();
            } catch (e) {
              console.error(`Fejl ved midvejs-mail til ${k.konsulent}: ${e.message}`);
            }
          }
        }
      }

      // Betalingsvarsel: betalingsFrist ≤30 dage → Tony skal forny/opsige
      if (dageBetaling !== null && dageBetaling <= 30 && dageBetaling >= 0) {
        const nøgle = varselNøgle('betaling', `kort${k.id}`, '30d');
        if (!log[nøgle]) {
          tilføjPending(pending, nøgle,
            `💳 **Readynez-betaling forfalder — kort #${k.id}**\n\nBetalingsdato: **${datoLabel(k.betalingsFrist)}** (om ${dageBetaling} dage).\nDette er betalingen til Readynez — ikke rotationsdatoen.\nNuværende holder: ${k.konsulent} | Licens: ${k.licensnøgle || '—'}\nBeslut: forny abonnementet eller opsig inden datoen.`,
            'betaling'
          );
        }
      }
    }
  }

  // --- Re-certificerings-varsler ---
  if (fs.existsSync(REPORT_FILE)) {
    const report = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));
    for (const k of report) {
      for (const cert of (k.udloeberSnart || [])) {
        const dage = cert.dagetilbage;
        if (dage > 90 || dage < 0) continue;
        const tærskel = dage <= 30 ? '30d' : '90d';
        const nøgle   = varselNøgle('recert', `${k.navn}-${cert.titel}`, tærskel);
        if (!log[nøgle]) {
          const ikon = dage <= 30 ? '🔴' : '🟡';
          tilføjPending(pending, nøgle,
            `${ikon} **Re-certificering udløber — ${k.navn}**\n\n**${cert.titel}** udløber **${datoLabel(cert.udloebsDato)}** (om ${dage} dage).\nBook eksamen snarest.`,
            'recert'
          );
        }
      }
    }
  }

  // --- Pensionerings- og luknings-varsler ---
  if (fs.existsSync(CATALOG_FILE)) {
    const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));

    for (const r of (catalog.retiring || [])) {
      if (r.daysLeft > 90 || r.daysLeft < 0) continue;
      const nøgle = varselNøgle('pension', r.code, r.daysLeft <= 30 ? '30d' : '90d');
      if (!log[nøgle]) {
        const erstatning = r.replacement ? ` → erstattes af **${r.replacement}**` : ' (ingen erstatning annonceret)';
        tilføjPending(pending, nøgle,
          `🗓️ **Eksamen pensioneres — ${r.code}**\n\n**${r.code}** pensioneres **${datoLabel(r.retirementDate)}** (om ${r.daysLeft} dage)${erstatning}.\nOpdatér prioriteterne i Uddannelsesoversigt.xlsx.`,
          'pension'
        );
      }
    }

    for (const r of (catalog.lukket || [])) {
      const nøgle = varselNøgle('lukket', r.code, 'fjernet');
      if (!log[nøgle]) {
        tilføjPending(pending, nøgle,
          `🚫 **Eksamen fjernet fra MS Learn — ${r.code}**\n\n**${r.code}** findes ikke længere i Microsoft Learn kataloget.\nTjek om den er omdøbt eller erstattet, og opdatér prioriteterne i Uddannelsesoversigt.xlsx.`,
          'lukket'
        );
      }
    }
  }

  // Gem log nu (indeholder evt. midvejs-nøgle som altid skal persisteres)
  saveLog(log);

  if (pending.length === 0) {
    console.log('Ingen nye varsler.');
    return;
  }

  // Læs eksisterende pending og tilføj nye
  const eksisterende = fs.existsSync(PENDING_FILE)
    ? JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'))
    : [];

  const samlet = [...eksisterende, ...pending];
  fs.writeFileSync(PENDING_FILE, JSON.stringify(samlet, null, 2), 'utf8');

  for (const b of pending) {
    log[b.nøgle] = new Date().toISOString();
    console.log(`  + ${b.type}: ${b.nøgle}`);
  }
  saveLog(log);
  console.log(`${pending.length} varsel(er) skrevet til pending-notifications.json`);
}

// Bruges af klippekort.js til aktiveringsbesked
function tilføjAktivering(konsulent, kortId, slutDato, prios) {
  const pending = fs.existsSync(PENDING_FILE)
    ? JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'))
    : [];
  const prioTekst = prios.length > 0
    ? '\n\nPrioriterede eksamener:\n' + prios.map(p => `• ${p}`).join('\n')
    : '';
  pending.push({
    nøgle: `aktivering-${konsulent}-${Date.now()}`,
    type: 'aktivering',
    tekst: `🎓 **Readynez-klippekort aktiveret — ${konsulent}**\n\nKort #${kortId} er aktivt frem til **${slutDato}**.\nKortet giver adgang til alle Microsoft Learn-kurser i 6 måneder.${prioTekst}`,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2), 'utf8');
}

module.exports = { tilføjAktivering };

if (require.main === module) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
