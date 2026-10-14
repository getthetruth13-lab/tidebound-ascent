// data/enemies.js — Act 1 roster (design-v2 §1.7) with the v2.1 numbers baked in (§V.4 / data-v2.json v21.sim.enemies). Move design: design/ENEMIES-V2.md.
// Intent fields: a attack, h hits, b Guard, s Might, w Soaked, v Exposed, heal, brittle, status:{id,n,pile}, summon(+max,n), drainE,
// stealPotion, steal (gold, then flee), boom (dies), ring (Ringing cards), allyB / allyS (every ally gains Guard / Might), fx(e) (custom), lbl (name shown).
// Template hooks: ai(e) next intent; intent(e) live intent (Warden); onSpawn, onDamaged, onDeath; passive:{name,text,endTurn(e)};
// role: attacker | debuffer | support | bruiser (biases the roll when the enemy fights in a group).
import {registerEnemies} from '../core/registry.js';
import {W,R} from '../core/state.js';
import {DATA} from './generated/data-v2.js';
import {BELL_LINES,TENANT_LINES} from './lore.js';
import {addSt,alive,countAlive,log,callout,spawn,bossBeat} from '../engine/combat.js';
const V=DATA.v21.sim.enemies;
const hp=k=>V[k].hp.slice();
const cs='combat';
const hurt=e=>e.pk==null?0:Math.max(0,e.pk-e.hp); // damage the hero dealt to it since it last chose a move
const playerLow=()=>W.run.hp<=W.run.max*.4;
const half=e=>e.hp<=e.max/2;
const allies=e=>alive().filter(x=>x!==e);
// Wind-up allowed from turn `from`, and at least `gap` moves after the last one.
const canWind=(e,from,gap)=>e.t>=from&&e.t-(e.lastCharge==null?-99:e.lastCharge)>=gap;
// ---- group play: lean away from what allies hold, and favour the role's own kind of move (only when 2+ enemies are alive) ----
const SHARED=['w','v','brittle','allyB','allyS','healAlly','drainE','steal'];
const sameFx=(a,b)=>SHARED.some(k=>a[k]&&b[k])||!!(a.status&&b.status&&a.status.id===b.status.id)||!!(a.ring&&b.ring);
const kindOf=m=>m.allyB||m.allyS||m.healAlly||m.summon||m.s||m.grow?'sup':m.w||m.v||m.brittle||m.status||m.ring||m.drainE?(m.a?'atk':'deb'):m.a?'atk':'def';
const ROLE={attacker:{atk:1.25},bruiser:{atk:1.15},debuffer:{deb:1.3},support:{sup:1.3}};
// x0.35 when an ally already holds the same move as its intent; x0.5 when it holds the same debuff / junk / ally buff. Plain Guard is exempt.
function lean(e,m){if(kindOf(m)==='def'||m.none)return 1;let f=1;for(const x of allies(e)){const n=x.next;if(!n||n.none)continue;if(n.lbl&&n.lbl===m.lbl)f*=.35;else if(sameFx(n,m))f*=.5}return f}
const roleBias=(e,m)=>{const r=ROLE[(e.role)];return r&&r[kindOf(m)]||1};
// Weighted pick with anti-repeat. opts: {w weight (0 = unavailable), m move, rep max uses in a row (default 2), wind: the big move that lands NEXT turn}.
// Rolled once, here, with the run's seeded combat stream; the result is stored in e.next, so the intent is always the true move.
function pk(e,opts){const h=e.hist||(e.hist=[]);const ok=o=>o.w>0&&!(h.length>=(o.rep||2)&&h.slice(-(o.rep||2)).every(l=>l===o.m.lbl));
 let c=opts.filter(ok);if(!c.length)c=opts.filter(o=>o.w>0);if(!c.length)c=opts.slice(0,1);
 e.role=e.role||(EN[e.key]||{}).role;const grp=alive().length>1;
 const wt=o=>Math.max(1,Math.round(o.w*(o.wind?1:lean(e,o.m))*(grp?roleBias(e,o.m):1)*100));
 let r=R(c.reduce((a,o)=>a+wt(o),0),cs),o=c[0];for(const x of c){if(r<wt(x)){o=x;break}r-=wt(x)}
 let m={...o.m};if(o.wind){e.queued={...o.wind};e.lastCharge=e.t;m={...m,none:1,charge:1,warn:{...o.wind,h:o.wind.h||1}}}
 h.push(m.lbl);if(h.length>6)h.shift();e.pk=e.hp;return m}
