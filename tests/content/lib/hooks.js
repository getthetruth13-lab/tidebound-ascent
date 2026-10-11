// tests/content/lib/hooks.js
// Catalogue of engine hooks / helpers that the v2 content needs. `status` reflects the engine snapshot read on
// 2026-10-08 (src/engine/*.js before the data-driven rebuild landed):
//   exists  = a generic, data-addressable mechanism already exists
//   partial = the behaviour exists but is hard-coded (flags / class checks), so content can't attach to it
//   missing = nothing in the engine yet
// `kind`: event (fire(name,ctx) to listeners), modifier (value pipeline: listeners return/mutate a value),
//         query (helper the effect code calls), keyword (card flag the engine must honour), api (effect helper on f / engine).
'use strict';
const H = {};
const def = (name, o) => { H[name] = { name, ...o }; };

// ---------- core lifecycle ----------
def('onPlay', { kind: 'event', status: 'exists', sig: 'card.fx ops | card.p(f)', when: 'playCard(): after cost paid and card moved to its pile', order: 'Runs the card effect. Keep: cost → move pile → onBeforeCardPlay → effect → onCardPlayed.', engine: 'effects.js runCard(), combat.js playCard()' });
def('onCombatStart', { kind: 'event', status: 'missing', sig: 'onCombatStart(src, {cb, kind, enemies})', when: 'startCombat(): after enemies spawn and the Cartographer starting Waypoint, before Opening cards are placed and before the first startTurn()', order: 'Relics in pickup order, then potions-with-passives. Choices (Moon Shell tide pick, Sextant pick) need a mode that blocks the first draw.' });
def('onCombatEnd', { kind: 'event', status: 'missing', sig: 'onCombatEnd(src, {kind, won})', when: 'win() before W.cb is cleared and rewards are built (also escape via Mist Bomb with won:false? — no rewards)', order: 'Heals/gold before reward screen; combat-scoped listeners are dropped after.' });
def('onTurnStart', { kind: 'event', status: 'partial', sig: 'onTurnStart(src, {turn}) → {energy?, draw?}', when: 'startTurn(): after Guard reset + energy reset, BEFORE Waypoint triggers and the draw', order: 'Delayed "next turn" effects → relics → powers → Waypoints → draw (base + bonuses) → onAfterDraw. Hard-coded today: engarde, perfNext, wpDraw.', engine: 'combat.js startTurn()' });
def('onAfterDraw', { kind: 'event', status: 'missing', sig: 'onAfterDraw(src, {turn})', when: 'startTurn(): after the opening draw of each turn (and after Chart-before-draw)', order: 'For effects that add/return cards or ask a choice the player should see their hand for (Tide Table, Eternal Refrain, Choir).' });
def('onTurnEnd', { kind: 'event', status: 'partial', sig: 'onTurnEnd(src, {turn})', when: 'endTurn(): BEFORE Echo resolves', order: 'onTurnEnd → Echo (modifyEchoPlan/onEcho) → onTurnEndInHand per hand card → Fleeting sink / Moor keep / discard rest → momentum reset → enemy phase.', engine: 'combat.js endTurn() (only doEcho today)' });
def('onTurnEndInHand', { kind: 'event', status: 'missing', sig: 'card.endInHand(f)', when: 'endTurn(): for each card still in hand, after Echo, before discard', order: 'Curses/statuses (Scald, Brine Rot, Dread, Leaky Hull). Fleeting cards still fire this before they Sink.' });
def('onRoundEnd', { kind: 'event', status: 'partial', sig: 'onRoundEnd(src)', when: 'after the enemy phase, before the next startTurn()', order: 'Expire "this turn" debuffs that must survive the enemy attack (Kraken\'s Grasp, Prise de Fer), clear Retort window. tick() exists but only for weak/vuln.' });

