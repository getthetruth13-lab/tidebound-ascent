// data/enemies.js — Act 1 roster (design-v2 §1.7) with the v2.1 numbers baked in (§V.4 / data-v2.json v21.sim.enemies).
// Intent fields: a attack, h hits, b Guard, s Might, w Soaked, v Exposed, heal, brittle, status:{id,n,pile}, summon(+max,n), drainE,
// stealPotion, steal (gold, then flee), boom (dies), ring (Ringing cards), fx(e) (custom), lbl (name shown).
// Template hooks: ai(e) next intent; intent(e) live intent (Warden); onSpawn, onDamaged, onDeath; passive:{name,text,endTurn(e)}.
import {registerEnemies} from '../core/registry.js';
import {W} from '../core/state.js';
import {DATA} from './generated/data-v2.js';
import {BELL_LINES,TENANT_LINES} from './lore.js';
import {addSt,alive,countAlive,log,callout,spawn,bossBeat} from '../engine/combat.js';
const V=DATA.v21.sim.enemies;
const hp=k=>V[k].hp.slice();
const tend=()=>alive().filter(x=>x.key==='tendril');
registerEnemies({
 slug:{n:'Brine Slug',e:'🐌',hp:hp('slug'),ai:e=>e.t%2?{b:5,lbl:'Slime Shell'}:{a:11,lbl:'Lash'}},
 gull:{n:'Gull Thief',e:'🐦',hp:hp('gull'),ai:e=>e.t>=2?{steal:10,lbl:'Snatch & flee'}:{a:7,h:2,lbl:'Peck'}},
 knight:{n:'Wrack Knight',e:'🤖',hp:hp('knight'),ai:e=>e.t===0?{s:2,lbl:'Sharpen'}:{a:16,lbl:'Cleave'}},
 pod:{n:'Brine Cyst',e:'🍄',hp:hp('pod'),ai:e=>e.t>=2?{a:V.pod.burst,boom:1,lbl:'BURST'}:{none:1,lbl:e.t===0?'Swelling…':'Ripening…'}},
 wisp:{n:'Glimmer Wisp',e:'🏮',hp:hp('wisp'),ai:e=>e.t%2?{a:13,lbl:'Flare'}:{w:2,lbl:'Dazzle'}},
 crab:{n:'Coral Crab',e:'🦀',hp:hp('crab'),b0:6,ai:e=>e.t%2?{a:9,b:4,lbl:'Pinch'}:{b:8,lbl:'Shell Up'}},
 leech:{n:'Tide Leech',e:'🪱',hp:[24,28],ai:e=>e.t%2?{a:3,brittle:1,lbl:'Latch'}:{a:5,heal:5,lbl:'Drink'}},
 lurker:{n:'Kelp Lurker',e:'🌿',hp:[34,38],ai:e=>{if(e.t===0)return{a:4,status:{id:'kelp',n:1,pile:'disc'},lbl:'Entangle'};const k=(e.t-1)%3;return k===0?{a:7,lbl:'Grab'}:k===1?{a:4,h:2,lbl:'Thrash'}:{a:7,status:{id:'kelp',n:1,pile:'disc'},lbl:'Entangle'}}},
 tendril:{n:'Kelp Tendril',e:'🌱',hp:[12,12],ai:e=>({a:3,lbl:'Lash'})},
 // ---- Act 1 roster additions (design/ACT1-ROSTER-ADDITIONS.md; numbers simmed in CODEX_TASK_20/21) ----
 penitent:{n:'Wrackfolk Penitent',e:'⛓️',hp:[40,44],b0:8,
  passive:{n:'Penance',text:'At the end of each of its turns, it gains 1 Might.',endTurn:e=>{addSt(e,'str',1)}},
  ai:e=>e.t===0?{s:2,lbl:'Kneel'}:{a:4,lbl:'Scourge'}},
 mender:{n:'Wrack Mender',e:'🪡',hp:[28,32],b0:6,
  ai:e=>{if(e.t%2)return{a:6,lbl:'Needle'};const al=alive().filter(x=>x!==e);
   if(!al.length)return{b:8,lbl:'Stitch'};const t=al.reduce((a,x)=>x.hp/x.max<a.hp/a.max?x:a);return{healAlly:10,tgt:t.uid,lbl:'Stitch → '+t.n}}},
 heap:{n:'Barnacle Heap',e:'🐚',hp:[36,40],b0:8,
  ai:e=>e.spalled||e.t%2===0?{a:8,lbl:'Slam'}:{b:8,lbl:'Harden'},
  onDamaged:e=>{if(!e.spalled&&e.hp<=e.max/2){e.spalled=true;spawn('limpet',{summoned:true});spawn('limpet',{summoned:true});if(W.cb.acting!==e)e.next={a:8,lbl:'Slam'};
   log('🐚 The Heap SPALLS: 2 Limpets break loose');callout('SPALL!','boss')}}},
 limpet:{n:'Limpet',e:'🐚',hp:[7,7],ai:e=>({a:3,lbl:'Nip'})},
 novice:{n:'Handbell Novice',e:'🔔',hp:[38,42],b0:8,ai:e=>e.t%2?{a:10,lbl:'Clapper'}:{a:5,ring:1,lbl:'Chime'}},
 // ---- elites (v2.1) ----
 captain:{n:'Drowned Captain',e:'☠️',hp:hp('captain'),elite:1,ai:e=>{const k=e.t%3;if(k===0)return{a:16,lbl:'Cutlass'};if(k===1)return{a:8,h:2,v:1,lbl:'Boarding'};return countAlive('slug')<2?{summon:'slug',max:2,lbl:'Call the crew'}:{a:16,lbl:'Cutlass'}}},
 // Tideglass Warden: mirrors the type of the last card you played THIS turn (resets each turn); an idle turn is punished.
 warden:{n:'Tideglass Warden',e:'🪞',hp:hp('warden'),elite:1,ai:e=>({mirror:1}),
  intent:e=>{const lt=W.cb&&W.cb.lastType,M=V.warden;return lt==='A'?{a:M.mirrorAtk,lbl:'Mirror: Attack',mirror:1}:lt==='S'?{b:M.mirrorBlk,lbl:'Mirror: Guard',mirror:1}:lt==='P'?{s:2,lbl:'Mirror: Empower',mirror:1}:{a:M.idleAtk,lbl:'Mirror: Punish idleness',mirror:1}}},
 eel:{n:'Twin Eel',e:'🐍',hp:hp('eel'),elite:1,ai:e=>(e.t+e.k)%2?{b:8,lbl:'Coil'}:{a:12,lbl:'Strike'},
  onDeath:e=>{alive().filter(x=>x.key==='eel').forEach(x=>{addSt(x,'str',3);log('🐍 The other eel rages: +3 Might')})}},
 // ---- bosses (Act 1 pool: 1 of 3, chosen per run and shown on the map) ----
 bell:{n:'The Knell',e:'🔔',hp:hp('bell'),boss:1,randomSprite:1,
  ai:e=>{const P=e.ph===2?[{a:22,lbl:'Crack'},{a:10,ring:2,lbl:'Shatter Wave'},{a:18,s:V.bell.toll_might,lbl:'Toll'}]:[{a:18,s:V.bell.toll_might,lbl:'Toll'},{a:6,h:3,lbl:'Chain Sweep'},{b:15,w:2,lbl:'Haul the Bell'}];return P[(e.ci++)%3]},
  // Phase 2 at <= 80 HP: clears debuffs, +2 Might, and starts on Crack — even when it cracks during its own turn (Parry; Playtester bug 2).
  onDamaged:e=>{if(e.ph===1&&e.hp<=80){e.ph=2;['weak','vuln','bleed','brittle'].forEach(k=>delete e.st[k]);if((e.st.str||0)<0)delete e.st.str;addSt(e,'str',2);e.ci=0;e.next=EN_bell().ai(e);if(W.cb.acting===e)e.keepNext=true;
   log('🔔 The Knell\'s Bell CRACKS! Phase 2: +2 Might, debuffs cleared');log('🔔 '+BELL_LINES.crack);callout('THE BELL CRACKS!','boss')}}},
 matriarch:{n:'The Kelp Matriarch',e:'🪸',hp:[90,90],boss:1,
  passive:{n:'Rooted',text:'At the end of each of her turns, she gains 4 Guard per living Tendril.',endTurn:e=>{const n=tend().length;if(n){e.block+=4*n;e.blkT=Date.now()}}},
  onSpawn:e=>{if(W.cb){spawn('tendril',{summoned:true});spawn('tendril',{summoned:true})}},
  ai:e=>{const k=(e.ci++)%3;return k===0?{a:12,status:{id:'kelp',n:2,pile:'drawRandom'},lbl:'Entangle'}:k===1?{grow:1,fx:grow,lbl:'Grow'}:{a:6,h:2,lbl:'Crushing Embrace'}},
  onDamaged:e=>{if(!e.bloomed&&e.hp<=45){e.bloomed=true;spawn('tendril',{summoned:true});spawn('tendril',{summoned:true});addSt(e,'str',2);log('🌸 The Matriarch BLOOMS: 2 Tendrils, +2 Might');callout('BLOOM!','boss')}}},
 tenant:{n:'The Last Tenant',e:'🏚️',hp:[180,180],b0:30,boss:1,
  passive:{n:'Home',text:'His Guard does not expire. Break all of it in one go and he is Breached: he loses his next action and takes 50% more damage, then rebuilds 30 Guard.',keepGuard:true},
  ai:e=>{const k=(e.ci++)%3;return k===0?{a:e.ph===2?22:18,lbl:'Shoulder'}:k===1?{a:7,h:2,v:1,lbl:'Boathook'}:{b:14,lbl:'Board Up'}},
  // Breached (Guard >0→0 in one hit sequence): the next action is skipped (Reeling), Exposed for that turn, 30 Guard back after it.
  onGuardBroken:e=>{if(e.ph!==1||W.cb.acting===e)return;e.next={none:1,b:30,lbl:'Reeling'};addSt(e,'vuln',1);log('🏚️ The Last Tenant is BREACHED: he reels, Exposed');callout('BREACHED!','boss')},
  onDamaged:e=>{if(e.ph===1&&e.hp<=80){e.ph=2;e.passive=null;['weak','vuln','bleed','brittle'].forEach(k=>delete e.st[k]);if((e.st.str||0)<0)delete e.st.str;addSt(e,'str',2);e.ci=0;e.next=EN.tenant.ai(e);if(W.cb.acting===e)e.keepNext=true;
   log('🏚️ '+TENANT_LINES.phase2);bossBeat('phase','The door splinters','He does not seem to notice. He hits harder now.',e)}},
  onDeath:e=>{log('🏚️ '+TENANT_LINES.defeat)}},
});
function grow(e){tend().forEach(t=>addSt(t,'str',1));if(tend().length<2)spawn('tendril',{summoned:true});log('🌿 Grow: Tendrils +1 Might')}
import {EN} from '../core/registry.js';
const EN_bell=()=>EN.bell;

// v2.2 enemy behaviour block (data-v2.json v21.sim.world.behaviour): normal enemies open with Guard (b0); scripted ones cycle
// their intents with Guard attached (Slug Lash/Withdraw, Wisp Dazzle/Flare, Wrack Knight Sharpen → Cleave ×2 → re-Sharpen).
{const BEH=(DATA.v21.sim.world||{}).behaviour||{};for(const [k,b] of Object.entries(BEH)){const t=EN[k];if(!t)continue;if(b.b0!=null)t.b0=b.b0;
 if(Array.isArray(b.script)&&b.script.length){const sc=b.script;t.ai=e=>({...sc[e.t%sc.length]})}}}
