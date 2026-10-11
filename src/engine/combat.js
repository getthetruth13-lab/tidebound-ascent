import {savedAction} from '../save.js';
// engine/combat.js — turn/card-play lifecycle, damage & Guard pipelines, class rules (v2.1), enemies.
// Ordering contract: design/content-impl-plan.md §2 ("Turn / play ordering contract"). Rule numbers: DATA.v21.sim.core.
import {CARDS,EN,POTIONS} from '../core/registry.js';
import {W,nextId,pick,rng,shuffle,R} from '../core/state.js';
import {spriteCount} from '../assets.js';
import {cname,cost,desc,isEx,isUp,isX,mk,needsTarget,plain} from './cards.js';
import {runCard} from './effects.js';
import {fire,mod,thisTurn} from '../core/bus.js';
import {DATA} from '../data/generated/data-v2.js';
import {BOSS_OPEN,bellCount} from '../data/lore.js';
import {combatRewards,gainCard,goMap,endRun} from './run.js';
import {flyCard} from '../ui/fx.js';
import {impactDelay} from '../ui/vfx.js';
import {render} from '../ui/render.js';
export const CORE=DATA.v21.sim.core;
const DU=CORE.duel,TI=CORE.tide,EC=CORE.echo,CA=CORE.carto;
const cs='combat'; // RNG stream for everything in combat
// ================= queries =================
export function alive(){return W.cb?W.cb.ens.filter(e=>e.hp>0&&!e.fled):[]}
export function randAlive(){const a=alive();return a.length?pick(a,cs):null}
export function strongest(){return alive().sort((a,b)=>b.hp-a.hp)[0]}
export function curTgt(){let t=W.cb.ens[W.cb.tgt];if(!t||t.hp<=0||t.fled){t=alive()[0];W.cb.tgt=W.cb.ens.indexOf(t)}return t}
export const might=()=>W.cb?(W.cb.p.st.str||0):0;
export function log(s){if(W.cb){W.cb.log.unshift(s);W.cb.log.length=Math.min(W.cb.log.length,6)}}
// Floating combat text (damage/Guard numbers). Visual only; kept separate from the bus's turn-scoped W.cb.fx.
export function floatText(who,txt,cls){if(!W.cb)return;const now=Date.now();W.cb.vfx=W.cb.vfx.filter(x=>now-x.t<2000);W.cb.vfx.push({who,txt,cls:cls||'',t:now,d:impactDelay(who)})}
// Big combo call-outs ("CREST!", "FLOURISH ×3", "ECHO ×2"...): clear feedback when combos trigger. Never blocks input.
// Boss moment (intro / phase change): a big title plate drawn over the scene (render.js bossBeatHTML) plus fx (anim.js listens to 'bossBeat').
export function bossBeat(kind,title,sub,e){if(!W.cb)return;W.cb.beat={kind,title,sub:sub||'',t:Date.now()};fire('bossBeat',{kind,enemy:e})}
export function callout(txt,cls){if(!W.cb)return;const now=Date.now();W.cb.callouts=(W.cb.callouts||[]).filter(x=>now-x.t<1400);W.cb.callouts.push({txt,cls:cls||'',t:now})}
// Relic feedback: pulse the relic icon in the top bar.
export function flash(r){if(r&&typeof r==='object'){r.flashT=Date.now()}}
// ================= statuses =================
const DEBUFF=new Set(['weak','vuln','brittle','bleed','drench','reson']);
export function addSt(e,k,n){n=Math.floor(n);if(!n||!e)return;if(n<0&&k!=='str'&&k!=='dex')return;
 const isP=W.cb&&e===W.cb.p;
 if(!isP&&(DEBUFF.has(k)||(k==='str'&&n<0))&&e.st.ward>0){e.st.ward--;if(!e.st.ward)delete e.st.ward;floatText(e.uid,'Rebuffed','b');return}
 n=mod('applyStatus',{target:e,key:k,player:isP},n);if(!n)return;
 e.st[k]=(e.st[k]||0)+n;if(k==='bleed')e.st.bleed=Math.min(20,e.st.bleed);if(k==='drench'||k==='reson')e.st[k]=Math.min(12,e.st[k]);if(!e.st[k])delete e.st[k];
 // Debuffs put on an enemy after your turn has ended (Echo / Resound) skip that enemy's next tick, so they last into your next turn.
 if(W.cb&&W.cb.ending&&!isP&&(k==='weak'||k==='vuln'||k==='brittle'||k==='drench'||k==='reson'))(e.hold=e.hold||{})[k]=1;
 fire('statusApplied',{target:e,key:k,n,player:isP})}
export function tick(st,hold){['weak','vuln','brittle','drench','reson'].forEach(k=>{if(hold&&hold[k])return;if(st[k]){st[k]--;if(!st[k])delete st[k]}})}
// ================= enemies =================
export function spawn(key,o={}){const t=EN[key];const hp=rng(t.hp[0],t.hp[1],cs);
 const e={key,n:t.n,e:t.e,hp,max:hp,block:t.b0||0,st:Object.assign({},t.st0||{}),t:0,ci:0,ph:1,uid:nextId(),elite:t.elite,boss:t.boss,summoned:!!o.summoned,passive:t.passive||null};
 e.k=W.cb.ens.filter(x=>x.key===key).length;if(t.randomSprite){const nv=spriteCount('enemies',key);if(nv>1)e.sv=R(nv,'sprites')} // own stream: never shifts combat rolls
 W.cb.ens.push(e);e.next=t.ai(e);if(t.onSpawn)t.onSpawn(e);return e}
