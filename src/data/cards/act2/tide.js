// cards/act2/tide.js: later-act (Act 2 + Act 3) behaviour. Registered through N2() from kit2.js. See studio/design FULL-CARD-POOL.md.
// Style follows cards/act1/tide.js. Tide words: Soaked = 'weak', Exposed = 'vuln' on enemies; Drenched = 'drench'; Brittle = 'brittle'.
import {W} from '../../../core/state.js';
import {observeEvents,fire,mod} from '../../../core/bus.js';
import {alive,hit,gainBlock,bonusEnergy,passiveDraw,drawCards,tideShift,canSpend,spendTide,isJunk,sinkCard,addSt,heal,loseHpEnemy,drenchTrigger,log,callout,floatText} from '../../../engine/combat.js';
import {cname} from '../../../engine/cards.js';
import {ask,thisTurn} from '../kit.js';
import {N2} from './kit2.js';
const N=N2('tide');
const dirOpts=(n,go)=>{const d=W.cb.tideDir;return [{l:'⬆️ Surge '+n+(d<0?' (Tideturn)':''),f:()=>go(1)},{l:'⬇️ Recede '+n+(d>0?' (Tideturn)':''),f:()=>go(-1)}]};
const turnCap=(inst,key,max)=>{const t=W.cb.turn;if(inst[key+'T']!==t){inst[key+'T']=t;inst[key]=0}if(inst[key]>=max)return false;inst[key]++;return true};
const zapAll=n=>{if(n>0)alive().forEach(e=>{if(e.hp>0)hit(e,n,null,{raw:true})})};
// Debuffs on an enemy (rule: Soaked, Exposed, Brittle, Drenched, Bleed, Resonating).
const DEB=['weak','vuln','brittle','drench','bleed','reson'];
// ---- Tide event tracker for this turn: steps travelled and the kinds of event (Surge, Recede, drift, Tideturn, Crest, Undertow).
// A single global observer notes engine events on cb.tideTrk; reads from a past turn count as empty.
const trkW=cb=>{if(!cb.tideTrk||cb.tideTrk.turn!==cb.turn)cb.tideTrk={turn:cb.turn,steps:0,kinds:{}};return cb.tideTrk};
export const trk=()=>{const cb=W.cb;return cb&&cb.tideTrk&&cb.tideTrk.turn===cb.turn?cb.tideTrk:{steps:0,kinds:{}}};
if(!globalThis.__tideTrkOn){globalThis.__tideTrkOn=1;observeEvents((ev,ctx)=>{const cb=W.cb;if(!cb)return;
 if(ev==='tideChange'&&ctx.delta){const t=trkW(cb);t.steps+=Math.abs(ctx.delta);t.kinds[ctx.cause==='drift'?'drift':ctx.delta>0?'surge':'recede']=1}
 else if(ev==='tideTurn')trkW(cb).kinds.tideturn=1;else if(ev==='crest')trkW(cb).kinds.crest=1;else if(ev==='undertow')trkW(cb).kinds.undertow=1},{replay:true})}
// "Turn the arrow" that counts as a Tideturn for later cards (Tsunami).
function turnArrow(why){const cb=W.cb;if(!cb.tideDir){log('🧭 '+why+': the sea has no arrow yet');return}
 cb.tideDir=-cb.tideDir;cb.stat.tideturnsTurn++;cb.stat.tideturnsCombat++;log('🧭 '+why+': the Tide now drifts '+(cb.tideDir>0?'up':'down'));fire('tideTurn',{nThisTurn:cb.stat.tideturnsTurn,nThisCombat:cb.stat.tideturnsCombat,cause:'arrow'});drenchTrigger('turn')}
// Start-of-turn effect "after the draw and after the drift": runs on the last drift of the turn, or right after the draw when no drift will happen.
const postDrift=run=>({
 afterDraw(inst){const cb=W.cb;inst.pd=cb.turn;inst.dn=0;if(!(cb.turn>=2&&cb.tideDir&&!cb.holdDrift&&W.run.cls==='tide')){inst.pd=0;run(inst)}},
 drift(inst){const cb=W.cb;if(!cb||inst.pd!==cb.turn)return;inst.dn=(inst.dn||0)+1;if(inst.dn>=mod('driftCount',{},1)){inst.pd=0;run(inst)}}});
