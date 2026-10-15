// data/cards/tidecaller.js — Tidecaller Phase 1 cards (behaviour). Names/costs/types/rarity/flavour come from data-v2.json via card().
// v2.1: High Tide 6+, Low Tide 4-, Crest 14 to ALL, Undertow 12 Guard + draw 1, Tide drifts 1 at the start of each turn.
import {W} from '../../core/state.js';
import {card} from './loader.js';
import {alive,log,setTide,addSt} from '../../engine/combat.js';
import {ask} from './kit.js';
const T=(id,o)=>card('tide',id,o);
T('splash',{e:'💦',rk:{max:5},d:'Deal {8|11|+}. Surge 1.',p:f=>{f.dmg(f.r(8,11));f.surge(1)}});
T('brace',{e:'🪨',rk:{max:5},d:'Gain {6|9|+} Guard. Recede 1.',p:f=>{f.blk(f.r(6,9));f.recede(1)}});
T('riptide',{e:'🌀',d:'Deal {4|6}. <b>Low Tide:</b> deal {8|11} instead. Surge 2.',p:f=>{f.dmg(f.low?f.v(8,11):f.v(4,6));f.surge(2)}});
T('still',{e:'🪷',d:'Gain {4|6} Guard. <b>High Tide:</b> gain {9|12} instead. Recede 2.',p:f=>{f.blk(f.high?f.v(9,12):f.v(4,6));f.recede(2)}});
T('swell',{e:'🌊',d:'Choose: Surge {2|3}; or draw {1|2}.',p:f=>ask(f,'Swell',[{l:'Surge '+f.v(2,3),f:()=>f.surge(f.v(2,3))},{l:'Draw '+f.v(1,2),f:()=>f.draw(f.v(1,2))}])});
T('ebb',{e:'🏖️',d:'Choose: gain {5|7} Guard; or Recede 3.',p:f=>ask(f,'Ebb',[{l:'Gain '+f.v(5,7)+' Guard',f:()=>f.blk(f.v(5,7))},{l:'Recede 3',f:()=>f.recede(3)}])});
T('breaker',{e:'🌊',d:'Deal {7|9}. <b>High Tide:</b> deal {7|9} again. Recede 1.',p:f=>{f.dmg(f.v(7,9),f.high?2:1);f.recede(1)}});
T('shoal',{e:'🐚',d:'Gain {7|9} Guard. <b>Low Tide:</b> draw 1. Surge 1.',p:f=>{f.blk(f.v(7,9));if(f.low)f.draw(1);f.surge(1)}});
T('spray',{e:'💧',d:'Deal {4|5} to ALL. Surge 1.',fx:[['all',4,5],['surge',1]]});
T('undercur',{e:'🫧',tg:1,d:'Apply {2|3} Soaked. <b>Low Tide:</b> also apply 2 Exposed. Surge 1.',p:f=>{f.weak(f.v(2,3));if(f.low)f.vuln(2);f.surge(1)}});
T('lash',{e:'🐋',d:'Deal {12|15}. Surge 3.',fx:[['dmg',12,15],['surge',3]]});
// Cohesion pass: also draws if the Recede caused an Undertow (which resets the Tide to 5).
T('sinking',{e:'⚓',d:'Deal {5|8}. Recede 3. If this causes an Undertow or ends at Low Tide, draw 2.',p:f=>{f.dmg(f.v(5,8));const u=W.cb.stat.undertows;f.recede(3);if(W.cb&&(W.cb.stat.undertows>u||f.lowNow()))f.draw(2)}});
T('moonpull',{e:'🌙',d:'Set the Tide to 9 or 1 (choose). Sink.',p:f=>{f.choose('Moonpull: set the Tide',[{l:'🌕 Tide 9',tile:'choice-moonpull',sum:'Set the Tide to 9 (High).',f:()=>{log('🌕 Moonpull: Tide 9');setTide(9,'card')}},{l:'🌑 Tide 1',tile:'choice-tide-low',sum:'Set the Tide to 1 (Low).',f:()=>{log('🌑 Moonpull: Tide 1');setTide(1,'card')}}])}});
T('pressure',{e:'⛈️',d:'Gain {12|15} Guard. <b>High Tide:</b> gain 1 Might. Recede 2.',p:f=>{f.blk(f.v(12,15));if(f.high){addSt(W.cb.p,'str',1);log('💪 +1 Might')}f.recede(2)}});
// Cohesion pass: Slack Water is now a choice (it used to freeze the Tide, which killed combos).
T('slack',{e:'🛶',d:'Surge 2 or Recede 2 (choose). Draw {2|3}.',p:f=>{f.draw(f.v(2,3));f.choose('Slack Water',[{l:'⬆️ Surge 2',tile:'choice-surge',sum:'Raise the Tide by 2.',f:()=>f.surge(2)},{l:'⬇️ Recede 2',tile:'choice-recede',sum:'Lower the Tide by 2.',f:()=>f.recede(2)}])}});
T('whirl',{e:'🌪️',d:'Deal {3|4} to ALL, 3 times. Surge 1 per hit.',p:f=>{for(let i=0;i<3;i++){if(!alive().length)break;f.all(f.v(3,4));f.surge(1)}}});
T('spring',{e:'🌕',d:'Crest deals 24 instead of 14.',power:{mod:{crest(inst,ctx,c){return {...c,dmg:24}}}}}); // v2.2: payoff kept at 24 (Crest base 14)
T('neap',{e:'🌑',d:'Undertow grants 24 Guard and draws 2.',power:{mod:{undertow(inst,ctx,u){return {...u,guard:u.guard*2,draw:Math.max(u.draw,2)}}}}});
T('tsunami',{e:'🌊',d:'Deal {4|5}× the Tide to ALL. Set the Tide to 0.',p:f=>{f.all(f.v(4,5)*W.cb.tide);f.setTide(0)}});