// ---------- cards ----------
def('canPlay', { kind: 'modifier', status: 'partial', sig: 'canPlay(card) → bool (+ reason)', when: 'canPlay()/UI dimming', order: 'Energy check, Unplayable flag, card.req(f) (Coda, En Passant), then global limits (Siren\'s Whisper, Solo).', engine: 'combat.js canPlay() has energy + d.unplay only' });
def('modifyCost', { kind: 'modifier', status: 'partial', sig: 'modifyCost(src, card, cost) → cost', when: 'cost(ci) every time it is read (render + play)', order: 'base/upgraded → X → set-to-0 effects (tmp0, Rubato, Flags, Blade Waltz, Orders) → −n discounts (Low Note) → +n taxes (Barnacled, Satchel; min 1 for Satchel) → clamp ≥0. "Next card" effects are consumed in onCardPlayed, not when read.', engine: 'cards.js cost(): tmp0 + cb.discount only' });
def('xCost', { kind: 'keyword', status: 'missing', sig: "card.c==='X' → f.x = energy spent", when: 'playCard(): spend all energy, expose X to the effect', order: 'Echo of an X card should reuse the X it was played with (store on f/ci).' });
def('onBeforeCardPlay', { kind: 'event', status: 'missing', sig: 'onBeforeCardPlay(src, card, f)', when: 'playCard(): after cost/pile move, before the effect runs', order: 'Flourish flag is decided here (exists inline); Mimic Ink sets a replay; Bleeding Edge arms its rider.' });
def('onCardPlayed', { kind: 'event', status: 'missing', sig: 'onCardPlayed(src, card, f, {nThisTurn, nThisCombat, type})', when: 'playCard(): after the effect and the Momentum update', order: 'Counters (cb.playedTurn, cb.playedCombat, cb.attacksTurn, cb.attacksCombat) are incremented BEFORE listeners fire so "4th card" checks see 4.' });
def('onDraw', { kind: 'event', status: 'missing', sig: 'onDraw(src, card)  + card.onDrawSelf(f)', when: 'drawCards(): per card as it enters the hand', order: 'Card self-trigger first (Static, Wreck Ghost, Seasick), then listeners (Planned Route). Must not recurse infinitely (Gambit draws until Attack).' });
def('onShuffle', { kind: 'event', status: 'missing', sig: 'onShuffle(src)', when: 'refill(): when discard is shuffled into draw', order: 'After the new draw pile is built (Inkwell inserts Murk into it).' });
def('onSink', { kind: 'event', status: 'missing', sig: 'onSink(src, card, {reason})', when: 'any card moved to cb.exh (played Sink, Fleeting, Bilge Pump, Powers?)', order: 'Powers moving to exh should NOT count as Sink (design: Powers are "played", not sunk) — decide and document.' });
def('kwSink', { kind: 'keyword', status: 'exists', sig: 'x / xu flags', when: 'playCard()', order: 'Rename display only.' });
def('kwMoor', { kind: 'keyword', status: 'missing', sig: 'moor / moorU flags', when: 'endTurn(): keep in hand', order: 'Moored cards still fire onTurnEndInHand.' });
def('kwFleeting', { kind: 'keyword', status: 'missing', sig: 'fleet flag', when: 'endTurn(): hand → cb.exh (fires onSink)', order: 'After onTurnEndInHand.' });
def('kwOpening', { kind: 'keyword', status: 'missing', sig: 'open flag (deck card instance or def)', when: 'startCombat(): move to top of draw before the first draw', order: 'Ship\'s Rutter sets it on a deck instance (ci.open).' });
def('kwUnplayable', { kind: 'keyword', status: 'exists', sig: 'unplay flag', when: 'canPlay()', order: '' });
def('kwFaint', { kind: 'keyword', status: 'partial', sig: 'faint flag', when: 'doEcho()', order: 'v2: if the last card is Faint, Echo the most recent NON-Faint card played this turn (v1 just skips).' });
def('kwEthereal', { kind: 'keyword', status: 'missing', sig: 'alias of kwFleeting', when: '', order: '' });
def('dmgApi', { kind: 'api', status: 'exists', sig: 'f.dmg(n,hits) / f.all(n,hits) → hit() → dmgEnemy()', when: 'effect code', order: 'Must route every hit through the modifyDamage / onAttackHit pipeline once those exist.' });
def('guardApi', { kind: 'api', status: 'exists', sig: 'f.blk(n) → gainBlock()', when: 'effect code', order: 'Must route card Guard through modifyGuard (Poise/Brittle) once it exists; flag non-card Guard (relics, Undertow) so Poise/Brittle skip it.' });
def('drawApi', { kind: 'api', status: 'exists', sig: 'f.draw(n) → drawCards(n)', when: 'effect code', order: 'Hand limit 10 (→ handLimit modifier). Each drawn card fires onDraw.' });
def('createCard', { kind: 'api', status: 'missing', sig: 'addCard(id, pile:"hand"|"draw"|"disc"|"drawRandom", {up, cost0Turn, temp})', when: 'effect code', order: 'Respect hand limit 10 (overflow → discard). Tokens (Note, Flotsam…) and statuses use it; enemy status intents too.' });
def('selectCards', { kind: 'api', status: 'partial', sig: 'select({from:"hand"|"draw"|"disc"|"slots", n, min, filter}, then)', when: 'effect code (UI mode)', order: 'choose()/pickSlot()/chart() modes exist; need hand/pile pickers.' });
def('choose', { kind: 'api', status: 'exists', sig: 'choose(title, opts)', when: 'effect code', order: 'Echoed cards must auto-pick (random or best) since Echo has no player choice.' });
def('upgradeForCombat', { kind: 'api', status: 'missing', sig: 'ci.tmpUp = true (cleared at combat end)', when: 'effect code', order: 'cards.js cost()/desc() read ci.up; need ci.up||ci.tmpUp.' });
def('moveCard', { kind: 'api', status: 'partial', sig: 'move(ci, toPile, pos)', when: 'effect code', order: 'Return from discard, put on top of draw, draw specific position, play from top of draw (Far Sight).' });
def('delayed', { kind: 'api', status: 'partial', sig: 'nextTurn(fn) / thisTurn(listener) / forTurns(n, listener)', when: 'effect code', order: 'Generic version of perfNext / wpDraw. Turn-scoped listeners auto-expire in endTurn; next-turn ones fire in onTurnStart.' });
def('counters', { kind: 'query', status: 'partial', sig: 'cb.stat.{playedTurn, playedCombat, attacksTurn, attacksCombat, tideturnsTurn, tideturnsCombat, crests, undertows, echoesTurn, echoesCombat, wpDestroyed, lastTideDir, lastEchoed}', when: 'read by effects', order: 'played / atkCount exist; the rest are missing.' });

