const https  = require('https');
const XLSX   = require('xlsx');
const fs     = require('fs');
const path   = require('path');

const EXCEL_FILE   = 'C:/Users/ta/OneDrive - Zentura/Dokumenter/Drengene/Uddannelsesoversigt 2025.xlsx';
const ROOT         = path.join(__dirname, '..');
const RETIREMENT_URL = 'https://learn.microsoft.com/en-us/credentials/support/retired-certification-exams';

// Kendte erstatninger baseret på MS Learn kursus-pensioneringsliste (maj 2026)
const REPLACEMENTS = {
  'AZ-204': { code: 'AI-200', name: 'Develop AI cloud solutions on Microsoft Azure', note: 'Ny AI-fokuseret Azure Developer-certificering' },
  'AZ-500': { code: 'SC-500', name: 'Build a secure Cloud and AI solution', note: 'Sikkerhed + AI kombineret' },
  'AZ-800': { code: null, name: null, note: 'Ingen erstatning — rollen absorberes af Azure Arc/Entra' },
  'AZ-801': { code: null, name: null, note: 'Ingen erstatning — rollen absorberes af Azure Arc/Entra' },
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function fetchRetiredExams() {
  console.log('Henter pensioneringsside fra MS Learn...');
  const html = await fetchText(RETIREMENT_URL);

  const retired = {};

  // Parser HTML-tabelrækker med eksamenkoder og datoer
  const rowRe = /<tr>[\s\S]*?<td[^>]*>[\s\S]*?>([A-Z]{2}-\d{3,4})<\/a>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const code = m[1].toUpperCase().trim();
    const name = m[2].replace(/<[^>]+>/g, '').trim();
    const date = m[3].replace(/<[^>]+>/g, '').trim();
    if (date) retired[code] = { name, retirementDate: date, status: isInPast(date) ? 'retired' : 'retiring' };
  }

  console.log(`Fandt ${Object.keys(retired).length} pensionerede/planlagt-pensionerede eksamener\n`);
  return retired;
}

function isInPast(dateStr) {
  return new Date(dateStr) < new Date();
}

function daysUntil(dateStr) {
  return Math.round((new Date(dateStr) - new Date()) / 86400000);
}

function readExcelExams() {
  const wb   = XLSX.readFile(EXCEL_FILE);
  const ws   = wb.Sheets['Kursusoversigt'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const exams = {};
  for (const row of rows) {
    const code = String(row[0]).trim().toUpperCase();
    const title = String(row[1]).trim();
    const note  = String(row[2]).trim();
    if (/^[A-Z]{2}-\d{3,4}$/.test(code)) {
      exams[code] = { title, alreadyMarked: note.toLowerCase().includes('retired') };
    }
  }
  return exams;
}

async function main() {
  const retiredMap = await fetchRetiredExams();
  const excelExams = readExcelExams();

  const results = { alreadyRetired: [], retiring: [], active: [], unknown: [] };

  for (const [code, { title, alreadyMarked }] of Object.entries(excelExams)) {
    if (alreadyMarked) { results.alreadyRetired.push({ code, title }); continue; }

    const r = retiredMap[code];
    if (!r) {
      results.active.push({ code, title });
    } else if (r.status === 'retired') {
      results.alreadyRetired.push({ code, title, retirementDate: r.retirementDate });
    } else {
      const replacement = REPLACEMENTS[code] || null;
      results.retiring.push({ code, title, retirementDate: r.retirementDate, daysLeft: daysUntil(r.retirementDate), replacement });
    }
  }

  // Gem
  const output = { generatedAt: new Date().toISOString(), ...results };
  fs.writeFileSync(path.join(ROOT, 'catalog-check.json'), JSON.stringify(output, null, 2), 'utf8');

  // Rapport
  console.log('══════════════════════════════════════════════════════');
  console.log('MS LEARN KATALOG-CHECK');
  console.log('══════════════════════════════════════════════════════\n');

  if (results.retiring.length) {
    console.log(`🔴 PLANLAGT PENSIONERET — prioriterede eksamener der snart forsvinder:`);
    results.retiring
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .forEach(e => console.log(`   ${e.code.padEnd(9)} om ${e.daysLeft} dage (${e.retirementDate})  ${e.title}`));
    console.log();
  }

  console.log(`✅ Aktive eksamener i Excel: ${results.active.length}`);
  console.log(`⚫ Allerede markeret Retired: ${results.alreadyRetired.length}`);
  console.log('\nGemt: catalog-check.json');

  return results;
}

module.exports = { main, fetchRetiredExams };

if (require.main === module) {
  main().catch(e => { console.error('Fejl:', e.message); process.exit(1); });
}
