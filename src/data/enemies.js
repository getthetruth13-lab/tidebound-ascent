// data/enemies.js — Act 1 roster (design-v2 §1.7) with the v2.1 numbers baked in (§V.4 / data-v2.json v21.sim.enemies).
// Intent fields: a attack, h hits, b Guard, s Might, w Soaked, v Exposed, heal, brittle, status:{id,n,pile}, summon(+max,n), drainE,
// stealPotion, steal (gold, then flee), boom (dies), ring (Ringing cards), fx(e) (custom), lbl (name shown).
// Template hooks: ai(e) next intent; intent(e) live intent (Warden); onSpawn, onDamaged, onDeath; passive:{name,text,endTurn(e)}.
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
// Wind-up allowed from turn `from`, and at least `gap` moves after the last one.
const canWind=(e,from,gap)=>e.t>=from&&e.t-(e.lastCharge==null?-99:e.lastCharge)>=gap;
// Weighted pick with anti-repeat. opts: {w weight (0 = unavailable), m move, rep max uses in a row (default 2), wind: the big move that lands NEXT turn}.
// Rolled once, here, with the run's seeded combat stream; the result is stored in e.next, so the intent is always the true move.
function pk(e,opts){const h=e.hist||(e.hist=[]);const ok=o=>o.w>0&&!(h.length>=(o.rep||2)&&h.slice(-(o.rep||2)).every(l=>l===o.m.lbl));
 let c=opts.filter(ok);if(!c.length)c=opts.filter(o=>o.w>0);if(!c.length)c=opts.slice(0,1);
 let r=R(c.reduce((a,o)=>a+o.w,0),cs),o=c[0];for(const x of c){if(r<x.w){o=x;break}r-=x.w}
 let m={...o.m};if(o.wind){e.queued={...o.wind};e.lastCharge=e.t;m={...m,none:1,charge:1,warn:{a:o.wind.a,h:o.wind.h||1}}}
 h.push(m.lbl);if(h.length>6)h.shift();e.pk=e.hp;return m}
