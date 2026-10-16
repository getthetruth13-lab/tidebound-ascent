// cards/act2/echo.js: later-act (Act 2 + Act 3) behaviour. Registered through N2() from kit2.js. See studio/design FULL-CARD-POOL.md.
// Echo Mage later-act pool (39 cards): FULL-CARD-POOL.md Part 2 table + 2.C rules notes + Part 9. Test: tests/act2/cards-echo.cjs.
import {W,R} from '../../../core/state.js';
import {CARDS} from '../../../core/registry.js';
import {mod,observeEvents,forCombat} from '../../../core/bus.js';
import {N2} from './kit2.js';
import {cname,canTemper,baseCost,isUp} from '../../../engine/cards.js';
import {alive,hit,gainBlock,bonusEnergy,passiveDraw,addCard,addSt,sinkCard,heal,endTurn,isJunk,markBonus,F} from '../../../engine/combat.js';
import {runCard} from '../../../engine/effects.js';
import {EC,ask,thisTurn,callout,log,floatText,zapAll} from '../kit.js';
const N=N2('echo');
// ---- shared helpers ----
const isNote=ci=>!!ci&&ci.id==='note';
const isJ=ci=>!!ci&&(isJunk(ci)||ci.id==='static');             // Flotsam, Burden (curses) and Static
// Per-turn counters on the combat (reset when the turn changes).
const turnCtr=k=>{const c=W.cb;const m=c._echoA2||(c._echoA2={});if(m.turn!==c.turn){for(const x in m)delete m[x];m.turn=c.turn}return m[k]||0};
const bump=(k,n=1)=>{turnCtr(k);W.cb._echoA2[k]=(W.cb._echoA2[k]||0)+n};
// Notes PLAYED (not created): total this fight and this turn. Counted by one permanent observer (replay-safe).
observeEvents((ev,ctx)=>{const c=W.cb;if(ev!=='cardPlayed'||!c||!ctx||!ctx.card||ctx.card.id!=='note'||(ctx.f&&ctx.f.echo))return;
 const n=c._ntA2||(c._ntA2={total:0,turn:0,t:0});if(n.turn!==c.turn){n.turn=c.turn;n.t=0}n.total++;n.t++},{replay:true});
const notesFight=()=>(W.cb&&W.cb._ntA2&&W.cb._ntA2.total)||0;
const notesTurn=()=>{const n=W.cb&&W.cb._ntA2;return n&&n.turn===W.cb.turn?n.t:0};
// Sink a card out of the hand.
const sinkHand=(ci,why)=>{const c=W.cb;const i=c.hand.indexOf(ci);if(i<0)return false;c.hand.splice(i,1);sinkCard(ci,why);return true};
const cardOpt=(ci,pre,fn)=>({l:pre+' '+cname(ci),card:{id:ci.id,up:ci.up},f:fn});
const echoDraw=(f,n)=>f.echo?passiveDraw(n,'echo'):f.draw(n);
const typeOf=ci=>{const d=CARDS[ci.id];return d?d.t:null};
// Remember which card is ringing right now (set from the engine's non-preview echoPlan call, once per tine).
const markRing=(ctx)=>{if(!ctx.preview&&W.cb)W.cb._ringCard=ctx.card};
const ringing=()=>{const c=W.cb;return !!c&&c.ending&&!!c._ringCard};
// Great Hall: the Echo cap reads as 5 while the Vigil is in play (EC.cap is shared engine data, so make it a getter once).
{const base=EC.cap;try{Object.defineProperty(EC,'cap',{configurable:true,enumerable:true,get(){return base+((W.cb&&W.cb.powers&&W.cb.powers.some(p=>p.id==='greathall'))?1:0)},set(){}})}catch(e){}}

