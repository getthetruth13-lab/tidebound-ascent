// engine/cards.js
import {CARDS,KW} from '../core/registry.js';
import {mod} from '../core/bus.js';
import {W,nextId} from '../core/state.js';
// ================= card helpers =================
export function mk(id,up,o){return Object.assign({id,uid:nextId(),up:!!up},o||{})}
export const isUp=ci=>!!(ci.up||ci.tmpUp);
export const isX=ci=>CARDS[ci.id].c==='X';
// Cost pipeline (content-impl-plan §4.2 modifyCost): base/upgraded -> X -> set-to-0 (tmp0) -> modifiers ('cost': Low Note, Survey Flags,
// Barnacled...) -> clamp >= 0. "Next card" discounts are consumed in onCardPlayed, not when the cost is read.
export function baseCost(ci){const d=CARDS[ci.id];return (isUp(ci)&&d.cu!=null)?d.cu:d.c}
export function cost(ci){const d=CARDS[ci.id];if(d.c==='X')return 0;let c=baseCost(ci);if(W.cb){if(ci.tmp0)c=0;c=mod('cost',{card:ci,def:d},c)}return Math.max(0,c)}
export function isEx(ci){const d=CARDS[ci.id];return (isUp(ci)&&d.xu!=null)?!!d.xu:!!d.x}
export function fmt(s,u){return s.replace(/\{([^|}]*)\|([^}]*)\}/g,(m,a,b)=>u?(b?`<span class="upv">${b}</span>`:''):a)}
export function cname(ci){return CARDS[ci.id].n+(isUp(ci)?'+':'')}
export function desc(ci){const d=CARDS[ci.id];let s=fmt(d.d,isUp(ci));if(ci.open&&!d.open)s+=' <b>Opening.</b>';return s}
export const plain=s=>s.replace(/<[^>]+>/g,'');
// Glossary entries for every keyword that appears in the card's text (word match), plus its type keyword.
export function kwList(ci){const d=CARDS[ci.id];const t=plain(desc(ci));return Object.keys(KW).filter(k=>{const w=k.replace(/ X$/,'');return new RegExp('\\b'+w.replace(/[()]/g,'\\$&')+'\\b').test(t)||(k==='Waypoint'&&d.t==='W')})}
export function kwFor(ci){return kwList(ci).map(k=>`<b>${k}:</b> ${KW[k]}`).join('<br>')}
// Which cards are aimed at one enemy (tap-enemy / drag-onto-enemy to play)
export function needsTarget(ci){const d=CARDS[ci.id];if(d.tg!=null)return !!d.tg;if(d.t!=='A')return false;return !/ALL|random enemy/.test(d.d)}