export function countAlive(key){return alive().filter(x=>x.key===key).length}
// ================= combat start =================
function startCombatImpl(kind,enc,opts={}){
 W.run.deck.forEach(ci=>{ci.sus=0;ci.tmp0=false;ci.tmpUp=false;ci.rank=0});
 const cb=W.cb={kind,ens:[],tgt:0,p:{block:0,st:{}},energy:3,maxE:3,banner:null,insp:null,hand:[],draw:shuffle(W.run.deck.slice(),cs),disc:[],exh:[],log:[],vfx:[],callouts:[],fx:[],powers:[],
  stat:{playedTurn:0,playedCombat:0,attacksTurn:0,attacksCombat:0,tideturnsTurn:0,tideturnsCombat:0,crests:0,undertows:0,echoesTurn:0,echoesCombat:0,wpDestroyed:0,lastTideDir:0,lastEchoed:null,flourishes:0,advances:0},
  turn:0,lastType:null,mode:null,busy:false,sel:null,opts:opts,startQ:[],nextTurnQ:[],pendingE:0,nextDraw:0,
  tide:5,tideDir:0,banks:0,capped:false,holdDrift:false,mark2:null,markTgt2:null,after2:0,mark2Scale:1,extraMarks:0,last:null,lastTgt:null,lastNF:null,lastNFTgt:null,mark:null,markTgt:null,afterMark:0,armMark:false,armFlourish:false,
  slots:[],nslots:3,chartQ:0,wpDraw:0,advUsed:0,mom:0,keepMom:false,parry:0,parryUsed:false,cairn:0,flags:{}};
 Object.defineProperty(cb,'pstr',{get(){return cb.p.st.str||0},set(v){cb.p.st.str=v;if(!v)delete cb.p.st.str},enumerable:false});
 Object.defineProperty(cb,'tdir',{get(){return cb.tideDir},set(v){cb.tideDir=v},enumerable:false});
 // Opening cards go to the top of the draw pile (design §2.1).
 const open=cb.draw.filter(c=>c.open||CARDS[c.id].open);if(open.length){cb.draw=open.concat(cb.draw.filter(c=>!open.includes(c)))}
 enc.forEach(k=>spawn(k));cb.bossKey=(cb.ens.find(e=>e.boss)||{}).key||null;
 {const open=BOSS_OPEN[cb.bossKey];if(open){const t=open(bellCount(W.run.seed));log((cb.bossKey==='bell'?'🔔 ':cb.bossKey==='tenant'?'🏚️ ':'🪸 ')+t);const be=cb.ens.find(x=>x.boss);bossBeat('intro',EN[cb.bossKey].n,t,be)}} // lore: the boss speaks first (bible §16 items 7-9)
 const cls=W.run.cls;
 if(cls==='duel')cb.mom=DU.start_mom;
 if(cls==='carto'&&!hasRelic('trailboots')){
  const pool=['signal','cache','lookout'];
  if(hasRelic('sextant'))cb.startQ.push(()=>choose('Brass Sextant: choose your starting Waypoint (upgraded, Rank 1)',shuffle(pool.slice(),cs).map(id=>({l:`${CARDS[id].e} ${CARDS[id].n}+`,card:{id,up:true,rank:1},cap:'Rank 1 · upgraded',f:()=>{placeStartWp(id,true,1)}}))));
  else placeStartWp(pick(pool,cs),false,0);
  if(hasRelic('staratlas'))placeStartWp(pick(pool,cs),false,0);
 }
 if(cls==='carto'&&W.run.preWp){const p=W.run.preWp;W.run.preWp=null;if(CARDS[p.id]&&cb.slots.length<cb.nslots)placeStartWp(p.id,p.up,p.rank)}
 fire('combatStart',{cb,kind,enemies:cb.ens});
 W.S={screen:'combat'};
 nextStart()}
function placeStartWp(id,up,rank){const w=mk(id,up,{temp:true,rank});W.cb.slots.push(w);log('🧭 Starting Waypoint: '+cname(w)+(rank?' (Rank '+rank+')':''))}
// Start-of-combat choices (Moon Shell's Tide, Brass Sextant's Waypoint) open one at a time before the first draw.
function nextStart(){const cb=W.cb;if(!cb)return;if(cb.startQ.length){const q=cb.startQ.shift();q();if(cb.mode){cb.mode.thenStart=true;return render()}return nextStart()}startTurn()}
export const hasRelic=id=>!!(W.run&&W.run.relics&&W.run.relics.some(r=>r.id===id));
export const relic=id=>W.run&&W.run.relics&&W.run.relics.find(r=>r.id===id);
// ================= Guard =================
// Guard pipeline (§4.2 modifyGuard): base(+Sustain) -> +Poise -> x0.75 Brittle (card Guard only) -> 'guard' modifiers -> floor.
export function gainBlock(n,o={}){const cb=W.cb;if(!cb)return 0;if(o.fromCard){n+=cb.p.st.dex||0;if(cb.p.st.brittle)n*=.75}
 n=Math.floor(mod('guard',{fromCard:!!o.fromCard},n));if(n<=0)return 0;cb.p.block+=n;cb.p.blkT=Date.now();floatText('p','+'+n+'🛡','b');fire('guardGained',{amount:n});return n}
export function gainMom(n){const cb=W.cb;const mx=mod('momMax',{},DU.mom_max);const was=cb.mom;cb.mom=Math.max(0,Math.min(mx,cb.mom+n));return cb.mom-was}
export function gainEnergy(n){if(!W.cb)return;W.cb.energy+=n;if(n>0)floatText('p','+'+n+'⚡','e')}
// ================= piles =================
export function refill(k){const cb=W.cb;if(cb.draw.length<k&&cb.disc.length){cb.draw=cb.draw.concat(shuffle(cb.disc,cs));cb.disc=[];fire('shuffle',{})}}
export const handLimit=()=>mod('handLimit',{},10);
export function drawCards(n){const cb=W.cb;let k=0;for(let i=0;i<n;i++){if(!W.cb)return k;if(cb.hand.length>=handLimit())break;refill(1);if(!cb.draw.length)break;const c=cb.draw.shift();cb.hand.push(c);k++;
  const d=CARDS[c.id];if(d.onDrawSelf)d.onDrawSelf(F(c,{}),c);fire('draw',{card:c})}return k}
// Add a created card (token, status, Kelp...) respecting the hand limit (overflow goes to the discard pile).
export function addCard(id,pile='hand',o={}){const cb=W.cb;const ci=mk(id,o.up,{temp:!!o.temp,tmp0:!!o.cost0Turn});
 if(pile==='hand'&&cb.hand.length>=handLimit())pile='disc';
 if(pile==='drawRandom'){cb.draw.splice(R(cb.draw.length+1,cs),0,ci)}else if(pile==='draw')cb.draw.unshift(ci);else cb[pile].push(ci);return ci}
export function sinkCard(ci,reason){W.cb.exh.push(ci);fire('sink',{card:ci,reason:reason||'played'})}
// ================= damage =================
// Attack damage pipeline (§4.2 modifyDamage + design §2.1 multiplier rule):
//   base (+Sustain, half for an unmarked Echo, +Mark bonus)  -> +Might, +Duel Focus, 'damageAdd' modifiers (Whale Tooth...)
//   -> x Flourish (<=3.5) -> x Echo doubling (once) -> Soaked x0.75 -> Exposed x1.5 -> 'damage' modifiers -> floor.
// Bleed triggers before the hit (HP loss, ignores Guard), once per Attack per enemy.
export function hit(e,base,f,o={}){if(!e||e.hp<=0||e.fled)return 0;const cb=W.cb;const atk=!o.raw&&!!(f&&f.def&&f.def.t==='A'&&!f.potion);let d=base;
 if(atk){d+=might();if(W.run.cls==='duel'){const top=Math.max(...alive().map(x=>x.hp));if(e.hp===top)d+=mod('focus',{target:e,f},DU.focus)}d=mod('damageAdd',{target:e,f,attack:true},d);if(f.echo&&e.st.reson)d+=e.st.reson;
  if(f.flourish)d=Math.floor(d*f.fmult);if(f.mult>1)d*=f.mult;if(cb.p.st.weak)d=Math.floor(d*.75)}
 else if(f&&f.mult>1)d*=f.mult;
 if(e.st.vuln)d=Math.floor(d*1.5);
 d=Math.max(0,Math.floor(mod('damage',{target:e,f,attack:atk,raw:!!o.raw},d)));
 if(atk&&e.st.bleed&&!(f.bled||(f.bled=new Set())).has(e)){f.bled.add(e);const b=Math.ceil(mod('bleedDamage',{target:e},e.st.bleed));loseHpEnemy(e,b,'bleed');if(!mod('keepBleed',{target:e},false)){e.st.bleed--;if(!e.st.bleed)delete e.st.bleed}if(e.hp<=0)return 0}
 const dealt=dmgEnemy(e,d,{f,attack:atk});
 if(atk&&e.st.barbs&&e.hp>=0){loseHp(e.st.barbs,{source:'barbs',guard:true})}
 if(f){f.lastDealt=dealt}
 if(W.run.stats&&dealt>W.run.stats.maxHit)W.run.stats.maxHit=dealt;
 return dealt}
