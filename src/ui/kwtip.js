// ui/kwtip.js: keyword tooltips. After every render, keywords and statuses in card, relic, potion, event and tip text
// are underlined; tap / long-press (touch) or hover (mouse) shows a small themed popup with a 1-2 line rule.
// The list is built from the KW glossary (data/keywords.js), so new keywords appear automatically.
import {KW,CARDS,RELICS} from '../core/registry.js';
import {cardHTML,fitCards,relicCollectionHTML,inspectKeywordsHTML,placeInspectKeywords} from './render.js';
import {pickSpot} from './place.js';
import {relicFlavour} from '../data/lore.js';
const EXTRA={ // statuses and terms the glossary spreads across other entries
 Landmark:'A Waypoint at Rank 3. Landmarks count twice for Expedition cards.',
 Rooted:'At the end of each of her turns, she gains 3 Guard per living Tendril.'};
import {buildMatcher} from './kwmatch.js';
let names=null,re=null,canon=null;
function build(){({names,re,canon}=buildMatcher(KW,EXTRA))}
export const keywordNames=()=>{if(!names)build();return [...names.keys()]};
// 1-2 short sentences of the glossary entry: popups stay small.
export function shortText(term){if(!names)build();const t=names.get(term)||'';const s=t.split(/(?<=[.!?])\s+/);let out=s[0]||'';
 if(s[1]&&(out+' '+s[1]).length<=190)out+=' '+s[1];return out}
export const TEXT='.card .text,.tip .desc,.tip .kws,.ikw,.pop,.rrow .rd,.evtxt p,.evdesc,.evo .es,.msgp p,.tb-mech p,.tb-rule,.tb-lbody p,.tb-lbody li,.tb-rel,.tb-cols p,.tb-lore p,.tsum,.tcap,#kwtip .sx,.log div,.toast,.lp-hint,.lp-task b,.lp-tsk,.lp-lines td:first-child,.lp-story,.lp-nxt,#kwtip > span,#kwtip .itip span';
export function decorateKeywords(root=document){if(!root.querySelectorAll)return;if(!names)build();
 for(const box of root.querySelectorAll(TEXT)){const w=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);const hits=[];
  for(let n=w.nextNode();n;n=w.nextNode()){const p=n.parentElement;if(!p||p.closest('.kw,.cref,.tb-btn,.flav')||p.closest('button:not(.rrow)'))continue;if(n.nodeValue.length>=3&&re.test(n.nodeValue))hits.push(n);re.lastIndex=0}
  for(const n of hits){const txt=n.nodeValue,f=document.createDocumentFragment();let last=0;re.lastIndex=0;
   for(let m;(m=re.exec(txt));){if(m.index>last)f.append(txt.slice(last,m.index));const s=document.createElement('span');s.className='kw';s.dataset.kw=canon(m);s.textContent=m[0];f.append(s);last=m.index+m[0].length}
   if(last<txt.length)f.append(txt.slice(last));re.lastIndex=0;n.replaceWith(f)}}
 // Native title bubbles are replaced by the themed popup (hover on desktop, long-press on shop items).
 for(const el of root.querySelectorAll('.shopicon[title],.relic[title],.potion[title]')){el.dataset.info=el.getAttribute('title');el.removeAttribute('title')}
 for(const el of root.querySelectorAll('[data-kw][title]'))el.removeAttribute('title')}
// ---------------- popup ----------------
let tip=null,ctip=null,timer=0,anchor=null,shownAt=0;
function ensure(){if(!tip){tip=document.createElement('div');tip.id='kwtip';tip.setAttribute('role','tooltip');document.body.appendChild(tip)}return tip}
export function hideTip(){clearTimeout(timer);anchor=null;if(tip)tip.classList.remove('on');if(ctip)ctip.classList.remove('on')}
function contentOf(el){if(el.dataset.sinfo)return {title:el.dataset.sname||el.dataset.kw,text:el.dataset.sinfo,kind:el.dataset.skind||''};if(el.dataset.kw){const k=el.dataset.kw;return {title:k,text:shortText(k)||KW[k]||KW[k+' X']||''}}
 if(el.dataset.info){const i=el.dataset.info,c=i.indexOf(': ');return c>0?{title:i.slice(0,c),text:i.slice(c+2)}:{title:'',text:i}}return null}
