// cards/act2/duel.js: later-act (Act 2 + Act 3) behaviour. Registered through N2() from kit2.js. See studio/design FULL-CARD-POOL.md.
import {W,pick} from '../../../core/state.js';
import {fire,mod,observeEvents} from '../../../core/bus.js';
import {alive,dmgEnemy,gainMom,gainBlock,intentOf,eAtk,isJunk,sinkCard,bonusEnergy,drawCards,choose,addSt} from '../../../engine/combat.js';
import {ask,thisTurn,forCombat,log,floatText,callout,bleed} from '../kit.js';
import {N2} from './kit2.js';
const N=N2('duel');

// ---------------- shared helpers ----------------
// Fight tracker (no engine change): Clean Answers (total and per enemy phase) and Attacks played per turn. Observer sees every fire().
const D=()=>{const cb=W.cb;return cb?(cb.dt||(cb.dt={clean:0,cleanBy:{},atk:{}})):null};
observeEvents((ev,ctx)=>{const cb=W.cb;if(!cb)return;
 if(ev==='cleanAnswer'){const d=D();d.clean++;d.cleanBy[cb.turn]=(d.cleanBy[cb.turn]||0)+1}
 else if(ev==='cardPlayed'&&ctx.type==='A'){const d=D();d.atk[cb.turn]=(d.atk[cb.turn]||0)+1}},{replay:true});
// A debuff put on an enemy while it is acting would tick at once; hold it so it lasts into your turn.
const holdDebuff=(e,k)=>{if(W.cb&&W.cb.acting===e)(e.hold=e.hold||{})[k]=1};
// "Your next Attack this turn ...": runs fn(f,targetsHit) once that Attack has fully resolved.
const nextAttack=(id,fn)=>thisTurn({id,on:{
 beforeCardPlay(inst,ctx){if(inst.dead||inst.f||!ctx.f.def||ctx.f.def.t!=='A')return;inst.f=ctx.f;inst.hit=new Set()},
 damageDealt(inst,ctx){if(inst.f&&ctx.f===inst.f)inst.hit.add(ctx.target)},
 cardPlayed(inst,ctx){if(!inst.f||ctx.f!==inst.f)return;inst.dead=true;fn(ctx.f,[...inst.hit])}}});
const fightId=()=>W.cb?W.cb.ens.map(e=>e.uid).join(','):'';
const attackFirstHit=(t,q)=>eAtk(t,q.a,{str:0,vuln:!!W.cb.p.st.vuln},true);

// ---------------- Common ----------------
N('bait',{e:'🪤',tg:1,d:'Call a Parry of {10|12} on one enemy. Gain 1 Exposed.',p:f=>{f.parry(f.v(10,12));if(W.cb)addSt(W.cb.p,'vuln',1)}});
N('bleededge',{e:'🩸',d:'Your next Attack this turn also applies {3|4} Bleed. Draw 1.',p:f=>{const n=f.v(3,4);
 nextAttack('bleededge',(af,ts)=>{for(const t of ts)bleed(t,n)});f.draw(1)}});
N('rapidcuts',{e:'⚡',d:'Deal {3|4} three times (one Attack: Bleed and Momentum count once).',p:f=>{const n=f.v(3,4);const before=alive().map(e=>[e,!!e.armSpent]);
 f.dmg(n);if(!W.cb)return;if(before.some(([e,s])=>!s&&e.armSpent))return; // a plated target soaks the whole card
 f.dmg(n,2)}});
N('counterthrust',{e:'🤺',d:'Deal {5|7}. Call a Parry of {5|7} on the target.',p:f=>{const t=f.tg;f.dmg(f.v(5,7));if(!W.cb||!t||t.hp<=0)return;f.parry(f.v(5,7),t)}});
N('catchbreath',{e:'😮‍💨',d:'Gain {3|4} Guard for each Momentum you have (minimum 3). Does not spend it.',p:f=>f.blk(f.v(3,4)*Math.max(1,W.cb.mom))});
N('whettededge',{e:'🗡️',d:'This turn your Attacks deal {3|4} more per hit (added before a Flourish multiplier). Draw 1.',p:f=>{const n=f.v(3,4);
 thisTurn({id:'whettededge',mod:{damageAdd(inst,ctx,v){return ctx.attack?v+n:v}}});f.draw(1)}});
