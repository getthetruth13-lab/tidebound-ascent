// data/cards/act1/echo.js — Echo Mage Act 1 pool (cards-act1): NEW cards and REWORKs per CARDS_ACT1_WORKLIST.md.
// Source of truth: FULL-CARD-POOL.md 2.A.1 + Part 9 rule 30. Owned by the Echo worker; tests: tests/cards-act1/echo.cjs.
// Also redefines six "SAME" ids whose UPGRADE text no longer matched the doc (sharp, silence, tuningstrike, struckbell, harmonics,
// choir) and Symphony (no copy-stacking: rule 4).
import {W} from '../../../core/state.js';
import {CARDS} from '../../../core/registry.js';
import {mod} from '../../../core/bus.js';
import {card,redef} from '../loader.js';
import {cname} from '../../../engine/cards.js';
import {alive,randAlive,hit,gainBlock,gainEnergy,bonusEnergy,passiveDraw,drawCards,addCard,addSt,sinkCard,retune as moveMark,handLimit,F} from '../../../engine/combat.js';
import {runCard} from '../../../engine/effects.js';
import {EC,ask,thisTurn,callout,log,floatText,playedBefore} from '../kit.js';
const N=(id,o)=>card('echo',id,o), R=(id,o)=>redef('echo',id,o);
// ---- shared helpers ----
const isFlot=ci=>!!ci&&CARDS[ci.id]&&CARDS[ci.id].cls==='status';      // Flotsam = the sea's junk status cards (Kelp, Ringing, Murk...)
const isNote=ci=>!!ci&&ci.id==='note';
// Per-turn counters on the combat (reset when the turn changes).
const turnCtr=k=>{const c=W.cb;const m=c._echoA1||(c._echoA1={});if(m.turn!==c.turn){for(const x in m)delete m[x];m.turn=c.turn}return m[k]||0};
const bump=(k,n=1)=>{turnCtr(k);W.cb._echoA1[k]=(W.cb._echoA1[k]||0)+n};
// Rule 30 ceilings: Echo-created Notes and Echo draws are each capped at 3 a turn (Echo-created only).
export function echoNote(f,n=1){let k=0;for(let i=0;i<n;i++){if(f.echo){if(turnCtr('notes')>=3){log('🎵 Echo Note ceiling (3) reached');break}bump('notes')}addCard('note','hand');k++}
 if(k)floatText('p','🎵 +'+k+' Note'+(k>1?'s':''),'');return k}
export function echoDraw(f,n){if(!f.echo)return f.draw(n);return passiveDraw(n,'echo')} // rule 23: Echo ring draws share the engine's Echo family cap (3 a turn)
// Sequence number of the first card played this turn (ci._seq is stamped by the engine for the Echo Mage).
const turnStartSeq=f=>(f.ci._seq||W.cb.playSeq)-W.cb.stat.playedTurn-1;
const playedThisTurn=start=>{const c=W.cb;return [...c.disc,...c.exh,...c.hand].filter(ci=>(ci._seq||0)>start).sort((a,b)=>a._seq-b._seq)};
const ringable=ci=>{const d=CARDS[ci.id];return !!d&&(d.t==='A'||d.t==='S')&&!d.faint&&!isNote(ci)};

// ================= Common =================
R('glissando',{e:'🎹',d:'Deal 3, +{2|3} for each card you played before it this turn.',p:f=>f.dmg(3+f.v(2,3)*playedBefore())});
N('lampglass',{e:'🏮',d:'Gain {6|8} Guard. <b>Resound:</b> add a Note to your hand (it waits for next turn).',p:f=>{f.blk(f.v(6,8));if(f.echo)echoNote(f,1)}});
N('hallrest',{e:'🛏️',moor:1,d:'Moor. Gain {7|9} Guard. <b>Resound:</b> draw 1.',p:f=>{f.blk(f.v(7,9));if(f.echo)echoDraw(f,1)}});
R('arpeggio',{e:'🎹',d:'Deal {2|3}, then {3|4}, then {4|5}, then {5|6}, each to a random enemy.',p:f=>{for(const n of f.u?[3,4,5,6]:[2,3,4,5]){const t=randAlive();if(!t)break;hit(t,f.num(n),f)}}});
R('swellnote',{e:'📯',sus:2,d:'Deal {5|7}. Sustain {2|3}. <b>Resound:</b> draw 1.',p:f=>{f.dmg(f.v(5,7));if(f.echo){echoDraw(f,1);if(f.u)f.ci.sus=(f.ci.sus||0)+1}}});
N('discordant',{e:'💥',d:'Deal {10|13}. Add a Ringing to your discard pile (when played, not when it rings).',p:f=>{f.dmg(f.v(10,13));if(!f.echo){addCard('ringing','disc');log('🔔 Discordant Strike: a Ringing joins your discard pile')}}});

