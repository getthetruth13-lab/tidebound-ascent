// data/cards/act1/duel.js — NEW Act 1 pool behaviour for this group (cards-act1). Owned by ONE worker; see CARDS_ACT1_HANDOFF.md.
// Register new ids with card('<cls>',id,{...}) and reworked ids with redef('<cls>',id,{...}). Unchanged cards stay in the old files.
// Duelist (FULL-CARD-POOL.md 4.A.1). Every Parry card calls its Parry on the card's target (tg:1).
import {card,redef} from '../loader.js';
import {W} from '../../../core/state.js';
import {mod} from '../../../core/bus.js';
import {alive,hit,loseHpEnemy,dmgEnemy,gainMom,callParry,intentOf,eAtk,isJunk,sinkCard,bonusEnergy} from '../../../engine/combat.js';
import {ask,afterPlay,thisTurn,forCombat,log,floatText,callout,bleed} from '../kit.js';
const N=(id,o)=>card('duel',id,o), R=(id,o)=>redef('duel',id,o);
// Scope a listener to the enemy phase that follows this player turn (pools are answered there).
const nextPhase=(id,spec)=>{const turn=W.cb.turn;const l=Object.assign({id,turn},spec);l.on=Object.assign({},spec.on,{turnStart(inst){if(W.cb.turn>turn)inst.dead=true}});forCombat(l);return l};
const live=(inst)=>!inst.dead&&W.cb&&W.cb.turn===inst.turn;
// First damaging hit of an enemy's intent (what a called Parry answers).
export const firstHit=e=>{const m=intentOf(e);return m&&m.a?eAtk(e,m.a):0};

// ---------------- Starters ----------------
R('parry',{e:'🛡️',tg:1,rk:{max:5},d:'Call a Parry of {5|8|+}.',p:f=>f.parry(f.r(5,8))});
R('lunge',{e:'🤺',rk:{max:5},d:'Deal {9|12|+}. Apply 2 Exposed.',p:f=>{f.dmg(f.r(9,12));f.vuln(2)}});
N('lightfeet',{e:'👣',rk:{max:5},d:'Gain {1|2} Momentum. Draw 1.{@2| Gain [0|0|+] Guard.}',p:f=>{f.mom(f.v(1,2));f.draw(1);if(f.lvl>=2)f.blk(f.r(0,0))}});
R('hiltguard',{e:'🛡️',tg:1,rk:{max:5},d:'Call a Parry of {4|6|+1,1,1,0}. Gain {4|6|+1,1,0,1} Guard.',p:f=>{f.parry(f.r(4,6,'1,1,1,0'));f.blk(f.r(4,6,'1,1,0,1'))}});
// ---------------- Common ----------------
R('advance',{e:'➡️',d:'Deal {6|8}. If you have 2 or more Momentum, draw 1.',p:f=>{const ok=W.cb.mom>=2;f.dmg(f.v(6,8));if(ok)f.draw(1)}});
R('sidestep',{e:'💃',tg:1,d:'Choose: Call a Parry of {9|11}; or gain 2 Momentum.',p:f=>ask(f,'Sidestep',[{l:'Call a Parry of '+f.v(9,11),f:()=>f.parry(f.v(9,11))},{l:'Gain 2 Momentum',f:()=>f.mom(2)}])});
N('bitteranswer',{e:'🩸',tg:1,d:'Call a Parry of {6|8}. If it is a Clean Answer, apply 3 Bleed to the attacker (once per enemy).',p:f=>{const t=f.tg;if(!f.parry(f.v(6,8)))return;
 const cb=W.cb;cb.bitter=cb.bitter||{};const key=t.uid; // cb.bitter is cleared every turn by startTurn
 nextPhase('bitteranswer',{on:{cleanAnswer(inst,ctx){if(!live(inst)||ctx.enemy!==t||cb.bitter[key])return;cb.bitter[key]=1;inst.dead=true;bleed(t,3);log('🩸 Bitter Answer: 3 Bleed on '+t.n)}}})}});
N('countedbreaths',{e:'🫁',d:'Gain 1 Momentum for each enemy that intends to attack (max 2). Your next Flourish this turn needs 1 less Momentum to start.',p:f=>{
 const n=Math.min(2,alive().filter(e=>{const m=intentOf(e);return m&&m.a}).length);if(n){const g=f.mom(n);if(g)floatText('p','+'+g+' Momentum','')}
 thisTurn({id:'countedbreaths',mod:{flourishMin(inst,ctx,v){return inst.dead?v:Math.max(1,v-1)}},on:{flourish(inst){inst.dead=true}}})}});
