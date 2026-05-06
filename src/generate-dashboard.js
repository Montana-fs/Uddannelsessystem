const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function daysLabel(days) {
  if (days < 0)   return `Udløbet`;
  if (days <= 30) return `${days} dage`;
  if (days <= 90) return `${days} dage`;
  return `${days} dage`;
}

function urgencyClass(days) {
  if (days < 0)   return 'urgent';
  if (days <= 30) return 'urgent';
  if (days <= 90) return 'warning';
  return 'ok';
}

function buildHtml(report, catalog) {
  const totalCerts   = report.reduce((n, k) => n + k.passedCodes.length, 0);
  const expiringSoon = report.filter(k => k.udloeberSnart.length > 0);
  const allDone      = report.filter(k => k.prioritized.length > 0 && k.prioritized.every(p => p.status === 'bestået'));
  const dateStr      = new Date().toLocaleDateString('da-DK', { day:'2-digit', month:'2-digit', year:'numeric' });

  // Retiring exam codes map: { 'AZ-500': { daysLeft, retirementDate } }
  const retiringMap = {};
  for (const r of (catalog?.retiring || [])) retiringMap[r.code] = r;

  // Næste re-cert på tværs af alle
  const alleRecerts = report.flatMap(k => k.udloeberSnart.map(u => ({ ...u, navn: k.navn })))
    .sort((a, b) => a.dagetilbage - b.dagetilbage);

  const konsulentCards = report.map(k => {
    const prios = k.prioritized;
    const done  = prios.filter(p => p.status === 'bestået').length;
    const total = prios.length;
    const pct   = total ? Math.round(done / total * 100) : 0;

    const prioRows = prios.map(p => {
      const ikon  = p.status === 'bestået' ? '✓' : '○';
      const cls   = p.status === 'bestået' ? 'done' : 'missing';
      const dato  = p.dato ? `<span class="prio-date">${escHtml(p.dato)}</span>` : '';
      const retiring = retiringMap[p.examCode];
      const retireBadge = retiring
        ? `<span class="retire-badge ${urgencyClass(retiring.daysLeft)}">⏰ ${retiring.daysLeft}d</span>`
        : '';
      return `<div class="prio-row ${cls}">
        <span class="prio-ikon">${ikon}</span>
        <span class="prio-num">Prio ${p.prioritet}</span>
        <span class="prio-code">${escHtml(p.examCode)}</span>
        ${dato}${retireBadge}
      </div>`;
    }).join('');

    const recertRows = k.udloeberSnart.map(u => `
      <div class="recert-row ${urgencyClass(u.dagetilbage)}">
        <span class="recert-days">${daysLabel(u.dagetilbage)}</span>
        <span class="recert-title">${escHtml(u.titel)}</span>
      </div>`).join('');

    const progressBar = total ? `
      <div class="progress-wrap">
        <div class="progress-bar" style="width:${pct}%"></div>
      </div>
      <div class="progress-label">${done}/${total} prioriteter bestået</div>` : `<div class="progress-label muted">Ingen prioriteter sat</div>`;

    const isAllDone = prios.length > 0 && prios.every(p => p.status === 'bestået');
    return `
    <div class="k-card ${k.udloeberSnart.length ? 'has-recert' : ''}" data-recert="${k.udloeberSnart.length > 0}" data-alldone="${isAllDone}">
      <div class="k-header">
        <div class="k-name">${escHtml(k.navn)}</div>
        <div class="k-badges">
          <span class="cert-count">${k.passedCodes.length} cert${k.passedCodes.length !== 1 ? 's' : ''}</span>
          ${k.udloeberSnart.length ? `<span class="warn-badge">⚠ re-cert</span>` : ''}
        </div>
      </div>
      ${progressBar}
      ${prios.length ? `<div class="prio-list">${prioRows}</div>` : ''}
      ${k.udloeberSnart.length ? `<div class="recert-list">${recertRows}</div>` : ''}
    </div>`;
  }).join('');

  const recertTimeline = alleRecerts.length ? alleRecerts.map(u => `
    <div class="tl-row ${urgencyClass(u.dagetilbage)}">
      <span class="tl-days">${daysLabel(u.dagetilbage)}</span>
      <span class="tl-name">${escHtml(u.navn)}</span>
      <span class="tl-title">${escHtml(u.titel)}</span>
      <span class="tl-date">${escHtml(u.udloeberDato)}</span>
    </div>`).join('') : '<div class="muted" style="padding:12px">Ingen re-certificeringer indenfor 365 dage</div>';

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Uddannelsesoversigt — ${dateStr}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0d1520; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; }

    .sidebar {
      position: fixed; top: 0; left: 0; width: 220px; height: 100vh;
      background: #0a1118; border-right: 1px solid #1e293b;
      display: flex; flex-direction: column; padding: 24px 0; z-index: 100;
    }
    .sidebar-logo { padding: 0 20px 24px; border-bottom: 1px solid #1e293b; }
    .logo-title { font-size: 15px; font-weight: 700; color: #f8fafc; }
    .logo-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
    .nav-section { padding: 20px 12px 0; }
    .nav-label { font-size: 10px; font-weight: 600; color: #475569; letter-spacing: .08em; text-transform: uppercase; padding: 0 8px; margin-bottom: 8px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; color: #94a3b8; font-size: 13px; cursor: pointer; margin-bottom: 2px; transition: all .15s; }
    .nav-item.active, .nav-item:hover { background: rgba(6,182,212,.12); color: #06b6d4; }
    .nav-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .nav-dot.cyan { background: #06b6d4; } .nav-dot.red { background: #ef4444; } .nav-dot.yellow { background: #f59e0b; }
    .nav-count { margin-left: auto; font-size: 11px; background: #1e293b; padding: 1px 7px; border-radius: 10px; color: #64748b; }

    .main { margin-left: 220px; padding: 32px 36px; min-height: 100vh; }
    .page-title { font-size: 22px; font-weight: 700; color: #f8fafc; }
    .page-sub { font-size: 13px; color: #64748b; margin-top: 4px; margin-bottom: 28px; }

    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .summary-card { background: #131e2d; border: 1px solid #1e293b; border-radius: 10px; padding: 18px 20px; }
    .summary-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
    .summary-value { font-size: 28px; font-weight: 700; margin-top: 6px; line-height: 1; }
    .summary-value.cyan { color: #06b6d4; } .summary-value.green { color: #22c55e; }
    .summary-value.red { color: #ef4444; } .summary-value.yellow { color: #f59e0b; }

    .section-title { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px; }

    /* Konsulent-kort */
    .k-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .k-card { background: #131e2d; border: 1px solid #1e293b; border-radius: 10px; padding: 18px 20px; }
    .k-card.has-recert { border-color: rgba(245,158,11,.3); }
    .k-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .k-name { font-size: 14px; font-weight: 600; color: #f1f5f9; }
    .k-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .cert-count { font-size: 11px; background: rgba(6,182,212,.1); color: #06b6d4; border: 1px solid rgba(6,182,212,.2); padding: 2px 8px; border-radius: 10px; }
    .warn-badge { font-size: 11px; background: rgba(245,158,11,.1); color: #f59e0b; border: 1px solid rgba(245,158,11,.25); padding: 2px 8px; border-radius: 10px; }

    .progress-wrap { height: 4px; background: #1e293b; border-radius: 2px; margin-bottom: 4px; }
    .progress-bar { height: 4px; background: #06b6d4; border-radius: 2px; transition: width .3s; }
    .progress-label { font-size: 11px; color: #475569; margin-bottom: 12px; }
    .muted { color: #475569; font-size: 12px; }

    .prio-list { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
    .prio-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px 0; }
    .prio-row.done .prio-ikon { color: #22c55e; } .prio-row.missing .prio-ikon { color: #334155; }
    .prio-ikon { width: 14px; text-align: center; flex-shrink: 0; }
    .prio-num { color: #475569; width: 44px; flex-shrink: 0; }
    .prio-code { font-weight: 600; color: #cbd5e1; width: 60px; flex-shrink: 0; }
    .prio-date { color: #475569; font-size: 11px; }

    .recert-list { display: flex; flex-direction: column; gap: 5px; border-top: 1px solid #1e293b; padding-top: 10px; }
    .recert-row { display: flex; align-items: flex-start; gap: 8px; font-size: 11px; }
    .recert-days { flex-shrink: 0; font-weight: 700; width: 58px; }
    .recert-row.urgent .recert-days { color: #ef4444; }
    .recert-row.warning .recert-days { color: #f59e0b; }
    .recert-row.ok .recert-days { color: #64748b; }
    .recert-title { color: #64748b; line-height: 1.4; }

    /* Pensionerings-badge på prioriterede rækker */
    .retire-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 8px; margin-left: 4px; flex-shrink: 0; }
    .retire-badge.urgent  { background: rgba(239,68,68,.15); color: #ef4444; border: 1px solid rgba(239,68,68,.3); }
    .retire-badge.warning { background: rgba(245,158,11,.15); color: #f59e0b; border: 1px solid rgba(245,158,11,.3); }
    .retire-badge.ok      { background: rgba(100,116,139,.15); color: #94a3b8; border: 1px solid rgba(100,116,139,.3); }

    /* Pensioneringsadvarsler panel */
    .alert-panel { background: rgba(239,68,68,.06); border: 1px solid rgba(239,68,68,.25); border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; }
    .alert-panel-title { font-size: 11px; font-weight: 700; color: #ef4444; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
    .alert-row { display: grid; grid-template-columns: 70px 80px 1fr 110px; gap: 12px; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(239,68,68,.1); font-size: 12px; }
    .alert-row:last-child { border-bottom: none; }
    .alert-days { font-weight: 700; color: #ef4444; }
    .alert-code { font-weight: 700; color: #cbd5e1; }
    .alert-title { color: #94a3b8; }
    .alert-date { color: #64748b; text-align: right; }
    .alert-replacement { font-size: 11px; color: #22c55e; grid-column: 2 / -1; padding-bottom: 4px; }
    .alert-replacement.no-replacement { color: #475569; }

    /* Timeline */
    .tl-section { background: #0f1923; border: 1px solid #1e293b; border-radius: 10px; padding: 20px; margin-bottom: 28px; }
    .tl-row { display: grid; grid-template-columns: 70px 160px 1fr 90px; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 12px; }
    .tl-row:last-child { border-bottom: none; }
    .tl-days { font-weight: 700; }
    .tl-row.urgent .tl-days { color: #ef4444; }
    .tl-row.warning .tl-days { color: #f59e0b; }
    .tl-row.ok .tl-days { color: #64748b; }
    .tl-name { color: #cbd5e1; font-weight: 500; }
    .tl-title { color: #64748b; }
    .tl-date { color: #475569; text-align: right; }

    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 11px; color: #334155; text-align: center; }
  </style>
</head>
<body>
<div class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-title">Zentura</div>
    <div class="logo-sub">Uddannelsesoversigt — ${dateStr}</div>
  </div>
  <div class="nav-section">
    <div class="nav-label">Overblik</div>
    <div class="nav-item active" data-filter="all" onclick="setFilter('all')">
      <span class="nav-dot cyan"></span> Alle konsulenter
      <span class="nav-count">${report.length}</span>
    </div>
    <div class="nav-item" data-filter="recert" onclick="setFilter('recert')">
      <span class="nav-dot red"></span> Re-cert snart
      <span class="nav-count">${expiringSoon.length}</span>
    </div>
    <div class="nav-item" data-filter="alldone" onclick="setFilter('alldone')">
      <span class="nav-dot yellow"></span> Prios på plads
      <span class="nav-count">${allDone.length}</span>
    </div>
  </div>
</div>

<div class="main">
  <div class="page-title">Uddannelsesoversigt</div>
  <div class="page-sub">Sidst opdateret ${dateStr} · ${report.length} konsulenter · ${totalCerts} certificeringer i alt</div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-label">Konsulenter</div>
      <div class="summary-value cyan">${report.length}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Certificeringer i alt</div>
      <div class="summary-value green">${totalCerts}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Re-cert inden 90 dage</div>
      <div class="summary-value ${expiringSoon.length ? 'red' : 'green'}">${expiringSoon.length}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Alle prios bestået</div>
      <div class="summary-value yellow">${allDone.length}</div>
    </div>
  </div>

  ${catalog?.retiring?.length ? `
  <div class="section-title">Pensioneringsadvarsler — eksamener i Excel der fjernes</div>
  <div class="alert-panel">
    <div class="alert-panel-title">⚠ ${catalog.retiring.length} prioriterede eksamener pensioneres</div>
    ${catalog.retiring.sort((a,b) => a.daysLeft - b.daysLeft).map(r => {
      const rep = r.replacement;
      const repHtml = rep
        ? rep.code
          ? `<div class="alert-replacement">↳ Erstattes af <strong>${escHtml(rep.code)}</strong> — ${escHtml(rep.name)}</div>`
          : `<div class="alert-replacement no-replacement">↳ ${escHtml(rep.note)}</div>`
        : '';
      return `
    <div class="alert-row">
      <span class="alert-days">${r.daysLeft} dage</span>
      <span class="alert-code">${escHtml(r.code)}</span>
      <span class="alert-title">${escHtml(r.name)}</span>
      <span class="alert-date">${escHtml(r.retirementDate)}</span>
    </div>${repHtml}`;
    }).join('')}
  </div>` : ''}

  <div class="section-title">Re-certificering — tidslinje</div>
  <div class="tl-section">${recertTimeline}</div>

  <div class="section-title" id="konsulenter-title">Konsulenter</div>
  <div class="k-grid" id="k-grid">${konsulentCards}</div>
  <div id="no-results" style="display:none; padding:24px; color:#475569; font-size:13px;">Ingen konsulenter matcher dette filter.</div>

  <div class="footer">Genereret ${new Date().toLocaleString('da-DK')} · Zentura Uddannelsesoversigt</div>
</div>
<script>
  function setFilter(filter) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-filter="' + filter + '"]').classList.add('active');

    const cards = document.querySelectorAll('#k-grid .k-card');
    let visible = 0;
    cards.forEach(card => {
      let show = true;
      if (filter === 'recert')  show = card.dataset.recert === 'true';
      if (filter === 'alldone') show = card.dataset.alldone === 'true';
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const titles = { all: 'Konsulenter', recert: 'Re-certificering snart', alldone: 'Alle prioriteter bestået' };
    document.getElementById('konsulenter-title').textContent = titles[filter];
    document.getElementById('no-results').style.display = visible === 0 ? 'block' : 'none';
  }
</script>
</body>
</html>`;
}

function main() {
  const reportFile = path.join(ROOT, 'priority-report.json');
  if (!fs.existsSync(reportFile)) {
    console.error('priority-report.json mangler — kør match-priorities.js først');
    process.exit(1);
  }
  const report  = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const catalogFile = path.join(ROOT, 'catalog-check.json');
  const catalog = fs.existsSync(catalogFile) ? JSON.parse(fs.readFileSync(catalogFile, 'utf8')) : null;
  const html    = buildHtml(report, catalog);
  const outFile = path.join(ROOT, 'uddannelse-dashboard.html');
  fs.writeFileSync(outFile, html, 'utf8');
  console.log(`Dashboard genereret: uddannelse-dashboard.html`);

  const http = require('http');
  const PORT = 3738;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(outFile, 'utf8'));
  });
  server.on('error', e => {
    if (e.code === 'EADDRINUSE') {
      const { exec } = require('child_process');
      exec(`start "" "http://localhost:${PORT}"`);
    }
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server kører: http://localhost:${PORT}`);
    const { exec } = require('child_process');
    exec(`start "" "http://localhost:${PORT}"`);
  });
}

main();