// ---------- damage / guard / status ----------
def('modifyDamage', { kind: 'modifier', status: 'partial', sig: 'modifyDamage(src, ctx{source, card, target, base, isAttack, hitIndex, bonus, mult, ignoreGuard})', when: 'hit(): before Might/Soaked/Exposed', order: 'base(+Sustain) → +flat (Might, Duel Focus/Oath, Trench Dweller, Salted Blade, Cavity, Infinite Hum/Echo Chamber, Whale Tooth) → ×Flourish (×2, Grip Tape ×3) → ×Echo mult (Amplify/Tuning Fork) → Soaked ×0.75 → Exposed ×1.5 → floor. Design §2.1: Flourish doubles after Might.', engine: 'combat.js hit(): pstr, duel focus, flourish, weak, vuln hard-coded' });
def('onAttackHit', { kind: 'event', status: 'missing', sig: 'onAttackHit(src, target, ctx{phase:"before"|"after", card, oneAttack})', when: 'hit(): per Attack (once for "one Attack" multi-hits)', order: 'before: Bleed HP loss (ignores Guard, then −1 unless Hemorrhage). after: Barbs, Oath bleed, Death by Inches.' });
def('onDamageDealt', { kind: 'event', status: 'missing', sig: 'onDamageDealt(src, target, {amount, hpLoss, card})', when: 'dmgEnemy(): after Guard', order: 'Crimson Flourish uses final damage dealt; f.lastDealt for effects.' });
def('ignoreGuard', { kind: 'api', status: 'missing', sig: 'f.dmg(n,{ignoreGuard:true}) / loseHp(target,n)', when: 'effect code', order: 'Pierce, Exsanguinate (HP loss), Bleed.' });
def('onEnemyKilled', { kind: 'event', status: 'partial', sig: 'onEnemyKilled(src, enemy, {card, summon})', when: 'dmgEnemy() kill branch', order: 'Fire after hp set to 0; card-level "if this kills" reads f.killed.' });
def('onPlayerAttacked', { kind: 'event', status: 'partial', sig: 'onPlayerAttacked(src, enemy, {dmg, blocked, hpLoss})', when: 'enemyHitPlayer()', order: 'Parry resolves first (reduce + reflect), then Guard, then HP. Retort flag set here.' });
def('onPlayerDeath', { kind: 'modifier', status: 'missing', sig: 'onPlayerDeath(src) → true to cancel', when: 'after(): when run.hp<=0, before lose()', order: 'Relics (Siren Scale) before potions (Second Tide)?? — design does not say; propose relic first.' });
def('loseHp', { kind: 'api', status: 'missing', sig: 'loseHp(n, {source})', when: 'effect code', order: 'Unblockable self damage (Reckless Flourish, Brine Rot). Scald says "take 2 damage" — Guard applies? (data issue).' });
def('modifyGuard', { kind: 'modifier', status: 'missing', sig: 'modifyGuard(src, ctx{amount, fromCard}) → amount', when: 'gainBlock() for card Guard', order: 'base(+Sustain) → +Poise → ×0.75 Brittle → floor. Relic/Waypoint Guard: does Poise apply? (design says "from cards").' });
def('onApplyStatus', { kind: 'modifier', status: 'partial', sig: 'onApplyStatus(src, target, key, n) → n', when: 'addSt()', order: 'Ward negates first (consumes 1 per debuff application), then Open Veins (+1 Bleed).', engine: 'combat.js addSt()' });
def('statusSet', { kind: 'keyword', status: 'partial', sig: 'st.{weak,vuln,str,dex(Poise),brittle,shell,barbs,ward,mending,bleed,mightTmp}', when: 'tick at owner turn end', order: 'weak/vuln/str exist; others missing. Player Might is cb.pstr (unify with st.str?).' });
def('removeDebuffs', { kind: 'api', status: 'missing', sig: 'cleanse(target)', when: 'effect code', order: 'Salt Rub.' });
def('energyApi', { kind: 'api', status: 'partial', sig: 'gainEnergy(n) / loseEnergy(n) / nextTurnEnergy(n)', when: 'effect code', order: 'Energy can exceed maxE.' });
def('endTurnNow', { kind: 'api', status: 'missing', sig: 'f.endTurn()', when: 'after the card resolves', order: 'Grand Pause: Echo still happens.' });

