// data/cards/echo-mage-pool.js — Echo Mage Phase 2 pool (56 cards). Archetypes: Resonance (RS: Resound payoffs on the
// Marked card), Chorus (CH: many cheap cards per turn, Notes), Sustain (SU: cards that grow each time they Echo).
// v2.1 Echo: Mark one non-Faint card per turn; it repeats at end of turn at its original target, +1 per card played after
// it (max +2). Unmarked → the last non-Faint card at half. Doubling at most once; 4 repeats per turn max.
import {W} from '../../core/state.js';
import {CARDS} from '../../core/registry.js';
import {mod} from '../../core/bus.js';
import {card} from './loader.js';
import {cname,isUp} from '../../engine/cards.js';
import {alive,randAlive,hit,gainBlock,gainEnergy,drawCards,addCard,endTurn,handLimit,F} from '../../engine/combat.js';
import {runCard} from '../../engine/effects.js';
import {EC,ask,thisTurn,callout,log,floatText,stacks,playedBefore} from './kit.js';
const E=(id,o)=>card('echo',id,o);
// Upgrades that raise Sustain (2 → 3...): the engine adds the card's base Sustain after each Echo; add the difference.
const susUp=(f,extra)=>{if(f.echo&&f.u&&extra)f.ci.sus=(f.ci.sus||0)+extra};
const notes=n=>{for(let i=0;i<n;i++)addCard('note','hand');floatText('p','🎵 +'+n+' Note'+(n>1?'s':''),'')};
// How many times this card instance has Echoed this combat (Swell Note).
const echoN=new WeakMap();
const echoCount=ci=>{const m=echoN.get(W.cb);return m&&m.get(ci.uid)||0};
const bumpEcho=ci=>{let m=echoN.get(W.cb);if(!m)echoN.set(W.cb,m=new Map());m.set(ci.uid,(m.get(ci.uid)||0)+1);return m.get(ci.uid)};
// ---------------- Common ----------------
E('gracenote',{e:'🎵',d:'Add {2|3} Notes to your hand. Faint.',p:f=>notes(f.v(2,3))});
E('chime',{e:'🔔',d:'Choose: deal {9|12}; or deal {4|6} and draw 1.',p:f=>ask(f,'Chime',[{l:'Deal '+f.v(9,12),f:()=>f.dmg(f.v(9,12))},{l:'Deal '+f.v(4,6)+'; draw 1',f:()=>{f.dmg(f.v(4,6));f.draw(1)}}])});
E('belltone',{e:'🛎️',sus:2,d:'Gain {5|7} Guard. Sustain {2|3}.',p:f=>{f.blk(f.v(5,7));susUp(f,1)}});
E('staccato',{e:'🎶',d:'Deal {2|3} three times.',fx:[['dmg',2,3,3]]});
E('hollowecho',{e:'🕳️',d:'Deal {6|8}. <b>Resound:</b> it hits ALL enemies instead.',p:f=>{if(f.echo)f.all(f.v(6,8));else f.dmg(f.v(6,8))}});
E('drone',{e:'🐝',sus:3,d:'Deal {4|6}. Sustain {3|4}.',p:f=>{f.dmg(f.v(4,6));susUp(f,1)}});
E('pianissimo',{e:'🤏',d:'Gain {3|5} Guard. Faint.',fx:[['block',3,5]]});
E('counterpt',{e:'🎼',sus:1,d:'Deal {5|7}. Gain {5|7} Guard. Sustain 1.',fx:[['dmg',5,7],['block',5,7]]});
E('overture',{e:'🎬',d:'Draw {2|3}. Faint.',fx:[['draw',2,3]]});
E('sharp',{e:'♯',d:'Deal {8|10}. <b>Resound:</b> apply 2 Exposed.',p:f=>{f.dmg(f.v(8,10));if(f.echo)f.vuln(2)}});
E('flat',{e:'♭',d:'Gain {7|9} Guard. <b>Resound:</b> apply 2 Soaked to a random enemy.',p:f=>{f.blk(f.v(7,9));if(f.echo){const t=randAlive();if(t)f.weak(2,t)}}});
E('tremolo',{e:'〰️',sus:1,d:'Deal {3|4} twice. Sustain {1|2} (per hit).',p:f=>{f.dmg(f.v(3,4),2);susUp(f,1)}});
E('glissando',{e:'🎹',d:'Deal 3, +{2|3} for each card played this turn.',p:f=>f.dmg(3+f.v(2,3)*playedBefore())});
E('lullaby',{e:'🌙',tg:1,d:'Apply {2|3} Soaked. <b>Resound:</b> apply 2 more.',p:f=>f.weak(f.v(2,3)+(f.echo?2:0))});
E('refrain',{e:'🔁',moor:1,d:'Deal {6|9}. Moor.',fx:[['dmg',6,9]]});
E('restnote',{e:'💤',xu:0,d:'Next turn, gain 1 Energy.{ Sink.|} Faint.',p:f=>{f.nextTurn(()=>{gainEnergy(1);log('💤 Rest Note: +1 Energy')});floatText('p','💤 +1⚡ next turn','e')}});
E('echoshard',{e:'🔹',d:'Deal {5|7}. <b>Resound:</b> also deal {5|7} to ALL.',p:f=>{f.dmg(f.v(5,7));if(f.echo)f.all(f.v(5,7))}});
E('soundwall',{e:'🧱',d:'Gain {12|15} Guard. <b>Resound:</b> gain {18|22} instead.',p:f=>f.blk(f.echo?f.v(18,22):f.v(12,15))});
E('pizzicato',{e:'🎻',d:'Deal {2|3}. Draw 1. Faint.',fx:[['dmg',2,3],['draw',1]]});
E('triad',{e:'🔺',d:'Gain {3|5} Guard. Add 1 Note to your hand. Draw 1.',p:f=>{f.blk(f.v(3,5));notes(1);f.draw(1)}});
E('swellnote',{e:'📯',sus:2,d:'Deal {5|7}. Sustain 2. If this has Echoed 3+ times this combat, also draw 1.',p:f=>{f.dmg(f.v(5,7));const n=f.echo?bumpEcho(f.ci):echoCount(f.ci);if(n>=3){f.draw(1);floatText('p','📯 draw','')}}});
E('tuning',{e:'🎚️',d:'Upgrade a card in your hand for this combat.{| Also draw 1.} Faint.',p:f=>{const c=W.cb;const up=ci=>{ci.tmpUp=true;log('🎚️ Tuned: '+cname(ci));floatText('p','⬆️ '+cname(ci),'')};
 const after=()=>{if(f.u)f.draw(1)};const opts=c.hand.filter(ci=>!isUp(ci)&&!CARDS[ci.id].curse&&CARDS[ci.id].cls!=='status');
 if(!opts.length){log('🎚️ Nothing to tune');return after()}
 ask(f,'Tuning Fork: upgrade which card (this combat)?',opts.map(ci=>({l:(CARDS[ci.id].e||'')+' '+cname(ci)+' → +',f:()=>{up(ci);after()}})))}});
