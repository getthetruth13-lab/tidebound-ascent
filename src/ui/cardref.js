// ui/cardref.js: card mentions. Wherever text names a specific card (card text, relics, potions, events, logs, rewards, Lamplight...)
// the name is highlighted in a themed style (.cref). Hover (mouse) or tap (touch) pops up the full rendered card, like keyword tips (ui/kwtip.js).
// Multi-word names match anywhere; one-word names (Note, Flotsam...) only mid-sentence, so ordinary capitalised words never light up.
// Names that are also glossary keywords (Parry, Advance...) stay keywords.
import {CARDS} from '../core/registry.js';
import {keywordNames,TEXT} from './kwtip.js';
let re=null,ids=null;
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function build(){const kw=new Set(keywordNames().map(k=>k.toLowerCase()));ids=new Map();const multi=[],single=[];
 for(const c of Object.values(CARDS)){if(!c.n||c.n.length<3||kw.has(c.n.toLowerCase())||ids.has(c.n))continue;ids.set(c.n,c.id);(c.n.includes(' ')?multi:single).push(c.n)}
 const by=(a,b)=>b.length-a.length;multi.sort(by);single.sort(by);
 const parts=[];if(multi.length)parts.push(`\\b(?:${multi.map(esc).join('|')})(?![\\w])`);if(single.length)parts.push(`(?<=[a-z,;:)] )(?:${single.map(esc).join('|')})(?![\\w-])`);
 re=new RegExp('('+parts.join('|')+')(\\+)?','gu')}
export const cardIdByName=n=>{if(!re)build();return ids.get(n)};
export function decorateCardRefs(root=document){if(!root.querySelectorAll)return;if(!re)build();
 for(const box of root.querySelectorAll(TEXT)){const own=box.closest('.card');const ownId=own&&own.dataset.id;const w=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);const hits=[];
  for(let n=w.nextNode();n;n=w.nextNode()){const p=n.parentElement;if(!p||p.closest('.cref,.kw,.name,.tb-btn'))continue;if(n.nodeValue.length>=3){re.lastIndex=0;if(re.test(n.nodeValue))hits.push(n)}re.lastIndex=0}
  for(const n of hits){const txt=n.nodeValue,f=document.createDocumentFragment();let last=0,any=false;re.lastIndex=0;
   for(let m;(m=re.exec(txt));){const id=ids.get(m[1]);if(!id||id===ownId)continue;if(m.index>last)f.append(txt.slice(last,m.index));
    const s=document.createElement('span');s.className='cref';s.dataset.card=id;s.dataset.up=m[2]?'1':'0';s.textContent=m[0];f.append(s);last=m.index+m[0].length;any=true}
   if(!any)continue;if(last<txt.length)f.append(txt.slice(last));re.lastIndex=0;n.replaceWith(f)}}}
// Cards a card's own text names (Discordant Strike -> Ringing). Explicit `refs:[ids]` on a card definition wins; otherwise
// the referenced ids are detected from the rules text with the same name matcher used for highlighting.
const refCache=new Map();let rre=null,rids=null,kwSet=null;
// Reference matcher covers every card name, including ones that double as glossary keywords (Note), so the pop-up can show the card itself.
function buildRefs(){kwSet=new Set(keywordNames().map(k=>k.toLowerCase()));rids=new Map();const multi=[],single=[];for(const c of Object.values(CARDS)){if(!c.n||c.n.length<3||rids.has(c.n))continue;rids.set(c.n,c.id);(c.n.includes(' ')?multi:single).push(c.n)}
 const by=(a,b)=>b.length-a.length;multi.sort(by);single.sort(by);const parts=[];
 if(multi.length)parts.push(`\\b(?:${multi.map(esc).join('|')})(?![\\w])`);if(single.length)parts.push(`(?<=[a-z0-9,;:)] )(?:${single.map(esc).join('|')})s?(?![\\w-])`);
 rre=new RegExp('('+parts.join('|')+')','gu')}
export function cardRefs(id){if(refCache.has(id))return refCache.get(id);const d=CARDS[id];if(!d)return [];if(!rre)buildRefs();
 let out=Array.isArray(d.refs)?d.refs.filter(r=>CARDS[r]&&r!==id):[];
 if(!d.refs){const txt=String(d.d||'').replace(/\{([^|}]*)\|[^}]*\}/g,'$1').replace(/<[^>]+>/g,' ');rre.lastIndex=0;
  for(let m;(m=rre.exec(txt));){const r=rids.get(m[1])||rids.get(m[1].replace(/s$/,''));if(!r||r===id||out.includes(r))continue;
   // A name that is also a glossary keyword (Note, Parry, Flotsam) counts only when this sentence creates that card.
   if(kwSet.has(CARDS[r].n.toLowerCase())){const sent=txt.slice(0,m.index).split(/[.!?]\s/).pop();if(!/\b(add|adds|create|creates|becomes|shuffle|shuffles)\b/i.test(sent)||/\b(Waypoint|random)\b/i.test(sent.slice(-12)))continue}
   out.push(r)}rre.lastIndex=0}
 refCache.set(id,out);return out}
