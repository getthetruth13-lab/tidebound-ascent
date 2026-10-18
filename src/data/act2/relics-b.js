// data/act2/relics-b.js: BEHAVIOUR for the 96 Act 2 / Act 3 relics (meta: generated/act2-items.js from ACT2/ACT3-RELICS-POTIONS.md).
// Same shape as the B table in data/relics.js: {on:{event(r,ctx)}, mod:{name(r,ctx,v)}, pickup(r), ready(r)}. A relic with no entry here is a stub and never rolls.
// ---- Act 2 (50 relics) ----
// Per-combat state lives in Cst(r) (reset when a new combat starts, so a relic picked up mid-fight also works), per-turn state in T(r).
// Act 2 rules have no dedicated events for Pull / Seize / Gunnery, so those relics edit the live intent object carried by the existing
// 'enemyAct' event (act() reads m.pull / m.seize / m.a AFTER the event) or wrap m.fx (runs after Pull and Seize resolve).
import {CARDS,EN} from '../../core/registry.js';
import {W,pick} from '../../core/state.js';
import {cost,needsTarget,mk} from '../../engine/cards.js';
import {addSt,alive,drawCards,flash,gainBlock,gainEnergy,heal,log,callout,dmgEnemy,loseHp,intentOf,eAtk,sinkCard,hit,choose,owedType,placeWp,addCard,randAlive} from '../../engine/combat.js';
import {loseMaxHp,gainMaxHp,gainGold,gainCurse,gainCard,addPotionSlot,pickable,rollCards,goMap} from '../../engine/run.js';
import {canTemper,upgradeCard,plain,desc} from '../../engine/cards.js';
export const RELICS_B={};
const R=RELICS_B;
const DEB=['weak','vuln','brittle','bleed','drench','reson'];
// ---- helpers (exported: potions-b.js reuses noHoldDmg) ----
export const Cst=r=>{const cb=W.cb;if(!cb)return {};if(!r.c||r.cn!==cb.rid){cb.rid=cb.rid||(Date.now()+Math.random());r.c={};r.cn=cb.rid}return r.c};
export const T=r=>{const cb=W.cb;if(!cb)return {};if(!r.t||r.tn!==cb.turn||r.tc!==cb.rid){cb.rid=cb.rid||(Date.now()+Math.random());r.t={};r.tn=cb.turn;r.tc=cb.rid}return r.t};
const rawIntent=e=>{const t=EN[e.key];return (t&&t.intent?t.intent(e):e.next)||{}};
// "Aiming" = in the Aim -> Fire cycle (the shot is coming).
export const isAiming=e=>{const m=rawIntent(e);return !!(m.aim||m.fire)};
// Single-target damage that skips Hold the Line (and hits the given target selector).
export const noHoldDmg=(f,pickT)=>{f.dmg=(n,h=1)=>{if(f.allTargets)return f.all(n,h);for(let i=0;i<h;i++){const t=pickT?pickT():f.tg;if(!t)return;hit(t,f.num(n),f)}}};
const strip=ci=>{const cb=W.cb;for(const p of ['hand','draw','disc']){const i=cb[p].indexOf(ci);if(i>=0)cb[p].splice(i,1)}};
const isStatusJunk=ci=>ci&&(ci.id==='murk'||ci.id==='scald');
// Chained choice popups (never overwrite a pending choice).
const ask=(title,opts)=>{const cb=W.cb;if(!cb)return;const run=()=>choose(title,opts.map(o=>({...o,f:()=>{o.f();const q=W.cb&&W.cb.askQ;if(q&&q.length)q.shift()()}})));
 if(cb.mode){(cb.askQ=cb.askQ||[]).push(run)}else run()};
const lockHighest=()=>{const cb=W.cb;if(!cb||cb.locked)return false;let best=null,bc=0;for(const ci of cb.hand){const c=cost(ci);if(c>bc){bc=c;best=ci}}
 if(best){cb.locked=best;log('🔕 Muffled: '+(CARDS[best.id].n)+' is silenced this turn');callout('MUFFLED','boss');return true}return false};
const LASTCOST=new WeakMap(); // card -> its cost when canPlay was last asked (the real play asks right before spending)
const isAoE=f=>!!f&&(f.aoe||f.allTargets||(f.echo&&f.def&&/\bto ALL\b/.test(f.def.d||'')));