E('rumble',{e:'🌩️',d:'Deal {7|9} to ALL. <b>Resound:</b> {11|14} to ALL instead.',p:f=>f.all(f.echo?f.v(11,14):f.v(7,9))});
E('murmur',{e:'🗣️',sus:1,d:'Gain {4|6} Guard. Draw 1. Sustain 1.',fx:[['block',4,6],['draw',1]]});
E('arpeggio',{e:'🎹',d:'Deal 3 to a random enemy {4|5} times.',p:f=>{for(let i=0;i<f.v(4,5);i++){const t=randAlive();if(!t)break;hit(t,f.num(3),f)}}});
E('cadence',{e:'🎼',d:'Deal {6|8}. If you played 3+ cards this turn, deal {6|8} more.',p:f=>f.dmg(f.v(6,8),playedBefore()>=3?2:1)});
// ---------------- Uncommon ----------------
E('sostenuto',{e:'🎐',d:'Each Sustain grows by 1 more.',power:{mod:{sustain(inst,ctx,v){return v+stacks(inst)}}}});
E('choir',{e:'👥',d:'At the start of your turn, add {1|2} Note{|s} to your hand.',power:{on:{turnStart(inst){notes((inst.up?2:1)*stacks(inst))}}}});
E('metronome',{e:'⏱️',d:'Every 4th card you play each turn, draw 1.',power:{on:{cardPlayed(inst,ctx){if(ctx.nThisTurn%4===0){drawCards(stacks(inst));floatText('p','⏱️ tick: draw','')}}}}});
// Fermata: the card played just before the Marked card. A per-turn play history would make this exact (engine request);
// here: if the Mark comes later we catch it on the Mark; if it already happened we read the discard pile order.
E('fermata',{e:'𝄐',d:'This turn, your Echo also repeats the card you played just before your Marked card. Faint.',p:f=>{const c=W.cb;let prev=null,prevTgt=null;
 if(c.mark){const pile=c.disc.includes(c.mark)?c.disc:c.exh;const i=pile.indexOf(c.mark);if(i>0&&!CARDS[pile[i-1].id].faint&&CARDS[pile[i-1].id].t!=='P')prev=pile[i-1]}
 const L=thisTurn({id:'fermata',on:{mark(inst){prev=c.last&&!CARDS[c.last.id].faint?c.last:null;prevTgt=c.lastTgt},
  echo(inst,ctx){if(inst.done||ctx.k!==0||!prev||!c.mark)return;inst.done=true;if(c.stat.echoesTurn>=EC.cap){log('🔇 Fermata: Echo cap reached');return}
   const d=CARDS[prev.id];const g=F(prev,{echo:true,tgt:prevTgt});runCard(d,g);c.stat.echoesTurn++;c.stat.echoesCombat++;if(d.sus)prev.sus=(prev.sus||0)+mod('sustain',{card:prev},d.sus);
   log('𝄐 Fermata: '+cname(prev)+' echoes too');callout('FERMATA: '+cname(prev),'echo')}}});
 log(prev?'𝄐 Fermata will repeat '+cname(prev):'𝄐 Fermata: Mark a card after another card')}});