function showCard(el){const id=el.dataset.card;if(!CARDS[id])return false;
 if(!ctip){ctip=document.createElement('div');ctip.id='cardtip';ctip.setAttribute('role','tooltip');document.body.appendChild(ctip)}
 if(tip)tip.classList.remove('on');
 const ci={id,uid:-900,up:el.dataset.up==='1'};ctip.innerHTML=cardHTML(ci,{full:true})+`<div class="inspect-keywords">${inspectKeywordsHTML(ci)}</div>`;ctip.classList.add('on');fitCards(ctip);anchor=el;shownAt=Date.now();
 const r=el.getBoundingClientRect(),tr=ctip.getBoundingClientRect();const sp=pickSpot(tr.width,tr.height,r,el);const x=sp.x,y=sp.y;
 ctip.style.left=x+'px';ctip.style.top=y+'px';placeInspectKeywords(ctip);clearTimeout(timer);timer=el.closest('.dais')?0:setTimeout(hideTip,6500);return true}
// Choice tips use the whole plate as their anchor, including its nested info button.
const CHOICES='.tile,.evo,.camptiles > *, .lp-pick,.lp-tile';
function besideChoice(el,tr){
 const tile=el.closest(CHOICES);if(!tile)return null;
 const r=tile.getBoundingClientRect(),pad=6,gap=8;
 if(tr.width>innerWidth-pad*2||tr.height>innerHeight-pad*2)return null;
 const choices=[...document.querySelectorAll(CHOICES)].filter(e=>e!==tile&&!tile.contains(e)&&!e.contains(tile)).map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);
 const clamp=y=>Math.max(pad,Math.min(innerHeight-tr.height-pad,y));
 for(const x of [r.right+gap,r.left-tr.width-gap]){
  if(x<pad||x+tr.width>innerWidth-pad)continue;
  // Move vertically only when another option occupies the preferred side.
  const ys=[clamp(r.top+(r.height-tr.height)/2),...choices.flatMap(q=>[clamp(q.top-tr.height-gap),clamp(q.bottom+gap)])];
  for(const y of ys)if(!choices.some(q=>x<q.right&&x+tr.width>q.left&&y<q.bottom&&y+tr.height>q.top))return {x,y};
 }
 return null;
}
export function showTip(el){if(el.dataset.card)return showCard(el);if(ctip)ctip.classList.remove('on');const c=contentOf(el);if(!c||!c.text){return false}
 const t=ensure();const sl=el.matches('.relic,.potion,.shopicon')&&el.querySelector('.slot');const rl=el.dataset.relic&&RELICS[el.dataset.relic];
 t.innerHTML=sl?`<div class="itip"><div class="itipart">${sl.outerHTML.replace('class="slot','class="slot itemart')}</div><div>${c.title?`<b>${c.title}</b>`:''}<span>${c.text}</span>${rl&&rl.flavour?`<em class="flav">${relicFlavour(rl.id,rl.flavour)}</em>`:''}</div></div>`:`${c.title?`<b${c.kind?` class="${c.kind}"`:''}>${c.title}</b>`:''}<span>${c.text}</span>`;if(el.matches('.relic-more'))t.innerHTML=`<div class="relic-collection"><h2>Relics</h2>${relicCollectionHTML()}</div>`;decorateKeywords(t);t.classList.toggle('meter-tip',!!el.closest('.dais'));t.classList.toggle('item',!!sl);t.classList.toggle('stat',!!c.kind);if(c.kind)decorateKeywords(t);t.classList.add('on');anchor=el;shownAt=Date.now();
 const meter=!!el.closest('.dais');t.style.maxWidth=meter?'150px':'';const r=el.getBoundingClientRect();let x,y;
 if(document.querySelector('.combat')){let best=null;
  for(const width of meter?[150,130,170,200,230,260]:[null]){if(width)t.style.maxWidth=width+'px';const tr=t.getBoundingClientRect(),sp=pickSpot(tr.width,tr.height,r,el,!!c.kind||meter);if(!best||sp.s<best.s){best={...sp,width};if(sp.s===0)break}}
  if(meter)t.style.maxWidth=best.width+'px';x=best.x;y=best.y;
 }else{const tr=t.getBoundingClientRect(),side=meter?null:besideChoice(el,tr);if(side){x=side.x;y=side.y}else{x=Math.max(6,Math.min(innerWidth-tr.width-6,r.left+r.width/2-tr.width/2));y=r.top-tr.height-8;if(y<6)y=Math.min(innerHeight-tr.height-6,r.bottom+8)}}
 t.style.left=x+'px';t.style.top=y+'px';clearTimeout(timer);timer=el.closest('.dais')?0:setTimeout(hideTip,6500);return true}
