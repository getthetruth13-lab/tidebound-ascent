import {savedAction,settings,saveSettings} from '../save.js';
// engine/run.js — the run: seeded state, map, rooms (? / chests / merchant / camps / events), rewards, economy.
// Numbers: design-v2 §1.1–§1.8. Every random roll uses a named seeded stream (core/state.js), so the same seed and the
// same choices give the same maps, rewards and enemy rolls (§1.10).
import {ACT1_SET} from '../data/act1.js';
import {cardAct} from '../data/act2.js';
import {CARDS,CLASSES,ENCOUNTERS,encountersFor,EVENTS,RELICS,POTIONS,CHARMS,EN} from '../core/registry.js';
import {R,W,pick,rng,shuffle,wpick,rnd,seedStreams} from '../core/state.js';
import {mk,cname,canTemper,upgradeCard,rawLvl} from './cards.js';
import {startCombat,heal as cHeal} from './combat.js';
import {fire,mod} from '../core/bus.js';
import {saveRun,clearRun,saveWin,loadWin,clearWin,loadRunData,migrateRun} from '../save.js';
import {initRun as lampInit,noteSeen,settleRun} from './lamplight.js';
import {warmActPack} from '../assets.js';
import {loadProfile,saveProfile,lockedFor,addHistory,ascUnlocked} from '../progress.js';
import {overallFloor} from '../data/places.js';
import {SPOIL_CARDS} from '../data/lamplight.js';
import {eventText} from '../data/lore.js';
import {render,markCardsSeen,updateCardSelection} from '../ui/render.js';
// ================= economy tables (design-v2 §1.1, §1.4, §1.5) =================
export const ECON={startGold:99,potionSlots:3,
 gold:{fight:[10,20],elite:[25,35],boss:[90,110]},
 cardOdds:{fight:{c:60,u:35,r:5},elite:{c:45,u:42,r:13},boss:{c:0,u:0,r:100},shop:{c:50,u:38,r:12}},
 swellStart:-4,swellMax:30,
 relicOdds:{c:50,u:35,r:15},
 potion:{start:40,step:10,min:10,max:90,eliteBonus:10,rarity:{c:60,u:30,r:10}},
 price:{card:{c:[45,55],u:[70,80],r:[140,160]},colorless:{u:[85,95],r:[170,190]},relic:{c:[140,160],u:[230,260],r:[280,310],shop:[150,170]},potion:{c:[45,55],u:[70,80],r:[95,105]},},
 q:{fight:[12,12],shop:[4,4],treasure:[3,3],rest:15},
 chest:[{k:'small',n:'Driftwood Chest',w:50,rel:{c:70,u:30,r:0},gold:[50,20,30]},{k:'medium',n:'Iron-banded Chest',w:33,rel:{c:35,u:50,r:15},gold:[40,40,55]},{k:'large',n:'Gilded Chest',w:17,rel:{c:0,u:70,r:30},gold:[50,65,80]}],
 map:{rows:15,weights:{fight:45,unknown:22,rest:12,elite:10,shop:7}},
 mend:.3,
 // R1b (Spencer 2026-10-13, SIM-ACT1-R1): hero HP overrides, heal after a won fight, elite damage multipliers, relics pulled from the pool.
 heroHp:{tide:80,carto:64,duel:85},winHeal:{fight:3,elite:5},winHealLater:{fight:3,elite:5}, // R6: Acts 2 and 3 heal 6 / 10 after a won fight / elite (hero side)
 eliteDmg:.88,eliteDmgByKey:{eel:.82},relicPulled:['duetbell'],
 // Elite Artifact (Spencer 2026-10-13): a roll per elite reward, not guaranteed.
 eliteArtifactChance:.35,
 // merchant stock (Task 65): slot lists, so the card redesign only changes data and pools
 shop:{cards:[{type:'A'},{type:'A'},{type:'S'},{type:'S'},{type:'P',alt:{carto:'W'}}],sale:{count:1,mult:.5},extra:[{r:'u'},{r:'r',artifact:true}],
  relics:[{odds:'relicOdds'},{odds:'relicOdds'},{tier:'shop',fallback:'relicOdds'}],potions:3,removal:{base:75,step:25,perVisit:1}}};