// ================= COMMON =================
R.platekey={on:{armourAbsorb(r,ctx){addSt(ctx.target,'vuln',2);flash(r)}}};
R.bellwax={on:{afterDraw(r){const cb=W.cb,c=Cst(r);if(cb.locked&&!c.used){c.used=1;cb.locked=null;gainBlock(6);flash(r);log('🕯️ Bell Wax: Muffled fails, +6 Guard')}}}};
R.tallystick={on:{turnStart(r){const cb=W.cb,c=Cst(r);if(cb.owed&&!c.used){c.used=1;cb.owed=null;gainBlock(3);flash(r);log('📏 Tally Stick: the debt is ignored, +3 Guard')}}}};
R.firebucket={on:{turnEnd(r){const n=W.cb.hand.filter(c=>c.id==='scald').length;if(n){gainBlock(4*n);flash(r)}}}};
R.barbedcoil={on:{cardPlayed(r,ctx){const cb=W.cb;if(ctx.type!=='A'||cb.stat.attacksTurn!==1)return;const t=ctx.card._tgt;if(t&&t.hp>0){addSt(t,'bleed',2);flash(r)}}},
 mod:{damageAdd(r,ctx,v){return ctx.attack?v-1:v}}};
R.lousecomb={on:{turnStart(r){if(alive().length>=3){alive().forEach(e=>dmgEnemy(e,3));flash(r)}}}};
R.rangeflag={mod:{damageAdd(r,ctx,v){return ctx.attack&&ctx.target&&isAiming(ctx.target)?v+4:v}}};
R.tetherpin={on:{enemyAct(r,ctx){const m=ctx.intent,cb=W.cb;if(!m||!m.pull)return;const was=m.pull;
 m.pull=Math.min(m.pull,W.run.cls==='tide'?Math.max(0,cb.tide-2):Math.max(0,cb.p.block-5));if(m.pull<was)flash(r)}}};
R.ropeknot={on:{enemyAct(r,ctx){const m=ctx.intent,e=ctx.enemy;if(!m||!m.seize||e.seized||!W.cb.hand.length)return;const prev=m.fx;
 m.fx=q=>{if(prev)prev(q);if(q.seized){gainBlock(8);drawCards(1);flash(r)}}}}};
R.oilskin={mod:{applyStatus(r,ctx,n){if(!ctx.player)return n;const c=Cst(r);if(c.used)return n;
 const bad=(n>0&&(ctx.key==='weak'||ctx.key==='vuln'||ctx.key==='brittle'))||(n<0&&(ctx.key==='str'||ctx.key==='dex'));
 if(!bad)return n;c.used=1;flash(r);log('🧥 Oilskin: the first debuff is negated');return 0}}};
R.rationtin={on:(()=>{const track=r=>{const c=Cst(r);if(c.last==null)c.last=W.run.hp;if(W.run.hp<c.last)c.lost=1;c.last=W.run.hp;return c};
 const t=r=>{track(r)};
 return {combatStart:t,turnStart:t,turnEnd:t,playerHit:t,playerDamaged:t,cardPlayed:t,potionUsed:t,roundEnd:t,
  combatEnd(r,ctx){const c=track(r);if(ctx.won&&!c.lost&&W.run.hp>0){heal(6);flash(r)}}}})()};
R.chalkline={on:{cardPlayed(r,ctx){const t=T(r);if(t.used)return;const d=CARDS[ctx.card.id];if(d.c==='X')return;if(LASTCOST.get(ctx.card)===0){t.used=1;gainBlock(3);flash(r)}}},
 mod:{canPlay(r,ctx,v){if(ctx.card)LASTCOST.set(ctx.card,cost(ctx.card));return v}}};

// ================= UNCOMMON =================
R.mudlarksieve={on:{cardAdded(r,ctx){const t=T(r);if(!isStatusJunk(ctx.card)||t.used)return;t.used=1;strip(ctx.card);sinkCard(ctx.card,'mudlark');flash(r);log('🧹 Mudlark Sieve: '+CARDS[ctx.card.id].n+' is Sunk')}},
 mod:{handLimit(r,ctx,v){return v-1}}};
// Jam thresholds are hard-coded in the enemies (took >= 16/18/30 where took = base - hp). The first hit each turn lifts base by 4 = 4 less needed.
R.jamwedge={on:{damageDealt(r,ctx){const e=ctx.target,cb=W.cb,p=e&&EN[e.key]&&EN[e.key].passive;if(!cb||!p||!(p.jam||p.pressure||p.swivel))return;
 if(e.wedgeT===cb.turn&&e.wedgeC===cb.rid)return;cb.rid=cb.rid||(Date.now()+Math.random());e.wedgeT=cb.turn;e.wedgeC=cb.rid;e.base=(e.base==null?e.hp+(ctx.hpLoss||0):e.base)+4;flash(r)}}};
