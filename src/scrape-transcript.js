const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const KONSULENTER = [
  { navn: 'Benjamin Fougt',    url: 'https://learn.microsoft.com/en-us/users/benjaminf-1313/transcript/vmp9rsmxxz94pzr' },
  { navn: 'Kennet Thorsen',    url: 'https://learn.microsoft.com/en-us/users/kennetthorsen-5382/transcript/vj552syooqpjmxe' },
  { navn: 'Anders Gornitzka',  url: 'https://learn.microsoft.com/en-us/users/andersmajlandgornitzka-6219/transcript/vp16tr992qkyg3v' },
  { navn: 'Leon Pedersen',     url: 'https://learn.microsoft.com/da-dk/users/leonpedersen-6163/transcript/d9r3pagppq05nnq' },
  { navn: 'Ricki Mikkelsen',   url: 'https://learn.microsoft.com/da-dk/users/rickim-2768/transcript/vjwg5hyooqmpykq' },
  { navn: 'Michael Magnussen', url: 'https://learn.microsoft.com/en-us/users/michaelmagnussen-3499/transcript/d484t688o2qjx0v' },
  { navn: 'Simon Kaas Hansen', url: 'https://learn.microsoft.com/da-dk/users/simonkaashansen-7131/transcript/d8189h499wyggle' },
  { navn: 'Charly Münch',      url: 'https://learn.microsoft.com/da-dk/users/charlymunch-5729/transcript/dzmgmaj008qx5je' },
];

async function dismissCookies(page) {
  try {
    await page.click('#onetrust-accept-btn-handler');
    await new Promise(r => setTimeout(r, 800));
  } catch {}
}

// Læs label→value par fra et <li> element
function extractPairs(li) {
  const pairs = {};
  li.querySelectorAll('div').forEach(div => {
    const label = div.querySelector('h5')?.innerText?.replace(/\s+/g, ' ').trim().toLowerCase();
    const value = div.querySelector('p')?.innerText?.replace(/\s+/g, ' ').trim();
    if (label && value) pairs[label] = value;
  });
  return pairs;
}

async function extractContent(page) {
  return page.evaluate(() => {
    function extractPairs(li) {
      const pairs = {};
      li.querySelectorAll('div').forEach(div => {
        const label = div.querySelector('h5')?.innerText?.replace(/\s+/g, ' ').trim().toLowerCase();
        const value = div.querySelector('p')?.innerText?.replace(/\s+/g, ' ').trim();
        if (label && value) pairs[label] = value;
      });
      return pairs;
    }

    const certifications = [];
    const exams = [];

    // Aktive certificeringer (EN + DA)
    const certSelector = '#active-certifications-list li, #aktive-certificeringer-list li';
    document.querySelectorAll(certSelector).forEach(li => {
      const p = extractPairs(li);
      const title = p['certification title'] || p['certificeringstitel'] || '';
      if (title) {
        certifications.push({
          title,
          certNumber: p['certification number'] || p['certificeringsnummer'] || '',
          earnedOn:   p['earned on'] || p['optjent på'] || '',
          expiresOn:  p['expires on'] || p['udløber den'] || '',
        });
      }
    });

    // Beståede eksamener (EN + DA)
    const examSelector = '#passed-exams-list li, #beståede-eksaminer-list li';
    document.querySelectorAll(examSelector).forEach(li => {
      const p = extractPairs(li);
      const title    = p['exam title'] || p['eksamenstitel'] || '';
      const examCode = p['exam number'] || p['eksamennummer'] || '';
      const date     = p['passed date'] || p['beståelsesdato'] || '';
      if (title || examCode) {
        exams.push({ title, examCode, date });
      }
    });

    return { certifications, exams };
  });
}

async function scrapeTranscript(browser, konsulent) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36');

  await page.goto(konsulent.url + '?tab=credentials-tab', { waitUntil: 'networkidle2', timeout: 30000 });
  await dismissCookies(page);

  // Vent på at listen loader
  await page.waitForSelector('#active-certifications-list, #passed-exams-list', { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  const data = await extractContent(page);
  await page.close();
  return { ...konsulent, ...data };
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const resultater = [];

  for (const k of KONSULENTER) {
    try {
      console.log(`\nHenter ${k.navn}...`);
      const data = await scrapeTranscript(browser, k);
      resultater.push(data);

      if (data.certifications.length) {
        console.log(`  Certificeringer (${data.certifications.length}):`);
        data.certifications.forEach(c => console.log(`    ✓ ${c.title} — bestået ${c.earnedOn}, udløber ${c.expiresOn}`));
      } else {
        console.log(`  Certificeringer: ingen`);
      }

      if (data.exams.length) {
        console.log(`  Beståede eksamener (${data.exams.length}):`);
        data.exams.forEach(e => console.log(`    ✓ ${e.examCode} ${e.title} — ${e.date}`));
      }
    } catch (e) {
      console.error(`  FEJL: ${e.message}`);
      resultater.push({ ...k, certifications: [], exams: [], fejl: e.message });
    }
  }

  await browser.close();

  // Ryd debug-filer op
  fs.readdirSync(path.join(__dirname, '..')).filter(f => f.startsWith('debug-')).forEach(f =>
    fs.unlinkSync(path.join(__dirname, '..', f))
  );

  fs.writeFileSync(
    path.join(__dirname, '..', 'scrape-result.json'),
    JSON.stringify(resultater, null, 2), 'utf8'
  );
  console.log('\nResultat gemt: scrape-result.json');
}

main();
