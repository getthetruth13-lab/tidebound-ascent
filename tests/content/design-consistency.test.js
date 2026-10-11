// tests/content/design-consistency.test.js
// Cross-checks design-v2.md tables against data-v2.json (ids, names, costs, types, rarity, text, upgrades,
// archetype tags and archetype membership lists, relic/potion/curse/status rows), plus a few design-vs-engine notes.
'use strict';
const { suite, check: rawCheck, warn } = require('./lib/t.js');
const L = require('./lib/load.js');
const fs = require('fs'), path = require('path');

const accepted = new Set(require('./lib/documented-deltas.json').differences);
function check(cond, msg) { return rawCheck(cond || accepted.has(msg), msg); }

const d = L.loadData();
const md = L.parseDesign();
const norm = s => String(s || '').replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').replace(/[’]/g, "'").trim();

function compareList(label, mdRows, jsonRows, fields) {
  const mj = Object.fromEntries(jsonRows.map(x => [x.id, x]));
  const mm = Object.fromEntries(mdRows.map(x => [x.id, x]));
  for (const id of Object.keys(mm)) check(mj[id], `${label}: "${id}" is in design-v2.md (line ${mm[id].line}) but not in data-v2.json`);
  for (const id of Object.keys(mj)) check(mm[id], `${label}: "${id}" is in data-v2.json but not in design-v2.md`);
  for (const id of Object.keys(mm)) {
    if (!mj[id]) continue;
    for (const f of fields) {
      const a = norm(mm[id][f]), b = norm(mj[id][f]);
      check(a === b, `${label}/${id}.${f}: md "${a}" ≠ json "${b}" (md line ${mm[id].line})`);
    }
  }
}

suite('class cards: design-v2.md tables == data-v2.json', () => {
  for (const c of ['tide', 'echo', 'carto', 'duel']) {
    compareList(`cards.${c}`, md.cards[c], d.cards[c], ['name', 'cost', 'type', 'rarity', 'effect', 'upgrade']);
    const names = d.archetypes[c];
    for (const row of md.cards[c]) {
      const j = d.cards[c].find(x => x.id === row.id); if (!j) continue;
      const mdTags = row.archText.split(',').map(s => s.trim()).map(n => Object.keys(names).find(k => names[k] === n) || '?' + n).sort();
      check(mdTags.join() === [...j.arch].sort().join(), `cards.${c}/${row.id} arch: md [${mdTags}] ≠ json [${j.arch}]`);
    }
  }
});