E('cavity',{e:'🏛️',d:'Each Echo deals +{3|4} per hit and grants +{3|4} Guard.',power:{mod:{damageAdd(inst,ctx,v){return ctx.f&&ctx.f.echo?v+(inst.up?4:3)*stacks(inst):v}},
 on:{echo(inst){gainBlock((inst.up?4:3)*stacks(inst))}}}});
E('longdecay',{e:'⏳',sus:5,d:'Deal {10|14}. Sustain {5|6}.',p:f=>{f.dmg(f.v(10,14));susUp(f,1)}});
E('bellow',{e:'📢',d:'Deal {16|20}. <b>Resound:</b> also apply 2 Exposed.',p:f=>{f.dmg(f.v(16,20));if(f.echo)f.vuln(2)}});
E('hush',{e:'🤫',tg:1,d:'Apply {3|4} Soaked. Faint.',fx:[['weak',3,4]]});
E('encore',{e:'👏',d:'Deal {3|4} to ALL for each card played this turn. Faint.',p:f=>{const n=playedBefore();if(n)f.all(f.v(3,4)*n);else log('👏 Encore: play other cards first');if(n>=4)callout('ENCORE ×'+n,'echo')}});
E('ostinato',{e:'🔂',d:'Deal {6|9}. When this Echoes, add 1 Note to your hand.',p:f=>{f.dmg(f.v(6,9));if(f.echo)notes(1)}});
E('sirensong',{e:'🧜',d:'Apply 1 Exposed and 1 Soaked to ALL. <b>Resound:</b> 2 of each instead.',p:f=>{const n=f.echo?2:1;alive().forEach(e=>{f.vuln(n,e);f.weak(n,e)})}});
E('waveform',{e:'📈',sus:3,d:'Deal {5|7}. Sustain {3|4}. <b>Resound:</b> draw 1.',p:f=>{f.dmg(f.v(5,7));if(f.echo)f.draw(1);susUp(f,1)}});
E('harmonics',{e:'🎛️',sus:3,d:'Gain {8|10} Guard. Sustain {3|4}.',p:f=>{f.blk(f.v(8,10));susUp(f,1)}});
E('tempo',{e:'⏩',d:'Gain 1 Energy.{| Also draw 1.} Sink. Faint.',p:f=>{f.gainEnergy(1);if(f.u)f.draw(1)}});
E('chorusline',{e:'🎤',d:'Draw 1 for every 2 cards played this turn (max {3|4}). Faint.',p:f=>{const n=Math.min(f.v(3,4),Math.floor(playedBefore()/2));if(n)f.draw(n);else log('🎤 Chorus Line: play 2 cards first')}});
E('dissonance',{e:'🔀',d:'Deal {9|12}. If the target has Exposed, apply 2 Soaked. <b>Resound:</b> it hits ALL.',p:f=>{const ts=f.echo?alive():[f.tg].filter(Boolean);
 const exp=new Set(ts.filter(t=>t.st.vuln));if(f.echo)f.all(f.v(9,12));else f.dmg(f.v(9,12));exp.forEach(t=>{if(t.hp>0)f.weak(2,t)})}});
