// Læser pending-notifications.json lokalt og sender mails via Outlook COM.
// Køres dagligt af Windows Task Scheduler.
const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os   = require('os');

const ROOT         = path.join(__dirname, '..');
const PENDING_FILE = path.join(ROOT, 'pending-notifications.json');
const LOG_FILE     = path.join(ROOT, 'notify-runner.log');
const TO           = 'tony.andersen@zentura.dk';

const TYPE_LABELS = {
  'kort-progress': 'Klippekort fremdrift',
  'kortslut':      'Klippekort roteres snart',
  'fornyfrist':    'Fornyelsesdato nærmer sig',
  'recert':        'Re-certificering udløber',
  'pension':       'Eksamen pensioneres',
  'aktivering':    'Klippekort aktiveret',
};

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function markdownToHtml(tekst) {
  const escaped = tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split('\n\n')
    .map(para => `<p style="margin:0 0 12px 0">${para.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function buildHtml(notifications) {
  const items = notifications.map(n => {
    const label = TYPE_LABELS[n.type] || n.type || 'Notifikation';
    const body  = markdownToHtml(n.tekst || '');
    return `
      <div style="background:#f8f9fa;border-left:4px solid #0078d4;padding:16px 20px;margin-bottom:16px;border-radius:0 4px 4px 0">
        <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">${label}</div>
        ${body}
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:14px;color:#1a1a1a;padding:20px;max-width:640px">
  <h2 style="color:#0078d4;margin:0 0 20px 0">Uddannelsessystem — ${notifications.length} varsel${notifications.length !== 1 ? 'er' : ''}</h2>
  ${items}
  <p style="font-size:11px;color:#999;margin-top:24px">Sendt automatisk af uddannelsessystemet</p>
</body></html>`;
}

function sendMailViaOutlook(subject, htmlBody) {
  const bodyFile = path.join(os.tmpdir(), 'notify-body.html');
  const psFile   = path.join(os.tmpdir(), 'notify-send.ps1');

  fs.writeFileSync(bodyFile, htmlBody, 'utf8');

  const ps = `
$ErrorActionPreference = 'Stop'
$body = [System.IO.File]::ReadAllText('${bodyFile.replace(/\\/g, '\\\\')}', [System.Text.Encoding]::UTF8)
$outlook = New-Object -ComObject Outlook.Application
$mail = $outlook.CreateItem(0)
$mail.Subject = '${subject.replace(/'/g, "''")}'
$mail.To = '${TO}'
$mail.HTMLBody = $body
$mail.Send()
Write-Output 'SENDT'
`.trim();

  fs.writeFileSync(psFile, ps, 'utf8');

  try {
    const out = execFileSync('powershell', ['-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', psFile], {
      encoding: 'utf8',
      timeout: 30000
    });
    return out.trim();
  } finally {
    try { fs.unlinkSync(bodyFile); } catch {}
    try { fs.unlinkSync(psFile); } catch {}
  }
}

function main() {
  log('--- notify-runner start ---');

  if (!fs.existsSync(PENDING_FILE)) {
    log('pending-notifications.json ikke fundet, afslutter');
    return;
  }

  let notifications;
  try {
    const raw = fs.readFileSync(PENDING_FILE, 'utf8').trim();
    notifications = JSON.parse(raw || '[]');
  } catch (e) {
    log(`Kunne ikke parse pending-notifications.json: ${e.message}`);
    return;
  }

  if (!Array.isArray(notifications) || notifications.length === 0) {
    log('Ingen ventende notifikationer');
    return;
  }

  log(`${notifications.length} notifikation(er) fundet`);

  const grupperetLabel = notifications.map(n => TYPE_LABELS[n.type] || n.type).join(', ');
  const subject = notifications.length === 1
    ? `Uddannelsessystem: ${TYPE_LABELS[notifications[0].type] || notifications[0].type}`
    : `Uddannelsessystem: ${notifications.length} varsler (${grupperetLabel})`;

  const html = buildHtml(notifications);
  log(`Emne: ${subject}`);

  const result = sendMailViaOutlook(subject, html);
  log(`Outlook svar: ${result}`);

  fs.writeFileSync(PENDING_FILE, '[]', 'utf8');
  log('pending-notifications.json ryddet');
  log('--- notify-runner slut ---');
}

try {
  main();
} catch (e) {
  log(`UVENTET FEJL: ${e.message}`);
  process.exit(1);
}
