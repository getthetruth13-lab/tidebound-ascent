// data/cards/act1/tide.js — NEW Act 1 Tidecaller pool behaviour (cards-act1, FULL-CARD-POOL.md 1.A.1). Owned by ONE worker; see CARDS_ACT1_HANDOFF.md.
// NEW ids: card('tide',id,{...}); REWORK ids: redef('tide',id,{...}). SAME cards stay in cards/tidecaller*.js (tests only).
// Vigils follow rule 4 (a 2nd copy adds nothing) and rule 25 (caps per instance). Breaks: rule 29.
import {W} from '../../../core/state.js';
import {CARDS} from '../../../core/registry.js';
import {card,redef} from '../loader.js';
import {alive,randAlive,hit,gainBlock,gainEnergy,bonusEnergy,passiveDraw,drawCards,tideShift,canSpend,spendTide,isJunk,sinkCard,addSt,log,callout,floatText} from '../../../engine/combat.js';
import {ask,tideWatch,thisTurn} from '../kit.js';
const N=(id,o)=>card('tide',id,o),R=(id,o)=>redef('tide',id,o);
// "Surge N or Recede N (choose)": the option against the arrow is labelled a Tideturn.
const dirOpts=(n,go)=>{const d=W.cb.tideDir;return [{l:'⬆️ Surge '+n+(d<0?' (Tideturn)':''),f:()=>go(1)},{l:'⬇️ Recede '+n+(d>0?' (Tideturn)':''),f:()=>go(-1)}]};
const turnCap=(inst,key,max)=>{const t=W.cb.turn;if(inst[key+'T']!==t){inst[key+'T']=t;inst[key]=0}if(inst[key]>=max)return false;inst[key]++;return true};
// ---------------- Starter ----------------
N('drawback',{e:'🪣',rk:{max:5},d:'Spend up to 2 Tide. Draw 1 card for each Tide spent.{@1| Also gain [0|3|+] Guard.}',p:f=>{
 const n=spendTide(Math.min(2,W.cb.tide));if(!W.cb)return;if(n)f.draw(n);else log('🪣 Draw Back: no Tide to spend');if(f.u)f.blk(f.r(0,3))}});
R('riptide',{e:'🌀',rk:{max:5},d:'Deal {5|8|+}. Surge 2. <b>Low Tide:</b> also gain {5|7|+} Guard.',p:f=>{f.dmg(f.r(5,8));if(!W.cb)return;f.surge(2);if(W.cb&&f.low)f.blk(f.r(5,7))}});
R('still',{e:'🪷',rk:{max:5},d:'Gain {5|8|+} Guard. The Tide will not drift at the start of your next turn.',p:f=>{f.blk(f.r(5,8));W.cb.holdDrift=true;log('🪷 Still Water: the Tide holds next turn')}});
// ---------------- Common ----------------
R('swell',{e:'🌊',d:'Surge {3|4}. Sink.',p:f=>f.surge(f.v(3,4))});
R('sinking',{e:'⚓',d:'Deal {5|7}. Recede 3. If this causes an Undertow, deal {5|7} to ALL.',p:f=>{f.dmg(f.v(5,7));if(!W.cb)return;
 if(tideWatch(()=>f.recede(3)).undertow&&W.cb){callout('SINKING PULL','undertow');f.all(f.v(5,7))}}});
N('turnarrow',{e:'🧭',d:'Reverse the Tide\'s arrow. Draw 1.{| Also Surge 1 or Recede 1.} Sink.',p:f=>{const cb=W.cb;
 if(cb.tideDir){cb.tideDir=-cb.tideDir;log('🧭 Turn the Arrow: the Tide now drifts '+(cb.tideDir>0?'up':'down'))}else log('🧭 Turn the Arrow: the sea has no arrow yet');
 f.draw(1);if(f.u&&W.cb)ask(f,'Turn the Arrow: move the Tide 1',dirOpts(1,dir=>dir>0?f.surge(1):f.recede(1)))}});
N('castadrift',{e:'🛶',d:'Gain {4|6} Guard. Sink any junk in hand: +{3|4} Guard each, then Surge or Recede that much (max 3).',p:f=>{const cb=W.cb;
 const junk=cb.hand.filter(isJunk);junk.forEach(ci=>{const i=cb.hand.indexOf(ci);if(i>=0){cb.hand.splice(i,1);sinkCard(ci,'card')}});
 if(junk.length)log(`🛶 Cast Adrift: ${junk.length} junk Sunk`);f.blk(f.v(4,6)+f.v(3,4)*junk.length);
 const n=Math.min(3,junk.length);if(n&&W.cb)ask(f,'Cast Adrift: move the Tide '+n,dirOpts(n,dir=>dir>0?f.surge(n):f.recede(n)))}});
