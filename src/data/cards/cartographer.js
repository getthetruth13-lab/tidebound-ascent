// data/cards/cartographer.js — Cartographer Phase 1 cards. Waypoints (W) sit in 3 slots and trigger at the start of each turn.
// v2.1: once per turn you may Advance one Waypoint (Rank +1, max 3 = Landmark); each Rank adds +3 to a Waypoint's damage.
import {W} from '../../core/state.js';
import {CARDS} from '../../core/registry.js';
import {card} from './loader.js';
import {cname} from '../../engine/cards.js';
import {addSt,chart,drawCards,log,refill,strongest,trigWp,removeWp,randAlive,choose,CORE} from '../../engine/combat.js';
import {pick} from '../../core/state.js';
import {thisTurn} from '../../core/bus.js';
import {rankUp} from './kit.js';
const K=(id,o)=>card('carto',id,o);
K('cstrike',{e:'🧭',d:'Deal {7|10}.',fx:[['dmg',7,10]]});
K('tent',{e:'⛺',d:'Gain {5|8} Guard.',fx:[['block',5,8]]});
K('survey',{e:'🔭',d:'Chart {3|4}. Draw 1.',p:f=>f.chart(f.v(3,4),()=>drawCards(1))});
K('signal',{e:'🔥',d:'Waypoint: at the start of your turn, deal {3|5} to a random enemy.',wp:f=>f.dmgRandom(f.v(3,5))});
K('plot',{e:'🗺️',d:'Chart {4|5}. Draw {1|2}.',p:f=>f.chart(f.v(4,5),()=>drawCards(f.v(1,2)))});
K('trail',{e:'🥾',d:'Deal 7 + {2|3} per Waypoint. <b>Expedition.</b>',p:f=>f.dmg(7+f.v(2,3)*f.wpCount())});
K('bivouac',{e:'🏕️',d:'Gain 5 + {2|3} Guard per Waypoint. <b>Expedition.</b>',p:f=>f.blk(5+f.v(2,3)*f.wpCount())});
K('cache',{e:'📦',wpGuard:1,d:'Waypoint: at the start of your turn, gain {3|4} Guard. Decamp: gain {6|8} Guard.',wp:f=>f.blk(f.v(3,4)),decamp:f=>{f.blk(f.v(6,8));log('📦 Decamp: Supply Cache')}});
// Cohesion pass: Lookout now draws 1 (it used to queue a Chart prompt every turn).
K('lookout',{e:'🗼',d:'Waypoint: at the start of your turn, draw 1.{| Also apply 1 Soaked to the strongest enemy.}',wp:f=>{W.cb.wpDraw++;if(f.u){const t=strongest();if(t)addSt(t,'weak',1)}}});
K('shortcut',{e:'🪜',d:'Draw the card at position {3|3 or 4} of your draw pile. It costs 0 this turn.',p:f=>{const cb=W.cb;const take=k=>{refill(k+1);if(cb.draw.length>k){const c=cb.draw.splice(k,1)[0];c.tmp0=true;cb.hand.push(c);log('🪜 Shortcut to '+cname(c))}else if(cb.draw.length){const c=cb.draw.pop();c.tmp0=true;cb.hand.push(c)}};
 refill(4);if(f.u&&cb.draw.length>3)f.choose('Shortcut: which card?',[{l:'#3 '+cname(cb.draw[2]),card:{id:cb.draw[2].id,up:cb.draw[2].up},cap:'#3 in the pile',f:()=>take(2)},{l:'#4 '+cname(cb.draw[3]),card:{id:cb.draw[3].id,up:cb.draw[3].up},cap:'#4 in the pile',f:()=>take(3)}]);else take(2)}});
K('landslide',{e:'⛰️',d:'Deal {8|10} + 2 per Waypoint to ALL. <b>Expedition.</b>',p:f=>f.all(f.v(8,10)+2*f.wpCount())});
K('watch',{e:'🏯',d:'Waypoint: at the start of your turn, apply 1 Exposed to a random enemy.',wp:f=>{const t=randAlive();if(t)addSt(t,'vuln',1)}});
// v2.2 (data-v2.json `v22`): Waystation Advances another random Waypoint each turn (upgraded: you choose, after the draw).
K('waystation',{e:'🚉',d:'Waypoint: at the start of your turn, Advance another random Waypoint.{| You choose which one.}',wp:f=>{const w=f.ci,cb=W.cb;
 const ok=cb.slots.filter(x=>x!==w&&(x.rank||0)<CORE.carto.rank_max);if(!ok.length)return;
 if(!f.u||ok.length===1)return rankUp(pick(ok,'combat'),'Waystation');
 thisTurn({id:'waystation',on:{afterDraw(inst){if(inst.dead)return;inst.dead=true;const ok2=cb.slots.filter(x=>x!==w&&(x.rank||0)<CORE.carto.rank_max);if(!ok2.length)return;
  choose('Waystation: Advance which Waypoint?',ok2.map(x=>({l:(CARDS[x.id].e||'')+' '+cname(x)+' (Rank '+(x.rank||0)+' → '+((x.rank||0)+1)+')',card:{id:x.id,up:x.up,rank:x.rank},cap:'Rank '+(x.rank||0)+' → '+((x.rank||0)+1),f:()=>rankUp(x,'Waystation')})))}}})}});
K('triang',{e:'📐',xu:0,d:'Trigger all your Waypoints.{ Sink.|}',p:f=>{const cb=W.cb;cb.wpDraw=0;[...cb.slots].forEach(trigWp);const d=cb.wpDraw;cb.wpDraw=0;if(d)drawCards(d)}});
K('camp',{e:'🏰',wpGuard:1,d:'Waypoint: at the start of your turn, gain {5|6} Guard.',wp:f=>f.blk(f.v(5,6))});
K('foreknow',{e:'🔮',d:'If the top card of your draw pile is an Attack, deal {6|9}. If it\'s a Skill, gain {6|9} Guard. Then draw it.',p:f=>{refill(1);const t=W.cb.draw[0];if(!t)return;const ty=CARDS[t.id].t;if(ty==='A')f.dmg(f.v(6,9));else if(ty==='S')f.blk(f.v(6,9));drawCards(1)}});
K('grand',{e:'🌐',d:'You have 4 Waypoint slots.{| Also Chart 3.}',p:f=>{W.cb.nslots=Math.max(W.cb.nslots,4);if(f.u)f.chart(3)},power:{}});
K('known',{e:'🗾',d:'Draw 1 extra card each turn (5 instead of 4).',power:{mod:{drawCount(inst,ctx,v){return v+1}}}});
K('finaldest',{e:'🏁',d:'Deal {6|8} per Waypoint. Then destroy a Waypoint and deal 6 more. <b>Expedition.</b>',p:f=>{const n=f.wpCount();if(n)f.dmg(f.v(6,8)*n);
 if(W.cb.slots.length)W.cb.mode={k:'slot',title:'Journey\'s End: destroy which Waypoint?',then:i=>{const w=removeWp(i,'destroyed');log('🏁 '+cname(w)+' destroyed');f.dmg(6)}}}});