export function loseHpEnemy(e,n,why){if(e.hp<=0)return;e.hp-=n;floatText(e.uid,'-'+n,why==='bleed'?'bleed':'');e.shake=Date.now();afterEnemyDamage(e,null)}
export function dmgEnemy(e,d,o={}){if(e.hp<=0)return 0;const b=Math.min(e.block,d);e.block-=b;d-=b;e.hp-=d;const tb=EN[e.key];if(b>0&&e.block===0&&tb.onGuardBroken&&e.hp>0)tb.onGuardBroken(e);floatText(e.uid,d>0?'-'+d:(b?'🛡'+b:'0'),d>0?'':'b');e.shake=Date.now();
 fire('damageDealt',{target:e,amount:d+b,hpLoss:d,f:o.f});afterEnemyDamage(e,o.f);return d}
function afterEnemyDamage(e,f){const t=EN[e.key];if(e.hp>0&&t.onDamaged)t.onDamaged(e);
 if(e.hp<=0){e.hp=0;W.run.kills++;if(W.run.stats)W.run.stats.kills++;log('💥 '+e.n+' defeated');if(f)f.killed=true;if(t.onDeath)t.onDeath(e);fire('enemyKilled',{enemy:e,summon:e.summoned,f})}}
// Unblockable self HP loss (Brine Rot, Reckless...). guard:true lets Guard absorb it (Scald, Barbs).
export function loseHp(n,o={}){const cb=W.cb;if(o.guard&&cb){const b=Math.min(cb.p.block,n);cb.p.block-=b;n-=b}if(n<=0)return;W.run.hp-=n;if(cb){floatText('p','-'+n);cb.pshake=Date.now()}if(W.run.hp<=0)cheatDeath()}
export function heal(n){W.run.hp=Math.min(W.run.max,W.run.hp+Math.max(0,Math.floor(n)));if(W.cb&&n>0)floatText('p','+'+Math.floor(n)+'❤','h')}
// onPlayerDeath (§4.2): relics first (Tidewrack Scale), then potions (Second Tide). Returns true if the death was cancelled.
export function cheatDeath(){if(W.run.hp>0)return true;const ctx=fire('playerDeath',{});if(ctx.cancel&&W.run.hp>0){return true}return false}
// ================= Tide (Tidecaller, v2.1) =================
export const isHigh=()=>W.cb.tide>=TI.high, isLow=()=>W.cb.tide<=TI.low;
export function setTide(v,cause){const cb=W.cb;const from=cb.tide;const to=Math.max(0,Math.min(10,v));const dir=Math.sign(to-from);
 if(dir){noteDir(dir,cause)}cb.tide=to;fire('tideChange',{from,to,delta:to-from,cause:cause||'set'});checkTide(cause);return to}
// Returns the Tide reached by the move (before a Crest/Undertow resets it to 5), so cards can check "if now at Low/High Tide".
export function tideShift(n,cause){const cb=W.cb;if(!n)return cb.tide;if(cb.slack&&cause!=='drift')return cb.tide;const from=cb.tide,dir=Math.sign(n);
 const wasHigh=isHigh();noteDir(dir,cause);const to=Math.max(0,Math.min(10,from+n));cb.tide=to;
 fire(dir>0?'surge':'recede',{n:Math.abs(n),wasHigh,cause});fire('tideChange',{from,to,delta:to-from,cause:cause||'card'});checkTide(cause);return to}
function noteDir(dir,cause){const cb=W.cb;if(cb.tideDir&&dir!==cb.tideDir){cb.stat.tideturnsTurn++;cb.stat.tideturnsCombat++;fire('tideTurn',{nThisTurn:cb.stat.tideturnsTurn,nThisCombat:cb.stat.tideturnsCombat,cause});drenchTrigger('turn')}cb.tideDir=dir;cb.stat.lastTideDir=dir}
// Drenched (enemy status, Tidecaller): whenever the Tide turns, Crests or Undertows, each Drenched enemy takes X (ignores Guard).
export function drenchTrigger(why){if(!W.cb)return;alive().forEach(e=>{if(e.st.drench&&e.hp>0){floatText(e.uid,'-'+e.st.drench+'💧','drench');loseHpEnemy(e,e.st.drench,'drench')}})}
// Crest damage for one release: Banked Crests (Bank the Crest) fire together, each at 1½ x a plain Crest.
export function fireCrest(c,cause,banks=1,mult=1){const dmg=Math.ceil(c.dmg*mult)*banks;log(`🌊 CREST! ${dmg} to ALL`);callout('CREST! '+dmg+' to ALL','crest');W.cb.crestT=Date.now();
 alive().forEach(e=>dmgEnemy(e,dmg));W.cb.stat.crests++;if(W.cb.curF)W.cb.curF.causedCrest=true;drenchTrigger('crest');fire('crest',{dmg,cause,banked:banks>1})}
export function checkTide(cause){const cb=W.cb;
 if(cb.tide<10)cb.capped=false;
 if(cb.tide>=10){
  if(bankOn()){if(!cb.capped){cb.capped=true;if(cb.banks<3){cb.banks++;log(`🏦 Crest banked (${cb.banks}/3)`);callout('CREST BANKED ×'+cb.banks,'crest')}cb.tide=10}else cb.tide=10;return}
  const c=mod('crest',{cause},{dmg:TI.crest_dmg,resetTo:5});cb.tide=c.resetTo;if(TI.flip_after_reset)cb.tideDir=-1;fireCrest(c,cause)}
 else if(cb.tide<=0){const u=mod('undertow',{cause},{guard:TI.undertow_blk,draw:TI.undertow_draw,resetTo:5});log(`🌀 UNDERTOW! +${u.guard} Guard, draw ${u.draw}`);callout('UNDERTOW! +'+u.guard+' Guard','undertow');cb.undertowT=Date.now();
  gainBlock(u.guard);drawCards(u.draw);cb.tide=u.resetTo;if(TI.flip_after_reset)cb.tideDir=1;cb.stat.undertows++;if(cb.curF)cb.curF.causedUndertow=true;drenchTrigger('undertow');fire('undertow',{guard:u.guard,draw:u.draw,cause})}}
