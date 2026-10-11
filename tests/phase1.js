// tests/phase1.js — Phase 1 acceptance criteria (design-v2 §1.10 + §W.7/§W.8) plus seeded full Act 1 simulations.
//   node tests/phase1.js            all sections
//   SIMS=n node tests/phase1.js     seeds per class for the Act 1 sims (default 8)
// Drives window.G in headless Chromium at the S24 landscape size. Engine files are never modified.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const { start, DEVICES } = require('./util.js');
const SIMS = +(process.env.SIMS || 8);
let pass = 0, fail = 0; const fails = [];
const ok = (c, name, detail) => { if (c) pass++; else { fail++; fails.push(name); console.log('  ✘ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 400) : '')); } };
const sec = n => console.log('\n# ' + n);

(async () => {
  const srv = await start(0);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...DEVICES.s24Landscape, serviceWorkers: 'block' });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', e => errors.push(e.message + ' @ ' + ((e.stack || '').split('\n')[1] || '').trim()));
  await pg.goto(srv.url + 'index.html');
  await pg.waitForFunction(() => window.G && G.CARDS);
  await pg.addScriptTag({ path: path.join(__dirname, 'p1/checks.js') });
  await pg.evaluate(async () => { window.FAST = 1; window.REG = await import('/src/core/registry.js'); window.CARDSM = await import('/src/engine/cards.js'); });

  // ---------------------------------------------------------------- seeded Act 1 bot (in-page, deterministic)
  await pg.evaluate(() => {
    const C = G.combat$, R = G.run$;
    window.SIM = async function (cls, seed, { maxSteps = 6000, trace = false } = {}) {
      let s = (seed * 2654435761) >>> 0; const brnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const T = []; const tr = x => { if (trace) T.push(x); };
      G.newRun(cls, { seed, skipTravel: true });
      tr({ boss: G.run.boss, map: G.run.map.map(r => r.map(n => n.t + n.to.join(''))).join('|') });
      let steps = 0, last = '', same = 0, turns = 0, combats = 0; const screens = {};
      const tick = () => new Promise(r => setTimeout(r, 0));
      while (steps++ < maxSteps) {
        const S = W.S, run = W.run, scr = S.screen; screens[scr] = (screens[scr] || 0) + 1;
        if (scr === 'end') return { ok: true, won: run.won, floor: run.floor, hp: run.hp, steps, turns, combats, screens, relicsAtBoss: run.stats.relicsAtBoss, potionsAtBoss: run.stats.potionsAtBoss, deck: run.deck.length, T };
        const sig = scr + '|' + run.floor + '|' + run.hp + '|' + run.gold + '|' + (W.cb ? [W.cb.turn, W.cb.energy, W.cb.hand.length, W.cb.ens.map(e => e.hp).join(','), !!W.cb.mode, W.cb.busy].join(';') : '') + '|' + JSON.stringify(S.rows || '') + (S.cardsOpen ?? '') + (S.swap ?? '') + (S.opened ? 1 : 0) + (S.chosen ? S.chosen.length : '');
        if (sig === last) { if (++same > 60) return { ok: false, reason: 'softlock on ' + scr, floor: run.floor, sig, steps, T }; } else { same = 0; last = sig; }
        try {
          if (scr === 'travel' || scr === 'title') { W.S = { screen: 'map' }; }
          else if (scr === 'map') { const re = R.reachable(); const r = run.pos.r + 1; if (!run.map[r]) return { ok: false, reason: 'map end without boss', T }; const i = re[Math.floor(brnd() * re.length)]; tr({ go: r + ':' + i + ':' + run.map[r][i].t }); R.goNode(r, i); }
          else if (scr === 'combat') {
            const cb = W.cb; if (!cb) { await tick(); continue; }
            if (cb.busy) { await tick(); continue; }
            if (cb.mode) { const m = cb.mode; if (m.k === 'choice') C.modeAct('choice', Math.floor(brnd() * m.opts.length)); else if (m.k === 'chart') C.modeAct('done'); else if (m.k === 'slot') C.modeAct('slot', 0); continue; }
            if (cb.turn !== cb._simT) { cb._simT = cb.turn; turns++; if (cb.turn === 1) { combats++; tr({ fight: cb.ens.map(e => e.key + ':' + e.hp), kind: cb.kind }); }
              tr({ t: cb.turn, intents: cb.ens.map(e => JSON.stringify(e.next || {})).join(';'), hand: cb.hand.map(c => c.id).join(',') });
              // potions: drink one sometimes (target the first living enemy)
              // potions: a player drinks them in elite/boss fights or when hurt (and now and then otherwise)
              const pi = run.potions.findIndex(Boolean); if (pi >= 0 && (cb.kind !== 'fight' || run.hp < run.max * .5 || brnd() < .1) && C.canDrink(run.potions[pi])) { const a = C.alive(); C.drinkPotion(pi, cb.ens.indexOf(a[0])); }
              if (run.cls === 'carto' && cb.slots.some(Boolean)) C.advance(cb.slots.findIndex(Boolean));
            }
            const a = C.alive(); if (!a.length) { await tick(); continue; }
            cb.tgt = cb.ens.indexOf(a.reduce((x, y) => x.hp <= y.hp ? x : y));
            const playable = cb.hand.map((c, i) => [c, i]).filter(([c]) => C.canPlay(c));
            if (playable.length && turns < 4000) {
              playable.sort((x, y) => (G.CARDS[y[0].id].t === 'P') - (G.CARDS[x[0].id].t === 'P') || CARDSM.cost(y[0]) - CARDSM.cost(x[0]));
              const [c, i] = playable[0]; const d = G.CARDS[c.id];
              const o = {}; if (run.cls === 'echo' && !cb.mark && d.t !== 'P' && !d.faint) o.mark = true; if (run.cls === 'duel' && d.t === 'A' && cb.mom >= 3) o.flourish = true;
              G.playCard(i, o);
            } else C.endTurn();
          }
          else if (scr === 'reward') {
            if (S.swap != null) { R.potionSwap(-1); continue; }
            if (S.cardsOpen != null) { const row = S.rows[S.cardsOpen]; tr({ cards: row.cards.join(',') }); if (brnd() < .8) { R.rewCard(Math.floor(brnd() * row.cards.length)); R.rewConfirmCards(); } else { R.rewSkipCards(); R.rewSkipAnswer(true); } continue; }
            const i = S.rows.findIndex(r => !r.done); if (i >= 0) { tr({ row: S.rows[i].k + ':' + (S.rows[i].id || S.rows[i].n || '') }); R.claimRow(i); } else R.rewDone();
          }
          else if (scr === 'chest') { if (!S.opened) R.openChestLid(); else { const i = S.rows.findIndex(r => !r.done); if (i >= 0) { tr({ chest: S.rows[i].k + ':' + (S.rows[i].id || S.rows[i].n) }); R.claimRow(i); if (W.S === S && !S.rows[i].done) S.rows[i].done = true; } else if (R.chestDone) R.chestDone(); else R.goMap(); } }
          else if (scr === 'shop') { tr({ shop: [...S.cards, ...S.colorless, ...S.relics, ...S.potions].map(x => x.id + '$' + x.price).join(',') });
            if (!S._b) { S._b = 1; const it = ['relics', 'cards', 'potions'].flatMap(k => S[k].map((x, i) => [k, i, x])).filter(([, , x]) => !x.sold && x.price <= run.gold); if (it.length && brnd() < .7) { const [k, i] = it[Math.floor(brnd() * it.length)]; R.buy(k, i); continue; } }
            if (W.S.screen === 'shop') R.goMap(); }
          else if (scr === 'rest') { const o = R.campOptions(); R.campDo(run.hp < run.max * .55 ? 'mend' : o[Math.floor(brnd() * o.length)].k); }
          else if (scr === 'event') { const ev = S.ev; const okO = ev.o.map((o, i) => [o, i]).filter(([o]) => !o.ok || o.ok()); tr({ ev: ev.id }); const pickO = okO[Math.floor(brnd() * okO.length)]; if (!pickO) return { ok: false, reason: 'event with no usable option ' + ev.id, T }; R.evOpt(pickO[1]); }
          else if (scr === 'pick') { const el = document.querySelector('#app .pick .card[data-uid], #app [onclick^="pickCard"]'); const m = el && (el.getAttribute('onclick') || '').match(/pickCard\(([\d.]+)\)/); if (m) R.pickCard(+m[1]); else if (S.list && S.list.length) R.pickCard(S.list[0].uid); else R.pickCancel(); }
          else if (scr === 'potpick') { if (S.chosen.length === 0 && run.potions.some(p => !p)) R.potPickToggle(0); else R.potPickDone(); }
          else if (scr === 'msg') { S.next(); }
          else { return { ok: false, reason: 'unknown screen ' + scr, T }; }
        } catch (e) { return { ok: false, reason: 'threw on ' + scr + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1], floor: run.floor, T }; }
        if (steps % 25 === 0) await tick();
      }
      return { ok: false, reason: 'step cap ' + maxSteps + ' on ' + W.S.screen, floor: W.run.floor, T };
    };
  });

  // ---------------------------------------------------------------- 1. seeded determinism
  sec('1. Seeded RNG: same seed + same choices → identical maps, rewards, enemy rolls');
  for (const [cls, seed] of [['tide', 101], ['echo', 202], ['carto', 303], ['duel', 404]]) {
    const a = await pg.evaluate(([c, s]) => SIM(c, s, { trace: true }), [cls, seed]);
    const b = await pg.evaluate(([c, s]) => SIM(c, s, { trace: true }), [cls, seed]);
    ok(a.ok && b.ok, `${cls} seed ${seed} completes`, [a.reason, b.reason]);
    const ja = JSON.stringify(a.T), jb = JSON.stringify(b.T);
    ok(ja === jb && a.T.length > 20, `${cls} seed ${seed}: identical trace (${a.T.length} events, floor ${a.floor})`, ja === jb ? a.T.length : (() => { for (let i = 0; i < a.T.length; i++) if (JSON.stringify(a.T[i]) !== JSON.stringify(b.T[i])) return [i, a.T[i], b.T[i]]; })());
  }
  const diff = await pg.evaluate(() => { G.newRun('tide', { seed: 1, skipTravel: true }); const m1 = JSON.stringify(G.run.map); G.newRun('tide', { seed: 2, skipTravel: true }); return m1 !== JSON.stringify(G.run.map); });
  ok(diff, 'different seeds give different maps');

  // ---------------------------------------------------------------- 2. relics
  sec('2. Relics: every P1 relic registered, G.giveRelic, one check each');
  const rel = await pg.evaluate(() => { const all = Object.values(G.RELICS); const p1 = all.filter(r => r.phase === 'P1'); const nonBossP1 = p1.filter(r => r.tier !== 'b');
    const res = {}; for (const r of p1) { const f = RELIC_CHECKS[r.id]; if (!f) { res[r.id] = 'no check'; continue; } try { const v = f(); if (!v[0]) res[r.id] = v[1]; } catch (e) { res[r.id] = 'threw ' + e.message; } }
    const stubs = p1.filter(r => r.stub).map(r => r.id);
    return { total: all.length, p1: p1.length, nonBossP1: nonBossP1.length, byPhase: all.reduce((o, r) => (o[r.phase] = (o[r.phase] || 0) + 1, o), {}), bad: res, stubs, give: typeof G.giveRelic };
  });
  console.log('  relics:', JSON.stringify({ total: rel.total, P1: rel.p1, byPhase: rel.byPhase }));
  ok(rel.give === 'function', 'G.giveRelic exists');
  ok(rel.stubs.length === 0, 'no P1 relic is a stub', rel.stubs);
  ok(Object.keys(rel.bad).length === 0, `all ${rel.p1} P1 relics pass their behaviour check`, rel.bad);
  const drops = await pg.evaluate(() => { const R = G.run$; let elite = 0, chest = 0, chestGold = 0; const N = 200;
    for (let k = 0; k < N; k++) { G.newRun('tide', { seed: 500 + k, skipTravel: true }); R.combatRewards('elite', {}); if (W.S.rows.some(r => r.k === 'relic')) elite++;
      R.openChest(); if (W.S.rows[0].k === 'relic') chest++; if (W.S.rows.some(r => r.k === 'gold')) chestGold++; }
    return { N, elite, chest, chestGold }; });
  ok(drops.elite === drops.N, 'elites always drop a relic', drops);
  ok(drops.chest === drops.N && drops.chestGold > 0, `chests drop a relic (+ gold ${drops.chestGold}/${drops.N})`, drops);

  // ---------------------------------------------------------------- 3. merchant
  sec('3. Merchant: 5 class + 2 colourless + 3 relics (Shop tier right) + 3 potions + Scrub; exactly 1 sale; Scrub 75/100/125');
  const shop = await pg.evaluate(() => { const R = G.run$; const bad = []; const N = 120; let shopTier = 0;
    for (let k = 0; k < N; k++) { const cls = ['tide', 'echo', 'carto', 'duel'][k % 4]; G.newRun(cls, { seed: 900 + k, skipTravel: true }); R.openShop(); const S = W.S;
      const cards = S.cards, sale = cards.filter(c => c.sale);
      if (cards.length !== 5 || cards.some(c => G.CARDS[c.id].cls !== cls)) bad.push([k, 'cards', cards.map(c => c.id)]);
      const types = cards.map(c => G.CARDS[c.id].t).sort().join(''); const want = cls === 'carto' ? 'AASSW' : 'AAPSS'; if (types !== want) bad.push([k, 'types', types]);
      if (S.colorless.length !== 2) bad.push([k, 'colourless', S.colorless.length]);
      if (sale.length !== 1 || sale[0].price !== Math.round(sale[0].base / 2)) bad.push([k, 'sale', cards.map(c => [c.base, c.price, !!c.sale])]);
      if (S.relics.length !== 3 || !S.relics[2].right) bad.push([k, 'relics', S.relics]);
      if (G.RELICS[S.relics[2].id].tier === 'shop') shopTier++;
      if (new Set(S.relics.map(r => r.id)).size !== 3) bad.push([k, 'dup relic']);
      if (S.potions.length !== 3) bad.push([k, 'potions', S.potions.length]);
      if (!document.querySelector('#app .shop, #app [onclick*="shopRemove"]')) bad.push([k, 'no scrub button']); }
    // Scrub price ladder
    G.newRun('tide', { seed: 77, skipTravel: true }); G.run.gold = 999; const prices = [];
    for (let k = 0; k < 3; k++) { R.openShop(); prices.push(R.scrubPrice()); R.shopRemove(); if (W.S.screen === 'pick') { R.pickCard(G.run.deck[0].uid); } }
    return { N, bad: bad.slice(0, 5), nbad: bad.length, shopTier, prices }; });
  ok(shop.nbad === 0, `${shop.N} merchants have the right composition`, shop.bad);
  ok(shop.shopTier === shop.N, `right-hand relic is Shop tier in ${shop.shopTier}/${shop.N}`);
  ok(JSON.stringify(shop.prices) === '[75,100,125]', 'Scrub costs 75 → 100 → 125', shop.prices);

  // ---------------------------------------------------------------- 4. potions
  sec('4. Potions: 24 usable, class potions only for their class, drop chance ±10 and resets, full slots → swap/discard');
  const pot = await pg.evaluate(() => { const R = G.run$; const ids = Object.keys(G.POTIONS); const bad = {};
    for (const id of ids) { const f = POTION_CHECKS[id]; if (!f) { bad[id] = 'no check'; continue; } try { const v = f(); if (!v[0]) bad[id] = v[1]; } catch (e) { bad[id] = 'threw ' + e.message; } }
    const leak = {}; for (const cls of ['tide', 'echo', 'carto', 'duel']) { G.newRun(cls, { seed: 3, skipTravel: true }); for (let k = 0; k < 3000; k++) { const p = G.POTIONS[R.randomPotion()]; if (p.cls && p.cls !== cls) leak[cls + ':' + p.id] = 1; } }
    G.newRun('tide', { seed: 5, skipTravel: true }); const seq = [G.run.potionChance]; for (let k = 0; k < 12; k++) { R.potionRoll('fight'); seq.push(G.run.potionChance); }
    const steps = seq.slice(1).map((v, i) => Math.abs(v - seq[i])); const stepOK = steps.every(d => d === 10 || d === 0) && seq.every(v => v >= 10 && v <= 90);
    G.newRun('tide', { seed: 6, skipTravel: true }); const reset = G.run.potionChance;
    // full slots → swap / discard
    G.newRun('tide', { seed: 8, skipTravel: true }); G.run.potions = ['salttonic', 'salttonic', 'salttonic']; W.S = { screen: 'reward', kind: 'fight', rows: [{ k: 'potion', id: 'urchin' }] }; G.render();
    R.claimRow(0); const swapUI = W.S.swap === 0 && !!document.querySelector('#app [onclick^="potionSwap"]'); R.potionSwap(1); const swapped = G.run.potions.join(',');
    W.S = { screen: 'reward', kind: 'fight', rows: [{ k: 'potion', id: 'sparkphial' }] }; R.claimRow(0); R.potionSwap(-1); const discarded = G.run.potions.join(',') === swapped && W.S.rows[0].done;
    return { n: ids.length, bad, leak: Object.keys(leak), seq, stepOK, reset, swapUI, swapped, discarded }; });
  ok(pot.n === 24, '24 potions registered', pot.n);
  ok(Object.keys(pot.bad).length === 0, 'all 24 potions usable with their effect', pot.bad);
  ok(pot.leak.length === 0, 'class potions roll only for their class', pot.leak);
  ok(pot.stepOK && pot.reset === 40, `drop chance moves ±10 within 10–90 and resets to 40 (${pot.seq.join('→')})`);
  ok(pot.swapUI && pot.swapped === 'salttonic,urchin,salttonic' && pot.discarded, 'full slots offer swap or discard', pot);

  // ---------------------------------------------------------------- 5. ? rooms + events
  sec('5. ? rooms (adaptive odds), 6 shrines + 10 Act 1 events, requirements enforced');
  const q = await pg.evaluate(() => { const R = G.run$; G.newRun('tide', { seed: 12, skipTravel: true }); const cnt = {}; const N = 4000; let adaptOK = true;
    for (let k = 0; k < N; k++) { const before = { ...G.run.qOdds }; W.S = { screen: 'map' }; W.cb = null; G.run.seenEvents = {}; G.run.shrinesThisAct = {}; R.resolveUnknown(); const o = G.run.lastQ; cnt[o] = (cnt[o] || 0) + 1;
      for (const kk of ['fight', 'shop', 'treasure']) { const want = kk === o ? ({ fight: 12, shop: 4, treasure: 3 })[kk] : before[kk] + ({ fight: 12, shop: 4, treasure: 3 })[kk]; if (G.run.qOdds[kk] !== want) adaptOK = false; } W.cb = null; }
    const ev = G.EVENTS; const shrines = ev.filter(e => e.pool === 'shrine').map(e => e.id), act = ev.filter(e => e.pool !== 'shrine' && e.act === 1).map(e => e.id);
    return { cnt, N, adaptOK, shrines, act }; });
  console.log('  ? outcomes over', q.N, 'rolls:', JSON.stringify(q.cnt));
  ok(q.adaptOK, '? odds: the hit resets to base, the others grow by their step');
  ok(q.cnt.event > q.cnt.fight && q.cnt.fight > q.cnt.shop && q.cnt.treasure > 0, '? outcomes are mostly events, then fights, shops, chests', q.cnt);
  ok(q.shrines.length === 6 && q.act.length === 10, `6 shrines + 10 Act 1 events (${q.shrines.length} + ${q.act.length})`, q);
  const evr = await pg.evaluate(async () => { const R = G.run$; const res = {}; const errs = [];
    for (const ev of G.EVENTS) for (let i = 0; i < ev.o.length; i++) { G.newRun('tide', { seed: 31 + i, skipTravel: true }); G.run.gold = 300; G.run.potions = ['salttonic', null, null];
      W.S = { screen: 'event', ev, t: 0 }; G.render(); const o = ev.o[i]; if (o.ok && !o.ok()) { res[ev.id + '#' + i] = 'locked'; continue; }
      const snap = JSON.stringify([G.run.hp, G.run.max, G.run.gold, G.run.deck.length, G.run.relics.length, G.run.potions, G.run.charms]);
      try { R.evOpt(i); let g = 0; while (g++ < 4) { const S = W.S; if (S.screen === 'pick') { const c = R.pickable(S.mode, S.filter)[0]; if (c) R.pickCard(c.uid); else R.pickCancel(); } else if (S.screen === 'event' && S.ev !== ev) R.evOpt(0); else break; }
        const changed = W.S.screen !== 'event' || JSON.stringify([G.run.hp, G.run.max, G.run.gold, G.run.deck.length, G.run.relics.length, G.run.potions, G.run.charms]) !== snap;
        res[ev.id + '#' + i] = changed ? W.S.screen : 'NO EFFECT'; } catch (e) { errs.push(ev.id + '#' + i + ': ' + e.message); } W.cb = null; }
    // requirements
    const req = {};
    G.newRun('tide', { seed: 40, skipTravel: true }); const find = id => G.EVENTS.find(e => e.id === id);
    G.run.hp = 8; req.tidepoolLowHp = R.eventOK(find('tidepool')) === false; G.run.hp = 40; req.tidepoolOk = R.eventOK(find('tidepool')) === true;
    G.run.deck = G.run.deck.slice(0, 5); req.mirrorSmallDeck = R.eventOK(find('mirror')) === false;
    G.run.deck.forEach(c => c.up = true); req.anvilAllUp = R.eventOK(find('anvil')) === false;
    G.run.shrinesThisAct.wishing = 1; req.shrineOncePerAct = R.eventOK(find('wishing')) === false; G.run.seenEvents.loom = 1; req.eventOncePerRun = R.eventOK(find('loom')) === false;
    W.S = { screen: 'map' };
    return { res, errs, req }; });
  const noEff = Object.entries(evr.res).filter(([, v]) => v === 'NO EFFECT').map(([k]) => k);
  console.log('  event options:', Object.keys(evr.res).length, 'tried;', Object.values(evr.res).filter(v => v === 'locked').length, 'locked by their own requirement;', 'leave-type options with no effect:', noEff.join(' '));
  ok(evr.errs.length === 0, 'every event option runs without throwing', evr.errs);
  ok(Object.values(evr.req).every(Boolean), 'event requirements enforced', evr.req);

  // ---------------------------------------------------------------- 6. roster
  sec('6. Act 1 roster: 12 normals (easy/hard), 3 elites, 3 bosses; boss chosen per run and shown on the map');
  const ros = await pg.evaluate(() => { const E = REG.ENCOUNTERS; const keys = p => [...new Set(E[p].flatMap(x => x.e))];
    const normals = [...new Set([...keys('easy'), ...keys('hard')])]; const bosses = new Set();
    for (let k = 0; k < 40; k++) { G.newRun('tide', { seed: 1000 + k, skipTravel: true }); bosses.add(G.run.boss); }
    G.newRun('tide', { seed: 1001, skipTravel: true }); W.S = { screen: 'map' }; G.render(); const bn = G.EN[G.run.boss].n;
    const shown = document.body.innerText.includes(bn) || !!document.querySelector('.bossnode, .node.boss');
    const missing = [...normals, ...keys('elite'), ...keys('boss')].filter(k => !G.EN[k]);
    return { normals, elites: E.elite.length, bossesPool: keys('boss'), bossesSeen: [...bosses], shown, bn, missing, easy: keys('easy'), hard: keys('hard') }; });
  console.log('  normals:', ros.normals.join(','), '| elites:', ros.elites, '| bosses:', ros.bossesPool.join(','));
  ok(ros.normals.length === 12 && ros.easy.length && ros.hard.length, '12 normal enemies in easy/hard pools', ros.normals);
  ok(ros.elites === 3 && ros.bossesPool.length === 3 && ros.missing.length === 0, '3 elites, 3 bosses, all registered', ros);
  ok(ros.bossesSeen.length === 3, 'all three bosses get chosen across seeds', ros.bossesSeen);
  ok(ros.shown, `chosen boss (${ros.bn}) shown on the map`);
  const mat = await pg.evaluate(() => { P1.fr('tide', ['matriarch']); G.run.hp = G.run.max = 999; const cb = G.cb; const s = []; for (let t = 0; t < 6 && G.cb; t++) { s.push(cb.ens.filter(e => e.hp > 0).map(e => e.key + ':' + JSON.stringify(e.next || {}).slice(0, 40)).join(' | ')); cb.hand = []; G.combat$.endTurn(); P1.res(); } return { s, hp: G.run.hp }; });
  ok(mat.s.length === 6 && mat.s.some(x => x.includes('tendril')), 'Kelp Matriarch fight runs 6 enemy turns and summons tendrils', mat.s);

  // ---------------------------------------------------------------- 7. reward odds + Swell
  sec('7. Card reward odds + Swell (10,000 rolls)');
  const odds = await pg.evaluate(() => { const R = G.run$; const out = {};
    for (const src of ['fight', 'elite']) { G.newRun('tide', { seed: 4242, skipTravel: true }); const n = { c: 0, u: 0, r: 0 }; let maxDry = 0, dry = 0;
      for (let k = 0; k < 10000; k++) { const r = G.CARDS[R.rollCards(1, src)[0]].r; n[r]++; if (r === 'r') dry = 0; else maxDry = Math.max(maxDry, ++dry); }
      out[src] = { ...n, rare: +(n.r / 100).toFixed(2), maxDry }; }
    G.newRun('tide', { seed: 1, skipTravel: true }); const boss = R.rollCards(3, 'boss', { forceR: 'r' }).map(id => G.CARDS[id].r).join('');
    out.start = R.cardOdds('fight', -4); out.boss = boss; out.swellStart = G.run.swell; return out; });
  console.log('  fight:', JSON.stringify(odds.fight), '| elite:', JSON.stringify(odds.elite), '| fight odds at Swell −4:', JSON.stringify(odds.start));
  ok(odds.fight.rare >= 3 && odds.fight.rare <= 8, `normal-fight Rare rate ${odds.fight.rare}% is within 3–8%`);
  ok(odds.elite.rare > odds.fight.rare, `elite Rare rate ${odds.elite.rare}% > normal`);
  ok(odds.start.r === 1 && odds.start.u === 35, 'Swell starts at −4 (Rare 1%)', odds.start);
  ok(odds.boss === 'rrr', 'boss rewards are all Rare');

  // ---------------------------------------------------------------- 8. terminology + card text from data
  sec('8. Terminology rename + class card text matches data-v2');
  const term = await pg.evaluate(async () => { const bad = []; const RX = /\b(Block|Strength|Weak|Vulnerable|Exhaust(s|ed)?)\b/;
    const chk = (where, s) => { if (typeof s === 'string' && RX.test(s.replace(/<[^>]+>/g, ''))) bad.push(where + ': ' + s.replace(/<[^>]+>/g, '').slice(0, 90)); };
    for (const [id, d] of Object.entries(G.CARDS)) { chk('card ' + id, d.n); chk('card ' + id, CARDSM.desc(G.run$ ? { id, up: false } : null)); chk('card+ ' + id, CARDSM.desc({ id, up: true })); }
    for (const [id, r] of Object.entries(G.RELICS)) { chk('relic ' + id, r.n); chk('relic ' + id, r.d); }
    for (const [id, p] of Object.entries(G.POTIONS)) { chk('potion ' + id, p.n); chk('potion ' + id, p.d); }
    for (const e of G.EVENTS) { chk('event ' + e.id, e.t); e.o.forEach((o, i) => { chk('event ' + e.id + '#' + i, o.l); chk('event ' + e.id + '#' + i, o.d); }); }
    for (const [id, e] of Object.entries(G.EN)) chk('enemy ' + id, e.n);
    try { const KW = (await import('/src/data/keywords.js')); for (const [k, v] of Object.entries(KW.KW || KW.default || {})) { chk('kw ' + k, k); chk('kw ' + k, typeof v === 'string' ? v : v && (v.d || v.t)); } } catch (e) { bad.push('kw import ' + e.message); }
    // rendered screens
    for (const scr of ['title', 'map', 'shop', 'rest', 'combat']) { G.newRun(['tide', 'echo', 'carto', 'duel'][scr.length % 4], { seed: 9, skipTravel: true }); if (scr === 'shop') G.run$.openShop(); else if (scr === 'combat') G.startCombat('fight', ['knight', 'slug']); else { W.S = { screen: scr }; G.render(); } P1.res(); chk('screen ' + scr, document.body.innerText); }
    W.cb = null; W.S = { screen: 'map' };
    return bad; });
  ok(term.length === 0, 'no player-facing Block/Strength/Weak/Vulnerable/Exhaust', term.slice(0, 8));
  const data = require(path.resolve(__dirname, '../design/data-v2.json'));
  const want = {}; for (const cls of Object.keys(data.cards)) for (const c of data.cards[cls]) want[c.id] = c.effect;
  const txt = await pg.evaluate(ids => { const o = {}; for (const id of ids) if (G.CARDS[id]) o[id] = CARDSM.plain ? CARDSM.plain(CARDSM.desc({ id, up: false })) : CARDSM.desc({ id, up: false }).replace(/<[^>]+>/g, ''); return o; }, Object.keys(want));
  const norm = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/[“”]/g, '"').trim().replace(/\.$/, '');
  const mism = Object.keys(txt).filter(id => norm(txt[id]) !== norm(want[id])).map(id => [id, txt[id], want[id]]);
  console.log('  class cards implemented:', Object.keys(txt).length, 'of', Object.keys(want).length, 'in data (the rest are Phase 2 pool cards)');
  ok(mism.length === 0, 'implemented class card text == data-v2 effect text (cohesion pass applied)', mism.slice(0, 6));

  // ---------------------------------------------------------------- 9. environments
  sec('9. Environments: every env renders; ≤300 particles; reduced / off / reduced-motion respected; re-render keeps effects');
  const envr = await pg.evaluate(async () => { const ids = Object.keys(G.ENV.envs); const out = { n: ids.length, over: [], noroot: [] }; const wait = ms => new Promise(r => setTimeout(r, ms));
    G.settings.envFx = 'full';
    for (const id of ids) { G.debugEnv(id, 'normal'); await wait(30); const s = G.envState(); if (s.id !== id) out.noroot.push(id); if (s.particles > 300) out.over.push([id, s.particles]); }
    G.debugEnv('a1_shore', 'elite'); await wait(30); out.elite = G.envState().grade;
    G.debugEnv('a1_shore', 'normal'); await wait(30); const el = document.querySelector('#envfx'); const l1 = document.querySelector('#env .envL'); const p1 = G.envState().particles;
    for (let k = 0; k < 5; k++) G.render(); await wait(30); out.keep = document.querySelector('#envfx') === el && document.querySelector('#env .envL') === l1 && G.envState().particles === p1;
    G.settings.envFx = 'reduced'; G.debugEnv('a1_shore', 'normal'); await wait(30); out.reduced = G.envState();
    G.settings.envFx = 'off'; G.debugEnv('a1_shore', 'normal'); await wait(30); out.off = G.envState();
    G.settings.envFx = 'full'; G.debugEnv(); return out; });
  ok(envr.noroot.length === 0, `all ${envr.n} environments render (debugEnv)`, envr.noroot);
  ok(envr.over.length === 0, 'particles ≤ 300 in every environment', envr.over);
  ok(envr.keep, 're-renders do not restart environment effects');
  ok(envr.reduced.cap === 150 && envr.reduced.particles <= 150, 'reduced setting caps particles at 150', envr.reduced);
  ok(envr.off.cap === 0 && envr.off.particles === 0, 'effects off → no particles', envr.off);
  ok(envr.elite === 'elite', 'elite grade applies');
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await pg.waitForTimeout(100);
  const rm = await pg.evaluate(async () => { G.debugEnv('a1_shore', 'normal'); await new Promise(r => setTimeout(r, 40)); const s = G.envState(); G.debugEnv(); return s; });
  ok(rm.particles === 0 && rm.q !== 'full', 'prefers-reduced-motion → no particles', rm);
  await pg.emulateMedia({ reducedMotion: 'no-preference' });

  // Act 1 card set gating (design/act1-complete.md §(a)): rewards + merchant only offer the 173-card Act 1 set
  const gate = await pg.evaluate(async () => { const { ACT1_SET, ACT1_CARDS } = await import('/src/data/act1.js'); const bad = []; const seen = new Set(); let n = 0;
    for (const cls of ['tide', 'echo', 'carto', 'duel']) { for (let s = 0; s < 25; s++) { G.newRun(cls, { seed: 500 + s, skipTravel: true });
      for (const src of ['fight', 'elite', 'boss']) for (const id of G.run$.rollCards(3, src)) { n++; seen.add(id); if (!ACT1_SET.has(id)) bad.push(id); }
      G.run$.openShop(); for (const it of [...G.S.cards, ...G.S.colorless]) { n++; seen.add(it.id); if (!ACT1_SET.has(it.id)) bad.push(it.id); } } }
    return { set: ACT1_SET.size, perClass: Object.fromEntries(Object.entries(ACT1_CARDS).map(([k, v]) => [k, v.length])), n, distinct: seen.size, bad: [...new Set(bad)] } });
  ok(gate.set === 173 && gate.bad.length === 0, `Act 1 rewards + merchant draw only from the ${gate.set}-card Act 1 set (${gate.n} offers, ${gate.distinct} distinct)`, gate);

  // ---------------------------------------------------------------- 10. seeded full Act 1 sims
  sec(`10. Seeded full Act 1 simulations (${SIMS} seeds × 4 classes): no softlocks, no page errors`);
  const errs0 = errors.length; const sims = [];
  for (const cls of ['tide', 'echo', 'carto', 'duel']) for (let k = 0; k < SIMS; k++) {
    const seed = 7000 + k * 13 + cls.length; const r = await pg.evaluate(([c, s]) => SIM(c, s), [cls, seed]); r.cls = cls; r.seed = seed; delete r.T; sims.push(r);
    if (!r.ok) console.log('  ✘', cls, seed, r.reason, r.sig || '');
  }
  const okSims = sims.filter(r => r.ok);
  const byCls = {}; for (const r of okSims) { const b = byCls[r.cls] = byCls[r.cls] || { n: 0, won: 0, boss: 0, floor: 0, rel: 0, pot: 0 }; b.n++; b.won += r.won ? 1 : 0; b.floor += r.floor; if (r.relicsAtBoss != null) { b.boss++; b.rel += r.relicsAtBoss; b.pot += r.potionsAtBoss; } }
  for (const [c, b] of Object.entries(byCls)) console.log(`  ${c}: ${b.n} runs, reached boss ${b.boss}, won ${b.won}, avg floor ${(b.floor / b.n).toFixed(1)}${b.boss ? `, at boss: ${(b.rel / b.boss).toFixed(1)} relics / ${(b.pot / b.boss).toFixed(1)} potions` : ''}`);
  ok(okSims.length === sims.length, `${okSims.length}/${sims.length} seeded runs reach an end screen (death or boss win) with no softlock`);
  ok(errors.length === errs0, 'no page errors during the sims', errors.slice(errs0, errs0 + 5));

  console.log(`\nphase1: ${pass} passed, ${fail} failed${fail ? ' — ' + fails.join('; ') : ''}`);
  if (errors.length) console.log('page errors:', errors.slice(0, 8));
  await browser.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
