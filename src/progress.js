// progress.js: the Lamplight profile (meta-progression that outlives runs). Stored under its own key, versioned, and loaded
// defensively so a missing, old or damaged save never breaks the game. No DOM or engine imports: usable from tests and bots.
import {LAMP_XP,CLIMB_XP,CLASS_ORDER,LOCK_CARDS,LOCK_HERO_RELICS,LOCK_CLASS_RELICS,LAMP_PER_RUN,LOCK_SHARED_RELICS,LOCK_POTIONS,LAMP_PLAN,CLIMB_PLAN} from './data/lamplight.js';
export const PROFILE_KEY='tidebound.profile.v1',PROFILE_V=1;
export const ENDING_IDS=['light','lens','cut'];
let mem=null; // fallback when localStorage is unavailable (private mode, Node)
const blank=()=>({v:PROFILE_V,xp:{},climb:0,claimed:{},climbClaimed:0,runs:{},wins:{},unlocked:{cards:[],relics:[],potions:[]},seen:{enemy:{},event:{},relic:{},card:{},potion:{}},tasks:0,best:{},twistSeen:false,endings:{},lastEnding:'',tutSeen:{}});
function norm(p){const b=blank();if(!p||typeof p!=='object'||Array.isArray(p))return b;
 const num=x=>Number.isFinite(+x)&&+x>0?Math.floor(+x):0,map=o=>{const r={};if(o&&typeof o==='object')for(const k of Object.keys(o))r[k]=num(o[k]);return r};
 b.xp=map(p.xp);b.climb=num(p.climb);b.claimed=map(p.claimed);b.climbClaimed=num(p.climbClaimed);b.runs=map(p.runs);b.wins=map(p.wins);b.tasks=num(p.tasks);b.best=map(p.best);
 // Lore (design/lore/LORE-BIBLE.md §14): twistSeen gates the S3 tier; endings / lastEnding drive the title-screen variants. Old saves load with safe defaults.
 b.tutSeen={};if(p.tutSeen&&typeof p.tutSeen==='object')for(const k of CLASS_ORDER)if(p.tutSeen[k])b.tutSeen[k]=1;
 b.twistSeen=p.twistSeen===true;b.endings=map(p.endings);b.lastEnding=ENDING_IDS.includes(p.lastEnding)?p.lastEnding:'';
 for(const k of ['cards','relics','potions'])b.unlocked[k]=Array.isArray(p.unlocked&&p.unlocked[k])?[...new Set(p.unlocked[k].filter(x=>typeof x==='string'))]:[];
 for(const k of Object.keys(b.seen))if(p.seen&&p.seen[k]&&typeof p.seen[k]==='object')for(const id of Object.keys(p.seen[k]))b.seen[k][id]=1;
 return b}