R.sapperscharge={on:{damageDealt(r,ctx){const f=ctx.f,e=ctx.target;if(!f||!f.def||f.def.t!=='A'||f.potion||!e)return;
 if(e.block===0&&ctx.amount>ctx.hpLoss){const t=T(r);if(t.used)return;t.used=1;drawCards(2);flash(r);log('🔧 Sapper\'s Charge: Guard broken, draw 2')}}}};
R.silentclapper={on:{afterDraw(r){const cb=W.cb;if(cb.locked){gainEnergy(1);drawCards(1);flash(r)}}}};
R.paidreceipt={on:{cardPlayed(r,ctx){const cb=W.cb,t=T(r);if(t.paid||!cb.owed||!cb.owedUsed)return;
 if(owedType(CARDS[ctx.card.id])===cb.owed&&cb.ens.some(x=>x.key==='grell'&&x.hp>0)){t.paid=1;drawCards(2);flash(r)}}}};
R.gunwaleplank={mod:{intentDisplay(r,ctx,m){if(!m||!m.ignoreG)return m;const e=ctx.enemy;if(e&&e.next)delete e.next.ignoreG;const c={...m};delete c.ignoreG;return c},
 guard(r,ctx,v){if(!ctx.fromCard)return v;const f=W.cb&&W.cb.curF;if(f&&f.def&&f.def.t!=='S')return v;return v-1}}};
R.counterweight={on:{enemyAct(r,ctx){const m=ctx.intent;if(!m||!m.pull)return;const cb=W.cb;const before=W.run.cls==='tide'?cb.tide:cb.p.block;const prev=m.fx;
 m.fx=q=>{if(prev)prev(q);const n=Math.min(m.pull,before);if(n>0){gainBlock(Math.min(6,2*n));flash(r)}}}}};
R.reednet={on:{beforeCardPlay(r,ctx){const f=ctx.f;if(!f||f.potion)return;const a=f.all;f.all=function(...x){f.aoe=true;return a.apply(this,x)}}},
 mod:{damageAdd(r,ctx,v){if(!ctx.attack)return v;return isAoE(ctx.f)?v+4:v-1}}};
R.picketrope={mod:{retainPick(r,ctx,v){return v+1},drawCount(r,ctx,v){return W.cb&&W.cb.turn===1?Math.max(0,v-1):v}}}; // end of turn: Retain 1 card of your choice (combat.js retainWindow); first turn draws 1 less
R.casematebrick={on:{turnEnd(r){const c=Cst(r);if((c.n||0)<3&&W.cb.p.block>=15){c.n=(c.n||0)+1;addSt(W.cb.p,'str',1);flash(r)}}}};
R.prybar={on:{beforeCardPlay(r,ctx){if(CARDS[ctx.card.id].t==='A'&&W.cb.stat.attacksTurn===1)T(r).second=ctx.card.uid}},
 mod:{damageAdd(r,ctx,v){const f=ctx.f;return ctx.attack&&f&&f.ci&&!f.echo&&f.ci.uid===T(r).second?v+5:v}}};
R.flankinglamp={on:{beforeCardPlay(r,ctx){const f=ctx.f,ci=ctx.card;if(!f||f.potion||CARDS[ci.id].t!=='A'||!needsTarget(ci))return;const t=T(r);if(t.used)return;t.used=1;noHoldDmg(f);flash(r)}}};

// ================= RARE =================
R.breachorder={on:{combatStart(r){let hit2=false;alive().forEach(e=>{const p=EN[e.key].passive||{};if(p.hold||p.armour||isAiming(e)){addSt(e,'vuln',2);hit2=true}});if(hit2)flash(r)}}};
R.sluicewheel={on:{turnEnd(r){if(W.cb.p.block>=12)Cst(r).go=1},turnStart(r,ctx){const c=Cst(r);if(c.go){c.go=0;ctx.energy=(ctx.energy||0)+1;ctx.draw=(ctx.draw||0)+1;flash(r)}}}};
R.quartermasterbelt={pickup(r){const p=W.run.potions;if(!p.length)return;let i=p.lastIndexOf(null);if(i<0)i=p.length-1;p.splice(i,1)},
 on:{potionUsed(r){gainEnergy(1);drawCards(2);flash(r)}}};