R('retort',{e:'💬',d:'Deal {7|9}. If your Parry triggered last enemy turn, deal {7|9} more.',p:f=>{const r=!!W.cb.retortOk;f.dmg(f.v(7,9),r?2:1);if(r)callout('RETORT!','parry')}});
R('disengage',{e:'🔙',d:'Gain {8|11} Guard. Your Momentum does not fade at the end of this turn.',p:f=>{f.blk(f.v(8,11));W.cb.keepMom=true;floatText('p','🔒 Momentum held','')}});
N('spite',{e:'😠',d:'Deal {6|8}, +3 for each Flotsam and Burden in your hand (max +9). Sink those cards.',p:f=>{const cb=W.cb;const junk=cb.hand.filter(isJunk);
 f.dmg(f.v(6,8)+Math.min(9,3*junk.length));for(const ci of junk){const i=cb.hand.indexOf(ci);if(i>=0){cb.hand.splice(i,1);sinkCard(ci,'spite')}}if(junk.length)log('😠 Spite: Sank '+junk.length+' junk')}});
// ---------------- Uncommon ----------------
R('exsang',{e:'💧',tg:1,d:'The target loses HP equal to its Bleed (ignores Guard). Bleed stays.',p:f=>{const t=f.tg;const b=t?t.st.bleed||0:0;if(!b){log('💧 Drain the Wound: no Bleed');return}
 loseHpEnemy(t,b,'bleed');callout('DRAIN −'+b,'bleed')}});
R('inches',{e:'📐',d:'Your first Attack each turn applies Bleed equal to your Momentum (max 5), after that Attack\'s own Bleed tick.',power:{on:{
 beforeCardPlay(inst,ctx){const d=ctx.f&&ctx.f.def;if(!d||d.t!=='A'||W.cb.stat.attacksTurn>0||inst.t===W.cb.turn)return;inst.t=W.cb.turn;inst.pend={f:ctx.f,m:Math.min(5,ctx.f.flourish?ctx.f.savedMom:W.cb.mom)}},
 cardPlayed(inst,ctx){const p=inst.pend;if(!p||ctx.f!==p.f)return;inst.pend=null;const t=p.f.tg;if(t&&p.m>0){bleed(t,p.m);log('📐 Death by Inches: '+p.m+' Bleed')}}}}});
R('tempothrust',{e:'⏱️',d:'Deal {6|8}. If this is a Flourish, return this card to your hand.',p:f=>{f.dmg(f.v(6,8));if(!f.flourish||f.echo)return;const ci=f.ci;
 afterPlay(f,()=>{const cb=W.cb;if(!cb)return;for(const pile of ['disc','exh']){const i=cb[pile].indexOf(ci);if(i>=0){if(cb.hand.length>=10)return;cb[pile].splice(i,1);cb.hand.push(ci);floatText('p','⏱️ Tempo Thrust returns','');return}}})}});
R('coup',{e:'💀',d:'Deal {12|15}. If this is a Flourish and it kills, gain 1 Energy and draw 2.',p:f=>{const t=f.tg;f.dmg(f.v(12,15));if(f.flourish&&t&&t.hp<=0){bonusEnergy(1,'duel');f.draw(2);log('💀 Coup! +1 Energy, draw 2')}}});
N('rashflourish',{e:'😵',cu:0,d:'Gain 3 Momentum. Lose 3 HP.',p:f=>{f.mom(3);f.loseHp(3)}});
// Riposte: this enemy's answer reflects min(stopped, 3 x Momentum) instead of half (half is suppressed, then the new reflect is dealt).
R('riposte',{e:'↪️',tg:1,rk:{max:5},d:'Call a Parry of {6|8|+2}. When it triggers, it reflects 3 for each Momentum you have (at most the damage it stopped) instead of half.',p:f=>{const t=f.tg;if(!f.parry(f.r(6,8,2)))return;
 nextPhase('riposte',{mod:{parryReflect(inst,ctx,v){if(!live(inst)||inst.done||ctx.enemy!==t)return v;inst.done=true;const n=Math.min(ctx.reduced,3*W.cb.mom);
   log('↪️ Riposte reflects '+n);if(n>0)callout('RIPOSTE ↩ '+n,'parry');return {abs:n}}}})}});
R('mirrorguard',{e:'🪞',tg:1,cu:0,d:'Call a Parry equal to the target\'s intended hit (max 20). A Clean Answer unless the hit grows.',p:f=>{const t=f.tg;const h=t?firstHit(t):0;
 if(!h){log('🪞 Mirror Guard: the target isn\'t attacking');return}const n=Math.min(20,h);if(t)callParry(t,Math.floor(n*f.mult))}});
N('twinanswer',{e:'⚔️',tg:1,d:'Call a Parry of {5|6} on each of two different enemies (one Parry of {5|6} if only one).',p:f=>{const t=f.tg;const n=f.v(5,6);f.parry(n,t);
 const others=alive().filter(e=>e!==t);if(!others.length)return;
 ask(f,'Twin Answer: second enemy',others.map(e=>({l:'Parry '+n+' on '+e.n,auto:others.length===1,f:()=>f.parry(n,e)})))}});