// ---------- Tidecaller ----------
def('onTideChange', { kind: 'event', status: 'partial', sig: 'onTideChange(src, {from, to, delta, cause, card})', when: 'setTide()/tideShift()', order: 'Clamp → fire onSurge/onRecede → detect Tideturn → Crest/Undertow check. Slack Water suppresses card-caused shifts.', engine: 'combat.js setTide/tideShift/checkTide' });
def('onSurge', { kind: 'event', status: 'missing', sig: 'onSurge(src, {n, wasHigh})', when: 'tideShift(+n)', order: 'High Water Mark checks High Tide BEFORE the move ("while at High Tide").' });
def('onTideTurn', { kind: 'event', status: 'missing', sig: 'onTideTurn(src, {nThisTurn, nThisCombat})', when: 'tideShift() when sign(delta) ≠ cb.tideDir (Crest/Undertow reset is not a move; Set-the-Tide counts by direction)', order: 'Update counters → fire. King Tide combo: a forced Crest then Undertow must count.' });
def('onCrest', { kind: 'event', status: 'partial', sig: 'onCrest(src, {dmg, cause})  + modifyCrest(ctx{dmg, resetTo})', when: 'checkTide() Crest branch', order: 'modifyCrest (Spring ×2→16, Moonstone +4, Perigee resetTo 7) → deal → onCrest listeners (Moon Shell energy, Anklet Exposed, counters) → reset. f.causedCrest for "if this causes a Crest".' });
def('onUndertow', { kind: 'event', status: 'partial', sig: 'onUndertow(src, {guard, draw, cause}) + modifyUndertow(ctx{guard, draw, resetTo})', when: 'checkTide() Undertow branch', order: 'Mirror of onCrest (Neap 16/2, Moonstone +4, Abyssal Stillness resetTo 3).' });
def('tideQuery', { kind: 'query', status: 'partial', sig: 'f.low / f.high / cb.tide / cb.tideDir / setTide(v)', when: 'effect code', order: 'f.low/high computed at play time exist; "if now at Low Tide" needs a live getter.' });