R.wardenbanner={on:{turnStart(r){const n=Math.min(12,3*alive().length);if(n){gainBlock(n);flash(r)}}}};
R.blastdoor={on:{enemyAct(r,ctx){const m=ctx.intent,e=ctx.enemy,c=Cst(r);if(c.used||!m||!m.a)return;const o={str:0,vuln:!!W.cb.p.st.vuln};
 if(eAtk(e,m.a,o,true)<18)return;c.used=1;for(let a=m.a;a>-40;a--){if(eAtk(e,a,o,true)<=8){m.a=a;break}}flash(r);log('🚪 Blast Door: the blow is cut to 8');callout('BLAST DOOR','relic')}}};
R.salvagerights={on:{combatStart(r,ctx){if(ctx.kind==='elite'){addSt(W.cb.p,'str',2);gainBlock(10);flash(r)}}},
 mod:{gold(r,ctx,v){return ctx.combat&&ctx.kind==='elite'?0:v}}};
R.lastpost={on:{enemyKilled(r,ctx){if(!W.cb)return;const o=alive().filter(x=>x!==ctx.enemy);if(!o.length)return;o.forEach(x=>dmgEnemy(x,6));flash(r)}}};
R.sluicegatepin={on:{turnEnd(r){const cb=W.cb;if((cb.tide===9||cb.tide===1)){if(cb.tideDir)cb.holdDrift=true;gainBlock(6);flash(r)}}},
 mod:{crest(r,ctx,c){return {...c,dmg:Math.max(0,c.dmg-3)}},undertow(r,ctx,u){return {...u,guard:Math.max(0,u.guard-3)}}}};
R.bronzemould={on:{echo(r,ctx){if(CARDS[ctx.card.id].t!=='S')return;const c=Cst(r);gainBlock(3);if((c.p||0)<3){c.p=(c.p||0)+1;addSt(W.cb.p,'dex',1)}flash(r)}},
 mod:{damageAdd(r,ctx,v){return ctx.attack&&ctx.f&&ctx.f.echo?v-2:v}}};
R.masonstrowel={on:{decamp(r,ctx){const cb=W.cb,t=T(r);if(t.cairn||ctx.reason==='replaced'||ctx.reason==='returned'||cb.slots.length>=cb.nslots)return;t.cairn=1;placeWp(mk('cairn',false,{temp:true,rank:1}));flash(r)}},
 mod:{drawCount(r,ctx,v){return W.cb&&W.cb.turn===1?Math.max(0,v-1):v}}};
R.wardensgage={on:{combatStart(r){const cb=W.cb,c=Cst(r),en=alive();const set=e=>{c.uid=e.uid;log('🔎 Warden\'s Gage: '+e.n+' is marked')};
  if(en.length===1){set(en[0]);return}
  cb.startQ.push(()=>choose('🔎 Warden\'s Gage: choose an enemy',alive().map(e=>({l:e.e+' '+e.n,sum:'First Attack each turn: +3 and 2 Bleed. Its Attacks deal +2 to you.',f:()=>set(e)}))))},
 cardPlayed(r,ctx){const c=Cst(r),t=T(r);if(t.card!==ctx.card.uid||t.bled)return;t.bled=1;const e=alive().find(x=>x.uid===c.uid);if(e){addSt(e,'bleed',2);flash(r)}}},
 mod:{damageAdd(r,ctx,v){const c=Cst(r),f=ctx.f;if(!ctx.attack||c.uid==null||!ctx.target||ctx.target.uid!==c.uid||!f||!f.ci)return v;const t=T(r);
  if(t.card&&t.card!==f.ci.uid)return v;if(!f.preview&&!W.previewing)t.card=f.ci.uid;return v+3},
 intentDisplay(r,ctx,m){const c=Cst(r);return m&&m.a&&ctx.enemy&&c.uid!=null&&ctx.enemy.uid===c.uid?{...m,a:m.a+2}:m}}};

// ================= SHOP / EVENT =================
R.settledaccount={on:{turnStart(r){const cb=W.cb;if(!cb.owed||W.run.gold<8)return;ask('📜 Settled Account: pay 8 gold to ignore the Owed tax this turn?',
 [{l:'Pay 8 gold',cap:'No +1 cost this turn',f:()=>{if(W.run.gold>=8){W.run.gold-=8;W.cb.owed=null;flash(r);log('📜 Settled Account: 8 gold paid')}}},{l:'Keep the gold',cap:'The tax stands',f:()=>{}}])}}};
