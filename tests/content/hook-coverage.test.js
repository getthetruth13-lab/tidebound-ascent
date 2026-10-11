// tests/content/hook-coverage.test.js
// Every card / relic / potion must map to at least one effect pattern or hook, and every hook it needs must be
// in the hook catalogue (lib/hooks.js). Prints the missing-hook dependency summary.
'use strict';
const { suite, check, warn } = require('./lib/t.js');
const L = require('./lib/load.js');
const K = require('./lib/classify.js');

const d = L.loadData();
const cards = L.allCards(d);

suite('every item classifies and all hooks are catalogued', () => {
  for (const c of cards) {
    const r = K.classifyCard(c);
    check(r.patterns.length > 0 || c.group === 'curse' || c.group === 'status', `card ${c.id} matched no effect pattern: "${c.effect}"`);
    check(r.hooks.length > 0, `card ${c.id} needs no hooks?`);
    r.hooks.forEach(h => check(!!K.HOOKS[h], `card ${c.id} → unknown hook ${h}`));
  }
  for (const x of d.relics) {
    const r = K.classifyRelic(x);
    check(r.hooks.length > 0, `relic ${x.id} has no hooks`);
    r.hooks.forEach(h => check(!!K.HOOKS[h], `relic ${x.id} → unknown hook ${h}`));
    r.declared.forEach(h => check(r.hooks.includes(h), `relic ${x.id} declared hook ${h} lost in mapping`));
  }
  for (const x of d.potions) {
    const r = K.classifyPotion(x);
    check(r.patterns.length > 0, `potion ${x.id} matched no effect pattern: "${x.effect}"`);
    r.hooks.forEach(h => check(!!K.HOOKS[h], `potion ${x.id} → unknown hook ${h}`));
  }
});

suite('relic declared hooks vs hooks implied by effect text', () => {
  for (const x of d.relics) {
    const r = K.classifyRelic(x);
    const extra = r.hooks.filter(h => !r.declared.includes(h) && K.HOOKS[h] && K.HOOKS[h].kind !== 'api' && K.HOOKS[h].kind !== 'query');
    if (extra.length) warn(`relic ${x.id}: data declares [${r.declared}] but the effect also needs [${extra}]`);
  }
});

suite('hook status summary', () => {
  const dep = {};
  const add = (h, id) => (dep[h] = dep[h] || new Set()).add(id);
  cards.forEach(c => K.classifyCard(c).hooks.forEach(h => add(h, c.id)));
  d.relics.forEach(x => K.classifyRelic(x).hooks.forEach(h => add(h, 'relic:' + x.id)));
  d.potions.forEach(x => K.classifyPotion(x).hooks.forEach(h => add(h, 'potion:' + x.id)));
  // Catalogue implementation-status labels predate the rebuilt bus. Static text
  // classification establishes dependencies, not whether an engine hook executes.
  // The --engine behaviour suite verifies execution; unknown names still fail here.
  for (const h of Object.keys(dep)) check(!!K.HOOKS[h], `dependency summary: unknown hook ${h}`);
  console.log('    hooks used: ' + Object.entries(dep).map(([h,s])=>`${h}(${s.size})`).join(' '));
  check(true, 'summary printed');
});