// Bank the Crest (Power): Crests are held back instead of firing. Release them with the Tide meter button.
export const bankOn=()=>!!(W.cb&&mod('bankCrest',{},false));
function releaseBankImpl(){const cb=W.cb;if(!cb||cb.busy||cb.mode||!cb.banks)return;const n=cb.banks;cb.banks=0;const c=mod('crest',{cause:'bank'},{dmg:TI.crest_dmg,resetTo:5});
 if(cb.tide>=10){cb.tide=c.resetTo;if(TI.flip_after_reset)cb.tideDir=-1;cb.capped=false}fireCrest(c,'bank',n,1.5);after()}
// Spend N Tide (Recede, counted as a Tideturn if it reverses the arrow). Returns the amount actually spent; 0 if there is not enough.
export function spendTide(n){const cb=W.cb;n=Math.min(n,cb.tide);if(n<=0||cb.slack)return 0;tideShift(-n,'spend');return n}
// ================= effect context =================
// f is what a card's effect code (fx ops, p:f=>{}) talks to. Helpers per content-impl-plan §2.3.
export function F(ci,o={}){const cb=W.cb;const def=o.def||CARDS[ci.id];const u=isUp(ci);
 const f={u,ci,def,m:o.mult||1,mult:o.mult||1,echo:!!o.echo,potion:!!o.potion,half:!!o.half,scale:o.scale||1,bonus:o.bonus||0,wp:!!o.wp,rankDmg:o.rankDmg||0,x:o.x||0,allTargets:!!o.allTargets,
  v:(a,b)=>u?b:a,
  get tg(){let t=o.tgt;if(!t||t.hp<=0||t.fled)t=o.echo?randAlive():curTgt();return t},
  get low(){return f._low}, get high(){return f._high}, lowNow:()=>isLow(), highNow:()=>isHigh(),
  num(n){n+=(ci&&ci.sus)||0;if(f.half)n=Math.floor(n*(EC.unmarked_fallback||.5));if(f.scale<1)n=Math.floor(n*f.scale);return n+f.bonus}, // unmarked Echo fallback: v2.2 = 1/4
  dmg(n,h=1){if(f.allTargets)return f.all(n,h);for(let i=0;i<h;i++){const t=f.tg;if(!t)return;hit(t,f.num(n),f)}},
  all(n,h=1){for(let i=0;i<h;i++)alive().forEach(e=>hit(e,f.num(n),f))},
  dmgRandom(n){const t=randAlive();if(t)hit(t,n+f.rankDmg,f,{raw:true})},
  blk(n){return gainBlock(f.num(n)*f.mult,{fromCard:!f.potion&&!f.wp})},
  draw(n){return drawCards(n)},
  weak(n,t){t=t||f.tg;if(t)addSt(t,'weak',n*f.mult)},vuln(n,t){t=t||f.tg;if(t)addSt(t,'vuln',n*f.mult)},
  applyStatus(t,k,n){addSt(t,k,n)},
  surge(n){return f.reached=tideShift(n,f.potion?'potion':'card')},recede(n){return f.reached=tideShift(-n,f.potion?'potion':'card')},setTide(v){return f.reached=setTide(v,'card')},
  parry(n){const p=Math.floor(mod('parry',{card:ci,f},n*f.mult));cb.parry+=p;floatText('p','Parry '+p,'b');return p},
  mom(n){return gainMom(n)},gainEnergy(n){gainEnergy(n)},loseHp(n){loseHp(n)},heal(n){heal(n)},
  addCard(id,pile,opts){return addCard(id,pile,opts)},
  nextTurn(fn,meta){if(meta)fn.meta=meta;cb.nextTurnQ.push(fn)},thisTurn(l){return thisTurn(l)},
  chart(n,then){chart(n,then)},choose(title,opts){choose(title,opts)},
  wpCount:()=>expCount(),topType:()=>{const t=cb.draw[0];return t?CARDS[t.id].t:null},
  intent:()=>{const t=f.tg;if(!t)return null;const m=intentOf(t);return {attacking:!!m.a,total:m.a?eAtk(t,m.a)*(m.h||1):0}}};
 f._low=cb?cb.tide<=TI.low:false;f._high=cb?cb.tide>=TI.high:false;return f}
// ================= Cartographer: Waypoints, Ranks, Advance =================
export function expCount(){const cb=W.cb;return mod('expedition',{},cb.slots.length+cb.slots.filter(w=>(w.rank||0)>=CA.rank_max).length*(CA.landmark_extra||0))}
export function trigWp(w){const d=CARDS[w.id];if(!d.wp)return;const r=w.rank||0;const f=F(w,{wp:true,rankDmg:CA.rank_dmg?CA.rank_dmg[Math.min(r,CA.rank_dmg.length-1)]:r*CA.per_rank}); // v2.2 Rank curve +2/+6/+11
 const gv=f.v;if(r&&CA.guard_per_rank&&d.wpGuard)f.v=(a,b)=>gv(a,b)+r*CA.guard_per_rank;d.wp(f);w.trigT=Date.now();fire('waypointTrigger',{wp:w,f})}
function advanceImpl(i){const cb=W.cb;if(!cb||cb.busy||cb.mode||W.run.cls!=='carto')return false;const w=cb.slots[i];const lim=mod('advances',{},1);
 if(!w||cb.advUsed>=lim||(w.rank||0)>=CA.rank_max){render();return false}
 cb.advUsed++;w.rank=(w.rank||0)+1;cb.stat.advances++;w.advT=Date.now();
 log(`⛰️ Advance: ${cname(w)} → Rank ${w.rank}${w.rank>=CA.rank_max?' (LANDMARK)':''}`);callout(w.rank>=CA.rank_max?'LANDMARK!':'Advance → Rank '+w.rank,'adv');
 fire('advance',{wp:w,slot:i});after();return true}
// A Waypoint leaves its slot: Decamp effect + listeners, Ranks lost (Cairn Stone stores them).
export function removeWp(i,reason){const cb=W.cb;const w=cb.slots.splice(i,1)[0];if(!w)return null;const d=CARDS[w.id];
 if(d.decamp)d.decamp(F(w,{wp:true}),reason);fire('decamp',{wp:w,reason});if(reason!=='returned')cb.stat.wpDestroyed++;
 if((w.rank||0)>0&&hasRelic('cairnstone'))cb.cairn=Math.max(cb.cairn,w.rank);w.rank=0;
 if(!w.temp&&reason!=='returned')cb.disc.push(w);return w}
export function placeWp(ci){const cb=W.cb;const put=()=>{if(cb.cairn){ci.rank=cb.cairn;cb.cairn=0;log('🪨 Cairn Stone: '+cname(ci)+' starts at Rank '+ci.rank)}fire('waypointPlaced',{wp:ci})};
 if(cb.slots.length<cb.nslots){cb.slots.push(ci);log('📍 Waypoint placed: '+cname(ci));put()}
 else pickSlot('Slots full: replace which Waypoint?',i=>{const old=cb.slots[i];removeWp(i,'replaced');cb.slots.splice(i,0,ci);log('📍 '+cname(ci)+' replaces '+cname(old));put()})}
