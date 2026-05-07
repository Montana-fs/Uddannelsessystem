// Skifter delegat på Readynez-licens og sender aktiveringsmail til ny konsulent.
// Køres automatisk af Task Scheduler på CHANGE DELEGATE DATE.
// Brug: node src/readynez-roter.js <licensnøgle> <"Fuldt Navn"> <email>
const puppeteer    = require('puppeteer');
const fs           = require('fs');
const path         = require('path');
const { execFileSync } = require('child_process');
const os           = require('os');

const ROOT          = path.join(__dirname, '..');
const CONFIG        = JSON.parse(fs.readFileSync(path.join(ROOT, 'readynez-config.json'), 'utf8'));
const LOGO_B64      = fs.readFileSync(path.join(ROOT, 'logo-b64.txt'), 'utf8').trim();
const KORT_FILE     = path.join(ROOT, 'klippekort.json');
const REPORT_FILE   = path.join(ROOT, 'priority-report.json');
const LOG_FILE      = path.join(ROOT, 'notify-runner.log');

const LICENSE_KEY = process.argv[2];
const NY_DELEGAT  = process.argv[3];
const NY_EMAIL    = process.argv[4];

function log(msg) {
  const line = `${new Date().toISOString()} [readynez-roter] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function formatDato(d) {
  return new Date(d).toLocaleDateString('da-DK', { day: '2-digit', month: 'long', year: 'numeric' });
}

function sendMail(to, subject, htmlBody) {
  const bodyFile = path.join(os.tmpdir(), 'rn-mail-body.html');
  const psFile   = path.join(os.tmpdir(), 'rn-mail-send.ps1');
  fs.writeFileSync(bodyFile, htmlBody, 'utf8');
  const ps = `
$ErrorActionPreference = 'Stop'
$body = [System.IO.File]::ReadAllText('${bodyFile.replace(/\\/g, '\\\\')}', [System.Text.Encoding]::UTF8)
$outlook = New-Object -ComObject Outlook.Application
$mail = $outlook.CreateItem(0)
$mail.Subject = '${subject.replace(/'/g, "''")}'
$mail.To = '${to}'
$mail.CC = '${CONFIG.username}'
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