R.wrenlockbox={on:{turnStart(r,ctx){if(W.cb.turn===1&&W.run.gold>=100){ctx.energy=(ctx.energy||0)+1;ctx.draw=(ctx.draw||0)+1;flash(r)}}}};
R.alarmrattle=(()=>{const fn=(r,ctx)=>{const e=ctx.enemy;if(!e||e.hp<=0)return;const m=ctx.intent||intentOf(e);if(!m||!m.a)return;const t=T(r);if(t.used)return;if(eAtk(e,m.a)<15)return;t.used=1;gainBlock(6);flash(r)};
 return {on:{enemyTelegraph:fn,enemyStrike:fn}}})();
R.mooringring={on:{enemyAct(r,ctx){const m=ctx.intent;if(m&&m.pull&&W.run.cls==='tide'){m.pull=0;flash(r)}},
 tideChange(r,ctx){if(ctx.cause!=='drift'&&ctx.cause!=='pull')T(r).moved=1},
 turnEnd(r){if(!T(r).moved){gainBlock(5);flash(r)}}}};
R.sparringpost={mod:{damageAdd(r,ctx,v){if(!ctx.attack||!ctx.target)return v;return v+Math.min(4,DEB.filter(k=>ctx.target.st[k]).length)}}};
R.scratchedplaque={on:{combatStart(r){gainBlock(14);flash(r)},turnStart(r,ctx){if(W.cb.turn===2){ctx.draw=(ctx.draw||0)+2;flash(r)}}},
 mod:{canPlay(r,ctx,v){const cb=W.cb;return cb&&cb.turn===1&&ctx.card&&CARDS[ctx.card.id].t==='A'?false:v}}};
R.ballastbar={on:{combatStart(r){W.cb.startQ.push(()=>{if(W.run.gold<8)return;choose('⚓ Ballast Bar: pay 8 gold?',[
 {l:'Pay 8 gold',cap:'+1 Energy on turn 1, +10 Guard',f:()=>{if(W.run.gold<8)return;W.run.gold-=8;W.cb.pendingE=(W.cb.pendingE||0)+1;gainBlock(10);flash(r)}},{l:'Keep the gold',f:()=>{}}])})}}};
R.dampbedroll={on:{combatStart(r){addSt(W.cb.p,'weak',1)}},mod:{mendFrac(r,ctx,v){return v+12.01/Math.max(1,W.run.max)}}};
R.censerash={pickup(r){let n=0;const d=W.run.deck;for(let i=d.length-1;i>=0&&n<2;i--){const c=CARDS[d[i].id];if(c&&(c.t==='C'||c.curse||c.cls==='curse')){d.splice(i,1);n++}}loseMaxHp(8)}};

// ================= BOSS =================
R.gagstrap={on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1},afterDraw(r){if(lockHighest())flash(r)}}};
R.standingwall={mod:{retainGuard(r,ctx,v){const cb=W.cb;if(cb&&cb.p.block>20)cb.p.block=20;return true},drawCount(r,ctx,v){return Math.max(0,v-1)}}};
R.wardenswrit={on:{beforeCardPlay(r,ctx){const f=ctx.f,ci=ctx.card;if(!f||f.potion||CARDS[ci.id].t!=='A'||!needsTarget(ci))return;
 const low=()=>alive().slice().sort((a,b)=>a.hp-b.hp)[0];
 Object.defineProperty(f,'tg',{get:low,configurable:true});noHoldDmg(f,low);flash(r)}},
 mod:{damageAdd(r,ctx,v){return ctx.attack?v-2:v}}};
R.pitchseal={pickup(r){loseMaxHp(12)},
 on:{cardAdded(r,ctx){if(isStatusJunk(ctx.card)){strip(ctx.card);flash(r)}},afterDraw(r){W.cb.locked=null},
  turnStart(r){W.cb.owed=null;W.cb.owedNext=null},turnEnd(r){W.cb.owedNext=null}}};
R.turnedgun={pickup(r){loseMaxHp(10)},
 on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1},
  enemyAct(r,ctx){const m=ctx.intent,e=ctx.enemy;if(!m||!m.fire||!m.a)return;const others=alive().filter(x=>x!==e);if(!others.length)return;
   const t=pick(others,'combat'),d=eAtk(e,m.a,{str:0,vuln:false},true);for(let i=0;i<(m.h||1);i++)dmgEnemy(t,d);m.a=0;m.ignoreG=0;flash(r);log('🔫 Turned Gun: '+e.n+' fires on '+t.n)}}};
