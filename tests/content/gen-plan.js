#!/usr/bin/env node
// tests/content/gen-plan.js — regenerates the generated sections of design/content-impl-plan.md and writes
// design/content-hook-map.json (machine-readable per-item mapping). Only touches text between
// <!-- BEGIN GENERATED:x --> / <!-- END GENERATED:x --> markers, so the hand-written plan survives re-runs.
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib/load.js');
const K = require('./lib/classify.js');
const d = L.loadData();
const cards = L.allCards(d);
const PLAN = path.join(L.ROOT, 'design/content-impl-plan.md');
const MAP = path.join(L.ROOT, 'design/content-hook-map.json');
const H = K.HOOKS;
const TRIVIAL = new Set(['onPlay']);
const esc = s => String(s).replace(/\|/g, '\\|');

// ---- build mapping ----
const items = [];
for (const c of cards) { const r = K.classifyCard(c); items.push({ kind: c.group, id: c.id, name: c.name, cls: c.cls, cost: c.cost, type: c.type, rarity: c.rarity, arch: c.arch, effect: c.effect, upgrade: c.upgrade, ...r }); }
for (const x of d.relics) { const r = K.classifyRelic(x); items.push({ kind: 'relic', id: x.id, name: x.name, cls: x.cls, tier: x.tier, effect: x.effect, ...r }); }
for (const x of d.potions) { const r = K.classifyPotion(x); items.push({ kind: 'potion', id: x.id, name: x.name, cls: x.cls, rarity: x.rarity, target: x.target, effect: x.effect, ...r }); }
const dep = {};
for (const it of items) for (const h of it.hooks) (dep[h] = dep[h] || []).push(it);
fs.writeFileSync(MAP, JSON.stringify({ generated: new Date().toISOString(), source: 'design/data-v2.json', hooks: H, items: items.map(({ effect, upgrade, ...rest }) => rest) }, null, 1));

// ---- sections ----
const tag = it => it.kind === 'relic' ? `relic:${it.id}` : it.kind === 'potion' ? `potion:${it.id}` : it.id;
function depList(h, max = 40) {
  const list = dep[h] || [];
  const pri = list.filter(i => i.kind === 'relic' || i.kind === 'potion' || i.type === 'P' || i.type === 'W' || i.kind === 'curse' || i.kind === 'status');
  const rest = list.filter(i => !pri.includes(i));
  const ordered = [...pri, ...rest];
  const shown = ordered.slice(0, max).map(tag);
  return `${list.length}: ${shown.join(', ')}${ordered.length > max ? `, … +${ordered.length - max} more` : ''}`;
}

function hooksNeeded() {
  const groups = [
    ['Core lifecycle & event bus', ['onCombatStart', 'onCombatEnd', 'onTurnStart', 'onAfterDraw', 'onTurnEnd', 'onTurnEndInHand', 'onRoundEnd']],
    ['Card play, cost, piles & keywords', ['dmgApi', 'guardApi', 'canPlay', 'modifyCost', 'xCost', 'onBeforeCardPlay', 'onCardPlayed', 'onDraw', 'onShuffle', 'onSink', 'kwMoor', 'kwFleeting', 'kwOpening', 'kwFaint', 'createCard', 'selectCards', 'upgradeForCombat', 'moveCard', 'delayed', 'counters', 'endTurnNow']],
    ['Damage, Guard & statuses', ['modifyDamage', 'onAttackHit', 'onDamageDealt', 'ignoreGuard', 'onEnemyKilled', 'onPlayerAttacked', 'onPlayerDeath', 'loseHp', 'modifyGuard', 'onApplyStatus', 'statusSet', 'removeDebuffs', 'energyApi']],
    ['Tidecaller', ['onTideChange', 'onSurge', 'onTideTurn', 'onCrest', 'onUndertow', 'tideQuery']],
    ['Echo Mage', ['modifyEchoPlan', 'onEcho', 'sustain']],
    ['Cartographer', ['onWaypointTrigger', 'onWaypointPlaced', 'onDecamp', 'waypointApi', 'expedition', 'onChart', 'peekTop']],
    ['Duelist', ['onFlourish', 'momentum', 'onParry', 'modifyParry', 'retort', 'bleed', 'intent', 'duelFocus']],
    ['Run / meta (relics & potions)', ['onPickup', 'onEnterRoom', 'onGainCurse', 'canRemove', 'modifyPrice', 'modifyGold', 'modifyCardReward', 'campOptions', 'mapMove', 'handLimit', 'intentDisplay', 'potionSlots', 'modifyCard', 'potionApi', 'gold']],
  ];
  const listed = new Set(groups.flatMap(g => g[1]));
  const leftovers = Object.keys(dep).filter(h => !listed.has(h) && H[h].status !== 'exists');
  if (leftovers.length) groups.push(['Other', leftovers]);
  let out = '';
  for (const [title, names] of groups) {
    const rows = names.filter(n => H[n] && H[n].status !== 'exists' && dep[n]);
    if (!rows.length) continue;
    out += `\n#### ${title}\n\n| Hook | Kind | Status | Signature | Fires when | Ordering / notes | Needed by (count: ids) |\n|---|---|---|---|---|---|---|\n`;
    for (const n of rows) { const h = H[n]; out += `| \`${n}\` | ${h.kind} | **${h.status}** | \`${esc(h.sig)}\` | ${esc(h.when)} | ${esc(h.order)} | ${esc(depList(n))} |\n`; }
  }
  const ex = Object.keys(dep).filter(h => H[h].status === 'exists');
  out += `\n**Already generic in the engine (keep them working):** ${ex.map(h => `\`${h}\` (${dep[h].length})`).join(', ')}.\n`;
  return out;
}

function taxonomy() {
  const counts = {};
  for (const it of items) for (const p of it.patterns) (counts[p] = counts[p] || []).push(it);
  let out = '| Pattern | Meaning | Hooks it implies | # items | Examples |\n|---|---|---|---|---|\n';
  const rules = Object.fromEntries(K.RULES.map(r => [r[0], r[3]]));
  for (const p of Object.keys(K.PATTERN_LABELS)) {
    const l = counts[p] || []; if (!l.length) continue;
    out += `| \`${p}\` | ${esc(K.PATTERN_LABELS[p])} | ${(rules[p] || []).map(h => '`' + h + '`').join(' ') || (p === 'power' ? 'listener per text' : p === 'waypoint' ? '`onWaypointTrigger` `waypointApi`' : '—')} | ${l.length} | ${l.slice(0, 6).map(tag).join(', ')} |\n`;
  }
  return out;
}