// ================= modes (player choices) =================
export function choose(title,opts){W.cb.mode={k:'choice',title,opts}}
export function chart(n,then0){const cb=W.cb;const then=()=>{fire('chartDone',{n});then0&&then0()};refill(n);cb.mode={k:'chart',n:Math.min(n,cb.draw.length),then,moved:false};fire('chart',{n});if(!cb.mode||!cb.mode.n){if(cb.mode&&cb.mode.k==='chart')cb.mode=null;then&&then()}}
export function pickSlot(title,then){W.cb.mode={k:'slot',title,then}}
function modeActImpl(a,i,j){const cb=W.cb;if(!cb)return;const m=cb.mode;if(!m)return;
 const done=()=>{if(m.thenStart&&!cb.mode){if(W.cb===cb)return nextStart()}return after()};
 if(m.k==='choice'){cb.mode=null;m.opts[i].f();return done()}
 if(m.k==='slot'){cb.mode=null;m.then(i);return done()}
 if(m.k==='chart'){const d=cb.draw;
  if(a==='up'&&i>0)[d[i-1],d[i]]=[d[i],d[i-1]];
  if(a==='dn'&&i<m.n-1)[d[i+1],d[i]]=[d[i],d[i+1]];
  if(a==='mv'&&i!==j&&i>=0&&j>=0&&i<m.n&&j<m.n)d.splice(j,0,d.splice(i,1)[0]); // drag-and-drop reorder (ui/chartdrag.js)
  if(a==='bot'&&!m.moved){d.push(d.splice(i,1)[0]);m.moved=true;m.n--}
  if(a==='done'){cb.mode=null;log('🗺️ Charted');m.then&&m.then();return done()}
  render()}}
// ================= turn lifecycle =================
// startTurn: turn++ -> clear Guard -> energy -> "next turn" effects -> onTurnStart -> Waypoints -> [Chart] -> draw -> onAfterDraw -> Drift (v2.1)
export function startTurn(){const cb=W.cb;if(!cb)return;cb.turn++;
 if(cb.turn>1&&!mod('retainGuard',{},false))cb.p.block=0;
 Object.assign(cb,{parry:0,parryUsed:false,advUsed:0,lastType:null,mark:null,markTgt:null,afterMark:0,armMark:false,armFlourish:false,mark2:null,markTgt2:null,after2:0,mark2Scale:1,extraMarks:0,lastNF:null,lastNFTgt:null,last:null,sel:null,insp:null,slack:false,keepMom:false,tideBtnUsed:false,wheelUsed:false});
 Object.assign(cb.stat,{playedTurn:0,attacksTurn:0,tideturnsTurn:0,echoesTurn:0});
 cb.energy=cb.maxE;if(cb.drainE){cb.energy=Math.max(0,cb.energy-cb.drainE);log(`⚡ Drained: −${cb.drainE} Energy`);cb.drainE=0}
 cb.banner={txt:'Player Turn',t:Date.now()};
 const q=cb.nextTurnQ;cb.nextTurnQ=[];q.forEach(fn=>fn());
 const ts=fire('turnStart',{turn:cb.turn,energy:0,draw:0});if(ts.energy)gainEnergy(ts.energy);
 cb.wpDraw=0;
 if(W.run.cls==='carto')cb.slots.slice().forEach(w=>{for(let k=0;k<mod('wpTriggers',{wp:w},1);k++)trigWp(w)});
 if(!W.cb||!alive().length)return after();
 const n=mod('drawCount',{},(W.run.cls==='carto'?4:5))+(ts.draw||0)+cb.wpDraw+cb.nextDraw;cb.wpDraw=0;cb.nextDraw=0;
 const drawn=()=>{if(!W.cb)return;drawCards(n);if(cb.pendingE){gainEnergy(cb.pendingE);cb.pendingE=0}fire('afterDraw',{turn:cb.turn});drift();after()};
 if(cb.chartQ){const k=cb.chartQ;cb.chartQ=0;chart(k,drawn);render()}else drawn()}
// Tidecaller Drift (v2.1): from turn 2, the Tide moves `drift` in the direction of its last move. After the Guard reset and draw.
function drift(){const cb=W.cb;if(W.run.cls!=='tide'||cb.turn<2||!cb.tideDir)return;
 if(cb.holdDrift){cb.holdDrift=false;log('🔒 The Tide holds');return}
 for(let k=0,t=mod('driftCount',{},1);k<t;k++){const n=mod('drift',{},TI.drift);const dir=cb.tideDir;if(!dir)break;
  cb.driftT=Date.now();log(`🌊 The Tide drifts ${dir>0?'up':'down'} ${n}`);tideShift(dir*n,'drift');fire('drift',{dir,n})}}
// Tide Table / Helmsman's Wheel: free once-per-turn actions on the Tide meter (never block input).
function tideActImpl(a){const cb=W.cb;if(!cb||cb.busy||cb.mode)return;
 if((a==='up'||a==='down')&&hasRelic('tidetable')&&!cb.tideBtnUsed){cb.tideBtnUsed=true;flash(relic('tidetable'));tideShift(a==='up'?1:-1,'relic');return after()}
 if(a==='flip'&&hasRelic('helmwheel')&&!cb.wheelUsed&&cb.tideDir){cb.wheelUsed=true;cb.tideDir=-cb.tideDir;flash(relic('helmwheel'));log('☸️ Helmsman\'s Wheel: drift arrow flipped');return after()}}
