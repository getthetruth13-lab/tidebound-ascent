// tests/content/validate-data.test.js
// Structural validation of design/data-v2.json: required fields, unique ids, valid enums, counts, upgrade data,
// referenced keywords / statuses / tokens / hooks exist. Run: node tests/content/run.js  (or node this file)
'use strict';
const { suite, check, warn } = require('./lib/t.js');
const L = require('./lib/load.js');
const { HOOKS } = require('./lib/hooks.js');

const d = L.loadData();
const design = L.parseDesign();
const CLASSES = ['tide', 'echo', 'carto', 'duel'];
const cards = L.allCards(d);
const byId = Object.fromEntries(cards.map(c => [c.id, c]));

// Glossary terms (design §2.1) + display vocabulary that may legally appear capitalised in effect text.
const GLOSS = design.glossary.map(g => g.term.replace(/ X$/, '').replace(/ \(.*\)$/, ''));
const STATUS_WORDS = ['Drenched', 'Resonating', 'Soaked', 'Exposed', 'Brittle', 'Bleed', 'Might', 'Poise', 'Shell', 'Barbs', 'Ward', 'Mending'];
const VOCAB = new Set([...GLOSS, ...STATUS_WORDS,
  'Deal', 'Gain', 'Apply', 'Draw', 'Surge', 'Recede', 'High', 'Low', 'Crest', 'Undertow', 'Tide', 'Tideturn', 'Tideturns',
  'Echo', 'Echoes', 'Echoed', 'Notes', 'Note', 'Waypoint', 'Waypoints', 'Charting', 'Attack', 'Attacks', 'Skill', 'Power', 'ALL', 'Energy', 'HP', 'Max',
  'X', 'Cost', 'Guard', 'No', 'Also', 'Then', 'If', 'With', 'Otherwise', 'This', 'The', 'Your', 'You', 'At', 'When', 'Whenever', 'Each', 'Every', 'Can', 'Can\'t',
  'Remove', 'Return', 'Add', 'Put', 'Move', 'Choose', 'Destroy', 'Trigger', 'Set', 'Start', 'On', 'Negate', 'Enemies', 'Up', 'Upgrade', 'Escape', 'Heal', 'Fill',
  'Lose', 'Next', 'Doesn\'t', 'It', 'Duel', 'Focus', 'Expedition', 'Bearing', 'Decamp', 'Retort', 'Sustain', 'Resound', 'Faint', 'Flourish', 'Momentum', 'Parry',
  'Sink', 'Fleeting', 'Moor', 'Opening', 'Unplayable', 'Chart', 'Tidemark', 'Merchant', 'Camp', 'Cook', 'Scour', 'Dredge', 'Annotate', 'Mend', 'Murk', 'Dread',
  'Fouled', 'Chain', 'Common', 'Uncommon', 'Rare', 'Colourless', 'Resound', 'Campfire', 'Starter', 'Replaces', 'Moon', 'Shell', 'Tuning', 'Fork', 'Brass', 'Sextant',
  'Dueling', 'Glove', 'Camps', 'Parries', 'Clogs', 'Mist', 'Bomb', 'Pending', 'Both', 'For', 'Only', 'Notes', 'Up', 'Crests', 'Undertows', 'Bank', 'Banked', 'Reprise', 'Marked', 'Mark', 'Rank', 'Ranks', 'Trawl', 'Spend', 'Flourishes']);

suite('data-v2.json: top level', () => {
  for (const k of ['version', 'archetypes', 'cards', 'colorless', 'curses', 'statuses', 'relics', 'potions']) check(k in d, `missing top-level key ${k}`);
  check(['2', 'v2', 'v2.1', 'v2.2'].includes(String(d.version)), `version is ${d.version}, expected a supported v2 version`);
  for (const c of CLASSES) { check(Array.isArray(d.cards[c]), `cards.${c} missing`); check(d.archetypes[c] && Object.keys(d.archetypes[c]).length === 4, `archetypes.${c} should have 3 archetypes + core`); }
});

