// data/cards/duelist-pool.js — Duelist Phase 2 pool (56 cards). Archetypes: Flourish (FL: build and cash out Momentum),
// Riposte (RP: Parry, Retort, read the intent), Bleed (BL: stack Bleed, then cash it out).
// v2.1: Momentum max 5, starts at 1, fades 1 per turn, −1 on unblocked hits. Flourish ×(1 + ½ per Momentum) ≤ ×3.5.
// Parry reduces the first enemy Attack and reflects half, once per enemy turn. Bleed ≤ 20 per enemy.
import {W} from '../../core/state.js';
import {card} from './loader.js';
import {alive,hit,addSt,gainBlock,gainMom,gainEnergy,drawCards,loseHpEnemy,dmgEnemy,flourishMin,intentOf} from '../../engine/combat.js';
import {DU,ask,afterPlay,thisTurn,forCombat,callout,log,floatText,addParry,bleed,stacks} from './kit.js';
const D=(id,o)=>card('duel',id,o);
const mom=()=>W.cb.mom;
const retort=()=>!!W.cb.retortOk;
// Bleed on every enemy this card hit (ALL attacks) or on its target.
const bleedHit=(f,n,all)=>{(all?alive():[f.tg]).forEach(t=>bleed(t,n))};
// Momentum gained AFTER the engine's own step (Flourish resets Momentum after the card resolves).
const momAfter=(f,n,why)=>afterPlay(f,()=>{const g=gainMom(n);if(g)floatText('p','+'+g+' Momentum'+(why?' ('+why+')':''),'')});
// ---------------- Common ----------------
D('nick',{e:'🩸',d:'Deal 2. Apply {2|3} Bleed.',p:f=>{f.dmg(2);bleed(f.tg,f.v(2,3))}});
D('serrate',{e:'🪚',d:'Deal {6|8}. Apply {3|4} Bleed.',p:f=>{f.dmg(f.v(6,8));bleed(f.tg,f.v(3,4))}});
D('quickstep',{e:'👟',d:'Gain {5|8} Guard. Gain 1 Momentum.',fx:[['block',5,8],['mom',1]]});
D('advance',{e:'➡️',d:'Deal {6|9}. If you have 2+ Momentum, draw 1.',p:f=>{const ok=mom()>=2;f.dmg(f.v(6,9));if(ok)f.draw(1)}});
D('hiltguard',{e:'🛡️',d:'Parry {4|6}. Gain {4|6} Guard.',fx:[['parry',4,6],['block',4,6]]});
D('retort',{e:'💬',d:'Deal {7|9}. <b>Retort:</b> deal {7|9} more.',p:f=>{const r=retort();f.dmg(f.v(7,9),r?2:1);if(r)callout('RETORT!','parry')}});
D('twincuts',{e:'✂️',d:'Choose: deal {4|6} twice; or deal {6|8} and apply {3|4} Bleed (one Attack).',p:f=>ask(f,'Twin Cuts',[{l:'Deal '+f.v(4,6)+' twice',f:()=>f.dmg(f.v(4,6),2)},{l:'Deal '+f.v(6,8)+'; apply '+f.v(3,4)+' Bleed',f:()=>{f.dmg(f.v(6,8));bleed(f.tg,f.v(3,4))}}])});
D('hamstring',{e:'🦵',d:'Deal {5|7}. Apply 1 Soaked and {2|3} Bleed.',p:f=>{f.dmg(f.v(5,7));f.weak(1);bleed(f.tg,f.v(2,3))}});
D('measure',{e:'📏',tg:1,d:'If the target intends to attack, Parry {5|8}. Otherwise gain 1 Momentum.',p:f=>{const i=f.intent();if(i&&i.attacking)f.parry(f.v(5,8));else{f.mom(1);floatText('p','+1 Momentum','')}}});
D('hiltsmash',{e:'🔨',d:'Deal {8|10}. Apply 1 Soaked.',fx:[['dmg',8,10],['weak',1]]});
D('fleche',{e:'🏹',d:'Deal {7|10}. Gain 1 extra Momentum.',p:f=>{f.dmg(f.v(7,10));momAfter(f,1,'Flèche')}});
D('sidestep',{e:'💃',d:'Choose: Parry {9|12}; or gain 2 Momentum.',p:f=>ask(f,'Sidestep',[{l:'Parry '+f.v(9,12),f:()=>f.parry(f.v(9,12))},{l:'Gain 2 Momentum',f:()=>f.mom(2)}])});
D('glancing',{e:'🌙',d:'Deal {6|8}. Gain {3|5} Guard.',fx:[['dmg',6,8],['block',3,5]]});
D('bleededge',{e:'🗡️',d:'Your next Attack this turn also applies {3|4} Bleed. Draw 1.',p:f=>{const n=f.v(3,4),src=f.ci;
 thisTurn({id:'bleededge',on:{cardPlayed(inst,ctx){if(inst.dead||ctx.card===src||ctx.type!=='A')return;inst.dead=true;const all=ctx.f&&ctx.f.def&&/ALL/.test(ctx.f.def.d);bleedHit(ctx.f,n,all);log('🗡️ Bleeding Edge: +'+n+' Bleed')}}});f.draw(1)}});