export function canPlay(ci){const cb=W.cb;const d=CARDS[ci.id];if(!d||cb.busy||cb.mode||d.unplay)return false;if(cost(ci)>cb.energy)return false;if(d.req&&!d.req(F(ci,{})))return false;return mod('canPlay',{card:ci},true)}
function tapCardImpl(i){const cb=W.cb;if(cb.busy||cb.mode)return;cb.sel=i;cb.insp=null;render()}
// Retained for old debug callers; only the drag release UI commits a card.
export function playSel(){}
// UI toggles for the active class choices (applied to the next card you play)
function armFlourishImpl(){const cb=W.cb;if(!cb||cb.busy)return;cb.armFlourish=!cb.armFlourish&&cb.mom>=flourishMin();render()}
function armMarkImpl(){const cb=W.cb;if(!cb||cb.busy||!canMark())return;cb.armMark=!cb.armMark;render()}
export const flourishMin=()=>mod('flourishMin',{},DU.flourish_min);
export const flourishMult=m=>Math.min(3.5,1+DU.flourish_per_mom*m);
export const markBonus=(after)=>{const cb=W.cb;return Math.min(mod('markCap',{},EC.bonus_cap),mod('markPer',{},EC.bonus_per_card_after)*(after==null?cb.afterMark:after))};
// Marks allowed per turn: 1, +1 from Second Verse / Chorus Draught (this turn) or Twin Clapper (always, but its Echo is half strength). Never more than 2.
export const markLimit=()=>Math.min(2,mod('markSlots',{},1)+(W.cb?W.cb.extraMarks:0));
export const canMark=()=>{const cb=W.cb;return !!cb&&(!cb.mark||(markLimit()>1&&!cb.mark2))};
// playCard(i, opts): opts.flourish (Duelist) and opts.mark (Echo Mage) come from the UI; default = the armed toggles.
function playCardImpl(i,opts={}){const cb=W.cb;const ci=cb.hand[i];if(!ci)return;if(!canPlay(ci)){cb.sel=i;return render()}const d=CARDS[ci.id];
 if(opts.flourish==null)opts.flourish=cb.armFlourish;if(opts.mark==null)opts.mark=cb.armMark;
 if(!W.previewing&&!W.replaying)flyCard(ci,needsTarget(ci)?curTgt():null);
 const c=cost(ci);const x=isX(ci)?cb.energy:0;cb.energy-=isX(ci)?x:c;cb.hand.splice(i,1);ci.tmp0=false;cb.sel=null;
 const tg=curTgt();const f=F(ci,{tgt:tg,x});cb.curF=f;
 // Flourish (Duelist, v2.1): optional, spends all Momentum, x(1 + 0.5 per Momentum), capped at x3.5.
 if(W.run.cls==='duel'&&d.t==='A'){
  const plan=mod('flourishPlan',{f},opts.flourish&&cb.mom>=flourishMin()?{mom:cb.mom,free:false}:null);
  if(plan){f.flourish=true;f.freeFlourish=!!plan.free;f.savedMom=cb.mom;f.momSpent=plan.free?0:cb.mom;
   const ctx=fire('flourish',{f,mom:plan.mom,extra:0});f.fmult=flourishMult(plan.mom+ctx.extra);cb.stat.flourishes++;
   callout(`${plan.free?'FREE ':''}FLOURISH ×${f.fmult}`,'flourish');log(`🔥 FLOURISH ×${f.fmult} (${plan.free?'free; ':''}${plan.mom} Momentum)`)}
 }
 // Mark (Echo Mage, v2.1): once per turn, a non-Faint, non-Power card.
 if(W.run.cls==='echo'){if(cb.mark)cb.afterMark++;if(cb.mark2)cb.after2++;
  if(opts.mark&&canMark()&&d.t!=='P'&&(!d.faint||hasRelic('hollowreed'))){const t2=(needsTarget(ci)||d.tg)?tg:null;
   if(!cb.mark){cb.mark=ci;cb.markTgt=t2;cb.afterMark=0}else{cb.mark2=ci;cb.markTgt2=t2;cb.after2=0;cb.mark2Scale=cb.extraMarks?1:mod('markSecondScale',{},1)}
   fire('mark',{card:ci,second:cb.mark2===ci});log('🔔 Marked: '+cname(ci))}}
 cb.armFlourish=false;cb.armMark=false;
 if(d.t==='W')placeWp(ci);else if(d.t==='P'){const p=cb.powers.find(q=>q.id===ci.id);if(p)p.n++;else cb.powers.push({id:ci.id,up:isUp(ci),n:1,ci})}
 else if(isEx(ci))sinkCard(ci,'played');else cb.disc.push(ci);
 fire('beforeCardPlay',{card:ci,f});
 runCard(d,f);
 if(cb.mimic){cb.mimic=false;const f2=F(ci,{tgt:tg,x});f2.flourish=f.flourish;f2.fmult=f.fmult;log('🖋️ Mimic Ink: '+cname(ci)+' again');runCard(d,f2)}
 if(!W.cb)return;
 if(W.run.cls==='duel'&&d.t==='A'){if(f.flourish)cb.mom=f.freeFlourish?f.savedMom:mod('momAfterFlourish',{f},0);else gainMom(1)}
 cb.lastType=d.t==='A'?'A':d.t==='P'?'P':'S';
 {cb.last=d.t==='P'?null:ci;cb.lastTgt=tg;if(d.t!=='P'&&!d.faint){cb.lastNF=ci;cb.lastNFTgt=tg}}
 const st=cb.stat;st.playedTurn++;st.playedCombat++;if(d.t==='A'){st.attacksTurn++;st.attacksCombat++}if(W.run.stats){W.run.stats.cardsPlayed++;W.run.stats.maxCardsTurn=Math.max(W.run.stats.maxCardsTurn,st.playedTurn)}
 fire('cardPlayed',{card:ci,f,nThisTurn:st.playedTurn,nThisCombat:st.playedCombat,type:d.t});
 cb.curF=null;after()}
export function after(){if(W.previewing)return;if(!W.cb)return;if(W.run.hp<=0&&!cheatDeath())return lose();if(!alive().length&&!W.cb.mode)return win();render()}
// ================= Echo (Echo Mage, v2.1) =================
// Plan: the Marked card at its original target with +min(2, cards after it) (first repeat), else the last non-Faint card at half strength.
// 'echoPlan' modifiers add repeats / doubling (once) / allTargets; total repeats per turn are capped at 4.
export const fbLabel=()=>({.5:'½',.25:'¼'})[EC.unmarked_fallback]||('×'+EC.unmarked_fallback);
export function echoPlan(preview=true,slot=1){const cb=W.cb;let ci=cb.mark,tgt=cb.markTgt,half=false,bonus=0,scale=1;
 if(slot===2){ci=cb.mark2;tgt=cb.markTgt2;if(!ci)return null;bonus=markBonus(cb.after2);scale=cb.mark2Scale}
 else if(ci)bonus=markBonus();else{ci=cb.lastNF;tgt=cb.lastNFTgt;half=EC.unmarked_fallback>0;if(!ci||!EC.unmarked_fallback)return null}
 const plan=mod('echoPlan',{card:ci,marked:!half,preview,slot},{card:ci,tgt,half,bonus,scale,repeats:1,mult:1,allTargets:false,marked:!half,slot});
 plan.capped=Math.max(0,plan.repeats-(EC.cap-cb.stat.echoesTurn));plan.repeats=Math.max(0,Math.min(plan.repeats,EC.cap-cb.stat.echoesTurn));return plan}
// Predicted number of a plan's card (for the live Echo preview): reads the first "Deal N" / "Gain N Guard" of the card text (Resound text when it has one).
export function echoPreview(plan){if(!plan)return null;const ci=plan.card,d=CARDS[ci.id];let t=plain(desc(ci));const rs=/Resound:\s*([^.]*)\./.exec(t);
 if(rs&&/(deal|gain)\s+\d+/i.test(rs[1]))t=rs[1];
 const m=/\bdeal (\d+)(?: to ALL)?/i.exec(t),g=/\bgain (\d+) Guard/i.exec(t);const kind=m&&(!g||m.index<g.index)?'dmg':g?'blk':null;if(!kind)return null;
 let n=+(kind==='dmg'?m[1]:g[1]);n+=ci.sus||0;if(plan.half)n=Math.floor(n*(EC.unmarked_fallback||.5));if(plan.scale<1)n=Math.floor(n*plan.scale);n+=plan.bonus;
 if(kind==='dmg'&&d.t==='A')n+=might();n=Math.floor(n*plan.mult);const t0=plan.tgt&&plan.tgt.hp>0?plan.tgt:null;if(kind==='dmg'&&t0&&t0.st.vuln)n=Math.floor(n*1.5);
 if(kind==='dmg'&&t0&&t0.st.reson)n+=t0.st.reson*plan.mult;
 return {kind,n,total:n*Math.max(1,plan.repeats)}}
