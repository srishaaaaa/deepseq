// Diagnostic script (not part of the app): loads a URL in the real Chrome
// install via puppeteer-core and prints every console message + page
// error, so real warnings/errors can be read directly instead of guessed
// at from a screenshot.
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://localhost:3000/';
const waitMs = Number(process.argv[3] || 4000);

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));
page.on('requestfailed', (req) => console.log('[requestfailed]', req.url(), req.failure()?.errorText));
page.on('response', (res) => {
  if (res.status() >= 400) console.log(`[http ${res.status()}]`, res.url());
});

try {
  // Not networkidle0 -- Next.js dev mode keeps its HMR websocket open
  // forever, so "zero network connections" never actually happens.
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await new Promise((r) => setTimeout(r, waitMs));
} finally {
  // Always close, even on a navigation timeout -- otherwise a failed run
  // leaks a whole Chrome process, and enough of those piling up is what
  // was making later runs in the same sweep slow/flaky.
  await browser.close();
}
