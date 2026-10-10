// data/lamplight.js: Lamplight meta-progression data (design/progression-proposal.md). Pure data, no engine imports.
// Locked lists are in OFFER ORDER: each level offers the first three eligible locked items, so the order below decides what
// a player sees first. Everything not named here is open from the first run. Starter decks and starter relics are never locked.
export const LAMP_XP=[60,160,300,480,700,960,1260,1600,2000,2500];   // total Lamplight for Class Lamp levels 1..10
export const CLIMB_XP=[100,300,600,1000,1500,2100,2800,3600];        // total Lamplight for Stair Climb levels 1..8 (all classes)
export const EARN={floor:3,fight:2,elite:12,boss:40,win:100,first:4,task:15,tidemark:.05,earlyRuns:3,earlyBonus:1.5};
export const CLASS_ORDER=['tide','echo','carto','duel'];
export const LOCK_CARDS={
 tide:['seesaw','pivot','turningpoint','crosscur','abyssdraw','lowmark','brineward','foamburst','moonrhythm','highmark','trench','neap'],
 echo:['feedback','delay','overtone','amplify','cavity','choir','coda','longdecay','standing','magnumopus','infinitehum','crescendo'],
 carto:['relocate','rubble','scorched','avalanche','beacon','huntmark','party','longshot','grandexp','leylines','atlas','cataclysm'],
 duel:['openveins','lacerate','arterial','exsang','ironwrist','returnblow','saltedblade','tempothrust','rend','oath','mastersrip','hemorrhage']};
// Class relics: the Shop relic is offered at Lamp 5, the Rare at Lamp 9. (Blood Rapier is not in the Act 1 pools yet, so Surgeon's Lancet is the Duelist's locked Rare.)
export const LOCK_CLASS_RELICS={tide:{shop:'tidetable',rare:'moonstone'},echo:{shop:'musicstand',rare:'organpipe'},carto:{shop:'surveychain',rare:'staratlas'},duel:{shop:'manual',rare:'lancet'}};
export const LOCK_SHARED_RELICS=['sirenscale','barometer','abyssalpearl','grapnel','boots','chargedcoral','conch','lens'];
export const LOCK_POTIONS=['secondtide','tidalflask','abyssaloil','mistbomb','mimicink','temperoil','driftglass'];
export const LAMP_LEVELS=LAMP_XP.length,CLIMB_LEVELS=CLIMB_XP.length;
// What each Class Lamp level offers. 'cards' = locked cards (Uncommons first, Rares first at 8-9); shop/rare = that class relic plus two cards.
export const LAMP_PLAN=[{k:'cards',pref:'u'},{k:'cards',pref:'u'},{k:'cards',pref:'u'},{k:'cards',pref:'u'},{k:'shop'},{k:'cards'},{k:'cards'},{k:'cards',pref:'r'},{k:'rare'},{k:'all'}];
// Stair Climb: relic, potion, relic, mixed, potion, relic, potion, then the Stair blazes and the rest unlock.
export const CLIMB_PLAN=[{k:'relics'},{k:'potions'},{k:'relics'},{k:'mixed'},{k:'potions'},{k:'relics'},{k:'potions'},{k:'all'}];