D('disengage',{e:'🔙',d:'Gain {8|11} Guard. Your Momentum doesn\'t fade at the end of this turn.',p:f=>{f.blk(f.v(8,11));W.cb.keepMom=true;floatText('p','🔒 Momentum held','')}});
D('readystance',{e:'🧍',d:'Parry {7|9}. If you have 0 Momentum, gain 1.',p:f=>{f.parry(f.v(7,9));if(mom()===0)f.mom(1)}});
D('salute',{e:'🫡',d:'Gain 1 Momentum. Your next Parry this turn is +{3|5}.',p:f=>{f.mom(1);const n=f.v(3,5);thisTurn({id:'salute',mod:{parry(inst,ctx,v){if(inst.dead)return v;inst.dead=true;return v+n}}})}});
// Pierce: Guard is set aside for this hit and restored afterwards ("ignores", not "removes").
D('pierce',{e:'📌',d:'Deal {13|17}. This damage ignores Guard.',p:f=>{const t=f.tg;if(!t)return;const b=t.block;t.block=0;f.dmg(f.v(13,17));t.block+=b;if(b)floatText(t.uid,'📌 through Guard','')}});
D('rend',{e:'🐾',d:'Deal 4, +{2|3} for each Bleed on the target (max +{10|15}).',p:f=>{const t=f.tg;const b=t?t.st.bleed||0:0;f.dmg(4+Math.min(f.v(10,15),f.v(2,3)*b))}});
D('taunt',{e:'😤',tg:1,d:'Apply {2|3} Exposed. Parry {4|6}.',fx:[['vuln',2,3],['parry',4,6]]});
D('bounding',{e:'🦘',d:'Gain 2 Momentum. Gain {3|5} Guard.',fx:[['mom',2],['block',3,5]]});
D('wildswing',{e:'🪓',d:'Deal {12|16}. Lose all Momentum.',p:f=>{f.dmg(f.v(12,16));afterPlay(f,()=>{if(W.cb.mom){floatText('p','−'+W.cb.mom+' Momentum','');W.cb.mom=0}})}});
D('bloodletter',{e:'🩸',d:'Deal {5|7} to ALL. Apply {1|2} Bleed to ALL (one Attack).',p:f=>{f.all(f.v(5,7));bleedHit(f,f.v(1,2),true)}});
D('buckler',{e:'🛡️',d:'Deal {4|6} + your current Parry (max +20).',p:f=>f.dmg(f.v(4,6)+Math.min(20,W.cb.parry))});
D('spin',{e:'🌀',d:'Deal {3|4} to ALL twice (one Attack).',fx:[['all',3,4,2]]});
D('enpassant',{e:'♟️',d:'Can only be played with 1+ Momentum. Deal {4|6}.',req:f=>W.cb.mom>=1,fx:[['dmg',4,6]]});
// ---------------- Uncommon ----------------
D('lacerate',{e:'🔪',d:'Deal {3|5}. Double the target\'s Bleed. Sink.',p:f=>{const t=f.tg;f.dmg(f.v(3,5));if(t&&t.hp>0&&t.st.bleed){const b=t.st.bleed;bleed(t,b);callout('LACERATE 🩸'+(t.st.bleed||0),'bleed')}}});
D('openveins',{e:'💉',d:'Whenever you apply Bleed, apply 1 more.',power:{mod:{applyStatus(inst,ctx,v){return ctx.key==='bleed'&&!ctx.player&&v>0?v+stacks(inst):v}}}});
// Return Blow: once the first Parry triggers, it is re-armed for a second Attack that enemy turn.
D('returnblow',{e:'🔁',d:'Your Parry can trigger twice each enemy turn.',power:{on:{parry(inst){const cb=W.cb;if(inst.rbT===cb.turn)return;inst.rbT=cb.turn;cb.parryUsed=false;log('🔁 Return Blow: Parry ready again')}}}});
D('ironwrist',{e:'✊',d:'Whenever your Parry triggers, gain 1 Momentum next turn.{| Also gain 3 Guard.}',power:{on:{parry(inst){const cb=W.cb,n=stacks(inst);cb.nextTurnQ.push(()=>{gainMom(n);log('✊ Iron Wrist: +'+n+' Momentum')});if(inst.up)gainBlock(3*n,{fromCard:true})}}}});
D('tempothrust',{e:'⏱️',d:'Deal {6|9}. If this is a Flourish, gain 2 Momentum afterward.',p:f=>{f.dmg(f.v(6,9));if(f.flourish)momAfter(f,2,'Tempo')}});
D('dancingsteel',{e:'💃',d:'Your first Attack each turn gives 2 Momentum instead of 1.',power:{on:{cardPlayed(inst,ctx){if(ctx.type!=='A'||W.cb.stat.attacksTurn!==1||(ctx.f&&ctx.f.flourish))return;const g=gainMom(stacks(inst));if(g)floatText('p','💃 +'+g+' Momentum','')}}}});
D('crimsonfl',{e:'🌹',d:'Deal {8|10}. If this is a Flourish, apply Bleed equal to half the damage dealt.',p:f=>{const t=f.tg;f.dmg(f.v(8,10));if(f.flourish&&t){const n=Math.floor((f.lastDealt||0)/2);bleed(t,n);if(n)callout('CRIMSON 🩸'+n,'bleed')}}});
D('stopthrust',{e:'✋',d:'Deal {7|9}. If the target intends to attack, apply 2 Soaked.',p:f=>{const i=f.intent();f.dmg(f.v(7,9));if(i&&i.attacking)f.weak(2)}});
D('bait',{e:'🪝',d:'Parry {10|14}. Gain 1 Exposed.',p:f=>{f.parry(f.v(10,14));addSt(W.cb.p,'vuln',1)}});
D('balestra',{e:'🦘',d:'Deal {10|14}. Gain 2 Momentum.',p:f=>{f.dmg(f.v(10,14));momAfter(f,2)}});
D('arterial',{e:'🩸',d:'Deal {10|13}. Apply {5|7} Bleed.',p:f=>{f.dmg(f.v(10,13));bleed(f.tg,f.v(5,7))}});
D('mirrorguard',{e:'🪞',tg:1,d:'Parry equal to the target\'s intended attack damage (max {20|30}).',p:f=>{const i=f.intent();const n=i&&i.attacking?Math.min(f.v(20,30),i.total):0;if(n)f.parry(n);else log('🪞 Mirror Guard: the target isn\'t attacking')}});
D('perfectread',{e:'👁️',d:'Parry {9|12}. If it triggers, draw 2 next turn.',p:f=>{f.parry(f.v(9,12));const turn=W.cb.turn;
 forCombat({id:'perfectread',on:{parry(inst){if(W.cb.turn!==turn||inst.dead)return;inst.dead=true;W.cb.nextDraw+=2;log('👁️ Perfect Read: draw 2 next turn')},turnStart(inst){if(W.cb.turn>turn)inst.dead=true}}})}});
