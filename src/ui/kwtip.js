// ui/kwtip.js: keyword tooltips. After every render, keywords and statuses in card, relic, potion, event and tip text
// are underlined; tap / long-press (touch) or hover (mouse) shows a small themed popup with a 1-2 line rule.
// The list is built from the KW glossary (data/keywords.js), so new keywords appear automatically.
import {KW} from '../core/registry.js';
const EXTRA={ // statuses and terms the glossary spreads across other entries
 Landmark:'A Waypoint at Rank 3. Landmarks count twice for Expedition cards.',
 Rooted:'At the end of each of her turns, gains 4 Guard per living Tendril.'};
let names=null,re=null;
const clean=k=>k.replace(/\s+X$/,'');
function build(){const m=new Map();
 for(const [k,v] of Object.entries(KW)){if(/[()]/.test(k))continue;const n=clean(k);if(n.length>=3&&typeof v==='string')m.set(n,v)}
 for(const [k,v] of Object.entries(EXTRA))if(v)m.set(k,v);
 names=m;const list=[...m.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 re=new RegExp('\\b('+list.join('|')+')(?:s|es|ed|ing)?\\b','g')}
export const keywordNames=()=>{if(!names)build();return [...names.keys()]};
// 1-2 short sentences of the glossary entry: popups stay small.
export function shortText(term){if(!names)build();const t=names.get(term)||'';const s=t.split(/(?<=[.!?])\s+/);let out=s[0]||'';
 if(s[1]&&(out+' '+s[1]).length<=190)out+=' '+s[1];return out}
const TEXT='.card .text,.tip .desc,.tip .kws,.ikw,.pop,.rrow .rd,.evtxt p,.msgp p,.tb-mech p,.tb-rule,.tb-lbody p,.tb-lbody li,.tb-rel,.tb-cols p,.tb-lore p';
export function decorateKeywords(root=document){if(!root.querySelectorAll)return;if(!names)build();
 for(const box of root.querySelectorAll(TEXT)){const w=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);const hits=[];
  for(let n=w.nextNode();n;n=w.nextNode()){const p=n.parentElement;if(!p||p.closest('.kw,.tb-btn')||p.closest('button:not(.rrow)'))continue;if(n.nodeValue.length>=3&&re.test(n.nodeValue))hits.push(n);re.lastIndex=0}
  for(const n of hits){const txt=n.nodeValue,f=document.createDocumentFragment();let last=0;re.lastIndex=0;
   for(let m;(m=re.exec(txt));){if(m.index>last)f.append(txt.slice(last,m.index));const s=document.createElement('span');s.className='kw';s.dataset.kw=m[1];s.textContent=m[0];f.append(s);last=m.index+m[0].length}
   if(last<txt.length)f.append(txt.slice(last));re.lastIndex=0;n.replaceWith(f)}}
 // Native title bubbles are replaced by the themed popup (hover on desktop, long-press on shop items).
 for(const el of root.querySelectorAll('.shopicon[title],.relic[title],.potion[title]')){el.dataset.info=el.getAttribute('title');el.removeAttribute('title')}
 for(const el of root.querySelectorAll('[data-kw][title]'))el.removeAttribute('title')}
// ---------------- popup ----------------
let tip=null,timer=0,anchor=null,shownAt=0;
function ensure(){if(!tip){tip=document.createElement('div');tip.id='kwtip';tip.setAttribute('role','tooltip');document.body.appendChild(tip)}return tip}
export function hideTip(){clearTimeout(timer);anchor=null;if(tip)tip.classList.remove('on')}
function contentOf(el){if(el.dataset.kw){const k=el.dataset.kw;return {title:k,text:shortText(k)||KW[k]||KW[k+' X']||''}}
 if(el.dataset.info){const i=el.dataset.info,c=i.indexOf(': ');return c>0?{title:i.slice(0,c),text:i.slice(c+2)}:{title:'',text:i}}return null}
export function showTip(el){const c=contentOf(el);if(!c||!c.text){return false}
 const t=ensure();t.innerHTML=`${c.title?`<b>${c.title}</b>`:''}<span>${c.text}</span>`;t.classList.add('on');anchor=el;shownAt=Date.now();
 const r=el.getBoundingClientRect(),W=innerWidth,H=innerHeight,tr=t.getBoundingClientRect();
 let x=r.left+r.width/2-tr.width/2;x=Math.max(6,Math.min(W-tr.width-6,x));
 let y=r.top-tr.height-8;if(y<6)y=Math.min(H-tr.height-6,r.bottom+8);
 t.style.left=x+'px';t.style.top=y+'px';clearTimeout(timer);timer=setTimeout(hideTip,6500);return true}
// ---------------- input ----------------
const LP=450;let lp=null,eat=false;
const find=e=>e.target&&e.target.closest?e.target.closest('[data-kw],[data-info]'):null;
const inHand=el=>!!el.closest('.hand .card'); // hand cards: a tap must lift/play the card; hold opens the inspector, where words are tappable
const inButton=el=>!!el.closest('button');
document.addEventListener('click',e=>{if(eat){eat=false;e.stopPropagation();e.preventDefault();return}
 const el=find(e);if(!el||!el.dataset.kw){if(tip&&tip.classList.contains('on')&&!(e.target.closest&&e.target.closest('#kwtip')))hideTip();return}
 if(inHand(el)||inButton(el))return hideTip();
 if(anchor===el&&tip.classList.contains('on')&&Date.now()-shownAt>400){hideTip()}else if(anchor===el&&tip.classList.contains('on')){/* hover just opened it */}else showTip(el);
 e.stopPropagation();e.preventDefault()},true);
document.addEventListener('pointerdown',e=>{if(lp){clearTimeout(lp.t);lp=null}if(e.pointerType==='mouse'&&e.button>0)return;
 const el=find(e);if(!el||inHand(el))return;const ok=el.dataset.kw?inButton(el):el.matches('.shopicon');if(!ok)return;
 lp={x:e.clientX,y:e.clientY,t:setTimeout(()=>{lp=null;if(showTip(el))eat=true},LP)}},true);
document.addEventListener('pointermove',e=>{if(lp&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10){clearTimeout(lp.t);lp=null}},true);
document.addEventListener('pointerup',()=>{if(lp){clearTimeout(lp.t);lp=null}setTimeout(()=>{eat=false},350)},true);
document.addEventListener('contextmenu',e=>{const el=find(e);if(el&&el.matches('.shopicon'))e.preventDefault()});
document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const el=find(e);if(el&&!el.contains(e.relatedTarget))showTip(el)});
document.addEventListener('pointerout',e=>{if(e.pointerType!=='mouse')return;const el=find(e);if(el&&!el.contains(e.relatedTarget))hideTip()});
addEventListener('scroll',hideTip,true);