// ================= Act 2 =================
N('faultline',{e:'🪨',d:'Deal {7|9}. <b>Resound:</b> apply {3|4} Brittle to the target.',p:f=>{f.dmg(f.v(7,9));if(!f.echo||!W.cb)return;const t=f.tg;if(t)addSt(t,'brittle',f.v(3,4))}});
N('damper',{e:'🔇',tg:1,d:'Choose an enemy. Gain {5|7} Guard. <b>Resound:</b> it loses {2|3} Might for this fight.',p:f=>{f.blk(f.v(5,7));if(!f.echo||!W.cb)return;const t=f.tg;if(t){addSt(t,'str',-f.v(2,3));floatText(t.uid,'🔇 −Might','')}}});
N('phaseshift',{e:'🌀',d:'Draw {2|3}. <b>Resound:</b> gain 1 Energy next turn.',p:f=>{echoDraw(f,f.v(2,3));if(f.echo&&W.cb)f.nextTurn(()=>{bonusEnergy(1,'echo')})}});
// Learning Bell: grows with every Note PLAYED this fight, whichever pile it sits in (counted from the fight's Note counter).
N('learnbell',{e:'🔔',d:'Deal {4|5}. Whenever you play a Note, this card gains {2|3} damage for the rest of the fight (in any pile).',p:f=>f.dmg(f.v(4,5)+f.v(2,3)*notesFight())});
N('clearpeal',{e:'🧹',d:'Gain {6|8} Guard. <b>Resound:</b> Sink a Flotsam or Burden from your hand (rings resolve before end-of-turn junk effects).',p:f=>{f.blk(f.v(6,8));if(!f.echo||!W.cb)return;
 const opts=W.cb.hand.filter(isJunk).map(ci=>cardOpt(ci,'Sink',()=>{if(W.cb&&sinkHand(ci,'peal'))log('🧹 Sweeping Peal: '+cname(ci)+' Sunk')}));
 if(opts.length)ask(f,'Sweeping Peal: Sink which?',opts)}});
N('hymndeep',{e:'🎶',d:'Apply {1|2} Exposed and {1|2} Soaked to ALL. <b>Resound:</b> apply {2|3} of each to ALL instead.',p:f=>{const n=f.echo?f.v(2,3):f.v(1,2);alive().forEach(e=>{addSt(e,'vuln',n);addSt(e,'weak',n)})}});
N('antiphon',{e:'🎼',cu:0,d:'Whenever you play a Note, gain 2 Guard (max 6 a turn).',power:{on:{cardPlayed(inst,ctx){if(!isNote(ctx.card))return;const g=Math.min(2,6-turnCtr('antiphon'));if(g<=0)return;bump('antiphon',g);gainBlock(g)}}}});
N('perfectpitch',{e:'🎯',d:'Your Notes deal {3|4} more damage.',power:{mod:{damageAdd(inst,ctx,v){const f=ctx.f;return f&&!f.echo&&isNote(f.ci)?v+(inst.up?4:3):v}}}});
N('transcribe',{e:'✍️',d:'Sink a card from your hand. Add {2|3} Notes to your hand. Faint.',p:f=>{const c=W.cb;const n=f.v(2,3);
 const notes=()=>{if(!W.cb)return;for(let i=0;i<n;i++)addCard('note','hand');floatText('p','🎵 +'+n+' Notes','')};
 const opts=c.hand.map(ci=>cardOpt(ci,'Sink',()=>{sinkHand(ci,'transcribe');notes()}));
 if(!opts.length)return notes();ask(f,'Transcribe: Sink which card?',opts)}});
N('twopart',{e:'🎶',cu:0,d:'At the end of your turn, if both an Attack and a Skill rang this turn, draw 1 extra card next turn (at most 1 extra card from this).',power:{on:{
 echo(inst,ctx){const c=W.cb;if(!c)return;if(inst.t!==c.turn){inst.t=c.turn;inst.a=0;inst.s=0}const ty=typeOf(ctx.card);if(ty==='A')inst.a=1;if(ty==='S')inst.s=1},
 turnEndInHand(inst){const c=W.cb;if(!c||inst.t!==c.turn||!inst.a||!inst.s||inst.done===c.turn)return;inst.done=c.turn;c.nextDraw=(c.nextDraw||0)+1;log('🎶 Two-Part Harmony: +1 card next turn')}}}});