export function doEcho(){const cb=W.cb;if(W.run.cls!=='echo')return;
 for(const slot of [1,2]){if(!W.cb||!alive().length)return;const plan=echoPlan(false,slot);if(!plan)continue;const ci=plan.card,d=CARDS[ci.id];
 if(plan.capped)log(`🔇 Echo capped at ${EC.cap} repeats`);
 for(let k=0;k<plan.repeats;k++){if(!alive().length)break;
  const f=F(ci,{echo:true,tgt:plan.tgt,half:plan.half,scale:plan.scale,bonus:k===0?plan.bonus:0,mult:k===0?plan.mult:1,allTargets:plan.allTargets&&d.t==='A'});f.doubled=plan.mult>1&&k===0;
  runCard(d,f);cb.stat.echoesTurn++;cb.stat.echoesCombat++;cb.stat.lastEchoed=ci;
  if(d.sus){ci.sus=(ci.sus||0)+mod('sustain',{card:ci},d.sus)}
  log(`🔊 Echo: ${cname(ci)}${plan.half?' ('+fbLabel()+')':''}${plan.scale<1?' (½)':''}${f.doubled?' (doubled!)':''}${k===0&&plan.bonus?' +'+plan.bonus:''}`);
  fire('echo',{card:ci,f,k,slot})}
 const n=Math.min(plan.repeats,4);if(n)callout(`ECHO${n>1?' ×'+n:''}${plan.bonus?' +'+plan.bonus:''}${plan.mult>1?' DOUBLED':''}`,'echo')}}
// ================= end of turn / enemy phase =================
// endTurn: onTurnEnd -> Echo -> onTurnEndInHand -> Fleeting sink / Moor keep / discard -> Momentum fade -> expire turn fx -> enemy phase
function endTurnImpl(){const cb=W.cb;if(!cb||cb.busy||cb.mode)return;
 fire('turnEnd',{turn:cb.turn});if(!W.cb)return;
 const held=cb.hand.slice();cb.ending=true;doEcho();cb.ending=false;if(W.previewing)return;if(!W.cb)return;if(!alive().length)return win();
 for(const ci of held){const d=CARDS[ci.id];if(cb.hand.includes(ci)&&d.endInHand)d.endInHand(F(ci,{}),ci)}
 fire('turnEndInHand',{});
 if(W.run.hp<=0&&!cheatDeath())return lose();
 // Cards drawn by the Echo (e.g. Mirror Step's old Resound) stay in hand; the rest is discarded, Fleeting cards Sink, Moored cards stay.
 const keep=[];for(const ci of cb.hand){const d=CARDS[ci.id];if(!held.includes(ci)){keep.push(ci);continue}ci.tmp0=false;
  if(d.fleet)sinkCard(ci,'fleeting');else if(d.moor||ci.moor)keep.push(ci);else cb.disc.push(ci)}
 cb.hand=keep;cb.sel=null;cb.insp=null;
 if(W.run.cls==='duel'&&!cb.keepMom&&!mod('keepMomentum',{},false))cb.mom=Math.max(0,cb.mom-DU.decay);cb.keepMom=false;
 cb.fx=cb.fx.filter(l=>l.combat||(l.turns&&--l.turns>0));
 cb.busy=true;cb.banner={txt:'Enemy Turn',t:Date.now(),en:1};render();
 if(window.FAST)enemyPhase();else setTimeout(enemyPhase,280)}
export function eAtk(e,a){let d=a+(e.st.str||0)+(e.st.mightTmp||0);if(e.st.weak)d=Math.floor(d*.75);if(W.cb.p.st.vuln)d=Math.floor(d*1.5);return Math.max(0,d)}
export function intentOf(e){const t=EN[e.key];const m=t.intent?t.intent(e):e.next;return mod('intentDisplay',{enemy:e},m)||{none:1}}
// Enemy Attack on the player: Parry first (reduce the first Attack, reflect half, once per turn), then Guard, then HP.
export function enemyHitPlayer(e,d){const cb=W.cb;
 if(cb.parry>0&&!cb.parryUsed){cb.parryUsed=true;const red=Math.min(cb.parry,d);d-=red;const back=Math.floor(cb.parry*mod('parryReflect',{enemy:e},DU.parry_back_frac));
  log(`⚔️ Parry! −${red}, ${back} back to ${e.n}`);callout('PARRY! ↩ '+back,'parry');if(back)dmgEnemy(e,back);cb.retort=true;fire('parry',{enemy:e,reflected:back,reduced:red})}
 const b=Math.min(cb.p.block,d);cb.p.block-=b;const rest=d-b;W.run.hp-=rest;floatText('p',rest>0?'-'+rest:'🛡'+b,rest>0?'':'b');cb.pshake=Date.now();fire('playerHit',{enemy:e,amount:rest,blocked:b});
 if(rest>0&&W.run.cls==='duel'&&cb.mom>0){const lose=mod('momLoss',{},DU.lose_on_unblocked);cb.mom=Math.max(0,cb.mom-lose);log('💢 Hit: −'+lose+' Momentum')}
 if(rest>0)fire('playerDamaged',{enemy:e,amount:rest});
 if(W.run.hp<=0)cheatDeath()}
