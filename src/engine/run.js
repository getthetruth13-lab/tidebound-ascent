import {savedAction,settings,saveSettings} from '../save.js';
// engine/run.js — the run: seeded state, map, rooms (? / chests / merchant / camps / events), rewards, economy.
// Numbers: design-v2 §1.1–§1.8. Every random roll uses a named seeded stream (core/state.js), so the same seed and the
// same choices give the same maps, rewards and enemy rolls (§1.10).
import {ACT1_SET} from '../data/act1.js';
import {CARDS,CLASSES,ENCOUNTERS,EVENTS,RELICS,POTIONS,CHARMS,EN} from '../core/registry.js';
import {R,W,pick,rng,shuffle,wpick,rnd,seedStreams} from '../core/state.js';
import {mk,cname} from './cards.js';
import {startCombat,heal as cHeal} from './combat.js';
import {fire,mod} from '../core/bus.js';
import {saveRun,clearRun} from '../save.js';
import {initRun as lampInit,noteSeen,settleRun} from './lamplight.js';
import {loadProfile,lockedFor} from '../progress.js';
import {eventText} from '../data/lore.js';
import {render,markCardsSeen} from '../ui/render.js';
// ================= economy tables (design-v2 §1.1, §1.4, §1.5) =================
export const ECON={startGold:99,potionSlots:3,
 gold:{fight:[10,20],elite:[25,35],boss:[90,110]},
 cardOdds:{fight:{c:60,u:35,r:5},elite:{c:45,u:42,r:13},boss:{c:0,u:0,r:100},shop:{c:50,u:38,r:12}},
 swellStart:-4,swellMax:30,
 relicOdds:{c:50,u:35,r:15},
 potion:{start:40,step:10,min:10,max:90,eliteBonus:10,rarity:{c:60,u:30,r:10}},
 price:{card:{c:[45,55],u:[70,80],r:[140,160]},colorless:{u:[85,95],r:[170,190]},relic:{c:[140,160],u:[230,260],r:[280,310],shop:[150,170]},potion:{c:[45,55],u:[70,80],r:[95,105]},scrub:75,scrubStep:25},
 q:{fight:[12,12],shop:[4,4],treasure:[3,3]},
 chest:[{k:'small',n:'Driftwood Chest',w:50,rel:{c:70,u:30,r:0},gold:[50,20,30]},{k:'medium',n:'Iron-banded Chest',w:33,rel:{c:35,u:50,r:15},gold:[40,40,55]},{k:'large',n:'Gilded Chest',w:17,rel:{c:0,u:70,r:30},gold:[50,65,80]}],
 map:{rows:15,weights:{fight:45,unknown:22,rest:12,elite:10,shop:7}},
 mend:.3};