// Temper: a card gains Sustain growth for this fight. Growth is applied by one combat listener (per-uid table on the combat).
const temperTable=()=>{const c=W.cb;if(!c._tsus){c._tsus={};forCombat({on:{echo(inst,ctx){const t=W.cb&&W.cb._tsus&&W.cb._tsus[ctx.card.uid];if(t)ctx.card.sus=(ctx.card.sus||0)+mod('sustain',{card:ctx.card},t.x)}}})}return c._tsus};
N('temper',{e:'🔥',cu:0,d:'Choose a card in your hand: it gains Sustain 2 for this fight (if it already has Sustain, it gains Sustain +1 more). Faint.',p:f=>{const c=W.cb;
 const ok=ci=>{const d=CARDS[ci.id];return !!d&&(d.t==='A'||d.t==='S')&&!d.faint&&!isNote(ci)&&d.cls!=='status'&&d.cls!=='curse'};
 const opts=c.hand.filter(ok).map(ci=>cardOpt(ci,'Temper',()=>{if(!W.cb)return;const t=temperTable();const cur=t[ci.uid]||(t[ci.uid]={x:0});const has=(CARDS[ci.id].sus||0)+cur.x>0;cur.x+=has?1:2;
  floatText('p','🔥 '+cname(ci)+' Sustain','');log('🔥 Temper: '+cname(ci)+' grows each ring')}));
 if(!opts.length){log('🔥 Temper: no card to temper');return}ask(f,'Temper: which card?',opts)}});
N('ringout',{e:'🔔',d:'Deal {2|3} for each point of Sustain bonus your cards have gained this fight (max 30).',p:f=>{const c=W.cb;let tot=0;for(const ci of [...c.hand,...c.draw,...c.disc,...c.exh])tot+=ci.sus||0;f.dmg(Math.min(30,f.v(2,3)*tot))}});
N('seekecho',{e:'🎯',cu:0,d:'Your Echoes that repeat an Attack hit the enemy with the lowest HP instead of the original target (an Echo that hits ALL is unchanged).',power:{mod:{echoPlan(inst,ctx,p){
 const d=CARDS[p.card.id];if(!d||d.t!=='A'||p.allTargets||/ALL|random enemy/.test(d.d))return p;const al=alive();if(al.length<2)return p;
 let low=al[0];for(const e of al)if(e.hp<low.hp)low=e;if(p.tgt&&p.tgt.hp>0&&p.tgt.hp===low.hp)low=p.tgt;return {...p,tgt:low}}}}});
N('castbronze',{e:'🛡️',d:'Gain {7|10} Guard. Gain 1 Poise. Sink.',p:f=>{f.blk(f.v(7,10));if(!W.cb)return;addSt(W.cb.p,'dex',1);floatText('p','+1 Poise','')}});
N('countertone',{e:'🔕',cu:0,d:'Whenever a Skill Echoes, apply 1 Brittle to ALL (max 2 a turn).',power:{on:{echo(inst,ctx){if(typeOf(ctx.card)!=='S'||turnCtr('ctone')>=2)return;bump('ctone');alive().forEach(e=>addSt(e,'brittle',1))}}}});
N('cacophony',{e:'🥁',d:'Deal {4|5} to ALL. Sink every Flotsam and Burden in your hand and deal {4|5} to ALL for each (max {16|20}).',p:f=>{f.all(f.v(4,5));const c=W.cb;if(!c)return;
 const junk=c.hand.filter(isJunk);junk.forEach(ci=>sinkHand(ci,'cacophony'));
 const n=Math.min(4,junk.length);for(let i=0;i<n;i++){if(!W.cb||!alive().length)return;f.all(f.v(4,5))}if(junk.length)log('🥁 Cacophony: '+junk.length+' junk Sunk')}});