suite('ids and names are unique', () => {
  const seen = {};
  for (const c of cards) { check(!seen[c.id], `duplicate card-like id "${c.id}" (${seen[c.id]} and ${c.group}/${c.cls})`); seen[c.id] = c.group + '/' + c.cls; }
  const rel = {}, pot = {};
  for (const r of d.relics) { check(!rel[r.id], `duplicate relic id ${r.id}`); rel[r.id] = 1; }
  for (const p of d.potions) { check(!pot[p.id], `duplicate potion id ${p.id}`); pot[p.id] = 1; }
  for (const id of Object.keys(rel)) if (seen[id] || pot[id]) warn(`id "${id}" is used by a relic and a ${seen[id] ? 'card' : 'potion'} — fine if registries stay separate, but avoid for art keys / debug commands`);
  for (const id of Object.keys(pot)) if (seen[id]) warn(`id "${id}" is used by a potion and a card`);
  const names = {};
  for (const x of [...cards, ...d.relics, ...d.potions]) { const n = x.name.toLowerCase(); check(!names[n], `duplicate name "${x.name}" (${names[n]} / ${x.id})`); names[n] = x.id; }
  for (const x of [...cards, ...d.relics, ...d.potions]) check(/^[a-z0-9]+$/.test(x.id), `id "${x.id}" should be lowercase alphanumeric (engine ids use that form)`);
});

suite('class cards: required fields and enums', () => {
  for (const c of CLASSES) {
    const list = d.cards[c];
    const archs = Object.keys(d.archetypes[c]);
    for (const x of list) {
      const tag = `${c}/${x.id}`;
      for (const k of ['id', 'name', 'cost', 'type', 'rarity', 'effect', 'upgrade', 'arch', 'cls']) check(x[k] !== undefined && x[k] !== '', `${tag} missing ${k}`);
      check(x.cls === c, `${tag} cls is ${x.cls}`);
      check(/^[0-4]$/.test(x.cost), `${tag} cost "${x.cost}" not 0–4`);
      check(['A', 'S', 'P', 'W'].includes(x.type), `${tag} type ${x.type}`);
      check(x.type !== 'W' || c === 'carto', `${tag} Waypoint outside Cartographer`);
      check(['B', 'C', 'U', 'R'].includes(x.rarity), `${tag} rarity ${x.rarity}`);
      check(Array.isArray(x.arch) && x.arch.length >= 1, `${tag} has no arch tags`);
      (x.arch || []).forEach(a => check(archs.includes(a), `${tag} arch tag "${a}" not in archetypes.${c}`));
      check(x.rarity === 'B' || !x.arch.includes('core') || x.arch.length === 1, `${tag} mixes core with archetype tags`);
      if (x.type === 'W') check(/^(Fast )?Waypoint/.test(x.effect), `${tag} Waypoint text should start "Waypoint:"`);
      if (x.type === 'P') check(!/\bSink\b/.test(x.effect), `${tag} Power says Sink (Powers leave play anyway)`);
    }
  }
});

suite('class cards: counts per class (current shipped counts and rarity splits)', () => {
  for (const c of CLASSES) {
    const n = r => d.cards[c].filter(x => x.rarity === r).length;
    const want = {tide:[4,33,30,14],echo:[4,33,28,13],carto:[4,34,29,13],duel:[4,32,27,14]}[c];
    check(d.cards[c].length === want.reduce((a,b)=>a+b,0), `${c} has ${d.cards[c].length} cards`);
    check(['B','C','U','R'].every((r,i)=>n(r)===want[i]), `${c} rarity split ${n('B')}/${n('C')}/${n('U')}/${n('R')}`);
    for (const a of Object.keys(d.archetypes[c]).filter(a => a !== 'core')) {
      const tagged = d.cards[c].filter(x => x.arch.includes(a));
      check(tagged.length >= 15, `${c} archetype ${a} has only ${tagged.length} cards`);
      check(tagged.some(x => x.rarity === 'R'), `${c} archetype ${a} has no Rare payoff`);
    }
  }
});