D('whirlsteel',{e:'🌪️',d:'Deal {4|5} to ALL three times (one Attack).',fx:[['all',4,5,3]]});
D('lightfeint',{e:'🪶',xu:0,d:'Gain 2 Momentum.{ Sink.|}',fx:[['mom',2]]});
D('reckless',{e:'😵',d:'Gain 3 Momentum. Lose 3 HP.',p:f=>{f.mom(3);f.loseHp(3)}});
D('inches',{e:'📐',d:'Whenever you play an Attack, apply 1 Bleed to its target.',power:{on:{cardPlayed(inst,ctx){if(ctx.type!=='A'||!ctx.f)return;const t=ctx.f.tg;if(t)bleed(t,stacks(inst))}}}});
D('saltedblade',{e:'🧂',d:'Your Attacks deal +{2|3} to enemies with Bleed.',power:{mod:{damageAdd(inst,ctx,v){return ctx.attack&&ctx.target&&ctx.target.st.bleed?v+(inst.up?3:2)*stacks(inst):v}}}});
D('bindparry',{e:'🪢',d:'Parry {7|10}. Apply 1 Soaked to ALL.',p:f=>{f.parry(f.v(7,10));alive().forEach(e=>f.weak(1,e))}});
D('exsang',{e:'💧',tg:1,d:'The target loses HP equal to its Bleed. Bleed stays.',p:f=>{const t=f.tg;const b=t?t.st.bleed||0:0;if(!b){log('💧 Exsanguinate: no Bleed');return}loseHpEnemy(t,b,'bleed');callout('EXSANGUINATE −'+b,'bleed')}});
D('prisedefer',{e:'🔗',d:'Deal {8|11}. The target loses 1 Might this turn per Momentum you have.',p:f=>{const t=f.tg,n=mom();f.dmg(f.v(8,11));if(t&&t.hp>0&&n){t.st.mightTmp=(t.st.mightTmp||0)-n;floatText(t.uid,'−'+n+' Might','');log('🔗 '+t.n+' loses '+n+' Might this turn')}}});
// ---------------- Rare ----------------
D('crimsontide',{e:'🌊',d:'Apply {4|6} Bleed to ALL. Sink.',p:f=>{alive().forEach(e=>bleed(e,f.v(4,6)));callout('CRIMSON TIDE','bleed')}});
D('mastersrip',{e:'🤺',d:'Your Parry reflects its full value instead of half.',power:{mod:{parryReflect(inst,ctx,v){return Math.max(v,1)}}}});
D('endlessfl',{e:'♾️',d:'A Flourish leaves you with 1 Momentum instead of 0.',power:{mod:{momAfterFlourish(inst,ctx,v){return Math.max(v,1)}}}});
D('hemorrhage',{e:'🩸',d:'Bleed no longer decreases when it triggers.',power:{mod:{keepBleed(){return true}}}});
D('untouchable',{e:'🛡️',d:'Parry {20|26}. Sink.',p:f=>{f.parry(f.v(20,26));callout('UNTOUCHABLE','parry')}});
// Duel's End: the Bleed bonus is dealt once, not multiplied (combo audit: 26 × 3.5 + 20 = 111 max).
D('duelsend',{e:'⚰️',d:'Deal {20|26}. If this is a Flourish, also deal the target\'s Bleed (not multiplied).',p:f=>{const t=f.tg;f.dmg(f.v(20,26));
 if(f.flourish&&t&&t.hp>0&&t.st.bleed){const b=t.st.bleed;dmgEnemy(t,b);callout('DUEL\'S END +'+b+' 🩸','bleed')}}});