// ---------- Echo Mage ----------
def('modifyEchoPlan', { kind: 'modifier', status: 'partial', sig: 'modifyEchoPlan(src, plan{cards:[ci], repeats, mult, allTargets})', when: 'doEcho(): before repeats run', order: 'Build plan (last non-Faint card; Fermata adds previous) → Overtone/Standing/Solo/Resonance Vial add repeats → Amplify/Solo/Tuning Fork set mult → CAP total repeats at 4 per turn (log "capped").', engine: 'combat.js doEcho(): overtone/standing/amp hard-coded' });
def('onEcho', { kind: 'event', status: 'missing', sig: 'onEcho(src, card, f, {k})', when: 'doEcho(): after each repeat', order: 'Card self (Sustain growth ci.sus += X(+Sostenuto), Ostinato, Living Song) → relics (Tuning Peg, Organ Pipe via plan) → powers (Cavity). cb.echoesTurn/Combat++.' });
def('sustain', { kind: 'keyword', status: 'partial', sig: 'sus:n on def, ci.sus per combat', when: 'onEcho + modifyDamage/modifyGuard', order: 'Replaces v1 ci.cres. Per-hit for Tremolo.' });
def('resound', { kind: 'query', status: 'exists', sig: 'f.echo', when: 'effect code', order: '' });

// ---------- Cartographer ----------
def('onWaypointTrigger', { kind: 'event', status: 'partial', sig: 'onWaypointTrigger(src, wp, f)', when: 'trigWp(): start of turn + manual triggers (Signal Mirror, Triangulate)', order: 'Atlas = trigger each slot twice; Ley Lines fires per trigger.', engine: 'combat.js trigWp()' });
def('onWaypointPlaced', { kind: 'event', status: 'missing', sig: 'onWaypointPlaced(src, wp, {slot, replaced})', when: 'placeWp() after slot set', order: 'If replacing, onDecamp(old) first.' });
def('onDecamp', { kind: 'event', status: 'missing', sig: 'card.decamp(f, {reason:"destroyed"|"replaced"|"returned"}) + onDecamp(src, wp, {reason})', when: 'destroyWp()/placeWp() replace/returnWp()', order: 'Card Decamp effect → listeners (Burn the Bridges, Rekindled Camp, Scorch the Map, Rubble) → cb.wpDestroyed++ (destroy/replace only).' });
def('waypointApi', { kind: 'api', status: 'partial', sig: 'destroyWp(i) / returnWp(i) / triggerWp(i) / placeRandomWp({temp}) / cb.nslots / wpCount()', when: 'effect code', order: 'placeWp/pickSlot/nslots exist; destroy/return/trigger helpers missing. Slots modifier (Grand Survey, Celestial).' });
def('expedition', { kind: 'query', status: 'partial', sig: 'f.wp = slots.length + modifyExpedition (Supply Line)', when: 'effect code', order: '' });
def('onChart', { kind: 'event', status: 'partial', sig: 'onChart(src, {n})', when: 'chart() when the mode opens', order: 'Survey Chain draw 1 (first per turn), Trail Knowledge Guard.' });
def('peekTop', { kind: 'query', status: 'missing', sig: 'f.topType() → "A"|"S"|"P"|"W"|null', when: 'effect code (Bearing, Waymarker, Blaze Mark, Foreknowledge)', order: 'Refill-if-empty semantics must be defined (design: Bearing does not reveal).' });

// ---------- Duelist ----------
def('onFlourish', { kind: 'event', status: 'partial', sig: 'onFlourish(src, f) + modifyFlourish(ctx{mult, momentumAfter})', when: 'playCard(): when f.flourish, BEFORE the effect', order: 'Grip Tape ×3 first time; Endless Flourish leaves 1 Momentum; Matador/Rapier riders; card-level f.flourish checks (Coup, Tempo Thrust, Crimson Flourish, Duel\'s End).' });
def('momentum', { kind: 'query', status: 'partial', sig: 'cb.mom (max 5 in v2; engine caps 3) / gainMom(n) / keepMomentum flag', when: 'effect code', order: 'Dancing Steel: first Attack gives 2. Reset at end of turn unless press/disengage.' });
def('onParry', { kind: 'event', status: 'partial', sig: 'onParry(src, enemy, {reflected, triggerIndex})', when: 'enemyHitPlayer() when Parry triggers', order: 'v2 Parry REDUCES the hit and reflects (v1 Parry = Guard + reflect). Triggers per enemy turn: 1 (Return Blow 2). Reflect ×2 (Master\'s Riposte). Sets cb.retort.' });
def('modifyParry', { kind: 'modifier', status: 'missing', sig: 'modifyParry(src, card, n) → n', when: 'f.parry()', order: 'Fencing Manual +2, Salute +3 (next Parry), Riposte conditional.' });
def('retort', { kind: 'query', status: 'missing', sig: 'f.retort (cb.retort set in onParry, cleared at the next player turn end)', when: 'effect code', order: '' });
def('bleed', { kind: 'keyword', status: 'missing', sig: 'e.st.bleed handled in onAttackHit(before)', when: 'per Attack ("one Attack" multi-hits trigger once)', order: 'HP loss ignores Guard; −1 after unless Hemorrhage.' });
def('intent', { kind: 'query', status: 'partial', sig: 'f.tgIntendsAttack / f.tgIntentDmg', when: 'effect code', order: 'intentOf(e) exists; expose a helper incl. multi-hit total.' });
def('duelFocus', { kind: 'modifier', status: 'partial', sig: 'focus bonus (+2, Oath +5)', when: 'modifyDamage', order: 'Hard-coded in hit().' });