N('clearnote',{e:'🎵',d:'Unlock every locked card in your hand (Muffled), remove Numbed from you, and draw {1|2}. Faint.',p:f=>{const c=W.cb;if(c.locked){log('🎵 Clear Note: '+cname(c.locked)+' unlocked');c.locked=null}
 if(c.p.st.numbed){delete c.p.st.numbed;log('🎵 Clear Note: Numbed removed')}f.draw(f.v(1,2))}});
N('pedaltone',{e:'🎚️',d:'Resonating on enemies does not fall at the end of their turns.',power:{on:{enemyAct(inst,ctx){const e=ctx.enemy;if(e&&e.st&&e.st.reson)(e.hold=e.hold||{}).reson=1}}}});
// Bronze Bulwark: Guard a Skill's ring gives is remembered (up to 20) and put back after the start-of-turn Guard clear.
N('bronzebulwark',{e:'🏛️',d:'Guard gained from a Skill\'s Echo is not removed at the start of your next turn (up to 20 Guard kept).',power:{
 mod:{echoPlan(inst,ctx,p){markRing(ctx);return p},guard(inst,ctx,v){const c=W.cb;if(ringing()&&typeOf(c._ringCard)==='S'&&v>0)c._kept=(c._kept||0)+Math.floor(v);return v}},
 on:{roundEnd(){const c=W.cb;if(!c)return;c._keep=Math.max(0,Math.min(20,c._kept||0,c.p.block));c._kept=0},
  turnStart(){const c=W.cb;const k=c&&c._keep||0;if(c)c._keep=0;if(k>0){c.p.block+=k;floatText('p','+'+k+'🛡','b');log('🏛️ Bronze Bulwark: '+k+' Guard kept')}}}}});
const wreck=()=>{const c=W.cb;if(!c._wreckA2||c._wreckA2.turn!==c.turn)c._wreckA2={turn:c.turn,pend:0,tot:0};return c._wreckA2};
N('wreckhymn',{e:'⚓',cu:0,d:'Whenever you Sink a Flotsam, Burden or Static, your next Echo this turn gets +2 (max +4 a turn).',power:{
 on:{sink(inst,ctx){if(!W.cb||!isJ(ctx.card))return;const w=wreck();const a=Math.min(2,4-w.tot);if(a<=0)return;w.tot+=a;w.pend+=a;log('⚓ Wreck Hymn: next Echo +'+w.pend)}},
 mod:{echoPlan(inst,ctx,p){if(!W.cb)return p;const w=wreck();if(w.pend<=0)return p;const out={...p,bonus:(p.bonus||0)+w.pend};if(!ctx.preview)w.pend=0;return out}}}});

// ================= Act 3 =================
N('marchdrum',{e:'🥁',d:'Deal {9|12}. This costs 1 less for each 2 Notes in your hand.',p:f=>f.dmg(f.v(9,12)),
 mod:{cost(inst,ctx,v){if(ctx.card!==inst||!W.cb)return v;return Math.max(0,v-Math.floor(W.cb.hand.filter(isNote).length/2))}}});
N('bronzereply',{e:'🔔',d:'Deal {7|9}. <b>Resound:</b> gain {7|9} Guard.',p:f=>{f.dmg(f.v(7,9));if(f.echo&&W.cb)f.blk(f.v(7,9))}});
// Listen Closely: sets c.reveal (turn number it lasts through); the enemy intent UI does not read it yet (ENGINE-NEEDS).
N('listenclose',{e:'👂',d:'Reveal every enemy\'s intent and numbers until your next turn, even hidden ones. Draw {1|2}. Faint.',p:f=>{const c=W.cb;c.reveal=c.turn+1;callout('INTENTS REVEALED','echo');log('👂 Listen Closely: every intent is revealed');f.draw(f.v(1,2))}});
N('mendchord',{e:'🧵',d:'Gain {5|7} Guard. <b>Resound:</b> heal 3 HP (max 8 HP per fight).',p:f=>{f.blk(f.v(5,7));if(!f.echo||!W.cb)return;const c=W.cb;const h=Math.min(3,8-(c._mendA2||0));if(h>0){c._mendA2=(c._mendA2||0)+h;f.heal(h)}}});
N('carrytone',{e:'📡',tg:1,cu:0,d:'Copy the target\'s Resonating onto every other enemy (full value, max 12).',p:f=>{const t=f.tg;if(!t)return;const r=Math.min(12,t.st.reson||0);if(!r){log('📡 Carrying Tone: no Resonating on '+t.n);return}
 for(const e of alive())if(e!==t){const cur=e.st.reson||0;if(r>cur)addSt(e,'reson',r-cur)}}});