// ================= Uncommon =================
R('overtone',{e:'🎼',d:'This turn each of your Marks Echoes one extra time. Faint.',p:f=>{callout('OVERTONE','echo');thisTurn({id:'overtone',mod:{echoPlan(inst,ctx,p){return {...p,repeats:p.repeats+1}}}})}});
// Fermata: at the first ring of a Mark whose previous card (this turn) can ring, that card rings too (once; counts toward the cap of 4).
R('fermata',{e:'𝄐',d:'This turn your Echo also repeats the card you played just before your Marked card. Faint.',p:f=>{const c=W.cb;const start=turnStartSeq(f);
 thisTurn({id:'fermata',on:{echo(inst,ctx){if(inst.done||ctx.k!==0||!W.cb)return;const m=ctx.card;
  const prev=playedThisTurn(start).find(ci=>ci._seq===m._seq-1);
  if(!prev||!ringable(prev))return;inst.done=true;
  if(c.stat.echoesTurn>=EC.cap){log('🔇 Fermata: Echo cap reached');return}
  const d=CARDS[prev.id];const g=F(prev,{echo:true,tgt:prev._tgt||(prev===c.last?c.lastTgt:null)});runCard(d,g);c.stat.echoesTurn++;c.stat.echoesCombat++;
  if(d.sus)prev.sus=(prev.sus||0)+mod('sustain',{card:prev},d.sus);
  log('𝄐 Fermata: '+cname(prev)+' echoes too');callout('FERMATA: '+cname(prev),'echo')}}});
 log('𝄐 Fermata: the card before your Mark will ring too')}});
N('retune',{e:'🎚️',d:'Faint. Move a Mark to a card of the same type you already played this turn (it rings at full strength). Draw {1|2}. Sink.',p:f=>{const c=W.cb;
 const types=[c.markType,c.mark2Type].filter(Boolean);const marks=[c.mark,c.mark2];
 const opts=playedThisTurn(turnStartSeq(f)).filter(ci=>ringable(ci)&&!marks.includes(ci)&&types.includes(CARDS[ci.id].t==='A'?'A':'S'));
 const done=()=>f.draw(f.v(1,2));
 if(!opts.length){log('🎚️ Retune: no other card of a Marked type played this turn');if(!f.echo)callout('Nothing to retune','echo');return done()}
 ask(f,'Retune: which card takes the Mark?',opts.map(ci=>({l:'🔔 '+(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},f:()=>{moveMark(ci,ci._tgt||(ci===c.last?c.lastTgt:null));log('🎚️ Retuned: '+cname(ci)+' is Marked');callout('RETUNED: '+cname(ci),'echo');done()}})))}});
N('tollingward',{e:'🔕',d:'Gain {6|8} Guard. <b>Resound:</b> deal damage equal to your Guard (max 15) to a random enemy.',p:f=>{f.blk(f.v(6,8));if(!f.echo)return;
 const t=randAlive();const n=Math.min(15,W.cb.p.block);if(t&&n>0){hit(t,n,f,{raw:true,cap:15});callout('TOLL '+n,'echo')}}});
// Salvage Chime: playable Flotsam (Kelp, Ringing) cost 0, up to 3 a turn; each one played that way also adds a Note.
// Unplayable Flotsam (Murk, Scald, Static) become playable through the engine's 'playUnplayable' modifier.
N('salvagechime',{e:'🪝',openU:1,d:'Flotsam in your hand can be played for 0 (up to 3 a turn). Playing one Sinks it and adds a Note to your hand. Faint.{| Opening.}',power:{
 mod:{playUnplayable(inst,ctx,v){return W.cb&&isFlot(ctx.card)&&W.cb.hand.includes(ctx.card)&&turnCtr('salvage')<3?true:v},cost(inst,ctx,v){return W.cb&&isFlot(ctx.card)&&W.cb.hand.includes(ctx.card)&&turnCtr('salvage')<3?0:v}},
 on:{beforeCardPlay(inst,ctx){if(!isFlot(ctx.card)||turnCtr('salvage')>=3)return;bump('salvage');ctx.card._salv=true},
  cardPlayed(inst,ctx){const ci=ctx.card;if(!ci._salv)return;delete ci._salv;if(!W.cb.exh.includes(ci)){const i=W.cb.disc.indexOf(ci);if(i>=0)W.cb.disc.splice(i,1);sinkCard(ci,'salvage')}
   addCard('note','hand');floatText('p','🪝 '+cname(ci)+' → 🎵','');log('🪝 Salvage Chime: '+cname(ci)+' Sunk, +1 Note')}}}});
