// data/events.js — Phase 1 events (design-v2 §1.6): 10 Act 1 events (once per run) + 6 shrines (once per act).
// Each option: {l:label, ok?:()=>bool (requirement; disabled when false), f:()=>{...}}. Event-level req() skips the event.
// All rolls use the 'events' stream. Charms (Saltwife's Loom) are registered here too.
import {registerEvents,registerCharm,RELICS,CARDS,POTIONS,CHARMS} from '../core/registry.js';
import {W,pick,rng,R,rnd,shuffle} from '../core/state.js';
import {cname,mk} from '../engine/cards.js';
import {isLocked,goMap,heal,hurt,msg,openPick,randomCard,gainCard,gainCurse,gainGold,gainRelic,loseRelic,randomRelic,randomPotion,addPotion,addPotionSlot,
 loseMaxHp,gainMaxHp,eventFight,toast,pickable} from '../engine/run.js';
import {mod} from '../core/bus.js';
import {eventText} from './lore.js';
import {render} from '../ui/render.js';
import {playSound} from '../audio.js';
const run=()=>W.run;
const freeSlot=()=>run().potions.includes(null);
const choice=(title,text,opts)=>{const ev=W.S.ev;cur=ev;W.S={screen:'event',ev:{...ev,t:text||ev.t,o:opts,sub:title},t:Date.now()};render()};
// ---------------- Charms (run-long, Saltwife's Loom) ----------------
registerCharm('springcurrent',{n:'Spring Current',e:'🌱',d:'Card rewards show 4 cards.',mod:{rewardCards(c,ctx,v){return v+1}}});
registerCharm('salvagersluck',{n:"Salvager's Luck",e:'🧲',d:'+1 potion slot.',gain(){addPotionSlot()}});
registerCharm('lightpurse',{n:'Light Purse',e:'👝',d:'Card removals cost 25 less.',mod:{scrubPrice(c,ctx,v){return Math.max(0,v-25)},removePrice(c,ctx,v){return Math.max(0,v-25)}}});
export function gainCharm(id){if(run().charms.includes(id))return;run().charms.push(id);const c=CHARMS[id];if(c.gain)c.gain();toast(`${c.e} Charm: ${c.n}`,'relic')}
const RULEBENDER={tide:'helmwheel',echo:'hollowreed',carto:'cairnstone',duel:'featherfoil'};
const removePrice=()=>Math.max(0,Math.round(mod('removePrice',{},50)));
// Task 40: every option is a trade-off or a rolled gamble. Option = O(name, summary, {d: full explanation, risk: chance of the GOOD outcome
// (number, or a string) -> shown as "Risky", ok/why: requirement + reason, f}). Rolls use rnd('events') only (seeded). Results are shown
// in the same full-screen scene via reveal() (tone good | bad | mixed: title colour, flash, sound cue; speed follows the Animation setting).
const O=(n,s,o)=>({n,s,...o});
const LEAVE=O('Leave','walk on',{d:'Walk away. Nothing gained, nothing lost.',f:goMap});
const roll=p=>rnd('events')<p;
let cur=null; // the event being played (a pick screen replaces W.S.ev, so reveal() remembers it)
const TITLE={good:'Fortune Smiles',bad:'The Tide Takes Its Due',mixed:'The Price Is Paid'};
function reveal(tone,text,title){const ev=(W.S.screen==='event'&&W.S.ev&&!W.S.ev.out?W.S.ev:cur)||W.S.ev;
 W.S={screen:'event',ev:{...ev,sub:null,t:text,o:[{n:'Continue',cont:1,f:goMap}],out:{tone,title:title||TITLE[tone]},rt:Date.now()},t:Date.now()};
 playSound(tone==='bad'?'evBad':tone==='good'?'evGood':'evRoll');render()}
