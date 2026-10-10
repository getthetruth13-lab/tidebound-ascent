// data/cards/tidecaller-pool.js — Tidecaller Phase 2 pool (56 cards). Archetypes: Crestbreaker (CR: ride the Tide up into
// Crests), Deepwater (UT: pull it down into Undertows), Tideturn (TT: reverse the arrow for value). v2.1 numbers from
// data-v2.json (High 6+, Low 4−, Crest 12, Undertow 12 + draw 1, Drift 1). Feedback: the engine's CREST!/UNDERTOW! call-outs
// plus a call-out on every build-around payoff below.
import {W} from '../../core/state.js';
import {card} from './loader.js';
import {alive,randAlive,hit,gainBlock,gainEnergy,drawCards,tideShift,isLow,isHigh,addSt} from '../../engine/combat.js';
import {TI,ask,tideWatch,thisTurn,callout,log,floatText,zapAll,stacks} from './kit.js';
const T=(id,o)=>card('tide',id,o);
const st=()=>W.cb.stat;
const ttTurn=()=>W.cb.stat.tideturnsTurn;
// "Surge N or Recede N (choose)": the option that reverses the arrow is labelled as a Tideturn.
const dirOpts=(n,go)=>{const d=W.cb.tideDir;return [{l:'⬆️ Surge '+n+(d<0?' (Tideturn)':''),f:()=>go(1)},{l:'⬇️ Recede '+n+(d>0?' (Tideturn)':''),f:()=>go(-1)}]};
// ---------------- Common ----------------
T('whitecap',{e:'🌊',d:'Deal {8|11}. Surge 2. If this causes a Crest, draw 2.',p:f=>{f.dmg(f.v(8,11));if(tideWatch(()=>f.surge(2)).crest){f.draw(2);log('🌊 Whitecap: Crest! draw 2')}}});
T('foamwall',{e:'🫧',d:'Choose: gain {9|12} Guard; or gain {4|6} Guard and Surge 3.',p:f=>ask(f,'Foam Wall',[{l:'Gain '+f.v(9,12)+' Guard',f:()=>f.blk(f.v(9,12))},{l:'Gain '+f.v(4,6)+' Guard; Surge 3',f:()=>{f.blk(f.v(4,6));f.surge(3)}}])});
T('sounding',{e:'📏',d:'Gain {5|8} Guard. Recede 2. If now at Low Tide, draw 1.',p:f=>{f.blk(f.v(5,8));if(f.recede(2)<=TI.low)f.draw(1)}});
T('kelpsnare',{e:'🌿',d:'Deal {5|7}. Apply {1|2} Exposed. Recede 1.',fx:[['dmg',5,7],['vuln',1,2],['recede',1]]});
T('moonward',{e:'🌗',d:'Surge {1|2} or Recede {1|2} (choose). If this causes a Tideturn, draw 1.',p:f=>{const n=f.v(1,2);
 ask(f,'Moonward: move the Tide '+n,dirOpts(n,dir=>{if(tideWatch(()=>dir>0?f.surge(n):f.recede(n)).tideturn){f.draw(1);log('🌗 Moonward: Tideturn, draw 1')}}))}});