suite('colourless / curses / statuses', () => {
  check(d.colorless.length === 20, `colourless count ${d.colorless.length}`);
  const cr = r => d.colorless.filter(x => x.rarity === r).length;
  check(cr('U') === 10 && cr('R') === 6 && cr('S') === 4, `colourless split U${cr('U')} R${cr('R')} S${cr('S')} (want 10/6/4)`);
  for (const x of d.colorless) {
    for (const k of ['id', 'name', 'cost', 'type', 'rarity', 'effect', 'upgrade']) check(x[k], `colorless/${x.id} missing ${k}`);
    check(/^([0-3]|X)$/.test(x.cost), `colorless/${x.id} cost ${x.cost}`);
    check(['A', 'S', 'P'].includes(x.type), `colorless/${x.id} type ${x.type}`);
    check(['U', 'R', 'S'].includes(x.rarity), `colorless/${x.id} rarity ${x.rarity}`);
  }
  check(d.colorless.filter(x => x.cost === 'X').map(x => x.id).join() === 'squall', 'design says Squall is the only X-cost card');
  check(d.curses.length === 10, `curse count ${d.curses.length}`);
  for (const x of d.curses) {
    check(x.id && x.name && x.effect, `curse ${x.id} missing fields`);
    check(/Unplayable/.test(x.effect), `curse ${x.id} is not Unplayable (design: "Unplayable unless noted")`);
    for (const k of ['cost', 'type', 'rarity', 'upgrade']) if (x[k] === undefined) { /* expected: curses have none */ }
  }
  warn('curses carry no cost/type/rarity/upgrade fields — engine must default them (design §2.7: cls:"curse", t:"C", unplayable)');
  check(d.statuses.length === 5, `status count ${d.statuses.length}`);
  for (const x of d.statuses) {
    check(x.id && x.name && x.effect && x.cost, `status ${x.id} missing fields`);
    check(/^([0-3]|-)$/.test(x.cost), `status ${x.id} cost ${x.cost}`);
    check((x.cost === '-') === /Unplayable/.test(x.effect), `status ${x.id}: cost "${x.cost}" vs Unplayable text disagree`);
  }
  warn('statuses carry no type/rarity/upgrade fields — engine must default them (design §2.7: cls:"status", t:"T"; current engine uses t:"X")');
});

suite('upgrade data present and plausible', () => {
  const num = (s, re) => { const m = s.match(re); return m ? +m[1] : null; };
  for (const x of [...cards.filter(c => c.group === 'class' || c.group === 'colorless')]) {
    const tag = `${x.cls}/${x.id}`;
    check(x.upgrade && x.upgrade.trim().length > 0, `${tag} has no upgrade`);
    check(x.upgrade !== x.effect, `${tag} upgrade text equals effect`);
    const m = x.upgrade.match(/^Cost (\d)/);
    if (m) check(+m[1] < +x.cost, `${tag} upgrade "Cost ${m[1]}" is not cheaper than base cost ${x.cost}`);
    const recog = /\d|No Sink|Also|Cost|Max|Then|Choose|draw|The chosen card|Position|instead/i.test(x.upgrade);
    check(recog, `${tag} upgrade "${x.upgrade}" has no number or recognised form`);
    // "Deal N." / "Guard N." upgrades should be larger than the base number
    for (const [label, reU, reB] of [['Deal', /^Deal (\d+)/, /[Dd]eal (\d+)/], ['Guard', /^Guard (\d+)/, /[Gg]ain (\d+) Guard/], ['Parry', /^Parry (\d+)/, /Parry (\d+)/], ['Draw', /^Draw (\d+)/, /[Dd]raw (\d+)/]]) {
      const u = num(x.upgrade, reU), b = num(x.effect, reB);
      if (u != null && b != null) check(u > b, `${tag} upgrade ${label} ${u} is not above base ${b}`);
    }
    if (/^No Sink/.test(x.upgrade)) check(/\bSink\b/.test(x.effect), `${tag} upgrade says "No Sink" but base has no Sink`);
  }
});

