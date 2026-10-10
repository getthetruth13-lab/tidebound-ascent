// ui/combatant.js: the combatant panel under every figure: bronze HP bar, Guard shield, status row.
// STATUS is the single icon map: each status has a name, kind (buff/debuff), rule text, duration rule and a placeholder SVG.
// Painted art replaces a placeholder with no code change: add the status to art/v2/ui/icons.json (assets.js ST_ICON) and it is used first.
import {KW} from '../core/registry.js';
import {assetSrc} from '../assets.js';
const S=(d,x='')=>`<svg class="sti" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor" stroke="#05070b" stroke-width="1" stroke-linejoin="round">${d}</g>${x}</svg>`;
const ICON={
 str:S('<path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.8 5.5 21l2-7.5L2 9h7z"/>'), // fist-star: Might
 dex:S('<path d="M3 20l5-10 4 5 3-7 6 12z"/>'), // stacked stone / cairn: Poise
 weak:S('<path d="M12 2C8 8 5 11 5 15a7 7 0 0014 0c0-4-3-7-7-13z"/>'), // water drop: Soaked
 vuln:S('<path d="M12 2l9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6z"/>','<path d="M12 5l-2 5 3 2-3 6" fill="none" stroke="#05070b" stroke-width="1.6"/>'), // cracked shield: Exposed
 brittle:S('<path d="M12 1l3 6 6 1-4 5 2 7-7-3-7 3 2-7-4-5 6-1z"/>'), // frost shard: Brittle
 bleed:S('<path d="M12 2c-3 5-6 8-6 12a6 6 0 0012 0c0-4-3-7-6-12z"/>','<path d="M10 14a2 2 0 002 2" fill="none" stroke="#fff6" stroke-width="1.4"/>'), // blood drop
 drench:S('<path d="M2 9c3-3 5 3 8 0s5 3 8 0 3 0 4 0v4c-1 0-1 0-4 0s-5 3-8 0-5 3-8 0z"/><path d="M2 17c3-3 5 3 8 0s5 3 8 0 3 0 4 0v3H2z"/>'), // waves: Drenched
 reson:S('<path d="M12 2a6 6 0 00-6 6c0 6-3 7-3 9h18c0-2-3-3-3-9a6 6 0 00-6-6z"/><circle cx="12" cy="20" r="2"/>'), // bell: Resonating
 shell:S('<path d="M12 3C6 3 2 8 2 14c0 3 2 6 10 7 8-1 10-4 10-7 0-6-4-11-10-11z"/>','<path d="M12 3v18M7 5l1 15M17 5l-1 15" fill="none" stroke="#05070b" stroke-width="1.2"/>'), // scallop: Shell
 barbs:S('<path d="M12 1l2.5 8 8-2.5-5.5 6.5 5.5 6.5-8-2.5L12 23l-2.5-8-8 2.5L7 11 1.5 4.5l8 2.5z"/>'), // thorn burst: Barbs
 ward:S('<circle cx="12" cy="12" r="9"/>','<circle cx="12" cy="12" r="5" fill="none" stroke="#05070b" stroke-width="1.6"/>'), // bubble ward: Rebuff
 mending:S('<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z"/>'), // cross: Mending
 mightTmp:S('<path d="M12 22L3 10h6V2h6v8h6z"/>'), // down arrow: Might lost this turn
 rooted:S('<path d="M12 2v10M12 12c-3 0-6 3-7 10M12 12c3 0 6 3 7 10M12 12v10"/>','<path d="M12 2v10M12 12c-3 0-6 3-7 10M12 12c3 0 6 3 7 10M12 12v10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>')
};
const T=(n,kind,kw,dur)=>({n,kind,kw,dur});
const STATUS={
 str:T('Might','buff','Might','Stays until the end of combat.'),
 dex:T('Poise','buff','Poise','Stays until the end of combat.'),
 weak:T('Soaked','debuff','Soaked','Falls by 1 at the end of its owner\'s turn.'),
 vuln:T('Exposed','debuff','Exposed','Falls by 1 at the end of its owner\'s turn.'),
 brittle:T('Brittle','debuff','Brittle','Falls by 1 at the end of its owner\'s turn.'),
 bleed:T('Bleed','debuff','Bleed X','Falls by 1 each time the target is hit by an Attack.'),
 drench:T('Drenched','debuff','Drenched X','Falls by 1 at the end of its owner\'s turn.'),
 reson:T('Resonating','debuff','Resonating X','Falls by 1 at the end of its owner\'s turn.'),
 shell:T('Shell','buff','Shell X','Stays until the end of combat.'),
 barbs:T('Barbs','buff','Barbs X','Stays until the end of combat.'),
 ward:T('Rebuff','buff','Rebuff X','Each debuff it blocks uses up 1 stack.'),
 mending:T('Mending','buff','Mending X','Stays until the end of combat.'),
 mightTmp:T('Sapped','debuff',null,'Lasts until the end of its owner\'s next turn.')
};
const ORDER=Object.keys(STATUS);
export const GUARD_SVG='<svg class="sti" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1.5L2.5 5v8c0 6.5 4 11 9.5 13.5C17.500 24 21.500 19.500 21.500 13V5z" fill="currentColor" stroke="#05070b" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 4.5v19M5 9h14" fill="none" stroke="#05070b66" stroke-width="1"/></svg>';
export const STATUS_KEYS=ORDER;
export const statusInfo=k=>STATUS[k];
const PAINTED=new Set(['str','dex','weak','vuln','brittle','bleed','shell','barbs','ward','mending']); // statuses with real art in icons.json
function iconOf(k){const a=PAINTED.has(k)&&assetSrc('status',k);return a?`<img class="uic" src="${a}" alt="" draggable="false">`:ICON[k]}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const sentence=t=>{const s=(t||'').split(/(?<=[.!?])\s+/);return s.slice(0,2).join(' ')};
export function statusText(k,v){const d=STATUS[k];if(!d)return '';
 const rule=(d.kw&&(KW[d.kw]||KW[d.kw.replace(/ X$/,'')]))||(k==='mightTmp'?'Its Attacks deal less damage this turn.':'');
 return `${v>0?'×'+v+' ':'−'+Math.abs(v)+' '}${esc(sentence(rule))} Duration: ${esc(d.dur)}`}
