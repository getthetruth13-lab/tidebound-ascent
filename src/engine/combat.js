import {savedAction} from '../save.js';
// engine/combat.js — turn/card-play lifecycle, damage & Guard pipelines, class rules (v2.1), enemies.
// Ordering contract: design/content-impl-plan.md §2 ("Turn / play ordering contract"). Rule numbers: DATA.v21.sim.core.
import {CARDS,EN,POTIONS} from '../core/registry.js';
import {W,nextId,pick,rng,shuffle,R} from '../core/state.js';
import {spriteCount} from '../assets.js';
import {cname,cost,desc,isEx,isUp,isX,lvlOf,mk,needsTarget,plain,rv} from './cards.js';
import {runCard} from './effects.js';
import {fire,mod,thisTurn} from '../core/bus.js';
import {DATA} from '../data/generated/data-v2.js';
import {BOSS_OPEN,bellCount} from '../data/lore.js';
import {combatRewards,gainCard,goMap,endRun,ECON} from './run.js';
import {flyCard} from '../ui/fx.js';
import {impactDelay} from '../ui/vfx.js';
import {T,EB,beatsFor} from '../core/timing.js';
import {render} from '../ui/render.js';
export const CORE=DATA.v21.sim.core;
const DU=CORE.duel,TI=CORE.tide,EC=CORE.echo,CA=CORE.carto;
const cs='combat'; // RNG stream for everything in combat
// ================= queries =================
export function alive(){return W.cb?W.cb.ens.filter(e=>e.hp>0&&!e.fled):[]}
export function randAlive(){const a=alive();if(!a.length)return null;const b=a.filter(x=>!x.sub&&!x.back);return pick(b.length?b:a,cs)} // Act 3: submerged / back-rank enemies are not picked at random
export function strongest(){return alive().sort((a,b)=>b.hp-a.hp)[0]}
// Act 3 (R4 Cloud Dive, R7 Twin Squalls): a submerged or back-rank enemy cannot be the single target while another one can.
export function curTgt(){let t=W.cb.ens[W.cb.tgt];if(!t||t.hp<=0||t.fled||t.sub||t.back){const a=alive();t=a.find(x=>!x.sub&&!x.back)||a.find(x=>!x.back)||a[0];W.cb.tgt=W.cb.ens.indexOf(t)}return t}
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
 e.st[k]=(e.st[k]||0)+n;if(k==='bleed')e.st.bleed=Math.min(20,e.st.bleed);if(k==='weak'||k==='vuln'||k==='brittle')e.st[k]=Math.min(8,e.st[k]);if(k==='str')e.st.str=isP?Math.min(8,e.st.str):Math.max(-6,e.st.str);if(k==='drench'||k==='reson')e.st[k]=Math.min(12,e.st[k]);if(!e.st[k])delete e.st[k];
 // Debuffs put on an enemy after your turn has ended (Echo / Resound) skip that enemy's next tick, so they last into your next turn.
 if(W.cb&&W.cb.ending&&!isP&&(k==='weak'||k==='vuln'||k==='brittle'||k==='drench'||k==='reson'))(e.hold=e.hold||{})[k]=1;
 fire('statusApplied',{target:e,key:k,n,player:isP})}
export function tick(st,hold){['weak','vuln','brittle','drench','reson'].forEach(k=>{if(hold&&hold[k])return;if(st[k]){st[k]--;if(!st[k])delete st[k]}})}
// ================= enemies =================
export function spawn(key,o={}){const t=EN[key];let hp=rng(t.hp[0],t.hp[1],cs);{const asc=(W.run&&W.run.asc)|0;if(asc>0){let m=asc>=5?1.16:1.08;if(asc>=2&&(t.elite||t.boss))m*=1.1;hp=Math.round(hp*m)}} // Ascension: more foe HP, no extra RNG
 const e={key,n:t.n,e:t.e,hp,max:hp,block:t.b0||0,st:Object.assign({},t.st0||{}),t:0,ci:0,ph:1,uid:nextId(),elite:t.elite,boss:t.boss,summoned:!!o.summoned,passive:t.passive||null};
 e.k=W.cb.ens.filter(x=>x.key===key).length;if(t.randomSprite){const nv=spriteCount('enemies',key);if(nv>1)e.sv=R(nv,'sprites')} // own stream: never shifts combat rolls
 W.cb.ens.push(e);e.next=t.ai(e);if(t.onSpawn)t.onSpawn(e);return e}
export function countAlive(key){return alive().filter(x=>x.key===key).length}
// ================= combat start =================
function startCombatImpl(kind,enc,opts={}){
 W.run.deck.forEach(ci=>{ci.sus=0;ci.moor=false;delete ci.pk;ci.tmp0=false;ci.tmpUp=false;ci.rank=0});
 const cb=W.cb={kind,ens:[],tgt:0,p:{block:0,st:{}},energy:3,maxE:3,banner:null,insp:null,hand:[],draw:shuffle(W.run.deck.slice(),cs),disc:[],exh:[],log:[],vfx:[],callouts:[],fx:[],powers:[],
  stat:{playedTurn:0,playedCombat:0,attacksTurn:0,attacksCombat:0,tideturnsTurn:0,tideturnsCombat:0,crests:0,undertows:0,echoesTurn:0,echoesCombat:0,wpDestroyed:0,wpLeft:0,wpLeftTurn:0,wpLeftLast:0,lastTideDir:0,lastEchoed:null,flourishes:0,advances:0},
  turn:0,lastType:null,mode:null,busy:false,sel:null,opts:opts,startQ:[],nextTurnQ:[],pendingE:0,nextDraw:0,
  tide:5,tideDir:0,banks:0,capped:false,holdDrift:false,mark2:null,markTgt2:null,after2:0,mark2Scale:1,extraMarks:0,last:null,lastTgt:null,lastNF:null,lastNFTgt:null,mark:null,markTgt:null,afterMark:0,armMark:false,armFlourish:false,
  slots:[],nslots:3,chartQ:0,wpDraw:0,advUsed:0,mom:0,keepMom:false,parry:0,parryUsed:false,cairn:0,flags:{},
  breaks:0,decUsed:0,parries:{},parryHit:{},cleanDone:{},momLostPhase:false,markType:null,mark2Type:null,playSeq:0};
 Object.defineProperty(cb,'pstr',{get(){return cb.p.st.str||0},set(v){cb.p.st.str=v;if(!v)delete cb.p.st.str},enumerable:false});
 Object.defineProperty(cb,'tdir',{get(){return cb.tideDir},set(v){cb.tideDir=v},enumerable:false});
 // Opening cards go to the top of the draw pile (design §2.1).
 const open=cb.draw.filter(c=>c.open||CARDS[c.id].open||(CARDS[c.id].openU&&isUp(c)));if(open.length){cb.draw=open.concat(cb.draw.filter(c=>!open.includes(c)))}
 enc.forEach(k=>spawn(k));cb.bossKey=(cb.ens.find(e=>e.boss)||{}).key||null;
 {const open=BOSS_OPEN[cb.bossKey];if(open){const t=open(bellCount(W.run.seed));log((cb.bossKey==='bell'?'🔔 ':cb.bossKey==='tenant'?'🏚️ ':cb.bossKey==='matriarch'?'🪸 ':(EN[cb.bossKey].e||'')+' ')+t);const be=cb.ens.find(x=>x.boss);bossBeat('intro',EN[cb.bossKey].n,t,be)}} // lore: the boss speaks first (bible §16 items 7-9)
 const cls=W.run.cls;
 if(cls==='carto'&&hasRelic('celestial'))cb.nslots=4; // Celestial Sextant (boss relic)
 if(cls==='duel')cb.mom=DU.start_mom;
 if(cls==='carto'&&hasRelic('sextant'))cb.startQ.push(()=>gainBlock(6)); // Brass Sextant: a steady bearing, 6 Guard as the fight opens (Task 42)
 if(cls==='carto'&&!hasRelic('trailboots')){
  const pool=['signal','cache','lookout'];
  if(hasRelic('sextant')||hasRelic('celestial'))cb.startQ.push(()=>choose((hasRelic('celestial')?'Celestial Sextant':'Brass Sextant')+': choose your starting Waypoint (upgraded, Rank 1)',shuffle(pool.slice(),cs).map(id=>({l:`${CARDS[id].e} ${CARDS[id].n}+`,card:{id,up:true,rank:1},cap:'Rank 1 · upgraded',f:()=>{placeStartWp(id,true,1)}}))));
  else placeStartWp(pick(pool,cs),false,0);
  if(hasRelic('staratlas'))placeStartWp(pick(pool,cs),false,0);
 }
 if(cls==='carto'&&W.run.preWp){const p=W.run.preWp;W.run.preWp=null;if(CARDS[p.id]&&cb.slots.length<cb.nslots)placeStartWp(p.id,p.up,p.rank)}
 fire('combatStart',{cb,kind,enemies:cb.ens});
 // Event leftovers (Act 2 Warden Stone, Act 3 Hail Shelter / Weathervane): a few fights open with Guard or Might.
 for(const k of ['holdStone','hailStone']){if(W.run[k]>0){W.run[k]--;startQ6(cb)}}
 if(W.run.weatherVane>0){W.run.weatherVane--;addSt(cb.p,'str',1)}
 // First sight of an enemy with a rule (ACT2-RULES tutorial line): one hint per rule per run.
 {const seen=W.run.tipsSeen||(W.run.tipsSeen={});const t=cb.ens.map(e=>EN[e.key].tip).find(x=>x&&!seen[x]);if(t){seen[t]=1;cb.hint={t:Date.now(),txt:t}}}
 W.S={screen:'combat'};
 nextStart()}