N('wallsteel',{e:'🧱',tg:1,d:'Full Flame. Call a Parry of {6|7} for each Energy spent on one enemy, as one pool.',p:f=>{if(!f.x){log('🧱 Wall of Steel: no Energy');return}f.parry(f.v(6,7)*f.x)}});
N('trimwick',{e:'🕯️',d:'Deal {6|8}. If you have 3 or more Momentum when you play it, this ignores Guard.',p:f=>{const t=f.tg;if(!t)return;const m=f.flourish?f.savedMom:W.cb.mom;
 if(m>=3){const b=t.block;t.block=0;f.dmg(f.v(6,8));t.block+=b;if(b)floatText(t.uid,'🕯️ through Guard','')}else f.dmg(f.v(6,8))}});
// ---------------- Rare ----------------
N('grudge',{e:'😤',d:'Each time you make a Clean Answer, that enemy takes +1 from your Attacks for the rest of the fight (max +5 per enemy).',power:{
 on:{cleanAnswer(inst,ctx){const e=ctx.enemy;if(!e)return;inst.g=inst.g||{};const was=inst.g[e.uid]||0;if(was>=5)return;inst.g[e.uid]=was+1;floatText(e.uid,'😤 Grudge +'+(was+1),'');log('😤 Grudge: '+e.n+' takes +'+(was+1))}},
 mod:{damageAdd(inst,ctx,v){return ctx.attack&&ctx.target&&inst.g&&inst.g[ctx.target.uid]?v+inst.g[ctx.target.uid]:v}}}});
R('matador',{e:'🐂',d:'Whenever you Flourish, Call a Parry of {6|8} on the attacking enemy with the biggest first hit.',power:{on:{flourish(inst){let best=null,bh=0;for(const e of alive()){const h=firstHit(e);if(h>bh){bh=h;best=e}}
 if(!best)return;const p=Math.floor(mod('parry',{card:null,f:null},inst.up?8:6));if(p>0)callParry(best,p)}}}});
// ---- Doc-tagged SAME cards whose shipped UPGRADE numbers differ from FULL-CARD-POOL.md 4.A.1 (base text unchanged) ----
const momAfter=(f,n)=>afterPlay(f,()=>{const g=gainMom(n);if(g)floatText('p','+'+g+' Momentum','')});
R('nick',{e:'🩸',d:'Deal {2|3}. Apply {2|3} Bleed.',p:f=>{f.dmg(f.v(2,3));bleed(f.tg,f.v(2,3))}});
R('hamstring',{e:'🦵',d:'Deal {5|7}. Apply 1 Soaked and 2 Bleed.',p:f=>{f.dmg(f.v(5,7));f.weak(1);bleed(f.tg,2)}});
R('bloodletter',{e:'🩸',d:'Deal {5|7} to ALL. Apply 1 Bleed to ALL (one Attack).',p:f=>{f.all(f.v(5,7));alive().forEach(e=>bleed(e,1))}});
R('fleche',{e:'🏹',d:'Deal {7|9}. Gain 1 extra Momentum.',p:f=>{f.dmg(f.v(7,9));momAfter(f,1)}});
R('salute',{e:'🫡',d:'Gain 1 Momentum. Your next Parry this turn is +{3|4}.{| Draw 1.}',p:f=>{f.mom(1);const n=f.v(3,4);thisTurn({id:'salute',mod:{parry(inst,ctx,v){if(inst.dead)return v;inst.dead=true;return v+n}}});if(f.u)f.draw(1)}});
R('sweep',{e:'🌙',tg:1,d:'Choose: deal {5|7} to ALL; or deal {9|11} to one enemy (one Attack).',p:f=>ask(f,'Arc Cut',[{l:'Deal '+f.v(5,7)+' to ALL',f:()=>f.all(f.v(5,7))},{l:'Deal '+f.v(9,11)+' to target',f:()=>f.dmg(f.v(9,11))}])});
R('rend',{e:'🐾',d:'Deal 4, +{2|3} for each Bleed on the target (max +{10|12}).',p:f=>{const t=f.tg;const b=t?t.st.bleed||0:0;f.dmg(4+Math.min(f.v(10,12),f.v(2,3)*b))}});
R('duelsend',{e:'⚰️',d:'Deal {20|25}. If this is a Flourish, also deal the target\'s Bleed (not multiplied).',p:f=>{const t=f.tg;f.dmg(f.v(20,25));
 if(f.flourish&&t&&t.hp>0&&t.st.bleed){const b=t.st.bleed;dmgEnemy(t,b);callout('DUEL\'S END +'+b+' 🩸','bleed')}}});
R('ovation',{e:'🎭',d:'Your next 2 Attacks this turn are free Flourishes at 3 Momentum. Keep your Momentum. Sink.',p:f=>{thisTurn({id:'ovation',mod:{flourishPlan(inst,ctx,v){if((inst.n||0)>=2)return v;inst.n=(inst.n||0)+1;return {mom:3,free:true}}}});log('🎭 Standing Ovation: your next 2 Attacks are free Flourishes at 3')}});