export function act(e){const cb=W.cb;cb.acting=e;const t=EN[e.key];const m=intentOf(e);e.lastAct=m;fire('enemyAct',{enemy:e,intent:m});if(m.b)e.blkT=Date.now();if(m.lbl)log(`${e.e} ${e.n}: ${m.lbl}`);
 if(m.b)e.block+=m.b;if(m.s)addSt(e,'str',m.s);
 if(m.a){e.atkT=Date.now();for(let h=0;h<(m.h||1);h++){if(W.run.hp<=0||e.hp<=0||!W.cb)break;enemyHitPlayer(e,eAtk(e,m.a))}fire('playerAttacked',{enemy:e})}
 if(!W.cb||e.hp<=0&&!m.boom)return;
 if(m.healAlly){let t=alive().find(x=>x.uid===m.tgt&&x!==e),n=m.healAlly;if(!t){t=e;n=5}const h=Math.min(n,t.max-t.hp);t.hp+=h;if(h)floatText(t.uid,'+'+h,'h');log(`🪡 ${e.n} stitches ${t===e?'herself':t.n} (+${h})`)}
 if(m.heal){const h=Math.min(m.heal,e.max-e.hp);e.hp+=h;if(h)floatText(e.uid,'+'+h,'h')}
 if(m.w)addSt(cb.p,'weak',m.w);if(m.v)addSt(cb.p,'vuln',m.v);if(m.brittle)addSt(cb.p,'brittle',m.brittle);
 if(m.status){for(let i=0;i<m.status.n;i++)addCard(m.status.id,m.status.pile==='draw'?'drawRandom':m.status.pile||'disc');log(`🌿 ${m.status.n} ${CARDS[m.status.id].n} added to your ${m.status.pile==='draw'?'draw pile':m.status.pile==='hand'?'hand':'discard'}`)}
 if(m.drainE){cb.drainE=(cb.drainE||0)+m.drainE}
 if(m.stealPotion){const i=W.run.potions.findIndex(p=>p);if(i>=0){log('🧪 '+e.n+' stole your '+POTIONS[W.run.potions[i]].n);W.run.potions[i]=null}}
 if(m.boom&&e.hp>0){e.hp=0;log(`🍄 ${e.n} bursts`)}
 if(m.summon){const n=m.n||1;for(let i=0;i<n;i++){if(m.max&&countAlive(m.summon)>=m.max)break;spawn(m.summon,{summoned:true});log(`📯 ${EN[m.summon].n} joins the fight`)}}
 if(m.steal){const g=Math.min(m.steal,W.run.gold);W.run.gold-=g;e.fled=true;e.stole=g;log(`🐦 ${e.n} stole ${g} gold and flew off!`)}
 if(m.ring){for(let i=0;i<m.ring;i++)addCard('ringing','disc');log(`🔔 ${m.ring} Ringing added to your discard`)}
 if(m.fx)m.fx(e)}
function endOfEnemyTurn(e){const t=EN[e.key];if(t.passive&&t.passive.endTurn)t.passive.endTurn(e);
 if(e.st.shell)e.block+=e.st.shell;if(e.st.mending&&e.hp>0){const h=Math.min(e.st.mending,e.max-e.hp);e.hp+=h;if(h)floatText(e.uid,'+'+h,'h')}}
const TELEGRAPH=250; // ms the acting enemy crouches and flashes before it strikes (skipped when FAST)
export function enemyPhase(){const cb=W.cb;if(!cb)return;
 // Start of the enemy turn: the player's Soaked / Exposed / Brittle wear off by 1.
 tick(cb.p.st);
 const list=cb.ens.slice();let k=0;const telegraphed=new Set();
 const step=()=>{if(!W.cb||W.cb!==cb)return;
  while(k<list.length&&(list[k].hp<=0||list[k].fled))k++;
  if(k>=list.length)return finish();
  const e=list[k++];cb.tele=e;if(!window.FAST&&!telegraphed.has(e)){telegraphed.add(e);k--;fire('enemyTelegraph',{enemy:e});render();return setTimeout(step,TELEGRAPH)}
  if(!(e.passive&&e.passive.keepGuard))e.block=0;act(e);if(!W.cb)return;cb.acting=null;e.t++;if(e.hp>0)endOfEnemyTurn(e);tick(e.st,e.hold);e.hold=null;delete e.st.mightTmp;
  if(e.hp>0&&!e.fled){if(e.keepNext)e.keepNext=false;else e.next=EN[e.key].ai(e)}
  if(W.run.hp<=0&&!cheatDeath())return lose();
  if(!alive().length)return finish();
  if(window.FAST)return step();render();setTimeout(step,260)};
 const finish=()=>{if(!W.cb)return;cb.tele=null;fire('roundEnd',{});cb.busy=false;cb.retortOk=cb.retort;cb.retort=false;if(!alive().length)return win();startTurn()};
 step()}
export function win(){const cb=W.cb;const k=cb.kind;fire('combatEnd',{kind:k,won:true});W.run.deck.forEach(ci=>{ci.tmpUp=false;ci.tmp0=false});
 const allFled=cb.ens.some(e=>e.fled)&&cb.ens.every(e=>e.fled||e.summoned);
 W.cb=null;combatRewards(k,{allFled,opts:cb.opts,cb})}
export function lose(){if(W.cb)fire('combatEnd',{kind:W.cb.kind,won:false});W.cb=null;endRun(false)}
// Mist Bomb: escape a normal combat with no rewards.
export function escape(){const cb=W.cb;fire('combatEnd',{kind:cb.kind,won:false,escaped:true});W.run.deck.forEach(ci=>{ci.tmpUp=false;ci.tmp0=false});W.cb=null;goMap()}
// ================= potions (§1.3): not a card play — no Momentum, Echo, counters or onCardPlayed =================
export function potionNeedsTarget(id){return POTIONS[id]&&POTIONS[id].target==='enemy'}
export function canDrink(id){const p=POTIONS[id];if(!p)return false;if(W.cb)return !W.cb.busy&&!W.cb.mode&&(!p.can||p.can());return !!p.outside}
// drinkPotion(slot, enemyIndex?) uses the potion in that slot.  G.usePotion(id, enemyIndex?) drinks by id (debug/tests: works even if not owned).
function drinkPotionImpl(slot,ti){const id=W.run.potions[slot];if(!id||!canDrink(id))return false;W.run.potions[slot]=null;applyPotion(id,ti);return true}
export function usePotion(id,ti){const s=W.run.potions.indexOf(id);if(s>=0)return drinkPotion(s,ti);if(!canDrink(id))return false;applyPotion(id,ti);return true}
function applyPotion(id,ti){const p=POTIONS[id];if(W.run.stats)W.run.stats.potionsUsed=(W.run.stats.potionsUsed||0)+1;
 if(!W.cb){p.use({potion:true,heal,outside:true},null);if(W.run.hp>W.run.max)W.run.hp=W.run.max;return render()}
 const cb=W.cb;if(ti!=null&&cb.ens[ti]&&cb.ens[ti].hp>0)cb.tgt=ti;const tg=p.target==='enemy'?curTgt():null;
 const f=F({id,up:false,uid:-1},{def:Object.assign({t:'potion'},p),potion:true,tgt:tg});log('🧪 '+p.n);callout(p.n,'potion');
 p.use(f,tg);fire('potionUsed',{id});after()}

export function playCard(...args){return savedAction('playCard',args,()=>playCardImpl(...args))}

export function endTurn(...args){return savedAction('endTurn',args,()=>endTurnImpl(...args))}

export function modeAct(...args){return savedAction('modeAct',args,()=>modeActImpl(...args))}

export function advance(...args){return savedAction('advance',args,()=>advanceImpl(...args))}

export function tideAct(...args){return savedAction('tideAct',args,()=>tideActImpl(...args))}

export function releaseBank(...args){return savedAction('releaseBank',args,()=>releaseBankImpl(...args))}

export function drinkPotion(...args){return savedAction('drinkPotion',args,()=>drinkPotionImpl(...args))}

export function armFlourish(...args){return savedAction('armFlourish',args,()=>armFlourishImpl(...args))}

export function armMark(...args){return savedAction('armMark',args,()=>armMarkImpl(...args))}

export function tapCard(...args){return savedAction('tapCard',args,()=>tapCardImpl(...args))}

export function startCombat(...args){return savedAction('startCombat',args,()=>startCombatImpl(...args))}
