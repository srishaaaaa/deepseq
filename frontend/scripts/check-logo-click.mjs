// Diagnostic: navigate to a page, find the element containing "DEEPSEQ"
// text, click its nearest link ancestor (or itself), and report the
// resulting URL + HTTP status -- reproduces the reported "logo click ->
// 404" bug directly instead of guessing from source.
import puppeteer from 'puppeteer-core';

const startUrl = process.argv[2] || 'http://localhost:3000/';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();
page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text()));
page.on('response', (res) => {
  if (res.status() >= 400) console.log('[http]', res.status(), res.url());
});

await page.goto(startUrl, { waitUntil: 'load', timeout: 30000 });
console.log('Loaded:', startUrl);

const linkInfo = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('*')).filter(
    (el) => el.textContent?.trim() === 'DEEPSEQ' && el.children.length === 0
  );
  if (els.length === 0) return { found: false };
  const el = els[0];
  const link = el.closest('a');
  return {
    found: true,
    tag: el.tagName,
    hasAnchorAncestor: !!link,
    href: link ? link.getAttribute('href') : null,
    resolvedHref: link ? link.href : null,
  };
});
console.log('Logo element info:', JSON.stringify(linkInfo, null, 2));

if (linkInfo.found && linkInfo.hasAnchorAncestor) {
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*')).filter(
      (el) => el.textContent?.trim() === 'DEEPSEQ' && el.children.length === 0
    );
    els[0].closest('a').click();
  });
  await new Promise((r) => setTimeout(r, 1500));
  console.log('After click, URL is now:', page.url());
} else {
  console.log('No <a> ancestor found around the logo text on this page.');
}

await browser.close();