// ================= ACT 2 =================
N('deeppress',{e:'⚓',d:'Gain Guard equal to {10|12} minus the Tide. Low Tide: twice that.',p:f=>{let n=Math.max(0,f.v(10,12)-W.cb.tide);if(f.low)n*=2;if(n>0)f.blk(n);else log('⚓ Deep Pressure: the sea is too high')}});
N('eddynet',{e:'🕸️',d:'Move the Tide 1 against its arrow (a Tideturn). Then apply 1 Drenched to ALL for each Tideturn this turn (max {4|6}).',p:f=>{const cb=W.cb;
 if(cb.tideDir>0)f.recede(1);else f.surge(1);if(!W.cb)return;const n=Math.min(f.v(4,6),W.cb.stat.tideturnsTurn);if(n>0)alive().forEach(e=>addSt(e,'drench',n))}});
N('tidehaul',{e:'🪝',d:'Draw 1. Sink every Flotsam and Burden in your hand and draw 1 more for each (max 3 more).',p:f=>{const cb=W.cb;f.draw(1);if(!W.cb)return;
 const junk=cb.hand.filter(isJunk);junk.forEach(ci=>{const i=cb.hand.indexOf(ci);if(i>=0){cb.hand.splice(i,1);sinkCard(ci,'card')}});
 if(junk.length)log(`🪝 Tideline Haul: ${junk.length} junk Sunk`);if(junk.length)f.draw(Math.min(3,junk.length))}});
N('undercur',{e:'🌊',d:'Apply {2|3} Soaked to the target. Low Tide: also apply {2|3} Exposed to it. Recede 1.',p:f=>{const t=f.tg,n=f.v(2,3);if(t){f.weak(n,t);if(f.low)f.vuln(n,t)}f.recede(1)}});
N('searot',{e:'🦠',d:'Deal {5|7}. Apply {3|4} Brittle. Recede 1.',p:f=>{const t=f.tg;f.dmg(f.v(5,7));if(!W.cb)return;if(t&&t.hp>0)addSt(t,'brittle',f.v(3,4));f.recede(1)}});
N('brimpool',{e:'🫧',d:'Surge 2. Then draw 1 card for every 2 points the Tide is above 5 (max {2|3}).',p:f=>{f.surge(2);if(!W.cb)return;const n=Math.min(f.v(2,3),Math.floor((W.cb.tide-5)/2));if(n>0)f.draw(n);else log('🫧 Tension Pool: no draw')}});
N('highmark',{e:'📏',d:'Whenever the Tide drifts, deal {4|6} to ALL. A drift that causes a Crest or Undertow deals {8|12} instead (not {4|6} plus {8|12}).',power:{on:{
 tideChange(inst,ctx){if(ctx.cause==='drift')inst.snap=W.cb.stat.crests+W.cb.stat.undertows},
 drift(inst){const cb=W.cb;if(!cb)return;const broke=cb.stat.crests+cb.stat.undertows>(inst.snap==null?1e9:inst.snap);zapAll(broke?(inst.up?12:8):(inst.up?6:4))}}}});
N('spindriftveil',{e:'🌫️',d:'Whenever a Crest happens, apply 1 Exposed to ALL (max 2 times a turn).',power:{on:{crest(inst){if(!turnCap(inst,'sv',2))return;alive().forEach(e=>addSt(e,'vuln',1))}}}});
N('answerwave',{e:'🔔',d:'When an enemy Attack hits you, Surge 1 (max {2|3} a phase).',power:{on:{playerHit(inst){const cb=W.cb;if(!cb)return;if(inst.awT!==cb.turn){inst.awT=cb.turn;inst.aw=0}
 if(inst.aw>=(inst.up?3:2))return;inst.aw++;log('🔔 Answering Wave: Surge 1');tideShift(1,'power')}}}});
N('moonpull',{e:'🌙',d:'Set the Tide to 9 or 1 (choose). Sink.',p:f=>ask(f,'Moonpull: set the Tide',[{l:'⬆️ Set the Tide to 9',f:()=>f.setTide(9)},{l:'⬇️ Set the Tide to 1',f:()=>f.setTide(1)}])});
N('lowmark',{e:'📉',d:'At the start of your turn, after the drift, Recede 1 and gain {3|4} Guard.',power:{on:postDrift(inst=>{log('📉 Low Water Mark: Recede 1');tideShift(-1,'power');if(W.cb)gainBlock(inst.up?4:3)})}});
N('trench',{e:'🕳️',d:'While the Tide is at Low Tide, your Attacks deal {4|6} more (once per card).',power:{mod:{damageAdd(inst,ctx,v){const f=ctx.f;if(!f||f.echo||!f.low||!ctx.target)return v;
 const s=f.trenchSeen||(f.trenchSeen=new Set());if(s.has(ctx.target))return v;s.add(ctx.target);return v+(inst.up?6:4)}}}});