const TIERS=['c','u','r'];
// ================= run setup =================
export function newRun(cls,o={}){const K=CLASSES[cls];
 const urlSeed=o.seed==null&&typeof location!=='undefined'?+new URLSearchParams(location.search).get('seed'):0; // ?seed=N replays a run's maps and rolls
 const seed=(o.seed!=null?o.seed:urlSeed?urlSeed:(Date.now()^Math.floor(Math.random()*4294967296)))>>>0;
 W.run={v:2,seed,rngs:seedStreams(seed),cls,hp:K.hp,max:K.hp,gold:ECON.startGold,deck:K.starter.map(id=>mk(id)),floor:0,act:1,pos:{r:-1,i:-1},vis:{},won:false,kills:0,
  relics:[],potions:Array(ECON.potionSlots).fill(null),potionChance:ECON.potion.start,swell:ECON.swellStart,qOdds:{fight:ECON.q.fight[0],shop:ECON.q.shop[0],treasure:ECON.q.treasure[0]},
  removals:0,seenRelics:{},seenEvents:{},shrinesThisAct:{},charms:[],encHist:[],fights:0,rareNext:false,
  stats:{floors:0,kills:0,elites:[0,0,0],bosses:0,goldEarned:0,maxHit:0,maxCardsTurn:0,cardsPlayed:0,path:[],potionsUsed:0,relicsAtBoss:null,potionsAtBoss:null,startT:Date.now()}};
 // Lamplight (design/progression-proposal.md): the run keeps a snapshot of what is still locked, so rolls and saved runs stay stable. Daily / full-pool runs and old saves have no lock.
 W.run.lock=o.fullPool||o.daily?null:lockedFor(loadProfile());if(o.daily)W.run.daily=true;lampInit(W.run);
 W.run.boss=wpick(ENCOUNTERS.boss.map(x=>[x.e[0],x.w]),'map');
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
export function genMap(){let m,best=null;for(let t=0;t<400;t++){m=tryMap();fixPathRules(m);if(!hasShop(m))continue;const r=eliteRange(m);if(!(r[0]<=1&&r[1]>=3))continue;best=best||m;if(varietyOK(m))return m}return best||m}
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
export function reachable(){const run=W.run;if(run.pos.r<0)return run.map[0].map((_,i)=>i);const row=run.map[run.pos.r];return row?row[run.pos.i].to:[]}
// Tidewalker Boots: 3 times per run, move to ANY node on the next floor.
export function bootsLeft(){const b=W.run.relics.find(r=>r.id==='boots');return b?b.n||0:0}
function goNodeImpl(r,i){const run=W.run;if(W.S.screen!=='map'||W.S.ov)return;if(r!==run.pos.r+1||!run.map[r]||!run.map[r][i])return;
 if(!reachable().includes(i)){if((run.cut||0)>0)run.cut--;else{if(bootsLeft()<=0)return;const b=run.relics.find(x=>x.id==='boots');b.n--;b.flashT=Date.now()}}
 const n=run.map[r][i];run.pos={r,i};run.vis[r+':'+i]=1;run.floor=r+1;run.stats.floors=run.floor;run.stats.path.push(n.t);
 if(n.t==='boss'){run.stats.relicsAtBoss=run.relics.length;run.stats.potionsAtBoss=run.potions.filter(Boolean).length}
 enterNode(n.t)}
function enterNodeImpl(t){const run=W.run;fire('enterRoom',{type:t});
 if(t==='unknown')return resolveUnknown();
 if(t==='fight')return fight();
 if(t==='elite'){const e=pickEncounter('elite');return startCombat('elite',e)}
 if(t==='boss')return startCombat('boss',[run.boss]);
 if(t==='rest'){W.S={screen:'rest'};return render()}
 if(t==='shop')return openShop();
 if(t==='treasure')return openChest();
 goMap()}
function encKey(e){return e.join('+')}
// Encounter pools (§1.7): first 3 fights each act are easy; no repeat of the same encounter within 2 fights.
export function pickEncounter(pool){const run=W.run;const list=ENCOUNTERS[pool];const recent=run.encHist.slice(-2),last=(run.encHist[run.encHist.length-1]||'').split('+');
 const seen=run.encSeen||(run.encSeen={});const sk=x=>pool+':'+encKey(x.e);
 let cand=list.filter(x=>!recent.includes(encKey(x.e))&&(!x.fl||(run.floor>=x.fl[0]&&run.floor<=x.fl[1])));if(!cand.length)cand=list;
 // no encounter repeats in a run until the whole pool has been used; then the pool starts over
 const fresh=cand.filter(x=>!seen[sk(x)]);if(fresh.length)cand=fresh;else list.forEach(x=>delete seen[sk(x)]);
 // back-to-back fights prefer a different enemy line-up (shared enemy types are less likely)
 const e=wpick(cand.map(x=>[x.e,x.w*(x.e.some(k=>last.includes(k))?.4:1)]),'events');seen[pool+':'+encKey(e)]=1;run.encHist.push(encKey(e));return e.slice()}
export function fight(opts={}){const run=W.run;const pool=run.fights<3?'easy':'hard';run.fights++;return startCombat('fight',pickEncounter(pool),opts)}
// ? rooms (§1.5): roll Fight → Treasure → Merchant with adaptive odds; the hit resets, the others grow; else an Event.
// A ? room's outcome roll. Cartographer cards / relics roll it early (revealRows) and the map shows it; entering the room then uses that result.
function rollUnknown(){const q=W.run.qOdds,x=rnd('events')*100;return x<q.fight?'fight':x<q.fight+q.treasure?'treasure':x<q.fight+q.treasure+q.shop?'shop':'event'}
export function revealRows(n){const run=W.run;if(!run||!run.map)return 0;let k=0;
 for(let r=run.pos.r+1;r<run.pos.r+1+n&&r<run.map.length;r++)run.map[r].forEach(nd=>{if(nd.t==='unknown'&&!nd.pre){nd.pre=rollUnknown();k++}});
 if(k)toast('🔭 '+k+' ? room'+(k>1?'s':'')+' revealed','relic');return k}
export function resolveUnknown(){const run=W.run,q=run.qOdds;const node=run.map[run.pos.r]&&run.map[run.pos.r][run.pos.i];let out=(node&&node.pre)||rollUnknown();
 for(const k of ['fight','shop','treasure']){if(k===out)q[k]=ECON.q[k][0];else q[k]+=ECON.q[k][1]}
 run.lastQ=out;
 if(out==='fight')return fight({fromQ:true});if(out==='treasure')return openChest();if(out==='shop')return openShop();
 const ev=pickEvent();if(!ev)return fight({fromQ:true});noteSeen('event',ev.id);
 if(ev.pool==='shrine')run.shrinesThisAct[ev.id]=1;else run.seenEvents[ev.id]=1;
 W.S={screen:'event',ev:{...ev,t:eventText(ev.id,ev.t)},t:Date.now()};render()}
export function eventOK(ev){const run=W.run;if(ev.pool==='shrine'?run.shrinesThisAct[ev.id]:run.seenEvents[ev.id])return false;if(ev.act&&ev.act!==run.act)return false;return !ev.req||ev.req()}
export function pickEvent(){const act=EVENTS.filter(e=>e.pool!=='shrine'&&eventOK(e)),sh=EVENTS.filter(e=>e.pool==='shrine'&&eventOK(e));
 let list=rnd('events')<.75?act:sh;if(!list.length)list=list===act?sh:act;return list.length?pick(list,'events'):null}
function evOptImpl(i){const S=W.S;if(S.screen!=='event')return;const o=S.ev.o[i];if(!o||(o.ok&&!o.ok()))return;o.f()}
// ================= rewards (§1.1) =================
// Act 1 rewards and the merchant are gated to the Act 1 card set (design/act1-complete.md §(a), data/act1.js); later acts use the full pool.
// A locked id (Lamplight) never rolls in rewards, shops, events or potions: every pool below goes through isLocked.
export function isLocked(kind,id){const l=W.run&&W.run.lock;return !!(l&&l[kind]&&l[kind][id])}
export const inActSet=c=>((W.run.act||1)!==1||ACT1_SET.has(c.id))&&!isLocked('cards',c.id);
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
 return out}