T('brinelash',{e:'🪢',d:'Deal {9|12}. Recede 2.',fx:[['dmg',9,12],['recede',2]]});
T('risingswell',{e:'📈',d:'Deal {14|18}. Surge 2.',fx:[['dmg',14,18],['surge',2]]});
T('tidepool',{e:'🦀',d:'Gain {8|11} Guard. If a Tideturn happened this turn, gain {3|4} more.',p:f=>f.blk(f.v(8,11)+(ttTurn()?f.v(3,4):0))});
T('countercur',{e:'↩️',d:'Deal {6|8}. If a Tideturn happened this turn, deal {6|8} again. Recede 1.',p:f=>{f.dmg(f.v(6,8),ttTurn()?2:1);f.recede(1)}});
T('spindrift',{e:'💨',d:'Deal {3|5}. Surge 1.',fx:[['dmg',3,5],['surge',1]]});
T('sandbar',{e:'🏝️',d:'Gain {5|7} Guard. <b>Low Tide:</b> gain {5|7} more. Surge 1.',p:f=>{f.blk(f.v(5,7)*(f.low?2:1));f.surge(1)}});
T('groundswell',{e:'🌋',d:'Deal {5|7} to ALL. <b>High Tide:</b> apply 1 Exposed to ALL. Recede 1.',p:f=>{f.all(f.v(5,7));if(f.high)alive().forEach(e=>f.vuln(1,e));f.recede(1)}});
T('bailing',{e:'🪣',d:'Gain {3|6} Guard. Recede 3. Draw 1.',fx:[['block',3,6],['recede',3],['draw',1]]});
T('waverider',{e:'🏄',d:'Deal {7|9}. Surge 1. If now at High Tide, gain {4|5} Guard.',p:f=>{f.dmg(f.v(7,9));if(f.surge(1)>=TI.high)f.blk(f.v(4,5))}});
T('undergrip',{e:'🦑',d:'Deal {6|8}. <b>Low Tide:</b> apply 2 Soaked. Recede 1.',p:f=>{f.dmg(f.v(6,8));if(f.low)f.weak(2);f.recede(1)}});
T('readwater',{e:'👁️',d:'<b>High Tide:</b> draw 2. <b>Low Tide:</b> gain {6|9} Guard. Otherwise: Surge or Recede 2 (choose).',p:f=>{
 if(f.high)f.draw(2);else if(f.low)f.blk(f.v(6,9));else ask(f,'Read the Water: move the Tide 2',dirOpts(2,dir=>dir>0?f.surge(2):f.recede(2)))}});
T('breakwater',{e:'🧱',d:'Gain {13|17} Guard. Recede 2.',fx:[['block',13,17],['recede',2]]});
T('saltvolley',{e:'🧂',d:'Deal {3|4} to a random enemy 3 times. Surge 1.',p:f=>{for(let i=0;i<3;i++){const t=randAlive();if(!t)break;hit(t,f.num(f.v(3,4)),f)}f.surge(1)}});
T('coastward',{e:'🏰',d:'Gain {6|8} Guard. Whenever a Tideturn happens this turn, gain {2|3} Guard.',p:f=>{f.blk(f.v(6,8));const n=f.v(2,3);
 thisTurn({id:'coastward',on:{tideTurn(){gainBlock(n,{fromCard:true});floatText('p','🏰 Coastward','b')}}})}});
T('hammer',{e:'🔨',d:'Deal {12|15}. <b>High Tide:</b> deal {18|22} instead. Recede 3.',p:f=>{f.dmg(f.high?f.v(18,22):f.v(12,15));f.recede(3)}});
T('ebbspear',{e:'🔱',d:'Deal {10|14}. <b>Low Tide:</b> also draw 2. Surge 3.',p:f=>{f.dmg(f.v(10,14));if(f.low)f.draw(2);f.surge(3)}});
T('surfline',{e:'〰️',d:'Gain {4|7} Guard. Surge 2.',fx:[['block',4,7],['surge',2]]});
T('drift',{e:'🍃',d:'Recede 2. Next turn, draw 1 extra card.',p:f=>{f.recede(2);W.cb.nextDraw++;log('🍃 Drift: +1 card next turn')}});
T('swash',{e:'🌀',d:'Deal {4|6} twice. Surge 1, then Recede 1 (a Tideturn).',p:f=>{f.dmg(f.v(4,6),2);f.surge(1);f.recede(1)}});
T('shelltoss',{e:'🐚',d:'Deal {4|6}. Recede 1.',fx:[['dmg',4,6],['recede',1]]});
T('floodgate',{e:'🚪',d:'Gain {5|8} Guard. Surge 1 for each Attack you played this turn (max 3).',p:f=>{f.blk(f.v(5,8));const n=Math.min(3,st().attacksTurn);if(n)f.surge(n);else log('🚪 Floodgate: no Attacks yet')}});
// ---------------- Uncommon ----------------
T('risingwater',{e:'⤴️',d:'At the start of your turn, Surge 1.',power:{on:{turnStart(inst){log('⤴️ Rising Water: Surge '+stacks(inst));tideShift(stacks(inst),'power')}}}});
T('lowmark',{e:'⤵️',d:'At the start of your turn, Recede 1 and gain {3|4} Guard.',power:{on:{turnStart(inst){const n=stacks(inst);tideShift(-n,'power');gainBlock((inst.up?4:3)*n,{fromCard:true})}}}});
T('turningpoint',{e:'🔄',d:'Whenever a Tideturn happens, deal {3|4} to a random enemy (max 6 times per turn).',power:{on:{tideTurn(inst){const c=W.cb;if(inst.tpT!==c.turn){inst.tpT=c.turn;inst.tpN=0}
 if(inst.tpN>=6)return;inst.tpN++;const t=randAlive();if(t){hit(t,(inst.up?4:3)*stacks(inst),null,{raw:true});floatText(t.uid,'🔄','')}}}}});
