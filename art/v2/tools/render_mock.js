// node art/v2/tools/render_mock.js -> v2/mock-s24-battle.png (3120x1440) + mock-s24-battle-half.png (1560x720)
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../../node_modules/playwright'));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1040, height: 480 }, deviceScaleFactor: 3 });
  const sj = require('fs').readFileSync(path.resolve(__dirname, '../sprites/sprites.json'), 'utf8');
  await p.addInitScript(`window.SPRITES = ${sj};`);
  await p.goto('file://' + path.resolve(__dirname, '../mock-s24-battle.html'));
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.resolve(__dirname, '../_src/mock-s24-battle-raw.png') });
  await b.close();
})();