D('matador',{e:'🐂',d:'Whenever you Flourish, Parry {6|8}.',power:{on:{flourish(inst){addParry((inst.up?8:6)*stacks(inst))}}}});
D('bladewaltz',{e:'💃',d:'Your next 3 Attacks this turn cost 0.',p:f=>{let k=0;const src=f.ci;callout('BLADE WALTZ','flourish');
 thisTurn({id:'bladewaltz',mod:{cost(inst,ctx,v){return k<3&&ctx.def&&ctx.def.t==='A'?0:v}},on:{cardPlayed(inst,ctx){if(ctx.card!==src&&ctx.type==='A'&&++k>=3)inst.dead=true}}})}});
D('oath',{e:'📜',d:'Momentum doesn\'t fade. Whenever you Flourish with 5 Momentum, gain 1 Energy and draw 2.',power:{mod:{keepMomentum(){return true}},
 on:{flourish(inst,ctx){if(ctx.mom<5)return;const n=stacks(inst);gainEnergy(n);drawCards(2*n);callout('OATH! +1⚡ draw 2','flourish')}}}});

// Read the visible intent when played; the first Attack uses a normal Flourish at 2 Momentum for free.
D('keepersopening',{e:'👁️',d:'If an enemy intends to attack, your first Attack this turn is a free Flourish at 2 Momentum. Keep your Momentum. Sink.',p:f=>{
 if(W.cb.stat.attacksTurn||!alive().some(e=>intentOf(e).a))return;
 thisTurn({id:'keepersopening',mod:{flourishPlan(inst,ctx,v){
  if(inst.used)return v;inst.used=true;return {mom:2,free:true};
 }}});
}});