T('ebbflow',{e:'♾️',d:'Whenever a Tideturn happens, gain 3 Guard.',power:{on:{tideTurn(inst){gainBlock(3*stacks(inst),{fromCard:true})}}}});
T('crosscur',{e:'✖️',d:'Deal 5, +{4|6} for each Tideturn this turn.',p:f=>f.dmg(5+f.v(4,6)*ttTurn())});
T('stormsurge',{e:'⛈️',d:'Deal {8|11} to ALL. Surge 3.',fx:[['all',8,11],['surge',3]]});
T('deeppress',{e:'🤿',d:'Gain 2 Guard for each point the Tide is below 10.{| Also gain 4 Guard.}',p:f=>f.blk(2*(10-W.cb.tide)+(f.u?4:0))});
T('crestrider',{e:'🏄‍♂️',d:'Surge {4|5}. If this causes a Crest, gain 1 Energy.',p:f=>{if(tideWatch(()=>f.surge(f.v(4,5))).crest){f.gainEnergy(1);callout('CREST RIDER +1⚡','crest')}}});
T('abyssdraw',{e:'🕳️',d:'Recede 4. If this causes an Undertow, draw 2 more.',p:f=>{if(tideWatch(()=>f.recede(4)).undertow){f.draw(2);callout('ABYSS: draw 2','undertow')}}});
T('springflood',{e:'🌧️',d:'Deal {2|3}× the Tide. Surge 1.',p:f=>{f.dmg(f.v(2,3)*W.cb.tide);f.surge(1)}});
T('pressdrop',{e:'📉',d:'Deal {2|3}× (10 − Tide). Recede 1.',p:f=>{f.dmg(f.v(2,3)*(10-W.cb.tide));f.recede(1)}});
T('seesaw',{e:'⚖️',d:'Surge 3, then Recede 3 (a Tideturn). Draw {1|2}.',p:f=>{f.surge(3);f.recede(3);f.draw(f.v(1,2))}});
T('mooring',{e:'⚓',moor:1,d:'Gain {8|11} Guard. Moor.',fx:[['block',8,11]]});
T('undertowmaw',{e:'🦈',d:'Deal {14|18}. <b>Low Tide:</b> apply 2 Exposed. Recede 2.',p:f=>{f.dmg(f.v(14,18));if(f.low)f.vuln(2);f.recede(2)}});
T('roguewave',{e:'🌊',d:'Deal {20|26}. Surge 4. Sink.',fx:[['dmg',20,26],['surge',4]]});
T('neapcur',{e:'🌓',d:'If the Tide is 4–6: draw 2 and gain 1 Energy. Otherwise move the Tide 2 toward 5.',p:f=>{const t=W.cb.tide;
 if(t>=4&&t<=6){f.draw(2);f.gainEnergy(1)}else if(t<4)f.surge(Math.min(2,5-t));else f.recede(Math.min(2,t-5))}});