N('dancingsteel',{e:'🕺',power:{on:{cardPlayed(inst,ctx){const cb=W.cb;if(ctx.type!=='A'||cb.stat.attacksTurn!==1||ctx.f.flourish||cb.enemyTurn)return;const g=gainMom(1);if(g)floatText('p','+'+g+' Momentum','')}}}});
N('oldscars',{e:'🩹',power:{on:{cardAdded(inst,ctx){const cb=W.cb;if(!ctx.card||!isJunk(ctx.card)||ctx.pile==='exh')return;const key=cb.turn+(cb.enemyTurn?'e':'');
 if(inst.k!==key){inst.k=key;inst.c=0}if(inst.c>=2)return;inst.c++;const g=gainMom(1);gainBlock(3);if(g)floatText('p','+'+g+' Momentum','')}}}});
N('lastcut',{e:'🔪',d:'Deal {6|8} and apply 3 Bleed. If this kills, apply its Bleed to a random other enemy.',p:f=>{const t=f.tg;f.dmg(f.v(6,8));if(!W.cb||!t)return;
 if(t.hp>0){bleed(t,3);return}
 const others=alive().filter(e=>e!==t);if(!others.length)return;const o=pick(others,'combat');const n=(t.st.bleed||0)+3;bleed(o,n);log('🔪 Last Cut: '+n+' Bleed passes to '+o.n)}});
N('patchedguard',{e:'🧵',tg:1,d:'Call a Parry of {5|7} on one enemy. Sink up to 2 Flotsam or Burdens from your hand and add 4 to the Parry for each.',p:f=>{
 const cb=W.cb;const junk=cb.hand.filter(isJunk).slice(0,2);for(const ci of junk){cb.hand.splice(cb.hand.indexOf(ci),1);sinkCard(ci,'patchedguard')}
 if(junk.length)log('🧵 Patched Guard: Sank '+junk.length);f.parry(f.v(5,7)+4*junk.length)}});
// ---------------- Uncommon ----------------
N('lacerate',{e:'🩸',d:'Deal {3|5}. Double the target\'s Bleed (max 20). Sink.',p:f=>{const t=f.tg;f.dmg(f.v(3,5));if(!W.cb||!t||t.hp<=0)return;const b=t.st.bleed||0;if(b>0){bleed(t,b);callout('LACERATE ×2','bleed')}}});
N('saltedblade',{e:'🧂',power:{mod:{damageAdd(inst,ctx,v){if(!ctx.attack||!ctx.target||!ctx.target.st.bleed||!ctx.f)return v;const s=ctx.f._salted||(ctx.f._salted=new Set());
 if(s.has(ctx.target))return v;s.add(ctx.target);return v+(inst.up?3:2)}}}});
N('buckler',{e:'🛡️',d:'Deal {4|6}, plus the total Parry you have called this turn (max +20). The Parry stays.',p:f=>{const tot=Object.values(W.cb.parries||{}).reduce((a,b)=>a+b,0);f.dmg(f.v(4,6)+Math.min(20,tot))}});
N('unhand',{e:'✋',tg:1,d:'The target loses {2|3} Might for this fight. Sink.',p:f=>{const t=f.tg;if(t)addSt(t,'str',-f.v(2,3))}});
N('keepscore',{e:'📒',d:'Deal {4|5} for each Clean Answer and each Flourish you have made this fight (max {24|30}).',p:f=>{const d=D();const n=Math.min(6,d.clean+W.cb.stat.flourishes);f.dmg(f.v(4,5)*n)}});
N('readreply',{e:'📖',power:{on:{cleanAnswer(inst){const cb=W.cb;if(inst.k!==cb.turn){inst.k=cb.turn;inst.c=0}if(inst.c>=2)return;inst.c++;drawCards(1)}}}});
N('openedguard',{e:'🚪',power:{on:{parry(inst,ctx){const e=ctx.enemy;if(!e||e.hp<=0||!(ctx.reflected>=1))return;addSt(e,'vuln',1);holdDebuff(e,'vuln')}}}});
N('readwound',{e:'🔍',d:'Parries you call on a Bleeding enemy gain +1 for each Bleed on it (max +{6|8}).',power:{on:{parryCalled(inst,ctx){const e=ctx.enemy,cb=W.cb;if(!e||!e.st.bleed||ctx.reading)return;
 const x=Math.min(inst.up?8:6,e.st.bleed);cb.parries[e.uid]+=x;floatText(e.uid,'🔍 +'+x,'b')}}}});
