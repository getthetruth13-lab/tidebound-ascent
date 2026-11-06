// data/lamplight.js: Lamplight meta-progression data (design/progression-proposal.md). Pure data, no engine imports.
// Locked lists are in OFFER ORDER: each level offers the first three eligible locked items, so the order below decides what
// a player sees first. Everything not named here is open from the first run. Starter decks and starter relics are never locked.
// LAMP_MODE: 'five' (default, Spencer 2026-10-16) = design/CARD-PROGRESSION-5level.md (5 levels, a fixed bundle of 3). 'ten' = the older ladder (10 levels, pick 1 of 3).
// Both tables stay in code. Switch with ?lamp=10 / ?lamp=5, localStorage 'tidebound.lampmode', or LAMP_MODE=ten in Node.
const modeFlag=()=>{try{const q=/[?&]lamp=(5|10)/.exec(location.search);if(q)return q[1]==='5'?'five':'ten';const v=localStorage.getItem('tidebound.lampmode');if(v==='five'||v==='ten')return v}catch(_){}
 try{const e=process.env.LAMP_MODE;if(e==='five'||e==='ten')return e}catch(_){}return null};
export const LAMP_MODE_DEFAULT='five';
export const LAMP_MODE=modeFlag()||LAMP_MODE_DEFAULT,FIVE=LAMP_MODE==='five';
export const LAMP10_XP=[60,160,300,480,700,960,1260,1600,2000,2500];   // total Lamplight for Class Lamp levels 1..10
export const LAMP5_XP=[250,480,760,1030,1300];                          // 5-level ladder
// 5-level bundles: exactly what each level unlocks, in display order, per hero (design/CARD-PROGRESSION-5level.md section 5). Act = first act the card can appear in.
const C=(id,act)=>({kind:'card',id,act}),R=id=>({kind:'relic',id});
export const LAMP5_BUNDLES={
 carto:[[C('longshot',1),C('scorched',1),R('pocketcompass')],[C('atlas',1),R('flags'),R('farglass')],[C('cullantern',2),C('party',2),C('cornerstone',2)],[C('grand',1),C('known',2),R('surveychain')],[C('finaldest',3),R('plinth'),R('staratlas')]],
 tide:[[C('foamburst',1),C('brineward',1),R('wetsand')],[C('turningpoint',1),R('anklet'),R('tidetable')],[C('moonpull',2),C('trench',2),C('highmark',2)],[C('neap',1),C('bankcrest',2),R('stormglass')],[C('chaintides',3),R('moonstone'),R('helmwheel')]],
 echo:[[C('overtone',1),C('choir',1),R('tuningpeg')],[C('standing',1),R('echochamber'),R('musicstand')],[C('hymndeep',2),C('perfectpitch',2),C('temper',2)],[C('infinitehum',1),C('bronzebulwark',2),R('soundinglead')],[C('opusgrand',3),R('organpipe'),R('duetbell')]],
 duel:[[C('tempothrust',1),C('exsang',1),R('griptape')],[C('openveins',1),R('fencermask'),R('manual')],[C('readwound',2),C('lacerate',2),C('buckler',2)],[C('hemorrhage',1),C('dancingsteel',2),R('lancet')],[C('mastersrip',3),R('rapier'),R('champsash')]]};
export const LAMP5_CARDS=Object.fromEntries(Object.entries(LAMP5_BUNDLES).map(([h,b])=>[h,b.flat().filter(x=>x.kind==='card')]));
export const LAMP5_RELICS=Object.fromEntries(Object.entries(LAMP5_BUNDLES).map(([h,b])=>[h,b.flat().filter(x=>x.kind==='relic').map(x=>x.id)]));
export const LAMP_XP=FIVE?LAMP5_XP:LAMP10_XP;
export const CLIMB_XP=[100,300,600,1000,1500,2100,2800,3600];        // total Lamplight for Stair Climb levels 1..8 (all classes)
export const EARN={floor:3,fight:2,elite:12,boss:40,win:100,first:4,task:15,tidemark:.05,earlyRuns:3,earlyBonus:1.5};
export const CLASS_ORDER=['tide','echo','carto','duel'];
// Card locks follow design/CARD-PROGRESSION.md (10 Lamp levels, pick 1 of 3): 4 Act 1 cards per hero (about 12-13% of the non-starter pool), in offer order.
// Acts are NOT locks: an owned card simply appears when its act arrives. Later-act cards are not built yet, so none are listed here.
export const LOCK_CARDS10={
 tide:['foamburst','brineward','turningpoint','neap'],
 echo:['overtone','choir','standing','infinitehum'],
 carto:['longshot','scorched','atlas','grand'],
 duel:['tempothrust','exsang','openveins','hemorrhage']};