E('grandpause',{e:'⏸️',d:'Gain {10|14} Guard. End your turn (Echo still happens).',p:f=>{f.blk(f.v(10,14));if(f.echo)return;const c=W.cb,turn=c.turn;
 callout('GRAND PAUSE','echo');queueMicrotask(()=>{if(W.cb===c&&c.turn===turn&&!c.busy&&!c.mode)endTurn()})}});
E('coda',{e:'🎯',d:'Can only be played if you played 3+ cards this turn. Deal {14|18}.',req:f=>W.cb.stat.playedTurn>=3,fx:[['dmg',14,18]]});
E('tuningblade',{e:'🗡️',sus:2,moor:1,d:'Deal {7|9}. Sustain {2|3}. Moor.',p:f=>{f.dmg(f.v(7,9));susUp(f,1)}});
E('swellchord',{e:'🎶',d:'Gain {3|4} Guard for each card played this turn (counting this). Faint.',p:f=>f.blk(f.v(3,4)*(playedBefore()+1))});
E('phaseshift',{e:'🌀',d:'Draw {2|3}. <b>Resound:</b> also gain 1 Energy next turn.',p:f=>{f.draw(f.v(2,3));if(f.echo){f.nextTurn(()=>{gainEnergy(1);log('🌀 Phase Shift: +1 Energy')});floatText('p','🌀 +1⚡ next turn','e')}}});
// ---------------- Rare ----------------
E('eternal',{e:'♾️',d:'At the start of your turn, return last turn\'s Echoed card from discard to your hand.',power:{on:{
 echo(inst,ctx){inst.le={ci:ctx.card,turn:W.cb.turn}},
 turnStart(inst){const c=W.cb;const le=inst.le;if(!le||le.turn!==c.turn-1)return;const i=c.disc.indexOf(le.ci);if(i<0||c.hand.length>=handLimit())return;
  c.disc.splice(i,1);c.hand.push(le.ci);log('♾️ Eternal Refrain: '+cname(le.ci)+' returns');floatText('p','♾️ '+cname(le.ci),'')}}}});
E('symphony',{e:'🎻',d:'Whenever you play your 5th card in a turn, gain 1 Energy and draw 2.',power:{on:{cardPlayed(inst,ctx){if(ctx.nThisTurn!==5)return;const n=stacks(inst);gainEnergy(n);drawCards(2*n);callout('SYMPHONY! +1⚡ draw 2','echo')}}}});
E('rubato',{e:'🎭',d:'The first card you play each turn costs 0.',power:{mod:{cost(inst,ctx,v){return W.cb&&W.cb.stat.playedTurn===0?0:v}}}});
E('magnumopus',{e:'🏆',d:'Deal {24|30}. <b>Resound:</b> deal {24|30} to ALL instead. Sink.',p:f=>{if(f.echo){f.all(f.v(24,30));callout('MAGNUM OPUS','echo')}else f.dmg(f.v(24,30))}});
E('infinitehum',{e:'🎵',d:'Your Marked card gains +2 per card played after it, not +1 (max +6).',power:{mod:{markPer(inst,ctx,v){return v*2},markCap(inst,ctx,v){return v*3}}}});
E('livingsong',{e:'🌱',sus:4,moor:1,d:'Deal {6|9}. Sustain {4|5}. When this Echoes, draw 1. Moor.',p:f=>{f.dmg(f.v(6,9));if(f.echo)f.draw(1);susUp(f,1)}});
E('feedstorm',{e:'🌪️',d:'Deal {4|5} to ALL for each Echo this combat (max 15). Sink.',p:f=>{const n=Math.min(15,W.cb.stat.echoesCombat);if(!n){log('🌪️ Feedback Storm: no Echoes yet');return}f.all(f.v(4,5)*n);callout('FEEDBACK STORM ×'+n,'echo')}});
E('solo',{e:'🎸',d:'This turn, your Echo happens one extra time, and you can play at most 3 more cards. Faint.',p:f=>{const ci=f.ci;let k=0;callout('SOLO: 3 more cards','echo');
 thisTurn({id:'solo',mod:{echoPlan(inst,ctx,p){return {...p,repeats:p.repeats+1}},canPlay(inst,ctx,v){return k>=3?false:v}},on:{cardPlayed(inst,ctx){if(ctx.card!==ci)k++}}})}});
E('finalchord',{e:'🎆',d:'Deal 3 for each card played this combat (max 40 counted). Sink.',p:f=>{const n=Math.min(40,W.cb.stat.playedCombat);f.dmg(3*n);if(n>=10)callout('FINAL CHORD ×'+n,'echo')}});
