// data/enemies.js — Act 1 roster (design-v2 §1.7) with the v2.1 numbers baked in (§V.4 / data-v2.json v21.sim.enemies).
// Intent fields: a attack, h hits, b Guard, s Might, w Soaked, v Exposed, heal, brittle, status:{id,n,pile}, summon(+max,n), drainE,
// stealPotion, steal (gold, then flee), boom (dies), ring (Ringing cards), fx(e) (custom), lbl (name shown).
// Template hooks: ai(e) next intent; intent(e) live intent (Warden); onSpawn, onDamaged, onDeath; passive:{name,text,endTurn(e)}.
import {registerEnemies} from '../core/registry.js';
import {W} from '../core/state.js';
import {DATA} from './generated/data-v2.js';
import {addSt,alive,countAlive,log,callout,spawn} from '../engine/combat.js';
const V=DATA.v21.sim.enemies;
const hp=k=>V[k].hp.slice();
const tend=()=>alive().filter(x=>x.key==='tendril');
registerEnemies({
 slug:{n:'Brine Slug',e:'🐌',hp:hp('slug'),ai:e=>e.t%2?{b:5,lbl:'Slime Shell'}:{a:11,lbl:'Lash'}},
 gull:{n:'Gull Thief',e:'🐦',hp:hp('gull'),ai:e=>e.t>=2?{steal:10,lbl:'Snatch & flee'}:{a:7,h:2,lbl:'Peck'}},
 knight:{n:'Rust Knight',e:'🤖',hp:hp('knight'),ai:e=>e.t===0?{s:2,lbl:'Sharpen'}:{a:16,lbl:'Cleave'}},
 pod:{n:'Spore Pod',e:'🍄',hp:hp('pod'),ai:e=>e.t>=2?{a:V.pod.burst,boom:1,lbl:'BURST'}:{none:1,lbl:e.t===0?'Swelling…':'Ripening…'}},
 wisp:{n:'Glimmer Wisp',e:'🏮',hp:hp('wisp'),ai:e=>e.t%2?{a:13,lbl:'Flare'}:{w:2,lbl:'Dazzle'}},
 crab:{n:'Coral Crab',e:'🦀',hp:hp('crab'),b0:6,ai:e=>e.t%2?{a:9,b:4,lbl:'Pinch'}:{b:8,lbl:'Shell Up'}},
 leech:{n:'Tide Leech',e:'🪱',hp:[18,22],ai:e=>e.t%2?{a:3,brittle:1,lbl:'Latch'}:{a:5,heal:5,lbl:'Drink'}},
 lurker:{n:'Kelp Lurker',e:'🌿',hp:[26,30],ai:e=>{if(e.t===0)return{a:4,status:{id:'kelp',n:1,pile:'disc'},lbl:'Entangle'};const k=(e.t-1)%3;return k===0?{a:7,lbl:'Grab'}:k===1?{a:4,h:2,lbl:'Thrash'}:{a:7,status:{id:'kelp',n:1,pile:'disc'},lbl:'Entangle'}}},
 tendril:{n:'Kelp Tendril',e:'🌱',hp:[12,12],ai:e=>({a:4,lbl:'Lash'})},
 // ---- elites (v2.1) ----
 captain:{n:'Drowned Captain',e:'☠️',hp:hp('captain'),elite:1,ai:e=>{const k=e.t%3;if(k===0)return{a:16,lbl:'Cutlass'};if(k===1)return{a:8,h:2,v:1,lbl:'Boarding'};return countAlive('slug')<2?{summon:'slug',max:2,lbl:'Call the crew'}:{a:16,lbl:'Cutlass'}}},
 // Tideglass Warden: mirrors the type of the last card you played THIS turn (resets each turn); an idle turn is punished.
 warden:{n:'Tideglass Warden',e:'🪞',hp:hp('warden'),elite:1,ai:e=>({mirror:1}),
  intent:e=>{const lt=W.cb&&W.cb.lastType,M=V.warden;return lt==='A'?{a:M.mirrorAtk,lbl:'Mirror: Attack',mirror:1}:lt==='S'?{b:M.mirrorBlk,lbl:'Mirror: Guard',mirror:1}:lt==='P'?{s:2,lbl:'Mirror: Empower',mirror:1}:{a:M.idleAtk,lbl:'Mirror: Punish idleness',mirror:1}}},
 eel:{n:'Twin Eel',e:'🐍',hp:hp('eel'),elite:1,ai:e=>(e.t+e.k)%2?{b:8,lbl:'Coil'}:{a:12,lbl:'Strike'},
  onDeath:e=>{alive().filter(x=>x.key==='eel').forEach(x=>{addSt(x,'str',3);log('🐍 The other eel rages: +3 Might')})}},
 // ---- bosses (Act 1 pool: 1 of 2, chosen per run and shown on the map) ----
 bell:{n:'The Leviathan Bell',e:'🔔',hp:hp('bell'),boss:1,
  ai:e=>{const P=e.ph===2?[{a:25,lbl:'Crack'},{a:10,ring:2,lbl:'Shatter Wave'},{a:18,s:V.bell.toll_might,lbl:'Toll'}]:[{a:18,s:V.bell.toll_might,lbl:'Toll'},{a:6,h:3,lbl:'Reverberate'},{b:15,w:2,lbl:'Deep Hum'}];return P[(e.ci++)%3]},
  // Phase 2 at <= 80 HP: clears debuffs, +2 Might, and starts on Crack — even when it cracks during its own turn (Parry; Playtester bug 2).
  onDamaged:e=>{if(e.ph===1&&e.hp<=80){e.ph=2;['weak','vuln','bleed','brittle'].forEach(k=>delete e.st[k]);if((e.st.str||0)<0)delete e.st.str;addSt(e,'str',2);e.ci=0;e.next=EN_bell().ai(e);if(W.cb.acting===e)e.keepNext=true;
   log('🔔 The Bell CRACKS! Phase 2: +2 Might, debuffs cleared');callout('THE BELL CRACKS!','boss')}}},
 matriarch:{n:'The Kelp Matriarch',e:'🪸',hp:[150,150],boss:1,
  passive:{n:'Rooted',text:'At the end of each of her turns, gains 4 Guard per living Tendril.',endTurn:e=>{const n=tend().length;if(n){e.block+=4*n;e.blkT=Date.now()}}},
  onSpawn:e=>{if(W.cb){spawn('tendril',{summoned:true});spawn('tendril',{summoned:true})}},
  ai:e=>{const k=(e.ci++)%3;return k===0?{a:10,status:{id:'kelp',n:2,pile:'drawRandom'},lbl:'Entangle'}:k===1?{grow:2,fx:grow,lbl:'Grow'}:{a:6,h:2,lbl:'Crushing Embrace'}},
  onDamaged:e=>{if(!e.bloomed&&e.hp<=75){e.bloomed=true;spawn('tendril',{summoned:true});spawn('tendril',{summoned:true});addSt(e,'str',2);log('🌸 The Matriarch BLOOMS: 2 Tendrils, +2 Might');callout('BLOOM!','boss')}}},
});
function grow(e){tend().forEach(t=>addSt(t,'str',2));if(tend().length<2)spawn('tendril',{summoned:true});log('🌿 Grow: Tendrils +2 Might')}
import {EN} from '../core/registry.js';
const EN_bell=()=>EN.bell;
