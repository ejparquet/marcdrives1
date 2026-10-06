import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const full  = process.argv[4] === 'full';

const dir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let n = 1;
while (fs.existsSync(path.join(dir, `screenshot-${n}${label ? '-'+label : ''}.png`))) n++;
const outPath = path.join(dir, `screenshot-${n}${label ? '-'+label : ''}.png`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 600));

// Pre-set counters to their final values BEFORE scrolling so the
// IntersectionObserver sees data-done and skips the animation entirely
await page.evaluate(() => {
  document.querySelectorAll('[data-target]').forEach(el => {
    el.dataset.done = '1';
    el.textContent = el.dataset.target + (el.dataset.suffix || '');
  });
});

// Scroll through page to trigger reveal IntersectionObservers
const pageHeight = await page.evaluate(() => document.body.scrollHeight);
let pos = 0;
while (pos < pageHeight) {
  pos = Math.min(pos + 600, pageHeight);
  await page.evaluate(y => window.scrollTo(0, y), pos);
  await new Promise(r => setTimeout(r, 70));
}

// Force any remaining hidden reveals visible
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
});

await page.evaluate(() => window.scrollTo(0, 0));
// Wait for all reveal transitions to finish: 720ms duration + 380ms max delay + buffer
await new Promise(r => setTimeout(r, 1300));

await page.screenshot({ path: outPath, fullPage: full });
await browser.close();
console.log('Screenshot saved:', outPath);