// Worklist says SAME, but the shipped UPGRADE numbers differ from the doc: re-registered with the doc's upgrade (base unchanged).
R('hammer',{e:'🔨',rk:{max:5},d:'Deal {12|15|+3,2,2,2}. <b>High Tide:</b> deal {18|21|+3,2,2,2} instead. Recede 3.',p:f=>{f.dmg(f.high?f.r(18,21,'3,2,2,2'):f.r(12,15,'3,2,2,2'));if(W.cb)f.recede(3)}});
R('coastward',{e:'🏰',d:'Gain {6|8} Guard. Whenever a Tideturn happens this turn, gain 2 Guard.',p:f=>{f.blk(f.v(6,8));
 thisTurn({id:'coastward',on:{tideTurn(){gainBlock(2,{fromCard:true});floatText('p','🏰 Coastal Ward','b')}}})}});
R('crosscur',{e:'✖️',d:'Deal {5|6}, +{4|5} for each Tideturn this turn.',p:f=>f.dmg(f.v(5,6)+f.v(4,5)*W.cb.stat.tideturnsTurn)});
R('foamwall',{e:'🫧',d:'Choose: gain {9|11} Guard; or gain {4|5} Guard and Surge 3.',p:f=>ask(f,'Foam Wall',[{l:'Gain '+f.v(9,11)+' Guard',f:()=>f.blk(f.v(9,11))},{l:'Gain '+f.v(4,5)+' Guard; Surge 3',f:()=>{f.blk(f.v(4,5));f.surge(3)}}])});
R('brinedrench',{e:'💦',d:'Deal 6. Apply {3|4} Drenched. Surge 1.',p:f=>{f.dmg(6);const t=f.tg;if(t)addSt(t,'drench',f.v(3,4));if(W.cb)f.surge(1)}});
R('readwater',{e:'👁️',d:'<b>High Tide:</b> draw {2|3}. <b>Low Tide:</b> gain {6|8} Guard. Otherwise: Surge or Recede 2 (choose).',p:f=>{
 if(f.high)f.draw(f.v(2,3));else if(f.low)f.blk(f.v(6,8));else ask(f,'Read the Water: move the Tide 2',dirOpts(2,dir=>dir>0?f.surge(2):f.recede(2)))}});
R('floodgate',{e:'🚪',d:'Gain {5|7} Guard. Surge 1 for each Attack you played this turn (max 3).',p:f=>{f.blk(f.v(5,7));const n=Math.min(3,W.cb.stat.attacksTurn);if(n)f.surge(n);else log('🚪 Flood Gate: no Attacks yet')}});
R('foamburst',{e:'💥',d:'Deal 4 to ALL, +{3|4} for each Crest this combat.',p:f=>f.all(4+f.v(3,4)*W.cb.stat.crests)});
R('brineward',{e:'🛡️',rk:{max:5},d:'Gain {5|8|+2} Guard, +5 for each Undertow this combat.',p:f=>f.blk(f.r(5,8,2)+5*W.cb.stat.undertows)});
// ---------------- Uncommon ----------------
R('turningpoint',{e:'🔄',d:'Whenever a Tideturn happens, deal {3|4} to a random enemy (max 6 times a turn).',power:{on:{tideTurn(inst){
 if(!turnCap(inst,'tp',6))return;const t=randAlive();if(t){hit(t,inst.up?4:3,null,{raw:true});floatText(t.uid,'🔄','')}}}}});
R('risingwater',{e:'⤴️',open:1,d:'Opening. At the start of your turn, Surge 1.',power:{on:{turnStart(){log('⤴️ Rising Water: Surge 1');tideShift(1,'power')}}}});
R('tithe',{e:'🧂',req:()=>canSpend(3),d:'Spend 3 Tide. Apply {2|3} Soaked to ALL. Draw 1. (Cannot be played at Tide below 3.)',p:f=>{
 spendTide(3);if(!W.cb)return;alive().forEach(e=>f.weak(f.v(2,3),e));f.draw(1)}});
