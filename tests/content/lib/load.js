// tests/content/lib/load.js
// Loads design/data-v2.json and parses the content tables out of design/design-v2.md so the two can be
// cross-checked. Plain Node, no dependencies. Read-only: never writes to engine or design files.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');           // /workspace/game
const DATA_PATH = path.join(ROOT, 'design/data-v2.json');
const MD_PATH = path.join(ROOT, 'design/design-v2.md');

function loadData() { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); }

// Flatten every card-like entry (class cards, colourless, curses, statuses) with a `group` tag.
function allCards(d) {
  const out = [];
  for (const [cls, list] of Object.entries(d.cards)) for (const c of list) out.push({ ...c, group: 'class', cls: c.cls || cls });
  for (const c of d.colorless) out.push({ ...c, group: 'colorless' });
  for (const c of d.curses) out.push({ ...c, group: 'curse', cls: 'curse' });
  for (const c of d.statuses) out.push({ ...c, group: 'status', cls: 'status' });
  return out;
}

const CLASS_HEAD = { 'Tidecaller': 'tide', 'Echo Mage': 'echo', 'Cartographer': 'carto', 'Duelist': 'duel' };
const TYPE_WORD = { Attack: 'A', Skill: 'S', Power: 'P', Waypoint: 'W' };
const RAR_HEAD = { Starter: 'B', Common: 'C', Uncommon: 'U', Rare: 'R' };
const RAR_WORD = { Starter: 'B', Common: 'C', Uncommon: 'U', Rare: 'R', Special: 'S' };
const strip = s => s.replace(/\*\*/g, '').replace(/`/g, '').trim();
const cells = line => line.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(s => s.trim());

// Parse design-v2.md into {cards:{cls:[...]}, colorless, curses, statuses, relics, potions, archetypes:{cls:{name:[cardNames]}}, glossary:[...]}
function parseDesign() {
  const md = fs.readFileSync(MD_PATH, 'utf8').split('\n');
  const res = { cards: { tide: [], echo: [], carto: [], duel: [] }, colorless: [], curses: [], statuses: [], relics: [], potions: [], archetypes: {}, glossary: [], lines: md };
  let h2 = '', cls = null, rar = null;
  md.forEach((line, i) => {
    let m;
    if ((m = line.match(/^##\s+(.*)/))) { h2 = m[1]; if (!/^###/.test(line)) { cls = null; } }
    if ((m = line.match(/^###\s+(Tidecaller|Echo Mage|Cartographer|Duelist)\b/))) { cls = CLASS_HEAD[m[1]]; rar = null; }
    if ((m = line.match(/^\*\*(Starter|Common|Uncommon|Rare) \(\d+\)\*\*/))) rar = RAR_HEAD[m[1]];
    if (!line.startsWith('|') || /^\|\s*-/.test(line)) return;
    const c = cells(line);
    // Current tables append a flavour column.
    if (c[c.length-1]?.startsWith('*') && !c[c.length-1].startsWith('**')) c.pop();
    // Glossary rows (§2.1)
    if (/^2\.1 /.test(h2) && c.length === 3 && /^\*\*/.test(c[0])) { res.glossary.push({ term: strip(c[0]).replace(/\s*\(new\)\s*/, '').trim(), text: c[1], owner: c[2] }); return; }
    // Archetype membership rows: | **Crestbreaker** | S: … · C: … |
    if (cls && c.length === 2 && /^\*\*/.test(c[0]) && /(^|·\s*)[SCUR]:/.test(c[1])) {
      const names = [];
      c[1].split('·').forEach(part => { const mm = part.trim().match(/^([SCUR]):\s*(.*)$/); if (mm) mm[2].split(',').forEach(n => names.push(n.trim())); });
      (res.archetypes[cls] = res.archetypes[cls] || {})[strip(c[0])] = names; return;
    }
    const idCell = c.findIndex(x => /^`[a-z0-9]+`$/.test(x));
    if (idCell < 0) return;
    const id = c[idCell].replace(/`/g, '');
    const row = { id, line: i + 1 };
    if (cls && /^\d+$/.test(c[0]) && c.length === 8) {           // class card row
      Object.assign(row, { name: strip(c[1]), cost: c[3], type: TYPE_WORD[c[4]] || c[4], rarity: rar, effect: c[5], upgrade: c[6], archText: c[7], cls });
      res.cards[cls].push(row);
    } else if (/^2\.3 /.test(h2) && c.length === 7) {
      Object.assign(row, { name: strip(c[0]), cost: c[2], type: TYPE_WORD[c[3]] || c[3], rarity: RAR_WORD[c[4]] || c[4], effect: c[5], upgrade: c[6] });
      res.colorless.push(row);
    } else if (/^2\.4 /.test(h2) && c.length === 3) {
      Object.assign(row, { name: strip(c[0]), effect: c[2] }); res.curses.push(row);
    } else if (/^2\.5 /.test(h2) && c.length === 4) {
      Object.assign(row, { name: strip(c[0]), cost: c[2], effect: c[3] }); res.statuses.push(row);
    } else if (/^(1\.2|3\.5) /.test(h2) && c.length === 7) {
      Object.assign(row, { name: strip(c[0]), tier: c[2], clsWord: c[3], effect: c[4], hooks: c[5].replace(/`/g, ''), phase: c[6] }); res.relics.push(row);
    } else if (/^1\.3 /.test(h2) && c.length === 6) {
      Object.assign(row, { name: strip(c[0]), rarity: c[2], clsWord: c[3], effect: c[4], target: c[5] }); res.potions.push(row);
    }
  });
  return res;
}

// Read-only scan of the current engine's card registrations (to see which v2 ids already exist in code).
function engineCardIds() {
  const dir = path.join(ROOT, 'src/data/cards');
  const ids = {};
  if (!fs.existsSync(dir)) return ids;
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const aliases = Object.fromEntries([...src.matchAll(/([A-Z])=\(id,o\)=>card\('([a-z]+)'/g)].map(m=>[m[1],m[2]]));
    for (const m of src.matchAll(/\b([A-Z])\('([a-z0-9]+)'/g)) if(aliases[m[1]]) ids[m[2]]=aliases[m[1]];
    for (const m of src.matchAll(/\b(?:C|card)\('([a-z-]+)','([a-z0-9-]+)'/g)) ids[m[2]] = m[1];
  }
  return ids;
}
function engineRegistryIds(file, fn) {
  const p = path.join(ROOT, 'src/data', file);
  if (!fs.existsSync(p)) return [];
  return [...fs.readFileSync(p, 'utf8').matchAll(new RegExp(fn + "\\('([a-z0-9-]+)'", 'g'))].map(m => m[1]);
}

module.exports = { ROOT, DATA_PATH, MD_PATH, loadData, allCards, parseDesign, engineCardIds, engineRegistryIds };
