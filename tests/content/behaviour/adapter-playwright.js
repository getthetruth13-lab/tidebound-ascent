// tests/content/behaviour/adapter-playwright.js
// Drives the real game (window.G + the global functions main.js exposes) in headless Chromium.
// Updated for the Phase 1 engine: newRun(cls,{skipTravel,seed}), starter relic cleared, combat-start modes resolved,
// ['play', i, tgt, {mark, flourish}] → G.playCard(i, opts). Never modifies engine files.
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');

async function open() {
  const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));
  const { start } = require(path.join(ROOT, 'serve.js'));
  const srv = await start(0, '127.0.0.1');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 832, height: 384 }, serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', e => errors.push(e.message));
  await pg.goto(srv.url + 'index.html');
  await pg.waitForFunction(() => window.G && window.G.CARDS);
  await pg.evaluate(() => { window.FAST = 1; });
  const api = {
    errors,
    async registry() { return pg.evaluate(() => ({ cards: Object.keys(G.CARDS), relics: Object.keys(G.RELICS || {}), potions: Object.keys(G.POTIONS || {}),
      api: { giveRelic: typeof G.giveRelic === 'function', usePotion: typeof G.usePotion === 'function' || typeof window.usePotion === 'function', opening: true } })); },
    async setup(s) {
      return pg.evaluate(s => {
        const mk = (id) => ({ id: id.replace(/\+$/, ''), uid: Math.random(), up: /\+$/.test(id) }); // 'arc+' = upgraded
        G.newRun(s.cls, { skipTravel: true, seed: 1 });
        G.run.relics = []; // drop the class starter relic so specs measure the bare mechanic
        if (s.relics) for (const id of s.relics) { if (G.giveRelic) G.giveRelic(id); else G.run.relics.push({ id }); }
        if (s.opening) for (const id of s.opening) { const ci = mk(id); ci.open = true; G.run.deck.push(ci); }
        const key = Object.keys(G.EN).find(k => k === 'knight') || Object.keys(G.EN).find(k => !G.EN[k].boss && !G.EN[k].elite);
        G.startCombat('fight', (s.enemies || [{}]).map(() => key));
        const cb = G.cb;
        for (let g = 0; g < 5 && cb.mode; g++) { if (cb.mode.k === 'chart') modeAct('done'); else if (cb.mode.opts) modeAct('choice', 0); else cb.mode = null; }
        cb.ens.forEach((e, i) => { const o = (s.enemies || [])[i] || {}; e.hp = e.max = o.hp || 100; e.block = o.block || 0; e.st = s.relics ? e.st : {}; /* keep statuses combat-start relics applied */ e.next = o.intent || { none: 1, lbl: 'idle' }; });
        if (!s.opening) { if (s.hand) cb.hand = s.hand.map(mk); cb.draw = (s.draw || []).map(mk); cb.disc = []; cb.exh = []; }
        if (s.slots) cb.slots = s.slots.map(mk);
        if (s.energy != null) cb.energy = s.energy; else if (!s.opening) cb.energy = 3;
        if (s.tide != null) cb.tide = s.tide;
        if (s.mom != null) cb.mom = s.mom;
        if (!s.relics) cb.p.block = 0;
        cb.tgt = 0;
      }, s);
    },
    async state() {
      return pg.evaluate(() => {
        const cb = G.cb; const ids = a => (a || []).map(c => c.id);
        if (!cb) return { ended: true, hp: G.run.hp, gold: G.run.gold, enemies: [], hand: [], draw: [], disc: [], exh: [], slots: [] };
        const sus = {}; for (const c of [...cb.hand, ...cb.draw, ...cb.disc, ...cb.exh]) if (c.sus != null) sus[c.id] = c.sus;
        return { hp: G.run.hp, maxHp: G.run.max, gold: G.run.gold, block: cb.p.block, energy: cb.energy, tide: cb.tide, tideDir: cb.tideDir, mom: cb.mom,
          pst: { ...cb.p.st, might: cb.pstr }, enemies: cb.ens.map(e => ({ hp: e.hp, block: e.block, st: { ...e.st } })),
          hand: ids(cb.hand), draw: ids(cb.draw), disc: ids(cb.disc), exh: ids(cb.exh), slots: ids(cb.slots), ranks: cb.slots.map(w => w.rank || 0), nslots: cb.nslots, mode: cb.mode ? cb.mode.k : null, sus,
          parry: cb.parry, turn: cb.turn, powers: cb.powers.map(p => p.id), stat: { ...cb.stat, lastEchoed: undefined } };
      });
    },
    async step(st) {
      return pg.evaluate(st => {
        const [op, a, b] = st;
        if (op === 'play') { if (b != null) G.cb.tgt = b; G.playCard(a, st[3] || {}); }
        else if (op === 'endTurn') { endTurn(); }
        else if (op === 'choose') modeAct('choice', a);
        else if (op === 'slot') modeAct('slot', a);
        else if (op === 'chartDone') modeAct('done');
        else if (op === 'advance') G.advance(a);
        else if (op === 'potion') { const f = G.usePotion || window.usePotion; if (b != null) G.cb.tgt = b; f(a, b); }
      }, st);
    },
    // Run an arbitrary in-page function (guards / audits): fn is serialised, arg must be JSON.
    async eval(fn, arg) { return pg.evaluate(fn, arg); },
    async close() { await browser.close(); srv.close(); },
  };
  return api;
}
module.exports = { open };
