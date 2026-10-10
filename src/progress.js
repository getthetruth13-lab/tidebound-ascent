// progress.js: the Lamplight profile (meta-progression that outlives runs). Stored under its own key, versioned, and loaded
// defensively so a missing, old or damaged save never breaks the game. No DOM or engine imports: usable from tests and bots.
import {LAMP_XP,CLIMB_XP,CLASS_ORDER,LOCK_CARDS,LOCK_CLASS_RELICS,LOCK_SHARED_RELICS,LOCK_POTIONS,LAMP_PLAN,CLIMB_PLAN} from './data/lamplight.js';
export const PROFILE_KEY='tidebound.profile.v1',PROFILE_V=1;
let mem=null; // fallback when localStorage is unavailable (private mode, Node)
const blank=()=>({v:PROFILE_V,xp:{},climb:0,claimed:{},climbClaimed:0,runs:{},wins:{},unlocked:{cards:[],relics:[],potions:[]},seen:{enemy:{},event:{},relic:{},card:{},potion:{}},tasks:0,best:{}});
function norm(p){const b=blank();if(!p||typeof p!=='object'||Array.isArray(p))return b;
 const num=x=>Number.isFinite(+x)&&+x>0?Math.floor(+x):0,map=o=>{const r={};if(o&&typeof o==='object')for(const k of Object.keys(o))r[k]=num(o[k]);return r};
 b.xp=map(p.xp);b.climb=num(p.climb);b.claimed=map(p.claimed);b.climbClaimed=num(p.climbClaimed);b.runs=map(p.runs);b.wins=map(p.wins);b.tasks=num(p.tasks);b.best=map(p.best);
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
export const totalPending=p=>CLASS_ORDER.reduce((n,c)=>n+lampPending(p,c),0)+climbPending(p);
// progress inside the current level: {lvl,max,into,span,pct}
export function barOf(xp,table){const lvl=levelOf(xp,table),max=lvl>=table.length,lo=lvl?table[lvl-1]:0,hi=max?lo:table[lvl];return {lvl,max,into:xp-lo,span:hi-lo,pct:max?100:Math.max(0,Math.min(100,100*(xp-lo)/Math.max(1,hi-lo)))}}
// ---------- locks ----------
export const classRelicIds=cls=>{const r=LOCK_CLASS_RELICS[cls];return r?[r.shop,r.rare]:[]};
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
 return {cards:(LOCK_CARDS[cls]||[]).filter(x=>!uc.has(x)),shop:R.shop&&!ur.has(R.shop)?R.shop:null,rare:R.rare&&!ur.has(R.rare)?R.rare:null}}
export function offerFor(p,track,CARDS){
 const climb=track==='climb',claimed=climb?p.climbClaimed:(p.claimed[track]||0),pending=climb?climbPending(p):lampPending(p,track);if(pending<=0)return null;
 const plan=(climb?CLIMB_PLAN:LAMP_PLAN)[claimed];if(!plan)return null;const rem=remaining(p,track,CARDS);const items=[];
 const take=(kind,list,n)=>{for(const id of list){if(items.length>=n)break;if(!items.some(i=>i.id===id&&i.kind===kind))items.push({kind,id})}};
 const sorted=(list,pref)=>pref?[...list.filter(id=>rarityOf(CARDS,id)===pref),...list.filter(id=>rarityOf(CARDS,id)!==pref)]:list;
 if(plan.k==='all'){const all=climb?[...rem.relics.map(id=>({kind:'relic',id})),...rem.potions.map(id=>({kind:'potion',id}))]:[...rem.cards.map(id=>({kind:'card',id})),...[rem.shop,rem.rare].filter(Boolean).map(id=>({kind:'relic',id}))];
  return {track,level:claimed+1,final:true,items:all}}
 if(climb){if(plan.k==='relics')take('relic',rem.relics,3);else if(plan.k==='potions')take('potion',rem.potions,3);
  else{take('relic',rem.relics,1);take('potion',rem.potions,2);take('relic',rem.relics.filter(id=>!items.some(i=>i.id===id)),3);take('potion',rem.potions.filter(id=>!items.some(i=>i.id===id)),3)}
  if(!items.length)take('relic',rem.relics,3),take('potion',rem.potions,3)}
 else{const relic=plan.k==='shop'?rem.shop:plan.k==='rare'?rem.rare:null;if(relic)items.push({kind:'relic',id:relic});
  take('card',sorted(rem.cards,plan.k==='rare'?'r':plan.pref||'u'),3);
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
// The earliest Lamp level at which a locked item can be offered (for Ledger hints).
export function firstLevel(track,kind,id,CARDS){if(track==='climb'){const plan=CLIMB_PLAN,want=kind==='relic'?['relics','mixed']:['potions','mixed'];const i=plan.findIndex(x=>want.includes(x.k));return i+1}
 if(kind==='relic'){const R=LOCK_CLASS_RELICS[track]||{};return (id===R.shop?5:9)}
 return rarityOf(CARDS,id)==='r'?8:1}
