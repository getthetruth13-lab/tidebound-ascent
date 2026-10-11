// tests/content/lib/classify.js
// Maps every card / relic / potion in data-v2.json to effect patterns and the engine hooks they need.
// Rule-based on the effect + upgrade text, plus explicit overrides where text alone is ambiguous.
// Used by: hook-coverage.test.js (every item must classify) and gen-plan.js (tables in content-impl-plan.md).
'use strict';
const { HOOKS } = require('./hooks.js');

// [patternId, label, regex (tested on "effect || upgrade"), hooks[]]
const RULES = [
  ['dmg', 'Single-target damage', /\b[Dd]eal \d+(?![^.]*to ALL)|deal \d+ (more|again|instead)|Deal \d+ \+|Deal [234]× |Deal \d+ twice|deal \d+ to (it|the lowest)/, ['dmgApi']],
  ['dmgAll', 'AoE damage', /to ALL|hits ALL/, ['dmgApi']],
  ['multiHit', 'Multi-hit', /[Dd]eal [^.]*?(twice|three times|\d+ times|X times)|one more hit|per hit|\d+ (twice|three times)/, ['dmgApi']],
  ['oneAttack', '"One Attack" multi-hit (Bleed/Momentum once)', /one Attack/, ['onAttackHit', 'bleed']],
  ['randomTarget', 'Random / chosen-by-engine target', /random enemy|lowest-HP enemy|strongest enemy|highest HP/, ['dmgApi']],
  ['guard', 'Gain Guard', /[Gg]ain \d+(?: \+ \d+)? Guard|Guard \d+|gain \d+ (more|Guard)|Gain \d+ \+|[Gg]ain \d+ Guard for each|Guard per|gain \d+ instead|grants \+?\d+ Guard|Guard equal/, ['guardApi']],
  ['draw', 'Draw', /[Dd]raw \d+|[Dd]raws? \d|draw 1 extra|Draw cards until|Draw the card|draw it|Draw 1 for/, ['drawApi']],
  ['debuff', 'Apply Soaked / Exposed', /(Apply|apply|applies|also apply) \d+ (Soaked|Exposed)|\d+ Soaked|\d+ Exposed|Soaked to ALL|Exposed to ALL/, ['statusSet']],
  ['bleed', 'Bleed', /Bleed/, ['bleed', 'onAttackHit']],
  ['selfBuff', 'Gain Might / Poise / lose Might', /Might|Poise/, ['statusSet']],
  ['brittle', 'Brittle', /Brittle/, ['statusSet', 'modifyGuard']],
  ['poise', 'Poise', /Poise/, ['statusSet', 'modifyGuard']],
  ['energy', 'Gain / lose Energy', /Energy/, ['energyApi']],
  ['nextTurn', 'Delayed: next turn', /[Nn]ext turn/, ['delayed', 'onTurnStart']],
  ['thisTurn', 'Turn-scoped rule change', /[Tt]his turn[,:]|this turn\b(?! costs?)|[Yy]our next (\d )?(Attack|Echo|Parry|card)|next \d Attacks|The next card/, ['delayed']],
  ['costMod', 'Cost modification', /costs? (0|1 less|1 more)|cost 0|costs 0/, ['modifyCost'], 'effect'],
  ['upgradeCost', 'Upgrade lowers cost (data: cu)', /^Cost \d|cost \d\.?$|, cost \d/, [], 'upgrade'],
  ['xCost', 'X cost', /\bX times\b|\bX\b = /, ['xCost']],
  ['sink', 'Sink (exhaust)', /\bSink\b(?!s)|\bSinks?\b/, ['kwSink']],
  ['moor', 'Moor (retain)', /\bMoor(ed)?\b/, ['kwMoor']],
  ['fleeting', 'Fleeting (ethereal)', /Fleeting/, ['kwFleeting']],
  ['opening', 'Opening (innate)', /Opening/, ['kwOpening']],
  ['unplayable', 'Unplayable', /Unplayable/, ['kwUnplayable', 'canPlay']],
  ['faint', 'Faint', /\bFaint\b/, ['kwFaint']],
  ['createCard', 'Create / add cards', /Add (\d+|a|1)|add 1 Note|[Aa]dd \d+ Notes?|add a random|Choose 1 of 3 random|place a random|Place a random|add 1 Murk|Fill all your empty|Dread curse|Fouled Chain curse|duplicate a card/, ['createCard']],
  ['pileMove', 'Move cards between piles', /draw pile|discard pile|[Rr]eturn (the|one|last|this)|top of|bottom card|[Pp]ut a card|from your hand on top/, ['moveCard']],
  ['selectHand', 'Select card(s) from hand / deck', /a card in your hand|cards in your hand|a card from your hand|card in your deck|remove a card|Choose 1 of 3|Choose your starting|choose up to|remove 2 cards/, ['selectCards']],
  ['choice', 'Player choice (mode)', /\(choose\)|[Cc]hoose|[Yy]ou may/, ['choose']],
  ['playCount', 'Counts cards played', /cards? played this (turn|combat)|card played this|each card played|[Ee]very 4th card|\d(st|nd|rd|th) card|played 3\+ cards|Attack played this combat|Attack you played this turn|Attacks? this turn/, ['counters', 'onCardPlayed']],
  ['playRestrict', 'Play restriction', /Can only be played|can't play more|at most 3 more cards/, ['canPlay']],
  ['ifKills', 'If this kills', /If this kills|kills,/, ['onEnemyKilled']],
  ['selfDamage', 'Self HP loss', /[Ll]ose \d+ HP|take \d+ damage/, ['loseHp']],
  ['endInHand', 'End of turn while in hand', /At the end of your turn, if this is in your hand|While this is in your hand/, ['onTurnEndInHand']],
  ['onDrawSelf', 'When drawn', /When you draw this/, ['onDraw']],
  ['tempUpgrade', 'Upgrade for this combat', /[Uu]pgrade (a card|all cards)/, ['upgradeForCombat']],
  ['endTurn', 'Ends the turn', /End your turn/, ['endTurnNow']],
  ['cleanse', 'Remove debuffs / Guard', /Remove all your debuffs|Remove all Guard/, ['removeDebuffs']],
  ['ignoreGuard', 'Ignore Guard / HP loss', /ignores Guard|loses HP equal/, ['ignoreGuard']],
  ['gold', 'Gold', /\bgold\b/, ['gold', 'modifyGold']],
  ['heal', 'Heal / Max HP', /[Hh]eal|Max HP/, []],
  ['escape', 'Escape combat', /Escape a normal/, ['onCombatEnd']],
  // ---- Tidecaller ----
  ['tideMove', 'Surge / Recede', /Surge|Recede|move the Tide/, ['onTideChange', 'tideQuery']],
  ['tideSet', 'Set the Tide', /Set the Tide|[Ss]tarting Tide|Tide at|Tide resets/, ['onTideChange', 'tideQuery']],
  ['tideCond', 'High / Low Tide condition or Tide scaling', /High Tide|Low Tide|the Tide is|× the Tide|\(10 − Tide\)|below 10|Tide is 4/, ['tideQuery']],
  ['crest', 'Crest interaction', /Crest/, ['onCrest']],
  ['undertow', 'Undertow interaction', /Undertow/, ['onUndertow']],
  ['tideturn', 'Tideturn', /Tideturn/, ['onTideTurn', 'counters']],
  ['slack', 'Tide lock', /don't change the Tide/, ['onTideChange']],
  // ---- Echo Mage ----
  ['resound', 'Resound (bonus when Echoed)', /Resound/, ['resound']],
  ['sustain', 'Sustain', /Sustain/, ['sustain', 'onEcho']],
  ['echoMod', 'Echo plan modifier', /Echo (happens|is doubled|also repeats)|Echo this turn|first Echo|Echo each turn|Echo happens|extra time|When an Attack Echoes/, ['modifyEchoPlan']],
  ['onEcho', 'When an Echo happens', /When this Echoes|Each Echo|Each time an Echo|each Echo this combat|Echoed 3\+|Echoed card|has Echoed/, ['onEcho', 'counters']],
  ['note', 'Notes (token)', /\bNotes?\b/, ['createCard']],
  // ---- Cartographer ----
  ['waypointRef', 'Uses Waypoints (count / slots)', /Waypoint/, ['waypointApi']],
  ['expedition', 'Expedition scaling', /Expedition|per Waypoint|each Waypoint/, ['expedition']],
  ['decamp', 'Decamp', /Decamp/, ['onDecamp']],
  ['destroyWp', 'Destroy / replace / return Waypoints', /[Dd]estroy|replaced|Return one of your Waypoints/, ['waypointApi', 'onDecamp', 'counters']],
  ['triggerWp', 'Trigger Waypoints', /Trigger (one|all)|Waypoints trigger|Waypoint triggers/, ['onWaypointTrigger']],
  ['chart', 'Chart', /Chart/, ['onChart']],
  ['bearing', 'Bearing / top-card check', /Bearing|top card of your draw pile is|If the top card/, ['peekTop']],
  // ---- Duelist ----
  ['momentum', 'Momentum', /Momentum/, ['momentum']],
  ['flourish', 'Flourish', /Flourish/, ['onFlourish']],
  ['parry', 'Parry', /Parry|Parries/, ['onParry', 'modifyParry']],
  ['retort', 'Retort', /Retort/, ['retort']],
  ['intent', 'Reads enemy intent', /intends to attack|intended attack/, ['intent']],
  ['focus', 'Duel Focus', /Duel Focus|focused enemy/, ['duelFocus']],
];

// Persistent listeners implied by Power / Waypoint text ("Whenever …", "At the start of your turn …").
const LISTEN = [
  [/At the start of your turn|Start each turn|each turn|every 2nd turn|On turns 3/i, 'onTurnStart'],
  [/Whenever you play an Attack|Your first Attack each turn|card you play each turn|Every 4th card|5th card|first card you play/i, 'onCardPlayed'],
  [/Whenever you apply/i, 'onApplyStatus'],
  [/Your Attacks deal|Attacks against|deal \+\d|deal \+|Notes deal/i, 'modifyDamage'],
  [/Whenever you place a Waypoint/i, 'onWaypointPlaced'],
  [/Whenever .*Waypoints? (is|are) destroyed|Whenever you destroy/i, 'onDecamp'],
  [/Whenever you Chart/i, 'onChart'],
  [/Whenever a Waypoint triggers|trigger twice/i, 'onWaypointTrigger'],
  [/Whenever you Flourish|A Flourish leaves/i, 'onFlourish'],
  [/Whenever your Parry triggers|Parry can trigger|Parry reflects/i, 'onParry'],
  [/Bleed no longer decreases/i, 'onAttackHit'],
  [/Whenever a Tideturn|first Tideturn/i, 'onTideTurn'],
  [/Crest deals|After a Crest/i, 'onCrest'],
  [/Undertow grants|After an Undertow/i, 'onUndertow'],
  [/Whenever you Surge while/i, 'onSurge'],
  [/Waypoint slots/i, 'waypointApi'],
  [/Draw 1 extra card each turn/i, 'onTurnStart'],
  [/Sustain growth/i, 'onEcho'],
  [/play the top card of your draw pile/i, 'canPlay'],
];

// Relic hook names in data-v2.json → catalog names
const RELIC_HOOK_ALIAS = { onGainCurse: 'onGainCurse', onTideTurn: 'onTideTurn', onEcho: 'onEcho', onSink: 'onSink' };

// Hand-written extras: things the text implies that regexes can't see. id → hooks to add
const EXTRA = {
  // Tidecaller
  whitecap: ['onCrest'], crestrider: ['onCrest', 'energyApi'], abyssdraw: ['onUndertow'], moonward: ['onTideTurn'],
  pivot: ['counters'], kingtide: ['onCrest', 'onUndertow', 'onTideTurn'], highmark: ['onSurge'], trench: ['modifyDamage'],
  spring: ['onCrest'], neap: ['onUndertow'], perigee: ['onCrest'], abyssalcalm: ['onUndertow'], drift: ['delayed'],
  // Echo
  overtone: ['modifyEchoPlan'], amplify: ['modifyEchoPlan'], fermata: ['modifyEchoPlan', 'counters'], standing: ['modifyEchoPlan'], solo: ['modifyEchoPlan', 'canPlay'],
  recall: ['moveCard', 'counters'], eternal: ['onAfterDraw', 'counters', 'moveCard'], choir: ['onTurnStart', 'createCard'], cavity: ['onEcho', 'modifyDamage'],
  infinitehum: ['modifyDamage', 'onCardPlayed'], rubato: ['modifyCost'], lownote: ['modifyCost'], sostenuto: ['onEcho'], metronome: ['onCardPlayed', 'counters'], symphony: ['onCardPlayed', 'counters'],
  grandpause: ['endTurnNow'], silence: ['removeDebuffs'],
  // Carto
  grand: ['waypointApi'], known: ['onTurnStart'], atlas: ['onWaypointTrigger'], farsight: ['moveCard', 'canPlay', 'peekTop'], rekindle: ['onDecamp', 'createCard'],
  supplyline: ['expedition'], route: ['onDraw', 'modifyCost'], shortcut: ['moveCard', 'modifyCost'], gambit: ['onDraw', 'modifyCost'], millwheel: ['energyApi'],
  rubble: ['onDecamp', 'moveCard'], relocate: ['onDecamp', 'modifyCost'], stakeclaim: ['createCard', 'modifyCost'], quartermaster: ['createCard', 'modifyCost'],
  // Duel
  engarde: ['onTurnStart'], dancingsteel: ['onCardPlayed'], inches: ['onCardPlayed'], saltedblade: ['modifyDamage'], oath: ['duelFocus', 'onAttackHit'],
  openveins: ['onApplyStatus'], hemorrhage: ['onAttackHit'], returnblow: ['onParry'], mastersrip: ['onParry'], ironwrist: ['onParry', 'delayed'], matador: ['onFlourish'],
  endlessfl: ['onFlourish'], perfect: ['onParry', 'delayed'], perfectread: ['onParry', 'delayed'], crimsonfl: ['onDamageDealt'], coup: ['onEnemyKilled'],
  bleededge: ['onCardPlayed', 'onAttackHit'], bladewaltz: ['modifyCost', 'onCardPlayed'], salute: ['modifyParry'], press: ['momentum'], disengage: ['momentum'],
  krakengrasp: ['onRoundEnd', 'statusSet'], prisedefer: ['onRoundEnd', 'statusSet'], disarm: ['statusSet'], buckler: ['modifyParry'], mirrorguard: ['intent'],
  // colourless / curses / statuses
  orders: ['modifyCost', 'onCardPlayed'], treasuremap: ['onCombatEnd'], shanty: ['delayed'], squall: ['xCost'], bilgepump: ['selectCards'], driftmail: ['createCard', 'modifyCost'],
  saltburn: ['canRemove'], barnacled: ['modifyCost', 'onCardPlayed'], sirenwhisper: ['canPlay', 'counters'], seasick: ['onDraw'], wreckghost: ['onDraw', 'energyApi'], static: ['onDraw', 'energyApi'],
  doubloon: ['onEnterRoom'], anchorchain: ['kwMoor'], ringing: ['kwSink'], kelp: ['kwSink'], scald: ['loseHp'], note: ['kwFaint'],
  // relics: extra hooks the text needs beyond the declared list
  whaletooth: ['modifyDamage', 'onCombatStart'], conch: ['onEnemyKilled'], chargedcoral: ['counters'], abyssalpearl: ['energyApi'], moonshell: ['choose', 'energyApi'],
  fullmoon: ['choose', 'energyApi'], sextant: ['choose', 'waypointApi'], celestial: ['choose', 'waypointApi'], tuningfork: ['modifyEchoPlan'], resfork: ['modifyEchoPlan'],
  organpipe: ['modifyEchoPlan'], echochamber: ['modifyDamage', 'createCard'], earring: ['onSink'], coral: ['modifyGuard'], griptape: ['onFlourish'], glove: ['delayed', 'momentum'], gauntlet: ['delayed', 'momentum'],
  flags: ['onCardPlayed'], tidetable: ['onAfterDraw', 'choose'], musicstand: ['moveCard'], pocketcompass: ['onChart'], staratlas: ['waypointApi'],
  sirenscale: ['onPlayerDeath'], inkwell: ['createCard'], satchel: ['onCardPlayed'], starfish: ['onGainCurse'], barometer: ['onTurnEnd'],
  // potions
  secondtide: ['onPlayerDeath'], abyssaloil: ['delayed', 'onTurnStart'], mimicink: ['onBeforeCardPlay', 'onCardPlayed'], resvial: ['modifyEchoPlan'],
  mistbomb: ['onCombatEnd'], kelpbroth: ['potionApi'], tidalflask: ['createCard'], temperoil: ['upgradeForCombat'], moondraught: ['onTideChange', 'choose'],
};

function uniq(a) { return [...new Set(a)]; }

function classifyCard(c) {
  const text = [c.effect, c.upgrade].filter(Boolean).join(' || ');
  const patterns = [], hooks = [];
  for (const [id, , re, hs, scope] of RULES) {
    const t = scope === 'effect' ? c.effect : scope === 'upgrade' ? (c.upgrade || '') : text;
    if (re.test(t)) { patterns.push(id); hooks.push(...hs); }
  }
  if (c.cost === 'X') { patterns.push('xCost'); hooks.push('xCost'); }
  if (c.type === 'P') { patterns.push('power'); for (const [re, h] of LISTEN) if (re.test(c.effect)) hooks.push(h); }
  if (c.type === 'W') { patterns.push('waypoint'); hooks.push('onWaypointTrigger', 'waypointApi'); }
  if (c.group === 'class' || c.group === 'colorless') hooks.unshift('onPlay');
  if (c.group === 'status' && c.cost !== '-') hooks.unshift('onPlay');
  if (EXTRA[c.id]) hooks.push(...EXTRA[c.id]);
  return { patterns: uniq(patterns), hooks: uniq(hooks) };
}

function classifyRelic(r) {
  const declared = r.hooks.split(',').map(s => s.trim()).filter(Boolean);
  const hooks = declared.map(h => RELIC_HOOK_ALIAS[h] || h);
  const patterns = [];
  for (const [id, , re, , scope] of RULES) if (scope !== 'upgrade' && re.test(r.effect)) patterns.push(id);
  for (const [re, h] of LISTEN) if (re.test(r.effect)) hooks.push(h);
  if (/On pickup/.test(r.effect)) hooks.push('onPickup');
  if (/potion slot/.test(r.effect)) hooks.push('potionSlots');
  if (EXTRA[r.id]) hooks.push(...EXTRA[r.id]);
  return { patterns: uniq(patterns), hooks: uniq(hooks), declared };
}

function classifyPotion(p) {
  const patterns = [], hooks = ['potionApi'];
  for (const [id, , re, hs, scope] of RULES) if (scope !== 'upgrade' && re.test(p.effect)) { patterns.push(id); hooks.push(...hs.filter(h => h !== 'onPlay')); }
  if (EXTRA[p.id]) hooks.push(...EXTRA[p.id]);
  return { patterns: uniq(patterns), hooks: uniq(hooks) };
}

const PATTERN_LABELS = Object.fromEntries(RULES.map(r => [r[0], r[1]]).concat([['power', 'Power (persistent listener)'], ['waypoint', 'Waypoint (slot, start-of-turn trigger)']]));

module.exports = { RULES, PATTERN_LABELS, classifyCard, classifyRelic, classifyPotion, HOOKS };