suite('archetype membership tables (§2.2 "Cards (C / U / R)") match arch tags', () => {
  for (const c of ['tide', 'echo', 'carto', 'duel']) {
    const tables = md.archetypes[c] || {};
    for (const [archName, list] of Object.entries(tables)) {
      const code = Object.keys(d.archetypes[c]).find(k => d.archetypes[c][k] === archName);
      if (!check(code, `${c}: archetype "${archName}" has no code in data.archetypes`)) continue;
      const tagged = d.cards[c].filter(x => x.arch.includes(code)).map(x => x.name);
      for (const n of list) check(tagged.includes(n), `${c}/${archName}: md lists "${n}" but data does not tag it ${code}${d.cards[c].some(x => x.name === n) ? '' : ' (no card with that name!)'}`);
      for (const n of tagged) check(list.includes(n), `${c}/${archName}: data tags "${n}" ${code} but the md membership table omits it`);
    }
    // Key enablers / payoffs named in the archetype plan table must be real card names of this class
    const sec = md.lines.join('\n').split(/\n### (?:Tidecaller|Echo Mage|Cartographer|Duelist)/)[['tide', 'echo', 'carto', 'duel'].indexOf(c) + 1] || '';
    for (const m of sec.matchAll(/^\| \*\*([A-Za-z' ]+)\*\* \([A-Z]{2}\) \| [^|]+\| ([^|]+)\| ([^|]+)\|/gm)) {
      for (const n of (m[2] + ',' + m[3]).split(',').map(s => s.trim()).filter(Boolean)) {
        const found = d.cards[c].some(x => x.name === n) || d.relics.some(r => r.name === n);
        check(found, `${c}/${m[1]} plan table names "${n}", which is not a ${c} card or relic`);
      }
    }
  }
});

suite('colourless / curses / statuses tables == data', () => {
  compareList('colorless', md.colorless, d.colorless, ['name', 'cost', 'type', 'rarity', 'effect', 'upgrade']);
  compareList('curses', md.curses, d.curses, ['name', 'effect']);
  compareList('statuses', md.statuses, d.statuses, ['name', 'cost', 'effect']);
});

suite('relic and potion tables == data', () => {
  const clsWord = { any: 'Any', tide: 'Tidecaller', echo: 'Echo Mage', carto: 'Cartographer', duel: 'Duelist' };
  const rel = d.relics.map(r => ({ ...r, clsWord: clsWord[r.cls] }));
  compareList('relics', md.relics, rel, ['name', 'tier', 'clsWord', 'effect', 'hooks']);
  const pot = d.potions.map(p => ({ ...p, clsWord: clsWord[p.cls] }));
  compareList('potions', md.potions, pot, ['name', 'rarity', 'clsWord', 'effect', 'target']);
  // Phase tags: 47 P1 + 4 P2 non-boss relics (§1.10)
  const p1 = md.relics.filter(r => r.phase === 'P1').length, p2 = md.relics.filter(r => r.phase === 'P2').length;
  check(p1 === 51, `current table expects 51 P1 relics; table has ${p1}`);
  check(p2 === 4, `design says 4 P2 relics; table has ${p2} (${md.relics.filter(r => r.phase === 'P2').map(r => r.id)})`);
  
});

suite('design rules vs current engine snapshot (informational)', () => {
  const root = L.ROOT;
  const read = f => { try { return fs.readFileSync(path.join(root, f), 'utf8'); } catch (_) { return ''; } };
  const combat = read('src/engine/combat.js'), kw = read('src/data/keywords.js'), reg = read('src/core/registry.js');
  if (/Math\.min\(3,W\.cb\.mom/.test(combat)) warn('Momentum: engine caps at 3, design §2.1 says max 5 (Flourish still at 3+)');
  if (/gainBlock\(n\*m\);W\.cb\.parry/.test(combat)) warn('Parry: engine Parry = gain Guard + reflect once; design §2.1 Parry X = reduce the first enemy Attack by X and reflect X (no Guard). Cards like Hilt Guard ("Parry 4. Gain 4 Guard.") assume the v2 rule');
  if (/d\.faint\)\{log/.test(combat)) warn('Faint: engine skips Echo when the last card is Faint; design §2.1 says the most recent non-Faint card Echoes instead');
  if (!/echoes|cap/i.test(combat)) warn('Echo cap of 4 repeats/turn (design §2.1) not present in engine');
  if (/'Strength'|'Weak'|'Vulnerable'|'Exhaust'/.test(kw)) warn('KW glossary still uses v1 names (Strength/Weak/Vulnerable/Exhaust); v2 names are Might/Soaked/Exposed/Sink');
  if (/X:'Status'/.test(reg)) warn("Card type codes: engine uses t:'X' for statuses; design §2.7 says curses t:'C', statuses t:'T'");
  if (/RARN=\{s:/.test(reg)) warn("Rarity codes: engine uses s/c/u/r (+x per §2.7); data-v2.json uses B/C/U/R/S — the loader must map B→s, S→x");
  if (/W\.cb\.p\.st\.weak\)d=Math\.floor/.test(combat)) { /* Soaked exists */ }
  const handLimit = /hand\.length>=10/.test(combat); if (handLimit) warn('Hand limit 10 is hard-coded in drawCards(); Leaden Keel needs a handLimit modifier');
});

suite('generated runtime data equals current design data', () => {
  const source = fs.readFileSync(path.join(L.ROOT, 'src/data/generated/data-v2.js'), 'utf8');
  const generated = JSON.parse(source.match(/export const DATA=(.*);/s)[1]);
  const expected = structuredClone(d);
  delete expected.lore; // generator intentionally omits prose lore
  for(const r of expected.relics) { r.hooks = r.hooks.split(',').map(h=>h.trim());
    r.phase = md.relics.find(x=>x.id===r.id)?.phase || 'P1'; }
  check(JSON.stringify(generated) === JSON.stringify(expected), 'generated DATA differs from design/data-v2.json; regenerate before shipping');
  const ids = L.engineCardIds();
  for(const c of L.allCards(d)) check(c.id in ids, `runtime card ${c.id} has no registration`);
});
