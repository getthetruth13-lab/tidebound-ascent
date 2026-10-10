// data/events.js — Phase 1 events (design-v2 §1.6): 10 Act 1 events (once per run) + 6 shrines (once per act).
// Each option: {l:label, ok?:()=>bool (requirement; disabled when false), f:()=>{...}}. Event-level req() skips the event.
// All rolls use the 'events' stream. Charms (Saltwife's Loom) are registered here too.
import {registerEvents,registerCharm,RELICS,CARDS,POTIONS,CHARMS} from '../core/registry.js';
import {W,pick,rng,R,shuffle} from '../core/state.js';
import {cname,mk} from '../engine/cards.js';
import {isLocked,goMap,heal,hurt,msg,openPick,randomCard,gainCard,gainCurse,gainGold,gainRelic,loseRelic,randomRelic,randomPotion,addPotion,addPotionSlot,
 loseMaxHp,gainMaxHp,eventFight,toast,pickable} from '../engine/run.js';
import {mod} from '../core/bus.js';
import {render} from '../ui/render.js';
const run=()=>W.run;
const done=(title,text)=>msg(title,text);
const freeSlot=()=>run().potions.includes(null);
const choice=(title,text,opts)=>{const ev=W.S.ev;W.S={screen:'event',ev:{...ev,t:text||ev.t,o:opts,sub:title},t:Date.now()};render()};
// ---------------- Charms (run-long, Saltwife's Loom) ----------------
registerCharm('springcurrent',{n:'Spring Current',e:'🌱',d:'Card rewards show 4 cards.',mod:{rewardCards(c,ctx,v){return v+1}}});
registerCharm('salvagersluck',{n:"Salvager's Luck",e:'🧲',d:'+1 potion slot.',gain(){addPotionSlot()}});
registerCharm('lightpurse',{n:'Light Purse',e:'👝',d:'Card removals cost 25 less.',mod:{scrubPrice(c,ctx,v){return Math.max(0,v-25)},removePrice(c,ctx,v){return Math.max(0,v-25)}}});
export function gainCharm(id){if(run().charms.includes(id))return;run().charms.push(id);const c=CHARMS[id];if(c.gain)c.gain();toast(`${c.e} Charm: ${c.n}`,'relic')}
const RULEBENDER={tide:'helmwheel',echo:'hollowreed',carto:'cairnstone',duel:'featherfoil'};
const removePrice=()=>Math.max(0,Math.round(mod('removePrice',{},50)));
registerEvents([
 // ================= shrines (any act; once per act) =================
 {id:'tidalwheel',pool:'shrine',n:'Tidal Wheel',e:'☸️',t:'A barnacled ship\'s wheel spins on its own.',o:[
  {l:'🎲 Spin the wheel (roll 1d6)',f:()=>{const d=1+R(6,'events');const lbl=`You rolled a <b>${d}</b>. `;
   if(d===1){const g=gainGold(40*run().act);return done('☸️ Tidal Wheel',lbl+`Gold spills out: +${g} gold.`)}
   if(d===2){const id=randomRelic(null,'events',{tier:'c'});if(id){gainRelic(id);return done('☸️ Tidal Wheel',lbl+`A relic washes up: <b>${RELICS[id].e} ${RELICS[id].n}</b>.`)}gainGold(50);return done('☸️ Tidal Wheel',lbl+'Only gold: +50.')}
   if(d===3){heal(run().max);return done('☸️ Tidal Wheel',lbl+'Warm water washes over you. Healed to full.')}
   if(d===4){gainCurse('dread');return done('☸️ Tidal Wheel',lbl+'A cold dread settles on you. (Curse: Dread)')}
   if(d===5)return openPick('remove','☸️ Tidal Wheel ('+d+'): remove a card',goMap);
   const l=Math.floor(run().max*.1);run().hp=Math.max(1,run().hp-l);return done('☸️ Tidal Wheel',lbl+`The wheel bites. −${l} HP.`)}},
  {l:'🚶 Leave',f:goMap}]},
 {id:'anvil',pool:'shrine',n:'Barnacle Anvil',e:'⚒️',t:'An anvil crusted with shells, still warm.',req:()=>pickable('upgrade').length>0,o:[
  {l:'⬆️ Temper: upgrade a card',f:()=>openPick('upgrade','⚒️ Barnacle Anvil: upgrade a card',goMap)},{l:'🚶 Leave',f:goMap}]},
 {id:'spring',pool:'shrine',n:'Cleansing Spring',e:'⛲',t:'Fresh water bubbling up through salt.',req:()=>pickable('remove').length>0,o:[
  {l:'💧 Wash: remove a card',f:()=>openPick('remove','⛲ Cleansing Spring: remove a card',goMap)},{l:'🚶 Leave',f:goMap}]},
 {id:'changeling',pool:'shrine',n:'Changeling Pool',e:'🫧',t:'Your reflection holds a different card.',req:()=>pickable('transform').length>0,o:[
  {l:'🔀 Reach in: transform a card into a random class card',f:()=>openPick('transform','🫧 Changeling Pool: transform a card',goMap)},{l:'🚶 Leave',f:goMap}]},
 {id:'offering',pool:'shrine',n:'Offering Tide',e:'🌊',t:'The tide pulls at your pack.',req:()=>pickable('offer').length>0,o:[
  {l:'🎁 Offer a card (its rarity decides the gift)',f:()=>{const S=W.S;openPick('offer','🌊 Offering Tide: offer a card (it is removed)',goMap,()=>{W.S=S;render()},null,ci=>{
   const d=CARDS[ci.id];const i=run().deck.indexOf(ci);if(i>=0)run().deck.splice(i,1);
   if(d.curse){gainGold(50);toast('+50 gold','')}else if(d.r==='s'||d.r==='c'){gainGold(25);toast('+25 gold','')}
   else if(d.r==='u'){const p=randomPotion('events');if(!addPotion(p))toast('Potion slots full','');heal(10)}else if(d.r==='r'){gainMaxHp(8);heal(8);toast('+8 Max HP','')}})}},
  {l:'🚶 Leave',f:goMap}]},
 {id:'wishing',pool:'shrine',n:'Wishing Undertow',e:'🌀',t:'A whirlpool in a rock basin swallows whatever you throw in.',o:[
  {l:'💠 Throw in a relic: get one a tier higher',ok:()=>run().relics.some(r=>RELICS[r.id].tier!=='s'),f:()=>{const opts=run().relics.filter(r=>RELICS[r.id].tier!=='s').map(r=>({l:`${RELICS[r.id].e} ${RELICS[r.id].n}`,f:()=>{
    const t=RELICS[r.id].tier;loseRelic(r.id);const up={c:'u',u:'r',r:'r',shop:'r',e:'r'}[t]||'u';
    if(t==='r'){const a=randomRelic(null,'events',{tier:'r'}),b=randomRelic(null,'events',{tier:'r'});const ch=[a,b].filter(Boolean);if(!ch.length){gainGold(50);return done('🌀 Wishing Undertow','The water gives back only gold. +50.')}
     return choice('Choose a Rare relic','The whirlpool offers two treasures.',ch.map(id=>({l:`${RELICS[id].e} ${RELICS[id].n}: ${RELICS[id].d}`,f:()=>{gainRelic(id);goMap()}})))}
    const id=randomRelic(null,'events',{tier:up});if(id){gainRelic(id);return done('🌀 Wishing Undertow',`It spits back <b>${RELICS[id].e} ${RELICS[id].n}</b>.`)}gainGold(50);done('🌀 Wishing Undertow','Only gold: +50.')}}));
   choice('Throw in which relic?','',opts.concat([{l:'↩️ Back',f:()=>{W.S.ev=EV('wishing');render()}}]))}},
  {l:'🃏 Throw in a card: remove it; your next card reward is all Rares',ok:()=>pickable('remove').length>0,f:()=>{const S=W.S;openPick('remove','🌀 Wishing Undertow: throw in a card',()=>{run().rareNext=true;done('🌀 Wishing Undertow','The water churns. Your next card reward will be all Rares.')},()=>{W.S=S;render()})}},
  {l:'🚶 Leave',f:goMap}]},
 // ================= Act 1 events (once per run) =================
 {id:'tidepool',pool:'act',act:1,n:'Tidepool Shrine',e:'⛩️',t:'A shrine half-sunk in a glowing tidepool. The water asks for blood.',req:()=>run().hp>8,o:[
  {l:'🩸 Offer 8 HP: gain a random Uncommon card',ok:()=>run().hp>8,f:()=>{hurt(8);const id=randomCard('u');gainCard(id);done('⛩️ Tidepool Shrine',`The water takes its due. You gain <b>${CARDS[id].n}</b>.`)}},
  {l:'🚶 Leave',f:goMap}]},
 {id:'cartomancer',pool:'act',act:1,n:'Wandering Cartomancer',e:'🃏',t:'A cloaked figure shuffles a deck that seems to shuffle back.',o:[
  {l:()=>`💰 Pay ${removePrice()} gold: remove a card`,ok:()=>run().gold>=removePrice()&&pickable('remove').length>0,f:()=>{const S=W.S;const p=removePrice();
   // charged only when you confirm a card (cancel keeps your gold)
   openPick('remove',`🃏 Remove a card (${p} gold)`,()=>{run().gold-=p;goMap()},()=>{W.S=S;render()})}},
  {l:'🔀 Free: transform a card',f:()=>openPick('transform','🃏 Transform a card',goMap)}]},
 {id:'sunkenchest',pool:'act',act:1,n:'Sunken Chest',e:'🧰',t:'A barnacled chest rests between the rocks. Something with claws is guarding it.',o:[
  {l:'💰 Pry it open: +40 gold, then fight a Coral Crab',f:()=>{gainGold(40);eventFight(['crab'],{event:'sunkenchest'})}},
  {l:'🚶 Leave',f:goMap}]},
 {id:'stranger',pool:'act',act:1,n:'Campfire Stranger',e:'🔥',t:'A stranger by a small fire waves you over. "Sit. Rest. Or let me sharpen something."',o:[
  {l:'❤️ Rest: heal 15 HP',f:()=>{heal(15);done('🔥 Campfire Stranger','You rest and feel restored. +15 HP.')}},
  {l:'⬆️ Let him sharpen: upgrade a random card',f:()=>{const c=pickable('upgrade');if(c.length){const x=pick(c,'events');x.up=true;done('🔥 Campfire Stranger',`The stranger improves <b>${cname(x)}</b>.`)}else done('🔥 Campfire Stranger','Nothing left to improve.')}}]},
 {id:'crabmarket',pool:'act',act:1,n:'Crab Market',e:'🦀',t:'Crabs haggle over shiny things on a flat rock. One clacks at your potion belt.',o:[
  {l:'🧪 Sell a potion: +50 gold',ok:()=>run().potions.some(Boolean),f:()=>{const opts=run().potions.map((p,i)=>p?{l:`${POTIONS[p].e} ${POTIONS[p].n}`,f:()=>{run().potions[i]=null;gainGold(50);done('🦀 Crab Market','The crabs pay in old coins. +50 gold.')}}:null).filter(Boolean);
   choice('Sell which potion?','',opts.concat([{l:'↩️ Back',f:()=>{W.S.ev=EV('crabmarket');render()}}]))}},
  {l:'🏺 Buy a mystery jar (50 gold): a random potion',ok:()=>run().gold>=50&&freeSlot(),f:()=>{run().gold-=50;const p=randomPotion('events');addPotion(p);done('🦀 Crab Market',`Inside the jar: <b>${POTIONS[p].e} ${POTIONS[p].n}</b>.`)}},
  {l:'🚶 Leave',f:goMap}]},
 {id:'gullnest',pool:'act',act:1,n:'Gull Nest',e:'🪺',t:'A huge nest of driftwood and stolen trinkets. Something golden glints inside.',o:[
  {l:'🐤 Raid the nest: gain Golden Gull, then fight 2 Gull Thieves (no card reward)',f:()=>{gainRelic('goldengull');eventFight(['gull','gull'],{noCards:true,event:'gullnest'})}},
  {l:'🥚 Take one egg: +30 gold, lose 4 HP',ok:()=>run().hp>4,f:()=>{gainGold(30);hurt(4);done('🪺 Gull Nest','You sell the egg later. +30 gold, −4 HP.')}},
  {l:'🚶 Leave',f:goMap}]},
 {id:'inkgrotto',pool:'act',act:1,n:'Ink Grotto',e:'🦑',t:'Black ink pools in a cave. It moves when you look away.',o:[
  {l:'🦑 Bathe in the ink: gain Kraken Ink and a Dread curse',f:()=>{gainRelic('krakenink');gainCurse('dread');done('🦑 Ink Grotto','You come out stained and uneasy. (Kraken Ink, Curse: Dread)')}},
  {l:'🧪 Bottle some: gain a random Uncommon potion',ok:freeSlot,f:()=>{const pool=Object.values(POTIONS).filter(p=>p.rarity==='u'&&(!p.cls||p.cls===run().cls)&&!isLocked('potions',p.id));const p=pick(pool,'events').id;addPotion(p);done('🦑 Ink Grotto',`You bottle <b>${POTIONS[p].e} ${POTIONS[p].n}</b>.`)}},
  {l:'🚶 Leave',f:goMap}]},
 {id:'sailor',pool:'act',act:1,n:'Shipwrecked Sailor',e:'🧔',t:'A sailor clings to a broken mast, a fine whetstone and a fat purse beside him.',o:[
  {l:'💰 Pay 25 gold: he upgrades 2 random cards',ok:()=>run().gold>=25,f:()=>{run().gold-=25;const c=shuffle(pickable('upgrade'),'events').slice(0,2);c.forEach(x=>x.up=true);done('🧔 Shipwrecked Sailor',c.length?`He sharpens <b>${c.map(cname).join('</b> and <b>')}</b>.`:'Nothing to sharpen.')}},
  {l:'🗡️ Rob him: +40 gold and a Brine Rot curse',f:()=>{gainGold(40);gainCurse('brinerot');done('🧔 Shipwrecked Sailor','You take his purse. It smells of rot. (+40 gold, Curse: Brine Rot)')}},
  {l:'🍞 Share rations: lose 6 HP, gain a random Rare card',ok:()=>run().hp>6,f:()=>{hurt(6);const id=randomCard('r');gainCard(id);done('🧔 Shipwrecked Sailor',`He presses a worn card into your hand: <b>${CARDS[id].n}</b>.`)}}]},
 {id:'mirror',pool:'act',act:1,n:'Tideglass Mirror',e:'🪞',t:'A mirror of sea-glass stands in the surf. Your reflection blinks first.',req:()=>run().deck.length>=6,o:[
  {l:'🪞 Gaze: gain Mirror of Brine (duplicate a non-Rare card)',f:()=>{gainRelic('brinemirror');if(W.S.screen==='event')goMap()}},
  {l:'💥 Shatter it: remove a card and lose 5 HP',ok:()=>run().hp>5&&pickable('remove').length>0,f:()=>{const S=W.S;openPick('remove','🪞 Shatter: remove a card (−5 HP)',()=>{hurt(5);goMap()},()=>{W.S=S;render()})}},
  {l:'🚶 Leave',f:goMap}]},
 {id:'loom',pool:'act',act:1,n:"Saltwife's Loom",e:'🧶',t:'An old woman weaves nets from salt and moonlight. "I can unpick a rule from you, or weave you a charm."',o:[
  {l:()=>{const id=RULEBENDER[run().cls];return `🧵 Unpick the pattern: lose 6 Max HP, gain ${RELICS[id].e} ${RELICS[id].n}`},ok:()=>!run().relics.some(r=>r.id===RULEBENDER[run().cls])&&run().max>6,
   f:()=>{loseMaxHp(6);const id=RULEBENDER[run().cls];gainRelic(id);done("🧶 Saltwife's Loom",`<b>${RELICS[id].e} ${RELICS[id].n}</b>: ${RELICS[id].d}`)}},
  {l:'🪢 Weave a Charm (lasts the whole run)',f:()=>choice('Choose a Charm',"\"Pick one. It'll stay with you.\"",['springcurrent','salvagersluck','lightpurse'].map(id=>({l:`${CHARMS[id].e} ${CHARMS[id].n}: ${CHARMS[id].d}`,f:()=>{gainCharm(id);goMap()}})))},
  {l:'🚶 Leave',f:goMap}]},
]);
import {EVENTS} from '../core/registry.js';
function EV(id){return EVENTS.find(e=>e.id===id)}
