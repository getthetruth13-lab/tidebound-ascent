// data/act2/potions-b.js: BEHAVIOUR for the 24 Act 2 / Act 3 potions (meta: generated/act2-items.js). use(f,target) like data/potions.js. No entry = stub (never rolls).
// Act 2 potions (14). Drinking is never a card play; f is the potion effect context (potion:true).
import {CARDS} from '../../core/registry.js';
import {W} from '../../core/state.js';
import {addSt,alive,gainBlock,heal,intentOf,loseHpEnemy,sinkCard,log} from '../../engine/combat.js';
import {noHoldDmg} from './relics-b.js';
export const POTIONS_B={};
const P=POTIONS_B;
const CLEAR_P=['weak','vuln','brittle'];
P.drysalt={use:f=>{const s=W.cb.p.st;CLEAR_P.forEach(k=>delete s[k]);f.blk(6)}};
P.slackline={use:f=>{W.cb.locked=null;f.draw(1)}};
P.pitchflask={use:f=>{const cb=W.cb;for(const p of ['hand','disc'])for(const ci of cb[p].slice())if(ci.id==='murk'||ci.id==='scald'){cb[p].splice(cb[p].indexOf(ci),1);sinkCard(ci,'potion')}f.blk(4)}};
// Next Attack this turn: Armoured does not absorb it (and is not spent), Hold the Line does not redirect it.
P.plateoil={use:f=>f.thisTurn({id:'plateoil',on:{
 beforeCardPlay(i,ctx){const F=ctx.f;if(i.saved||F.potion||CARDS[ctx.card.id].t!=='A')return;i.saved=alive().map(e=>[e,e.armSpent]);alive().forEach(e=>{e.armSpent=true});noHoldDmg(F)},
 cardPlayed(i){if(i.saved){i.saved.forEach(([e,v])=>{e.armSpent=v});i.saved=null;i.dead=true}}}})};
P.bastionbroth={use:f=>{heal(6);f.blk(6)}};
P.licepowder={use:f=>f.all(alive().length>=3?9:5)};
// Aiming (intent Aim or Fire): the shot is cancelled and it must Aim again. Otherwise deal 10 (single-target: Hold the Line applies).
P.cannongrease={use:(f,t)=>{if(!t)return;const m=intentOf(t);
 if(m.aim){t.keepNext=true;log('🎯 Cannon Grease: '+t.n+' must Aim again')}
 else if(m.fire){t.next={aim:1,none:1,lbl:'Aiming'};if(t.key==='battery')t.fturn=Math.max(0,(t.fturn||1)-1);else t.ci=(t.ci||1)-1;log('🎯 Cannon Grease: the shot is cancelled, '+t.n+' must Aim again')}
 else f.dmg(10)}};
P.receiptink={use:f=>{const cb=W.cb;cb.owed=null;cb.owedNext=null;f.draw(2)}};
P.breachdraught={use:f=>{alive().forEach(e=>{e.block=0;addSt(e,'vuln',1)})}};
// Pull and Seize are edited out of the live intent for the next 2 enemy phases.
P.saltanchor={use:f=>{let n=2;f.blk(8);f.thisTurn({id:'saltanchor',combat:true,on:{enemyAct(i,ctx){const m=ctx.intent;if(m){if(m.pull)m.pull=0;if(m.seize)m.seize=0}},roundEnd(i){if(--n<=0)i.dead=true}}})}};
P.hotshotflask={use:(f,t)=>{if(t)loseHpEnemy(t,16,'potion')}};
P.bastionelixir={use:f=>f.thisTurn({id:'bastionelixir',combat:true,on:{turnStart(){gainBlock(8)}}})};
P.floodwater={use:f=>{f.all(18);alive().forEach(e=>addSt(e,'weak',2))}};
P.cleanslate={use:f=>{const cb=W.cb;
 for(const e of cb.ens){if(e.seized){(cb.hand.length<10?cb.hand:cb.disc).push(e.seized);e.seized=null}}
 cb.owed=null;cb.owedNext=null;cb.locked=null;cb.muffleNext=false;
 const s=cb.p.st;CLEAR_P.forEach(k=>delete s[k]);if(s.str<0)delete s.str;if(s.dex<0)delete s.dex;
 f.draw(3)}};
// ---- Act 3 (10 potions) ----
P.thawdraught={use:f=>{W.cb.numbCard=null;f.thisTurn({id:'thawdraught',turns:4,mod:{numb(){return false}}});f.draw(2)}};
P.galeflask={use:f=>{f.blk(5);f.draw(2)}};
P.thunderbulb={use:(f,t)=>{if(!t)return;f.dmg(12);if(t.hp>0)addSt(t,'bleed',4)}};
P.windwardtonic={use:f=>{f.gainEnergy(1);f.draw(2)}};
P.groundingsalts={use:f=>{const cb=W.cb;for(const p of ['hand','draw','disc'])for(const ci of cb[p].slice())if(ci.id==='static'){cb[p].splice(cb[p].indexOf(ci),1);sinkCard(ci,'potion')}f.blk(6)}};
P.squallspirit={use:f=>{alive().forEach(e=>{e.sub=false;e.diveNext=false;addSt(e,'vuln',3)})}};
P.draincork={use:f=>{const cb=W.cb,b=cb.p.block;cb.p.block=0;heal(Math.min(12,Math.floor(b/4)))}};
// Next Attack this turn and the first Attack next turn: +10 each.
P.tailwinddraught={use:f=>{const t0=W.cb.turn;f.thisTurn({id:'tailwinddraught',combat:true,
 on:{beforeCardPlay(i,ctx){if(ctx.f.potion||CARDS[ctx.card.id].t!=='A')return;const n=W.cb.turn;if(n===t0&&!i.a1){i.a1=1;i.u1=ctx.card.uid}else if(n===t0+1&&!i.a2){i.a2=1;i.u2=ctx.card.uid}},
  turnEnd(i){if(W.cb.turn>=t0+1)i.dead=true}},
 mod:{damageAdd(i,ctx,v){const F=ctx.f;return ctx.attack&&F&&F.ci&&!F.echo&&(F.ci.uid===i.u1||F.ci.uid===i.u2)?v+10:v}}})}};
P.eyedraught={use:f=>{f.thisTurn({id:'eyedraught',combat:true,mod:{damageTaken(){return 0},water(){return 0}},on:{turnStart(i){i.dead=true}}});f.draw(2)}};
P.clearwatervial={use:f=>{heal(Math.floor(W.run.max*.25));const cb=W.cb,J=['static','kelp','murk','scald','ringing'];for(const p of ['hand','draw','disc'])for(const ci of cb[p].slice())if(J.includes(ci.id)){cb[p].splice(cb[p].indexOf(ci),1);sinkCard(ci,'potion')}}};