// ---------------- input ----------------
const LP=450;let lp=null,eat=false,holdEl=null; // holdEl: status icon being held; its tooltip closes on release
const find=e=>e.target&&e.target.closest?e.target.closest('[data-kw],[data-card],[data-info]'):null;
const inHand=el=>!!el.closest('.hand .card'); // hand cards: a tap must lift/play the card; hold opens the inspector, where words are tappable
const inButton=el=>!!el.closest('button');
document.addEventListener('click',e=>{if(eat){eat=false;e.stopPropagation();e.preventDefault();return}
 const el=find(e);const ref=el&&(el.dataset.kw||el.dataset.card);
 if(el&&el.closest('.dais')&&!el.closest('button')){hideTip();e.stopPropagation();e.preventDefault();return}
 if(el&&el.matches('.lp-node,.nmf,.wrenline,.dais [data-info]:not(button)')){if(anchor===el&&tip.classList.contains('on'))hideTip();else showTip(el);e.stopPropagation();e.preventDefault();return}
 if(!ref){const on=(tip&&tip.classList.contains('on'))||(ctip&&ctip.classList.contains('on'));if(on&&!(e.target.closest&&e.target.closest('#kwtip,#cardtip')))hideTip();return}
 if(inHand(el)||inButton(el)||(el.closest('.card')&&!el.closest('#inspect,#cardtip')))return hideTip();
 const open=anchor===el&&((tip&&tip.classList.contains('on'))||(ctip&&ctip.classList.contains('on')));if(open&&Date.now()-shownAt>400){hideTip()}else if(open){/* hover just opened it */}else showTip(el);
 e.stopPropagation();e.preventDefault()},true);
document.addEventListener('pointerdown',e=>{if(lp){clearTimeout(lp.t);lp=null}if(e.pointerType==='mouse'&&e.button>0)return;
 const el=find(e);if(!el||inHand(el))return;const ok=el.matches('.bd,.hpblk')?e.pointerType!=='mouse':(el.dataset.kw||el.dataset.card)?inButton(el):el.matches('.relic,.potion,.shopicon,.tile,.evo,.rl,.lp-node,.nmf,.wrenline,.dais [data-info]');if(!ok)return;
 lp={x:e.clientX,y:e.clientY,t:setTimeout(()=>{lp=null;if(showTip(el)){eat=true;holdEl=el;clearTimeout(timer)}},LP)}},true);
document.addEventListener('pointermove',e=>{if(lp&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10){clearTimeout(lp.t);lp=null}},true);
const release=()=>{if(holdEl){holdEl=null;hideTip()}};
document.addEventListener('touchmove',e=>{if(holdEl)e.preventDefault()},{passive:false});
document.addEventListener('pointercancel',()=>{release();if(lp){clearTimeout(lp.t);lp=null}},true);
document.addEventListener('pointerup',()=>{release();if(lp){clearTimeout(lp.t);lp=null}setTimeout(()=>{eat=false},350)},true);
document.addEventListener('contextmenu',e=>{const el=find(e);if(el&&el.matches('.shopicon,.tile,.evo,.lp-node,.bd,.hpblk'))e.preventDefault()});
document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const el=find(e);if(el&&!el.contains(e.relatedTarget))showTip(el)});
document.addEventListener('pointerout',e=>{if(e.pointerType!=='mouse'||holdEl)return;const el=find(e);if(el&&!el.contains(e.relatedTarget))hideTip()});
addEventListener('scroll',()=>{if(!holdEl)hideTip()},true);

document.addEventListener('focusin',e=>{const el=find(e);if(el&&el.matches('.bd,.hpblk,.intent')&&el.matches(':focus-visible'))showTip(el)}); // keyboard focus only: a touch release must not reopen the hold tip
document.addEventListener('focusout',e=>{if(e.target.matches('.bd,.hpblk,.intent'))hideTip()});