const done=(text,tone='good',title)=>reveal(tone,text,title);
const B=s=>`<b>${s}</b>`;
const rel=id=>B(`${RELICS[id].e} ${RELICS[id].n}`);
const loseGold=n=>{const l=Math.min(run().gold,n);run().gold-=l;return l};
const pct=()=>run().hp/run().max;
// A card pick that applies after you confirm, with Cancel returning to the scene.
const pickThen=(mode,title,after,filter)=>{const S=W.S;cur=S.ev;openPick(mode,title,ci=>{if(!ci)return goMap();after(ci)},()=>{W.S=S;render()},filter)};
const randomRemovable=()=>{const c=pickable('remove');return c.length?pick(c,'events'):null};
registerEvents([
 // ================= shrines (any act; once per act) =================
 {id:'tidalwheel',pool:'shrine',n:'Tidal Wheel',e:'☸️',t:'A barnacled ship\'s wheel spins on its own.',o:[
  O('Spin the wheel','roll a die for a prize or a price',{risk:'4 in 6 good',d:'Roll a die. 1: gold. 2: a Common relic. 3: heal to full. 4: remove a card. 5: a Dread curse. 6: lose 10% of your Max HP.',f:()=>{const d=1+R(6,'events');const lbl=`The wheel stops on <b>${d}</b>. `;
   if(d===1){const g=gainGold(40*run().act);return done(lbl+`Gold spills out: +${g} gold.`)}
   if(d===2){const id=randomRelic(null,'events',{tier:'c'});if(id){gainRelic(id);return done(lbl+`A relic washes up: ${rel(id)}.`)}gainGold(50);return done(lbl+'Only gold: +50.')}
   if(d===3){heal(run().max);return done(lbl+'Warm water washes over you. Healed to full.')}
   if(d===4)return pickThen('remove','☸️ Tidal Wheel: remove a card',ci=>done(lbl+`The current carries off <b>${cname(ci)}</b>.`));
   if(d===5){gainCurse('dread');return done(lbl+'A cold dread settles on you. (Curse: Dread)','bad')}
   const l=Math.max(1,Math.floor(run().max*.1));hurt(l);return done(lbl+`The wheel bites. Lose ${l} HP.`,'bad')}}),
  O('Spin it backwards','50%: upgrade 2 cards, else Dread and lose 5 HP',{risk:.5,ok:()=>run().hp>5,why:'Needs more than 5 HP',d:'Fight the current. 50%: two random cards are upgraded. 50%: a Dread curse and you lose 5 HP.',f:()=>{
   if(roll(.5)){const c=shuffle(pickable('upgrade'),'events').slice(0,2);if(c.length){c.forEach(x=>x.up=true);return done(`The wheel groans and turns your way. <b>${c.map(cname).join('</b> and <b>')}</b> shine.`)}const g=gainGold(60);return done(`The wheel turns your way, but you have nothing to polish. +${g} gold.`)}
   hurt(5);gainCurse('dread');done('The wheel spins on you. Lose 5 HP and gain a Dread curse.','bad')}}),
  LEAVE]},
 {id:'anvil',pool:'shrine',n:'Barnacle Anvil',e:'⚒️',t:'An anvil crusted with shells, still warm.',req:()=>pickable('upgrade').length>0,o:[
  O('Strike true','lose 5 HP, upgrade a card of your choice',{ok:()=>run().hp>5,why:'Needs more than 5 HP',d:'Hammer a card of your choice into better shape. The anvil is hot: you lose 5 HP.',f:()=>pickThen('upgrade','⚒️ Barnacle Anvil: upgrade a card',ci=>{hurt(5);done(`Sparks and brine. <b>${cname(ci)}</b> is tempered. Lose 5 HP.`,'mixed','Tempered')})}),
  O('Strike with all your might','60%: upgrade 2 random cards, else Barnacled and lose 4 HP',{risk:.6,ok:()=>run().hp>4,why:'Needs more than 4 HP',d:'Two blows at once. 60%: two random cards are upgraded. 40%: the anvil cracks: a Barnacled curse and you lose 4 HP.',f:()=>{
   if(roll(.6)){const c=shuffle(pickable('upgrade'),'events').slice(0,2);c.forEach(x=>x.up=true);return done(`The ring carries across the water. <b>${c.map(cname).join('</b> and <b>')}</b> are tempered.`)}
   hurt(4);gainCurse('barnacled');done('The anvil cracks and shells crawl over your pack. Lose 4 HP, gain a Barnacled curse.','bad')}}),
  LEAVE]},
 {id:'spring',pool:'shrine',n:'Cleansing Spring',e:'⛲',t:'Fresh water bubbling up through salt.',req:()=>pickable('remove').length>0,o:[
  O('Wash','lose 5 HP, remove a card',{ok:()=>run().hp>5,why:'Needs more than 5 HP',d:'Scrub a card out of your deck for good. The water is bitterly cold: you lose 5 HP.',f:()=>pickThen('remove','⛲ Cleansing Spring: remove a card',ci=>{hurt(5);done(`The spring carries off <b>${cname(ci)}</b>. Lose 5 HP.`,'mixed','Washed Clean')})}),
  O('Drink deep','70%: heal 18 HP, else Brine Rot',{risk:.7,d:'70%: you heal 18 HP. 30%: the salt rises with the water: a Brine Rot curse and you lose 4 HP.',f:()=>{
   if(roll(.7)){heal(18);return done('Sweet, cold water. Heal 18 HP.')}
   hurt(4);gainCurse('brinerot');done('Salt in the water. Lose 4 HP, gain a Brine Rot curse.','bad')}}),
  LEAVE]},
 {id:'changeling',pool:'shrine',n:'Changeling Pool',e:'🫧',t:'Your reflection holds a different card.',req:()=>pickable('transform').length>0,o:[
  O('Reach in','lose 5 HP, transform a card',{ok:()=>run().hp>5,why:'Needs more than 5 HP',d:'Swap a card of your choice for a random class card. The pool bites: you lose 5 HP.',f:()=>{const before=new Set(run().deck.map(c=>c.uid));
   pickThen('transform','🫧 Changeling Pool: transform a card',ci=>{hurt(5);const n=run().deck.find(c=>!before.has(c.uid));done(`<b>${cname(ci)}</b> becomes ${n?B(cname(n)):'something new'}. Lose 5 HP.`,'mixed','Changed')})}}),
  O('Offer your reflection','50%: a random Rare card, else Leaky Hull and lose 5 HP',{risk:.5,ok:()=>run().hp>5,why:'Needs more than 5 HP',d:'Give the pool your face. 50%: it pays with a random Rare card. 50%: it keeps something: a Leaky Hull curse and you lose 5 HP.',f:()=>{
   if(roll(.5)){const id=randomCard('r');gainCard(id);return done(`The pool hands back a stranger's gift: ${B(CARDS[id].n)}.`)}
   hurt(5);gainCurse('leakyhull');done('Your reflection does not come back the same. Lose 5 HP, gain a Leaky Hull curse.','bad')}}),
  LEAVE]},
 {id:'offering',pool:'shrine',n:'Offering Tide',e:'🌊',t:'The tide pulls at your pack.',req:()=>pickable('offer').length>0,o:[
  O('Offer a card','its rarity decides the gift',{d:'The card is removed for good. Curse: +50 gold. Starter or Common: +25 gold. Uncommon: a random potion and heal 10. Rare: +8 Max HP and heal 8.',f:()=>{let txt='';
   pickThen('offer','🌊 Offering Tide: offer a card (it is removed)',ci=>{const d=CARDS[ci.id];const i=run().deck.indexOf(ci);if(i>=0)run().deck.splice(i,1);
    if(d.curse){gainGold(50);txt='The tide devours the curse and pays well. +50 gold.'}else if(d.r==='s'||d.r==='c'){gainGold(25);txt='A small gift for a small offering. +25 gold.'}
    else if(d.r==='u'){const p=randomPotion('events');const got=addPotion(p);heal(10);txt=`The tide returns ${got?B(POTIONS[p].e+' '+POTIONS[p].n):'a potion you have no room for'} and heals you. Heal 10 HP.`}
    else if(d.r==='r'){gainMaxHp(8);heal(8);txt='The tide rises to meet you. +8 Max HP.'}
    done(`<b>${cname(ci)}</b> is gone. ${txt}`,'mixed','An Offering Accepted')})}}),
  O('Cast in 40 gold','55%: a Common relic, else lose 5 HP',{risk:.55,ok:()=>run().gold>=40&&run().hp>5,why:'Needs 40 gold',d:'Pay 40 gold. 55%: the tide returns a Common relic. 45%: it takes the gold and a bite of you (lose 5 HP).',f:()=>{run().gold-=40;
   if(roll(.55)){const id=randomRelic(null,'events',{tier:'c'});if(id){gainRelic(id);return done(`The tide gives something back: ${rel(id)}.`)}const g=gainGold(60);return done(`The tide returns only coin. +${g} gold.`)}
   hurt(5);done('The tide keeps your gold and drags at your ankles. Lose 5 HP.','bad')}}),
  LEAVE]},
 {id:'wishing',pool:'shrine',n:'Wishing Undertow',e:'🌀',t:'A whirlpool in a rock basin swallows whatever you throw in.',o:[
  O('Throw in a relic','80%: get one a tier higher',{risk:.8,ok:()=>run().relics.some(r=>RELICS[r.id].tier!=='s'),why:'You carry no relic to spare',d:'Give up a relic. 80%: the whirlpool returns one a tier higher (Rares offer a choice of two Rares). 20%: it returns only 40 gold.',f:()=>{const opts=run().relics.filter(r=>RELICS[r.id].tier!=='s').map(r=>({l:`${RELICS[r.id].e} ${RELICS[r.id].n}`,f:()=>{
    const t=RELICS[r.id].tier;loseRelic(r.id);const up={c:'u',u:'r',r:'r',shop:'r',e:'r'}[t]||'u';
    if(!roll(.8)){const g=gainGold(40);return done(`The relic vanishes. The water gives back only coin. +${g} gold.`,'bad')}
    if(t==='r'){const a=randomRelic(null,'events',{tier:'r'}),b=randomRelic(null,'events',{tier:'r'});const ch=[a,b].filter(Boolean);if(!ch.length){const g=gainGold(50);return done(`The water gives back only gold. +${g}.`,'mixed')}
     return choice('Choose a Rare relic','The whirlpool offers two treasures.',ch.map(id=>({l:`${RELICS[id].e} ${RELICS[id].n}: ${RELICS[id].d}`,f:()=>{gainRelic(id);done(`The undertow gives up ${rel(id)}.`)}})))}
    const id=randomRelic(null,'events',{tier:up});if(id){gainRelic(id);return done(`It spits back ${rel(id)}.`)}const g=gainGold(50);done(`Only gold: +${g}.`,'mixed')}}));
   choice('Throw in which relic?','',opts.concat([{l:'↩️ Back',f:()=>{W.S.ev=EV('wishing');render()}}]))}}),
  O('Throw in a card','lose 6 HP, remove it; your next card reward is all Rares',{ok:()=>pickable('remove').length>0&&run().hp>6,why:'Needs more than 6 HP',d:'The card is removed. The whirlpool bruises you (lose 6 HP) but your next card reward shows only Rares.',f:()=>pickThen('remove','🌀 Wishing Undertow: throw in a card',ci=>{hurt(6);run().rareNext=true;done(`<b>${cname(ci)}</b> spirals down. Lose 6 HP. Your next card reward will be all Rares.`,'mixed','The Water Churns')})}),
  O('Throw in 50 gold','50%: a Rare relic, else nothing',{risk:.5,ok:()=>run().gold>=50,why:'Needs 50 gold',d:'Pay 50 gold. 50%: the whirlpool returns a random Uncommon relic. 50%: gone.',f:()=>{run().gold-=50;
   if(roll(.5)){const id=randomRelic(null,'events',{tier:'u'});if(id){gainRelic(id);return done(`A glint rises from the dark: ${rel(id)}.`)}const g=gainGold(80);return done(`Coin comes back, and more. +${g} gold.`)}
   done('The coin spins down and is gone.','bad','Swallowed')}}),
  LEAVE]},
 // ================= Act 1 events (once per run) =================
 {id:'tidepool',pool:'act',act:1,n:'Tidepool Shrine',e:'⛩️',t:'A shrine half-sunk in a glowing tidepool. The water asks for blood.',req:()=>run().hp>8,o:[
  O('Offer 8 HP','gain a random Uncommon card',{ok:()=>run().hp>8,why:'Needs more than 8 HP',d:'The water takes 8 HP and gives a random Uncommon card.',f:()=>{hurt(8);const id=randomCard('u');gainCard(id);done(`The water takes its due. You gain ${B(CARDS[id].n)}. Lose 8 HP.`,'mixed','The Water Is Satisfied')}}),
  O('Offer 16 HP','gain a random Rare card',{ok:()=>run().hp>16,why:'Needs more than 16 HP',d:'The water takes 16 HP and gives a random Rare card.',f:()=>{hurt(16);const id=randomCard('r');gainCard(id);done(`The tidepool glows bright. You gain ${B(CARDS[id].n)}. Lose 16 HP.`,'mixed','A Rich Offering')}}),
  O('Wade in','gain 6 Max HP, or lose 10 HP',{risk:()=>pct()>=.5?.6:.45,ok:()=>run().hp>10,why:'Needs more than 10 HP',d:()=>`Step into the glow. ${pct()>=.5?'60%':'45%'} (a hale body fares better than a weak one): +6 Max HP. Otherwise it drags at you: lose 10 HP.`,f:()=>{
   if(roll(pct()>=.5?.6:.45)){gainMaxHp(6);return done('The glow sinks into you and stays. Gain 6 Max HP.')}
   hurt(10);done('The pool is colder than it looks. Lose 10 HP.','bad')}}),
  LEAVE]},
 {id:'cartomancer',pool:'act',act:1,n:'Wandering Cartomancer',e:'🃏',t:'A cloaked figure shuffles a deck that seems to shuffle back.',o:[
  O('Pay for a cut',()=>`pay ${removePrice()} gold, remove a card`,{ok:()=>run().gold>=removePrice()&&pickable('remove').length>0,why:()=>`Needs ${removePrice()} gold`,d:()=>`He cuts one card from your deck for ${removePrice()} gold (charged when you confirm).`,f:()=>{const p=removePrice();
   pickThen('remove',`🃏 Remove a card (${p} gold)`,ci=>{run().gold-=p;done(`He tears <b>${cname(ci)}</b> in half. Pay ${p} gold.`,'mixed','Cut Clean')})}}),
  O('Trade a card','lose 7 HP, transform a card',{ok:()=>run().hp>7&&pickable('transform').length>0,why:'Needs more than 7 HP',d:'He deals you a new card for one of yours: transform a card of your choice into a random class card. It costs 7 HP.',f:()=>{const before=new Set(run().deck.map(c=>c.uid));
   pickThen('transform','🃏 Transform a card',ci=>{hurt(7);const n=run().deck.find(c=>!before.has(c.uid));done(`<b>${cname(ci)}</b> turns face down and comes up ${n?B(cname(n)):'new'}. Lose 7 HP.`,'mixed','A Fresh Deal')})}}),
  O('Draw from his deck',()=>run().cls==='carto'?'75%: a random Uncommon card, else a Seasick curse':'60%: a random Uncommon card, else a Seasick curse',{risk:()=>run().cls==='carto'?.75:.6,d:()=>`Take the top card of his deck. ${run().cls==='carto'?'He knows a fellow mapmaker: 75%':'60%'}: a random Uncommon card. Otherwise: a Seasick curse.`,f:()=>{
   if(roll(run().cls==='carto'?.75:.6)){const id=randomCard('u');gainCard(id);return done(`He turns it over with a flourish: ${B(CARDS[id].n)}.`)}
   gainCurse('seasick');done('The card is blank, and it will not leave your pack. (Curse: Seasick)','bad')}}),
  LEAVE]},
 {id:'sunkenchest',pool:'act',act:1,n:'Sunken Chest',e:'🧰',t:'A barnacled chest rests between the rocks. Something with claws is guarding it.',o:[
  O('Pry it open','+40 gold now, then fight a Coral Crab',{d:'Take the gold first, then fight the Coral Crab that guards it. Normal fight rewards follow.',f:()=>{gainGold(40);eventFight(['crab'],{event:'sunkenchest'})}}),
  O('Pick the lock','50%: +50 gold and a potion, no fight. Else lose 6 HP and fight the crab',{risk:.5,ok:()=>run().hp>6,why:'Needs more than 6 HP',d:'Quietly. 50%: gain 50 gold and a random potion, and no fight. 50%: the crab wakes, pinches you for 6 HP and you fight it with no gold.',f:()=>{
   if(roll(.5)){const g=gainGold(50);const p=randomPotion('events');const got=freeSlot()&&addPotion(p);return done(`The lock gives with a soft click. +${g} gold${got?` and ${B(POTIONS[p].e+' '+POTIONS[p].n)}`:''}.`)}
   hurt(6);toast('The crab wakes! Lose 6 HP','curse');eventFight(['crab'],{event:'sunkenchest'})}}),
  LEAVE]},
 {id:'stranger',pool:'act',act:1,n:'Campfire Stranger',e:'🔥',t:'On a dry landing, a stranger by a small fire waves you over. "Sit. Rest. Or let me sharpen something."',o:[
  O('Rest by the fire','80%: heal 15 HP, else he picks your pocket',{risk:.8,d:'80%: heal 15 HP. 20%: you wake lighter: lose 30 gold (or 4 HP if your purse is empty).',f:()=>{
   if(roll(.8)){heal(15);return done('You sleep soundly by the small fire. Heal 15 HP.')}
   if(run().gold>=10){const l=loseGold(30);return done(`You wake to a cold fire and a lighter purse. Lose ${l} gold.`,'bad','Robbed')}hurt(4);done('You wake to a cold fire and a sore head. Lose 4 HP.','bad','Robbed')}}),
  O('Let him sharpen','pay 20 gold, upgrade a random card',{ok:()=>run().gold>=20&&pickable('upgrade').length>0,why:()=>run().gold<20?'Needs 20 gold':'Nothing left to upgrade',d:'He asks for coin and works a random card on his whetstone.',f:()=>{run().gold-=20;const x=pick(pickable('upgrade'),'events');x.up=true;done(`The stranger improves ${B(cname(x))}. Pay 20 gold.`,'mixed','Honed')}}),
  O('Trade stories','50%: a random potion, else Dread',{risk:.5,d:'50%: he presses a random potion on you (or 25 gold if your belt is full). 50%: his tale is cold and stays with you: a Dread curse.',f:()=>{
   if(roll(.5)){if(freeSlot()){const p=randomPotion('events');addPotion(p);return done(`A good story earns a good drink: ${B(POTIONS[p].e+' '+POTIONS[p].n)}.`)}const g=gainGold(25);return done(`A good story earns coin. +${g} gold.`)}
   gainCurse('dread');done('His story is about a drowned lighthouse. You do not sleep well. (Curse: Dread)','bad')}})]},
 {id:'crabmarket',pool:'act',act:1,n:'Crab Market',e:'🦀',t:'Crabs haggle over shiny things on a flat rock. One clacks at your potion belt.',o:[
  O('Sell a potion','+50 gold',{ok:()=>run().potions.some(Boolean),why:'You carry no potion',d:'Hand over a potion of your choice for 50 gold.',f:()=>{const opts=run().potions.map((p,i)=>p?{l:`${POTIONS[p].e} ${POTIONS[p].n}`,f:()=>{run().potions[i]=null;gainGold(50);done(`The crabs pay in old coins. +50 gold.`,'mixed','Sold')}}:null).filter(Boolean);
   choice('Sell which potion?','',opts.concat([{l:'↩️ Back',f:()=>{W.S.ev=EV('crabmarket');render()}}]))}}),
  O('Buy a mystery jar','pay 50 gold: 70% a random potion, else an angry eel',{risk:.7,ok:()=>run().gold>=50&&freeSlot(),why:()=>run().gold<50?'Needs 50 gold':'Your potion belt is full',d:'Pay 50 gold. 70%: a random potion. 30%: an eel in the jar: lose 5 HP and nothing else.',f:()=>{run().gold-=50;
   if(roll(.7)){const p=randomPotion('events');addPotion(p);return done(`Inside the jar: ${B(POTIONS[p].e+' '+POTIONS[p].n)}. Pay 50 gold.`)}
   hurt(5);done('The jar holds an eel, and it is very angry. Lose 5 HP and 50 gold.','bad','Swindled')}}),
  O('Pinch from the stall','40%: a Common relic, else lose 9 HP and 30 gold',{risk:.4,ok:()=>run().hp>9,why:'Needs more than 9 HP',d:'Fast hands. 40%: a random Common relic. 60%: the crabs catch you: lose 9 HP and up to 30 gold.',f:()=>{
   if(roll(.4)){const id=randomRelic(null,'events',{tier:'c'});if(id){gainRelic(id);return done(`Nobody sees. You walk off with ${rel(id)}.`)}const g=gainGold(40);return done(`Nobody sees. +${g} gold.`)}
   hurt(9);const l=loseGold(30);done(`Claws, everywhere. Lose 9 HP${l?` and ${l} gold`:''}.`,'bad','Caught')}}),
  LEAVE]},
 {id:'gullnest',pool:'act',act:1,n:'Gull Nest',e:'🪺',t:'On a broken parapet sits a huge nest of driftwood and stolen trinkets. Something golden glints inside.',o:[
  O('Raid the nest','gain Golden Gull, then fight 2 Gull Thieves (no card reward)',{d:'Take the Golden Gull relic, then fight two Gull Thieves. No card reward from this fight.',f:()=>{gainRelic('goldengull');eventFight(['gull','gull'],{noCards:true,event:'gullnest'})}}),
  O('Take one egg','65%: +30 gold, else fight a Gull Thief',{risk:.65,d:'65%: you slip away and sell the egg for 30 gold. 35%: the mother gull fights you (a Gull Thief, no card reward, no gold).',f:()=>{
   if(roll(.65)){const g=gainGold(30);return done(`You sell the egg later. +${g} gold.`)}toast('The mother gull returns!','curse');eventFight(['gull'],{noCards:true,event:'gullnest'})}}),
  LEAVE]},
 {id:'inkgrotto',pool:'act',act:1,n:'Ink Grotto',e:'🖋️',t:'Black ink pools in a cave. It moves when you look away.',o:[
  O('Bathe in the ink','gain Lampblack and a Dread curse',{d:'A sure relic with a sure price: gain Lampblack (enemies start weakened) and a Dread curse.',f:()=>{gainRelic('krakenink');gainCurse('dread');done(`You come out stained and uneasy. ${rel('krakenink')} and a Dread curse.`,'mixed','Stained')}}),
  O('Bottle some','65%: a random Uncommon potion, else lose 5 HP',{risk:.65,ok:()=>freeSlot()&&run().hp>5,why:()=>freeSlot()?'Needs more than 5 HP':'Your potion belt is full',d:'65%: a random Uncommon potion. 35%: it spills and burns: lose 5 HP.',f:()=>{
   if(roll(.65)){const pool=Object.values(POTIONS).filter(p=>p.rarity==='u'&&(!p.cls||p.cls===run().cls)&&!isLocked('potions',p.id));const p=pick(pool,'events').id;addPotion(p);return done(`You bottle ${B(POTIONS[p].e+' '+POTIONS[p].n)}.`)}
   hurt(5);done('The ink slips through your fingers and burns. Lose 5 HP.','bad','Spilled')}}),
  O('Read the ink','50%: a random Uncommon card, else it swallows a card',{risk:.5,ok:()=>run().deck.length>=8&&pickable('remove').length>0,why:'Your deck is too small to risk',d:'The ink writes on your deck. 50%: a random Uncommon card. 50%: it swallows a random card.',f:()=>{
   if(roll(.5)){const id=randomCard('u');gainCard(id);return done(`New words in black ink: ${B(CARDS[id].n)}.`)}
   const c=randomRemovable();if(!c)return done('The ink finds nothing to take.','mixed');run().deck.splice(run().deck.indexOf(c),1);done(`The ink swallows <b>${cname(c)}</b>.`,'bad','Forgotten')}}),
  LEAVE]},
 {id:'sailor',pool:'act',act:1,n:'Shipwrecked Sailor',e:'🧔',t:'A sailor clings to a broken mast, a fine whetstone and a fat purse beside him. He counts under his breath: "Nine to climb and nine to shine..."',o:[
  O('Pay for his whetstone','pay 25 gold, he upgrades 2 random cards',{ok:()=>run().gold>=25&&pickable('upgrade').length>0,why:()=>run().gold<25?'Needs 25 gold':'Nothing left to upgrade',d:'Pay 25 gold. He sharpens two random cards.',f:()=>{run().gold-=25;const c=shuffle(pickable('upgrade'),'events').slice(0,2);c.forEach(x=>x.up=true);done(`He sharpens <b>${c.map(cname).join('</b> and <b>')}</b>. Pay 25 gold.`,'mixed','Sharpened')}}),
  O('Rob him','60%: +60 gold, else lose 8 HP and Brine Rot',{risk:.6,ok:()=>run().hp>8,why:'Needs more than 8 HP',d:'60%: you take his purse: +60 gold. 40%: he fights back: lose 8 HP and a Brine Rot curse.',f:()=>{
   if(roll(.6)){const g=gainGold(60);return done(`You take his purse and he does not stop you. +${g} gold.`)}
   hurt(8);gainCurse('brinerot');done('He is stronger than he looks, and the purse is rotten. Lose 8 HP, gain a Brine Rot curse.','bad','He Fights Back')}}),
  O('Share rations','lose 6 HP; 70% a Rare card, else an Uncommon one',{risk:.7,ok:()=>run().hp>6,why:'Needs more than 6 HP',d:'Give up some of your food: lose 6 HP. 70%: he presses a random Rare card on you. 30%: only an Uncommon one.',f:()=>{hurt(6);const r=roll(.7);const id=randomCard(r?'r':'u');gainCard(id);
   done(`He presses a worn card into your hand: ${B(CARDS[id].n)}. Lose 6 HP.`,r?'good':'mixed',r?'A Rare Gift':'A Small Gift')}})]},
 {id:'mirror',pool:'act',act:1,n:'Tideglass Mirror',e:'🪞',t:'In a flooded chamber, a mirror of sea-glass stands in the surf. Your reflection blinks first.',req:()=>run().deck.length>=6,o:[
  O('Gaze','65%: gain Mirror of Brine, else Dread and lose 4 HP',{risk:.65,ok:()=>run().hp>4,why:'Needs more than 4 HP',d:'Look back. 65%: gain Mirror of Brine (duplicate a non-Rare card). 35%: your reflection takes something: a Dread curse and you lose 4 HP.',f:()=>{
   if(roll(.65)){gainRelic('brinemirror');if(W.S.screen==='event')done(`The glass ripples and lets you keep what it shows. ${rel('brinemirror')}.`);return}
   hurt(4);gainCurse('dread');done('Your reflection smiles first. Lose 4 HP, gain a Dread curse.','bad','It Looks Back')}}),
  O('Shatter it','lose 5 HP, remove a card, +25 gold',{ok:()=>run().hp>5&&pickable('remove').length>0,why:'Needs more than 5 HP',d:'Break the mirror. Remove a card of your choice, sell the shards for 25 gold and lose 5 HP to the glass.',f:()=>pickThen('remove','🪞 Shatter: remove a card (−5 HP)',ci=>{hurt(5);gainGold(25);done(`The glass shows <b>${cname(ci)}</b> once more, then it is gone. Lose 5 HP, +25 gold.`,'mixed','Seven Years of Silver')})}),
  LEAVE]},
 {id:'loom',pool:'act',act:1,n:"Saltwife's Loom",e:'🧶',t:'In a keeper\'s recess, an old woman weaves nets from salt and moonlight. "I can unpick a rule from you, or weave you a charm."',o:[
  O('Unpick the Pattern',()=>{const id=RULEBENDER[run().cls];return `lose 6 Max HP, gain ${RELICS[id].n}`},{ok:()=>!run().relics.some(r=>r.id===RULEBENDER[run().cls])&&run().max>6,why:'You already carry it',d:()=>{const id=RULEBENDER[run().cls];return `Lose 6 Max HP and gain ${RELICS[id].n}, a relic made for your class: ${RELICS[id].d}`},
   f:()=>{loseMaxHp(6);const id=RULEBENDER[run().cls];gainRelic(id);done(`${rel(id)}: ${RELICS[id].d} Lose 6 Max HP.`,'mixed','A Rule Bent')}}),
  O('Weave a Charm','pay 35 gold, a charm for the whole run',{ok:()=>run().gold>=35,why:'Needs 35 gold',d:'Pay 35 gold and choose one of three Charms that lasts the whole run.',f:()=>{run().gold-=35;choice('Choose a Charm',"\"Pick one. It'll stay with you.\"",['springcurrent','salvagersluck','lightpurse'].map(id=>({l:`${CHARMS[id].e} ${CHARMS[id].n}: ${CHARMS[id].d}`,f:()=>{gainCharm(id);done(`She ties it off. <b>${CHARMS[id].e} ${CHARMS[id].n}</b>: ${CHARMS[id].d} Pay 35 gold.`,'mixed','Woven')}})))}}),
  O('Pull a loose thread','50%: upgrade a card and heal 8, else lose 6 HP',{risk:.5,ok:()=>run().hp>6,why:'Needs more than 6 HP',d:'50%: a random card is upgraded and you heal 8 HP. 50%: the net tangles and cuts: lose 6 HP.',f:()=>{
   if(roll(.5)){const c=pickable('upgrade');if(c.length){const x=pick(c,'events');x.up=true;heal(8);return done(`The thread comes loose in your hand. <b>${cname(x)}</b> is improved. Heal 8 HP.`)}heal(8);return done('The thread comes loose and warm. Heal 8 HP.')}
   hurt(6);done('The net closes round your hand. Lose 6 HP.','bad','Tangled')}}),
  LEAVE]},
]);
import {EVENTS} from '../core/registry.js';
function EV(id){const e=EVENTS.find(e=>e.id===id);return e&&{...e,t:eventText(e.id,e.t)}}