N('heldbreath',{e:'🫁',d:'End your turn with the Tide at 9 or 1: it won\'t drift next turn, and this gains a Breath (max 3). Your next break spends them for +{5|8} each.',power:{
 on:{turnEnd(inst){const t=W.cb.tide;if(t!==9&&t!==1)return;W.cb.holdDrift=true;inst.breath=Math.min(3,(inst.breath||0)+1);log(`🫁 Held Breath: the Tide holds (${inst.breath} Breath)`);callout('BREATH ×'+inst.breath,'crest')},
  crest(inst){inst.breath=0},undertow(inst){inst.breath=0}},
 mod:{crest(inst,ctx,c){const b=inst.breath||0;return b?{...c,dmg:c.dmg+(inst.up?8:5)*b}:c},undertow(inst,ctx,u){const b=inst.breath||0;return b?{...u,guard:u.guard+(inst.up?8:5)*b}:u}}}});
N('springrush',{e:'🌧️',d:'Full Flame. Deal {5|6} to ALL for each Energy spent. Then Surge X.',p:f=>{const x=f.x||0;if(!x){log('🌧️ Spring Rush: no Energy spent');return}
 f.all(f.v(5,6)*x);if(W.cb)f.surge(x)}});
N('wreckerstide',{e:'⚓',d:'Whenever you Sink a Flotsam or Burden, your next Crest deals +{4|6} to ALL (max +{12|18}).',power:{
 on:{sink(inst,ctx){if(!ctx.card||!isJunk(ctx.card))return;const per=inst.up?6:4;inst.wb=Math.min(per*3,(inst.wb||0)+per);log(`⚓ Wrecker's Tide: next Crest +${inst.wb}`)},crest(inst){inst.wb=0}},
 mod:{crest(inst,ctx,c){return inst.wb?{...c,dmg:c.dmg+inst.wb}:c}}}});
// ---------------- Rare ----------------
R('spring',{e:'🌕',d:'Crest deals {18|20} instead of 14. After each Crest this fight, the base grows by 3 (max 30).',power:{
 on:{crest(inst){inst.grown=(inst.grown||0)+1}},
 mod:{crest(inst,ctx,c){const base=Math.min(30,(inst.up?20:18)+3*(inst.grown||0));return {...c,dmg:c.dmg+base-14}}}}});
// Tidebreaker: a one-shot modifier source is put LAST among the Vigils for the Surge, so the doubling applies after every base change.
R('tidebreaker',{e:'🪓',d:'Surge to 10. The Crest hits only this enemy, for double.',p:f=>{const cb=W.cb;const t=f.tg;const src={id:'tidebreaker',n:1,tb:t,up:f.u,tmp:1};
 cb.powers.push(src);try{callout('TIDEBREAKER','crest');f.surge(10-cb.tide)}finally{if(W.cb){const i=W.cb.powers.indexOf(src);if(i>=0)W.cb.powers.splice(i,1)}}},
 power:{mod:{crest(inst,ctx,c){return inst.tb&&inst.tb.hp>0?{...c,dmg:c.dmg*2,only:inst.tb}:c}}}});
R('abyssalcalm',{e:'🌑',d:'After an Undertow, the Tide rests at 3 instead of 5.',power:{mod:{undertow(inst,ctx,u){return {...u,resetTo:3}}}}});
R('neap',{e:'🌑',d:'Undertow grants 24 Guard and draws 2 instead of 12 and 1.',power:{mod:{undertow(inst,ctx,u){return {...u,guard:u.guard+12,draw:Math.max(u.draw,2)}}}}});
N('lanternbelow',{e:'🏮',d:'The first break each turn gives 1 Energy. The second break each turn also draws 1.',power:{on:{break(inst,ctx){
 if(ctx.n===1){if(bonusEnergy(1,'tide'))callout('LANTERN +1⚡','crest')}else if(ctx.n===2){if(passiveDraw(1,'tide'))log('🏮 Lantern Below: draw 1')}}}}});
// Maelstrom Heart: the Tideturn is noted before the move lands, so the extra step waits for that move's tideChange.
R('maelheart',{e:'🌪️',d:'Each Tideturn moves the sea 1 further in its new direction (max 2 a turn).',power:{on:{
 tideTurn(inst,ctx){if(ctx.cause==='maelheart'||!W.cb.tideDir)return;if(!turnCap(inst,'mh',2))return;inst.pend=-W.cb.tideDir},
 tideChange(inst){const d=inst.pend;if(!d)return;inst.pend=0;log('🌪️ Maelstrom Heart: the sea moves 1 further');tideShift(d,'maelheart')}}}});