const startQ6=cb=>cb.startQ.push(()=>gainBlock(6));
function placeStartWp(id,up,rank){const w=mk(id,up,{temp:true,rank});W.cb.slots.push(w);log('🧭 Starting Waypoint: '+cname(w)+(rank?' (Rank '+rank+')':''))}
// Start-of-combat choices (Moon Shell's Tide, Brass Sextant's Waypoint) open one at a time before the first draw.
function nextStart(){const cb=W.cb;if(!cb)return;if(cb.startQ.length){const q=cb.startQ.shift();q();if(cb.mode){cb.mode.thenStart=true;return render()}return nextStart()}startTurn()}
export const hasRelic=id=>!!(W.run&&W.run.relics&&W.run.relics.some(r=>r.id===id));
export const relic=id=>W.run&&W.run.relics&&W.run.relics.find(r=>r.id===id);
// ================= Guard =================
// Guard pipeline (§4.2 modifyGuard): base(+Sustain) -> +Poise -> x0.75 Brittle (card Guard only) -> 'guard' modifiers -> floor.
export function gainBlock(n,o={}){const cb=W.cb;if(!cb)return 0;if(o.fromCard){n+=cb.p.st.dex||0;if(cb.p.st.brittle)n*=.75}
 n=Math.floor(mod('guard',{fromCard:!!o.fromCard},n));
 // Act 3 R5 Storm Tide: a non-Tide hero's first Guard card is 1 weaker (a live Magus). R12 Siphon: each Anchorite takes half of card Guard (max 8 per turn).
 if(o.fromCard&&!o.echo&&cb.storm&&!cb.stormUsed&&W.run.cls!=='tide'&&alive().some(x=>x.key==='magus')){cb.stormUsed=true;n=Math.max(0,n-1);floatText('p','Storm Tide','b')}
 if(n<=0)return 0;cb.p.block+=n;cb.p.blkT=Date.now();floatText('p','+'+n+'🛡','b');fire('guardGained',{amount:n});
 if(o.fromCard)alive().filter(x=>x.key==='anchorite').forEach(x=>{let t=Math.floor(n/2);t=Math.max(0,Math.min(Math.floor(mod('siphon',{enemy:x},t)),8-(x.siph||0)));if(t>0){x.siph=(x.siph||0)+t;x.block+=t;x.blkT=Date.now();floatText(x.uid,'+'+t+'🛡','b');log('⛓️ '+x.n+' siphons '+t+' Guard')}});
 return n}
export function gainMom(n){const cb=W.cb;const mx=mod('momMax',{},DU.mom_max);const was=cb.mom;cb.mom=Math.max(0,Math.min(mx,cb.mom+n));return cb.mom-was}
export function gainEnergy(n){if(!W.cb)return;W.cb.energy+=n;if(n>0)floatText('p','+'+n+'⚡','e')}
// cards-act1 rule 22/23 caps (per turn, reset in startTurn). bonusEnergy: family ('tide'|'echo'|'carto'|'duel', null = no family) max 2,
// all sources max 5. passiveDraw: family max 3 (startOfTurn adds to the turn's draw instead of drawing now). Both return what was given.
const capTurn=cb=>{if(cb.capT!==cb.turn){cb.capT=cb.turn;cb.eFam={};cb.eTot=0;cb.dFam={}}};
export function bonusEnergy(n,fam){const cb=W.cb;if(!cb||n<=0)return 0;capTurn(cb);const used=fam?(cb.eFam[fam]||0):0;
 const k=Math.max(0,Math.min(n,fam?2-used:n,5-(cb.eTot||0)));if(!k){log('⚡ Bonus Energy cap reached');return 0}if(fam)cb.eFam[fam]=used+k;cb.eTot=(cb.eTot||0)+k;gainEnergy(k);return k}
export function passiveDraw(n,fam,o={}){const cb=W.cb;if(!cb||n<=0)return 0;capTurn(cb);const used=cb.dFam[fam]||0;const k=Math.max(0,Math.min(n,3-used));
 if(!k){log('🃏 Passive draw cap (3 a turn) reached');return 0}cb.dFam[fam]=used+k;if(o.startOfTurn){cb.wpDraw=(cb.wpDraw||0)+k;return k}return drawCards(k)}
// ================= piles =================
export function refill(k){const cb=W.cb;if(cb.draw.length<k&&cb.disc.length){cb.draw=cb.draw.concat(shuffle(cb.disc,cs));cb.disc=[];fire('shuffle',{})}}
export const handLimit=()=>mod('handLimit',{},10);
export function drawCards(n){const cb=W.cb;let k=0;for(let i=0;i<n;i++){if(!W.cb)return k;if(cb.hand.length>=handLimit())break;refill(1);if(!cb.draw.length)break;const c=cb.draw.shift();if(c.id==='static'){const sx=fire('staticDrawn',{card:c});if(sx.sink){sinkCard(c,'static');continue}} /* Act 3 hook: onStaticDrawn */ cb.hand.push(c);k++;
  const d=CARDS[c.id];if(d.onDrawSelf)d.onDrawSelf(F(c,{}),c);fire('draw',{card:c})}return k}
// Add a created card (token, status, Kelp...) respecting the hand limit (overflow goes to the discard pile).
export function addCard(id,pile='hand',o={}){const cb=W.cb;const ci=mk(id,o.up,{temp:!!o.temp,tmp0:!!o.cost0Turn});
 if(pile==='hand'&&cb.hand.length>=handLimit())pile='disc';
 if(pile==='drawRandom'){cb.draw.splice(R(cb.draw.length+1,cs),0,ci)}else if(pile==='draw')cb.draw.unshift(ci);else cb[pile].push(ci);fire('cardAdded',{card:ci,pile});return ci}
export function sinkCard(ci,reason){W.cb.exh.push(ci);fire('sink',{card:ci,reason:reason||'played'})}
// ================= damage =================
// Attack damage pipeline (§4.2 modifyDamage + design §2.1 multiplier rule):
//   base (+Sustain, half for an unmarked Echo, +Mark bonus)  -> +Might, +Duel Focus, 'damageAdd' modifiers (Whale Tooth...)
//   -> x Flourish (<=3.5) -> x Echo doubling (once) -> Soaked x0.75 -> Exposed x1.5 -> 'damage' modifiers -> floor.
// Bleed triggers before the hit (HP loss, ignores Guard), once per Attack per enemy.
export function hit(e,base,f,o={}){if(!e||e.hp<=0||e.fled)return 0;const cb=W.cb;
 if(e.sub&&!o.aoe&&!o.raw&&f&&f.def&&!f.potion&&!f.wp){floatText(e.uid,'Submerged','b');return 0} /* R4: only area damage, Bleed and Drenched reach a submerged enemy */
 const atk=!o.raw&&!!(f&&f.def&&f.def.t==='A'&&!f.potion);let d=base;
 if(atk){d+=might();if(W.run.cls==='duel'){const top=Math.max(...alive().map(x=>x.hp));if(e.hp===top)d+=mod('focus',{target:e,f},DU.focus)}{const pre=d;d=mod('damageAdd',{target:e,f,attack:true},d);if(f.echo&&d>pre)d=pre+Math.min(d-pre,Math.max(0,EC_BONUS_MAX-(f.bonus||0)))}if(f.echo&&e.st.reson)d+=e.st.reson;
  if(f.flourish)d=Math.floor(d*f.fmult);if(f.mult>1)d*=f.mult;if(cb.p.st.weak)d=Math.floor(d*.75)}
 else if(f&&f.mult>1)d*=f.mult;
 if(!atk&&f&&f.lm)d*=2;else if(!atk&&f&&f.ramp>1)d=Math.floor(d*f.ramp);
 if(o.cap!=null)d=Math.min(d,o.cap); // a card's "max N" applies after relic doubling (Tuning Fork, Landmark)
 if(e.st.vuln)d=Math.floor(d*1.5);
 d=Math.max(0,Math.floor(mod('damage',{target:e,f,attack:atk,raw:!!o.raw},d)));
 const pa=EN[e.key].passive||{};
 if(atk&&pa.armour&&!e.armSpent){e.armSpent=true;d=0;floatText(e.uid,'Armoured','b');fire('armourAbsorb',{target:e,f})} // R3: the first Attack hit each turn bounces off
 {const dm=EN[e.key].dmgMod;if(dm&&d>0)d=dm(e,d)} // Act 3: Spindrift (Engine ring), the Shard holder's half
 if(atk&&pa.mantlet&&e.block>d&&f&&!f.mantled){f.mantled=true;floatText('p','-'+pa.mantlet,'');loseHp(pa.mantlet)} // Spiked Mantlet: not on the hit that breaks the Guard
 if(atk&&e.st.bleed&&!(f.bled||(f.bled=new Set())).has(e)){f.bled.add(e);const b=Math.ceil(mod('bleedDamage',{target:e},e.st.bleed));loseHpEnemy(e,b,'bleed');if(!mod('keepBleed',{target:e},false)){e.st.bleed--;if(!e.st.bleed)delete e.st.bleed}if(e.hp<=0)return 0}
 const dealt=dmgEnemy(e,d,{f,attack:atk});
 if(atk&&e.st.barbs&&alive().length){loseHp(e.st.barbs,{source:'barbs',guard:true})}
 if(f){f.lastDealt=dealt}
 if(W.run.stats&&dealt>W.run.stats.maxHit)W.run.stats.maxHit=dealt;
 return dealt}
export function loseHpEnemy(e,n,why){if(e.hp<=0)return;{const dm=EN[e.key].dmgMod;if(dm&&n>0)n=dm(e,n)}e.hp-=n;floatText(e.uid,'-'+n,why==='bleed'?'bleed':'');e.shake=Date.now();afterEnemyDamage(e,null)}
export function dmgEnemy(e,d,o={}){if(e.hp<=0)return 0;const b=Math.min(e.block,d);e.block-=b;d-=b;e.hp-=d;const tb=EN[e.key];if(b>0&&e.block===0&&tb.onGuardBroken&&e.hp>0)tb.onGuardBroken(e);floatText(e.uid,d>0?'-'+d:(b?'🛡'+b:'0'),d>0?'':'b');e.shake=Date.now();
 fire('damageDealt',{target:e,amount:d+b,hpLoss:d,f:o.f});afterEnemyDamage(e,o.f);return d}
function afterEnemyDamage(e,f){const t=EN[e.key];if(e.hp>0&&t.onDamaged)t.onDamaged(e);
 if(e.hp<=0){e.hp=0;W.run.kills++;if(W.run.stats)W.run.stats.kills++;log('💥 '+e.n+' defeated');if(f)f.killed=true;if(t.onDeath)t.onDeath(e);fire('enemyKilled',{enemy:e,summon:e.summoned,f})}}
// Unblockable self HP loss (Brine Rot, Reckless...). guard:true lets Guard absorb it (Scald, Barbs).
export function loseHp(n,o={}){const cb=W.cb;if(o.guard&&cb){const b=Math.min(cb.p.block,n);cb.p.block-=b;n-=b;if(n>0)n=Math.max(0,Math.floor(mod('damageTaken',{source:o.source},n))) /* Act 3 hook: modifyDamageTaken */}if(n<=0)return;W.run.hp=Math.max(0,W.run.hp-n);if(W.run.stats)W.run.stats.lastHit={by:o.source==='barbs'?'Barbs':'Your own cost',amt:n,turn:(cb&&cb.turn)||0};if(cb){floatText('p','-'+n);cb.pshake=Date.now()}if(W.run.hp<=0)cheatDeath();if(cb&&W.run.hp>0&&W.run.hp<=W.run.max*.3)fire('hpLow',{hp:W.run.hp}) /* Act 3 hook: onHpLow */}
export function heal(n){W.run.hp=Math.min(W.run.max,W.run.hp+Math.max(0,Math.floor(n)));if(W.cb&&n>0)floatText('p','+'+Math.floor(n)+'❤','h')}
// onPlayerDeath (§4.2): relics first (Tidewrack Scale), then potions (Second Tide). Returns true if the death was cancelled.
export function cheatDeath(){if(W.run.hp>0)return true;const ctx=fire('playerDeath',{});if(ctx.cancel&&W.run.hp>0){return true}return false}
// ================= Tide (Tidecaller, v2.1) =================
export const isHigh=()=>W.cb.tide>=TI.high, isLow=()=>W.cb.tide<=TI.low;
export function setTide(v,cause){const cb=W.cb;const from=cb.tide;const to=Math.max(0,Math.min(10,v));const dir=Math.sign(to-from);
 if(dir){noteDir(dir,cause)}cb.tide=to;fire('tideChange',{from,to,delta:to-from,cause:cause||'set'});checkTide(cause);return to}
