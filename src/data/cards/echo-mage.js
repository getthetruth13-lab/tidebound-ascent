// data/cards/echo-mage.js — Echo Mage Phase 1 cards. The Marked card repeats at end of turn with +1 per card
// played after it (max +1); unmarked → the last non-Faint card at quarter strength. Sustain N: +N permanently each time it Echoes.
import {W} from '../../core/state.js';
import {card} from './loader.js';
import {cname} from '../../engine/cards.js';
import {alive,log,addSt,addCard} from '../../engine/combat.js';
import {ask} from './kit.js';
const E=(id,o)=>card('echo',id,o);
const playedNow=f=>W.cb.stat.playedTurn+(f.echo?0:1);
E('arc',{e:'⚡',rk:{max:4},d:'Deal {7|10|+2,1,1,1}.',p:f=>f.dmg(f.r(7,10,'2,1,1,1'))});
E('shimmer',{e:'🔷',rk:{max:5},d:'Gain {5|8|+} Guard.',p:f=>f.blk(f.r(5,8))});
E('reverb',{e:'📣',rk:{max:5},d:'Deal {6|8|+}. <b>Resound:</b> deal {10|13|+} instead.',p:f=>f.dmg(f.echo?f.r(10,13):f.r(6,8))});
E('hum',{e:'🎶',rk:{max:5},d:'Draw {1|2}.{@2| Gain [0|0|+] Guard.} Faint.',p:f=>{f.draw(f.v(1,2));if(f.lvl>=2)f.blk(f.r(0,0))}});
E('ping',{e:'🔹',d:'Choose: deal {3|5}; or add 1 Note to your hand.',p:f=>ask(f,'Ping',[{l:'Deal '+f.v(3,5),f:()=>f.dmg(f.v(3,5))},{l:'Add 1 Note',f:()=>addCard('note','hand')}])});
E('mirror',{e:'🪞',d:'Choose: gain {8|11} Guard; or gain {3|5} Guard and draw 2 next turn.',p:f=>ask(f,'Mirror Step',[{l:'Gain '+f.v(8,11)+' Guard',f:()=>f.blk(f.v(8,11))},{l:'Gain '+f.v(3,5)+' Guard; draw 2 next turn',f:()=>{f.blk(f.v(3,5));W.cb.nextDraw+=2}}])});
E('afterimg',{e:'👥',d:'Deal {5|7}. Apply 1 Soaked.',fx:[['dmg',5,7],['weak',1]]});
E('lownote',{e:'🎵',d:'Gain {4|6} Guard. The next card you play this turn costs 1 less. Faint.',p:f=>{f.blk(f.v(4,6));const src=f.ci;
 f.thisTurn({id:'lownote',mod:{cost(inst,ctx,v){return ctx.card===src&&!f.echo?v:v-1}},on:{cardPlayed(inst,ctx){if(ctx.card!==src||f.echo)inst.dead=true}}})}});
E('crackle',{e:'✨',d:'Deal {3|4} to ALL. <b>Resound:</b> apply 2 Exposed to ALL.',p:f=>{f.all(f.v(3,4));if(f.echo)alive().forEach(e=>f.vuln(2,e))}});
E('prism',{e:'💎',sus:2,d:'Deal {11|14}. Sustain 2.',fx:[['dmg',11,14]]});
E('cascade',{e:'🌠',d:'Deal {4|5} × cards played this turn (counting this). Faint.',p:f=>f.dmg(f.v(4,5)*playedNow(f))});
E('feedback',{e:'🔊',d:'Deal {7|9}. <b>Resound:</b> deal {9|12} instead.',p:f=>f.dmg(f.echo?f.v(9,12):f.v(7,9))});
E('delay',{e:'⏳',d:'Gain {7|9} Guard. <b>Resound:</b> gain {9|12} instead.',p:f=>f.blk(f.echo?f.v(9,12):f.v(7,9))});
E('overtone',{e:'🎼',d:'This turn, your Echo happens twice. Faint.',p:f=>f.thisTurn({id:'overtone',mod:{echoPlan(inst,ctx,p){return {...p,repeats:p.repeats+1}}}})});
E('recall',{e:'↩️',xu:1,d:'Return the last card you played (not a Reprise) to your hand. It costs 0 this turn. Sink. Faint.{| Draw 1.}',p:f=>{const cb=W.cb,l=cb.last;
 if(!l||l.id==='recall'){log('Nothing to recall')}else{const i=cb.disc.indexOf(l);if(i>=0){cb.disc.splice(i,1);l.tmp0=true;cb.hand.push(l);log('↩️ Recalled '+cname(l))}else log('Can\'t recall '+cname(l)+' (not in discard)')}
 if(f.u)f.draw(1)}});
E('amplify',{e:'📢',d:'Your next Echo this turn is doubled. Faint.',p:f=>f.thisTurn({id:'amplify',mod:{echoPlan(inst,ctx,p){return p.mult>1||ctx.slot===2?p:{...p,mult:2}}}})});
E('standing',{e:'〰️',d:'Your first Echo each turn happens one extra time.',power:{mod:{echoPlan(inst,ctx,p){return ctx.slot===2?p:{...p,repeats:p.repeats+1}}}}});
E('silence',{e:'🤫',tg:1,d:'Remove all Guard from the target. Apply 2 Exposed. <b>Resound:</b> also apply 2 Soaked.',p:f=>{const t=f.tg;if(!t)return;t.block=0;f.vuln(2);if(f.echo)f.weak(2)}});
E('crescendo',{e:'🎺',sus:5,d:'Deal {10|14}. Sustain 5.',fx:[['dmg',10,14]]});
