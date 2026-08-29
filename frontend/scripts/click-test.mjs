// Diagnostic script: loads a page, clicks a selector, and reports the
// resulting URL -- a real functional check (does the button actually
// navigate/act), not just "the handler code looks right."
import puppeteer from 'puppeteer-core';

const [, , url, selector] = process.argv;
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1500)); // let hydration/entrance animation settle
  const count = await page.$$eval(selector, (els) => els.length);
  console.log('matches:', count, 'before click:', page.url());
  await page.click(selector);
  await new Promise((r) => setTimeout(r, 1200));
  console.log('after click:', page.url());
} finally {
  await browser.close();
}
