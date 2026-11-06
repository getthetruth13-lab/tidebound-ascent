// data/ferryman.js: the Ferryman's Offer (v0.7.09). It is the run-start blessing, like Slay the Spire's Neow (design-v2 §4.6), and the
// picks are Spencer's 11-05 "your picks ... refer to slay the spire".
// - When: after the Act 1 travel scene, before floor 1, on every run except your first ever and Daily runs.
// - How many choices: 4 (two small gifts, a third gift and a Hard Price) when your last run reached floor 10 or higher. Otherwise 2
//   small gifts, which is how Neow offers less after a poor run.
// - Rolls use their own 'ferry' random stream, so the map, cards, events and fights of a seeded run are unchanged.
// - Choosing ends the scene and the climb begins (the Lantern Tasks open once, as before).
import {W,pick,rnd,shuffle} from '../core/state.js';
import {CARDS,RELICS,POTIONS} from '../core/registry.js';
import {cname,mk,upgradeCard} from '../engine/cards.js';
import {goMap,gainGold,gainMaxHp,loseMaxHp,gainCurse,gainRelic,randomRelic,randomPotion,addPotion,rollCards,poolOf,pickable,openPick} from '../engine/run.js';
import {loadHistory} from '../progress.js';
import {render} from '../ui/render.js';
import {playSound} from '../audio.js';
const S='ferry';const B=s=>`<b>${s}</b>`;
const run=()=>W.run;
// who gets an offer
export function ferryDue(o={}){if(o.daily||o.noOffer)return false;const h=loadHistory();return h.length>0}
export function ferryFull(){const h=loadHistory();return !!(h[0]&&((h[0].floor|0)>=10||h[0].won))}
// end of the scene: into the map; the Lantern Tasks overlay opens once when the climb begins (it was held while the Ferryman spoke)
export function ferryDone(){run().offer='done';goMap()}
function said(tone,text){const ev=W.S.screen==='event'&&W.S.ev&&W.S.ev.id==='ferryman'?W.S.ev:FERRY_EV();
 W.S={screen:'event',ev:{...ev,sub:null,t:text,o:[{n:'Continue',cont:1,f:ferryDone}],out:{tone,title:tone==='bad'?'The Price Is Paid':'The Ferryman Nods'},rt:Date.now()},t:Date.now()};
 playSound(tone==='bad'?'evBad':'evGood');render()}