function perItem() {
  const st = h => H[h] ? (H[h].status === 'missing' ? `**${h}**` : H[h].status === 'partial' ? `${h}*` : h) : h;
  const hk = it => it.hooks.filter(h => !TRIVIAL.has(h)).map(st).join(', ');
  let out = 'Legend: **bold** = hook missing in engine, `*` = partial/hard-coded, plain = exists. `onPlay` (every playable card) omitted. Types A/S/P/W = Attack/Skill/Power/Waypoint; rarity B/C/U/R/S = Starter/Common/Uncommon/Rare/Special.\n';
  const names = { tide: 'Tidecaller', echo: 'Echo Mage', carto: 'Cartographer', duel: 'Duelist' };
  for (const c of ['tide', 'echo', 'carto', 'duel']) {
    out += `\n#### ${names[c]} (75)\n\n| id | Name | C/T/R | Arch | Patterns | Hooks |\n|---|---|---|---|---|---|\n`;
    for (const it of items.filter(i => i.kind === 'class' && i.cls === c)) out += `| \`${it.id}\` | ${esc(it.name)} | ${it.cost}/${it.type}/${it.rarity} | ${it.arch.join(',')} | ${it.patterns.join(', ')} | ${hk(it)} |\n`;
  }
  out += `\n#### Colourless (20)\n\n| id | Name | C/T/R | Patterns | Hooks |\n|---|---|---|---|---|\n`;
  for (const it of items.filter(i => i.kind === 'colorless')) out += `| \`${it.id}\` | ${esc(it.name)} | ${it.cost}/${it.type}/${it.rarity} | ${it.patterns.join(', ')} | ${hk(it)} |\n`;
  out += `\n#### Curses (10) and statuses (5)\n\n| id | Kind | Name | Patterns | Hooks |\n|---|---|---|---|---|\n`;
  for (const it of items.filter(i => i.kind === 'curse' || i.kind === 'status')) out += `| \`${it.id}\` | ${it.kind} | ${esc(it.name)} | ${it.patterns.join(', ')} | ${hk(it)} |\n`;
  out += `\n#### Relics (64)\n\n| id | Name | Tier | Class | Declared hooks (data) | Hooks actually needed |\n|---|---|---|---|---|---|\n`;
  for (const it of items.filter(i => i.kind === 'relic')) out += `| \`${it.id}\` | ${esc(it.name)} | ${it.tier} | ${it.cls} | ${it.declared.join(', ')} | ${hk(it)} |\n`;
  out += `\n#### Potions (20)\n\n| id | Name | Rarity | Class | Target | Hooks |\n|---|---|---|---|---|---|\n`;
  for (const it of items.filter(i => i.kind === 'potion')) out += `| \`${it.id}\` | ${esc(it.name)} | ${it.rarity} | ${it.cls} | ${it.target} | ${hk(it)} |\n`;
  return out;
}

function stats() {
  const s = { exists: 0, partial: 0, missing: 0 };
  for (const h of Object.keys(dep)) s[H[h].status]++;
  const blocked = items.filter(i => i.hooks.some(h => H[h].status === 'missing'));
  const ready = items.filter(i => i.hooks.every(h => H[h].status === 'exists'));
  const readyP = items.filter(i => i.hooks.every(h => H[h].status !== 'missing'));
  return `- Items mapped: **${items.length}** (${cards.filter(c => c.group === 'class').length} class cards, ${d.colorless.length} colourless, ${d.curses.length} curses, ${d.statuses.length} statuses, ${d.relics.length} relics, ${d.potions.length} potions).\n- Distinct hooks/APIs used: **${Object.keys(dep).length}** — ${s.exists} exist generically, ${s.partial} exist but are hard-coded (partial), ${s.missing} are missing.\n- Items that only need existing generic hooks/APIs (portable as data now): **${ready.length}**; plus **${readyP.length - ready.length}** more that work on today's hard-coded (partial) mechanics but should move onto the bus.\n- Items that need at least one missing hook: **${blocked.length}**.\n`;
}

let plan = fs.readFileSync(PLAN, 'utf8');
const put = (name, body) => {
  const re = new RegExp(`(<!-- BEGIN GENERATED:${name} -->)[\\s\\S]*?(<!-- END GENERATED:${name} -->)`);
  if (!re.test(plan)) throw new Error('marker missing: ' + name);
  plan = plan.replace(re, `$1\n${body}\n$2`);
};
put('stats', stats()); put('taxonomy', taxonomy()); put('hooks', hooksNeeded()); put('items', perItem());
fs.writeFileSync(PLAN, plan);
console.log('updated', PLAN, 'and', MAP);