suite('relics: fields, tiers, classes, counts, hooks', () => {
  const tiers = ['Starter', 'Common', 'Uncommon', 'Rare', 'Boss', 'Shop', 'Event'];
  const want = { Starter: 4, Common: 14, Uncommon: 12, Rare: 21, Boss: 17, Shop: 7, Event: 5 };
  check(d.relics.length === 80, `relic count ${d.relics.length}`);
  for (const t of tiers) check(d.relics.filter(r => r.tier === t).length === want[t], `relic tier ${t}: ${d.relics.filter(r => r.tier === t).length} (want ${want[t]})`);
  for (const r of d.relics) {
    for (const k of ['id', 'name', 'tier', 'cls', 'effect', 'hooks']) check(r[k], `relic ${r.id} missing ${k}`);
    check(tiers.includes(r.tier), `relic ${r.id} tier ${r.tier}`);
    check(['any', ...CLASSES].includes(r.cls), `relic ${r.id} cls ${r.cls}`);
    for (const h of r.hooks.split(',').map(s => s.trim())) check(!!HOOKS[h], `relic ${r.id} declares hook "${h}" that is not in the hook catalogue`);
  }
  for (const c of CLASSES) {
    const n = d.relics.filter(r => r.cls === c).length;
    check(n === 10, `${c} has ${n} class relics (current content: 10 per class)`);
    check(d.relics.filter(r => r.cls === c && r.tier === 'Starter').length === 1, `${c} needs exactly 1 starter relic`);
    check(d.relics.filter(r => r.cls === c && r.tier === 'Boss').length === 2, `${c} needs exactly 2 boss relics`);
  }
  // hooks the data uses vs the hook API table in design §1.2
  const apiLines = design.lines.join('\n').split('### Relic hook API')[1] || '';
  const apiTable = apiLines.split('\n## ')[0];
  const api = new Set([...apiTable.matchAll(/`(on[A-Za-z]+|modify[A-Za-z]+|campOptions)`/g)].map(m => m[1]));
  const used = new Set(d.relics.flatMap(r => r.hooks.split(',').map(s => s.trim())));
  for (const h of used) if (!api.has(h)) warn(`relic hook "${h}" is used in data but not defined in the §1.2 hook API table (used by: ${d.relics.filter(r => r.hooks.split(',').map(s => s.trim()).includes(h)).map(r => r.id).join(', ')})`);
});

suite('potions: fields, rarity, class, target', () => {
  check(d.potions.length === 24, `potion count ${d.potions.length}`);
  const pr = r => d.potions.filter(p => p.rarity === r).length;
  check(pr('Common') === 9 && pr('Uncommon') === 11 && pr('Rare') === 4, `potion split ${pr('Common')}/${pr('Uncommon')}/${pr('Rare')} (want 9/11/4)`);
  for (const p of d.potions) {
    for (const k of ['id', 'name', 'rarity', 'cls', 'effect', 'target']) check(p[k], `potion ${p.id} missing ${k}`);
    check(['no', 'enemy'].includes(p.target), `potion ${p.id} target ${p.target}`);
    check(['any', ...CLASSES].includes(p.cls), `potion ${p.id} cls ${p.cls}`);
    const single = /^(Apply \d+ (Soaked|Exposed)\.|Deal \d+ damage\.)/.test(p.effect);
    check(single === (p.target === 'enemy'), `potion ${p.id}: target "${p.target}" vs effect "${p.effect}"`);
  }
  for (const c of CLASSES) check(d.potions.filter(p => p.cls === c).length === 2, `${c} should have 2 class potions`);
});