N('seachange',{e:'🔁',d:'Set the Tide to 10 minus the Tide. Draw 2.',p:f=>{const t=W.cb.tide,to=10-t;if(to!==t&&to>=1&&to<=9)f.setTide(to);else log('🔁 Sea Change: the sea stays');if(W.cb)f.draw(2)}});
N('brinereckon',{e:'🧮',d:'Deal {3|4} for each Drenched on the target (max 8 counted), then halve its Drenched (rounded down).',p:f=>{const t=f.tg;if(!t)return;const dr=t.st.drench||0;
 if(dr)f.dmg(f.v(3,4)*Math.min(8,dr));if(!W.cb)return;if(dr){const h=Math.floor(dr/2);if(h)t.st.drench=h;else delete t.st.drench;floatText(t.uid,'💧'+h,'drench')}}});
N('wrackline',{e:'🪢',d:'Whenever an Undertow carries Flotsam or Burdens away from your hand, deal {4|5} to ALL for each (max {12|15} per Undertow).',power:{on:{undertow(inst,ctx){
 if(!ctx.junk)return;zapAll(Math.min(inst.up?15:12,ctx.junk*(inst.up?5:4)))}}}});
N('siphon',{e:'🚰',req:f=>canSpend(f.u?2:3),d:'Spend {3|2} Tide. Gain 2 Energy. Sink. (Energy shares the Tide Energy limit of 2 a turn.)',p:f=>{
 spendTide(f.v(3,2));if(!W.cb)return;bonusEnergy(2,'tide')}});
// Stored Wave: engine Bank (mod bankCrest). Engine max is 3 stored, the card says 2 (ENGINE-NEEDS).
N('bankcrest',{e:'🏦',d:'Crests are stored, not fired (max 2). Tap the meter: fire them all.',power:{mod:{bankCrest(){return true}}}});
N('brinewheel',{e:'☸️',d:'Whenever a Tideturn happens, the enemy with the most Drenched loses HP equal to its Drenched (max 3 a turn).',power:{on:{tideTurn(inst){
 let best=null;alive().forEach(e=>{if((e.st.drench||0)>(best?best.st.drench:0))best=e});if(!best||!turnCap(inst,'bw',3))return;loseHpEnemy(best,best.st.drench,'drench')}}}});
N('sargassomat',{e:'🧶',d:'Each Flotsam and Burden in your hand adds 1 to your Crest damage to ALL and 2 to your Undertow Guard (max 6 counted).',power:{mod:{
 crest(inst,ctx,c){const n=Math.min(6,W.cb.hand.filter(isJunk).length);return n?{...c,dmg:c.dmg+n}:c},
 undertow(inst,ctx,u){const n=Math.min(6,W.cb.hand.filter(isJunk).length);return n?{...u,guard:u.guard+2*n}:u}}}});
N('sluicerelease',{e:'🚪',d:'Lose all your Guard. Surge 1 for each {4|3} Guard lost (max 4).',p:f=>{const cb=W.cb,g=cb.p.block;const n=Math.min(4,Math.floor(g/f.v(4,3)));cb.p.block=0;
 if(g)floatText('p','-'+g+'🛡','');if(n)f.surge(n);else log('🚪 Sluice Release: no Surge')}});