// Returns the Tide reached by the move (before a Crest/Undertow resets it to 5), so cards can check "if now at Low/High Tide".
export function tideShift(n,cause){const cb=W.cb;if(!n)return cb.tide;
 if(cb.storm&&cause==='card'&&alive().some(x=>x.key==='magus')){const m=Math.max(0,Math.abs(n)-1);n=Math.sign(n)*m;if(!n){floatText('p','Storm Tide','b');return cb.tide}} /* R5 Storm Tide: Surge and Recede are 1 weaker */
 if(cb.slack&&cause!=='drift')return cb.tide;const from=cb.tide,dir=Math.sign(n);
 const wasHigh=isHigh();noteDir(dir,cause);const to=Math.max(0,Math.min(10,from+n));cb.tide=to;
 fire(dir>0?'surge':'recede',{n:Math.abs(n),wasHigh,cause});fire('tideChange',{from,to,delta:to-from,cause:cause||'card'});checkTide(cause);return to}
function noteDir(dir,cause){const cb=W.cb;if(cb.tideDir&&dir!==cb.tideDir){cb.stat.tideturnsTurn++;cb.stat.tideturnsCombat++;fire('tideTurn',{nThisTurn:cb.stat.tideturnsTurn,nThisCombat:cb.stat.tideturnsCombat,cause});drenchTrigger('turn')}cb.tideDir=dir;cb.stat.lastTideDir=dir}
// Drenched (enemy status, Tidecaller): whenever the Tide turns, Crests or Undertows, each Drenched enemy takes X (ignores Guard).
export function drenchTrigger(why){if(!W.cb)return;alive().forEach(e=>{if(e.st.drench&&e.hp>0){floatText(e.uid,'-'+e.st.drench+'💧','drench');loseHpEnemy(e,e.st.drench,'drench')}})}
// Crest damage for one release: Banked Crests (Bank the Crest) fire together, each at 1½ x a plain Crest.
export function fireCrest(c,cause,banks=1,mult=1){const rb=noteBreak('crest');const one=Math.min(CREST_CAP,Math.floor(Math.ceil(c.dmg*mult)*rb));const dmg=one*banks;
 log(`🌊 CREST! ${dmg} to ALL${rb>1?' (Rolling Break ×1.5)':''}`);callout('CREST! '+dmg+' to ALL','crest');W.cb.crestT=Date.now();
 const only=c.only&&c.only.hp>0?[c.only]:null; // Tidebreaker: the Crest hits one enemy (c.only), c.dmg already doubled by the card
 (only||alive()).forEach(e=>{for(let b=0;b<banks;b++)hit(e,one,null,{raw:true,crest:true})});W.cb.stat.crests++;if(W.cb.curF)W.cb.curF.causedCrest=true;drenchTrigger('crest');fire('crest',{dmg,cause,banked:banks>1,rolling:rb>1,breakN:W.cb.breaks});bigMoment('break',{what:'crest'})}
// ---- cards-act1: Rolling Break (rule 29). breaks = break count this turn (reset at the start of your turn and of the enemy phase).
// Returns the multiplier for THIS break: x1.5 on the 2nd ('rollingAll' modifier, e.g. Chain of Tides: also 3rd+). Damage and Guard only.
export const CREST_CAP=60;
export function noteBreak(kind){const cb=W.cb;cb.breaks=(cb.breaks||0)+1;const n=cb.breaks;const all=mod('rollingAll',{},false);fire('break',{kind,n});return (n===2||(all&&n>2))?1.5:1}
// Big Moment (rule 34, Artifacts): break | ring | decamp | flourish | clean. Listeners: on:{bigMoment(inst,ctx)}.
export function bigMoment(kind,o){if(!W.cb)return;W.cb.stat.bigTurn=(W.cb.stat.bigTurn||0)+1;fire('bigMoment',Object.assign({},o||{},{kind,nThisTurn:W.cb.stat.bigTurn}))}
// Junk = Flotsam (status cards) and Burdens (curses).
export const isJunk=ci=>{const d=CARDS[ci.id];return !!d&&(d.cls==='status'||d.cls==='curse'||!!d.curse)};
export function checkTide(cause){const cb=W.cb;
 if(cb.tide<10)cb.capped=false;
 if(cb.tide>=10){
  if(bankOn()){if(!cb.capped){cb.capped=true;if(cb.banks<3){cb.banks++;log(`🏦 Crest banked (${cb.banks}/3)`);callout('CREST BANKED ×'+cb.banks,'crest')}cb.tide=10}else cb.tide=10;return}
  const c=mod('crest',{cause},{dmg:TI.crest_dmg,resetTo:5});cb.tide=c.resetTo;if(TI.flip_after_reset)cb.tideDir=-1;if(cause!=='drift'&&W.run.cls==='tide')cb.holdDrift=true;fireCrest(c,cause)} // R6: a break you cause pauses the next Drift
 else if(cb.tide<=0){const u=mod('undertow',{cause},{guard:TI.undertow_blk,draw:TI.undertow_draw,resetTo:5});const junk=cb.hand.filter(isJunk);const rb=noteBreak('undertow');
  cb.tide=u.resetTo;if(TI.flip_after_reset)cb.tideDir=1;if(cause!=='drift'&&W.run.cls==='tide')cb.holdDrift=true;
  junk.forEach(ci=>{const i=cb.hand.indexOf(ci);if(i>=0){cb.hand.splice(i,1);sinkCard(ci,'undertow')}});if(junk.length)log(`🌀 The Undertow carries off ${junk.length} junk`);
  const g=Math.floor(u.guard*rb);log(`🌀 UNDERTOW! +${g} Guard, draw ${u.draw}${rb>1?' (Rolling Break ×1.5)':''}`);callout('UNDERTOW! +'+g+' Guard','undertow');cb.undertowT=Date.now();
  gainBlock(g);{const base=Math.min(u.draw,TI.undertow_draw);drawCards(base);if(u.draw>base)passiveDraw(u.draw-base,'tide')}cb.stat.undertows++;if(cb.curF)cb.curF.causedUndertow=true;drenchTrigger('undertow');fire('undertow',{guard:g,draw:u.draw,cause,junk:junk.length,rolling:rb>1,breakN:cb.breaks});bigMoment('break',{what:'undertow'})}}
// Bank the Crest (Power): Crests are held back instead of firing. Release them with the Tide meter button.
export const bankOn=()=>!!(W.cb&&mod('bankCrest',{},false));
function releaseBankImpl(){const cb=W.cb;if(!cb||cb.busy||cb.mode||!cb.banks)return;const n=cb.banks;cb.banks=0;const c=mod('crest',{cause:'bank'},{dmg:TI.crest_dmg,resetTo:5});
 if(cb.tide>=10){cb.tide=c.resetTo;if(TI.flip_after_reset)cb.tideDir=-1;cb.capped=false}fireCrest(c,'bank',n,1.5);after()}
// Spend N Tide (Recede, counted as a Tideturn if it reverses the arrow). Returns the amount actually spent; 0 if there is not enough.
// canSpend(n): a fixed 'Spend N' card is playable only at Tide >= N (use as the card's req: f=>canSpend(3)).
export const canSpend=n=>!!W.cb&&W.cb.tide>=n&&!W.cb.slack;
export function spendTide(n){const cb=W.cb;n=Math.min(n,cb.tide);if(n<=0||cb.slack)return 0;tideShift(-n,'spend');return n}
// ================= effect context =================
// f is what a card's effect code (fx ops, p:f=>{}) talks to. Helpers per content-impl-plan §2.3.
export function F(ci,o={}){const cb=W.cb;const def=o.def||CARDS[ci.id];const u=isUp(ci),lvl=u?lvlOf(ci):0;
 const f={u,lvl,ci,def,m:o.mult||1,mult:o.mult||1,echo:!!o.echo,potion:!!o.potion,half:!!o.half,scale:o.scale||1,bonus:o.bonus||0,wp:!!o.wp,lm:!!o.lm,ramp:o.ramp||1,rankDmg:o.rankDmg||0,x:o.x||0,allTargets:!!o.allTargets,
  v:(a,b)=>u?b:a,r:(a,b,step,max)=>rv(a,b,step,lvl,max), // r: per-level value (see cards.js rv)
  get tg(){let t=o.tgt;if(!t||t.hp<=0||t.fled)t=o.echo?randAlive():curTgt();return t},
  get low(){return f._low}, get high(){return f._high}, lowNow:()=>isLow(), highNow:()=>isHigh(),
  num(n){n+=(ci&&ci.sus)||0;if(f.half)n=Math.floor(n*(EC.unmarked_fallback||.5));if(f.scale<1)n=Math.floor(n*f.scale);return n+f.bonus}, // unmarked Echo fallback: v2.2 = 1/4
  dmg(n,h=1){if(f.allTargets)return f.all(n,h);for(let i=0;i<h;i++){const t=holdRedirect(f.tg);if(!t)return;hit(t,f.num(n),f)}},
  all(n,h=1){for(let i=0;i<h;i++)alive().forEach(e=>hit(e,f.num(n),f,{aoe:true}))},
  dmgRandom(n){const t=randAlive();if(t)hit(t,n+f.rankDmg,f,{raw:true})},
  blk(n,cap){let g=f.num(n)*f.mult*(f.lm?2:1);if(!f.lm&&f.ramp>1)g=Math.floor(g*f.ramp);if(cap!=null)g=Math.min(g,cap);return gainBlock(g,{fromCard:!f.potion&&!f.wp,echo:f.echo})},
  draw(n){return drawCards(n)},
  weak(n,t){t=t||f.tg;if(t)addSt(t,'weak',n*f.mult)},vuln(n,t){t=t||f.tg;if(t)addSt(t,'vuln',n*f.mult)},
  applyStatus(t,k,n){addSt(t,k,n)},
  surge(n){return f.reached=tideShift(n,f.potion?'potion':'card')},recede(n){return f.reached=tideShift(-n,f.potion?'potion':'card')},setTide(v){return f.reached=setTide(v,'card')},
  parry(n,t){const p=Math.floor(mod('parry',{card:ci,f},n*f.mult));t=t||f.tg;if(p<=0||!t)return 0;callParry(t,p);return p},
  mom(n){return gainMom(n)},gainEnergy(n){gainEnergy(n)},loseHp(n){loseHp(n)},heal(n){heal(n)},
  addCard(id,pile,opts){return addCard(id,pile,opts)},
  nextTurn(fn,meta){if(meta)fn.meta=meta;cb.nextTurnQ.push(fn)},thisTurn(l){return thisTurn(l)},
  chart(n,then){chart(n,then)},choose(title,opts){choose(title,opts)},
  wpCount:()=>expCount(),topType:()=>{const t=cb.draw[0];return t?CARDS[t.id].t:null},
  intent:()=>{const t=f.tg;if(!t)return null;const m=intentOf(t);return {attacking:!!m.a,total:m.a?eAtk(t,m.a)*(m.h||1):0}}};
 f._low=cb?cb.tide<=TI.low:false;f._high=cb?cb.tide>=TI.high:false;return f}