const FERRY_EV=()=>({id:'ferryman',n:"The Ferryman's Offer",e:'⚓',t:''});
// choose 1 of 3 cards on the reward screen; it returns to the map like any reward
function cardChoice(cards,title){const r=run();r.offer='done';W.S={screen:'reward',kind:'ferry',rows:[{k:'cards',cards}],scene:null,boss:null,title,t:Date.now()};render()}
// small gifts (design-v2 §4.6 minor gifts)
const MINOR={
 maxhp:{n:'Salt in the blood',s:'+8 Max HP',d:'Gain 8 Max HP (and heal 8).',f:()=>{gainMaxHp(8);said('good','The cold goes out of your bones. +8 Max HP.')}},
 remove:{n:'Leave a card behind',s:'remove a card',d:'Choose a card in your deck to leave on the shore for good.',ok:()=>pickable('remove').length>0,
  f:()=>{const S0=W.S;openPick('remove',"⚓ The Ferryman's Offer: leave a card behind",ci=>ci?said('good',`You leave ${B(cname(ci))} on the shore.`):ferryDone(),()=>{W.S=S0;render()})}},
 gold:{n:'A purse of drowned coin',s:'+100 gold',d:'Gain 100 gold.',f:()=>{const g=gainGold(100);said('good',`He presses a wet purse into your hand. +${g} gold.`)}},
 potions:{n:'Three stoppered flasks',s:'fill your potion slots',d:'Gain a random potion for each empty slot (up to 3).',f:()=>{const got=[];for(let i=0;i<3&&run().potions.includes(null);i++){const id=randomPotion(S);if(id&&addPotion(id))got.push(POTIONS[id])}
  said('good',got.length?'Flasks clink in your pack: '+got.map(p=>B(p.e+' '+p.n)).join(', ')+'.':'Your pack is already full.')}},
 upgrade:{n:'A whetstone of sea-glass',s:'upgrade a card',d:'Choose a card to upgrade (Temper).',ok:()=>pickable('upgrade').length>0,
  f:()=>{const S0=W.S;openPick('upgrade',"⚓ The Ferryman's Offer: upgrade a card",ci=>ci?said('good',`${B(cname(ci))} is honed.`):ferryDone(),()=>{W.S=S0;render()})}},
 card:{n:'A page from the deep',s:'choose 1 of 3 cards',d:'Choose 1 of 3 cards for your hero, or skip.',f:()=>cardChoice(rollCards(3,'shop',{stream:S}),"The Ferryman's Gift")},
};
// one Hard Price (a cost and a bigger gain)
const HARD={
 relic:{n:'Pay in blood',s:'lose 10% Max HP, gain a Rare relic',d:'Lose 10% of your Max HP. Gain a random Rare relic.',f:()=>{const l=Math.max(1,Math.floor(run().max*.1));loseMaxHp(l);const id=randomRelic(null,S,{tier:'r'});if(id)gainRelic(id);
  said('bad',`Lose ${l} Max HP. `+(id?`He hands you ${B(RELICS[id].e+' '+RELICS[id].n)}.`:'He has nothing left to give.'))}},
 doubloon:{n:'Take the cursed coin',s:'gain Cursed Doubloon, +250 gold',d:'Gain the curse Cursed Doubloon (each Merchant visit costs 15 gold). Gain 250 gold.',f:()=>{gainCurse('doubloon');const g=gainGold(250);said('bad',`The coin is ice-cold. Curse: ${B('Cursed Doubloon')}. +${g} gold.`)}},
 transform:{n:'Pay with your purse',s:'lose all gold, change 2 cards for upgraded ones',d:'Lose all your gold. 2 random cards in your deck become random hero cards, upgraded.',ok:()=>pickable('transform').length>=2,
  f:()=>{const r=run();r.gold=0;const pickd=shuffle(pickable('transform').slice(),S).slice(0,2);const out=[];
   for(const ci of pickd){const i=r.deck.indexOf(ci);const n=pick(poolOf().filter(c=>c.id!==ci.id),S);const nc=mk(n.id);upgradeCard(nc);r.deck[i]=nc;out.push(`${B(cname(ci))} → ${B(cname(nc))}`)}
   said('bad','Your purse sinks. '+out.join(', ')+'.')}},
 dread:{n:'Carry his dread',s:'gain 2 Dread, choose 1 of 3 Rare cards',d:'Gain 2 Dread curses. Choose 1 of 3 Rare cards for your hero.',f:()=>{gainCurse('dread');gainCurse('dread');cardChoice(rollCards(3,'shop',{stream:S,forceR:'r'}),"The Ferryman's Dread Gift")}},
};
export const FERRY={get MINOR(){return MINOR},get HARD(){return HARD}}; // for tests
const opt=(o,kind)=>({n:o.n,s:o.s,d:o.d,ok:o.ok,why:o.ok?'Nothing in your deck for this':undefined,kind,f:o.f,fer:1});
export function ferryChoices(){const full=ferryFull();const ms=shuffle(Object.keys(MINOR).filter(k=>!MINOR[k].ok||MINOR[k].ok()),S);
 const out=ms.slice(0,full?3:2).map(k=>({...opt(MINOR[k]),key:k}));
 if(full){const hs=Object.keys(HARD).filter(k=>!HARD[k].ok||HARD[k].ok());const k=pick(hs,S);out.push({...opt(HARD[k]),key:k,hard:1})}
 return out}
export function openFerryOffer(){const r=run();r.offer='open';const o=ferryChoices();r.ferryKeys=o.map(x=>x.key);
 const t=ferryFull()?'The Ferryman has left his lantern burning on the landing. "Every climber pays the water something," says his voice from the dark sea. "Choose what you carry up."'
  :'The Ferryman has left his lantern burning low on the landing. "You fell early last time," says his voice from the dark sea. "Take a little, and climb higher."';
 W.S={screen:'event',ev:{...FERRY_EV(),t,o},t:Date.now()};playSound('room');render()}