export function loadProfile(){let raw=null;try{raw=JSON.parse(localStorage.getItem(PROFILE_KEY))}catch(_){raw=mem}return norm(raw)}
export function saveProfile(p){mem=p;try{localStorage.setItem(PROFILE_KEY,JSON.stringify(p))}catch(_){}return p}
export function resetProfile(){mem=null;try{localStorage.removeItem(PROFILE_KEY)}catch(_){}}
// ---------- levels ----------
export const levelOf=(xp,table)=>table.reduce((n,t)=>n+(xp>=t?1:0),0);
export const lampLevel=(p,cls)=>levelOf(p.xp[cls]||0,LAMP_XP);
export const climbLevel=p=>levelOf(p.climb||0,CLIMB_XP);
export const lampPending=(p,cls)=>Math.max(0,lampLevel(p,cls)-(p.claimed[cls]||0));
export const climbPending=p=>Math.max(0,climbLevel(p)-(p.climbClaimed||0));
// ---------- lore flags (the twist scene and the ending screen will call these; Act 1 never does) ----------
export const deathsOf=p=>Math.max(0,Object.values(p.runs||{}).reduce((n,x)=>n+x,0)-Object.values(p.wins||{}).reduce((n,x)=>n+x,0));
export function markTwistSeen(p){p.twistSeen=true;return p}
export function markEnding(p,id){if(!ENDING_IDS.includes(id))return p;p.endings[id]=(p.endings[id]||0)+1;p.lastEnding=id;return p}
// First-fight tutorial (data/tutorial.js): tutSeen[cls]=1 once that hero's tutorial has been finished, skipped or its fight has ended.
export const tutSeen=(p,cls)=>!!(p.tutSeen&&p.tutSeen[cls]);
export function markTutSeen(p,cls){if(!p.tutSeen)p.tutSeen={};p.tutSeen[cls]=1;return p}
export const totalPending=p=>CLASS_ORDER.reduce((n,c)=>n+lampPending(p,c),0)+climbPending(p);
// progress inside the current level: {lvl,max,into,span,pct}
export function barOf(xp,table){const lvl=levelOf(xp,table),max=lvl>=table.length,lo=lvl?table[lvl-1]:0,hi=max?lo:table[lvl];return {lvl,max,into:xp-lo,span:hi-lo,pct:max?100:Math.max(0,Math.min(100,100*(xp-lo)/Math.max(1,hi-lo)))}}
// ---------- locks ----------
export const classRelicIds=cls=>{const r=LOCK_CLASS_RELICS[cls];return r?[r.shop,r.rare,...(LOCK_HERO_RELICS[cls]||[])]:[]};
export const allLocked=()=>({cards:CLASS_ORDER.flatMap(c=>LOCK_CARDS[c]),relics:[...CLASS_ORDER.flatMap(classRelicIds),...LOCK_SHARED_RELICS],potions:[...LOCK_POTIONS]});
// The ids that are still locked for this profile: {cards:{id:1},relics:{id:1},potions:{id:1}} (copied into each run, see engine/run.js).
export function lockedFor(p){const out={cards:{},relics:{},potions:{}},A=allLocked();for(const k of Object.keys(A)){const u=new Set(p.unlocked[k]);for(const id of A[k])if(!u.has(id))out[k][id]=1}return out}
// ---------- level-up offers ----------
// {track,level,final,items:[{kind,id}]}; null if nothing is waiting. The three offered are the first eligible locked items in list order,
// so nothing repeats, nothing is skipped, and the two you don't take come back in the next offer.
const rarityOf=(CARDS,id)=>CARDS&&CARDS[id]?CARDS[id].r:'u';
export function remaining(p,track,CARDS){const u=k=>new Set(p.unlocked[k]);
 if(track==='climb'){const r=u('relics'),po=u('potions');return {relics:LOCK_SHARED_RELICS.filter(x=>!r.has(x)),potions:LOCK_POTIONS.filter(x=>!po.has(x))}}
 const cls=track,uc=u('cards'),ur=u('relics'),R=LOCK_CLASS_RELICS[cls]||{};
 return {relics:(LOCK_HERO_RELICS[cls]||[]).filter(x=>!ur.has(x)),cards:(LOCK_CARDS[cls]||[]).filter(x=>!uc.has(x)&&!(CARDS&&CARDS[x]&&(CARDS[x].cut||CARDS[x].stub))),shop:R.shop&&!ur.has(R.shop)?R.shop:null,rare:R.rare&&!ur.has(R.rare)?R.rare:null}}
export function offerFor(p,track,CARDS){
 const climb=track==='climb',claimed=climb?p.climbClaimed:(p.claimed[track]||0),pending=climb?climbPending(p):lampPending(p,track);if(pending<=0)return null;
 const plan=(climb?CLIMB_PLAN:LAMP_PLAN)[claimed];if(!plan)return null;const rem=remaining(p,track,CARDS);const items=[];
 const take=(kind,list,n)=>{for(const id of list){if(items.length>=n)break;if(!items.some(i=>i.id===id&&i.kind===kind))items.push({kind,id})}};
 const sorted=(list,pref)=>pref?[...list.filter(id=>rarityOf(CARDS,id)===pref),...list.filter(id=>rarityOf(CARDS,id)!==pref)]:list;
 if(plan.k==='all'){const all=climb?[...rem.relics.map(id=>({kind:'relic',id})),...rem.potions.map(id=>({kind:'potion',id}))]:[...rem.cards.map(id=>({kind:'card',id})),...[rem.shop,rem.rare,...rem.relics].filter(Boolean).map(id=>({kind:'relic',id}))];
  return {track,level:claimed+1,final:true,items:all}}
 if(climb){if(plan.k==='relics')take('relic',rem.relics,3);else if(plan.k==='potions')take('potion',rem.potions,3);
  else{take('relic',rem.relics,1);take('potion',rem.potions,2);take('relic',rem.relics.filter(id=>!items.some(i=>i.id===id)),3);take('potion',rem.potions.filter(id=>!items.some(i=>i.id===id)),3)}
  if(!items.length)take('relic',rem.relics,3),take('potion',rem.potions,3)}
 else{const relic=plan.k==='shop'?rem.shop:plan.k==='rare'?rem.rare:null;if(relic)items.push({kind:'relic',id:relic});
  if(plan.k==='relics')take('relic',rem.relics,3);
  take('card',sorted(rem.cards,plan.k==='rare'?'r':plan.pref||'u'),3);
  if(plan.k!=='relics')take('relic',rem.relics,3); // every level offers up to three real choices: other kinds fill in when the preferred kind runs short
  if(!items.length){const other=plan.k==='shop'?rem.rare:rem.shop;if(other)items.push({kind:'relic',id:other})}}
 return {track,level:claimed+1,final:false,items}}