// ================= ACT 3 =================
N('cloudburst',{e:'⛈️',d:'Deal {5|7} to ALL. Surge 2 or Recede 2 (choose).',p:f=>{f.all(f.v(5,7));if(!W.cb||!alive().length)return;ask(f,'Cloudburst: move the Tide 2',dirOpts(2,dir=>dir>0?f.surge(2):f.recede(2)))}});
N('coldfront',{e:'🧊',d:'Gain {6|8} Guard. Apply 1 Soaked to ALL. Recede 1.',p:f=>{f.blk(f.v(6,8));alive().forEach(e=>f.weak(1,e));if(W.cb)f.recede(1)}});
N('slackstrike',{e:'🗡️',d:'Deal {6|8}. If the Tide has not moved this turn (no Surge, Recede, Set or drift), deal {16|18} instead.',p:f=>{const still=trk().steps===0;f.dmg(still?f.v(16,18):f.v(6,8))}});
N('gathercurrent',{e:'🌀',d:'Draw 1 for every {3|2} steps the Tide moved this turn (max 3).',p:f=>{const n=Math.min(3,Math.floor(trk().steps/f.v(3,2)));if(n)f.draw(n);else log('🌀 Gathered Current: too still')}});
N('tidemercy',{e:'💗',d:'Whenever an Undertow happens, heal {2|3} HP (max {10|12} HP per fight).',power:{on:{undertow(inst){const mx=inst.up?12:10,per=inst.up?3:2;const n=Math.min(per,mx-(inst.healed||0));if(n<=0)return;
 inst.healed=(inst.healed||0)+n;heal(n)}}}});
N('tidesieve',{e:'🧺',d:'At the start of your turn, after you draw, Sink one Flotsam or Burden of your choice from your hand: gain {4|5} Guard and Surge 1.',power:{on:postDrift(inst=>{
 const cb=W.cb;const junk=cb.hand.filter(isJunk);if(!junk.length)return;const seen=new Set(),opts=[];
 junk.forEach(ci=>{if(seen.has(ci.id))return;seen.add(ci.id);opts.push({l:'🧺 Sink '+cname(ci),f:()=>{const c=W.cb;const i=c.hand.indexOf(ci);if(i<0)return;c.hand.splice(i,1);sinkCard(ci,'card');gainBlock(inst.up?5:4);tideShift(1,'power')}})});
 ask({ci:null,echo:false},'Tideline Sieve: Sink one',opts)})}});
N('saltwound',{e:'🧂',d:'Deal {5|6} for each different debuff on the target (max 4).',p:f=>{const t=f.tg;if(!t)return;const n=Math.min(4,DEB.filter(k=>t.st[k]>0).length);if(n)f.dmg(f.v(5,6)*n);else log('🧂 Salt in the Wound: no debuffs')}});
N('brokenwater',{e:'💢',d:'Whenever the second break of a turn happens, gain 1 Might (max {3|4} for the fight).',power:{on:{break(inst,ctx){if(ctx.n!==2)return;if((inst.got||0)>=(inst.up?4:3))return;inst.got=(inst.got||0)+1;addSt(W.cb.p,'str',1);log('💢 Broken Water: +1 Might')}}}});
N('confluence',{e:'🔱',d:'Deal {4|5} for each different kind of Tide event this turn (Surge, Recede, drift, Tideturn, Crest, Undertow; max 5 counted).',p:f=>{const n=Math.min(5,Object.keys(trk().kinds).length);if(n)f.dmg(f.v(4,5)*n);else log('🔱 Confluence: the sea is quiet')}});
// Strong Current: a Surge/Recede on a card (cause 'card') is followed by a 2-step move the same way, from the tideChange hook (does not stack).
N('strongcurrent',{e:'🌊',d:'This turn, each Surge and Recede effect on your cards moves the Tide 2 further (does not stack). Draw {1|2}.',p:f=>{const cb=W.cb;
 if(cb.strongT!==cb.turn){cb.strongT=cb.turn;let pend=0;thisTurn({id:'strongcurrent',on:{
  surge(inst,ctx){if(ctx.cause==='card')pend=1},recede(inst,ctx){if(ctx.cause==='card')pend=-1},
  tideChange(inst,ctx){if(ctx.cause==='card'&&pend){const d=pend;pend=0;tideShift(d*2,'strongcur')}}}})}
 f.draw(f.v(1,2))}});
N('ballastchain',{e:'⛓️',d:'Whenever you Spend Tide, gain 1 Guard for each Tide spent (max {8|12} a turn).',power:{on:{tideChange(inst,ctx){if(ctx.cause!=='spend'||ctx.delta>=0)return;const cb=W.cb;
 if(inst.bcT!==cb.turn){inst.bcT=cb.turn;inst.bc=0}const n=Math.min(-ctx.delta,(inst.up?12:8)-inst.bc);if(n<=0)return;inst.bc+=n;gainBlock(n)}}}});