T('wake',{e:'🚤',d:'Deal {3|4} for each Tideturn this combat (max 8).',p:f=>{const n=Math.min(8,st().tideturnsCombat);if(n)f.dmg(f.v(3,4)*n);else log('🚤 Wake: no Tideturns yet')}});
T('brineward',{e:'🛡️',d:'Gain {5|7} Guard, +5 for each Undertow this combat.',p:f=>f.blk(f.v(5,7)+5*st().undertows)});
T('foamburst',{e:'💥',d:'Deal {4|6} to ALL, +3 for each Crest this combat.',p:f=>f.all(f.v(4,6)+3*st().crests)});
T('pivot',{e:'🔁',d:'If your last Tide change was a Surge, Recede {2|3}. Otherwise Surge {2|3}. Draw 1.',p:f=>{const n=f.v(2,3);if(W.cb.stat.lastTideDir>0)f.recede(n);else f.surge(n);f.draw(1)}});
T('salttears',{e:'😢',d:'Apply {1|2} Soaked and {1|2} Exposed to ALL. Surge 1, then Recede 1 (a Tideturn).',p:f=>{const n=f.v(1,2);alive().forEach(e=>{f.weak(n,e);f.vuln(n,e)});f.surge(1);f.recede(1)}});
// ---------------- Rare ----------------
T('perigee',{e:'🌕',d:'After a Crest, the Tide resets to 7 instead of 5.',power:{mod:{crest(inst,ctx,c){return {...c,resetTo:7}}}}});
T('abyssalcalm',{e:'🌑',d:'After an Undertow, the Tide resets to 3 instead of 5.',power:{mod:{undertow(inst,ctx,u){return {...u,resetTo:3}}}}});
T('moonrhythm',{e:'🌙',d:'The first Tideturn each turn gives 1 Energy.{| Also draw 1.}',power:{on:{tideTurn(inst,ctx){if(ctx.nThisTurn!==1)return;gainEnergy(stacks(inst));if(inst.up)drawCards(1);callout('MOON RHYTHM +1⚡','crest')}}}});
T('kingtide',{e:'👑',d:'Set the Tide to 10 (Crest), then to 0 (Undertow). Sink.',p:f=>{callout('KING TIDE!','crest');f.setTide(10);if(W.cb)f.setTide(0)}});
T('maelheart',{e:'🌪️',d:'Deal {8|10}, plus one more hit for each Tideturn this turn.',p:f=>{const n=1+ttTurn();f.dmg(f.v(8,10),n);if(n>2)callout('MAELSTROM ×'+n,'crest')}});
T('trench',{e:'🕳️',d:'At Low Tide, your Attacks deal +{4|6}.',power:{mod:{damageAdd(inst,ctx,v){return ctx.attack&&W.cb&&isLow()?v+(inst.up?6:4)*stacks(inst):v}}}});
T('highmark',{e:'📏',d:'Whenever the Tide drifts, deal {4|6} to ALL. A drift that Crests or Undertows deals {8|12} instead.',power:{on:{
 crest(inst,ctx){if(ctx.cause==='drift')inst.dc=W.cb.turn},undertow(inst,ctx){if(ctx.cause==='drift')inst.dc=W.cb.turn},
 drift(inst){const big=inst.dc===W.cb.turn;const n=(big?(inst.up?12:8):(inst.up?6:4))*stacks(inst);callout('HIGH WATER '+n+' to ALL','crest');zapAll(n)}}}});
T('tidebreaker',{e:'🪓',d:'Deal {10|14}, +{10|12} for each Crest this combat.',p:f=>{const c=st().crests;f.dmg(f.v(10,14)+f.v(10,12)*c);if(c>=2)callout('TIDEBREAKER ×'+c+' Crests','crest')}});
T('seachange',{e:'🔃',d:'Set the Tide to 10 − Tide (a Tideturn). Draw 2.',p:f=>{const t=W.cb.tide;f.setTide(10-t);if(t!==5)callout('SEA CHANGE '+t+' → '+(10-t),'crest');f.draw(2)}});