N('sostenuto',{e:'🎻',cu:0,d:'Each time a card grows from Sustain, it grows 1 more.',power:{mod:{sustain(inst,ctx,v){return v+1}}}});
// Tune the Hall: upgrades one random hand card for the fight. The hand is drawn AFTER the turnStart event, so pick by reservoir
// sampling over the cards that arrive (and any Moored card already held) until the first card is played.
N('tunehall',{e:'🎼',cu:0,d:'At the start of your turn, upgrade one random card in your hand for this fight.',power:{on:{
 turnStart(inst){const c=W.cb;inst.arm=c.turn;inst.seen=0;inst.pick=null;for(const ci of c.hand)consider(inst,ci)},
 draw(inst,ctx){const c=W.cb;if(inst.arm!==c.turn)return;consider(inst,ctx.card)},
 cardPlayed(inst){inst.arm=0},turnEnd(inst){inst.arm=0}}}});
function consider(inst,ci){if(!ci||!canTemper(ci)||ci.tmpUp||isUp(ci))return;inst.seen++;if(R(inst.seen,'combat')!==0)return;
 if(inst.pick&&inst.pick!==ci)inst.pick.tmpUp=false;inst.pick=ci;ci.tmpUp=true;log('🎼 Tune the Hall: '+cname(ci)+' is upgraded for this fight')}
N('grandpause',{e:'⏸️',req:()=>!!(W.cb&&(W.cb.mark||W.cb.mark2)),d:'Gain {8|11} Guard. End your turn now. Each of your Marked cards rings with +3 this turn. Faint.',p:f=>{f.blk(f.v(8,11));const c=W.cb;if(f.echo||!c)return;const turn=c.turn;
 thisTurn({id:'grandpause',mod:{echoPlan(inst,ctx,p){return {...p,bonus:(p.bonus||0)+3}}}});callout('GRAND PAUSE','echo');
 if(W.previewing){c.previewEndTurn=true;return}queueMicrotask(()=>{if(W.cb===c&&c.turn===turn&&!c.busy&&!c.mode)endTurn()})}});
N('sympnotes',{e:'🎵',d:'Apply 1 Resonating to ALL for each Note you have played this turn (max {4|5}). Faint.',p:f=>{const n=Math.min(f.v(4,5),notesTurn());if(!n){log('🎵 Sympathetic Notes: no Note played yet');return}alive().forEach(e=>addSt(e,'reson',n))}});
N('harmseries',{e:'〰️',cu:0,d:'Whenever an Echo hits an enemy, apply 1 Resonating to it (max 3 times a turn).',power:{on:{echo(inst,ctx){const f=ctx.f;if(!f||f.lastDealt==null||turnCtr('harm')>=3)return;
 const ts=/ALL/.test(CARDS[ctx.card.id].d)?alive():[f.tg].filter(Boolean);for(const t of ts){if(turnCtr('harm')>=3)break;bump('harm');addSt(t,'reson',1)}}}}});
N('belltower',{e:'🛎️',d:'Start of your turn: each Moored card in hand gains {2|3} to its damage and Guard for the fight (max 3 cards).',power:{on:{turnStart(inst){const c=W.cb;let k=0;
 for(const ci of c.hand){if(k>=3)break;if(CARDS[ci.id].moor||ci.moor){ci.sus=(ci.sus||0)+(inst.up?3:2);k++}}if(k)log('🛎️ Bell Tower: '+k+' Moored card'+(k>1?'s':'')+' grow')}}}});
