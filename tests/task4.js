// Task 4 regressions: room rewards must not overwrite map-only saves;
// Scrub must charge only when a card can actually be removed.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { start, DEVICES } = require('./util.js');
(async () => {
  const srv = await start(0);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ ...DEVICES.s24Landscape, serviceWorkers: 'block' });
    const pg = await ctx.newPage();
    const errors = [];
    pg.on('pageerror', e => errors.push(e.message));
    await pg.goto(srv.url);
    await pg.waitForFunction(() => window.G);
    let cases = 0;
    for (const cls of ['tide', 'echo', 'carto', 'duel']) {
      for (const boss of [false, true]) {
        const result = await pg.evaluate(([cls, boss]) => {
          window.FAST = 1;
          G.newRun(cls, { seed: 417, skipTravel: true });
          if (boss) {
            G.run.floor = 14;
            G.run.pos = { r: 13, i: 0 };
            G.run$.goMap();
          }
          const saved = localStorage.getItem('tidebound.run.v2');
          G.run$.goNode(boss ? 14 : 0, 0);
          let guard = 0;
          while (G.cb.mode && guard++ < 10) {
            if (G.cb.mode.k === 'chart') G.modeAct('done');
            else G.modeAct(G.cb.mode.k, 0);
          }
          G.cb.ens.forEach(e => dmgEnemy(e, 9999));
          after();
          return { saved, reward: G.S.screen, kind: G.S.kind,
            checkpoint: localStorage.getItem('tidebound.run.v2') };
        }, [cls, boss]);
        assert.equal(result.reward, 'reward');
        assert.equal(result.kind, boss ? 'boss' : 'fight');
        assert.equal(result.checkpoint, result.saved, `${cls}: rewards overwrote checkpoint`);
        await pg.reload();
        await pg.waitForFunction(() => window.G);
        const restored = await pg.evaluate(() => {
          const loaded = G.continueRun();
          return { loaded, screen: G.S.screen, run: JSON.stringify(G.run) };
        });
        assert.equal(restored.loaded, true);
        assert.equal(restored.screen, 'map');
        assert.equal(restored.run, JSON.stringify(JSON.parse(result.saved).run));
        // Replaying and leaving a normal reward must save the newly claimed gold.
        if (!boss) {
          const committed = await pg.evaluate(() => {
            window.FAST = 1;
            G.run$.goNode(0, 0);
            let guard = 0;
            while (G.cb.mode && guard++ < 10) G.modeAct(G.cb.mode.k === 'chart' ? 'done' : G.cb.mode.k, 0);
            G.cb.ens.forEach(e => dmgEnemy(e, 9999)); after();
            const gold = G.run.gold;
            const i = G.S.rows.findIndex(r => r.k === 'gold');
            const amount = G.S.rows[i].n;
            G.run$.claimRow(i); G.run$.rewDone();
            return { gold, amount, saved: JSON.parse(localStorage.getItem('tidebound.run.v2')).run };
          });
          assert.equal(committed.saved.floor, 1);
          assert.equal(committed.saved.gold, committed.gold + committed.amount);
        }
        cases++;
      }
    }
    const scrub = await pg.evaluate(() => {
      G.newRun('duel', { seed: 47, skipTravel: true });
      G.run.deck = [mk('saltburn')]; G.run.gold = 300;
      G.run$.openShop(); G.run$.shopRemove();
      const empty = { gold: G.run.gold, removals: G.run.removals, used: G.S.scrubbed, screen: G.S.screen };
      G.run.deck.push(mk('slash'));
      G.run$.shopRemove(); G.run$.pickCancel();
      const canceled = { gold: G.run.gold, removals: G.run.removals, used: G.S.scrubbed };
      G.run$.shopRemove(); G.run$.pickCard(G.run.deck[1].uid);
      return { empty, canceled, bought: { gold: G.run.gold, removals: G.run.removals, used: G.S.scrubbed, deck: G.run.deck.map(c => c.id) } };
    });
    assert.deepEqual(scrub.empty, { gold: 300, removals: 0, used: false, screen: 'shop' });
    assert.deepEqual(scrub.canceled, { gold: 300, removals: 0, used: false });
    assert.deepEqual(scrub.bought, { gold: 225, removals: 1, used: true, deck: ['saltburn'] });
    const events = await pg.evaluate(() => {
      const results = [];
      for (const cls of ['tide', 'echo', 'carto', 'duel']) {
        for (const ev of G.EVENTS) for (let i = 0; i < ev.o.length; i++) {
          G.newRun(cls, { seed: 617 + i, skipTravel: true });
          G.run.gold = 300; G.run.potions = ['salttonic', null, null];
          W.S = { screen: 'event', ev, t: 0 }; G.render();
          if (ev.o[i].ok && !ev.o[i].ok()) continue;
          G.run$.evOpt(i);
          // Finish nested event choices and card picks; event fights are covered by run bots.
          for (let j = 0; j < 10; j++) {
            const S = G.S;
            if (S.screen === 'pick') {
              const c = G.run$.pickable(S.mode, S.filter)[0];
              if (c) G.run$.pickCard(c.uid); else G.run$.pickCancel();
            } else if (S.screen === 'event' && S.ev !== ev) {
              const n = S.ev.o.findIndex(o => !o.ok || o.ok());
              if (n < 0) throw new Error(`No usable option: ${cls}/${ev.id}`);
              G.run$.evOpt(n);
            } else if (S.screen === 'msg') S.next();
            else break;
          }
          results.push({ cls, event: ev.id, option: i, screen: G.S.screen });
        }
      }
      return results;
    });
    assert(events.length > 140);
    assert(events.every(r => ['map', 'combat'].includes(r.screen)), JSON.stringify(events.filter(r => !['map', 'combat'].includes(r.screen))));
    assert.deepEqual(errors, []);
    console.log(`task4: ${cases} reward/reload cases across all 4 classes + committed rewards + empty/cancel/success Scrub + ${events.length} event options PASS; no page errors`);
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
