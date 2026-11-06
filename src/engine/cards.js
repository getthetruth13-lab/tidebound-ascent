// engine/cards.js
import {CARDS,KW,TYPEN} from '../core/registry.js';
import {mod} from '../core/bus.js';
import {buildMatcher} from '../ui/kwmatch.js';
let KM=null;
import {W,nextId} from '../core/state.js';
// Type display names (ids stay P/C/T): the redesign vocabulary, FUN-REDESIGN 5.0.
TYPEN.P='Vigil';TYPEN.C='Burden';TYPEN.T='Flotsam';
// ================= card helpers =================
// up: false | true | a level number. Multi-level Temper (rk:{max}): lvl 0..max, `up` stays lvl>0 so every older reader keeps working.
export function mk(id,up,o){const lvl=typeof up==='number'?up:up?1:0;return Object.assign({id,uid:nextId(),up:lvl>0,lvl},o||{})}
export const rkMax=ci=>{const d=CARDS[ci.id];return d&&d.rk?d.rk.max:1};
// Current level: saved lvl (old saves: up:true = 1), plus 1 for the fight under Temper Oil (tmpUp), never past the card's max.
export const rawLvl=ci=>Math.max(ci.lvl||0,ci.up?1:0); // tolerant: code or tests that only set up:true still mean level 1
export const lvlOf=ci=>{const m=rkMax(ci);let l=rawLvl(ci);if(ci.tmpUp&&l<m)l++;return Math.min(l,m)};
export const isUp=ci=>lvlOf(ci)>0;
// One Temper: +1 level (max 1 for cards without rk).
export function upgradeCard(ci){ci.lvl=Math.min(rkMax(ci),rawLvl(ci)+1);ci.up=ci.lvl>0;return ci}
export const canTemper=ci=>rawLvl(ci)<rkMax(ci);
// Per-level value: a at level 0, b at level 1, then b + the running sum of `step` (a number, a "2,2,1,1" list, or the default taper 2,2,1,1),
// never above max. Steps past the end of a list add 0.
const TAPER=[2,2,1,1];
export function rv(a,b,step,lvl,max){if(lvl<=0)return a;let s=step==null||step===''?TAPER:typeof step==='string'?step.split(',').map(Number):step;if(Array.isArray(s)&&s.length===1)s=s[0];let v=b;
 for(let i=0;i<lvl-1;i++)v+=typeof s==='number'?s:(s[i]||0);return max!=null?Math.min(v,max):v}
export const isX=ci=>CARDS[ci.id].c==='X';
// Cost pipeline (content-impl-plan §4.2 modifyCost): base/upgraded -> X -> set-to-0 (tmp0) -> modifiers ('cost': Low Note, Survey Flags,
// Barnacled...) -> clamp >= 0. "Next card" discounts are consumed in onCardPlayed, not when the cost is read.
export function baseCost(ci){const d=CARDS[ci.id];return (isUp(ci)&&d.cu!=null)?d.cu:d.c}
export function cost(ci){const d=CARDS[ci.id];if(d.c==='X')return 0;let c=baseCost(ci);if(W.cb){if(ci.tmp0)c=0;c=mod('cost',{card:ci,def:d},c);const cb=W.cb;if(cb.numbCard===ci)c+=1;if(cb.owed&&!cb.owedUsed&&!ci.tmp0&&owedMatch(d,cb.owed)&&cb.ens.some(x=>x.key==='grell'&&x.hp>0))c+=1}return Math.max(0,c)}
const owedMatch=(d,t)=>(d.t==='A'?'A':d.t==='P'?'P':d.t==='S'||d.t==='W'?'S':null)===t; // R5 Owed: Waypoints count as Skills
// Named cost surcharges ("first card each turn costs 1 more"), so the card can show its normal cost plus a "+1" badge that names the
// source instead of silently raising every number in hand. Returns [{n, src, why}]; empty when nothing raises this card.
export function costSurcharge(ci){const cb=W.cb,out=[];if(!cb||CARDS[ci.id].c==='X'||CARDS[ci.id].unplay)return out;
 if(cb.stat&&cb.stat.playedTurn===0){const b=cb.hand.filter(c=>c.id==='barnacled'&&c!==ci).length;
  if(b)out.push({n:b,src:'Barnacled',why:`Barnacled: first card each turn costs ${b} more.`})}
 const named=out.reduce((a,x)=>a+x.n,0),extra=cost(ci)-Math.max(0,(ci.tmp0?0:baseCost(ci)))-named;
 if(named&&extra<0){out.length=0} // a discount on the same card cancels it out; the gem already shows the true cost
 return out}
export function isEx(ci){const d=CARDS[ci.id];return (isUp(ci)&&d.xu!=null)?!!d.xu:!!d.x}
// Template slots: {base|up} (as ever), {base|up|+2,2,1,1^max} (number that keeps growing per level), {@3|text with [b|b|+1] slots} (text from level 3 on).
export function fmt(s,u,lvl){const L=lvl!=null?lvl:u?1:0;
 const num=(a,b,st,mx,wrap)=>{if(!L)return a;const v=st!=null?rv(0,+b,st,L,mx?+mx:null):b;return v===''?'':wrap?`<span class="upv">${v}</span>`:String(v)};
 s=s.replace(/\{@(\d)\|([^}]*)\}/g,(m,n,body)=>L>=+n?`<span class="upv">${body.replace(/\[([^|\]]*)\|([^|\]]*)(?:\|\+([\d,]*)(?:\^(\d+))?)?\]/g,(q,a,b,st,mx)=>num(a,b,st,mx,false))}</span>`:'');
 return s.replace(/\{([^|}]*)\|([^|}]*)(?:\|\+([\d,]*)(?:\^(\d+))?)?\}/g,(m,a,b,st,mx)=>num(a,b,st,mx,true))}
export function cname(ci){const l=lvlOf(ci);return CARDS[ci.id].n+(l>1?'+'+l:l?'+':'')}
export const lvlLabel=ci=>{const l=lvlOf(ci);return l>1?'+'+l:l?'+':''};
export function desc(ci){const d=CARDS[ci.id];let s=fmt(d.d,isUp(ci),lvlOf(ci));if(ci.open&&!d.open)s+=' <b>Opening.</b>';return s}
export const plain=s=>s.replace(/<[^>]+>/g,'');
// Glossary entries for every keyword that appears in the card's text (word match), plus its type keyword.
export function kwList(ci){const d=CARDS[ci.id];const t=plain(desc(ci));if(!KM)KM=buildMatcher(KW);const found=new Set([...t.matchAll(KM.re)].map(KM.canon));return Object.keys(KW).filter(k=>{const w=k.replace(/ X$/,'');return new RegExp('\\b'+w.replace(/[()]/g,'\\$&')+'\\b').test(t)||found.has(w)||(k==='Waypoint'&&d.t==='W')})}
export function kwFor(ci){return kwList(ci).map(k=>`<b>${k}:</b> ${KW[k]}`).join('<br>')}
// Which cards are aimed at one enemy (tap-enemy / drag-onto-enemy to play)
export function needsTarget(ci){const d=CARDS[ci.id];if(d.tg!=null)return !!d.tg;if(d.t!=='A')return false;return !/ALL|random enemy/.test(d.d)}