// A queued wind-up move always lands the turn after its "Charging…" intent.
const AI=f=>e=>{if(e.queued){const m=e.queued;e.queued=null;(e.hist||(e.hist=[])).push(m.lbl);e.pk=e.hp;return m}return f(e)};
// Split openings: copy 0 of a group opens with list[0], copy 1 with list[1] ... Entries are a move or {m,wind}.
const open=(e,l)=>{const x=l[((e.k||0))%l.length];return x.m?pk(e,[{w:1,m:x.m,wind:x.wind}]):pk(e,[{w:1,m:x}])};
// Fixed loop: step through seq (entries are a move or a function of e returning one). `off` shifts the start so copies are out of step.
function loop(e,seq,off=0){const i=((e.ci||0)+off)%seq.length;e.ci=(e.ci||0)+1;let m=seq[i];if(typeof m==='function')m=m(e);
 (e.hist||(e.hist=[])).push(m.lbl);if(e.hist.length>6)e.hist.shift();e.pk=e.hp;return m}
const tend=()=>alive().filter(x=>x.key==='tendril');
registerEnemies({
 // ---- normal enemies ----
 slug:{n:'Brine Slug',e:'🐌',role:'attacker',hp:hp('slug'),ai:AI(e=>{const lash={a:11,b:5,lbl:'Lash'},spit={a:6,w:1,lbl:'Brine Spit'},wd={b:12,lbl:'Withdraw'},ooze={status:{id:'murk',n:1,pile:'disc'},lbl:'Slime Trail'};
  if(!e.t)return open(e,[lash,spit]);
  return pk(e,[{w:38,m:lash,rep:2},{w:28,m:spit,rep:1},{w:hurt(e)>=10?65:28,m:wd,rep:1},{w:e.t>=2?14:0,m:ooze,rep:1}])})},
 gull:{n:'Gull Thief',e:'🐦',role:'debuffer',hp:hp('gull'),ai:AI(e=>{const snatch={steal:10,lbl:'Snatch & flee'},peck={a:5,h:2,lbl:'Peck'},dive={a:9,lbl:'Dive'},scr={a:3,v:1,lbl:'Screech'},wheel={a:5,b:6,lbl:'Wheel & Peck'};
  if(!e.t)return open(e,[peck,scr]);
  const gold=W.run.gold>0,go=e.t>=3&&gold;
  return pk(e,[{w:go?100:e.t>=2&&gold?50:0,m:snatch},{w:go?0:45,m:peck,rep:2},{w:go?0:25,m:dive,rep:1},{w:go?0:22,m:scr,rep:1},{w:e.t<3?20:0,m:wheel,rep:1}])})},
 // Fixed loop: Cleave, Pommel, Cleave, then Sharpen (while Might < 6) or Brace. Opens with Sharpen.
 knight:{n:'Wrack Knight',e:'🤖',role:'bruiser',hp:hp('knight'),ai:AI(e=>{const sh={s:2,b:8,lbl:'Sharpen'},cl={a:16,b:6,lbl:'Cleave'},pom={a:8,brittle:1,lbl:'Pommel'},br={b:14,lbl:'Brace'};
  if(!e.t){const m=loop(e,[sh]);e.ci=0;return m}
  return loop(e,[cl,pom,cl,e=>(e.st.str||0)>=6?br:sh])})},
 // Fuse bomb. Copies are staggered: the third cyst ripens one turn later.
 pod:{n:'Brine Cyst',e:'🍄',role:'bruiser',hp:[20,20],ai:e=>{const fuse=(e.k||0)>=2?3:2;
  return e.t>=fuse?{a:V.pod.burst,boom:1,lbl:'BURST'}:e.t===fuse-1?{w:1,lbl:'Spore Puff'}:{none:1,lbl:e.t===0?'Swelling…':'Ripening…'}}},
 wisp:{n:'Glimmer Wisp',e:'🏮',role:'debuffer',hp:hp('wisp'),ai:AI(e=>{const dz={w:2,b:10,lbl:'Dazzle'},fl={a:13,b:5,lbl:'Flare'},fk={a:4,v:1,lbl:'Flicker'},kd={s:2,b:6,lbl:'Kindle'};const soaked=(W.cb&&W.cb.p.st.weak)||0;
  if(!e.t)return open(e,[dz,fk]);
  return pk(e,[{w:soaked>=2?0:34,m:dz,rep:1},{w:half(e)?75:50,m:fl,rep:2},{w:26,m:fk,rep:1},{w:(e.st.str||0)>=4||e.t<2?0:16,m:kd,rep:1}])})},
 crab:{n:'Coral Crab',e:'🦀',role:'support',hp:hp('crab'),b0:6,ai:AI(e=>{const pn={a:9,b:4,lbl:'Pinch'},su={b:8,lbl:'Shell Up'},sn={a:6,brittle:1,lbl:'Snap'},sh={allyB:6,lbl:'Shelter'};
  if(!e.t)return open(e,[su,sn]);
  return pk(e,[{w:45,m:pn,rep:2},{w:e.block>=14?0:hurt(e)>=12?60:30,m:su,rep:1},{w:24,m:sn,rep:1},{w:allies(e).length?32:0,m:sh,rep:1}])})},
 leech:{n:'Tide Leech',e:'🪱',role:'debuffer',hp:[24,28],ai:AI(e=>{const miss=e.max-e.hp,latch={a:3,brittle:1,lbl:'Latch'},gnaw={a:6,lbl:'Gnaw'};
  if(!e.t)return open(e,[latch,gnaw]);
  return pk(e,[{w:38,m:latch,rep:2},{w:miss>=4?45:0,m:{a:5,heal:Math.min(5,miss),lbl:'Drink'},rep:1},{w:playerLow()?30:18,m:gnaw,rep:2},{w:e.t>=2?10:0,m:{a:2,drainE:1,lbl:'Sap'},rep:1}])})},
 lurker:{n:'Kelp Lurker',e:'🌿',role:'debuffer',hp:[34,38],ai:AI(e=>{const ent={a:4,status:{id:'kelp',n:1,pile:'disc'},lbl:'Entangle'},bind={v:1,status:{id:'kelp',n:1,pile:'draw'},lbl:'Bind'};
  if(!e.t)return open(e,[ent,bind]);
  return pk(e,[{w:28,m:{a:7,lbl:'Grab'},rep:2},{w:half(e)?55:32,m:{a:4,h:2,lbl:'Thrash'},rep:2},{w:30,m:{...ent,a:7},rep:1},{w:18,m:bind,rep:1}])})},
 tendril:{n:'Kelp Tendril',e:'🌱',role:'support',hp:[10,10],ai:e=>loop(e,[{a:3,lbl:'Lash'},{a:2,w:1,lbl:'Whip'},e=>(e.st.str||0)>=3?{a:3,lbl:'Lash'}:{s:1,b:3,lbl:'Thicken'}],(e.k||0))},
 // ---- Act 1 roster additions (design/ACT1-ROSTER-ADDITIONS.md; numbers simmed in CODEX_TASK_20/21) ----
 penitent:{n:'Wrackfolk Penitent',e:'⛓️',role:'bruiser',hp:[40,44],b0:8,
  passive:{n:'Penance',text:'At the end of each of its turns, it gains 1 Might.',endTurn:e=>{addSt(e,'str',1)}},
  ai:AI(e=>{const rattle={a:3,v:1,lbl:'Rattle Chains'};if(!e.t)return open(e,[{s:2,lbl:'Kneel'},rattle]);
   return pk(e,[{w:45,m:{a:4,lbl:'Scourge'},rep:2},{w:35,m:{a:3,h:2,lbl:'Flagellate'},rep:2},{w:22,m:rattle,rep:1},{w:half(e)&&e.max-e.hp>=6?45:0,m:{b:10,heal:6,lbl:'Prayer'},rep:1}])})},
 mender:{n:'Wrack Mender',e:'🪡',role:'support',hp:[28,32],b0:6,
  ai:AI(e=>{const al=allies(e),nd={a:6,lbl:'Needle'},pin={a:3,w:1,lbl:'Pin'},ward={allyB:6,lbl:'Ward'};
   const wd=al.filter(x=>x.max-x.hp>=5);const t=wd.length?wd.reduce((a,x)=>x.hp/x.max<a.hp/a.max?x:a):null;
   if(!e.t)return open(e,[al.length?ward:nd,pin]);
   return pk(e,[{w:40,m:nd,rep:2},{w:t?60:0,m:t?{healAlly:10,tgt:t.uid,lbl:'Stitch → '+t.n}:nd,rep:1},{w:al.length?30:0,m:ward,rep:1},{w:!al.length&&e.block<8?25:0,m:{b:8,lbl:'Stitch Seam'},rep:1},{w:25,m:pin,rep:1}])})},
 heap:{n:'Barnacle Heap',e:'🐚',role:'bruiser',hp:[36,40],b0:8,
  ai:AI(e=>{const sl={a:8,lbl:'Slam'},sc={a:5,brittle:1,lbl:'Scrape'},heave={b:6,lbl:'Heave…'},crash={a:15,lbl:'Crash'};if(!e.t)return pk(e,[{w:1,m:sl}]);
   if(e.spalled)return pk(e,[{w:55,m:sl,rep:2},{w:30,m:sc,rep:1},{w:canWind(e,1,3)?40:0,m:heave,wind:crash}]);
   return pk(e,[{w:55,m:sl,rep:2},{w:e.block>=12?0:hurt(e)>=10?55:30,m:{b:8,lbl:'Harden'},rep:1},{w:25,m:sc,rep:1},{w:canWind(e,2,4)?24:0,m:heave,wind:crash}])}),
  onDamaged:e=>{if(!e.spalled&&e.hp<=e.max/2){e.spalled=true;e.queued=null;spawn('limpet',{summoned:true});spawn('limpet',{summoned:true});if(W.cb.acting!==e)e.next={a:8,lbl:'Slam'};
   log('🐚 The Heap SPALLS: 2 Limpets break loose');callout('SPALL!','boss')}}},
 limpet:{n:'Limpet',e:'🐚',role:'attacker',hp:[7,7],ai:e=>loop(e,[{a:3,lbl:'Nip'},{b:5,lbl:'Cling'},{a:2,brittle:1,lbl:'Scrape'}],(e.k||0))},
 novice:{n:'Handbell Novice',e:'🔔',role:'support',hp:[38,42],b0:8,ai:AI(e=>{const chime={a:5,ring:1,lbl:'Chime'},hush={b:6,status:{id:'murk',n:1,pile:'draw'},lbl:'Hush'};
  if(!e.t)return open(e,[chime,hush]);
  return pk(e,[{w:40,m:{a:10,lbl:'Clapper'},rep:2},{w:38,m:chime,rep:2},{w:22,m:hush,rep:1},{w:canWind(e,2,4)?26:0,m:{b:6,lbl:'Raises the bell…'},wind:{a:14,ring:1,lbl:'Peal'}}])})},
 // ---- elites (v2.1) ----
 captain:{n:'Drowned Captain',e:'☠️',role:'support',hp:hp('captain'),elite:1,ai:AI(e=>{const slugs=countAlive('slug'),low=half(e);
  const crewWeak=allies(e).some(x=>(x.st.str||0)<4);
  return pk(e,[{w:low?45:35,m:{a:16,lbl:'Cutlass'},rep:2},{w:28,m:{a:8,h:2,v:1,lbl:'Boarding'},rep:2},{w:e.t&&slugs<2?(low?45:30):0,m:{summon:'slug',max:2,lbl:'Call the crew'},rep:1},
   {w:e.t&&slugs&&crewWeak?26:0,m:{b:8,allyS:2,lbl:'Bark Orders'},rep:1},
   {w:canWind(e,2,4)?28:0,m:{b:8,lbl:'Raises the cutlass…'},wind:{a:28,lbl:'Death Stroke'}}])})},
 // Tideglass Warden: mirrors the type of the last card you played THIS turn (resets each turn); an idle turn is punished.
 warden:{n:'Tideglass Warden',e:'🪞',role:'bruiser',hp:hp('warden'),elite:1,ai:e=>({mirror:1}),
  intent:e=>{const lt=W.cb&&W.cb.lastType,M=V.warden;return lt==='A'?{a:M.mirrorAtk,w:1,lbl:'Mirror: Attack',mirror:1}:lt==='S'?{b:M.mirrorBlk,lbl:'Mirror: Guard',mirror:1}:lt==='P'?{s:2,lbl:'Mirror: Empower',mirror:1}:{a:M.idleAtk,status:{id:'murk',n:1,pile:'draw'},lbl:'Mirror: Punish idleness',mirror:1}}},
 eel:{n:'Twin Eel',e:'🐍',role:'attacker',hp:hp('eel'),elite:1,ai:AI(e=>{const coil={b:8,lbl:'Coil'},spring={a:18,lbl:'Spring'},strike={a:12,lbl:'Strike'};
  if(!e.t)return open(e,[strike,{m:coil,wind:spring}]); // the pair is staggered
  return pk(e,[{w:32,m:strike,rep:2},{w:24,m:{b:10,lbl:'Slither'},rep:1},{w:22,m:{a:6,v:1,lbl:'Jolt'},rep:1},{w:canWind(e,1,3)?30:0,m:coil,wind:spring}])}),
  onDeath:e=>{alive().filter(x=>x.key==='eel').forEach(x=>{addSt(x,'str',3);log('🐍 The other eel rages: +3 Might')})}},
 // ---- bosses (Act 1 pool: 1 of 3, chosen per run and shown on the map) ----
 bell:{n:'The Knell',e:'🔔',role:'bruiser',hp:hp('bell'),boss:1,randomSprite:1,
  ai:AI(e=>{const mt=e.st.str||0,tl={a:18,s:V.bell.toll_might,lbl:'Toll'};
   if(e.crackNext){e.crackNext=0;return pk(e,[{w:1,m:{a:22,lbl:'Crack'}}])}
   if(e.ph===2)return pk(e,[{w:35,m:{a:22,lbl:'Crack'},rep:2},{w:25,m:{a:10,ring:2,lbl:'Shatter Wave'},rep:1},{w:mt>=6?0:20,m:tl,rep:1},{w:canWind(e,2,4)?30:0,m:{b:10,lbl:'The Bell tilts…'},wind:{a:32,ring:1,lbl:'Death Knell'}}]);
   if(!e.t)return pk(e,[{w:1,m:tl}]);
   return pk(e,[{w:mt>=4?0:28,m:tl,rep:1},{w:33,m:{a:6,h:3,lbl:'Chain Sweep'},rep:2},{w:e.block>=15?0:hurt(e)>=25?55:25,m:{b:15,w:2,lbl:'Haul the Bell'},rep:1},{w:16,m:{a:7,ring:2,lbl:'Dirge'},rep:1},
    {w:canWind(e,2,4)?30:0,m:{b:10,lbl:'The Bell swings wide…'},wind:{a:30,ring:1,lbl:'Great Peal'}}])}),
  // Phase 2 at <= 80 HP: clears debuffs, +1 Might, and starts on Crack — even when it cracks during its own turn (Parry; Playtester bug 2).
  onDamaged:e=>{if(e.ph===1&&e.hp<=80){e.ph=2;['weak','vuln','bleed','brittle'].forEach(k=>delete e.st[k]);if((e.st.str||0)<0)delete e.st.str;addSt(e,'str',1);e.ci=0;e.hist=[];e.queued=null;e.crackNext=1;e.next=EN_bell().ai(e);if(W.cb.acting===e)e.keepNext=true;
   log('🔔 The Knell\'s Bell CRACKS! Phase 2: +1 Might, debuffs cleared');log('🔔 '+BELL_LINES.crack);callout('THE BELL CRACKS!','boss')}}},
 matriarch:{n:'The Kelp Matriarch',e:'🪸',role:'support',hp:[90,90],boss:1,
  passive:{n:'Rooted',text:'At the end of each of her turns, she gains 3 Guard per living Tendril.',endTurn:e=>{const n=tend().length;if(n){e.block+=3*n;e.blkT=Date.now()}}},
  onSpawn:e=>{if(W.cb){spawn('tendril',{summoned:true});spawn('tendril',{summoned:true})}},
  ai:AI(e=>{const n=tend().length,grown=n>=2&&tend().every(t=>(t.st.str||0)>=4),soaked=(W.cb&&W.cb.p.st.weak)||0;
   if(!e.t)return pk(e,[{w:1,m:{a:14,status:{id:'kelp',n:2,pile:'drawRandom'},lbl:'Entangle'}}]);
   return pk(e,[{w:33,m:{a:14,status:{id:'kelp',n:2,pile:'drawRandom'},lbl:'Entangle'},rep:1},{w:grown?0:28,m:{grow:1,fx:grow,lbl:'Grow'},rep:1},{w:38,m:{a:7,h:2,lbl:'Crushing Embrace'},rep:2},
    {w:soaked>=2?0:18,m:{w:2,status:{id:'murk',n:2,pile:'draw'},lbl:'Pollen Haze'},rep:1},
    {w:n&&canWind(e,2,3)?30:0,m:{b:10,lbl:'Roots tighten…'},wind:{a:26,status:{id:'kelp',n:1,pile:'drawRandom'},lbl:'Strangle'}}])}),
  onDamaged:e=>{if(!e.bloomed&&e.hp<=45){e.bloomed=true;spawn('tendril',{summoned:true});spawn('tendril',{summoned:true});addSt(e,'str',2);log('🌸 The Matriarch BLOOMS: 2 Tendrils, +2 Might');callout('BLOOM!','boss')}}},
 tenant:{n:'The Last Tenant',e:'🏚️',hp:[180,180],b0:24,boss:1,role:'bruiser',
  passive:{n:'Home',text:'His Guard does not expire. Break all of it in one go and he is Breached: he loses his next action and takes 50% more damage, then rebuilds 24 Guard.',keepGuard:true},
  ai:AI(e=>{const p2=e.ph===2;if(!e.t)return pk(e,[{w:1,m:{a:p2?24:20,lbl:'Shoulder'}}]);
   return pk(e,[{w:38,m:{a:p2?24:20,lbl:'Shoulder'},rep:2},{w:28,m:{a:7,h:2,v:1,lbl:'Boathook'},rep:2},{w:e.block>=24?0:hurt(e)>=20?60:30,m:{b:12,lbl:'Board Up'},rep:1},
    {w:20,m:{a:8,status:{id:'scald',n:1,pile:'disc'},lbl:'Bang the Pipes'},rep:1},
    {w:canWind(e,2,4)?28:0,m:{b:10,lbl:'Hefts the door…'},wind:{a:p2?42:36,lbl:'Slam the Door'}}])}),
  // Breached (Guard >0→0 in one hit sequence): the next action is skipped (Reeling), Exposed for that turn, 24 Guard back after it.
  onGuardBroken:e=>{if(e.ph!==1||e.hp<=80||W.cb.acting===e)return;e.queued=null;e.next={none:1,b:24,lbl:'Reeling'};addSt(e,'vuln',1);log('🏚️ The Last Tenant is BREACHED: he reels, Exposed');callout('BREACHED!','boss')},
  onDamaged:e=>{if(e.ph===1&&e.hp<=80){e.ph=2;e.passive=null;e.hist=[];e.queued=null;['weak','vuln','bleed','brittle'].forEach(k=>delete e.st[k]);if((e.st.str||0)<0)delete e.st.str;addSt(e,'str',2);e.ci=0;e.next=EN.tenant.ai(e);if(W.cb.acting===e)e.keepNext=true;
   log('🏚️ '+TENANT_LINES.phase2);bossBeat('phase','The door splinters','He does not seem to notice. He hits harder now.',e)}},
  onDeath:e=>{log('🏚️ '+TENANT_LINES.defeat)}},
});
function grow(e){tend().forEach(t=>addSt(t,'str',1));if(tend().length<2)spawn('tendril',{summoned:true});log('🌿 Grow: Tendrils +1 Might')}
import {EN} from '../core/registry.js';
const EN_bell=()=>EN.bell;

// v2.2 enemy behaviour block (data-v2.json v21.sim.world.behaviour): normal enemies open with Guard (b0). Move choice is the weighted
// logic above (task 38; design/ENEMY-AI.md, design/ENEMIES-V2.md); the old fixed scripts are gone.
{const BEH=(DATA.v21.sim.world||{}).behaviour||{};for(const [k,b] of Object.entries(BEH)){const t=EN[k];if(t&&b.b0!=null)t.b0=b.b0}}