R.buoylamp={on:{turnStart(r){const c=Cst(r);if((c.n||0)>=3)return;ask('🏮 Buoy Lamp: follow the light? ('+(3-(c.n||0))+' left)',
 [{l:'Follow the light',cap:'Lose 3 HP, +1 Energy, draw 2',f:()=>{c.n=(c.n||0)+1;loseHp(3);gainEnergy(1);drawCards(2);flash(r)}},{l:'Keep dark',f:()=>{}}])}}};

// ---- Act 3 (46 relics) ----
// Hooks added to the engine for these (each marked "Act 3 hook" in combat.js / run.js / act3/enemies.js): staticDrawn, numbedCardPlayed, enemyDive, hitDamage (mod),
// damageTaken (mod), echoCap (mod), stormTide (mod), waterOn (mod), hpLow, shardPass, updraft, cardRemoved, potionDrop (mod). Existing: gust, numb, refract, siphon, tailwind, water, crest/undertow.
const firstAtk=(r,ctx)=>{const t=T(r),f=ctx.f;return !!f&&!!f.ci&&!f.echo&&!f.potion&&t.uid===f.ci.uid};
const zeroSink=ci=>{const cb=W.cb,i=cb.disc.indexOf(ci);if(i>=0){cb.disc.splice(i,1);sinkCard(ci,'hushbell')}};
const openChart=()=>{const ids=W.run.chartPending;if(!ids||!ids.length)return;const back=W.S;
 W.S={screen:'event',ev:{id:'a3_salvagedchart',n:'Salvaged Chart',e:'🗺️',t:'The chart is readable where it matters. Choose the Rare card it shows.',sub:'Salvaged Chart',
  o:ids.map(id=>({n:CARDS[id].n,s:'Add to your deck',d:plain(desc(mk(id))),kind:'card',f:()=>{W.run.chartPending=null;gainCard(id);goMap()}}))},t:Date.now()};return back};
// ================= COMMON =================
R.sparkgap={on:{staticDrawn(r,ctx){const c=Cst(r);if(c.used||ctx.sink)return;c.used=1;ctx.sink=true;flash(r);log('Spark Gap: the Static is Sunk')}}};
R.windvane={on:{gust(r){const t=T(r);if(t.used)return;t.used=1;drawCards(1);flash(r)}}};
R.thawpot={mod:{numb(r,ctx,v){const c=Cst(r);if(c.used)return v;c.used=1;flash(r);log('Thaw Pot: you are not Numbed');return false}}};
R.tetherreel={on:{enemyDive(r,ctx){addSt(ctx.enemy,'bleed',3);flash(r)}}};
R.cisternplug={mod:{water(r,ctx,v){return v-1}}};
R.hailhood={mod:{hitDamage(r,ctx,v){return ctx.hits>1?Math.max(0,v-1):v}}};
R.leecloth={mod:{tailwind(r,ctx,v){return Math.max(0,v-2)}}};
R.raingauge={on:{turnEnd(r){Cst(r).go=W.cb.p.block===0?1:0},turnStart(r){const c=Cst(r);if(c.go){c.go=0;gainBlock(5);flash(r)}}}};
R.chalkroundel={on:{combatStart(r,ctx){if(ctx.kind==='elite'||ctx.kind==='boss'){gainBlock(10);flash(r)}}}};
R.brassspoon={on:{potionUsed(r){heal(3);flash(r)}}};
R.updraftpennant={on:{updraft(r){heal(6);gainGold(20);flash(r)}}};
// ================= UNCOMMON =================
R.lightningcage={on:{staticDrawn(r){const t=randAlive();if(t){dmgEnemy(t,6);flash(r)}}}};
R.squalllens={mod:{intentDisplay(r,ctx,m){return m&&m.veiled?{...m,veiled:false,fog:false}:m},
 damageAdd(r,ctx,v){const c=Cst(r),f=ctx.f;return ctx.attack&&f&&f.ci&&!f.echo&&c.uid===f.ci.uid&&ctx.target&&ctx.target.elite?v+4:v}},
 on:{beforeCardPlay(r,ctx){const f=ctx.f,ci=ctx.card,c=Cst(r);if(c.used||!f||f.potion||CARDS[ci.id].t!=='A'||!needsTarget(ci))return;const t=f.tg;if(t&&t.elite){c.used=1;c.uid=ci.uid}}}};