N('beatfreq',{e:'〽️',tg:1,d:'Deal {3|4} for each Resonating on the target, then remove all of it.',p:f=>{const t=f.tg;if(!t)return;const n=t.st.reson||0;
 if(n>0){const keep=t.st.reson;delete t.st.reson;f.dmg(f.v(3,4)*keep)}else log('〽️ Beat Frequency: no Resonating on '+t.n);delete t.st.reson}});
N('crackedclapper',{e:'🔔',d:'Whenever an Echo repeats, a Ringing in your hand becomes a Note (max 2 a turn).',power:{on:{echo(inst){const c=W.cb;if(turnCtr('clapper')>=2)return;
 const i=c.hand.findIndex(ci=>ci.id==='ringing');if(i<0)return;bump('clapper');const old=c.hand[i];c.hand[i]=Object.assign({},old,{id:'note',up:false});
 floatText('p','🔔 Ringing → 🎵','');log('🔔 Cracked Clapper: a Ringing becomes a Note')}}}});
// SAME ids whose upgrade differs from the shipped one (doc 2.A.1 upgrades):
R('sharp',{e:'♯',d:'Deal {8|10}. <b>Resound:</b> apply {2|3} Exposed.',p:f=>{f.dmg(f.v(8,10));if(f.echo)f.vuln(f.v(2,3))}});
R('silence',{e:'🤫',tg:1,d:'Remove all Guard from the target. Apply {2|3} Exposed. <b>Resound:</b> also apply 2 Soaked.',p:f=>{const t=f.tg;if(!t)return;t.block=0;f.vuln(f.v(2,3));if(f.echo)f.weak(2)}});
R('tuningstrike',{e:'🔔',tg:1,rk:{max:4},d:'Deal {7|9|+2}. Apply 2 Resonating.',p:f=>{f.dmg(f.r(7,9,2));const t=f.tg;if(t)addSt(t,'reson',2)}});
R('struckbell',{e:'🛎️',d:'Deal {7|9} to ALL. Apply 2 Resonating to ALL.',p:f=>{f.all(f.v(7,9));alive().forEach(e=>addSt(e,'reson',2))}});
R('harmonics',{e:'🎛️',sus:3,rk:{max:5},d:'Gain {8|11|+2} Guard. Sustain 3.',p:f=>f.blk(f.r(8,11,2))});
R('choir',{e:'👥',d:'At the start of your turn, add 1 Note to your hand.',power:{on:{turnStart(inst){addCard('note','hand');floatText('p','🎵 +1 Note','')}}}});

// ================= Rare =================
R('infinitehum',{e:'🎵',cu:0,d:'Your Marked cards gain +2 per card played after them instead of +1 (max +6).',power:{mod:{markPer(inst,ctx,v){return 2},markCap(inst,ctx,v){return 6}}}});
R('symphony',{e:'🎻',d:'Whenever you play your 5th card in a turn, gain 1 Energy and draw 2.',power:{on:{cardPlayed(inst,ctx){if(ctx.nThisTurn!==5)return;bonusEnergy(1,'echo');drawCards(2);callout('SYMPHONY! +1⚡ draw 2','echo')}}}});
// Full Belfry: X = Flotsam in hand + draw + discard (max 3). An Attack ring's first hit gets +X; a non-Attack ring gives X Guard.
const belfryN=()=>{const c=W.cb;return Math.min(3,[...c.hand,...c.draw,...c.disc].filter(isFlot).length)};
N('fullbelfry',{e:'🏰',d:'For every Flotsam in your hand, draw pile and discard pile (max 3), your Echoes get +1 damage or Guard (once per repeat).',power:{
 mod:{damageAdd(inst,ctx,v){const f=ctx.f;if(!f||!f.echo||f._belfry)return v;f._belfry=true;return v+belfryN()}},
 on:{echo(inst,ctx){const f=ctx.f;if(!f||f._belfry||CARDS[ctx.card.id].t==='A')return;f._belfry=true;const n=belfryN();if(n){gainBlock(n);floatText('p','🏰 +'+n+' Guard','')}}}}});
