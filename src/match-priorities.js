const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

const EXCEL_FILE  = 'C:/Users/ta/OneDrive - Zentura/Dokumenter/Drengene/Uddannelsesoversigt 2025.xlsx';
const SCRAPE_FILE = path.join(__dirname, '..', 'scrape-result.json');

// Kolonnerækkefølge på Kursusoversigt (0-indekseret fra kolonne D=3)
const KONSULENT_COLS = {
  'Anders Gornitzka':  4,
  'Simon Kaas Hansen': 5,
  'Ricki Mikkelsen':   6,
  'Leon Pedersen':     7,
  'Kennet Thorsen':    8,
  'Benjamin Fougt':    9,
  'Michael Magnussen': 10,
  'August':            11,
  'Charly Münch':      12,
};

function readPriorities() {
  const wb   = XLSX.readFile(EXCEL_FILE);
  const ws   = wb.Sheets['Kursusoversigt'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Byg { konsulentNavn: { 'AZ-104': 1, 'AZ-500': 2, ... } }
  const priorities = {};
  for (const navn of Object.keys(KONSULENT_COLS)) priorities[navn] = {};

  for (const row of rows) {
    const examCode = String(row[0]).trim().toUpperCase();
    if (!/^[A-Z]{2}-\d{3,4}$/.test(examCode)) continue;

    for (const [navn, col] of Object.entries(KONSULENT_COLS)) {
      const val = String(row[col]).trim();
      const prio = parseInt(val);
      if (!isNaN(prio) && prio >= 1 && prio <= 5) {
        priorities[navn][examCode] = prio;
      } else if (val.toUpperCase() === 'X') {
        priorities[navn][examCode] = 'X'; // allerede bestået iflg. Excel
      }
    }
  }
  return priorities;
}

function normalizeDate(d) {
  if (!d) return '';
  // "7. aug. 2023" → "2023-08-07", "Apr 16, 2025" → "2025-04-16"
  const months = {
    jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
    januar:1,februar:2,marts:3,april:4,maj:5,juni:6,juli:7,august:8,
    september:9,oktober:10,november:11,december:12
  };
  const m1 = d.match(/(\d{1,2})\.\s*(\w+)\.?\s*(\d{4})/);
  if (m1) {
    const mo = months[m1[2].toLowerCase().slice(0,3)];
    return mo ? `${m1[3]}-${String(mo).padStart(2,'0')}-${m1[1].padStart(2,'0')}` : d;
  }
  const m2 = d.match(/(\w+)\s+(\d{1,2}),\s*(\d{4})/);
  if (m2) {
    const mo = months[m2[1].toLowerCase().slice(0,3)];
    return mo ? `${m2[3]}-${String(mo).padStart(2,'0')}-${m2[2].padStart(2,'0')}` : d;
  }
  return d;
}

function buildReport() {
  const priorities = readPriorities();
  const scrapeData = JSON.parse(fs.readFileSync(SCRAPE_FILE, 'utf8'));

  const report = [];

  for (const konsulent of scrapeData) {
    const navn  = konsulent.navn;
    const prios = priorities[navn] || {};

    // Eksamensnumre bestået iflg. MS Learn
    const passedCodes = new Set(
      (konsulent.exams || []).map(e => e.examCode?.toUpperCase()).filter(Boolean)
    );

    // Også markér aktive certificeringer — udtræk eksamensnummer fra certifikattitel
    const CERT_TO_EXAM = {
      'azure administrator associate':        'AZ-104',
      'azure solutions architect expert':     'AZ-305',
      'azure fundamentals':                   'AZ-900',
      'azure virtual desktop specialty':      'AZ-140',
      'azure security engineer associate':    'AZ-500',
      'identity and access administrator':    'SC-300',
      '365 certified: fundamentals':          'MS-900',
      '365 certified: administrator expert':  'MS-102',
      'endpoint administrator associate':     'MD-102',
      'windows server hybrid administrator':  'AZ-801',
    };
    for (const cert of (konsulent.certifications || [])) {
      const lower = cert.title.toLowerCase();
      for (const [key, code] of Object.entries(CERT_TO_EXAM)) {
        if (lower.includes(key)) passedCodes.add(code);
      }
    }

    // Prioriterede kurser
    const prioritized = Object.entries(prios)
      .filter(([, v]) => typeof v === 'number')
      .sort(([, a], [, b]) => a - b)
      .map(([code, prio]) => ({
        examCode: code,
        prioritet: prio,
        status: passedCodes.has(code) ? 'bestået' : 'mangler',
        dato: (konsulent.exams || []).find(e => e.examCode === code)?.date
              ? normalizeDate((konsulent.exams || []).find(e => e.examCode === code).date)
              : '',
      }));

    // Re-certificeringer der udløber snart
    const TODAY = new Date();
    const udloeberSnart = (konsulent.certifications || [])
      .filter(c => {
        if (!c.expiresOn || c.expiresOn.toLowerCase().includes('n/a') || c.expiresOn.toLowerCase().includes('relevant')) return false;
        const d = new Date(normalizeDate(c.expiresOn));
        if (isNaN(d)) return false;
        const dage = Math.round((d - TODAY) / 86400000);
        return dage <= 365;
      })
      .map(c => {
        const d = new Date(normalizeDate(c.expiresOn));
        const dage = Math.round((d - TODAY) / 86400000);
        return { titel: c.title, udloeberDato: normalizeDate(c.expiresOn), dagetilbage: dage };
      })
      .sort((a, b) => a.dagetilbage - b.dagetilbage);

    report.push({ navn, prioritized, udloeberSnart, passedCodes: [...passedCodes] });
  }

  return report;
}

function printReport(report) {
  console.log('\n' + '='.repeat(70));
  console.log('UDDANNELSESOVERSIGT — prioriteter vs. MS Learn');
  console.log('='.repeat(70));

  for (const k of report) {
    console.log(`\n▶ ${k.navn}`);

    if (k.prioritized.length) {
      console.log('  Prioriterede kurser:');
      for (const p of k.prioritized) {
        const ikon = p.status === 'bestået' ? '✓' : '○';
        const dato = p.dato ? ` (${p.dato})` : '';
        console.log(`    ${ikon} Prio ${p.prioritet}  ${p.examCode.padEnd(8)} ${p.status}${dato}`);
      }
    } else {
      console.log('  Ingen prioriterede kurser i Excel');
    }

    if (k.udloeberSnart.length) {
      console.log('  ⚠ Re-certificering snart:');
      for (const u of k.udloeberSnart) {
        console.log(`    ${u.dagetilbage} dage  ${u.udloeberDato}  ${u.titel}`);
      }
    }
  }
  console.log('\n' + '='.repeat(70));
}

const report = buildReport();
printReport(report);

fs.writeFileSync(
  path.join(__dirname, '..', 'priority-report.json'),
  JSON.stringify(report, null, 2), 'utf8'
);
console.log('Gemt: priority-report.json\n');