R.mirrorveil={mod:{refract(){return false},damageAdd(r,ctx,v){return ctx.attack&&firstAtk(r,ctx)?v+2:v}},
 on:{beforeCardPlay(r,ctx){const t=T(r);if(t.set||CARDS[ctx.card.id].t!=='A'||ctx.f.potion)return;t.set=1;t.uid=ctx.card.uid}}};
R.dryballast={mod:{water(r,ctx,v){const g=ctx.guard;return v-(Math.floor(g/5)-Math.floor(Math.max(0,g-10)/5))},siphon(r,ctx,v){return Math.floor(v/2)}}};
R.thawbrazier={on:{numbedCardPlayed(r){drawCards(1);gainBlock(4);flash(r)}}};
R.galeglove={on:{gust(r,ctx){const cb=W.cb;cb.draw.slice(0,ctx.n).forEach(ci=>{ci.tmp0=true});flash(r)}}};
R.plumbline={on:{turnStart(r){const s=alive().filter(e=>e.sub);if(s.length){s.forEach(e=>dmgEnemy(e,5));flash(r)}}}};
R.plumbbob={mod:{stormTide(){return false},guard(r,ctx,v){if(!ctx.fromCard)return v;const f=W.cb&&W.cb.curF;if(!f||!f.ci||f.echo||f.potion)return v;const t=T(r);if(t.uid==null)t.uid=f.ci.uid;return t.uid===f.ci.uid?v+1:v}}};
R.couriersseal={mod:{damageAdd(r,ctx,v){return ctx.attack&&ctx.target&&ctx.target.holds?v+3:v}},on:{shardPass(r){gainBlock(6);flash(r)}}};
R.pressuregauge={on:{cardPlayed(r,ctx){if(ctx.nThisTurn%3===0){drawCards(1);flash(r)}}}};
R.fulgurite={mod:{damageTaken(r,ctx,v){const c=Cst(r);if(c.used||v<10)return v;c.used=1;flash(r);log('Fulgurite: 6 less damage');return v-6}}};
// ================= RARE =================
R.conduitcoil={on:{staticDrawn(r,ctx){const t=T(r);if(t.used||ctx.sink)return;t.used=1;ctx.sink=true;gainEnergy(1);flash(r)}}};
R.spillway={on:{turnEnd(r){const cb=W.cb,x=cb.p.block-10;if(x<=0)return;cb.p.block=10;const d=Math.floor(x/3);if(d>0)alive().forEach(e=>dmgEnemy(e,d));flash(r);log('Spillway: '+x+' Guard released, '+d+' to ALL')}}};
R.barograph={on:{turnEnd(r){Cst(r).go=W.cb.stat.playedTurn>=5?1:0},turnStart(r,ctx){const c=Cst(r);if(c.go){c.go=0;ctx.energy=(ctx.energy||0)+1;ctx.draw=(ctx.draw||0)+1;flash(r)}}}};
R.emergencyshutter={on:{hpLow(r){const c=Cst(r);if(c.used)return;c.used=1;gainBlock(15);drawCards(2);flash(r);callout('EMERGENCY SHUTTER','relic')}}};
R.reagentrack={on:{potionUsed(r){drawCards(2);gainEnergy(1);flash(r)}}};
R.forkedrod={on:{cardPlayed(r,ctx){const t=T(r);if(t.used||ctx.type!=='A'||CARDS[ctx.card.id].c==='X')return;if((LASTCOST.get(ctx.card)||0)<2)return;t.used=1;
 alive().filter(x=>x!==ctx.card._tgt).forEach(e=>dmgEnemy(e,6));flash(r)}},
 mod:{canPlay(r,ctx,v){if(ctx.card)LASTCOST.set(ctx.card,cost(ctx.card));return v}}};
R.stormstandard={on:{cardPlayed(r,ctx){if(ctx.type==='S')T(r).skill=1},beforeCardPlay(r,ctx){const t=T(r);if(!t.skill||t.done||CARDS[ctx.card.id].t!=='A'||ctx.f.potion)return;t.done=1;t.uid=ctx.card.uid;flash(r)}},
 mod:{damageAdd(r,ctx,v){return ctx.attack&&firstAtk(r,ctx)?v+5:v}}};