const TIERS=['c','u','r'];
// ================= run setup =================
export function dailySeed(d=new Date()){const k=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();let h=2166136261;for(const c of String(k)+'drowned-sun'){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export const ascInfo=['Normal game','Foes have 8% more HP','Elites and bosses have 10% more HP','You start with 30 less gold','Victory heals are halved','Foes have 16% more HP in total'];
export function newRun(cls,o={}){const K=CLASSES[cls];clearWin();nextActSnap=null;
 const urlSeed=o.seed==null&&typeof location!=='undefined'?+new URLSearchParams(location.search).get('seed'):0; // ?seed=N replays a run's maps and rolls
 // v0.6.54: Daily run (settings.dailyMode, or o.daily) uses today's date as the seed; Ascension (settings.ascension, opened one level per Act 1 win) is off by default. Neither touches a normal run.
 const daily=o.daily!=null?!!o.daily:(o.seed==null&&!urlSeed&&!!settings.dailyMode);
 const asc=o.asc!=null?(o.asc|0):(daily?0:Math.min(settings.ascension|0,ascUnlocked()));
 const seed=(o.seed!=null?o.seed:urlSeed?urlSeed:daily?dailySeed():(Date.now()^Math.floor(Math.random()*4294967296)))>>>0;
 applyHeroHp();W.run={v:2,seed,rngs:seedStreams(seed),cls,hp:K.hp,max:K.hp,gold:ECON.startGold-(asc>=3?30:0),deck:K.starter.map(id=>mk(id)),floor:0,act:1,pos:{r:-1,i:-1},vis:{},won:false,kills:0,
  relics:[],potions:Array(ECON.potionSlots).fill(null),potionChance:ECON.potion.start,swell:ECON.swellStart,qOdds:{fight:ECON.q.fight[0],shop:ECON.q.shop[0],treasure:ECON.q.treasure[0]},
  removals:0,seenRelics:{},seenEvents:{},shrinesThisAct:{},charms:[],encHist:[],fights:0,rareNext:false,
  stats:{floors:0,kills:0,elites:[0,0,0],bosses:0,goldEarned:0,maxHit:0,maxCardsTurn:0,cardsPlayed:0,path:[],potionsUsed:0,relicsAtBoss:null,potionsAtBoss:null,startT:Date.now()}};
 // Lamplight (design/progression-proposal.md): the run keeps a snapshot of what is still locked, so rolls and saved runs stay stable. Daily / full-pool runs and old saves have no lock.
 W.run.lock=o.fullPool||daily?null:lockedFor(loadProfile());if(daily)W.run.daily=true;if(asc>0)W.run.asc=asc;lampInit(W.run);
 W.run.boss=wpick(ENCOUNTERS.boss.map(x=>[x.e[0],x.w]),'map');
 // Later-act bosses are drawn on their own 'acts' stream, so Act 1's map/rolls stay identical (golden test). bosses[act] = that act's boss id.
 W.run.bosses={1:W.run.boss};for(const a of [2,3]){const t=encountersFor(a).boss;if(t&&t.length)W.run.bosses[a]=wpick(t.map(x=>[x.e[0],x.w]),'acts')}
 W.run.map=genMap();
 if(K.relic)gainRelic(K.relic,{silent:true});
 W.cb=null;
 if(o.skipTravel||window.FAST)W.S={screen:'map'};else W.S={screen:'travel',t:Date.now()};
 saveRun();render();return W.run}
// ================= map (§1.5) =================
export function nodeType(f){if(f===1)return'fight';if(f===8)return'treasure';if(f===14)return'rest';if(f===15)return'boss';
 const w=ECON.map.weights;const l=[['fight',w.fight],['unknown',w.unknown]];if(f!==13)l.push(['rest',w.rest]);if(f>=5)l.push(['elite',w.elite]);if(f>=3)l.push(['shop',w.shop]);return wpick(l,'map')}
// Run variety (CLAUDE_TASK_3): every map gets a random "shape" (pinch rows where the paths squeeze to 2 nodes, and link density), and a
// finished map must pass variety rules: a real choice on every row, early AND late camps, 2+ elites on different floors, enough ? rooms.
export function genMap(act=1){if(act>1)return genMapLater(act);let m,best=null;for(let t=0;t<400;t++){m=tryMap();fixPathRules(m);if(!hasShop(m))continue;const r=eliteRange(m);if(!(r[0]<=1&&r[1]>=3))continue;best=best||m;if(varietyOK(m))return m}return best||m}
// ---- Acts 2 and 3 (ACT2-DESIGN s3, ACT3-ROSTER-SKELETON): 16 rows (15 node rows + boss), pinned rows, single-node Gate rows (Act 2) or one Eye camp (Act 3).
// Row index r = floor-1. `pin` rows keep their type; `gate` rows hold ONE centre node that every path squeezes through.
const MAP_ACT={
 2:{pin:{0:'fight',4:'rest',8:'treasure',9:'shop',14:'rest'},gate:[4,9],pinch:[1,2,6,7,11,12],noElite:[0,1,2,4,9,14],restRows:[2,6,7,10,11,12],w:{fight:42,unknown:24,rest:10,elite:12,shop:6}},
 // Act 3 (ACT3-DESIGN s3): the Eye at floor 8 (row 7, one node), pinch rows at floors 4 and 11, shops only on floors 11-14, no Gate rows besides the Eye, Updrafts added after the rows.
 3:{pin:{0:'fight',7:'rest',11:'treasure',14:'rest'},gate:[7],pinch:[3,10],pinchN:2,noElite:[0,1,2,7,11,14],restRows:[2,3,4,5,9,10,12],shopRows:[10,12,13],w:{fight:40,unknown:24,rest:9,elite:13,shop:6},up:true}};
function nodeTypeLater(P,r){if(P.pin[r])return P.pin[r];const f=r+1;const l=[['fight',P.w.fight],['unknown',P.w.unknown]];if(P.restRows.includes(r))l.push(['rest',P.w.rest]);if(!P.noElite.includes(r))l.push(['elite',P.w.elite]);if(P.shopRows?P.shopRows.includes(r):(f>=3&&r!==13))l.push(['shop',P.w.shop]);return wpick(l,'map')}
function tryMapLater(P){const rows=[];const pinch=new Set(shuffle(P.pinch,'map').slice(0,P.pinchN||4)),link=[.3,.45,.6][R(3,'map')];
 for(let r=0;r<15;r++){if(P.gate.includes(r)){rows.push([{c:1.5,t:nodeTypeLater(P,r),to:[]}]);continue}
  const cnt=r===0?3:pinch.has(r)?2:3+R(2,'map');const cols=shuffle([0,1,2,3],'map').slice(0,cnt).sort((a,b)=>a-b);rows.push(cols.map(c=>({c,t:nodeTypeLater(P,r),to:[]})))}
 rows.push([{c:1.5,t:'boss',to:[]}]);
 for(let r=0;r<15;r++){const nx=rows[r+1],cur=rows[r];
  cur.forEach(n=>{let b=0;nx.forEach((m,j)=>{if(Math.abs(m.c-n.c)<Math.abs(nx[b].c-n.c))b=j});n.to.push(b);
   if(nx.length===1)return;nx.forEach((m,j)=>{if(j!==b&&n.to.length<2&&Math.abs(m.c-n.c)<=1&&rnd('map')<link)n.to.push(j)})});
  nx.forEach((m,j)=>{if(!cur.some(n=>n.to.includes(j))){let b=0;cur.forEach((n,i)=>{if(Math.abs(n.c-m.c)<Math.abs(cur[b].c-m.c))b=i});cur[b].to.push(j)}})}
 // a gate's row fans out to every node of the next row (the squeeze, then the spread)
 P.gate.forEach(r=>{rows[r][0].to=rows[r+1].map((_,j)=>j)});
 return rows}
// v0.6.54 (review: path variety): Acts 2 and 3 only (Act 1 maps stay byte-identical for the golden test). If floors 1-3 hold only fights, ? rooms and elites,
// one floor-3 room becomes a Camp so the first choices include a real non-fight option. No RNG is used, so every other roll is unchanged.
export function genMapLater(act){const m=genMapLater0(act);if(!m||!m[2])return m;if(!m.slice(0,3).some(row=>row.some(x=>['shop','rest','treasure'].includes(x.t)))){const row=m[2],hit=new Set();m[0].forEach(x=>(x.up||[]).forEach(j=>hit.add(j)));const free=row.filter((x,j)=>!hit.has(j));const n=free.find(x=>x.t==='fight')||free.find(x=>x.t==='unknown'); /* never a Rest where an Updraft lands (Act 3 rule) */if(n){n.t='rest';(n.to||[]).forEach(j=>{const c=m[3]&&m[3][j];if(c&&c.t==='rest')c.t='fight'})}}return m}
function genMapLater0(act){const P=MAP_ACT[act];let best=null;
 for(let t=0;t<600;t++){const m=tryMapLater(P);
  for(let r=1;r<15;r++)m[r].forEach((n,j)=>{if(P.pin[r])return;let g=0;while(NOREPEAT.has(n.t)&&parents(m,r,j).some(p=>p.t===n.t)&&g++<30)n.t=nodeTypeLater(P,r);if(NOREPEAT.has(n.t)&&parents(m,r,j).some(p=>p.t===n.t))n.t='fight'});
  const all=m.flat(),er=eliteRange(m);if(!(er[0]<=1&&er[1]>=3))continue;best=best||m;
  if(P.up){if(er[0]>0)continue;const sh=all.filter(n=>n.t==='shop').length;if(sh<1||sh>2)continue;if(!addUpdrafts(m,P))continue}
  if(all.filter(n=>n.t==='unknown').length>=4&&all.filter(n=>n.t==='elite').length>=3&&all.filter(n=>n.t==='elite').length<=7&&all.filter(n=>n.t==='shop').length>=1)return m}
 return best}
// ---- Act 3 Updrafts (ACT3-DESIGN s3): a node's `up` lists nodes two rows ahead (skipping one row). 4-6 per map, 1-2 per band, never over a pinned row, lane distance <= 1,
// no crossings, at most 1 lands on an elite, none on a Rest or Shop, no path uses more than 2. Act 1 and 2 maps have no `up`, so they stay byte-identical.
const segX=(a,b,c,d)=>{const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);const same=(p,q)=>p[0]===q[0]&&p[1]===q[1];if(same(a,c)||same(a,d)||same(b,c)||same(b,d))return false;
 const d1=o(a,b,c),d2=o(a,b,d),d3=o(c,d,a),d4=o(c,d,b);return d1*d2<0&&d3*d4<0};
export function addUpdrafts(m,P){const banSkip=new Set([0,7,11,14]),cand=[];
 for(let r=0;r<=12;r++){if(banSkip.has(r+1))continue;m[r].forEach((n,i)=>m[r+2].forEach((t,j)=>{if(Math.abs(n.c-t.c)>1||t.t==='rest'||t.t==='shop'||t.t==='boss')return;cand.push({r,i,j})}))}
 const want=4+R(3,'map'),pick_=[],band=r=>r<5?0:r<10?1:2,bc=[0,0,0];let elites=0;
 const pt=(r,i)=>[m[r][i].c,r];
 const crosses=(a,b)=>{const A=[pt(a.r,a.i),pt(a.r+2,a.j)],B=[pt(b.r,b.i),pt(b.r+2,b.j)];return segX(A[0],A[1],B[0],B[1])};
 const crossesEdge=a=>{const A=[pt(a.r,a.i),pt(a.r+2,a.j)];for(let r=a.r;r<=a.r+1;r++)for(let i=0;i<m[r].length;i++)for(const j of m[r][i].to)if(segX(A[0],A[1],pt(r,i),pt(r+1,j)))return true;return false};
 for(const c of shuffle(cand,'map')){if(pick_.length>=want)break;if(bc[band(c.r)]>=2||crossesEdge(c)||pick_.some(p=>crosses(p,c)||(p.r===c.r&&p.i===c.i)))continue;
  const el=m[c.r+2][c.j].t==='elite';if(el&&elites>=1)continue;
  (m[c.r][c.i].up=m[c.r][c.i].up||[]).push(c.j);pick_.push(c);bc[band(c.r)]++;if(el)elites++;
  if(maxUps(m)>2){m[c.r][c.i].up.pop();if(!m[c.r][c.i].up.length)delete m[c.r][c.i].up;pick_.pop();bc[band(c.r)]--;if(el)elites--}}
 if(pick_.length<4||bc.some(x=>x<1)){m.flat().forEach(n=>{delete n.up});return false}
 return true}
function maxUps(m){const best=m.map(row=>row.map(()=>0));for(let r=m.length-1;r>=0;r--)m[r].forEach((n,i)=>{let b=0;n.to.forEach(j=>{b=Math.max(b,best[r+1][j])});(n.up||[]).forEach(j=>{b=Math.max(b,1+best[r+2][j])});best[r][i]=b});return Math.max(...best[0])}
const FIXED_ROWS=new Set([0,7,13,14]); // floors 1, 8 (treasure), 14 (camp) and the boss floor never vary
export function varietyOK(m){const all=m.flat(),has=(t,a,b)=>m.some((row,r)=>r>=a&&r<=b&&row.some(n=>n.t===t));
 if(all.filter(n=>n.t==='unknown').length<4)return false;
 if(!has('rest',3,8)||!has('rest',9,12))return false;
 const el=all.filter(n=>n.t==='elite');if(el.length<2||el.length>7)return false;
 if(new Set(m.map((row,r)=>row.some(n=>n.t==='elite')?r:-1).filter(r=>r>=0)).size<2)return false;
 for(let r=0;r<m.length-1;r++)if(!FIXED_ROWS.has(r)&&m[r].length>=3&&new Set(m[r].map(n=>n.t)).size<2)return false;
 return true}
export function tryMap(){const rows=[];
 const pinch=new Set(shuffle([2,3,4,5,6,8,9,10,11,12],'map').slice(0,R(3,'map')+1)),link=[.3,.45,.6][R(3,'map')];
 for(let r=0;r<14;r++){const cnt=r===0?3:pinch.has(r)?2:3+R(2,'map');const cols=shuffle([0,1,2,3],'map').slice(0,cnt).sort((a,b)=>a-b);rows.push(cols.map(c=>({c,t:nodeType(r+1),to:[]})))}
 rows.push([{c:1.5,t:'boss',to:[]}]);
 for(let r=0;r<14;r++){const nx=rows[r+1],cur=rows[r];
  cur.forEach(n=>{let b=0;nx.forEach((m,j)=>{if(Math.abs(m.c-n.c)<Math.abs(nx[b].c-n.c))b=j});n.to.push(b);
   nx.forEach((m,j)=>{if(j!==b&&n.to.length<2&&Math.abs(m.c-n.c)<=1&&rnd('map')<link)n.to.push(j)})});
  nx.forEach((m,j)=>{if(!cur.some(n=>n.to.includes(j))){let b=0;cur.forEach((n,i)=>{if(Math.abs(n.c-m.c)<Math.abs(cur[b].c-m.c))b=i});cur[b].to.push(j)}})}
 // a row of 3+ nodes should offer a real choice: if every node rolled the same type, re-roll one
 rows.forEach((row,r)=>{if(r>0&&!FIXED_ROWS.has(r)&&row.length>=3&&new Set(row.map(n=>n.t)).size<2){const n=row[R(row.length,'map')];for(let g=0;g<20&&row.every(x=>x.t===row[0].t);g++)n.t=nodeType(r+1)}});
 return rows}
const NOREPEAT=new Set(['elite','rest','shop']);
function parents(m,r,j){return r>0?m[r-1].filter(n=>n.to.includes(j)):[]}
// Path rule: no Elite, Camp or Merchant immediately after the same type. Re-roll offending nodes (fixed rows never change).
export function fixPathRules(m){for(let r=1;r<13;r++)m[r].forEach((n,j)=>{const f=r+1;if(f===8)return;let g=0;
 while(NOREPEAT.has(n.t)&&parents(m,r,j).some(p=>p.t===n.t)&&g++<30)n.t=nodeType(f);
 if(NOREPEAT.has(n.t)&&parents(m,r,j).some(p=>p.t===n.t))n.t='fight'});
 // the row before the Camp row (13) can't be a camp; a camp on row 13 is excluded by nodeType; a row-12 camp next to row-14 camps is fine
}
export function hasShop(m){for(let r=2;r<12;r++)if(m[r].some(n=>n.t==='shop'))return true;return false}
export function pathViolations(m){const v=[];for(let r=1;r<m.length;r++)m[r].forEach((n,j)=>{if(NOREPEAT.has(n.t)&&parents(m,r,j).some(p=>p.t===n.t))v.push(r+':'+j)});return v}
export function eliteRange(rows){const mn=[],mx=[];for(let r=rows.length-1;r>=0;r--){mn[r]=[];mx[r]=[];rows[r].forEach((n,i)=>{const e=n.t==='elite'?1:0;if(!n.to.length){mn[r][i]=e;mx[r][i]=e}else{mn[r][i]=e+Math.min(...n.to.map(j=>mn[r+1][j]));mx[r][i]=e+Math.max(...n.to.map(j=>mx[r+1][j]))}})}
 return [Math.min(...mn[0]),Math.max(...mx[0])]}
export function reachableUp(){const run=W.run;if(run.pos.r<0)return [];const row=run.map[run.pos.r];return row&&row[run.pos.i].up||[]}
export function reachable(){const run=W.run;if(run.pos.r<0)return run.map[0].map((_,i)=>i);const row=run.map[run.pos.r];return row?row[run.pos.i].to:[]}
// Tidewalker Boots: 3 times per run, move to ANY node on the next floor.
export function bootsLeft(){const b=W.run.relics.find(r=>r.id==='boots');return b?b.n||0:0}
function goNodeImpl(r,i){const run=W.run;if(W.S.screen!=='map'||W.S.ov)return;const viaUp=r===run.pos.r+2&&reachableUp().includes(i); // Act 3 Updraft: skips one row
 if((!viaUp&&r!==run.pos.r+1)||!run.map[r]||!run.map[r][i])return;
 if(!viaUp&&!reachable().includes(i)){if((run.cut||0)>0)run.cut--;else{if(bootsLeft()<=0)return;const b=run.relics.find(x=>x.id==='boots');b.n--;b.flashT=Date.now()}}
 const n=run.map[r][i];run.pos={r,i};run.vis[r+':'+i]=1;run.floor=r+1;run.stats.floors=run.floor;run.stats.path.push(n.t);
 if(n.t==='boss'){run.stats.relicsAtBoss=run.relics.length;run.stats.potionsAtBoss=run.potions.filter(Boolean).length}
 if(viaUp)fire('updraft',{node:n}); // Act 3 hook: mapMove (updraft)
 enterNode(n.t)}
function enterNodeImpl(t){const run=W.run;fire('enterRoom',{type:t});
 if(t==='unknown')return resolveUnknown();
 if(t==='fight')return fight();
 if(t==='elite'){const e=pickEncounter('elite');return startCombat('elite',e)}
 if(t==='boss')return startCombat('boss',[run.boss]);
 if(t==='rest'){if((run.act||1)===3&&run.floor===8){run.eyeLeft=1;run.eyeUsed=[]}else{run.eyeLeft=0;run.eyeUsed=[]}W.S={screen:'rest'};return render()}
 if(t==='shop')return openShop();
 if(t==='treasure')return openChest();
 goMap()}
function encKey(e){return e.join('+')}
// Encounter pools (§1.7): first 3 fights each act are easy; no repeat of the same encounter within 2 fights.
export function pickEncounter(pool){const run=W.run;const list=encountersFor(run.act||1)[pool];const recent=run.encHist.slice(-2),last=(run.encHist[run.encHist.length-1]||'').split('+');
 const seen=run.encSeen||(run.encSeen={});const sk=x=>pool+':'+encKey(x.e);
 let cand=list.filter(x=>!recent.includes(encKey(x.e))&&(!x.fl||(run.floor>=x.fl[0]&&run.floor<=x.fl[1])));if(!cand.length)cand=list;
 // no encounter repeats in a run until the whole pool has been used; then the pool starts over
 const fresh=cand.filter(x=>!seen[sk(x)]);if(fresh.length)cand=fresh;else list.forEach(x=>delete seen[sk(x)]);
 // back-to-back fights prefer a different enemy line-up (shared enemy types are less likely)
 const e=wpick(cand.map(x=>[x.e,x.w*(x.e.some(k=>last.includes(k))?.4:1)]),'events');seen[pool+':'+encKey(e)]=1;run.encHist.push(encKey(e));return e.slice()}
export function fight(opts={}){const run=W.run;const pool=run.fights<3?'easy':'hard';run.fights++;return startCombat('fight',pickEncounter(pool),opts)}
// ? rooms (§1.5): ~ECON.q.rest% resolve as Camp; the rest keep Fight → Treasure → Merchant adaptive odds (hit resets, others grow) or an Event.
// A ? room's outcome roll. Cartographer cards / relics roll it early (revealRows) and the map shows it; entering the room then uses that result.
function rollUnknown(){const q=W.run.qOdds,rest=ECON.q.rest||0,x=rnd('events')*100;
 if(x<rest)return'rest';
 const y=rest>=100?0:(x-rest)/(100-rest)*100;
 return y<q.fight?'fight':y<q.fight+q.treasure?'treasure':y<q.fight+q.treasure+q.shop?'shop':'event'}
export function revealRows(n){const run=W.run;if(!run||!run.map)return 0;let k=0;
 for(let r=run.pos.r+1;r<run.pos.r+1+n&&r<run.map.length;r++)run.map[r].forEach(nd=>{if(nd.t==='unknown'&&!nd.pre){nd.pre=rollUnknown();k++}});
 if(k)toast('🔭 '+k+' ? room'+(k>1?'s':'')+' revealed','relic');return k}
export function resolveUnknown(){const run=W.run,q=run.qOdds;const node=run.map[run.pos.r]&&run.map[run.pos.r][run.pos.i];let out=(node&&node.pre)||rollUnknown();
 for(const k of ['fight','shop','treasure']){if(k===out)q[k]=ECON.q[k][0];else q[k]+=ECON.q[k][1]}
 run.lastQ=out;
 if(out==='fight')return fight({fromQ:true});if(out==='treasure')return openChest();if(out==='shop')return openShop();
 if(out==='rest'){W.S={screen:'rest'};return render()}
 const ev=pickEvent();if(!ev)return fight({fromQ:true});noteSeen('event',ev.id);
 if(ev.pool==='shrine')run.shrinesThisAct[ev.id]=1;else run.seenEvents[ev.id]=1;
 W.S={screen:'event',ev:withVariant({...ev,t:eventText(ev.id,ev.t)}),t:Date.now()};render()}
// Act 1 scene variants (data/events.js addVariant): ~half the time a scene opens in its second form (new text, one option swapped).
export function withVariant(ev){const v=ev.vars&&ev.vars.length?ev.vars[Math.floor(rnd('events')*ev.vars.length)]:null;if(!v||rnd('events')>=.5)return ev;
 const o=ev.o.slice();o[v.at]=v.o;return {...ev,t:v.t,o,variant:1}}
export function eventOK(ev){const run=W.run;if(ev.pool==='shrine'?run.shrinesThisAct[ev.id]:run.seenEvents[ev.id])return false;if(ev.act&&ev.act!==run.act)return false;return !ev.req||ev.req()}
export function pickEvent(){const act=EVENTS.filter(e=>e.pool!=='shrine'&&eventOK(e)),sh=EVENTS.filter(e=>e.pool==='shrine'&&eventOK(e));
 let list=rnd('events')<.75?act:sh;if(!list.length)list=list===act?sh:act;return list.length?pick(list,'events'):null}
function evOptImpl(i){const S=W.S;if(S.screen!=='event')return;const o=S.ev.o[i];if(!o||(o.ok&&!o.ok()))return;o.f()}
// ================= rewards (§1.1) =================
// Act 1 rewards and the merchant are gated to the Act 1 card set (design/act1-complete.md §(a), data/act1.js); later acts use the full pool.
// A locked id (Lamplight) never rolls in rewards, shops, events or potions: every pool below goes through isLocked.
export function isLocked(kind,id){const l=W.run&&W.run.lock;return !!(l&&l[kind]&&l[kind][id])}
// Act N cards (act field, data/act2.js) roll only once run.act >= N; Act 1 rolls only the Act 1 set; cards in no act set (colourless) are free after Act 1.
export const inActSet=c=>{if(c.cut||c.stub||isLocked('cards',c.id))return false;const act=W.run.act||1;if(act===1)return ACT1_SET.has(c.id);const a=cardAct(c.id);return a===0||a<=act};
export function cardPool(r){return Object.values(CARDS).filter(c=>c.cls===W.run.cls&&c.r===r&&inActSet(c))}
// Rarity roll with the Swell counter: added to the rare chance; a negative counter shrinks Rare first, then Uncommon.
export function cardOdds(src,swell){const b=ECON.cardOdds[src];if(src==='boss')return {...b};let r=b.r+swell,u=b.u;if(r<0){u=Math.max(0,u+r);r=0}r=Math.min(100,r);u=Math.min(u,100-r);return {c:100-r-u,u,r}}
export function rollRarity(src,stream='cards'){const o=cardOdds(src,W.run.swell);const x=rnd(stream)*100;return x<o.r?'r':x<o.r+o.u?'u':'c'}
// n distinct card ids at `src` odds. Combat rewards update the Swell counter (merchant only reads it).
// Offer variety: never re-offer a card from the previous offer (when others exist); cards offered often this run get less likely.
export function pickOffer(pool,stream,src){const run=W.run,hist=(src==='shop'?run.shopHist:run.offerHist)||[];const last=new Set(hist[hist.length-1]||[]);
 const l=pool.filter(c=>!last.has(c.id));if(l.length)pool=l;const n=id=>hist.reduce((a,g)=>a+(g.includes(id)?1:0),0);
 return wpick(pool.map(c=>[c,1/(1+n(c.id))]),stream)}
const remember=(k,ids)=>{const h=W.run[k]||(W.run[k]=[]);h.push(ids.slice());if(h.length>12)h.shift()};
export function rollCards(n,src,{stream='cards',forceR=null,type=null,exclude=[]}={}){const run=W.run;const out=[];let g=0;
 while(out.length<n&&g++<400){const rar=forceR||rollRarity(src,stream);let pool=cardPool(rar).filter(c=>!type||c.t===type);
  // Small Phase 1 pools: if every card of that rarity is already shown/excluded, widen to the other rarities rather than repeat or fail.
  const fresh=l=>l.filter(c=>!out.includes(c.id)&&!exclude.includes(c.id));
  if(!fresh(pool).length)pool=Object.values(CARDS).filter(c=>c.cls===run.cls&&c.r!=='s'&&inActSet(c)&&(!type||c.t===type));
  if(!fresh(pool).length)pool=Object.values(CARDS).filter(c=>c.cls===run.cls&&c.r!=='s'&&inActSet(c));
  if(fresh(pool).length)pool=fresh(pool);
  const c=pickOffer(pool,stream,src);if(out.includes(c.id)||exclude.includes(c.id))continue;out.push(c.id);
  if(src!=='shop'&&!forceR){if(c.r==='c')run.swell=Math.min(ECON.swellMax,run.swell+1);else if(c.r==='r')run.swell=ECON.swellStart}}
 // Fresh slot (plan 7.4): from Act 2 on, every reward offer carries at least one card of the current act's own pool, so the new cards are seen.
 if(!forceR&&!type&&(run.act||1)>=2&&src!=='shop'&&out.length>=3&&!out.some(id=>CARDS[id].act===run.act)){
  const fp=Object.values(CARDS).filter(c=>c.cls===run.cls&&c.act===run.act&&inActSet(c)&&!out.includes(c.id)&&!exclude.includes(c.id));if(fp.length)out[out.length-1]=pick(fp,stream).id}
 return out}
export function rewardCardCount(){return mod('rewardCards',{},3)}
export function rollGold(kind){const g=ECON.gold[kind]||ECON.gold.fight;return rng(g[0],g[1],'cards')}
export function potionRoll(kind){const run=W.run,P=ECON.potion;const ch=run.potionChance+(kind==='elite'?P.eliteBonus:0);const hit=mod('potionDrop',{kind},rnd('potions')*100<ch); /* Act 3 hook: potionDrop (Vial Belt) */
 run.potionChance=Math.max(P.min,Math.min(P.max,run.potionChance+(hit?-P.step:P.step)));return hit?randomPotion():null}
// Items (relics, potions, cards) carry an `act` field: nothing rolls before its act (Act 2/3 build, plan 6.5). Items without a field are Act 1.
export const actOK=x=>(x.act||1)<=((W.run&&W.run.act)||1);
export function randomPotion(stream='potions'){const run=W.run;const x=rnd(stream)*100,P=ECON.potion.rarity;const rar=x<P.c?'c':x<P.c+P.u?'u':'r';
 const open=p=>(!p.cls||p.cls===run.cls)&&!p.stub&&actOK(p)&&!isLocked('potions',p.id);
 let pool=Object.values(POTIONS).filter(p=>p.rarity===rar&&open(p));if(!pool.length)pool=Object.values(POTIONS).filter(open);
 // not the same potion as one of the last 2 offered (drops, shop, events), unless nothing else is left
 const h=run.potHist||(run.potHist=[]),f=pool.filter(p=>!h.slice(-2).includes(p.id));const id=pick(f.length?f:pool,stream).id;h.push(id);if(h.length>8)h.shift();return id}
// Called by combat.win(). Builds the claimable reward rows.
export function combatRewards(kind,{allFled,opts={},cb}={}){const run=W.run;const rows=[];
 if(kind==='elite'){const k=cb&&cb.ens.find(e=>e.elite);const idx={captain:0,warden:1,eel:2}[k&&k.key];if(idx!=null)run.stats.elites[idx]++}
 if(kind==='boss')run.stats.bosses++;
 let g=rollGold(kind);if(allFled)g=Math.floor(g/2);g=Math.round(mod('gold',{combat:true,kind},g));if(g>0)rows.push({k:'gold',n:g});
 if(kind==='elite'){const id=randomRelic(ECON.relicOdds);rows.push(id?{k:'relic',id}:{k:'gold',n:50,note:'(no relics left)'});const aid=rnd('artifacts')<ECON.eliteArtifactChance?eliteArtifact(cb&&cb.ens&&(cb.ens.find(e=>e.elite)||{}).key):null;if(aid)rows.push({k:'artifact',id:aid})}
 const pot=potionRoll(kind);if(pot)rows.push({k:'potion',id:pot});
 if(!allFled&&!opts.noCards){let cards;
  if(kind==='boss')cards=rollCards(rewardCardCount(),'boss',{forceR:'r'});
  else if(run.rareNext){run.rareNext=false;cards=rollCards(rewardCardCount(),kind,{forceR:'r'})}
  else cards=rollCards(rewardCardCount(),kind==='elite'?'elite':'fight');
  // Spoils (D-A2-12): beating the named boss/elite adds a FOURTH card to the offer while that Spoil is still locked on the account; taking it unlocks it for good.
  const killed=new Set(((cb&&cb.ens)||[]).map(e=>e.key));const spoil=Object.entries(SPOIL_CARDS).find(([id,from])=>CARDS[id]&&CARDS[id].cls===run.cls&&(killed.has(from)||(from==='choir'&&killed.has('cantor')))&&!loadProfile().spoils[id]&&!cards.includes(id));
  remember('offerHist',cards);rows.push({k:'cards',cards:spoil?[...cards,spoil[0]]:cards,spoil:spoil?spoil[0]:undefined})}
 const scene=cb&&cb.ens?{foes:cb.ens.map((e,i)=>({e,i})).filter(({e})=>!e.fled).map(({e,i})=>({gap:!!e.summoned||undefined,key:e.key,sv:e.sv,vi:cb.ens.slice(0,i).filter(x=>x.key===e.key).length,boss:e.boss,elite:e.elite,ph:e.ph,remT:e.remT}))}:null; // the fallen stay on screen behind the rewards
 W.S={screen:'reward',kind,rows,scene,boss:kind==='boss'?(cb&&cb.bossKey)||run.boss:null,title:kind==='boss'?'Boss defeated!':kind==='elite'?'Elite defeated!':allFled?'They fled with your gold…':'Victory!',t:Date.now()};
 // Keep the map checkpoint; the save journal reconstructs this room and its
 // claimed/unclaimed rewards when the player continues.
 render()}
function claimRowImpl(i){const S=W.S;const row=S.rows&&S.rows[i];if(!row||row.done)return;
 if(row.k==='gold'){gainGold(row.n);row.done=true}
 else if(row.k==='relic'){row.done=true;gainRelic(row.id);if(W.S!==S)return}
 else if(row.k==='potion'){if(addPotion(row.id))row.done=true;else{S.swap=i}}
 else if(row.k==='artifact'){gainArtifact(row.id,ok=>{if(ok)row.done=true})}
 else if(row.k==='cards'){S.cardsOpen=i;S.cardSelected=null;S.skipConfirm=false}
 render()}
function rewCardImpl(j){const S=W.S,row=S.rows?.[S.cardsOpen];if(S.cardsOpen==null||!row||row.done||!Number.isInteger(j)||!row.cards[j]||S.skipConfirm)return;
 S.cardSelected=S.cardSelected===j?null:j;updateCardSelection()}
function rewConfirmCardsImpl(confirm=settings.confirmCardSkip!==false){const S=W.S,row=S.rows?.[S.cardsOpen];if(S.cardsOpen==null||!row||row.done||S.skipConfirm)return;
 const j=S.cardSelected;if(j==null)return rewSkipCardsImpl(confirm);if(!row.cards[j])return;
 if(row.spoil&&row.cards[j]===row.spoil){const p=loadProfile();p.spoils[row.spoil]=1;saveProfile(p)}
 markCardsSeen(row.cards);gainCard(row.cards[j]);row.done=true;row.took=row.cards[j];S.cardsOpen=null;S.cardSelected=null;render()}
function rewCloseCardsImpl(){W.S.cardsOpen=null;W.S.cardSelected=null;W.S.skipConfirm=false;render()}
function rewSkipCardsImpl(confirm=settings.confirmCardSkip!==false){const S=W.S,row=S.rows?.[S.cardsOpen];if(S.cardsOpen==null||!row||row.done)return;
 S.cardSelected=null;if(confirm){S.skipConfirm=true;render();return}finishSkipCards()}
function finishSkipCards(){const S=W.S,row=S.rows?.[S.cardsOpen];if(S.cardsOpen==null||!row||row.done)return;
 markCardsSeen(row.cards);row.done=true;row.skipped=true;S.cardsOpen=null;S.cardSelected=null;S.skipConfirm=false;render()}
export function rewSkipAnswer(yes,dont=false){return savedAction('rewSkipAnswer',[yes,dont],()=>{if(!W.S.skipConfirm)return;
 if(yes){if(dont&&!W.replaying){settings.confirmCardSkip=false;saveSettings()}finishSkipCards()}else{W.S.skipConfirm=false;render()}})}
export function rewConfirmCards(confirm=settings.confirmCardSkip!==false){return savedAction('rewConfirmCards',[confirm],()=>rewConfirmCardsImpl(confirm))}
// full potion slots: swap the new potion for one you hold, or discard it
function potionSwapImpl(slot){const S=W.S;const row=S.rows&&S.rows[S.swap];if(!row)return;if(slot>=0){W.run.potions[slot]=row.id}row.done=true;S.swap=null;render()}
// Skip with nothing taken asks first (B061); card-skip rows count as taken (v0.6.2.1 tookNothing).
export const tookNothing=S=>!!(S&&S.rows&&S.rows.length)&&!S.rows.some(r=>r.done&&!(r.k==='cards'&&r.skipped));
export function rewLeave(){const S=W.S;if(S.screen!=='reward')return;if(tookNothing(S)&&!W.replaying){S.leaveConfirm=true;render();return}rewDone()}
export function rewLeaveBack(){const S=W.S;if(S.screen!=='reward')return;S.leaveConfirm=false;render()}
function rewDoneImpl(){const S=W.S;if(S.screen!=='reward')return;S.leaveConfirm=false; // victory-sweep: never leave twice (a stale second call from the walk-off fell through to goMap on the end screen)

 // Boss relic (P3): after the boss reward rows, offer 1 of 3 boss relics (like Slay the Spire's boss chest), then finish the act.
 if(S.kind==='boss'&&!S.bossPick&&hasNextAct()){const ids=bossRelicChoices();if(ids.length){S.bossPick=ids;S.bossTook=null;S.t=Date.now();return render()}}
 if(S.kind==='boss'){if(hasNextAct())return startNextAct();return endRun(true)}goMap()}
// Acts that exist. Only Act 1 ships live, so the boss relic pick stays hidden (Spencer 10-13) until Act 2 goes live.
// Act 2 ships behind the live flag (?act=2 preview, plan 12.3); ACT_COUNT is raised to 2 / 3 when each act is approved.
let ACT_COUNT=(typeof location!=='undefined'&&+new URLSearchParams(location.search).get('act'))||1;
export const actCount=()=>ACT_COUNT;
export function setActCount(n){ACT_COUNT=n} // tests / future acts only
export const hasNextAct=()=>!!W.run&&(W.run.act||1)<ACT_COUNT;
export const isLastAct=()=>!hasNextAct();
// Next act (plan 5/7): full heal (StS lesson 14), a fresh map, that act's boss, the shrine/seen tallies reset, then the travel plate and the map. Autosaves on entry.
export function startNextAct(){const run=W.run;const from=run.act||1,to=from+1;
 run.act=to;run.boss=(run.bosses&&run.bosses[to])||run.boss;run.hp=run.max;run.floor=0;run.pos={r:-1,i:-1};run.vis={};run.shrinesThisAct={};run.wrenTally=0;run.fights=0;run.encHist=[];run.cut=0;
 run.map=genMap(to);run.stats.bossesByAct=(run.stats.bossesByAct||[]);W.cb=null;
 try{warmActPack(to)}catch(_){} fire('actStart',{act:to});W.S={screen:'travel',kind:'act',from,to,t:Date.now()};saveRun();render()}
// Boss relics the hero can use (class-locked ones only for their class), not already held; 3 at random from the relics stream.
export function bossRelicChoices(n=3){const run=W.run;const c=Object.values(RELICS).filter(r=>r.tier==='b'&&!r.stub&&actOK(r)&&(!r.cls||r.cls===run.cls)&&!isLocked('relics',r.id)&&!run.relics.some(x=>x.id===r.id));
 const out=[];const pool=c.slice();while(out.length<n&&pool.length){const r=pick(pool,'relics');pool.splice(pool.indexOf(r),1);out.push(r.id);run.seenRelics[r.id]=1}return out}
function bossRelicPickImpl(j){const S=W.S;if(S.screen!=='reward'||!S.bossPick||S.bossTook)return;
 if(j<0){S.bossTook='skip';return rewDoneImpl()}const id=S.bossPick[j];if(!id)return;S.bossTook=id;gainRelic(id);if(W.S!==S)return;rewDoneImpl()}
export function bossRelicPick(...args){return savedAction('bossRelicPick',args,()=>bossRelicPickImpl(...args))}
// ================= relics =================
export const campfireRelic=id=>!!(RELICS[id]&&RELICS[id].campfire);
export function relicCandidates(tier){const run=W.run;const nCamp=run.relics.filter(r=>campfireRelic(r.id)).length;
 return Object.values(RELICS).filter(r=>r.tier===tier&&r.phase==='P1'&&!r.stub&&actOK(r)&&!ECON.relicPulled.includes(r.id)&&(!r.cls||r.cls===run.cls)&&!isLocked('relics',r.id)&&!run.seenRelics[r.id]&&!run.relics.some(x=>x.id===r.id)&&!(r.campfire&&nCamp>=2))}
// Relic rarity roll (C/U/R); an empty tier rolls the next tier up, then down (r→u→c); all empty → null (caller gives 50 gold).
// Apply ECON.heroHp to the class table (hero select and new runs read CLASSES[cls].hp).
export function applyHeroHp(){for(const k in ECON.heroHp)if(CLASSES[k])CLASSES[k].hp=ECON.heroHp[k]}
export function randomRelic(odds=ECON.relicOdds,stream='relics',{tier=null,noCampfire=false}={}){
 let t=tier;if(!t){const x=rnd(stream)*100;t=x<odds.c?'c':x<odds.c+odds.u?'u':'r'}
 const order=t==='shop'?['shop']:[...TIERS.slice(TIERS.indexOf(t)),...TIERS.slice(0,TIERS.indexOf(t)).reverse()];
 for(const k of order){const c=relicCandidates(k).filter(r=>!noCampfire||!r.campfire);if(c.length){const r=pick(c,stream);W.run.seenRelics[r.id]=1;return r.id}}
 return null}
export function hasRelicR(id){return W.run.relics.some(r=>r.id===id)}
// gainRelic: adds the instance, runs pickup(), fires 'relicGained'. G.giveRelic(id) is the debug console command.
export function gainRelic(id,o={}){const run=W.run,def=RELICS[id];if(!def)throw new Error('Unknown relic '+id);if(run.relics.some(r=>r.id===id))return null;
 const r={id,n:0,used:false};run.relics.push(r);run.seenRelics[id]=1;r.flashT=Date.now();
 if(def.pickup)def.pickup(r);fire('relicGained',{relic:r});
 // Campfire relics: at most 2 per run (others leave the pools automatically via relicCandidates)
 if(!o.silent)toast(`${def.e} ${def.n}`,'relic');return r}
export const giveRelic=id=>gainRelic(id);
export function loseRelic(id){const i=W.run.relics.findIndex(r=>r.id===id);if(i>=0)W.run.relics.splice(i,1)}
// ================= potions =================
export function addPotion(id){const i=W.run.potions.indexOf(null);if(i<0)return false;W.run.potions[i]=id;noteSeen('potion',id);toast(`${POTIONS[id].e} ${POTIONS[id].n}`,'potion');return true}
export function addPotionSlot(){W.run.potions.push(null)}
function discardPotionImpl(slot){W.run.potions[slot]=null;W.S.potion=null;render()}
// Apothecary Chest: choose up to 3 of 5 random potions (as many as fit).
export function pickPotions(n,title){const ids=[];let g=0;while(ids.length<n&&g++<50){const p=randomPotion('relics');if(!ids.includes(p))ids.push(p)}
 const back=W.S;W.S={screen:'potpick',title,ids,chosen:[],back};render()}
function potPickToggleImpl(j){const S=W.S;const k=S.chosen.indexOf(j);if(k>=0)S.chosen.splice(k,1);else{const free=W.run.potions.filter(p=>!p).length;if(S.chosen.length<Math.min(3,free))S.chosen.push(j)}render()}
function potPickDoneImpl(){const S=W.S;S.chosen.forEach(j=>addPotion(S.ids[j]));W.S=S.back&&S.back.screen!=='potpick'?S.back:{screen:'map'};render()}
// ================= cards / curses / gold / HP =================
export function gainCard(id,o={}){const d=CARDS[id];if(!d)return null;if(d.curse)return gainCurse(id);const ci=mk(id,o.up);W.run.deck.push(ci);fire('gainCard',{card:ci});return ci}
export function gainCurse(id){const ctx=fire('gainCurse',{id});if(ctx.cancel){if(ctx.msg)toast(ctx.msg,'relic');return null}const ci=mk(id);W.run.deck.push(ci);toast(`${CARDS[id].e} Curse: ${CARDS[id].n}`,'curse');return ci}
// ================= Artifacts (Act 1): shared rare cards, FULL-CARD-POOL.md Part 5 =================
// Sources: 5 events, 6 in Wren's stock (one per visit, on the colourless shelf), 5 from elites. Never in card rewards (cls 'artifact' is no
// hero pool). One copy of each per run (run.artGot), at most 3 held at once: a 4th asks which one to leave behind.
export const ART_MAX=3;
export const ART_SRC={event:['ledgerleaf','sealingwax','driftnet','ferrycoin','ampoule'],shop:['salvagehook','barnacledplate','watchwhistle','smokedglass','midden','manyfaced'],
 elite:{any:['tallystick','needle'],captain:['tollingcup'],warden:['bastionbar'],eel:['lifebuoy']}};
export const isArtifact=id=>!!CARDS[id]&&CARDS[id].cls==='artifact';
export const heldArtifacts=()=>W.run.deck.filter(c=>isArtifact(c.id));
export const artifactFree=id=>!(W.run.artGot&&W.run.artGot[id]);
export function randomArtifact(ids,stream='artifacts'){const l=ids.filter(artifactFree);return l.length?pick(l,stream):null}
export const eliteArtifact=key=>randomArtifact([...(ART_SRC.elite[key]||[]),...ART_SRC.elite.any]);
// Take an Artifact into the deck. Full (3 held): a pick screen asks which to leave behind, Cancel/Skip declines. done(gained) runs after.
export function gainArtifact(id,done){const run=W.run;
 const add=()=>{(run.artGot||(run.artGot={}))[id]=1;const ci=gainCard(id);toast(`${CARDS[id].e} Artifact: ${CARDS[id].n}`,'relic');return ci};
 if(heldArtifacts().length<ART_MAX){add();if(done)done(true);return true}
 const back=W.S,fin=ok=>{W.S=back;if(done)done(ok);render()};
 openPick('custom',`Carrying ${ART_MAX}: leave one behind for ${CARDS[id].n}?`,ci=>{if(!ci)return fin(false);const i=run.deck.indexOf(ci);if(i>=0)run.deck.splice(i,1);add();fin(true)},()=>fin(false),c=>isArtifact(c.id));
 return false}
export function gainGold(n){n=Math.max(0,Math.round(n));W.run.gold+=n;W.run.stats.goldEarned+=n;if(n>0)fire('goldGained',{amount:n});return n}
export function spendGold(n){if(W.run.gold<n)return false;W.run.gold-=n;return true}
export function gainMaxHp(n){W.run.max+=n;W.run.hp+=n}
export function loseMaxHp(n){W.run.max=Math.max(1,W.run.max-n);W.run.hp=Math.min(W.run.hp,W.run.max)}
export function heal(n){W.run.hp=Math.min(W.run.max,W.run.hp+Math.max(0,Math.floor(n)))}
export function hurt(n){W.run.hp=Math.max(1,W.run.hp-n)} // event HP costs never kill (events require HP > cost)
export function poolOf(r){return Object.values(CARDS).filter(c=>c.cls===W.run.cls&&c.r!=='s'&&!c.cut&&!c.stub&&!isLocked('cards',c.id)&&(!r||c.r===r))}
export function randomCard(r,stream='events'){return pick(poolOf(r),stream).id}
export function msg(title,text,next){W.S={screen:'msg',title,text,next:next||goMap};render()}
// Small non-blocking toast (relic/potion/curse gained). Visual only.
export function toast(txt,cls){W.toasts=(W.toasts||[]).filter(t=>Date.now()-t.t<2600);W.toasts.push({txt,cls:cls||'',t:Date.now()})}
// ================= deck picks: upgrade / remove / transform / duplicate / annotate / custom =================
export function pickable(mode,filter){return W.run.deck.filter(c=>{const d=CARDS[c.id];if(mode==='upgrade'&&(!canTemper(c)||d.curse||d.cls==='status'))return false;
 if((mode==='remove'||mode==='transform'||mode==='offer')&&d.noRemove)return false;if(mode==='annotate'&&(c.open||d.open))return false;return !filter||filter(c)})}
export function openPick(mode,title,then,cancel,filter,onPick){const list=pickable(mode,filter);if(!list.length){then?then(null):goMap();return}
 W.S={screen:'pick',mode,title,then:then||goMap,cancel,filter,onPick};render()}
function applyPickCard(uid){const S=W.S;if(S.screen!=='pick')return;const i=W.run.deck.findIndex(c=>c.uid===uid);if(i<0)return;const ci=W.run.deck[i];
 if(!pickable(S.mode,S.filter).includes(ci))return;
 if(S.mode==='upgrade')upgradeCard(ci);
 else if(S.mode==='remove'){W.run.deck.splice(i,1)}
 else if(S.mode==='transform'){const n=pick(poolOf().filter(c=>c.id!==ci.id),'events');W.run.deck[i]=mk(n.id);toast('🔀 '+CARDS[ci.id].n+' → '+n.n,'')}
 else if(S.mode==='duplicate'){W.run.deck.push(mk(ci.id,rawLvl(ci)));toast('🪞 Duplicated '+cname(ci),'')}
 else if(S.mode==='annotate'){ci.open=true;toast('📘 '+cname(ci)+' gains Opening','')}
 if(S.onPick)S.onPick(ci);S.then(ci)}
function pickCardImpl(uid){return applyPickCard(uid)}
export function selectPickCard(uid){return savedAction('selectPickCard',[uid],()=>{const S=W.S;if(S.screen!=='pick'||S.skipConfirm||!pickable(S.mode,S.filter).some(c=>c.uid===uid))return;S.pickSelected=S.pickSelected===uid?null:uid;updateCardSelection()})}
export function pickConfirm(){return savedAction('pickConfirm',[],()=>{const S=W.S;if(S.screen!=='pick'||S.skipConfirm)return;if(S.pickSelected!=null)return applyPickCard(S.pickSelected);if(settings.confirmCardSkip!==false){S.skipConfirm=true;render()}else pickCancelImpl()})}
export function pickSkipAnswer(yes,dont=false){return savedAction('pickSkipAnswer',[yes,dont],()=>{if(W.S.screen!=='pick'||!W.S.skipConfirm)return;if(yes){if(dont&&!W.replaying){settings.confirmCardSkip=false;saveSettings()}pickCancelImpl()}else{W.S.skipConfirm=false;render()}})}
function pickCancelImpl(){const S=W.S;if(S.cancel)S.cancel();else S.then(null)}
// ================= chests (§1.5) =================
function openChestImpl(){const run=W.run;const c=wpick(ECON.chest.map(x=>[x,x.w]),'relics');const rows=[];
 const id=randomRelic(c.rel);rows.push(id?{k:'relic',id}:{k:'gold',n:50,note:'(no relics left)'});
 if(rnd('relics')*100<c.gold[0])rows.push({k:'gold',n:rng(c.gold[1],c.gold[2],'relics')});
 W.S={screen:'chest',chest:c.k,name:(c.k==='small'&&(run.act||1)>1)?'Weathered Chest':c.n,rows,opened:false,t:Date.now()};render()}
function openChestLidImpl(){if(W.S.screen!=='chest')return;W.S.opened=true;W.S.openT=Date.now();render()}
// ================= camps (§1.8) =================
const mendHp=()=>Math.floor(W.run.max*mod('mendFrac',{},ECON.mend));
export function campOptions(){const mh=mendHp();const o=[{k:'mend',l:'❤️ Mend',d:(W.run.hp>=W.run.max?'Already at full HP, nothing to heal':(()=>{const g=Math.min(mh,W.run.max-W.run.hp);return `Heal ${g} HP`+(g<mh?` (${mh-g} wasted)`:` (${Math.round(mh/W.run.max*100)}% of Max HP)`)})())},{k:'temper',l:'⬆️ Temper',d:'Upgrade a card'}];
 for(const r of W.run.relics){const d=RELICS[r.id];if(d&&d.camp)o.push({k:d.camp,l:{cook:'Cook',scour:'🪨 Scour',trawl:'Trawl',annotate:'📘 Annotate'}[d.camp],d:{cook:'Gain 4 Max HP (Galley Pot)',scour:'Remove a card (Pumice Stone)',trawl:'Gain a random Common or Uncommon relic (Grapnel Hook)',annotate:'Give a card Opening (Ship\'s Rutter)'}[d.camp],relic:r.id})}
 // Act 3 (ACT3-DESIGN s7): Ground the Deck removes a Static, Dread or other curse / status card. The Stormeye (floor 8) lets you pick TWO different options.
 if((W.run.act||1)===3&&pickable('remove',isJunkCard).length)o.push({k:'ground',l:'⚡ Ground the Deck',d:'Remove a Static, a curse or a status card from your deck'});
 const used=W.run.eyeUsed||[];return mod('campOptions',{},o.filter(x=>!used.includes(x.k)))}
const isJunkCard=c=>{const d=CARDS[c.id];return !!d&&(d.cls==='status'||d.cls==='curse'||!!d.curse)};
function campDoImpl(k){if(W.S.screen!=='rest')return;
 const eye=W.run.eyeLeft>0;if(eye)(W.run.eyeUsed=W.run.eyeUsed||[]).push(k);
 // backing out of a card pick returns to the camp with the option still unspent (the Stormeye counts only finished actions)
 const back=()=>{if(eye){const u=W.run.eyeUsed||[],i=u.lastIndexOf(k);if(i>=0)u.splice(i,1)}W.S={screen:'rest'};render()};
 if(k==='ground')return openPick('remove','Ground the Deck: choose a Static, curse or status card to remove',goMap,back,isJunkCard);
 if(k==='mend'){heal(mendHp());return goMap()}
 if(k==='temper')return openPick('upgrade','Temper: choose a card to upgrade',goMap,back);
 if(k==='cook'){gainMaxHp(4);return msg('Cook','A hearty stew. +4 Max HP.')}
 if(k==='scour')return openPick('remove','Scour: choose a card to remove',goMap,back);
 if(k==='trawl'){const id=randomRelic({c:60,u:40,r:0},'relics',{noCampfire:true});if(id){gainRelic(id);return msg('Trawl','Your hook brings up <b>'+RELICS[id].e+' '+RELICS[id].n+'</b>.')}gainGold(50);return msg('Trawl','Only gold this time. +50 gold.')}
 if(k==='annotate')return openPick('annotate','Annotate: give a card Opening (it starts in your opening hand)',goMap,back)}
export const restHeal=()=>campDo('mend');
// ================= merchant (§1.4) =================
// Later acts charge more (D-A2-17): Act 2 +25%, Act 3 +50%; Wren's Cairn adds 10% per bundle taken this act. Act 1 is untouched.
export const actPriceMult=()=>{const r=W.run;if(!r)return 1;return ([1,1,1.25,1.5][r.act||1]||1)*(1+.1*(r.wrenTally||0))};
export const price=(v,kind)=>Math.max(0,Math.round(mod('price',{kind},v)*(kind==='shop'?actPriceMult():1)));
export function scrubPrice(){return Math.max(0,Math.round(mod('scrubPrice',{},ECON.shop.removal.base+ECON.shop.removal.step*W.run.removals)))}
// Colourless extras come from the colourless pool when it has Act-set cards of that rarity, else from the class pool (rollCards).
function shopExtra(r,used){const run=W.run;const pool=Object.values(CARDS).filter(c=>c.cls==='colorless'&&c.r===r&&inActSet(c)&&!used.includes(c.id));
 return pool.length?pick(pool,'shop').id:rollCards(1,'shop',{stream:'shop',forceR:r,exclude:used})[0]}
function openShopImpl(){const run=W.run,P=ECON.price,C=ECON.shop;
 if(run.deck.some(c=>c.id==='doubloon')){const n=run.deck.filter(c=>c.id==='doubloon').length;for(let k=0;k<n;k++){const l=Math.min(15,run.gold);run.gold-=l;toast('🪙 Cursed Doubloon: −'+l+' gold','curse')}}
 const S={screen:'shop',cards:[],colorless:[],relics:[],potions:[],scrubbed:false,scrubUses:0,t:Date.now()};const used=[];
 for(const slot of C.cards){const t=(slot.alt&&slot.alt[run.cls])||slot.type;const id=rollCards(1,'shop',{stream:'shop',type:t,exclude:used})[0];used.push(id);const r=CARDS[id].r;S.cards.push({id,base:rng(...P.card[r==='s'?'c':r],'shop')})}
 for(let k=0;k<C.sale.count&&S.cards.length;k++){let i=R(S.cards.length,'shop');for(let g=0;g<20&&S.cards[i].sale;g++)i=R(S.cards.length,'shop');S.cards[i].sale=true}
 for(const slot of C.extra){const id=(slot.artifact&&randomArtifact(ART_SRC.shop,'shop'))||shopExtra(slot.r,used);used.push(id);S.colorless.push({id,base:rng(...P.colorless[slot.r],'shop'),stand:true})}
 for(const slot of C.relics){let id=slot.tier?randomRelic(null,'shop',{tier:slot.tier}):randomRelic(ECON[slot.odds],'shop');if(!id&&slot.fallback)id=randomRelic(ECON[slot.fallback],'shop');
  if(id)S.relics.push({id,base:rng(...P.relic[RELICS[id].tier],'shop'),...(slot.tier?{right:true}:{})})}
 for(let k=0;k<C.potions;k++){let id=randomPotion('shop');for(let g=0;g<20&&S.potions.some(p=>p.id===id);g++)id=randomPotion('shop');S.potions.push({id,base:rng(...P.potion[POTIONS[id].rarity],'shop')})}
 remember('shopHist',[...S.cards,...S.colorless].map(x=>x.id));
 for(const it of [...S.cards,...S.colorless,...S.relics,...S.potions])it.price=price(it.sale?it.base*C.sale.mult:it.base,'shop');
 W.S=S;render()}
export function shopItems(){const S=W.S;return {cards:S.cards,colorless:S.colorless,relics:S.relics,potions:S.potions}}
export function selectShopCard(shelf,i){return savedAction('selectShopCard',[shelf,i],()=>{const S=W.S;if(S.screen!=='shop'||!['cards','colorless','relics','potions'].includes(shelf)||!S[shelf]?.[i]||S[shelf][i].sold)return;const key=shelf+':'+i;S.shopSelected=S.shopSelected===key?null:key;updateCardSelection()})}
export function confirmShopCard(){return savedAction('confirmShopCard',[],()=>{const S=W.S;if(S.screen!=='shop'||!S.shopSelected)return;const [shelf,i]=S.shopSelected.split(':');buyImpl(shelf,+i)})}
function buyImpl(shelf,i){const S=W.S;if(S.screen!=='shop')return;const it=S[shelf]&&S[shelf][i];if(!it||it.sold)return;if(W.run.gold<it.price){it.noT=Date.now();return render()}
 if(shelf==='potions'&&!W.run.potions.includes(null)){it.noT=Date.now();toast('Potion slots full','');return render()}
 W.run.gold-=it.price;it.sold=true;if(S.shopSelected===shelf+':'+i)S.shopSelected=null;
 if(isArtifact(it.id)){const paid=it.price;it.sold=true;gainArtifact(it.id,ok=>{if(!ok){W.run.gold+=paid;it.sold=false}});return render()}
 if(shelf==='cards'||shelf==='colorless')gainCard(it.id);else if(shelf==='relics'){gainRelic(it.id);if(W.S!==S)return}else if(shelf==='potions')addPotion(it.id);
 render()}
function shopRemoveImpl(){const S=W.S;if(S.screen!=='shop'||S.scrubbed||(S.scrubUses||0)>=ECON.shop.removal.perVisit||!pickable('remove').length)return;const p=scrubPrice();if(W.run.gold<p)return;
 openPick('remove',`Scrub: remove a card (${p} gold)`,()=>{W.run.gold-=p;W.run.removals++;fire('cardRemoved',{shop:true}); /* Act 3 hook: onCardRemoved */S.scrubUses=(S.scrubUses||0)+1;S.scrubbed=S.scrubUses>=ECON.shop.removal.perVisit;W.S=S;render()},()=>{W.S=S;render()})}
// ================= flow =================
function goMapImpl(){W.cb=null;if(W.run&&W.run.hp<=0)return endRun(false);
 if(W.run&&W.run.eyeLeft>0){W.run.eyeLeft--;if(campOptions().length){W.S={screen:'rest'};render();return}} // the Stormeye: a second camp action
W.S={screen:'map'};fire('mapEnter',{});saveRun();render()}
// Act 2 preview (Spencer 10-16): beating Act 1 on the normal build offers 'Continue to Act 2'. Act 2 is built but not fully polished, so the button is labelled a preview.
// The run is snapshotted before clearRun so the same hero, deck, relics and gold carry over. Act 1 is settled (Lamplight credited) exactly as before.
export const ACT2_PREVIEW=true;
// Act 3 preview (Spencer 10-16): beating Act 2 offers 'Continue to Act 3' the same way, so Acts 1-3 play as one run. Act 3 win ends the run normally. Set false to hide.
export const ACT3_PREVIEW=true;
let nextActSnap=null;
const previewOn=a=>a===1?ACT2_PREVIEW:a===2?ACT3_PREVIEW:false;
const canContinueTo=to=>!!(previewOn(to-1)&&nextActSnap&&nextActSnap.to===to&&W.S&&W.S.screen==='end'&&W.run&&W.run.won&&(W.run.act||1)===to-1);
export const canContinueToAct2=()=>canContinueTo(2);
export const canContinueToAct3=()=>canContinueTo(3);
function continueToAct(to){if(!canContinueTo(to))return;const snap=nextActSnap;nextActSnap=null;clearWin();
 W.run=JSON.parse(JSON.stringify(snap.run));W.uid=snap.uid;W.run.won=false;delete W.run.stats.endT;W.cb=null;
 // Lamplight was credited once at the first win (Act 1); the carried run must never credit again.
 if(W.run.lamp){W.run.lamp.settled=true;delete W.run.lamp.summary}
 if(W.run.act==null)W.run.act=1;startNextAct()}
export const continueToAct2=()=>continueToAct(2);
export const continueToAct3=()=>continueToAct(3);
// Reopen after killing the page on an Act 1 / Act 2 win screen: put the win screen (with its Continue button) back. A live run save always wins.
export function restoreWinScreen(){const d=loadWin();if(!d)return false;if(loadRunData()){clearWin();return false}
 try{migrateRun(d.run);W.run=JSON.parse(JSON.stringify(d.run));W.uid=d.uid||W.uid;W.cb=null;nextActSnap={run:JSON.parse(JSON.stringify(d.run)),uid:W.uid,to:d.to};
  W.S={screen:'end'};if(!canContinueTo(d.to))throw Error('bad win state');render();return true}catch(e){nextActSnap=null;W.run=null;clearWin();console.warn('Could not restore the win screen:',e);return false}}
// Leaving the win screen without continuing (Play again) drops the saved win state.
export function leaveWinScreen(){nextActSnap=null;clearWin();W.S={screen:'title'};render()}
export function endRun(won){const run=W.run;run.won=!!won;run.stats.endT=Date.now();W.cb=null;const a=run.act||1;
 nextActSnap=won&&previewOn(a)&&!hasNextAct()?{run:JSON.parse(JSON.stringify(run)),uid:W.uid,to:a+1}:null;
 clearRun();clearWin();settleRun(run,won);try{addHistory({t:Date.now(),cls:run.cls,won:!!won,act:a,floor:overallFloor(a,run.floor),mins:Math.round(((run.stats.endT||Date.now())-run.stats.startT)/60000),kills:run.kills,by:(run.stats.lastHit&&!won)?run.stats.lastHit.by:null,asc:run.asc|0,daily:!!run.daily})}catch(_){}
 if(nextActSnap&&run.lamp){nextActSnap.run.lamp=JSON.parse(JSON.stringify(run.lamp))} // carries settled:true
 if(nextActSnap)saveWin(nextActSnap); // survives a killed page: reopening lands on this win screen
 W.S={screen:'end'};render()}
// Event fights (Sunken Chest crab, Gull Nest gulls): normal fight rules + options.
export function eventFight(enc,opts={}){return startCombat('fight',enc,opts)}
export {cHeal};

export function goNode(...args){return savedAction('goNode',args,()=>goNodeImpl(...args))}

export function evOpt(...args){return savedAction('evOpt',args,()=>evOptImpl(...args))}

export function claimRow(...args){return savedAction('claimRow',args,()=>claimRowImpl(...args))}

export function rewCard(...args){return savedAction('rewCard',args,()=>rewCardImpl(...args))}

export function rewCloseCards(...args){return savedAction('rewCloseCards',args,()=>rewCloseCardsImpl(...args))}

export function rewSkipCards(confirm=settings.confirmCardSkip!==false){return savedAction('rewSkipCards',[confirm],()=>rewSkipCardsImpl(confirm))}

export function potionSwap(...args){return savedAction('potionSwap',args,()=>potionSwapImpl(...args))}

export function rewDone(...args){return savedAction('rewDone',args,()=>rewDoneImpl(...args))}
export function rewLeaveAnswer(yes){return savedAction('rewLeaveAnswer',[yes],()=>{if(!W.S.leaveConfirm)return;if(yes)rewDone();else rewLeaveBack()})}

export function discardPotion(...args){return savedAction('discardPotion',args,()=>discardPotionImpl(...args))}

export function potPickToggle(...args){return savedAction('potPickToggle',args,()=>potPickToggleImpl(...args))}

export function potPickDone(...args){return savedAction('potPickDone',args,()=>potPickDoneImpl(...args))}

export function pickCard(...args){return savedAction('pickCard',args,()=>pickCardImpl(...args))}

export function pickCancel(...args){return savedAction('pickCancel',args,()=>pickCancelImpl(...args))}

export function openChestLid(...args){return savedAction('openChestLid',args,()=>openChestLidImpl(...args))}

export function campDo(...args){return savedAction('campDo',args,()=>campDoImpl(...args))}

export function buy(...args){return savedAction('buy',args,()=>buyImpl(...args))}

export function shopRemove(...args){return savedAction('shopRemove',args,()=>shopRemoveImpl(...args))}

export function goMap(...args){return savedAction('goMap',args,()=>goMapImpl(...args))}

export function continueMessage(){return savedAction('continueMessage',[],()=>{if(W.S.screen==='msg')W.S.next()})}

export function enterNode(...args){return savedAction('enterNode',args,()=>enterNodeImpl(...args))}

export function openShop(...args){return savedAction('openShop',args,()=>openShopImpl(...args))}

export function openChest(...args){return savedAction('openChest',args,()=>openChestImpl(...args))}
queueMicrotask(applyHeroHp); // R1b: hero select shows the ECON.heroHp values before the first run
