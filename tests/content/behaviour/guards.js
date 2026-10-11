// tests/content/behaviour/guards.js — loop and runaway-multiplier guards (design-v2 §V.10), run against the live engine.
//  1. Loop guard: every 0-cost, non-Sink card (base and upgraded) and the known combo lines are played greedily for ONE
//     turn in a starter deck (enemy can't die). Reaching LIMIT plays = an infinite loop.
//  2. Multiplier guard: the §V.10 combo-audit lines are replayed in the engine and checked against their caps.
// A loop listed in KNOWN_DATA_LOOPS is a data issue already reported to the Game Designer: it prints a warning, not a
// failure. A NEW loop (or a broken cap) fails the run.
'use strict';
const LIMIT = 300;
// id(+ = upgraded) list → reason. Keep in step with the content report.
const KNOWN_DATA_LOOPS = {
  'neapcur+,neapcur+': 'Neap Current+ (cost 0) at Tide 4–6: +1 Energy, draw 2, Tide unchanged. LOOP_ALLOW says it "moves the Tide away", the text does not.',
  'gambit+,gambit+': 'Gambit+ (No Sink) ×2: each draws the other back plus a free Attack. LOOP_ALLOW says "bounded by deck"; it is not with 2 copies.',
  'cairn+,abandon+': 'Cairn+ (0, Decamp draw 2) + Abandon Post+ (0, +1 Energy, draw 1): +1 Energy and +1 card per cycle.',
  'cairn+,breakcamp+': 'Cairn+ + Break Camp+ (both 0): draw 5 per 2 cards played, no Energy needed (loop audit only checks cards one at a time).',
  'seachange+,seachange+': 'Sea Change+ ×2: the designed, flagged "you earned it" loop (rules_v21.LOOP_ALLOW).',
};
const COMBOS = [
  { cls: 'tide', cards: ['neapcur+', 'neapcur+'] },
  { cls: 'tide', cards: ['seachange+', 'seachange+'], tide: 3 },
  { cls: 'tide', cards: ['pivot+', 'pivot+'], powers: ['turningpoint'] },
  { cls: 'tide', cards: ['readwater+', 'readwater+'], tide: 8 },
  { cls: 'echo', cards: ['recall+', 'recall+'] },
  { cls: 'echo', cards: ['recall', 'recall', 'tempo+'] },
  { cls: 'echo', cards: ['pizzicato+', 'pizzicato+', 'tuning+'] },
  { cls: 'carto', cards: ['gambit+', 'gambit+'] },
  { cls: 'carto', cards: ['cairn+', 'abandon+'] },
  { cls: 'carto', cards: ['cairn+', 'breakcamp+'] },
  { cls: 'carto', cards: ['cairn+', 'breakcamp+'], powers: ['rekindle'], slots: ['signal'] },
  { cls: 'carto', cards: ['relocate+', 'relocate+', 'charge'], slots: ['charge'] },
  { cls: 'carto', cards: ['abandon+', 'abandon+'], powers: ['rekindle', 'scorchmap'], slots: ['signal', 'cache'] },
  { cls: 'duel', cards: ['lightfeint+', 'lightfeint+', 'measure+', 'salute+'] },
];
// In-page: one greedy turn. Returns {plays, looped, err}.
function simTurn(o) {
  const C = G.combat$; const mk = id => ({ id: id.replace(/\+$/, ''), uid: Math.random(), up: /\+$/.test(id) });
  G.newRun(o.cls, { skipTravel: true, seed: 7 }); G.run.relics = [];
  G.startCombat('fight', ['knight']); const cb = G.cb;
  for (let g = 0; g < 5 && cb.mode; g++) { if (cb.mode.k === 'chart') G.modeAct('done'); else if (cb.mode.opts) G.modeAct('choice', 0); else cb.mode = null; }
  const e = cb.ens[0]; e.hp = e.max = 1e6; e.next = { none: 1 }; e.st = {};
  cb.hand = o.cards.map(mk); cb.draw = G.CLASSES[o.cls].starter.map(mk); cb.disc = []; cb.exh = []; cb.energy = 3; cb.slots = (o.slots || []).map(mk);
  if (o.tide != null) cb.tide = o.tide;
  for (const p of o.powers || []) cb.powers.push({ id: p, up: false, n: 1, ci: mk(p) });
  const want = new Set(o.cards.map(x => x.replace(/\+$/, '')));
  let plays = 0, err = null;
  try {
    for (let s = 0; s < LIMIT * 4 && plays < LIMIT; s++) {
      if (!G.cb) break;
      if (cb.mode) { const m = cb.mode; if (m.k === 'chart') G.modeAct('done'); else if (m.k === 'slot') G.modeAct('slot', 0); else G.modeAct('choice', m.opts.length > 1 && /^(✔️ Done|Keep)/.test(m.opts[0].l) ? 1 : 0); continue; }
      const idx = cb.hand.map((c, i) => [c, i]).filter(([c]) => C.canPlay(c));
      if (!idx.length) break;
      idx.sort((x, y) => (want.has(y[0].id) - want.has(x[0].id)) || (G.cards$.cost(x[0]) - G.cards$.cost(y[0])));
      G.playCard(idx[0][1]); plays++;
    }
  } catch (x) { err = String(x && x.message || x); }
  return { plays, looped: plays >= LIMIT, err };
}
async function run(A, { verbose = false } = {}) {
  let fail = 0, warn = 0; const out = [];
  const ok = (c, msg) => { if (!c) { fail++; out.push('  ✘ ' + msg); } else if (verbose) out.push('  ✔ ' + msg); };
  const sim = o => A.eval(new Function('o', 'const LIMIT=' + LIMIT + ';return (' + simTurn.toString() + ')(o)'), o);
  // ---- 1. single-card scan: 0-cost, non-Sink (base and upgraded)
  const cand = await A.eval(() => { const out = []; for (const [id, d] of Object.entries(G.CARDS)) { if (!['A', 'S'].includes(d.t) || d.unplay || d.r === 'x' || ['curse', 'status'].includes(d.cls)) continue;
    for (const up of [false, true]) { const c = up && d.cu != null ? d.cu : d.c; const sink = up && d.xu != null ? !!d.xu : !!d.x; if (c === 0 && !sink) out.push({ id, up, cls: ['tide', 'echo', 'carto', 'duel'].includes(d.cls) ? d.cls : 'tide' }); } } return out; });
  const loops = [];
  for (const c of cand) { const k = c.id + (c.up ? '+' : ''); const r = await sim({ cls: c.cls, cards: [k, k], tide: 5 }); if (r.err) { fail++; out.push('  ✘ loop-scan ' + k + ' threw: ' + r.err); } if (r.looped) loops.push(k + ',' + k); }
  for (const co of COMBOS) { const r = await sim(co); if (r.err) { fail++; out.push('  ✘ combo ' + co.cards + ' threw: ' + r.err); } if (r.looped) loops.push(co.cards.join(',')); }
  const uniq = [...new Set(loops)];
  for (const l of uniq) { if (KNOWN_DATA_LOOPS[l]) { warn++; out.push('  ⚠ known data loop (reported to the Game Designer): ' + l + ' — ' + KNOWN_DATA_LOOPS[l]); } else { fail++; out.push('  ✘ NEW infinite loop: ' + l + ' reached ' + LIMIT + ' plays in one turn'); } }
  out.push(`  loop guard: ${cand.length} zero-cost card states + ${COMBOS.length} combo lines scanned; ${uniq.length} loop(s), ${uniq.filter(l => !KNOWN_DATA_LOOPS[l]).length} new`);
  // ---- 2. multiplier caps (§V.10)
  const m = await A.eval(() => {
    const mk = id => ({ id: id.replace(/\+$/, ''), uid: Math.random(), up: /\+$/.test(id) }); const C = G.combat$; const res = {};
    const setup = (cls, n, relics) => { G.newRun(cls, { skipTravel: true, seed: 3 }); G.run.relics = []; (relics || []).forEach(r => G.giveRelic(r)); G.startCombat('fight', Array(n).fill('knight'));
      const cb = G.cb; for (let g = 0; g < 5 && cb.mode; g++) { if (cb.mode.opts) G.modeAct('choice', 0); else cb.mode = null; }
      cb.ens.forEach(e => { e.hp = e.max = 5000; e.next = { none: 1 }; e.st = {}; e.block = 0; }); cb.draw = []; cb.disc = []; cb.exh = []; cb.energy = 3; cb.p.block = 0; cb.tgt = 0; return cb; };
    // Opus+ + Solo + Magnify + Tuning Fork (turn 1): ≤ 90 to ALL (the target also takes Opus's own 30)
    let cb = setup('echo', 3, ['tuningfork']); cb.hand = ['solo+', 'amplify+', 'magnumopus+'].map(mk);
    G.playCard(0); G.playCard(0); G.playCard(0, { mark: true }); G.endTurn();
    res.opus = cb.ens.map(e => 5000 - e.hp);
    // Duel's End+ Flourish at 5 Momentum + max Bleed: ≤ 111 (+ Duel Focus share), plus the Bleed trigger itself
    cb = setup('duel', 1); cb.hand = [mk('duelsend+')]; cb.mom = 5; cb.ens[0].st.bleed = 20; G.playCard(0, { flourish: true });
    res.duelsend = 5000 - cb.ens[0].hp;
    // Bleed cap 20
    cb = setup('duel', 1); C.addSt(cb.ens[0], 'bleed', 35); res.bleedCap = cb.ens[0].st.bleed;
    // Tsunami+ at the highest reachable Tide (9): 45 ≤ 50 to ALL
    cb = setup('tide', 2); cb.tide = 9; cb.hand = [mk('tsunami+')]; cb.energy = 5; G.playCard(0); res.tsunami = cb.ens.map(e => 5000 - e.hp);
    // Spring Tide Crest: 24 to ALL; two Spring Tides don't make it 48? (each doubles) — report
    cb = setup('tide', 1); cb.hand = ['spring', 'swell'].map(mk); cb.tide = 9; G.playCard(0); G.playCard(0); G.modeAct('choice',0); res.spring = 5000 - cb.ens[0].hp;
    // Echo cap: Overtone + Standing Wave + Solo + Resonance Vial: ≤ 4 repeats
    cb = setup('echo', 1); cb.energy = 9; cb.hand = ['standing', 'overtone', 'solo', 'ping'].map(mk); G.playCard(0); G.playCard(0); G.playCard(0); G.usePotion('resvial'); G.playCard(0, { mark: true }); G.modeAct('choice',0); G.endTurn(); res.echoes = G.cb ? G.cb.stat.echoesCombat : -1;
    // Flourish cap ×3.5 with Gambler's Edge (8 Momentum)
    cb = setup('duel', 1, ['gamblersedge']); cb.hand = [mk('thrust')]; cb.mom = 8; G.playCard(0, { flourish: true }); res.flourish8 = 5000 - cb.ens[0].hp;
    return res; });
  ok(m.opus.slice(1).every(x => x <= 90) && m.opus[0] <= 180, `Opus+ line: ${m.opus.join(' / ')} (≤ 90 to ALL, target ≤ 180)`);
  ok(m.duelsend - 20 <= 111 + 4, `Duel's End+ at 5 Momentum + 20 Bleed: ${m.duelsend} total = 20 Bleed trigger + ${m.duelsend - 20} (≤ 111 + Duel Focus ×3.5)`);
  ok(m.bleedCap === 20, `Bleed caps at 20 (got ${m.bleedCap})`);
  ok(m.tsunami.every(x => x <= 50), `Tsunami+ at Tide 9: ${m.tsunami.join(' / ')} (≤ 50 to ALL)`);
  ok(m.spring === 24, `Spring Tide Crest: ${m.spring} (= 24)`);
  ok(m.echoes >= 1 && m.echoes <= 4, `Echo cap: ${m.echoes} repeats (≤ 4)`);
  ok(m.flourish8 === Math.floor((5 + 1) * 3.5), `Gambler's Edge 8 Momentum Flourish stays ×3.5: ${m.flourish8}`);
  out.forEach(l => console.log(l));
  console.log(`guards: ${fail} failed, ${warn} known data loop warning(s)`);
  return { fail, warn };
}
module.exports = { run, KNOWN_DATA_LOOPS };