// ================= SHOP / EVENT =================
R.vialbelt={pickup(r){addPotionSlot()},mod:{potionDrop(r,ctx,v){return ctx.kind==='elite'?true:v}}};
R.inkpress={on:{cardRemoved(r,ctx){if(!ctx.shop)return;const l=pickable('upgrade').filter(c=>canTemper(c));if(!l.length)return;upgradeCard(pick(l,'relics'));flash(r)}}};
R.stormwick={on:{turnStart(r,ctx){if(W.cb.turn===1){ctx.energy=(ctx.energy||0)+1;ctx.draw=(ctx.draw||0)+1;flash(r)}}}};
R.hailheart={pickup(r){gainMaxHp(14)},on:{combatStart(r){addCard('static','disc');flash(r)}}};
R.struckglass={pickup(r){const l=pickable('upgrade').filter(c=>canTemper(c));for(let k=0;k<3&&l.length;k++){const ci=pick(l,'relics');l.splice(l.indexOf(ci),1);upgradeCard(ci)}W.run.hp=Math.max(1,W.run.hp-12)}};
R.salvagedchart={pickup(r){W.run.chartPending=rollCards(3,'boss',{forceR:'r',stream:'events'});gainCurse('anchorchain');if(W.S&&W.S.screen==='map')openChart()},
 on:{mapEnter(r){if(W.run.chartPending)openChart()}}};
// ================= CLASS =================
R.refluxweir={mod:{crest(r,ctx,c){return {...c,resetTo:7}},undertow(r,ctx,u){return {...u,resetTo:3}}}};
R.choirvault={mod:{echoCap(r,ctx,v){return v+1}},on:{echo(r){if(W.cb.stat.echoesTurn===5){drawCards(1);flash(r)}}}};
R.atlaslock={on:{waypointPlaced(r,ctx){if((ctx.wp.rank||0)<1)ctx.wp.rank=1},waypointTrigger(r,ctx){const t=T(r);if(t.used||(ctx.wp.rank||0)<3)return;t.used=1;gainEnergy(1);flash(r)}}};
R.counterspur={mod:{parry(r,ctx,v){return ctx.f&&!ctx.f.potion&&v>0?v+3:v}},on:{parry(r,ctx){const m=Math.min(6,W.cb.mom||0);if(m>0&&ctx.enemy&&ctx.enemy.hp>0){dmgEnemy(ctx.enemy,m);flash(r)}}}};
R.reedmute={on:{echo(r,ctx){const t=T(r);if(t.used||ctx.k!==0)return;t.used=1;drawCards(1);flash(r)}}};
// ================= BOSS =================
R.chargedcoronet={on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1;addCard('static','drawRandom');flash(r)}}};
R.sluiceheart={mod:{retainGuard(){return true},waterOn(){return true}}};
R.windboundcrown={on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1},turnEnd(r){const cb=W.cb;if(!cb.hand.length)return;const ci=pick(cb.hand,'combat');cb.hand.splice(cb.hand.indexOf(ci),1);cb.draw.unshift(ci);flash(r)}}};
R.rimegovernor={on:{turnStart(r,ctx){ctx.draw=(ctx.draw||0)+2},afterDraw(r){const cb=W.cb;if(cb.numbCard&&cb.hand.includes(cb.numbCard))return;let best=null,bc=99;for(const ci of cb.hand){if(CARDS[ci.id].unplay)continue;const c=cost(ci);if(c<bc){bc=c;best=ci}}if(best){cb.numbCard=best;flash(r)}}}};
R.thunderhead={on:{beforeCardPlay(r,ctx){const f=ctx.f,ci=ctx.card;if(!f||f.potion||CARDS[ci.id].t!=='A'||!needsTarget(ci))return;
 f.dmg=(n,h=1)=>{for(let i=0;i<h;i++)alive().forEach(e=>hit(e,Math.floor(f.num(n)*.7),f,{aoe:true}))};flash(r)}},
 mod:{echoPlan(r,ctx,p){return p&&p.card&&CARDS[p.card.id].t==='A'?{...p,allTargets:true,scale:(p.scale||1)*.7}:p}}};
R.hushbell={on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1},cardPlayed(r,ctx){const d=CARDS[ctx.card.id];if(d.c==='X'||d.t==='P'||d.t==='W')return;if(LASTCOST.get(ctx.card)===0){zeroSink(ctx.card);flash(r)}}},
 mod:{canPlay(r,ctx,v){if(ctx.card)LASTCOST.set(ctx.card,cost(ctx.card));return v}}};

// ENGINE-NEEDS:
// Approximation notes (behaviour true, but through existing hooks): Pull/Seize/Gunnery/Blast Door edit the live intent in 'enemyAct';
//   Jam Wedge lifts the enemy's turn-base by 4 (a proper 'jamThreshold' mod would be cleaner); Sluice Gate Pin's Undertow penalty is -3 Guard (Undertow deals no damage).