export function rewardCardCount(){return mod('rewardCards',{},3)}
export function rollGold(kind){const g=ECON.gold[kind]||ECON.gold.fight;return rng(g[0],g[1],'cards')}
export function potionRoll(kind){const run=W.run,P=ECON.potion;const ch=run.potionChance+(kind==='elite'?P.eliteBonus:0);const hit=rnd('potions')*100<ch;
 run.potionChance=Math.max(P.min,Math.min(P.max,run.potionChance+(hit?-P.step:P.step)));return hit?randomPotion():null}
export function randomPotion(stream='potions'){const run=W.run;const x=rnd(stream)*100,P=ECON.potion.rarity;const rar=x<P.c?'c':x<P.c+P.u?'u':'r';
 const open=p=>(!p.cls||p.cls===run.cls)&&!isLocked('potions',p.id);
 let pool=Object.values(POTIONS).filter(p=>p.rarity===rar&&open(p));if(!pool.length)pool=Object.values(POTIONS).filter(open);
 // not the same potion as one of the last 2 offered (drops, shop, events), unless nothing else is left
 const h=run.potHist||(run.potHist=[]),f=pool.filter(p=>!h.slice(-2).includes(p.id));const id=pick(f.length?f:pool,stream).id;h.push(id);if(h.length>8)h.shift();return id}
// Called by combat.win(). Builds the claimable reward rows.
export function combatRewards(kind,{allFled,opts={},cb}={}){const run=W.run;const rows=[];
 if(kind==='elite'){const k=cb&&cb.ens.find(e=>e.elite);const idx={captain:0,warden:1,eel:2}[k&&k.key];if(idx!=null)run.stats.elites[idx]++}
 if(kind==='boss')run.stats.bosses++;
 let g=rollGold(kind);if(allFled)g=Math.floor(g/2);g=Math.round(mod('gold',{combat:true,kind},g));if(g>0)rows.push({k:'gold',n:g});
 if(kind==='elite'){const id=randomRelic(ECON.relicOdds);rows.push(id?{k:'relic',id}:{k:'gold',n:50,note:'(no relics left)'})}
 const pot=potionRoll(kind);if(pot)rows.push({k:'potion',id:pot});
 if(!allFled&&!opts.noCards){let cards;
  if(kind==='boss')cards=rollCards(rewardCardCount(),'boss',{forceR:'r'});
  else if(run.rareNext){run.rareNext=false;cards=rollCards(rewardCardCount(),kind,{forceR:'r'})}
  else cards=rollCards(rewardCardCount(),kind==='elite'?'elite':'fight');
  remember('offerHist',cards);rows.push({k:'cards',cards})}
 W.S={screen:'reward',kind,rows,boss:kind==='boss'?(cb&&cb.bossKey)||run.boss:null,title:kind==='boss'?'🔔 Boss defeated!':kind==='elite'?'💀 Elite defeated!':allFled?'🐦 They fled with your gold…':'⚔️ Victory!',t:Date.now()};
 // Keep the map checkpoint; the save journal reconstructs this room and its
 // claimed/unclaimed rewards when the player continues.
 render()}