N('perigee',{e:'🌕',d:'A Crest no longer reverses the arrow: after a Crest the sea rests at 5 with the arrow pointing up.',power:{on:{crest(){if(W.cb)W.cb.tideDir=1}}}});
N('tsunami',{e:'🌊',d:'Deal {8|12} to ALL, +4 for each Tideturn this turn (max 5). Turn the arrow.',p:f=>{const n=Math.min(5,W.cb.stat.tideturnsTurn);f.all(f.v(8,12)+4*n);if(W.cb)turnArrow('Tsunami')}});
// Rip Current: the end-of-turn arrow choice needs a mode before the enemy phase (ENGINE-NEEDS); until then the arrow is aimed at the nearer end of the meter.
N('ripcurrent',{e:'🌪️',d:'At the end of your turn, choose the arrow\'s direction. At the start of your turn the Tide drifts twice.',power:{
 on:{turnEnd(){const cb=W.cb;if(!cb.tideDir)return;const d=cb.tide>=5?1:-1;if(d!==cb.tideDir){cb.tideDir=d;log('🌪️ Rip Current: the arrow points '+(d>0?'up':'down'))}}},
 mod:{driftCount(inst,ctx,v){return v+1}}}});
N('heldmoon',{e:'🌑',d:'At the start of your turn, before the drift, if the Tide is at 9 or 1: gain 1 Energy and draw 1. (Energy shares the Tide Energy limit.)',power:{on:{afterDraw(){
 const t=W.cb.tide;if(t!==9&&t!==1)return;bonusEnergy(1,'tide');passiveDraw(1,'tide');callout('HELD MOON','crest')}}}});
N('saltmemory',{e:'🧂',d:'After each Undertow, your Crests this fight deal 2 more (max +10). After each Crest, your Undertows give 2 more Guard (max +10).',power:{
 on:{undertow(inst){inst.cb=Math.min(10,(inst.cb||0)+2)},crest(inst){inst.ub=Math.min(10,(inst.ub||0)+2)}},
 mod:{crest(inst,ctx,c){return inst.cb?{...c,dmg:c.dmg+inst.cb}:c},undertow(inst,ctx,u){return inst.ub?{...u,guard:u.guard+inst.ub}:u}}}});
N('breachwall',{e:'🧱',d:'Whenever an Undertow gives you Guard, deal damage to ALL equal to half that Guard (max {15|20}, once per Undertow).',power:{on:{undertow(inst,ctx){
 zapAll(Math.min(inst.up?20:15,Math.floor((ctx.guard||0)/2)))}}}});
N('waveonwave',{e:'🌊',d:'Your next Crest this turn also applies 2 Drenched to ALL and draws {2|3}. Surge 2. Sink.',p:f=>{const n=f.v(2,3);
 thisTurn({id:'waveonwave',on:{crest(inst){if(inst.dead)return;inst.dead=true;alive().forEach(e=>addSt(e,'drench',2));if(W.cb)drawCards(n)}}});f.surge(2)}});
N('chaintides',{e:'⛓️',d:'Rolling Break: your third and later breaks in a turn also count x1.5 (not more).',power:{mod:{rollingAll(){return true}}}});
// ENGINE-NEEDS:
// - lowmark, tidesieve: no 'afterDrift' event; postDrift() above emulates it (last 'drift' event, or afterDraw when no drift will happen). A real event would be exact.
// - bankcrest (Stored Wave): engine caps stored Crests at 3 (cb.banks<3 in checkTide); the card says max 2. Also engine holds the sea at 10 while stored; the card resets it to 5 with the arrow flipped.
// - ripcurrent: "choose the arrow's direction" at end of turn needs a choice mode before the enemy phase; the arrow is auto-aimed at the nearer end instead.
// - strongcurrent: no modifier on Surge/Recede amounts; emulated by a second tideShift from the tideChange hook (a first move that Crests means the extra 2 is applied after the reset to 5).
// - trench: Trench Dweller keys "once per card" per target on f (AoE Attacks add 4 to each enemy hit once).
// - gathercurrent, confluence, slackstrike: no per-turn Tide-event record in the engine; tracked here by a global observer (cb.tideTrk).
// - tsunami: Turn the arrow notes a Tideturn (stat counters + tideTurn event + Drenched tick) by hand.
// - eddynet (no arrow): moves up 1, matching the rules note.