// ================= Cartographer: Waypoints, Ranks, Advance =================
export function expCount(){const cb=W.cb;return mod('expedition',{},cb.slots.length+cb.slots.filter(w=>(w.rank||0)>=CA.rank_max).length*(CA.landmark_extra||0))}
// Advancing a Guard Waypoint (Camp, Supply Cache, Cairn, Outpost, Shore Post) adds this much Guard per Rank to each trigger.
export const GUARD_PER_RANK=CA.guard_per_rank||2;
export function trigWp(w){const d=CARDS[w.id];if(!d.wp)return;const r=w.rank||0;const f=F(w,{wp:true,rankDmg:CA.rank_dmg?CA.rank_dmg[Math.min(r,CA.rank_dmg.length-1)]:r*CA.per_rank}); // v2.2 Rank curve +2/+6/+11
 if(r&&d.wpGuard){const gb=f.blk;f.blk=(n,...x)=>gb.call(f,n+r*GUARD_PER_RANK,...x)}d.wp(f);w.trigT=Date.now();fire('waypointTrigger',{wp:w,f})}
function advanceImpl(i){const cb=W.cb;if(!cb||cb.busy||cb.mode||W.run.cls!=='carto')return false;const w=cb.slots[i];const lim=mod('advances',{},1);
 if(!w||cb.advUsed>=lim||(w.rank||0)>=CA.rank_max){render();return false}
 cb.advUsed++;w.rank=(w.rank||0)+1;cb.stat.advances++;w.advT=Date.now();
 log(`⛰️ Advance: ${cname(w)} → Rank ${w.rank}${w.rank>=CA.rank_max?' (LANDMARK)':''}`);callout(w.rank>=CA.rank_max?'LANDMARK!':'Advance → Rank '+w.rank,'adv');
 fire('advance',{wp:w,slot:i});after();return true}
// cards-act1 free Decamp (rule 31): once a turn ('decamps' modifier for more), tap a Waypoint: it leaves its slot and its Decamp line fires.
export const canDecamp=()=>{const cb=W.cb;return !!cb&&W.run.cls==='carto'&&!cb.busy&&!cb.mode&&cb.slots.length>0&&cb.decUsed<mod('decamps',{},1)};
function decampWpImpl(i){const cb=W.cb;if(!canDecamp()||!cb.slots[i]){render();return false}cb.decUsed++;const w=cb.slots[i];log(`🔥 Decamp: ${cname(w)}`);callout('DECAMP','adv');removeWp(i,'decamp');after();return true}
// A Waypoint leaves its slot: Decamp effect + listeners, Ranks lost (Cairn Stone stores them).
export function removeWp(i,reason){const cb=W.cb;const w=cb.slots.splice(i,1)[0];if(!w)return null;const d=CARDS[w.id];
 const lm=(w.rank||0)>=CA.rank_max;const rank0=w.rank||0;if(d.decamp){const fd=F(w,{wp:true,lm,ramp:lm?1:1+rank0/CA.rank_max});fd.rankLeft=rank0;fd.reason=reason;d.decamp(fd,reason)}cb.stat.wpLeft++;cb.stat.wpLeftTurn++;fire('decamp',{wp:w,reason,rank:rank0,landmark:lm,slot:i});if(d.decamp)bigMoment('decamp',{wp:w});if(reason!=='returned')cb.stat.wpDestroyed++;
 if((w.rank||0)>0&&hasRelic('cairnstone'))cb.cairn=Math.max(cb.cairn,w.rank);w.rank=0;
 if(!w.temp&&reason!=='returned')cb.disc.push(w);return w}
export function placeWp(ci,o={}){const cb=W.cb;const put=()=>{if(cb.cairn){ci.rank=cb.cairn;cb.cairn=0;log('🪨 Cairn Stone: '+cname(ci)+' starts at Rank '+ci.rank)}fire('waypointPlaced',{wp:ci})};
 if(cb.slots.length<cb.nslots){if(o.at!=null&&o.at>=0&&o.at<cb.slots.length)cb.slots.splice(o.at,0,ci);else cb.slots.push(ci);log('📍 Waypoint placed: '+cname(ci));put()}
 else pickSlot('Slots full: replace which Waypoint?',i=>{const old=cb.slots[i];removeWp(i,'replaced');cb.slots.splice(i,0,ci);log('📍 '+cname(ci)+' replaces '+cname(old));put()})}
// ================= modes (player choices) =================
export function choose(title,opts){W.cb.mode={k:'choice',title,opts}}
export function chart(n,then0){const cb=W.cb;const then=()=>{fire('chartDone',{n});then0&&then0()};refill(n);cb.mode={k:'chart',n:Math.min(n,cb.draw.length),then,moved:false};fire('chart',{n});if(!cb.mode||!cb.mode.n){if(cb.mode&&cb.mode.k==='chart')cb.mode=null;then&&then()}}
export function pickSlot(title,then){W.cb.mode={k:'slot',title,then}}
function modeActImpl(a,i,j){const cb=W.cb;if(!cb)return;const m=cb.mode;if(!m)return;
 const done=()=>{if(m.thenStart&&!cb.mode){if(W.cb===cb)return nextStart()}return after()};
 if(m.k==='choice'){cb.mode=null;m.opts[i].f();return done()}
 if(m.k==='slot'){cb.mode=null;m.then(i);return done()}
 if(m.k==='retain'){const ci=a==='skip'?null:cb.hand.find(c=>c.uid===m.uids[i]);if(a!=='skip'&&!ci)return;
  cb.mode=null;if(ci){ci.pk=true;log('🪢 Retained: '+cname(ci))}
  if(ci&&m.n>1&&retainWindow(m.held,m.n-1))return;
  return endTurnFinish(m.held)}
 if(m.k==='chart'){const d=cb.draw;m.n=Math.min(m.n,d.length);if(m.n<1)a='done'; // draw pile shrank under the prompt: nothing to chart, finish
  if(a==='up'&&i>0)[d[i-1],d[i]]=[d[i],d[i-1]];
  if(a==='dn'&&i<m.n-1)[d[i+1],d[i]]=[d[i],d[i+1]];
  if(a==='mv'&&i!==j&&i>=0&&j>=0&&i<m.n&&j<m.n)d.splice(j,0,d.splice(i,1)[0]); // drag-and-drop reorder (ui/chartdrag.js)
  if(a==='bot'&&!m.moved){d.push(d.splice(i,1)[0]);m.moved=true;m.n--}
  if(a==='done'){cb.mode=null;log('🗺️ Charted');m.then&&m.then();return done()}
  render()}}