N('beataside',{e:'💢',d:'Remove all Guard from the target, then deal {6|8}.',p:f=>{const t=f.tg;if(t&&t.block>0){floatText(t.uid,'-'+t.block+'🛡','');t.block=0}f.dmg(f.v(6,8))}});
N('rhythmdrill',{e:'🥁',d:'Gain 1 Momentum for each Attack you played last turn (max {3|4}).',p:f=>{const cb=W.cb;const n=Math.min(f.v(3,4),(D().atk[cb.turn-1])||0);if(n){const g=f.mom(n);if(g)floatText('p','+'+g+' Momentum','')}}});
N('checkswing',{e:'🛑',tg:1,d:'Call a Parry of {10|12} on one enemy. If it is a Clean Answer and that enemy was winding up, it loses that attack.',p:f=>{
 const t=f.tg,cb=W.cb;if(!t)return;const m=intentOf(t),q=t.queued;const winding=!!(m&&m.charge&&q&&q.a);
 const got=f.parry(f.v(10,12),t);if(!winding||got<=0||!W.cb)return;
 if((cb.parries[t.uid]||0)>=attackFirstHit(t,q)){t.queued=null;floatText(t.uid,'🛑 Thrown off','b');callout('CHECKED!','parry');log('🛑 Check the Swing: '+t.n+' loses its attack');
  gainMom(mod('cleanMom',{enemy:t},1));fire('cleanAnswer',{enemy:t,reduced:0})}}});
N('bladewaltz',{e:'💃',d:'Your next 3 Attacks this turn cost 0. Sink.',p:f=>{thisTurn({id:'bladewaltz',n:0,mod:{cost(inst,ctx,v){return !inst.dead&&ctx.def&&ctx.def.t==='A'&&ctx.def.c!=='X'?0:v}},
 on:{cardPlayed(inst,ctx){if(ctx.type==='A'&&!inst.dead&&++inst.n>=3)inst.dead=true}}})}});
N('waitingedge',{e:'⏳',moor:1,on:{turnEndInHand(ci){const k=fightId();if(ci.hf!==k){ci.hf=k;ci.held=0}ci.held++}},
 d:'Moor. Deal {9|11}, +4 for each end of turn it was held (max +12).',p:f=>{const ci=f.ci;const held=ci.hf===fightId()?ci.held||0:0;ci.held=0;f.dmg(f.v(9,11)+Math.min(12,4*held))}});
N('prisedefer',{e:'🗡️',d:'Deal {8|10}. The target loses 1 Might for each Momentum you have, until the end of its next turn.',p:f=>{const t=f.tg,cb=W.cb;const m=f.flourish?f.savedMom:cb.mom;f.dmg(f.v(8,10));
 if(!W.cb||!t||t.hp<=0||m<=0)return;if(t.st.ward>0){t.st.ward--;if(!t.st.ward)delete t.st.ward;floatText(t.uid,'Rebuffed','b');return}
 t.st.mightTmp=(t.st.mightTmp||0)-m;floatText(t.uid,'−'+m+' Might','')}});