N('massedvoices',{e:'🎶',d:'Deal {4|5} for each Note in your hand (max {24|30}). Then Sink those Notes.',p:f=>{const c=W.cb;const ns=c.hand.filter(isNote);
 if(!ns.length){log('🎶 Massed Voices: no Notes in hand');return}f.dmg(Math.min(f.v(24,30),f.v(4,5)*ns.length));
 if(!W.cb)return;for(const ci of ns){const i=c.hand.indexOf(ci);if(i>=0){c.hand.splice(i,1);sinkCard(ci,'massed')}}if(ns.length>=4)callout('MASSED VOICES ×'+ns.length,'echo')}});
R('livingsong',{e:'🌱',sus:3,moor:1,d:'Moor. Deal {6|8}. Sustain 3. When it Echoes, every other Sustain card you own also grows by 1.',p:f=>{f.dmg(f.v(6,8));if(!f.echo||!W.cb)return;const c=W.cb;let k=0;
 for(const ci of [...c.hand,...c.draw,...c.disc,...c.exh])if(ci!==f.ci&&CARDS[ci.id]&&CARDS[ci.id].sus){ci.sus=(ci.sus||0)+1;k++}
 if(k){log('🌱 Living Song: '+k+' Sustain card'+(k>1?'s grow':' grows')+' by 1');floatText('p','🌱 +1 ×'+k,'')}}});
// Solo: one chosen tine rings 3 more times (cap 4 shared; the other tine's first ring stays reserved). At most 3 more cards this turn.
R('solo',{e:'🎸',req:()=>!!(W.cb.mark||W.cb.mark2),d:'Choose a marked card (automatic if only one): it Echoes 3 more times this turn. Needs a marked card. You can play at most 3 more cards this turn. Faint.',p:f=>{const c=W.cb;const ci=f.ci;
 const L=thisTurn({id:'solo',slot:0,played:0,mod:{
  echoPlan(inst,ctx,p){if(!inst.slot||ctx.slot!==inst.slot)return p;const other=inst.slot===1?W.cb.mark2:W.cb.mark;let r=p.repeats+3;
   if(other&&(other._seq||0)>(p.card._seq||0))r=Math.min(r,EC.cap-W.cb.stat.echoesTurn-1);return {...p,repeats:Math.max(p.repeats,r)}},
  canPlay(inst,ctx,v){return inst.played>=3?false:v}},
  on:{cardPlayed(inst,ctx){if(ctx.card!==ci)inst.played++}}});
 const set=s=>{L.slot=s;const m=s===1?c.mark:c.mark2;m.soloT=Date.now();log('🎸 Solo: '+cname(m)+' rings 3 more times');callout('SOLO: '+cname(m)+' ×4','echo')};
 const opts=[c.mark&&{l:'🔔 '+cname(c.mark),card:{id:c.mark.id,up:c.mark.up},f:()=>set(1)},c.mark2&&{l:'🔔 '+cname(c.mark2),card:{id:c.mark2.id,up:c.mark2.up},f:()=>set(2)}].filter(Boolean);
 if(!opts.length){log('🎸 Solo: no Mark yet');return}if(opts.length===1)return opts[0].f();ask(f,'Solo: which Mark rings 3 more times?',opts)}});
R('eternal',{e:'♾️',d:'At the start of your turn, return last turn\'s Echoed card from your discard pile to your hand.',power:{on:{
 echo(inst,ctx){inst.le={ci:ctx.card,turn:W.cb.turn}},
 turnStart(inst){const c=W.cb;const le=inst.le;if(!le||le.turn!==c.turn-1)return;const i=c.disc.indexOf(le.ci);if(i<0||c.hand.length>=handLimit())return;
  c.disc.splice(i,1);c.hand.push(le.ci);log('♾️ Eternal Refrain: '+cname(le.ci)+' returns');floatText('p','♾️ '+cname(le.ci),'')}}}});