export function statusRowHTML(st){const p=[];
 for(const k of ORDER){let v=st&&st[k];if(!v||!STATUS[k])continue;const d=STATUS[k];
  const bad=d.kind==='debuff'||(k==='str'&&v<0);
  p.push(`<span class="bd ${bad?'debuff':'buff'}" data-kw="${d.n}" data-sinfo="${esc(statusText(k,v))}" data-sname="${d.n}${v<0&&k==='str'?' (negative)':''}">${iconOf(k)}<b>${Math.abs(v)}</b></span>`)}
 return `<div class="badges">${p.join('')}</div>`}
// HP bar: bronze frame, blood fill, a ghost chunk for damage, a pale steel overlay while Guard is up, and the Guard shield on its left end.
export function barHTML(h,m,blk,sh,who){const pc=Math.max(0,Math.min(1,h/m)),low=pc<=.3;
 return `<div class="hpbar${blk?' blk':''}${low?' low':''}"${who!=null?` data-who="${who}" data-hp="${Math.max(0,h)}" data-max="${m}" data-blk="${blk||0}"`:''}><span class="hpin"><i class="gh" style="transform:scaleX(${pc})"></i><i style="transform:scaleX(${pc})"></i><em class="steel"></em></span><span class="hpnum">${Math.max(0,h)}<small>/${m}</small></span>${blk?`<span class="hpblk${sh?' shim':''}" ${sh?`style="${sh}"`:''} data-kw="Guard" data-sinfo="${esc('Absorbs '+blk+' damage. Duration: removed at the start of its owner\'s next turn.')}">${GUARD_SVG}<b>${blk}</b></span>`:''}</div>`}
