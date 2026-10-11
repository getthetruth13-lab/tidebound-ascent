// Renders v2/preview.html -> v2/preview.png (full page) and v2/preview-cards.png (the 4 class cards).
// Usage: node art/v2/tools/render_preview.js   (uses the project's Playwright Chromium)
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../../node_modules/playwright'));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(__dirname, '../preview.html'));
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.resolve(__dirname, '../_src/preview-full.png'), fullPage: true });
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await p2.goto('file://' + path.resolve(__dirname, '../preview.html'));
  await p2.waitForLoadState('networkidle').catch(() => {});
  await p2.evaluate(() => document.fonts.ready);
  await p2.waitForTimeout(300);
  const el = await p2.$('#cards');
  await el.screenshot({ path: path.resolve(__dirname, '../_src/preview-cards-full.png'), omitBackground: false });
  await browser.close();
})();
