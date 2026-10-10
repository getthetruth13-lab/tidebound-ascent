// data/potions.js — potion BEHAVIOUR (meta from data-v2.json). use(f,target): f is a card-like effect context
// (engine/combat.js F) with potion:true, so drinking is never a card play (no Momentum, Echo, Mark or cardPlayed).
// Passive potions (Second Tide) listen on the bus while they sit in a slot.
import {registerPotion,POTIONS,CARDS} from '../core/registry.js';
import {W,pick,shuffle} from '../core/state.js';
import {DATA} from './generated/data-v2.js';
import {addSt,alive,addCard,chart,choose,gainBlock,gainEnergy,gainMom,heal,log,callout,placeWp,escape,setTide} from '../engine/combat.js';
import {randomPotion} from '../engine/run.js';
import {mk,cname} from '../engine/cards.js';
const RAR={Common:'c',Uncommon:'u',Rare:'r'};
const ICON={salttonic:'🧂',inkvial:'🦑',urchin:'🦔',barnacledraught:'🍺',sprayflask:'💦',quickwater:'💧',coraldust:'🪸',sparkphial:'⚡',kelpbroth:'🥣',moondraught:'🌙',resvial:'🔔',chartwater:'🗺️',adrenalsalt:'🧂',mimicink:'🖋️',driftglass:'🫙',temperoil:'🛢️',secondtide:'🌊',tidalflask:'⚗️',abyssaloil:'🛢️',mistbomb:'💨'};
const COL={salttonic:'#9fd3e6',inkvial:'#4b3d6e',urchin:'#7a4a8a',barnacledraught:'#a8743c',sprayflask:'#6fc3df',quickwater:'#64c8ff',coraldust:'#ff8a7a',sparkphial:'#ffd84a',kelpbroth:'#5aa36a',moondraught:'#c9c6ff',resvial:'#c07aff',chartwater:'#7ac6a0',adrenalsalt:'#ff6a5a',mimicink:'#3a3a52',driftglass:'#9fe6d6',temperoil:'#d9a54a',secondtide:'#3fa8d8',tidalflask:'#5ad6c0',abyssaloil:'#2a1f3a',mistbomb:'#b8c0cc'};
const B={
 salttonic:{use:f=>f.blk(12)},
 inkvial:{use:(f,t)=>addSt(t,'weak',3)},
 urchin:{use:(f,t)=>f.dmg(20)},
 barnacledraught:{use:f=>{addSt(W.cb.p,'str',2);log('💪 +2 Might')}},
 sprayflask:{use:f=>f.all(10)},
 quickwater:{use:f=>f.draw(3)},
 coraldust:{use:(f,t)=>addSt(t,'vuln',3)},
 sparkphial:{use:f=>gainEnergy(2)},
 kelpbroth:{outside:1,use:f=>heal(Math.floor(W.run.max*.15))},
 moondraught:{use:f=>{const opts=[0,2,4,5,6,8,10].map(v=>({l:(v===10?'🌊 10 (Crest)':v===0?'🌀 0 (Undertow)':'Tide '+v),f:()=>{setTide(v,'potion');log('🌙 Moon Draught: Tide '+v)}}));choose('🌙 Moon Draught: set the Tide',opts)}},
 resvial:{use:f=>f.thisTurn({id:'resvial',mod:{echoPlan(i,ctx,p){return {...p,repeats:p.repeats+2}}}})},
 chartwater:{use:f=>{const cb=W.cb;if(cb.slots.length<cb.nslots){const ws=Object.values(CARDS).filter(c=>c.cls==='carto'&&c.t==='W'&&(c.r==='c'||c.r==='s'));const w=mk(pick(ws,'combat').id,false,{temp:true});cb.slots.push(w);log('🗺️ Chartwater: '+cname(w)+' placed (temporary)')}chart(6)}},
 adrenalsalt:{use:f=>{gainMom(3);f.parry(8)}},
 mimicink:{use:f=>{W.cb.mimic=true;log('🖋️ Mimic Ink: your next card is played twice')}},
 driftglass:{use:f=>{const cb=W.cb;const pool=Object.values(CARDS).filter(c=>c.cls==='colorless');
  // Phase 2 adds the colourless pool; until then Driftglass offers 3 class cards (judgment call, see README).
  const src=pool.length?pool:Object.values(CARDS).filter(c=>c.cls===W.run.cls&&c.r!=='s');
  const three=shuffle(src.slice(),'combat').slice(0,3);choose('🫙 Driftglass: add a card (costs 0 this turn)',three.map(c=>({l:`${c.e||''} ${c.n}`,f:()=>{addCard(c.id,'hand',{cost0Turn:true});log('🫙 '+c.n+' added')}})))}},
 temperoil:{use:f=>{W.cb.hand.forEach(c=>{c.tmpUp=true});log('🛢️ Temper Oil: hand upgraded for this combat')}},
 secondtide:{passive:1,can:()=>false,on:{playerDeath(id,ctx){if(ctx.cancel)return;const i=W.run.potions.indexOf('secondtide');if(i<0)return;W.run.potions[i]=null;W.run.hp=Math.max(1,Math.floor(W.run.max*.3));ctx.cancel=true;log('🌊 Second Tide: you rise again!');callout('SECOND TIDE!','potion')}},use:f=>{}},
 tidalflask:{use:f=>{for(let i=0;i<W.run.potions.length;i++)if(!W.run.potions[i])W.run.potions[i]=randomPotion();log('⚗️ Tidal Flask: potions refilled')}},
 abyssaloil:{use:f=>{let n=3;f.thisTurn({id:'abyssaloil',combat:true,on:{turnStart(inst){if(n-->0){gainEnergy(1);log('🛢️ Abyssal Oil: +1 Energy')}if(n<=0)inst.dead=true}}})}},
 mistbomb:{can:()=>W.cb&&W.cb.kind==='fight',use:f=>{log('💨 Mist Bomb!');escape()}},
};
for(const m of DATA.potions){const b=B[m.id];if(!b)throw new Error('No behaviour for potion '+m.id);
 registerPotion(m.id,Object.assign({n:m.name,rarity:RAR[m.rarity]||'c',cls:m.cls==='any'?null:m.cls,target:m.target==='enemy'?'enemy':'no',d:m.effect,flavour:m.flavour,e:ICON[m.id]||'🧪',col:COL[m.id]||'#8ad'},b))}
export {POTIONS};