// ---------- run / meta ----------
def('onPickup', { kind: 'event', status: 'missing', sig: 'onPickup(relic)', when: 'gainRelic(id)', order: 'Choices (Apothecary, Mirror of Brine, Pearl Diver\'s Net) open a pick screen.' });
def('onEnterRoom', { kind: 'event', status: 'missing', sig: 'onEnterRoom(src, {type})', when: 'enterNode()', order: 'Fire for "?" before resolution (Oyster Purse) and for the resolved type ("shop" for Cursed Doubloon).' });
def('canRemove', { kind: 'modifier', status: 'missing', sig: 'canRemove(card) → bool (card.noRemove)', when: 'Scrub / Pumice / events that remove cards', order: 'Saltburn (Tidemark 10) cannot be removed or transformed.' });
def('onGainCurse', { kind: 'modifier', status: 'missing', sig: 'onGainCard(src, card) → false to cancel', when: 'deck add', order: 'Lucky Starfish negates curses.' });
def('modifyPrice', { kind: 'modifier', status: 'missing', sig: 'modifyPrice(src, price, {item, kind})', when: 'openShop()', order: 'Multiply all then round.' });
def('modifyGold', { kind: 'modifier', status: 'missing', sig: 'modifyGold(src, gold, {source})', when: 'win() and other combat gold', order: 'Ledger of Debts zeroes LAST.' });
def('modifyCardReward', { kind: 'modifier', status: 'missing', sig: 'modifyCardReward(src, {count, ...})', when: 'choices()', order: '' });
def('campOptions', { kind: 'modifier', status: 'missing', sig: 'campOptions(src, list) → list', when: 'rest screen', order: '' });
def('mapMove', { kind: 'modifier', status: 'missing', sig: 'mapMove(src, {from, to}) → allowed', when: 'map input', order: '' });
def('handLimit', { kind: 'modifier', status: 'missing', sig: 'handLimit(src, n) → n', when: 'drawCards() (hard-coded 10)', order: '' });
def('intentDisplay', { kind: 'modifier', status: 'missing', sig: 'intentDisplay(src, intent) → intent', when: 'render intents', order: '' });
def('potionSlots', { kind: 'modifier', status: 'missing', sig: 'run.potions.length += n', when: 'onPickup', order: '' });
def('modifyCard', { kind: 'modifier', status: 'missing', sig: 'modifyCard(src, card, f)', when: 'before a card resolves', order: 'Only Echo Chamber uses it ("Notes deal +2"); can be folded into modifyDamage with ctx.card.id==="note".' });
def('potionApi', { kind: 'api', status: 'missing', sig: 'POTIONS[id].use(api, target) / .outside / passive hooks', when: 'potion overlay', order: 'Not a card play: no Momentum, Echo or onCardPlayed. Passive potions (Second Tide) listen to onPlayerDeath.' });
def('gold', { kind: 'api', status: 'partial', sig: 'gainGold(n,{source})', when: 'effect code', order: 'Gull\'s Due, Treasure Map → modifyGold.' });

// Added content hooks: names in design data map to the current bus API.
def('onHpLoss', {kind:'event',status:'exists',engine:'combat.js: hpLoss'});
def('onRecede', {kind:'event',status:'exists',engine:'combat.js: spendTide'});
def('onMark', {kind:'event',status:'exists',engine:'combat.js: markLimit'});
def('onEnterMap', {kind:'event',status:'exists',engine:'run.js: goMap'});
def('onBleed', {kind:'event',status:'exists',engine:'combat.js: bleedDamage'});
module.exports = { HOOKS: H };
