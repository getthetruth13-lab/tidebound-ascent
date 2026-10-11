// Renders preview.html to preview.png. Usage: node tools/render_preview.js
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../node_modules/playwright'));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(__dirname, '../preview.html'));
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.resolve(__dirname, '../preview.png'), fullPage: true });
  await browser.close();
})();