function claimRowImpl(i){const S=W.S;const row=S.rows&&S.rows[i];if(!row||row.done)return;
 if(row.k==='gold'){gainGold(row.n);row.done=true}
 else if(row.k==='relic'){row.done=true;gainRelic(row.id);if(W.S!==S)return}
 else if(row.k==='potion'){if(addPotion(row.id))row.done=true;else{S.swap=i}}
 else if(row.k==='cards'){S.cardsOpen=i;S.cardSelected=null;S.skipConfirm=false}
 render()}
function rewCardImpl(j){const S=W.S,row=S.rows?.[S.cardsOpen];if(S.cardsOpen==null||!row||row.done||!Number.isInteger(j)||!row.cards[j]||S.skipConfirm)return;
 S.cardSelected=S.cardSelected===j?null:j;render()}
function rewConfirmCardsImpl(confirm=settings.confirmCardSkip!==false){const S=W.S,row=S.rows?.[S.cardsOpen];if(S.cardsOpen==null||!row||row.done||S.skipConfirm)return;
 const j=S.cardSelected;if(j==null)return rewSkipCardsImpl(confirm);if(!row.cards[j])return;
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
function rewDoneImpl(){const S=W.S;if(S.kind==='boss'&&W.run.act===1)return endRun(true);goMap()}
// ================= relics =================
export const campfireRelic=id=>!!(RELICS[id]&&RELICS[id].campfire);
export function relicCandidates(tier){const run=W.run;const nCamp=run.relics.filter(r=>campfireRelic(r.id)).length;
 return Object.values(RELICS).filter(r=>r.tier===tier&&r.phase==='P1'&&!r.stub&&(!r.cls||r.cls===run.cls)&&!isLocked('relics',r.id)&&!run.seenRelics[r.id]&&!run.relics.some(x=>x.id===r.id)&&!(r.campfire&&nCamp>=2))}
// Relic rarity roll (C/U/R); an empty tier rolls the next tier up; all empty → null (caller gives 50 gold).
export function randomRelic(odds=ECON.relicOdds,stream='relics',{tier=null,noCampfire=false}={}){
 let t=tier;if(!t){const x=rnd(stream)*100;t=x<odds.c?'c':x<odds.c+odds.u?'u':'r'}
 const order=t==='shop'?['shop']:TIERS.slice(TIERS.indexOf(t));
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
export function gainGold(n){n=Math.max(0,Math.round(n));W.run.gold+=n;W.run.stats.goldEarned+=n;if(n>0)fire('goldGained',{amount:n});return n}
export function spendGold(n){if(W.run.gold<n)return false;W.run.gold-=n;return true}
export function gainMaxHp(n){W.run.max+=n;W.run.hp+=n}
export function loseMaxHp(n){W.run.max=Math.max(1,W.run.max-n);W.run.hp=Math.min(W.run.hp,W.run.max)}
export function heal(n){W.run.hp=Math.min(W.run.max,W.run.hp+Math.max(0,Math.floor(n)))}
export function hurt(n){W.run.hp=Math.max(1,W.run.hp-n)} // event HP costs never kill (events require HP > cost)
export function poolOf(r){return Object.values(CARDS).filter(c=>c.cls===W.run.cls&&c.r!=='s'&&!isLocked('cards',c.id)&&(!r||c.r===r))}
export function randomCard(r,stream='events'){return pick(poolOf(r),stream).id}
export function msg(title,text,next){W.S={screen:'msg',title,text,next:next||goMap};render()}
// Small non-blocking toast (relic/potion/curse gained). Visual only.
export function toast(txt,cls){W.toasts=(W.toasts||[]).filter(t=>Date.now()-t.t<2600);W.toasts.push({txt,cls:cls||'',t:Date.now()})}
// ================= deck picks: upgrade / remove / transform / duplicate / annotate / custom =================
export function pickable(mode,filter){return W.run.deck.filter(c=>{const d=CARDS[c.id];if(mode==='upgrade'&&(c.up||d.curse||d.cls==='status'))return false;
 if((mode==='remove'||mode==='transform'||mode==='offer')&&d.noRemove)return false;if(mode==='annotate'&&(c.open||d.open))return false;return !filter||filter(c)})}
export function openPick(mode,title,then,cancel,filter,onPick){const list=pickable(mode,filter);if(!list.length){then?then(null):goMap();return}
 W.S={screen:'pick',mode,title,then:then||goMap,cancel,filter,onPick};render()}
function pickCardImpl(uid){const S=W.S;if(S.screen!=='pick')return;const i=W.run.deck.findIndex(c=>c.uid===uid);if(i<0)return;const ci=W.run.deck[i];
 if(!pickable(S.mode,S.filter).includes(ci))return;
 if(S.mode==='upgrade')ci.up=true;
 else if(S.mode==='remove'){W.run.deck.splice(i,1)}
 else if(S.mode==='transform'){const n=pick(poolOf().filter(c=>c.id!==ci.id),'events');W.run.deck[i]=mk(n.id);toast('🔀 '+CARDS[ci.id].n+' → '+n.n,'')}
 else if(S.mode==='duplicate'){W.run.deck.push(mk(ci.id,ci.up));toast('🪞 Duplicated '+cname(ci),'')}
 else if(S.mode==='annotate'){ci.open=true;toast('📘 '+cname(ci)+' gains Opening','')}
 if(S.onPick)S.onPick(ci);S.then(ci)}
function pickCancelImpl(){const S=W.S;if(S.cancel)S.cancel();else S.then(null)}
// ================= chests (§1.5) =================
function openChestImpl(){const run=W.run;const c=wpick(ECON.chest.map(x=>[x,x.w]),'relics');const rows=[];
 const id=randomRelic(c.rel);rows.push(id?{k:'relic',id}:{k:'gold',n:50,note:'(no relics left)'});
 if(rnd('relics')*100<c.gold[0])rows.push({k:'gold',n:rng(c.gold[1],c.gold[2],'relics')});
 W.S={screen:'chest',chest:c.k,name:c.n,rows,opened:false,t:Date.now()};render()}
function openChestLidImpl(){if(W.S.screen!=='chest')return;W.S.opened=true;W.S.openT=Date.now();render()}
// ================= camps (§1.8) =================
export function campOptions(){const o=[{k:'mend',l:'❤️ Mend',d:`Heal ${Math.floor(W.run.max*mod('mendFrac',{},ECON.mend))} HP (30% of Max HP)`},{k:'temper',l:'⬆️ Temper',d:'Upgrade a card'}];
 for(const r of W.run.relics){const d=RELICS[r.id];if(d&&d.camp)o.push({k:d.camp,l:{cook:'🍲 Cook',scour:'🪨 Scour',trawl:'⚓ Trawl',annotate:'📘 Annotate'}[d.camp],d:{cook:'Gain 4 Max HP (Galley Pot)',scour:'Remove a card (Pumice Stone)',trawl:'Gain a random Common or Uncommon relic (Grapnel Hook)',annotate:'Give a card Opening (Ship\'s Rutter)'}[d.camp],relic:r.id})}
 return mod('campOptions',{},o)}
function campDoImpl(k){if(W.S.screen!=='rest')return;
 if(k==='mend'){heal(Math.floor(W.run.max*mod('mendFrac',{},ECON.mend)));return goMap()}
 if(k==='temper')return openPick('upgrade','⬆️ Temper: choose a card to upgrade',goMap,()=>{W.S={screen:'rest'};render()});
 if(k==='cook'){gainMaxHp(4);return msg('🍲 Cook','A hearty stew. +4 Max HP.')}
 if(k==='scour')return openPick('remove','🪨 Scour: choose a card to remove',goMap,()=>{W.S={screen:'rest'};render()});
 if(k==='trawl'){const id=randomRelic({c:60,u:40,r:0},'relics',{noCampfire:true});if(id){gainRelic(id);return msg('⚓ Trawl','Your hook brings up <b>'+RELICS[id].e+' '+RELICS[id].n+'</b>.')}gainGold(50);return msg('⚓ Trawl','Only gold this time. +50 gold.')}
 if(k==='annotate')return openPick('annotate','📘 Annotate: give a card Opening (it starts in your opening hand)',goMap,()=>{W.S={screen:'rest'};render()})}
export const restHeal=()=>campDo('mend');
// ================= merchant (§1.4) =================
export const price=(v,kind)=>Math.max(0,Math.round(mod('price',{kind},v)));
export function scrubPrice(){return Math.max(0,Math.round(mod('scrubPrice',{},ECON.price.scrub+ECON.price.scrubStep*W.run.removals)))}
function openShopImpl(){const run=W.run,P=ECON.price;
 if(run.deck.some(c=>c.id==='doubloon')){const n=run.deck.filter(c=>c.id==='doubloon').length;for(let k=0;k<n;k++){const l=Math.min(15,run.gold);run.gold-=l;toast('🪙 Cursed Doubloon: −'+l+' gold','curse')}}
 const S={screen:'shop',cards:[],colorless:[],relics:[],potions:[],scrubbed:false,t:Date.now()};
 const types=run.cls==='carto'?['A','A','S','S','W']:['A','A','S','S','P'];const used=[];
 for(const t of types){const id=rollCards(1,'shop',{stream:'shop',type:t,exclude:used})[0];used.push(id);const r=CARDS[id].r;S.cards.push({id,base:rng(...P.card[r==='s'?'c':r],'shop')})}
 S.cards[R(5,'shop')].sale=true;
 // Colourless shelf: Phase 2 content. Until then it holds 2 extra class cards (1 Uncommon + 1 Rare) at colourless prices.
 for(const r of ['u','r']){const id=rollCards(1,'shop',{stream:'shop',forceR:r,exclude:used})[0];used.push(id);S.colorless.push({id,base:rng(...P.colorless[r],'shop'),stand:true})}
 for(let k=0;k<2;k++){const id=randomRelic(ECON.relicOdds,'shop');if(id)S.relics.push({id,base:rng(...P.relic[RELICS[id].tier],'shop')})}
 const sid=randomRelic(null,'shop',{tier:'shop'})||randomRelic(ECON.relicOdds,'shop');if(sid)S.relics.push({id:sid,base:rng(...P.relic[RELICS[sid].tier],'shop'),right:true});
 for(let k=0;k<3;k++){let id=randomPotion('shop');for(let g=0;g<20&&S.potions.some(p=>p.id===id);g++)id=randomPotion('shop');S.potions.push({id,base:rng(...P.potion[POTIONS[id].rarity],'shop')})}
 remember('shopHist',[...S.cards,...S.colorless].map(x=>x.id));
 for(const it of [...S.cards,...S.colorless,...S.relics,...S.potions])it.price=price(it.sale?it.base/2:it.base,'shop');
 W.S=S;render()}
export function shopItems(){const S=W.S;return {cards:S.cards,colorless:S.colorless,relics:S.relics,potions:S.potions}}
function buyImpl(shelf,i){const S=W.S;if(S.screen!=='shop')return;const it=S[shelf]&&S[shelf][i];if(!it||it.sold)return;if(W.run.gold<it.price){it.noT=Date.now();return render()}
 if(shelf==='potions'&&!W.run.potions.includes(null)){it.noT=Date.now();toast('Potion slots full','');return render()}
 W.run.gold-=it.price;it.sold=true;
 if(shelf==='cards'||shelf==='colorless')gainCard(it.id);else if(shelf==='relics'){gainRelic(it.id);if(W.S!==S)return}else if(shelf==='potions')addPotion(it.id);
 render()}
function shopRemoveImpl(){const S=W.S;if(S.screen!=='shop'||S.scrubbed||!pickable('remove').length)return;const p=scrubPrice();if(W.run.gold<p)return;
 openPick('remove',`✂️ Scrub: remove a card (💰${p})`,()=>{W.run.gold-=p;W.run.removals++;S.scrubbed=true;W.S=S;render()},()=>{W.S=S;render()})}
// ================= flow =================
function goMapImpl(){W.cb=null;if(W.run&&W.run.hp<=0)return endRun(false);W.S={screen:'map'};fire('mapEnter',{});saveRun();render()}
export function endRun(won){const run=W.run;run.won=!!won;run.stats.endT=Date.now();W.cb=null;clearRun();settleRun(run,won);W.S={screen:'end'};render()}
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