// Claim one item (or everything on a final level). Returns the unlocked items, or null if the pick was not on offer.
export function claim(p,track,id,CARDS){const o=offerFor(p,track,CARDS);if(!o)return null;
 let got;if(o.final){if(id!=null&&id!=='*')return null;got=o.items}else{const it=o.items.find(i=>i.id===id);if(!it)return null;got=[it]}
 for(const it of got){const k=it.kind==='card'?'cards':it.kind==='relic'?'relics':'potions';if(!p.unlocked[k].includes(it.id))p.unlocked[k].push(it.id)}
 if(track==='climb')p.climbClaimed++;else p.claimed[track]=(p.claimed[track]||0)+1;
 // an offer with nothing left (everything already taken) is skipped so a level never stalls
 let g=0;while(g++<12){const n=offerFor(p,track,CARDS);if(!n||n.final||n.items.length)break;if(track==='climb')p.climbClaimed++;else p.claimed[track]++}
 return got}
// The earliest Lamp level at which a locked item can be offered (for Ledger hints): found by replaying the offers for a fresh profile.
const firstMemo={};
export function firstLevel(track,kind,id,CARDS){const key=track+'|'+kind+'|'+id;if(firstMemo[key])return firstMemo[key];
 if(track==='climb'){const plan=CLIMB_PLAN,want=kind==='relic'?['relics','mixed']:['potions','mixed'];const i=plan.findIndex(x=>want.includes(x.k));return firstMemo[key]=i+1}
 const n=LAMP_XP.length;for(let lv=1;lv<=n;lv++){const q=blank();q.claimed[track]=lv-1;q.xp[track]=LAMP_XP[lv-1];const o=offerFor(q,track,CARDS);if(o&&o.items.some(i=>i.id===id))return firstMemo[key]=lv}
 return firstMemo[key]=n}
// Real Ledger hint for a locked item: its level, the Lamplight still needed and roughly how many runs that is.
export function lockHint(p,track,kind,id,CARDS){const lv=firstLevel(track,kind,id,CARDS);
 if(track==='climb'){const need=Math.max(0,CLIMB_XP[lv-1]-(p.climb||0));return need?`Stair ${lv} of ${CLIMB_XP.length}. ${need} more Lamplight (about ${Math.max(1,Math.ceil(need/LAMP_PER_RUN))} runs).`:`Stair ${lv} of ${CLIMB_XP.length} is lit. It waits in your next Stair unlock.`}
 const need=Math.max(0,LAMP_XP[lv-1]-(p.xp[track]||0));
 return need?`Lamp ${lv} of ${LAMP_XP.length}. ${need} more Lamplight (about ${Math.max(1,Math.ceil(need/LAMP_PER_RUN))} run${need>LAMP_PER_RUN?'s':''}).`:`Lamp ${lv} of ${LAMP_XP.length} is lit. It can be offered at your next unlock.`}

// ---- Hero locking (Task 30) ----
// DEV FLAG: HERO_LOCK_DEFAULT=false keeps ALL four Lampbearers open while the game is in development. For release flip it to true (or test with
// ?herolock=1 / localStorage 'tidebound.herolock'='1'; '0' forces it off). Recommended release locks: Tidecaller and Cartographer; the Duelist and
// Echo Mage are open from the first run. A locked hero shows as a silhouette under an unlit lantern with the unlock hint.
export const HERO_LOCK_DEFAULT=false;
export function heroLockingOn(){try{const v=localStorage.getItem('tidebound.herolock');if(/[?&]herolock=1/.test(location.search)||v==='1')return true;if(v==='0')return false}catch(_){}return HERO_LOCK_DEFAULT}
export const HERO_LOCKS={tide:{hint:'Raise any Lampbearer\'s Lamp to level 2.',test:p=>CLASS_ORDER.some(c=>lampLevel(p,c)>=2)},carto:{hint:'Climb the Stair to Stair level 2.',test:p=>climbLevel(p)>=2}};
export const heroUnlocked=(p,cls)=>!heroLockingOn()||!HERO_LOCKS[cls]||HERO_LOCKS[cls].test(p);