// Hero relics that start locked (besides the class Shop and Rare relics below), in offer order.
export const LOCK_HERO_RELICS10={tide:['anklet','stormglass','helmwheel','wetsand'],echo:['echochamber','soundinglead','duetbell','tuningpeg'],carto:['flags','farglass','plinth','pocketcompass'],duel:['fencermask','champsash','rapier','griptape']};
// Class relics: the Shop relic is offered at Lamp 5, the Rare at Lamp 9. (Blood Rapier is not in the Act 1 pools yet, so Surgeon's Lancet is the Duelist's locked Rare.)
export const LOCK_CLASS_RELICS10={tide:{shop:'tidetable',rare:'moonstone'},echo:{shop:'musicstand',rare:'organpipe'},carto:{shop:'surveychain',rare:'staratlas'},duel:{shop:'manual',rare:'lancet'}};
// Mode-dependent locks. 'five': Act 1 locked cards come from the bundles; every class relic is in a bundle (no separate shop/rare slots).
export const LOCK_CARDS=FIVE?Object.fromEntries(CLASS_ORDER.map(h=>[h,LAMP5_CARDS[h].filter(x=>x.act===1).map(x=>x.id)])):LOCK_CARDS10;
export const LOCK_HERO_RELICS=FIVE?LAMP5_RELICS:LOCK_HERO_RELICS10;
export const LOCK_CLASS_RELICS=FIVE?Object.fromEntries(CLASS_ORDER.map(h=>[h,{}])):LOCK_CLASS_RELICS10;
export const LOCK_SHARED_RELICS=['sirenscale','barometer','abyssalpearl','grapnel','boots','chargedcoral','conch','lens'];
export const LOCK_POTIONS=['secondtide','tidalflask','abyssaloil','mistbomb','mimicink','temperoil','driftglass'];
export const LAMP_LEVELS=LAMP_XP.length,CLIMB_LEVELS=CLIMB_XP.length;
// What each Class Lamp level offers. 'cards' = locked cards (Uncommons first, Rares first at 8-9); shop/rare = that class relic plus two cards.
export const LAMP10_PLAN=[{k:'cards',pref:'u'},{k:'relics'},{k:'cards',pref:'u'},{k:'relics'},{k:'shop'},{k:'cards'},{k:'relics'},{k:'cards',pref:'r'},{k:'rare'},{k:'all'}];
export const LAMP_PLAN=FIVE?LAMP5_XP.map(()=>({k:'bundle'})):LAMP10_PLAN;
// Average Lamplight per run (early runs earn a x1.5 bonus), used only for the Ledger's "about N runs" hint.
export const LAMP_PER_RUN=FIVE?90:110;
// Stair Climb: relic, potion, relic, mixed, potion, relic, potion, then the Stair blazes and the rest unlock.
export const CLIMB_PLAN=[{k:'relics'},{k:'potions'},{k:'relics'},{k:'mixed'},{k:'potions'},{k:'relics'},{k:'potions'},{k:'all'}];

// Later-act (Act 2 / Act 3) hero card counts from design/FULL-CARD-POOL. The cards are designed but not in play yet; the Ledger shows one dark placeholder per card so players see the true total.
export const LATER_ACT_CARDS={tide:{2:20,3:19},echo:{2:20,3:19},carto:{2:21,3:18},duel:{2:19,3:19}};

// ---- Later acts (D-A2-12): `lamp`-gated later-act cards are appended to each hero's locked list AFTER the 4 Act 1 locks (offered in order, all open at level 10);
// `spoil`-gated cards are unlocked by taking them once (profile.spoils). Both stay out of the Lamp ladder until the later acts are live (?act=2 preview, or LATER.live=true at release).
import {ACT23_POOL} from './generated/act2-pool.js';
export const LATER={live:typeof location!=='undefined'&&(+new URLSearchParams(location.search).get('act')||0)>=2};
export const LOCK_CARDS_LATER=Object.fromEntries(CLASS_ORDER.map(c=>[c,(ACT23_POOL[c]||[]).filter(x=>x.lampGate==='lamp').map(x=>x.id)]));
export const SPOIL_CARDS=FIVE?{}:Object.fromEntries(CLASS_ORDER.flatMap(c=>(ACT23_POOL[c]||[]).filter(x=>x.lampGate==='spoil').map(x=>[x.id,x.spoilFrom])));
export const lockCards=cls=>FIVE?LAMP5_CARDS[cls].map(x=>x.id):[...(LOCK_CARDS[cls]||[]),...(LATER.live?LOCK_CARDS_LATER[cls]||[]:[])];