N('honing',{e:'🪨',power:{on:{flourish(inst){inst.g=inst.g||0;if(inst.g>=3)return;inst.g++;addSt(W.cb.p,'str',1);floatText('p','+1 Might','')}}}});
N('festering',{e:'🦠',power:{on:{turnStart(){for(const e of alive())if(e.st.bleed)bleed(e,1)}}}});
N('unhurt',{e:'🧘',power:{on:{playerDamaged(inst){inst.hurt=true},turnStart(inst){inst.hurt=false},
 roundEnd(inst){const cb=W.cb;if(!inst.hurt){cb.pendingE=(cb.pendingE||0)+1;floatText('p','🧘 +1⚡ next turn','')}inst.hurt=false}}}});
const DEBUFFS=['weak','vuln','bleed','brittle','drench','reson'];
const foeCount=e=>DEBUFFS.filter(k=>e.st[k]>0).length+((e.st.str||0)<0?1:0);
const pickFoe=(inst,title)=>{const al=alive();if(!al.length)return;const set=e=>{inst.foe=e;floatText(e.uid,'⚔️ Sworn Foe','');log('⚔️ Sworn Foe: '+e.n)};
 if(al.length===1)return set(al[0]);choose(title||'Sworn Foe',al.map(e=>({l:'Swear on '+e.n,f:()=>set(e)})))};
N('swornfoe',{e:'⚔️',d:'Choose an enemy. Your Attacks on it deal +2 for each of your debuffs on it (max +{8|12}).',p:f=>{
 const inst=W.cb.powers.find(q=>q.id===f.ci.id);if(inst)ask(f,'Sworn Foe',alive().map(e=>({l:'Swear on '+e.n,auto:alive().length===1,f:()=>{inst.foe=e;floatText(e.uid,'⚔️ Sworn Foe','')}})))},
 on:{turnStart(inst){if(!inst.foe||inst.foe.hp<=0)pickFoe(inst)}},
 mod:{damageAdd(inst,ctx,v){return ctx.attack&&inst.foe&&ctx.target===inst.foe&&inst.foe.hp>0?v+Math.min(inst.up?12:8,2*foeCount(inst.foe)):v}}});
N('bledwhite',{e:'🥀',d:'Enemies with Bleed deal 1 less with each Attack hit for every 2 Bleed they have (max -{4|5}).',power:{mod:{intentDisplay(inst,ctx,m){
 const e=ctx.enemy;if(!m||!m.a||!e||!e.st.bleed)return m;const r=Math.min(inst.up?5:4,Math.floor(e.st.bleed/2));return r>0?{...m,a:Math.max(0,m.a-r)}:m}}}});
N('tendcut',{e:'🩹',d:'Heal {4|5} HP for each Clean Answer you made last enemy phase (max {12|15}).',p:f=>{const n=Math.min(3,(D().cleanBy[W.cb.turn-1])||0);if(n)f.heal(f.v(4,5)*n)}});
// ---------------- Rare ----------------
N('oath',{e:'📜',power:{mod:{keepMomentum(){return true}},on:{flourish(inst,ctx){if(ctx.mom<5)return;bonusEnergy(1,'duel');drawCards(2)}}}});
N('mastersrip',{e:'↩️',power:{mod:{parryReflect(inst,ctx,v){return typeof v==='object'?v:1}}}});
N('returnblow',{e:'🔁',power:{mod:{parryKeep(inst,ctx,v){const cb=W.cb;if(inst.k!==cb.turn){inst.k=cb.turn;inst.c={}}return v||!(inst.c[ctx.enemy.uid]>=1)}},
 on:{parry(inst,ctx){const cb=W.cb;if(!ctx.enemy)return;if(inst.k!==cb.turn){inst.k=cb.turn;inst.c={}}inst.c[ctx.enemy.uid]=(inst.c[ctx.enemy.uid]||0)+1}}}});
N('crimsontide',{e:'🌊',d:'Whenever Bleed makes an enemy lose HP, deal half that much to every other enemy (rounded down, max 10 each).',power:{mod:{bleedDamage(inst,ctx,v){
 const n=Math.min(10,Math.floor(Math.ceil(v)/2));if(n<=0)return v;for(const x of alive()){if(x===ctx.target)continue;dmgEnemy(x,n);if(!W.cb)return v}return v}}}});