// A queued wind-up move always lands the turn after its "Charging…" intent.
const AI=f=>e=>{if(e.queued){const m=e.queued;e.queued=null;(e.hist||(e.hist=[])).push(m.lbl);e.pk=e.hp;return m}return f(e)};
const tend=()=>alive().filter(x=>x.key==='tendril');
registerEnemies({
 slug:{n:'Brine Slug',e:'🐌',hp:hp('slug'),ai:AI(e=>{const lash={a:11,b:5,lbl:'Lash'},wd={b:12,lbl:'Withdraw'};
  return pk(e,[{w:e.t?40:100,m:lash,rep:2},{w:e.t?(hurt(e)>=10?70:35):0,m:wd,rep:1}])})},
 gull:{n:'Gull Thief',e:'🐦',hp:hp('gull'),ai:AI(e=>{const snatch={steal:10,lbl:'Snatch & flee'},peck={a:5,h:2,lbl:'Peck'};
  const gold=W.run.gold>0;return pk(e,[{w:e.t>=3&&gold?100:e.t>=2&&gold?50:0,m:snatch},{w:e.t>=3&&gold?0:60,m:peck,rep:2},{w:e.t&&e.t<3?25:0,m:{a:5,b:6,lbl:'Wheel & Peck'},rep:1}])})},
 knight:{n:'Wrack Knight',e:'🤖',hp:hp('knight'),ai:AI(e=>{const sh={s:2,b:8,lbl:'Sharpen'},cl={a:16,b:6,lbl:'Cleave'},br={b:14,lbl:'Brace'};const mt=e.st.str||0;
  if(!e.t)return pk(e,[{w:1,m:sh}]);
  return pk(e,[{w:mt>=6?0:30,m:sh,rep:1},{w:60,m:cl,rep:2},{w:hurt(e)>=14?40:8,m:br,rep:1}])})},
 pod:{n:'Brine Cyst',e:'🍄',hp:hp('pod'),ai:e=>e.t>=2?{a:V.pod.burst,boom:1,lbl:'BURST'}:{none:1,lbl:e.t===0?'Swelling…':'Ripening…'}},
 wisp:{n:'Glimmer Wisp',e:'🏮',hp:hp('wisp'),ai:AI(e=>{const dz={w:2,b:10,lbl:'Dazzle'},fl={a:13,b:5,lbl:'Flare'};const soaked=(W.cb&&W.cb.p.st.weak)||0;
  if(!e.t)return pk(e,[{w:1,m:dz}]);
  return pk(e,[{w:soaked>=2?0:40,m:dz,rep:1},{w:50,m:fl,rep:2}])})},
 crab:{n:'Coral Crab',e:'🦀',hp:hp('crab'),b0:6,ai:AI(e=>{const pn={a:9,b:4,lbl:'Pinch'},su={b:8,lbl:'Shell Up'};
  if(!e.t)return pk(e,[{w:1,m:su}]);
  return pk(e,[{w:50,m:pn,rep:2},{w:e.block>=14?0:hurt(e)>=12?65:38,m:su,rep:1}])})},
 leech:{n:'Tide Leech',e:'🪱',hp:[24,28],ai:AI(e=>{const miss=e.max-e.hp;
  return pk(e,[{w:40,m:{a:3,brittle:1,lbl:'Latch'},rep:2},{w:e.t&&miss>=4?45:0,m:{a:5,heal:Math.min(5,miss),lbl:'Drink'},rep:1},{w:15,m:{a:6,lbl:'Gnaw'},rep:2}])})},
 lurker:{n:'Kelp Lurker',e:'🌿',hp:[34,38],ai:AI(e=>{const ent={a:4,status:{id:'kelp',n:1,pile:'disc'},lbl:'Entangle'};if(!e.t)return pk(e,[{w:1,m:ent}]);
  return pk(e,[{w:30,m:{a:7,lbl:'Grab'},rep:2},{w:35,m:{a:4,h:2,lbl:'Thrash'},rep:2},{w:35,m:{...ent,a:7},rep:1}])})},
 tendril:{n:'Kelp Tendril',e:'🌱',hp:[10,10],ai:e=>({a:3,lbl:'Lash'})},
 // ---- Act 1 roster additions (design/ACT1-ROSTER-ADDITIONS.md; numbers simmed in CODEX_TASK_20/21) ----
 penitent:{n:'Wrackfolk Penitent',e:'⛓️',hp:[40,44],b0:8,
  passive:{n:'Penance',text:'At the end of each of its turns, it gains 1 Might.',endTurn:e=>{addSt(e,'str',1)}},
  ai:AI(e=>e.t===0?{s:2,lbl:'Kneel'}:pk(e,[{w:60,m:{a:4,lbl:'Scourge'},rep:2},{w:40,m:{a:3,h:2,lbl:'Flagellate'},rep:2}]))},
 mender:{n:'Wrack Mender',e:'🪡',hp:[28,32],b0:6,
  ai:AI(e=>{const al=alive().filter(x=>x!==e),nd={a:6,lbl:'Needle'};
   const w=al.filter(x=>x.max-x.hp>=5);const t=w.length?w.reduce((a,x)=>x.hp/x.max<a.hp/a.max?x:a):null;
   return pk(e,[{w:55,m:nd,rep:2},{w:e.t&&t?60:0,m:t?{healAlly:10,tgt:t.uid,lbl:'Stitch → '+t.n}:nd,rep:1},{w:e.block>=8?0:e.t?25:0,m:{b:8,lbl:'Stitch Seam'},rep:1}])})},
 heap:{n:'Barnacle Heap',e:'🐚',hp:[36,40],b0:8,
  ai:AI(e=>{const sl={a:8,lbl:'Slam'};return e.spalled||!e.t?sl:pk(e,[{w:60,m:sl,rep:2},{w:e.block>=12?0:hurt(e)>=10?60:35,m:{b:8,lbl:'Harden'},rep:1}])}),
  onDamaged:e=>{if(!e.spalled&&e.hp<=e.max/2){e.spalled=true;spawn('limpet',{summoned:true});spawn('limpet',{summoned:true});if(W.cb.acting!==e)e.next={a:8,lbl:'Slam'};
   log('🐚 The Heap SPALLS: 2 Limpets break loose');callout('SPALL!','boss')}}},
 limpet:{n:'Limpet',e:'🐚',hp:[7,7],ai:e=>({a:3,lbl:'Nip'})},
 novice:{n:'Handbell Novice',e:'🔔',hp:[38,42],b0:8,ai:AI(e=>!e.t?{a:5,ring:1,lbl:'Chime'}:pk(e,[{w:50,m:{a:10,lbl:'Clapper'},rep:2},{w:50,m:{a:5,ring:1,lbl:'Chime'},rep:2}]))},
 // ---- elites (v2.1) ----
 captain:{n:'Drowned Captain',e:'☠️',hp:hp('captain'),elite:1,ai:AI(e=>{const slugs=countAlive('slug');
  return pk(e,[{w:35,m:{a:16,lbl:'Cutlass'},rep:2},{w:30,m:{a:8,h:2,v:1,lbl:'Boarding'},rep:2},{w:e.t&&slugs<2?30:0,m:{summon:'slug',max:2,lbl:'Call the crew'},rep:1},
   {w:canWind(e,2,4)?28:0,m:{b:8,lbl:'Raises the cutlass…'},wind:{a:28,lbl:'Death Stroke'}}])})},
 // Tideglass Warden: mirrors the type of the last card you played THIS turn (resets each turn); an idle turn is punished.
 warden:{n:'Tideglass Warden',e:'🪞',hp:hp('warden'),elite:1,ai:e=>({mirror:1}),
  intent:e=>{const lt=W.cb&&W.cb.lastType,M=V.warden;return lt==='A'?{a:M.mirrorAtk,lbl:'Mirror: Attack',mirror:1}:lt==='S'?{b:M.mirrorBlk,lbl:'Mirror: Guard',mirror:1}:lt==='P'?{s:2,lbl:'Mirror: Empower',mirror:1}:{a:M.idleAtk,lbl:'Mirror: Punish idleness',mirror:1}}},
 eel:{n:'Twin Eel',e:'🐍',hp:hp('eel'),elite:1,ai:AI(e=>{
  if(!e.t)return e.k%2?pk(e,[{w:1,m:{b:8,lbl:'Coil'},wind:{a:18,lbl:'Spring'}}]):pk(e,[{w:1,m:{a:12,lbl:'Strike'}}]); // the pair is staggered
  return pk(e,[{w:35,m:{a:12,lbl:'Strike'},rep:2},{w:35,m:{b:10,lbl:'Slither'},rep:1},{w:canWind(e,1,3)?30:0,m:{b:8,lbl:'Coil'},wind:{a:18,lbl:'Spring'}}])}),
  onDeath:e=>{alive().filter(x=>x.key==='eel').forEach(x=>{addSt(x,'str',3);log('🐍 The other eel rages: +3 Might')})}},
 // ---- bosses (Act 1 pool: 1 of 3, chosen per run and shown on the map) ----
 bell:{n:'The Knell',e:'🔔',hp:hp('bell'),boss:1,randomSprite:1,
  ai:AI(e=>{const mt=e.st.str||0,tl={a:18,s:V.bell.toll_might,lbl:'Toll'};
   if(e.crackNext){e.crackNext=0;return pk(e,[{w:1,m:{a:22,lbl:'Crack'}}])}
   if(e.ph===2)return pk(e,[{w:35,m:{a:22,lbl:'Crack'},rep:2},{w:25,m:{a:10,ring:2,lbl:'Shatter Wave'},rep:1},{w:mt>=6?0:20,m:tl,rep:1},{w:canWind(e,2,4)?30:0,m:{b:10,lbl:'The Bell tilts…'},wind:{a:32,ring:1,lbl:'Death Knell'}}]);
   if(!e.t)return pk(e,[{w:1,m:tl}]);
   return pk(e,[{w:mt>=4?0:30,m:tl,rep:1},{w:35,m:{a:6,h:3,lbl:'Chain Sweep'},rep:2},{w:e.block>=15?0:hurt(e)>=25?55:25,m:{b:15,w:2,lbl:'Haul the Bell'},rep:1},
    {w:canWind(e,2,4)?30:0,m:{b:10,lbl:'The Bell swings wide…'},wind:{a:30,ring:1,lbl:'Great Peal'}}])}),
  // Phase 2 at <= 80 HP: clears debuffs, +1 Might, and starts on Crack — even when it cracks during its own turn (Parry; Playtester bug 2).
  onDamaged:e=>{if(e.ph===1&&e.hp<=80){e.ph=2;['weak','vuln','bleed','brittle'].forEach(k=>delete e.st[k]);if((e.st.str||0)<0)delete e.st.str;addSt(e,'str',1);e.ci=0;e.hist=[];e.queued=null;e.crackNext=1;e.next=EN_bell().ai(e);if(W.cb.acting===e)e.keepNext=true;
   log('🔔 The Knell\'s Bell CRACKS! Phase 2: +1 Might, debuffs cleared');log('🔔 '+BELL_LINES.crack);callout('THE BELL CRACKS!','boss')}}},
 matriarch:{n:'The Kelp Matriarch',e:'🪸',hp:[90,90],boss:1,
  passive:{n:'Rooted',text:'At the end of each of her turns, she gains 3 Guard per living Tendril.',endTurn:e=>{const n=tend().length;if(n){e.block+=3*n;e.blkT=Date.now()}}},
  onSpawn:e=>{if(W.cb){spawn('tendril',{summoned:true});spawn('tendril',{summoned:true})}},
  ai:AI(e=>{const n=tend().length,grown=n>=2&&tend().every(t=>(t.st.str||0)>=4);
   if(!e.t)return pk(e,[{w:1,m:{a:14,status:{id:'kelp',n:2,pile:'drawRandom'},lbl:'Entangle'}}]);
   return pk(e,[{w:35,m:{a:14,status:{id:'kelp',n:2,pile:'drawRandom'},lbl:'Entangle'},rep:1},{w:grown?0:30,m:{grow:1,fx:grow,lbl:'Grow'},rep:1},{w:40,m:{a:7,h:2,lbl:'Crushing Embrace'},rep:2},
    {w:n&&canWind(e,2,3)?30:0,m:{b:10,lbl:'Roots tighten…'},wind:{a:26,status:{id:'kelp',n:1,pile:'drawRandom'},lbl:'Strangle'}}])}),
  onDamaged:e=>{if(!e.bloomed&&e.hp<=45){e.bloomed=true;spawn('tendril',{summoned:true});spawn('tendril',{summoned:true});addSt(e,'str',2);log('🌸 The Matriarch BLOOMS: 2 Tendrils, +2 Might');callout('BLOOM!','boss')}}},
 tenant:{n:'The Last Tenant',e:'🏚️',hp:[180,180],b0:24,boss:1,
  passive:{n:'Home',text:'His Guard does not expire. Break all of it in one go and he is Breached: he loses his next action and takes 50% more damage, then rebuilds 24 Guard.',keepGuard:true},
  ai:AI(e=>{const p2=e.ph===2;if(!e.t)return pk(e,[{w:1,m:{a:p2?24:20,lbl:'Shoulder'}}]);
   return pk(e,[{w:40,m:{a:p2?24:20,lbl:'Shoulder'},rep:2},{w:30,m:{a:7,h:2,v:1,lbl:'Boathook'},rep:2},{w:e.block>=24?0:hurt(e)>=20?60:30,m:{b:12,lbl:'Board Up'},rep:1},
    {w:canWind(e,2,4)?28:0,m:{b:10,lbl:'Hefts the door…'},wind:{a:p2?42:36,lbl:'Slam the Door'}}])}),
  // Breached (Guard >0→0 in one hit sequence): the next action is skipped (Reeling), Exposed for that turn, 24 Guard back after it.
  onGuardBroken:e=>{if(e.ph!==1||W.cb.acting===e)return;e.queued=null;e.next={none:1,b:24,lbl:'Reeling'};addSt(e,'vuln',1);log('🏚️ The Last Tenant is BREACHED: he reels, Exposed');callout('BREACHED!','boss')},
  onDamaged:e=>{if(e.ph===1&&e.hp<=80){e.ph=2;e.passive=null;e.hist=[];e.queued=null;['weak','vuln','bleed','brittle'].forEach(k=>delete e.st[k]);if((e.st.str||0)<0)delete e.st.str;addSt(e,'str',2);e.ci=0;e.next=EN.tenant.ai(e);if(W.cb.acting===e)e.keepNext=true;
   log('🏚️ '+TENANT_LINES.phase2);bossBeat('phase','The door splinters','He does not seem to notice. He hits harder now.',e)}},
  onDeath:e=>{log('🏚️ '+TENANT_LINES.defeat)}},
});
function grow(e){tend().forEach(t=>addSt(t,'str',1));if(tend().length<2)spawn('tendril',{summoned:true});log('🌿 Grow: Tendrils +1 Might')}
import {EN} from '../core/registry.js';
const EN_bell=()=>EN.bell;

// v2.2 enemy behaviour block (data-v2.json v21.sim.world.behaviour): normal enemies open with Guard (b0). Move choice is the weighted
// logic above (task 38; design/ENEMY-AI.md); the old fixed scripts are gone.
{const BEH=(DATA.v21.sim.world||{}).behaviour||{};for(const [k,b] of Object.entries(BEH)){const t=EN[k];if(t&&b.b0!=null)t.b0=b.b0}}
