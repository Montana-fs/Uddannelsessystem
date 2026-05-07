// Udforsk Readynez Manage-side for UTR-2025-94272
const puppeteer = require('puppeteer');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USER = process.argv[2];
const PASS = process.argv[3];

async function snap(page, navn) {
  const file = path.join(ROOT, `rn-${navn}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`Snap: rn-${navn}.png`);
}

async function login(page) {
  await page.goto('https://www.readynez.com/en/login/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Accept'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.type('input[placeholder="Username"]', USER);
  await page.type('input[placeholder="Password"]', PASS);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      .find(b => (b.textContent || b.value || '').toUpperCase().includes('LOG IN'));
    if (btn) btn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  console.log('Logget ind:', page.url());
}

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  await login(page);
  await snap(page, '4-licenses');

  // Find Manage-link for UTR-2025-94272
  const manageInfo = await page.evaluate(() => {
    // Kig i tabel-rækker efter UTR-2025-94272
    const rows = Array.from(document.querySelectorAll('tr'));
    for (const row of rows) {
      if (row.innerText?.includes('UTR-2025-94272')) {
        const link = row.querySelector('a');
        return { rowText: row.innerText?.trim(), href: link?.href, html: row.innerHTML?.slice(0, 800) };
      }
    }
    // Fallback: find alle manage-links
    const links = Array.from(document.querySelectorAll('a')).filter(a =>
      (a.textContent || '').toLowerCase().includes('manage') || (a.href || '').includes('manage')
    );
    return { links: links.map(l => ({ text: l.textContent?.trim(), href: l.href })) };
  });
  console.log('\nManage-info:', JSON.stringify(manageInfo, null, 2));

  // Naviger til manage-siden
  if (manageInfo.href) {
    console.log('\nNavigerer til:', manageInfo.href);
    await page.goto(manageInfo.href, { waitUntil: 'networkidle2', timeout: 20000 });
    await snap(page, '5-manage');
    console.log('URL:', page.url());

    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
        tag: el.tagName, type: el.type, name: el.name, id: el.id,
        placeholder: el.placeholder, value: el.value
      }));
      const tekst = document.body.innerText?.slice(0, 2000);
      return { inputs, tekst };
    });
    console.log('\nFormular-felter:', JSON.stringify(formInfo.inputs, null, 2));
    console.log('\nSide-tekst:', formInfo.tekst);
  }

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