function buildAktiveringsMail(navn, licensKey, startDato, slutDato, prios, udloeber) {
  const kortNavn = navn.split(' ')[0];

  const prioRækker = prios.map((p, i) => `
    <tr style="border-top:1px solid #e8f0f2">
      <td style="padding:12px 16px;color:#0099cc;font-weight:700;font-size:15px;width:40px;text-align:center">${p.prioritet}</td>
      <td style="padding:12px 16px;font-weight:600;color:#1a1a2e;font-size:14px">${p.examCode}</td>
    </tr>`).join('');

  const udloeberAdvarsel = udloeber.length > 0 ? `
    <tr><td style="padding:0 40px 24px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:#fff8e6;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;padding:14px 18px">
          <p style="margin:0 0 6px 0;font-weight:700;color:#92400e;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Husk re-certificering</p>
          ${udloeber.map(u => `<p style="margin:0;color:#78350f;font-size:13px">${u.titel} &mdash; udlober <strong>${formatDato(u.udloeberDato)}</strong></p>`).join('')}
        </td></tr>
      </table>
    </td></tr>` : '';

  const BRAND = '#0D93D2';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f6;font-family:Inter,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f6;padding:32px 16px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

  <!-- Header med logo -->
  <tr><td style="padding:20px 32px 18px;border-bottom:3px solid ${BRAND}">
    <img src="data:image/png;base64,${LOGO_B64}" alt="zentura" height="40" style="display:block">
  </td></tr>

  <!-- Hero -->
  <tr><td style="padding:32px 40px 28px">
    <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280">Hej ${kortNavn},</p>
    <h1 style="margin:0 0 12px 0;font-size:23px;font-weight:700;color:#111827;line-height:1.3">Dit Readynez-klippekort er aktivt</h1>
    <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.7">Du har nu adgang til alle Microsoft Learn-kurser i <strong>6 måneder</strong> via Readynez. Log ind og kom i gang med dine prioriterede eksamener.</p>
  </td></tr>

  <!-- Kortdetaljer -->
  <tr><td style="padding:0 40px 24px">
    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px">Kortdetaljer</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px">
      <tr style="background:#f8fafc">
        <td style="padding:11px 16px;color:#6b7280;width:130px">Licens-ID</td>
        <td style="padding:11px 16px;font-weight:700;color:${BRAND};letter-spacing:.5px">${licensKey}</td>
      </tr>
      <tr style="border-top:1px solid #e5e7eb">
        <td style="padding:11px 16px;color:#6b7280">Aktiv fra</td>
        <td style="padding:11px 16px;font-weight:600;color:#111827">${formatDato(startDato)}</td>
      </tr>
      <tr style="background:#f8fafc;border-top:1px solid #e5e7eb">
        <td style="padding:11px 16px;color:#6b7280">Aktiv til</td>
        <td style="padding:11px 16px;font-weight:600;color:#111827">${formatDato(slutDato)}</td>
      </tr>
    </table>
  </td></tr>

  <!-- Prioriteter -->
  ${prios.length > 0 ? `
  <tr><td style="padding:0 40px 24px">
    <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px">Eksamenprioriteter</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:14px">
      <tr style="background:${BRAND}">
        <th style="padding:9px 16px;color:#fff;font-size:11px;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:.5px;width:44px">#</th>
        <th style="padding:9px 16px;color:#fff;font-size:11px;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Eksamen</th>
      </tr>
      ${prioRækker}
    </table>
  </td></tr>` : ''}

  <!-- Re-cert advarsel -->
  ${udloeberAdvarsel}

  <!-- CTA -->
  <tr><td style="padding:4px 40px 36px">
    <a href="https://www.readynez.com/en/my-profile/" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 28px;border-radius:6px">Log ind pa Readynez &rarr;</a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 32px">
    <p style="margin:0;font-size:12px;color:#9ca3af">Sporgsmal? Kontakt <a href="mailto:tony.andersen@zentura.dk" style="color:${BRAND};text-decoration:none">tony.andersen@zentura.dk</a></p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

async function login(page) {
  await page.goto('https://www.readynez.com/en/login/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Accept'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.type('input[placeholder="Username"]', CONFIG.username);
  await page.type('input[placeholder="Password"]', CONFIG.password);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      .find(b => (b.textContent || b.value || '').toUpperCase().includes('LOG IN'));
    if (btn) btn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
}

async function skiftDelegat(page, licensKey, nyNavn, nyEmail) {
  const manageHref = await page.evaluate((key) => {
    const rows = Array.from(document.querySelectorAll('tr'));
    for (const row of rows) {
      if (row.innerText?.includes(key)) {
        const link = row.querySelector('a[href*="manage"], a[href*="delegate"], a');
        return link?.href || null;
      }
    }
    return null;
  }, licensKey);

  if (!manageHref) {
    const clicked = await page.evaluate((key) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      for (const row of rows) {
        if (row.innerText?.includes(key)) {
          const btn = row.querySelector('button, a');
          if (btn) { btn.click(); return true; }
        }
      }
      return false;
    }, licensKey);
    if (!clicked) throw new Error(`Manage-knap ikke fundet for ${licensKey}`);
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  } else {
    await page.goto(manageHref, { waitUntil: 'networkidle2', timeout: 20000 });
  }

  log(`Manage-side: ${page.url()}`);
  await page.screenshot({ path: path.join(ROOT, 'rn-manage-before.png') });

  const udfyldt = await page.evaluate((navn, email) => {
    const navnFelt  = document.querySelector('input[name*="name"], input[placeholder*="name"], input[id*="name"]');
    const emailFelt = document.querySelector('input[name*="email"], input[placeholder*="email"], input[type="email"]');
    if (navnFelt)  { navnFelt.value = navn; navnFelt.dispatchEvent(new Event('input', { bubbles: true })); }
    if (emailFelt) { emailFelt.value = email; emailFelt.dispatchEvent(new Event('input', { bubbles: true })); }
    return { navnFelt: !!navnFelt, emailFelt: !!emailFelt };
  }, nyNavn, nyEmail);

  log(`Felter udfyldt: navn=${udfyldt.navnFelt}, email=${udfyldt.emailFelt}`);

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      .find(b => /(save|update|confirm|gem|skift|change)/i.test(b.textContent || b.value || ''));
    if (btn) btn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await page.screenshot({ path: path.join(ROOT, 'rn-manage-after.png') });
  log(`Efter gem: ${page.url()}`);
}

function sendAktiveringsMail(navn, email, licensKey) {
  const kortData = JSON.parse(fs.readFileSync(KORT_FILE, 'utf8'));
  const kort     = kortData.kort.find(k => k.licensnøgle === licensKey);
  if (!kort) { log(`Kort med licensnøgle ${licensKey} ikke fundet i klippekort.json`); return; }

  const report   = fs.existsSync(REPORT_FILE) ? JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8')) : [];
  const konsData = report.find(k => k.navn === navn);
  const prios    = (konsData?.prioritized || []).filter(p => p.status !== 'bestået').slice(0, 5);
  const udloeber = (konsData?.udloeberSnart || []).filter(u => u.dagetilbage >= 0 && u.dagetilbage <= 90);

  const html    = buildAktiveringsMail(navn, licensKey, kort.start, kort.slut, prios, udloeber);
  const subject = `Dit Readynez-klippekort er aktivt - ${licensKey}`;
  const result  = sendMail(email, subject, html);
  log(`Aktiveringsmail sendt til ${email}: ${result}`);
}

// Kan også bruges som modul: require('./readynez-roter').sendAktiveringsMail(...)
module.exports = { sendAktiveringsMail };

if (require.main === module) {
  if (!LICENSE_KEY || !NY_DELEGAT || !NY_EMAIL) {
    console.error('Brug: node src/readynez-roter.js <licensnøgle> <"Fuldt Navn"> <email>');
    process.exit(1);
  }

  log(`Starter rotation: ${LICENSE_KEY} → ${NY_DELEGAT} (${NY_EMAIL})`);

  (async () => {
    const browser = await puppeteer.launch({ headless: true, defaultViewport: null });
    const page    = await browser.newPage();
    try {
      await login(page);
      log('Logget ind');
      await skiftDelegat(page, LICENSE_KEY, NY_DELEGAT, NY_EMAIL);
      log('Delegat skiftet i Readynez');
      sendAktiveringsMail(NY_DELEGAT, NY_EMAIL, LICENSE_KEY);
    } catch (e) {
      log(`FEJL: ${e.message}`);
      await page.screenshot({ path: path.join(ROOT, 'rn-fejl.png') }).catch(() => {});
      process.exit(1);
    } finally {
      await browser.close();
    }
  })();
}