N('platepoint',{e:'🪚',d:'Lose all your Guard. Call a Parry on each attacking enemy equal to half the Guard lost (max {15|20} each).',p:f=>{const cb=W.cb;const lost=cb.p.block;
 if(lost>0){cb.p.block=0;floatText('p','-'+lost+'🛡','')}const n=Math.min(f.v(15,20),Math.floor(lost/2));if(n<=0)return;
 for(const e of alive()){const m=intentOf(e);if(m&&m.a>0)f.parry(n,e)}}});
N('tolast',{e:'🎯',tg:1,d:'Choose an enemy. For the rest of the fight you and that enemy are both Exposed (it does not fall). Sink.',p:f=>{const t=f.tg,cb=W.cb;if(!t)return;
 const keep=()=>{if(!W.cb||W.cb!==cb)return;cb.p.st.vuln=Math.max(1,cb.p.st.vuln||0);if(t.hp>0)t.st.vuln=Math.max(1,t.st.vuln||0)};keep();
 forCombat({id:'tolast',on:{roundEnd:keep,turnStart:keep}});floatText(t.uid,'🎯 Exposed','');log('🎯 To the Last: you and '+t.n+' are Exposed')}});
N('countertempo',{e:'⏱️',power:{mod:{cleanMom(inst,ctx,v){return v+1},cost(inst,ctx,v){return inst.free&&ctx.def&&ctx.def.t==='A'&&ctx.def.c!=='X'?0:v}},
 on:{cardPlayed(inst,ctx){const cb=W.cb;if(inst.free&&ctx.type==='A')inst.free=false;CT(inst,cb)},cleanAnswer(inst){CT(inst,W.cb)},turnStart(inst){inst.prev=W.cb.mom},
  turnEnd(inst){const cb=W.cb;if(inst.free&&inst.freeTurn<=cb.turn)inst.free=false}}}});
function CT(inst,cb){const m=cb.mom,key=cb.turn+(cb.enemyTurn?.5:0);
 if(m>=5&&(inst.prev||0)<5&&inst.usedKey!==key){inst.usedKey=key;inst.free=true;inst.freeTurn=cb.enemyTurn?cb.turn+1:cb.turn;floatText('p','⏱️ Next Attack free','')}inst.prev=m}
N('sweepblade',{e:'🌀',d:'Deal {9|12}. If this is a Flourish, it hits ALL enemies for its full multiplied damage.',p:f=>{if(f.flourish)f.all(f.v(9,12));else f.dmg(f.v(9,12))}});

// ENGINE-NEEDS:
// - Clean Answer / Flourish counts and "Attacks played last turn" (Keeping Score, Rhythm Drill, Tend the Cut) come from a module observer (observeEvents, cb.dt) in this file; a native cb.stat.cleanCombat / attacksLast / cleanLast would be sturdier (a combat restored mid-fight without replay would undercount).
// - Check the Swing: the engine's wind-up (enemy.queued, charge intent) never attacks on the turn it is shown, so a Parry could not be a Clean Answer there. Implemented as: if the Parry pool is at least the queued attack's first hit, the queued attack is cancelled now and the Clean Answer Momentum + cleanAnswer event happen at once.
// - Bait / Old Scars: the player's Exposed (Bait) uses the engine's normal decay (ticks at end of the enemy phase).
// - Rapid Cuts: "Armoured plate absorbs the whole card" is emulated by skipping hits 2-3 when hit 1 spent a plate.
// - Crimson Tide hooks the bleedDamage modifier (no dedicated 'bleedLoss' event exists); Return Blow uses parryKeep capped at 2 triggers per enemy per phase.
// - Old Scars: no engine "junk added" event beyond cardAdded; enemy-added junk through addCard is covered, junk created by direct pile pushes is not.
// - To the Last: permanent Exposed is re-applied at roundEnd/turnStart (no native "permanent" status flag).