suite('referenced keywords, statuses and tokens exist', () => {
  const statusIds = d.statuses.map(s => s.id), curseIds = d.curses.map(c => c.id);
  const glossLower = GLOSS.map(g => g.toLowerCase());
  for (const x of [...cards, ...d.relics, ...d.potions]) {
    const text = [x.effect, x.upgrade].filter(Boolean).join(' ');
    // "Apply N Word" / "gain N Word" → Word must be a status
    for (const m of text.matchAll(/(?:[Aa]pply|[Gg]ain|[Ll]oses?) (\d+|X) ([A-Z][a-z]+)/g)) {
      const w = m[2];
      if (['Guard', 'Energy', 'Momentum', 'Max', 'HP', 'Note', 'Notes', 'Bleed'].includes(w) || STATUS_WORDS.includes(w)) continue;
      check(false, `${x.id}: "${m[0]}" — ${w} is not a known status`);
    }
    // keyword-style prefixes "Foo:" must be glossary terms or Tide conditions
    for (const m of text.matchAll(/(?:^|\. )([A-Z][A-Za-z ]+?)(?: \((Attack|Skill)\))?:/g)) {
      const k = m[1].trim();
      const ok = ['Choose', 'At High or Low Tide', 'Release', 'Fast Waypoint', 'High Tide', 'Low Tide', 'Resound', 'Retort', 'Bearing', 'Waypoint', 'Decamp', 'Otherwise', 'This turn'].includes(k) || glossLower.includes(k.toLowerCase());
      check(ok, `${x.id}: prefix "${k}:" is not a glossary keyword`);
    }
    // Capitalised words mid-sentence that are not in the vocabulary → probably an undefined keyword
    for (const m of text.matchAll(/(?<![.:!?] |^|\()\b([A-Z][a-z]+)\b/g)) {
      const w = m[1];
      if (VOCAB.has(w) || byId[w.toLowerCase()] || d.relics.some(r => r.name.includes(w)) || d.potions.some(p => p.name.includes(w))) continue;
      warn(`${x.id}: unrecognised capitalised term "${w}" in "${text.slice(0, 80)}"`);
    }
  }
  // token / status / curse cards referenced by name exist
  const refs = { Note: 'note', Murk: 'murk', Dread: 'dread', 'Fouled Chain': 'anchorchain' };
  for (const [name, id] of Object.entries(refs)) check(!!byId[id] && byId[id].name.replace(/s$/, '') === name, `referenced card "${name}" (${id}) missing or renamed`);
  for (const k of ['Poise', 'Brittle', 'Shell', 'Barbs', 'Rebuff', 'Mending', 'Bleed', 'Sustain', 'Tideturn', 'Decamp', 'Bearing', 'Retort', 'Moor', 'Fleeting', 'Opening'])
    check(GLOSS.some(g => g === k), `keyword ${k} missing from design §2.1 glossary`);
  // Ward: glossary says owner "Enemies, potions" but no potion grants Ward
  
  if (!cards.some(c => /\bShell \d/.test(c.effect || ''))) warn('glossary says Shell X is used by "some cards", but no card grants Shell');
  if (!cards.some(c => /Barbs/.test(c.effect || ''))) warn('glossary says Barbs X is used by cards, but no card grants Barbs');
  if (!cards.some(c => /Opening/.test(c.effect || ''))) warn('no card has Opening; only Ship\'s Rutter grants it — fine, but the keyword needs a card-instance flag (ci.open), not just a def flag');
  if (!cards.some(c => /Fleeting/.test(c.effect || '') && c.group !== 'curse' && c.group !== 'status')) warn('no player card has Fleeting; it is only used by curses/statuses');
  if (!cards.some(c => /\bPoise\b/.test(c.effect || ''))) warn('no card grants Poise (only Polished Coral relic) — Poise has a single source');
});

suite('starter decks (design §2.2) resolve to starter cards', () => {
  const md = design.lines.join('\n');
  const map = { tide: 'Tidecaller', echo: 'Echo Mage', carto: 'Cartographer', duel: 'Duelist' };
  for (const c of CLASSES) {
    const sec = md.split(`### ${map[c]}`)[1] || '';
    const m = sec.match(/\*\*Starter deck:\*\*\s*([^\n]+)/);
    if (!check(!!m, `${c}: no "Starter deck:" line`)) continue;
    let total = 0;
    for (const part of m[1].replace(/\.$/, '').split(',')) {
      const mm = part.trim().match(/^(.+?)(?:\s*×(\d+))?$/); const name = mm[1].trim(); const n = +(mm[2] || 1); total += n;
      const card = d.cards[c].find(x => x.name === name);
      check(!!card, `${c} starter deck card "${name}" not found by name in data`);
      if (card) check(card.rarity === 'B', `${c} starter deck card ${name} is rarity ${card.rarity}, not B`);
    }
    check(total === 10, `${c} starter deck has ${total} cards (want 10)`);
  }
});

suite('engine snapshot vs data ids (read-only)', () => {
  const eng = L.engineCardIds();
  const engIds = Object.keys(eng);
  const v2 = new Set(cards.map(c => c.id));
  const missingInV2 = engIds.filter(id => !v2.has(id));
  check(missingInV2.length === 0, `engine card ids with no v2 data entry: ${missingInV2.join(', ')}`);
  check(engIds.length === cards.length, `engine registers ${engIds.length} cards, current data has ${cards.length}`);
  const er = L.engineRegistryIds('relics.js', 'registerRelic'), ep = L.engineRegistryIds('potions.js', 'registerPotion');
  const rel = new Set(d.relics.map(r => r.id)), pot = new Set(d.potions.map(p => p.id));
  er.filter(id => !rel.has(id)).forEach(id => warn(`engine relic stub "${id}" has no matching relic in data-v2.json (data starters: ${d.relics.filter(r => r.tier === 'Starter').map(r => r.id).join(', ')})`));
  ep.filter(id => !pot.has(id)).forEach(id => warn(`engine potion stub "${id}" has no matching potion in data-v2.json`));
});