// ================= turn lifecycle =================
// startTurn: turn++ -> clear Guard -> energy -> "next turn" effects -> onTurnStart -> Waypoints -> [Chart] -> draw -> onAfterDraw -> Drift (v2.1)
export function startTurn(){const cb=W.cb;if(!cb)return;cb.turn++;cb.enemyTurn=false;
 if(cb.turn>1&&!mod('retainGuard',{},false))cb.p.block=0;
 Object.assign(cb,{parry:0,parryUsed:false,parries:{},advUsed:0,decUsed:0,breaks:0,markType:null,mark2Type:null,lastType:null,mark:null,markTgt:null,afterMark:0,armMark:false,armFlourish:false,mark2:null,markTgt2:null,after2:0,mark2Scale:1,extraMarks:0,lastNF:null,lastNFTgt:null,last:null,sel:null,insp:null,slack:false,keepMom:false,tideBtnUsed:false,wheelUsed:false});
 cb.stat.wpLeftLast=cb.stat.wpLeftTurn||0;cb.stat.echoesLast=cb.stat.echoesTurn||0;Object.assign(cb.stat,{typesTurn:{},playedTurn:0,attacksTurn:0,tideturnsTurn:0,echoesTurn:0,bigTurn:0,wpLeftTurn:0});cb.bitter={};
 cb.ens.forEach(x=>{x.armSpent=false;x.base=x.hp;x.siph=0;x.intr=false});cb.numbCard=null;cb.refracted=false;cb.stormUsed=false;cb.storm=!!cb.stormNext&&mod('stormTide',{},true) /* Act 3 hook: onStormTide */;cb.stormNext=false;cb.owedRec=false;cb.locked=null;cb.owed=cb.owedNext||null;cb.owedNext=null;cb.owedUsed=false;
 cb.energy=cb.maxE;if(cb.drainE){cb.energy=Math.max(0,cb.energy-cb.drainE);log(`⚡ Drained: −${cb.drainE} Energy`);cb.drainE=0}
 cb.banner={txt:'Player Turn',t:Date.now()};
 const q=cb.nextTurnQ;cb.nextTurnQ=[];q.forEach(fn=>fn());
 const ts=fire('turnStart',{turn:cb.turn,energy:0,draw:0});if(ts.energy)gainEnergy(ts.energy);
 cb.wpDraw=0;
 if(W.run.cls==='carto')cb.slots.slice().forEach(w=>{for(let k=0;k<mod('wpTriggers',{wp:w},1);k++)trigWp(w)});
 if(!W.cb||!alive().length)return after();
 const n=mod('drawCount',{},(W.run.cls==='carto'?4:5))+(ts.draw||0)+cb.wpDraw+cb.nextDraw;cb.wpDraw=0;cb.nextDraw=0;
 // v0.6.2 interim: say why the Cartographer opens with 4 cards (once per run), and pop the Tuning Fork's turn-1 bonus card.
 const fork=cb.turn===1&&hasRelic('tuningfork'),cartoHint=cb.turn===1&&W.run.cls==='carto'&&n===4&&!W.run.cartoHint;
 const drawn=()=>{if(!W.cb)return;drawCards(n);applyMuffle();applyGust();applyNumb();if(fork){const pop=()=>{if(W.cb!==cb)return;flash(relic('tuningfork'));callout('+1 card · Tuning Fork','relic');render()};if(window.FAST)pop();else setTimeout(pop,T(780))}if(cartoHint){W.run.cartoHint=1;cb.hint={t:Date.now(),txt:'<b>4 cards</b> is by design: the Cartographer plans ahead and draws more from <b>Waypoints</b>.'}}if(cb.pendingE){gainEnergy(cb.pendingE);cb.pendingE=0}fire('afterDraw',{turn:cb.turn});drift();after()};
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
// Why a card can't be played, for the tap hint: null = playable (or the hand is busy), 'energy' = true lack of energy, else a short phrase.
// Mod handlers that veto a card set W.cb.whyNot first; cards with req get a phrase from REQ_WHY (fallback: generic).
const REQ_WHY={solo:'Needs a Marked card',grandpause:'Needs a Marked card',coda:'Needs 3 cards played first',enpassant:'Needs 1+ Momentum',tithe:'Needs 3 Tide',siphon:'Needs more Tide',drawtide:'Needs Tide above 2',gtraverse:'Needs 1 Energy',tithebox:'Needs more gold',breakcamp:'Needs a Waypoint',mirrorsig:'Needs a Waypoint',abandon:'Needs a Waypoint',stakenext:'Needs a Waypoint',relocate:'Needs a Waypoint (once a turn)'};
export function playBlockReason(ci){const cb=W.cb;const d=ci&&CARDS[ci.id];if(!cb||!d||cb.busy||cb.mode)return null;if(canPlay(ci))return null;
 if(d.unplay&&!mod('playUnplayable',{card:ci},false))return 'Unplayable';if(cb.locked===ci)return 'Locked';if(cost(ci)>cb.energy)return 'energy';
 if(d.req&&!d.req(F(ci,{})))return REQ_WHY[ci.id]||'Not playable right now';
 cb.whyNot=null;mod('canPlay',{card:ci},true);const w=cb.whyNot;cb.whyNot=null;return w||'Not playable right now'}
export function canPlay(ci){const cb=W.cb;const d=CARDS[ci.id];if(!d||cb.busy||cb.mode)return false;if(d.unplay&&!mod('playUnplayable',{card:ci},false))return false;if(cb.locked===ci)return false;if(cost(ci)>cb.energy)return false;if(d.req&&!d.req(F(ci,{})))return false;return mod('canPlay',{card:ci},true)}
function tapCardImpl(i){const cb=W.cb;if(cb.busy||cb.mode)return;cb.sel=i;cb.insp=null;render()}
// Retained for old debug callers; only the drag release UI commits a card.
export function playSel(){}
// UI toggles for the active class choices (applied to the next card you play)
function armFlourishImpl(){const cb=W.cb;if(!cb||cb.busy)return;cb.armFlourish=!cb.armFlourish&&cb.mom>=flourishMin();render()}
function armMarkImpl(){const cb=W.cb;if(!cb||cb.busy||(!cb.armMark&&!canMark()))return;cb.armMark=!cb.armMark;render()}
export const flourishMin=()=>mod('flourishMin',{},DU.flourish_min);
export const flourishMult=m=>Math.min(3.5,1+DU.flourish_per_mom*m);
export const markBonus=(after)=>{const cb=W.cb;return Math.min(mod('markCap',{},EC.bonus_cap),mod('markPer',{},EC.bonus_per_card_after)*(after==null?cb.afterMark:after))};
// Marks allowed per turn: 1, +1 from Second Verse / Chorus Draught (this turn) or Twin Clapper (always, but its Echo is half strength). Never more than 2.
export const markLimit=()=>2; // Twin Tines
// A card in hand that could take a moved tine now: its type's tine is already on a played card, and you can afford to play it.
// (An untaken tine goes to the next card of that type anyway, so arming only matters to MOVE a mark.) Moving is free.
export const canTakeMove=ci=>{const cb=W.cb,d=CARDS[ci.id];const ty=d&&tineType(d);return !!ty&&(cb.markType===ty||cb.mark2Type===ty)&&!d.unplay&&(!d.faint||hasRelic('hollowreed'))&&canPlay(ci)};
export const canMark=()=>{const cb=W.cb;return !!cb&&!cb.busy&&!cb.mode&&!!(cb.mark||cb.mark2)&&cb.hand.some(canTakeMove)};
// playCard(i, opts): opts.flourish (Duelist) and opts.mark (Echo Mage) come from the UI; default = the armed toggles.
function playCardImpl(i,opts={}){const cb=W.cb;const ci=cb.hand[i];if(!ci)return;if(!canPlay(ci)){cb.sel=i;return render()}const d=CARDS[ci.id];
 if(opts.flourish==null)opts.flourish=cb.armFlourish;if(opts.mark==null)opts.mark=cb.armMark;if(opts.mark&&W.run.cls==='echo'&&!canTakeMove(ci))opts.mark=false; // same check as the highlight
 if(!W.previewing&&!W.replaying)flyCard(ci,needsTarget(ci)?curTgt():null);
 const c=cost(ci);const x=isX(ci)?cb.energy:0;{const ot=owedType(d);if(ot&&alive().some(z=>z.key==='grell')){if(!cb.owedRec){cb.owedRec=true;cb.owedNext=ot}if(cb.owed===ot&&!cb.owedUsed)cb.owedUsed=true}}
 cb.energy-=isX(ci)?x:c;cb.hand.splice(i,1);ci.tmp0=false;cb.sel=null;
 if(cb.numbCard===ci){cb.numbCard=null;fire('numbedCardPlayed',{card:ci})} // Act 3 hook: onNumbedCardPlayed
 const tg=curTgt();Object.defineProperty(ci,'_tgt',{value:tg,writable:true,configurable:true,enumerable:false}); // non-enumerable: stays out of saves/clones
 const f=F(ci,{tgt:tg,x});cb.curF=f;
 // Flourish (Duelist, v2.1): optional, spends all Momentum, x(1 + 0.5 per Momentum), capped at x3.5.
 if(W.run.cls==='duel'&&d.t==='A'){
  const plan=mod('flourishPlan',{f},opts.flourish&&cb.mom>=flourishMin()?{mom:cb.mom,free:false}:null);
  if(plan){f.flourish=true;f.freeFlourish=!!plan.free;f.savedMom=cb.mom;f.momSpent=plan.free?0:cb.mom;
   const ctx=fire('flourish',{f,mom:plan.mom,extra:0});f.fmult=flourishMult(plan.mom+ctx.extra);cb.stat.flourishes++;bigMoment('flourish',{f});
   callout(`${plan.free?'FREE ':''}FLOURISH ×${f.fmult}`,'flourish');log(`🔥 FLOURISH ×${f.fmult} (${plan.free?'free; ':''}${plan.mom} Momentum)`)}
 }
 // Mark (Echo Mage, v2.1): once per turn, a non-Faint, non-Power card.
 if(W.run.cls==='echo'){if(cb.mark)cb.afterMark++;if(cb.mark2)cb.after2++;
  ci._seq=++cb.playSeq;takeTine(ci,d,tg,!!opts.mark)}
 cb.armFlourish=false;cb.armMark=false;
 if(d.t==='W')placeWp(ci);else if(d.t==='P'){const p=cb.powers.find(q=>q.id===ci.id);if(p)p.n++;else cb.powers.push({id:ci.id,up:isUp(ci),n:1,ci})}
 else if(isEx(ci))sinkCard(ci,'played');else cb.disc.push(ci);
 fire('beforeCardPlay',{card:ci,f});
 runCard(d,f);
 if(cb.mimic){cb.mimic=false;const f2=F(ci,{tgt:tg,x});f2.flourish=f.flourish;f2.fmult=f.fmult;log('🖋️ Mimic Ink: '+cname(ci)+' again');runCard(d,f2)}
 if(!W.cb)return;
 // R11 Refract: the first Attack CARD each turn hurts you for 3 (Guard absorbs it) while a Lens-Wright lives. Echo repeats never trigger it.
 if(d.t==='A'&&!cb.refracted&&alive().some(x=>x.key==='lenswright')){cb.refracted=true;if(mod('refract',{},true)){floatText('p','Refract -3','');loseHp(3,{guard:true});log('🔆 Refract: 3 damage back to you')}}
 if(W.run.cls==='duel'&&d.t==='A'){if(f.flourish)cb.mom=f.freeFlourish?f.savedMom:mod('momAfterFlourish',{f},0);else gainMom(1)}
 cb.lastType=d.t==='A'?'A':d.t==='P'?'P':'S';
 {cb.last=d.t==='P'?null:ci;cb.lastTgt=tg;if(d.t!=='P'&&!d.faint){cb.lastNF=ci;cb.lastNFTgt=tg}}
 const st=cb.stat;(st.typesTurn=st.typesTurn||{})[d.t]=1;st.playedTurn++;st.playedCombat++;if(d.t==='A'){st.attacksTurn++;st.attacksCombat++}if(W.run.stats){W.run.stats.cardsPlayed++;W.run.stats.maxCardsTurn=Math.max(W.run.stats.maxCardsTurn,st.playedTurn)}
 fire('cardPlayed',{card:ci,f,nThisTurn:st.playedTurn,nThisCombat:st.playedCombat,type:d.t});
 cb.curF=null;after()}
export function after(){if(W.previewing)return;if(!W.cb)return;if(W.run.hp<=0&&!cheatDeath())return lose();if(!alive().length&&!W.cb.mode)return win();render()}
// ================= Echo (Echo Mage) =================
// cards-act1 Twin Tines (rule 30): your first Attack and first Skill each turn, played from the hand and not Faint, take a tine
// automatically. Arming the bell (armMark, free) moves the tine of the next card's type onto it (that card's earlier holder loses it).
// Slot 1 / slot 2 (cb.mark / cb.mark2) hold the two tines; cb.markType / cb.mark2Type say which type each holds. Rings resolve in
// play order (ci._seq). The old quarter-strength unmarked fallback is gone. 'tineTypes' modifier can widen the eligible types.
export const tineType=d=>d.t==='A'?'A':d.t==='S'?'S':null;
function takeTine(ci,d,tg,armed){const cb=W.cb;const ty=tineType(d);if(!ty||(d.faint&&!hasRelic('hollowreed'))||ci.temp&&CARDS[ci.id].note)return;
 const t2=(needsTarget(ci)||d.tg)?tg:null;const mine=cb.markType===ty?1:cb.mark2Type===ty?2:0;
 if(mine&&!armed)return; // that tine is already taken this turn
 if(mine===1||(!mine&&!cb.mark)){const moved=mine===1&&cb.mark;cb.mark=ci;cb.markTgt=t2;cb.afterMark=0;cb.markType=ty;fire('mark',{card:ci,second:false,moved:!!moved});log((moved?'🔔 Tine moved: ':'🔔 Marked: ')+cname(ci));return}
 if(mine===2||!cb.mark2){const moved=mine===2&&cb.mark2;cb.mark2=ci;cb.markTgt2=t2;cb.after2=0;cb.mark2Type=ty;cb.mark2Scale=1;fire('mark',{card:ci,second:true,moved:!!moved});log((moved?'🔔 Tine moved: ':'🔔 Marked: ')+cname(ci))}}
// Retune helper for cards: move the tine of a type onto an already-played card of that type (keeps its original target).
export function retune(ci,tgt){const cb=W.cb;const ty=tineType(CARDS[ci.id]);if(!ty)return false;if(cb.markType===ty){cb.mark=ci;cb.markTgt=tgt||null;return true}if(cb.mark2Type===ty){cb.mark2=ci;cb.markTgt2=tgt||null;return true}return false}
// Plan: the Marked card at its original target with +min(2, cards after it) (first repeat), else the last non-Faint card at half strength.
// 'echoPlan' modifiers add repeats / doubling (once) / allTargets; total repeats per turn are capped at 4.
export const fbLabel=()=>({.5:'½',.25:'¼'})[EC.unmarked_fallback]||('×'+EC.unmarked_fallback);
export function echoPlan(preview=true,slot=1){const cb=W.cb;let ci=cb.mark,tgt=cb.markTgt,half=false,bonus=0,scale=1;
 if(slot===2){ci=cb.mark2;tgt=cb.markTgt2;if(!ci)return null;bonus=markBonus(cb.after2);scale=cb.mark2Scale}
 else if(ci)bonus=markBonus();else return null; // Twin Tines: no unmarked fallback
 const plan=mod('echoPlan',{card:ci,marked:!half,preview,slot},{card:ci,tgt,half,bonus,scale,repeats:1,mult:1,allTargets:false,marked:!half,slot});
 plan.bonus=Math.min(EC_BONUS_MAX,plan.bonus||0);plan.capped=Math.max(0,plan.repeats-(mod('echoCap',{},EC.cap)-cb.stat.echoesTurn));plan.repeats=Math.max(0,Math.min(plan.repeats,mod('echoCap',{},EC.cap)-cb.stat.echoesTurn)) /* Act 3 hook: modifyEchoCap */;return plan}
// Predicted number of a plan's card (for the live Echo preview): reads the first "Deal N" / "Gain N Guard" of the card text (Resound text when it has one).
export function echoPreview(plan){if(!plan)return null;const ci=plan.card,d=CARDS[ci.id];let t=plain(desc(ci));const rs=/Resound:\s*([^.]*)\./.exec(t);
 if(rs&&/(deal|gain)\s+\d+/i.test(rs[1]))t=rs[1];
 const m=/\bdeal (\d+)(?: to ALL)?/i.exec(t),g=/\bgain (\d+) Guard/i.exec(t);const kind=m&&(!g||m.index<g.index)?'dmg':g?'blk':null;if(!kind)return null;
 let n=+(kind==='dmg'?m[1]:g[1]);n+=ci.sus||0;if(plan.half)n=Math.floor(n*(EC.unmarked_fallback||.5));if(plan.scale<1)n=Math.floor(n*plan.scale);n+=plan.bonus;
 // A18: same order as hit()/gainBlock(): +Might, damageAdd, +Resonance -> x mult -> Soaked -> Exposed -> 'damage' mods; Guard: +Poise, Brittle, 'guard' mods.
 const t0=plan.tgt&&plan.tgt.hp>0?plan.tgt:null,P=W.cb.p.st;
 if(kind==='dmg'){const atk=d.t==='A';if(atk){n+=might();const pre=n;n=mod('damageAdd',{target:t0,f:{ci,def:d,echo:true,preview:true},attack:true},n);if(n>pre)n=pre+Math.min(n-pre,Math.max(0,EC_BONUS_MAX-(plan.bonus||0)));if(t0&&t0.st.reson)n+=t0.st.reson}
  n=Math.floor(n*plan.mult);if(atk&&P.weak)n=Math.floor(n*.75);if(t0&&t0.st.vuln)n=Math.floor(n*1.5);n=Math.max(0,Math.floor(mod('damage',{target:t0,f:{ci,def:d,echo:true,preview:true},attack:atk,raw:false},n)))}
 else{n+=P.dex||0;if(P.brittle)n*=.75;n=Math.max(0,Math.floor(mod('guard',{fromCard:true},n)))}
 return {kind,n,total:n*Math.max(1,plan.repeats)}}
export function doEcho(){const cb=W.cb;if(W.run.cls!=='echo')return;
 const order=(cb.mark2&&cb.mark&&(cb.mark2._seq||0)<(cb.mark._seq||0))?[2,1]:[1,2];
 for(const slot of order){if(!W.cb||!alive().length)return;const plan=echoPlan(false,slot);if(!plan)continue;const ci=plan.card,d=CARDS[ci.id];
 if(plan.capped)log(`🔇 Echo capped at ${EC.cap} repeats`);
 for(let k=0;k<plan.repeats;k++){if(!alive().length)break;
  const f=F(ci,{echo:true,tgt:plan.tgt,half:plan.half,scale:plan.scale,bonus:k===0?plan.bonus:0,mult:k===0?plan.mult:1,allTargets:plan.allTargets&&d.t==='A'});f.doubled=plan.mult>1&&k===0;
  runCard(d,f);cb.stat.echoesTurn++;cb.stat.echoesCombat++;cb.stat.lastEchoed=ci;
  if(d.sus){ci.sus=(ci.sus||0)+mod('sustain',{card:ci},d.sus)}
  log(`🔊 Echo: ${cname(ci)}${plan.half?' ('+fbLabel()+')':''}${plan.scale<1?' (½)':''}${f.doubled?' (doubled!)':''}${k===0&&plan.bonus?' +'+plan.bonus:''}`);
  fire('echo',{card:ci,f,k,slot});bigMoment('ring',{card:ci})}
 const n=Math.min(plan.repeats,4);if(n)callout(`ECHO${n>1?' ×'+n:''}${plan.bonus?' +'+plan.bonus:''}${plan.mult>1?' DOUBLED':''}`,'echo')}}
// ================= end of turn / enemy phase =================
// endTurn: onTurnEnd -> Echo -> onTurnEndInHand -> Fleeting sink / Moor keep / discard -> Momentum fade -> expire turn fx -> enemy phase
function endTurnImpl(){const cb=W.cb;if(!cb||cb.busy||cb.mode)return;
 fire('turnEnd',{turn:cb.turn});if(!W.cb)return;
 cb.locked=null;const held=cb.hand.slice();cb.ending=true;doEcho();cb.ending=false;if(W.previewing)return;if(!W.cb)return;if(!alive().length)return win();
 for(const ci of held){const d=CARDS[ci.id];if(cb.hand.includes(ci)&&d.endInHand)d.endInHand(F(ci,{}),ci)}
 fire('turnEndInHand',{});
 if(W.run.hp<=0&&!cheatDeath())return lose();
 if(!retainWindow(held,mod('retainPick',{},0)))endTurnFinish(held)}
// Picket Rope (modifier 'retainPick'): before the hand is discarded, the player picks cards to Retain. Fleeting cards are not offered
// (they Sink anyway); an empty choice skips the window. The pick is a plain modeAct, so a saved run replays it exactly.
function retainWindow(held,n){const cb=W.cb;if(!cb||n<1)return false;
 const ok=cb.hand.filter(ci=>held.includes(ci)&&!ci.pk&&!CARDS[ci.id].fleet);if(!ok.length)return false;
 cb.mode={k:'retain',n,held,uids:ok.map(c=>c.uid),title:`Retain ${n>1?n+' cards':'1 card'}: it stays in your hand`};cb.sel=null;cb.insp=null;render();return true}
function endTurnFinish(held){const cb=W.cb;if(!cb)return;
 // Cards drawn by the Echo (e.g. Mirror Step's old Resound) stay in hand; the rest is discarded, Fleeting cards Sink, Moored cards stay.
 const keep=[];for(const ci of cb.hand){const d=CARDS[ci.id];if(!held.includes(ci)){keep.push(ci);continue}ci.tmp0=false;
  const pk=ci.pk;delete ci.pk;if(d.fleet)sinkCard(ci,'fleeting');else if(d.moor||ci.moor||pk)keep.push(ci);else cb.disc.push(ci)}
 cb.hand=keep;cb.sel=null;cb.insp=null;
 if(W.run.cls==='duel'&&!cb.keepMom&&!mod('keepMomentum',{},false))cb.mom=Math.max(0,cb.mom-DU.decay);cb.keepMom=false;
 cb.fx=cb.fx.filter(l=>l.combat||(l.turns&&--l.turns>0));
 // R9 Water (Thalassa, phase 2): 1 HP per 5 Guard held, lost at the end of YOUR turn. HP loss, not damage: Guard does not block it.
 {const n=waterLoss();if(n>0){loseHp(n);log('🌊 Water: −'+n+' HP');callout('WATER −'+n,'boss');if(W.run.hp<=0&&!cheatDeath())return lose()}}
 cb.busy=true;cb.enemyTurn=true;cb.banner={txt:'Enemy Turn',t:Date.now(),en:1};render();
 // A curse that fired in hand (Dread) pops over the hand first; hold the enemy turn so its notice can be read.
 const popT=(cb.cursePops||[]).some(x=>Date.now()-x.t<200)?CURSE_POP:0;
 if(window.FAST)enemyPhase();else setTimeout(enemyPhase,T(EB().pause+popT))}
export const waterOn=()=>!!W.cb&&mod('waterOn',{},alive().some(x=>x.key==='thalassa'&&x.ph>=2)); // Act 3 hook: modifyWaterOn (Sluice Heart)
export const waterLoss=()=>{if(!waterOn())return 0;return Math.max(0,Math.floor(mod('water',{guard:W.cb.p.block},Math.floor(W.cb.p.block/5))))};
export const CURSE_POP=900;
export const EC_BONUS_MAX=12; // rule 30: total Echo bonus per ring
// eAtk(e,a) is the per-hit damage of a move's attack `a`. Without `o` it is the SHOWN value: it includes Might and Exposed that
// land earlier in this enemy phase (the enemy's own Might from the move, ally buffs like Bark Orders / Grow, and Exposed from
// enemies acting before it), so shown == taken. With o={str,vuln} it is computed from those exact values (used by act()).
export function eAtk(e,a,o,raw){if(!o)o=phasePlanFor(e);let d=a+(e.st.str||0)+(e.st.mightTmp||0)+(o.str||0);if(e.elite&&d>0){const m=(ECON.eliteDmgByKey||{})[e.key]??ECON.eliteDmg??1;d=Math.max(1,Math.round(d*m))} // R1b elite damage (ECON)
 if(e.st.weak)d=Math.floor(d*.75);if(o.vuln)d=Math.floor(d*1.5);d=Math.max(0,d);
 if(d>0&&e.holds)d+=4; // R13: the Shard holder's attacks gain +4
 if(d>0&&!raw&&e.tailwind)d+=e.tailwind; // R10 Tailwind: the SHOWN first hit includes it (act() adds it to hit 1 only)
 // Gunnery (ACT2-RULES R1): only part of your Guard blocks, so the SHOWN number is what you will take at your current Guard. act() asks for the raw value and blocks in enemyHitPlayer.
 if(!raw&&W.cb&&!W.cb.acting){const m=EN[e.key].intent?EN[e.key].intent(e):e.next;if(m&&m.ignoreG&&m.a===a)d=Math.max(0,d-Math.min(Math.floor(W.cb.p.block*m.ignoreG),d))}
 return d}
// Predict the coming enemy phase in acting order: extra Might each enemy will have when it swings, and whether the player is Exposed then.
export function phasePlan(){const cb=W.cb;const out={};if(!cb)return out;let vuln=!!cb.p.st.vuln;const extra={};
 for(const x of cb.ens){if(x.hp<=0||x.fled)continue;const m=intentOf(x)||{};const own=(extra[x.uid]||0)+(m.s||0);out[x.uid]={str:own,vuln};
  if(m.allyS)cb.ens.forEach(y=>{if(y!==x&&y.hp>0&&!y.fled)extra[y.uid]=(extra[y.uid]||0)+m.allyS});
  if(m.grow)cb.ens.forEach(y=>{if(y.key==='tendril'&&y.hp>0&&!y.fled)extra[y.uid]=(extra[y.uid]||0)+1});
  if(m.v)vuln=true}
 return out}
function phasePlanFor(e){const cb=W.cb;if(!cb)return {str:0,vuln:false};if(cb.acting)return {str:0,vuln:!!cb.p.st.vuln}; // live values while enemies act
 return phasePlan()[e.uid]||{str:0,vuln:!!cb.p.st.vuln}}
export function intentOf(e){const t=EN[e.key];const m=t.intent?t.intent(e):e.next;return mod('intentDisplay',{enemy:e},m)||{none:1}}
// Enemy Attack on the player: Parry first (reduce the first Attack, reflect half, once per turn), then Guard, then HP.
export function enemyHitPlayer(e,d,o={}){const cb=W.cb;
 if(d>0&&cb.parries&&cb.parries[e.uid]>0&&!cb.parryHit[e.uid])d=answerParry(e,d);
 if(d>0&&cb.parry>0&&!cb.parryUsed){cb.parryUsed=true;const red=Math.min(cb.parry,d);d-=red;const back=Math.floor(cb.parry*mod('parryReflect',{enemy:e},DU.parry_back_frac));
  log(`⚔️ Parry! −${red}, ${back} back to ${e.n}`);callout('PARRY! ↩ '+back,'parry');if(back)dmgEnemy(e,back);cb.retort=true;fire('parry',{enemy:e,reflected:back,reduced:red})}
 const b=Math.min(o.ignoreG?Math.floor(cb.p.block*o.ignoreG):cb.p.block,d);cb.p.block-=b;let rest=d-b;if(rest>0)rest=Math.max(0,Math.floor(mod('damageTaken',{enemy:e,amount:rest},rest))); /* Act 3 hook: modifyDamageTaken */W.run.hp=Math.max(0,W.run.hp-rest);if(rest>0&&W.run.stats)W.run.stats.lastHit={by:e.n,amt:rest,turn:cb.turn||0};floatText('p',rest>0?'-'+rest:'🛡'+b,rest>0?'':'b');cb.pshake=Date.now();fire('playerHit',{enemy:e,amount:rest,blocked:b});
 if(rest>0&&W.run.cls==='duel'&&cb.mom>0&&!cb.momLostPhase){cb.momLostPhase=true;const lose=mod('momLoss',{},DU.lose_on_unblocked);cb.mom=Math.max(0,cb.mom-lose);log('💢 Hit: −'+lose+' Momentum')}
 if(rest>0)fire('playerDamaged',{enemy:e,amount:rest});
 if(rest>0&&W.run.hp>0&&W.run.hp<=W.run.max*.3)fire('hpLow',{hp:W.run.hp}); // Act 3 hook: onHpLow
 if(W.run.hp<=0)cheatDeath()}
// ---- cards-act1: called Parry (rule 32). Pools per enemy uid; the enemy's FIRST damaging hit next enemy phase is reduced by the pool
// (before Guard), half of what was stopped is reflected ('parryReflect' modifier), a pool >= the hit is a Clean Answer (+1 Momentum,
// once per enemy per enemy phase; 'cleanMom' modifier). The pool ends unless 'parryKeep' says so (Return Blow).
export function callParry(e,p){const cb=W.cb;if(!e||p<=0)return 0;cb.parries[e.uid]=(cb.parries[e.uid]||0)+p;floatText(e.uid,'⚔️ Parry '+p,'b');log(`⚔️ Parry ${p} called on ${e.n}`);fire('parryCalled',{enemy:e,n:p,total:cb.parries[e.uid]});return p}
export const parryOn=e=>(W.cb&&e&&W.cb.parries&&W.cb.parries[e.uid])||0;
function answerParry(e,d){const cb=W.cb;const p=cb.parries[e.uid];const red=Math.min(p,d);const clean=p>=d;cb.parryHit[e.uid]=true;
 const rv=mod('parryReflect',{enemy:e,reduced:red,pool:p,hit:d},DU.parry_back_frac);const back=rv&&typeof rv==='object'?Math.max(0,Math.floor(rv.abs||0)):Math.floor(red*rv);log(`⚔️ Parry! −${red}${back?`, ${back} back to ${e.n}`:''}${clean?' · Clean Answer':''}`);callout((clean?'CLEAN ANSWER! ':'PARRY! ')+'↩ '+back,'parry');
 if(!mod('parryKeep',{enemy:e},false))delete cb.parries[e.uid];else cb.parryHit[e.uid]=false;
 if(back&&e.hp>0)hit(e,back,null,{raw:true,reflect:true});
 if(clean&&!cb.cleanDone[e.uid]){cb.cleanDone[e.uid]=true;const m=mod('cleanMom',{enemy:e},1);if(W.run.cls==='duel')gainMom(m);fire('cleanAnswer',{enemy:e,reduced:red});bigMoment('clean',{enemy:e})}
 cb.retort=true;fire('parry',{enemy:e,reflected:back,reduced:red,clean});return d-red}
export function act(e){const cb=W.cb;cb.acting=e;const t=EN[e.key];const m=intentOf(e);e.lastAct=m;fire('enemyAct',{enemy:e,intent:m});if(m.b)e.blkT=Date.now();if(m.lbl)log(`${e.e} ${e.n}: ${m.lbl}`);
 if(m.pull)pullPlayer(m.pull); // Pull resolves before the same move's damage (ACT2-RULES R7)
 if(m.seize)seizeCard(e);
 if(m.muffle)cb.muffleNext=true;
 if(m.gust)cb.gustNext=(cb.gustNext||0)+m.gust; // Act 3 R2: applied after your next draw
 if(m.numb)cb.numbNext=true; // R3
 if(m.tide)cb.stormNext=true; // R5 Storm Tide
 if(m.dive)e.diveNext=true; // R4: submerges at the end of its turn
 if(m.surface)e.sub=false;
 if(m.discharge)dischargeReset(e); // R1
 if(m.vent)e.press=0;
 if(m.b)e.block+=m.b;if(m.s)addSt(e,'str',m.s);
 if(m.a){e.atkT=Date.now();for(let h=0;h<(m.h||1);h++){if(W.run.hp<=0||e.hp<=0||!W.cb)break;enemyHitPlayer(e,mod('hitDamage',{enemy:e,hits:m.h||1,hit:h},eAtk(e,m.a,{str:0,vuln:!!cb.p.st.vuln},true)+(h===0&&e.tailwind?e.tailwind:0)) /* Act 3 hook: modifyHitDamage */,m.ignoreG?{ignoreG:m.ignoreG}:undefined)}if(m.brittleLast&&W.cb&&W.run.hp>0)addSt(cb.p,'brittle',1);e.tailwind=0;fire('playerAttacked',{enemy:e})}
 if(!W.cb||e.hp<=0&&!m.boom)return;
 if(m.healAlly){let t=alive().find(x=>x.uid===m.tgt&&x!==e),n=m.healAlly;if(!t){t=e;n=5}const h=Math.min(n,t.max-t.hp);t.hp+=h;if(h)floatText(t.uid,'+'+h,'h');log(`🪡 ${e.n} stitches ${t===e?'herself':t.n} (+${h})`)}
 if(m.allyB||m.allyS){alive().filter(x=>x!==e).forEach(x=>{if(m.allyB){x.block+=m.allyB;x.blkT=Date.now()}if(m.allyS)addSt(x,'str',m.allyS)});log(`📯 ${e.n} rallies its allies`)}
 if(m.heal){const h=Math.min(m.heal,e.max-e.hp);e.hp+=h;if(h)floatText(e.uid,'+'+h,'h')}
 if(m.w)addSt(cb.p,'weak',m.w);if(m.v)addSt(cb.p,'vuln',m.v);if(m.brittle)addSt(cb.p,'brittle',m.brittle);
 if(m.status){for(let i=0;i<m.status.n;i++)addCard(m.status.id,m.status.pile==='draw'?'drawRandom':m.status.pile||'disc');log(`🌿 ${m.status.n} ${CARDS[m.status.id].n} added to your ${m.status.pile==='draw'?'draw pile':m.status.pile==='hand'?'hand':'discard'}`)}
 if(m.drainE){cb.drainE=(cb.drainE||0)+m.drainE}
 if(m.stealPotion){const i=W.run.potions.findIndex(p=>p);if(i>=0){log('🧪 '+e.n+' stole your '+POTIONS[W.run.potions[i]].n);W.run.potions[i]=null}}
 if(m.boom&&e.hp>0){e.hp=0;log(`🍄 ${e.n} bursts`)}
 if(m.summon){const n=m.n||1;for(let i=0;i<n;i++){if(m.max&&countAlive(m.summon)>=m.max)break;spawn(m.summon,{summoned:true});log(`📯 ${EN[m.summon].n} joins the fight`)}}
 if(m.steal){const g=Math.min(m.steal,W.run.gold);W.run.gold-=g;e.fled=true;e.stole=g;log(`🐦 ${e.n} stole ${g} gold and flew off!`)}
 if(m.ring){for(let i=0;i<m.ring;i++)addCard('ringing','disc');log(`🔔 ${m.ring} Ringing added to your discard`)}
 if(m.lure)goldenLure(e);
 if(m.cleanse){const al=alive().filter(x=>x!==e).sort((a,b)=>Object.keys(b.st).length-Object.keys(a.st).length)[0];if(al){['weak','vuln','bleed','brittle','drench','reson'].forEach(k=>delete al.st[k]);log(`🏮 ${e.n} snuffs the burning on ${al.n}`)}}
 if(m.fx)m.fx(e)}
// ---- Act 2 rules (studio/design/ACT2-RULES.md) ----
// R7 Pull: Tidecaller loses Tide, everyone else loses Guard (up to N).
export function pullPlayer(n){const cb=W.cb;if(W.run.cls==='tide'){const to=Math.max(0,cb.tide-n);if(to!==cb.tide){const from=cb.tide;cb.tide=to;fire('tideChange',{from,to,delta:to-from,cause:'pull'});log(`⛓️ Pull: Tide drops to ${to}`)}}else{const g=Math.min(n,cb.p.block);if(g>0){cb.p.block-=g;floatText('p','-'+g+'🛡','');log(`⛓️ Pull: −${g} Guard`)}}}
// ---- Act 3 rules (studio/design/ACT3-RULES.md) ----
// R1 Static Charge: a discharge resets the Charge (polyps share ONE pool kept on the combat object).
export const poolOf=e=>e.key==='polyp'?(W.cb.pool||0):(e.charge||0);
export function setPool(e,n){n=Math.max(0,Math.min(3,n));if(e.key==='polyp')W.cb.pool=n;else e.charge=n}
function dischargeReset(e){setPool(e,0);callout('DISCHARGE','boss')}
// R2 Gust: the N rightmost cards of the hand go back on top of the draw pile (deterministic), once, after the draw.
function applyGust(){const cb=W.cb;let n=cb&&cb.gustNext||0;if(!cb)return;cb.gustNext=0;let k=0;
 while(n-->0&&cb.hand.length){const ci=cb.hand.pop();cb.draw.unshift(ci);k++}
 if(k){log('🌬️ Gust: '+k+' card'+(k>1?'s':'')+' blown back onto your draw pile');callout('GUST','boss');fire('gust',{n:k})}}
// R3 Numbed: the cheapest playable card in hand (leftmost on ties) costs 1 more this turn.
function applyNumb(){const cb=W.cb;if(!cb||!cb.numbNext)return;cb.numbNext=false;if(!alive().some(x=>x.key==='automaton'))return;if(!mod('numb',{},true))return;
 let best=null,bc=99;for(const ci of cb.hand){if(CARDS[ci.id].unplay)continue;const c=cost(ci);if(c<bc){bc=c;best=ci}}
 if(best){cb.numbCard=best;log('🥶 Numbed: '+cname(best)+' costs 1 more this turn');callout('NUMBED','boss')}}
// R7 Twin Squalls: the twins trade places after every enemy round.
function swapTwins(){const t=alive().filter(x=>x.key==='squallwest'||x.key==='squalleast');if(t.length===2){t.forEach(x=>x.back=!x.back);log('🌀 The twins trade places')}}
// R4 Cloud Dive / R9 Water: end-of-enemy-turn hook
// R4 Muffled: the highest-cost card in hand (leftmost on ties) is locked for the player's turn. Zero-cost hands lock nothing.
const cardCost=ci=>cost(ci);
function applyMuffle(){const cb=W.cb;if(!cb||!cb.muffleNext)return;cb.muffleNext=false;if(!alive().some(x=>x.key==='bellnun'))return;
 let best=null,bc=0;for(const ci of cb.hand){const c=cardCost(ci);if(c>bc){bc=c;best=ci}}
 if(best){cb.locked=best;log('🔕 Muffled: '+cname(best)+' is silenced this turn');callout('MUFFLED','boss')}}
// R8 Seize: the Bosun keeps your lowest-cost card (leftmost on ties) until he dies. A card stays in run.deck, so combat end needs no return.
function seizeCard(e){const cb=W.cb;if(e.seized||!cb.hand.length)return;let best=null,bc=99;for(const ci of cb.hand){const c=cardCost(ci);if(c<bc){bc=c;best=ci}}
 if(best){cb.hand.splice(cb.hand.indexOf(best),1);e.seized=best;log('⚓ '+e.n+' seizes '+cname(best));callout('SEIZED','boss')}}
// Golden Lure (Wreck Queen): a real choice.
function goldenLure(e){const cb=W.cb;cb.nextTurnQ.push(()=>choose('Golden Light',[{l:'Follow the light',cap:'+12 Guard, −6 HP',f:()=>{gainBlock(12);loseHp(6)}},{l:'Look away',cap:'The Queen gains 6 Guard',f:()=>{e.block+=6;e.blkT=Date.now()}}]))}
// R2 Hold the Line: a single-target card aimed at an ally of a Guarded holder hits the holder instead.
export function holdRedirect(t){if(t&&t.back){const f=alive().find(x=>!x.back&&x!==t&&EN[x.key].passive&&EN[x.key].passive.twin);if(f)return f} // R7: single-target cards can only reach the front twin
 const h=alive().find(x=>x!==t&&x.block>0&&EN[x.key].passive&&EN[x.key].passive.hold);return h&&t&&!(EN[t.key].passive&&EN[t.key].passive.hold)?h:t}
export const lockedCard=()=>W.cb&&W.cb.locked||null;
// R5 Owed: the card TYPE (Waypoints count as Skills) of the first card played each turn while Grell lives.
export const owedType=d=>d.t==='A'?'A':d.t==='P'?'P':d.t==='S'||d.t==='W'?'S':null;
function endOfEnemyTurn(e){const t=EN[e.key];if(e.diveNext){e.diveNext=false;e.sub=true;floatText(e.uid,'Submerged','b');fire('enemyDive',{enemy:e}) /* Act 3 hook: onEnemyDive */}if(t.passive&&t.passive.endTurn)t.passive.endTurn(e);
 if(e.st.shell)e.block+=e.st.shell;if(e.st.mending&&e.hp>0){const h=Math.min(e.st.mending,e.max-e.hp);e.hp+=h;if(h)floatText(e.uid,'+'+h,'h')}}
// Enemy beats (telegraph crouch, gap between enemies, pause after End Turn) come from the ENEMY_BEATS table in core/timing.js (skipped when FAST).
export function enemyPhase(){const cb=W.cb;if(!cb)return;cb.breaks=0;cb.parryHit={};cb.cleanDone={};cb.momLostPhase=false;
 // The player's Soaked / Exposed / Brittle wear off by 1 at the END of the enemy turn, so Exposed shown on the intents really lands.
 // Only stacks held at the start of the phase tick; one applied this phase lasts through the next enemy turn.
 const preSt={...cb.p.st};
 const list=cb.ens.slice();let k=0;const telegraphed=new Set(),struck=new Set();
 const step=()=>{if(!W.cb||W.cb!==cb)return;
  while(k<list.length&&(list[k].hp<=0||list[k].fled))k++;
  if(k>=list.length)return finish();
  const e=list[k++];cb.tele=e;
  // v0.6.13 beats: (1) telegraph/wind-up -> (2) strike lead (lunge or cast) -> (3) IMPACT: act() runs here, so HP/block/buffs change at the contact frame
  //  -> (4) hit-stop + recover -> (5) gap before the next enemy. FAST skips all of it; the 'classic' (Fast) enemy pace has lead 0 and resolves right after the telegraph.
  const B=beatsFor(e,intentOf(e),window.FAST?'classic':undefined);cb.beats=B;
  if(!window.FAST&&!telegraphed.has(e)){telegraphed.add(e);k--;fire('enemyTelegraph',{enemy:e,beats:B});render();return setTimeout(step,T(B.tele+B.teleHold))}
  if(!window.FAST&&B.lead>0&&!struck.has(e)){struck.add(e);k--;fire('enemyStrike',{enemy:e,intent:intentOf(e),beats:B});render();return setTimeout(step,T(B.lead))}
  if(window.FAST||B.lead<=0)fire('enemyStrike',{enemy:e,intent:intentOf(e),beats:B});
  if(!(e.passive&&e.passive.keepGuard))e.block=0;act(e);if(!W.cb)return;cb.acting=null;e.t++;if(e.hp>0)endOfEnemyTurn(e);tick(e.st,e.hold);e.hold=null;delete e.st.mightTmp;
  if(e.hp>0&&!e.fled){if(e.keepNext)e.keepNext=false;else e.next=EN[e.key].ai(e)}
  if(W.run.hp<=0&&!cheatDeath())return lose();
  if(!alive().length)return finish();
  if(window.FAST)return step();render();setTimeout(step,T(B.lead>0?B.hitstop+B.recover+Math.max(0,B.hits-1)*B.hitGap+B.gap:B.gap))};
 const finish=()=>{if(!W.cb)return;['weak','vuln','brittle','drench','reson'].forEach(k=>{if(preSt[k]&&cb.p.st[k]){cb.p.st[k]--;if(!cb.p.st[k])delete cb.p.st[k]}});cb.tele=null;swapTwins();fire('roundEnd',{});cb.busy=false;cb.enemyTurn=false;cb.retortOk=cb.retort;cb.retort=false;if(!alive().length)return win();startTurn()};
 step()}
export function win(){const cb=W.cb;const k=cb.kind;fire('combatEnd',{kind:k,won:true});W.run.deck.forEach(ci=>{ci.tmpUp=false;ci.tmp0=false});
 const allFled=cb.ens.some(e=>e.fled)&&cb.ens.every(e=>e.fled||e.summoned);
 // R1b: heal after a won fight / elite (ECON.winHeal), shown as a heal pop + callout before the rewards.
 let wh=((ECON.winHeal||{})[k]||0)+((W.run.act||1)>1?((ECON.winHealLater||{})[k]||0):0);if((W.run.asc|0)>=4)wh=Math.floor(wh/2);if(wh>0&&W.run.hp>0){const h=Math.min(wh,W.run.max-W.run.hp);if(h>0)W.run.hp+=h;W.run.lastWinHeal=h}
 W.cb=null;if(W.run.lastWinHeal>0)W.run.healPop={n:W.run.lastWinHeal,t:Date.now()};combatRewards(k,{allFled,opts:cb.opts,cb});if(W.run.lastWinHeal>0&&!window.FAST){const S1=W.S;setTimeout(()=>{if(W.S===S1)render()},1450)}}
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

export function decampWp(...args){return savedAction('decampWp',args,()=>decampWpImpl(...args))}

export function advance(...args){return savedAction('advance',args,()=>advanceImpl(...args))}

export function tideAct(...args){return savedAction('tideAct',args,()=>tideActImpl(...args))}

export function releaseBank(...args){return savedAction('releaseBank',args,()=>releaseBankImpl(...args))}

export function drinkPotion(...args){return savedAction('drinkPotion',args,()=>drinkPotionImpl(...args))}

export function armFlourish(...args){return savedAction('armFlourish',args,()=>armFlourishImpl(...args))}

export function armMark(...args){return savedAction('armMark',args,()=>armMarkImpl(...args))}

export function tapCard(...args){return savedAction('tapCard',args,()=>tapCardImpl(...args))}

export function startCombat(...args){return savedAction('startCombat',args,()=>startCombatImpl(...args))}
