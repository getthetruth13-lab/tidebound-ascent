// data/lamplight.js: Lamplight meta-progression data (design/progression-proposal.md). Pure data, no engine imports.
// Locked lists are in OFFER ORDER: each level offers the first three eligible locked items, so the order below decides what
// a player sees first. Everything not named here is open from the first run. Starter decks and starter relics are never locked.
export const LAMP_XP=[60,160,300,480,700,960,1260,1600,2000,2500];   // total Lamplight for Class Lamp levels 1..10
export const CLIMB_XP=[100,300,600,1000,1500,2100,2800,3600];        // total Lamplight for Stair Climb levels 1..8 (all classes)
export const EARN={floor:3,fight:2,elite:12,boss:40,win:100,first:4,task:15,tidemark:.05,earlyRuns:3,earlyBonus:1.5};
export const CLASS_ORDER=['tide','echo','carto','duel'];
// Card locks follow design/CARD-PROGRESSION.md (10 Lamp levels, pick 1 of 3): 4 Act 1 cards per hero (about 12-13% of the non-starter pool), in offer order.
// Acts are NOT locks: an owned card simply appears when its act arrives. Later-act cards are not built yet, so none are listed here.
export const LOCK_CARDS={
 tide:['foamburst','brineward','turningpoint','neap'],
 echo:['overtone','choir','standing','infinitehum'],
 carto:['longshot','scorched','atlas','grand'],
 duel:['tempothrust','exsang','openveins','hemorrhage']};
// Hero relics that start locked (besides the class Shop and Rare relics below), in offer order.
export const LOCK_HERO_RELICS={tide:['anklet','stormglass','helmwheel','wetsand'],echo:['echochamber','soundinglead','duetbell','tuningpeg'],carto:['flags','farglass','plinth','pocketcompass'],duel:['fencermask','champsash','rapier','griptape']};
// Class relics: the Shop relic is offered at Lamp 5, the Rare at Lamp 9. (Blood Rapier is not in the Act 1 pools yet, so Surgeon's Lancet is the Duelist's locked Rare.)
export const LOCK_CLASS_RELICS={tide:{shop:'tidetable',rare:'moonstone'},echo:{shop:'musicstand',rare:'organpipe'},carto:{shop:'surveychain',rare:'staratlas'},duel:{shop:'manual',rare:'lancet'}};
export const LOCK_SHARED_RELICS=['sirenscale','barometer','abyssalpearl','grapnel','boots','chargedcoral','conch','lens'];
export const LOCK_POTIONS=['secondtide','tidalflask','abyssaloil','mistbomb','mimicink','temperoil','driftglass'];
export const LAMP_LEVELS=LAMP_XP.length,CLIMB_LEVELS=CLIMB_XP.length;
// What each Class Lamp level offers. 'cards' = locked cards (Uncommons first, Rares first at 8-9); shop/rare = that class relic plus two cards.
export const LAMP_PLAN=[{k:'cards',pref:'u'},{k:'relics'},{k:'cards',pref:'u'},{k:'relics'},{k:'shop'},{k:'cards'},{k:'relics'},{k:'cards',pref:'r'},{k:'rare'},{k:'all'}];
// Average Lamplight per run (early runs earn a x1.5 bonus), used only for the Ledger's "about N runs" hint.
export const LAMP_PER_RUN=110;
// Stair Climb: relic, potion, relic, mixed, potion, relic, potion, then the Stair blazes and the rest unlock.
export const CLIMB_PLAN=[{k:'relics'},{k:'potions'},{k:'relics'},{k:'mixed'},{k:'potions'},{k:'relics'},{k:'potions'},{k:'all'}];

// Later-act (Act 2 / Act 3) hero card counts from design/FULL-CARD-POOL. The cards are designed but not in play yet; the Ledger shows one dark placeholder per card so players see the true total.
export const LATER_ACT_CARDS={tide:{2:20,3:19},echo:{2:20,3:19},carto:{2:21,3:18},duel:{2:19,3:19}};

// ---- Later acts (D-A2-12): `lamp`-gated later-act cards are appended to each hero's locked list AFTER the 4 Act 1 locks (offered in order, all open at level 10);
// `spoil`-gated cards are unlocked by taking them once (profile.spoils). Both stay out of the Lamp ladder until the later acts are live (?act=2 preview, or LATER.live=true at release).
import {ACT23_POOL} from './generated/act2-pool.js';
export const LATER={live:typeof location!=='undefined'&&(+new URLSearchParams(location.search).get('act')||0)>=2};
export const LOCK_CARDS_LATER=Object.fromEntries(CLASS_ORDER.map(c=>[c,(ACT23_POOL[c]||[]).filter(x=>x.lampGate==='lamp').map(x=>x.id)]));
export const SPOIL_CARDS=Object.fromEntries(CLASS_ORDER.flatMap(c=>(ACT23_POOL[c]||[]).filter(x=>x.lampGate==='spoil').map(x=>[x.id,x.spoilFrom])));
export const lockCards=cls=>[...(LOCK_CARDS[cls]||[]),...(LATER.live?LOCK_CARDS_LATER[cls]||[]:[])];