N('aftertone',{e:'🔔',cu:0,d:'Whenever a card with a Sustain bonus Echoes, gain Guard equal to half that bonus (max 8 per ring).',power:{on:{echo(inst,ctx){const s=ctx.card.sus||0;const g=Math.min(8,Math.floor(s/2));if(g>0)gainBlock(g)}}}});
// Third Tine: the engine has two tines only, so the second Attack of the turn is remembered here and rung once by this Vigil
// right after the normal rings (same cap, +1 per card played after it, up to the Echo bonus). See ENGINE-NEEDS.
N('thirdtine',{e:'🔱',d:'Your second Attack each turn is Marked too (shares the cap of 4; Notes still never take a tine).',power:{on:{
 cardPlayed(inst,ctx){const c=W.cb;if(inst.t!==c.turn){inst.t=c.turn;inst.n=0;inst.ci=null}const ci=ctx.card,d=CARDS[ci.id];
  if(inst.ci&&ci!==inst.ci)inst.after=(inst.after||0)+1;
  if(d.t!=='A'||d.faint||isNote(ci))return;inst.n++;if(inst.n===2){inst.ci=ci;inst.tgt=ci._tgt||c.lastTgt;inst.after=0}},
 turnEndInHand(inst){const c=W.cb;if(!c||inst.t!==c.turn||!inst.ci||inst.rung===c.turn)return;inst.rung=c.turn;const ci=inst.ci;if(ci===c.mark||ci===c.mark2)return;
  if(c.stat.echoesTurn>=EC.cap||!alive().length){log('🔇 Third Tine: Echo cap reached');return}
  const d=CARDS[ci.id];const was=c.ending;c.ending=true;const f=F(ci,{echo:true,tgt:inst.tgt,bonus:markBonus(inst.after||0)});runCard(d,f);c.ending=was;
  if(!W.cb)return;c.stat.echoesTurn++;c.stat.echoesCombat++;c.stat.lastEchoed=ci;if(d.sus)ci.sus=(ci.sus||0)+mod('sustain',{card:ci},d.sus);
  log('🔱 Third Tine: '+cname(ci)+' rings');callout('THIRD TINE: '+cname(ci),'echo')}}}});
N('growingpeal',{e:'🔔',cu:1,d:'Each turn something Echoed, your Echoes gain +1 (max +4 for the fight).',power:{mod:{echoPlan(inst,ctx,p){const c=W.cb;if(!c||p.repeats<1)return p;
 let g=inst.g||0;if(inst.t!==c.turn){g=Math.min(4,g+1);if(!ctx.preview){inst.t=c.turn;inst.g=g}}else g=inst.g||0;return {...p,bonus:(p.bonus||0)+g}}}}});
// Canon: remembers the names played this turn; a repeat of one costs 0 (once a turn, twice upgraded). Full Flame (X) cards are exempt.
N('canon',{e:'🎼',d:'Once a turn, a card you play that has the same name as a card you already played this turn costs 0.',power:{
 mod:{cost(inst,ctx,v){const c=W.cb;if(!c||!ctx.card||v<=0||CARDS[ctx.card.id].c==='X'||!c.hand.includes(ctx.card))return v;const s=canonSt(inst);return s.names[CARDS[ctx.card.id].n]&&s.uses<(inst.up?2:1)?0:v}},
 on:{cardPlayed(inst,ctx){const s=canonSt(inst),d=CARDS[ctx.card.id];if(s.names[d.n]&&d.c!=='X'&&baseCost(ctx.card)>0&&s.uses<(inst.up?2:1)){s.uses++;callout('CANON: free','echo')}s.names[d.n]=1}}}});
function canonSt(inst){const c=W.cb;if(inst.s&&inst.s.turn===c.turn)return inst.s;return inst.s={turn:c.turn,names:{},uses:0}}
N('shatternote',{e:'💠',d:'Gain 6 Guard. This turn, Guard you gain from rings is dealt to ALL at end of turn instead (max {30|40}).',p:f=>{f.blk(6);const c=W.cb;if(f.echo||!c)return;const cap=f.v(30,40);
 thisTurn({id:'shatternote',store:0,mod:{echoPlan(inst,ctx,p){markRing(ctx);return p},guard(inst,ctx,v){if(ringing()&&v>0){inst.store+=Math.floor(v);return 0}return v}},
  on:{turnEndInHand(inst){if(!W.cb||inst.store<=0)return;const n=Math.min(cap,inst.store);inst.store=0;callout('SHATTER '+n,'echo');log('💠 Shattering Note: '+n+' to ALL');zapAll(n)}}})}});
N('fullorch',{e:'🎻',cu:1,d:'After your 4th card each turn, your next Attack Echoes once more for each other Vigil you have (max 2).',power:{
 on:{cardPlayed(inst,ctx){const c=W.cb;if(ctx.nThisTurn!==4)return;const n=Math.min(2,c.powers.filter(p=>p!==inst&&p.id!==inst.id).length);if(n>0){inst.ex={turn:c.turn,n};callout('FULL ORCHESTRA +'+n,'echo')}}},
 mod:{echoPlan(inst,ctx,p){const c=W.cb;const x=inst.ex;if(!c||!x||x.turn!==c.turn||x.n<=0||typeOf(p.card)!=='A')return p;if(!ctx.preview)inst.ex=null;return {...p,repeats:p.repeats+x.n}}}}});
N('opusgrand',{e:'📜',d:'Deal 12. <b>Resound:</b> deal 8 for each Resonating on the target instead (max 6 counted). Sink.',p:f=>{if(!f.echo)return f.dmg(12);const t=f.tg;const k=t?Math.min(6,t.st.reson||0):0;if(k>0)f.dmg(8*k);else log('📜 Magnum Opus: no Resonating on the target')}});
N('greathall',{e:'🏟️',cu:1,d:'You may Echo up to 5 times a turn instead of 4.',power:{}});

// ENGINE-NEEDS:
// - faultline: enemy Brittle is applied (addSt) but the engine does not yet lower the Guard an enemy gains by 25% (round down).
// - clearnote: the 'numbed' player status does not exist yet; this clears st.numbed if an Act 2 enemy ever sets it.
// - listenclose: sets cb.reveal (= the turn number the reveal lasts through); the intent UI / hidden-intent (Fog Veil) enemies need to read it.
// - thirdtine: the engine has two tines (cb.mark / cb.mark2). Emulated here: the second Attack's ring runs from this Vigil's turnEndInHand
//   hook after the normal rings (shared cap, +1 per card after it). It is not in the live Echo preview and is not re-targetable by Retune/Seeking Echo.
// - growingpeal: the engine adds plan.bonus to a card's FIRST repeat only; the +N bonus therefore does not reach later repeats of the same ring.
// - belltower: growth is stored in ci.sus (the Sustain bonus), so Ring Out / Aftertone also count it. A separate per-card growth stat (added in F.num) would split them.
// - greathall: EC.cap (CORE.echo.cap) is turned into a getter in this file (reads 5 while Great Hall is in play). A proper mod('echoCap') in doEcho/echoPlan would be cleaner.
// - Bell/Learning Bell/Antiphon/Sympathetic Notes count Notes PLAYED through a permanent bus observer in this file; an engine stat (cb.stat.notesPlayed) would replace it.
// - tunehall: turnStart fires before the draw, so the upgrade is picked by reservoir sampling over drawn cards; an 'afterDraw' event would be simpler.
// - bronzebulwark / shatternote: the ring that is resolving is tracked from the non-preview echoPlan call (cb._ringCard); a ctx.f in the 'guard' modifier would remove that.
