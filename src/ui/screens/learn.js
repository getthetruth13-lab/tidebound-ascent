// ui/screens/learn.js: Learn to Play / How to Play. One guide, two doors: the title menu (framed screen) and Settings > How to Play
// (an overlay on top of the run, so a fight or map is never touched and you return to it exactly as it was).
// Pages: general systems (data/howto.js GENERAL), then one page per hero (HEROES_GUIDE: meter, example turn with real cards, pairings,
// mistakes, how to win). The first page also keeps the intro replay; every page can Reset hints (ui/hints.js).
import {glyph} from '../glyphs.js';
import {W} from '../../core/state.js';
import {CLASSES,RELICS} from '../../core/registry.js';
import {render,TH,cardHTML} from '../render.js';
import {HEROES,ORDER} from './heroes.js';
import {bgHTML,frameOpen,frameClose} from './frame.js';
import {spriteImg} from './select.js';
import {introStart} from './intro.js';
import {intentIcon} from '../intent-icons.js';
import {resetHints} from '../hints.js';
import {GENERAL,HEROES_GUIDE,HOWTO_PAGES} from '../../data/howto.js';
import {LEARN_HEDGE} from '../../data/lore.js';
export const LEARN_PAGES=HOWTO_PAGES.length;
// ---- small painted-style diagrams (inline SVG, palette colours only; no new art files) ----
const GOLD='#d9b46a',TEAL='#3fb4b0',DIM='#8a7440',INK='#0d1016';
const svg=(w,h,b)=>`<svg class="hw-art" viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true">${b}</svg>`;
const DIAGRAMS={
 tide:()=>svg(210,92,`<rect x="14" y="6" width="22" height="80" rx="4" fill="${INK}" stroke="${DIM}"/><rect x="16" y="26" width="18" height="58" rx="3" fill="${TEAL}" opacity=".75"/><path d="M42 6h8M42 86h8M42 38h8M42 54h8" stroke="${GOLD}"/><text x="56" y="10" class="t">10 Crest: 16 to ALL</text><text x="56" y="42" class="t">6+ High Tide</text><text x="56" y="58" class="t">4- Low Tide</text><text x="56" y="90" class="t">0 Undertow: 18 Guard + draw</text><path d="M200 60v-26m0 0l-5 7m5-7l5 7" stroke="${GOLD}" stroke-width="2" fill="none"/><text x="168" y="74" class="t">arrow</text>`),
 echo:()=>svg(210,92,[0,1,2].map(i=>`<rect x="${10+i*62}" y="14" width="48" height="66" rx="5" fill="${INK}" stroke="${i===0?GOLD:DIM}" stroke-width="${i===0?2:1}"/>`).join('')+`<text x="14" y="10" class="t">first card: Marked</text><path d="M34 34c-4 4-4 10 0 14h8c4-4 4-10 0-14z" fill="${GOLD}"/><text x="14" y="70" class="t">plays</text><text x="76" y="70" class="t">then</text><text x="138" y="70" class="t">then</text><text x="14" y="90" class="t">End of turn: Marked card Echoes free (+1)</text>`),
 carto:()=>svg(210,92,[0,1,2].map(i=>{const r=[3,1,0][i],x=12+i*66;return `<rect x="${x}" y="10" width="54" height="52" rx="5" fill="${INK}" stroke="${i===2?DIM:GOLD}" stroke-dasharray="${i===2?'3 3':'0'}"/>${i===2?'<text x="'+(x+6)+'" y="40" class="t">empty</text>':`<path d="M${x+14} 54h26l-5-10h-16zM${x+19} 44h16l-3-9h-10z" fill="${GOLD}" opacity=".8"/>`}${[0,1,2].map(k=>`<circle cx="${x+14+k*13}" cy="70" r="3.5" fill="${k<r?GOLD:'none'}" stroke="${DIM}"/>`).join('')}`}).join('')+`<text x="12" y="88" class="t">3 slots. Rank pips: Advance +1. Rank 3 = Landmark.</text>`),
 duel:()=>svg(210,92,`<rect x="14" y="40" width="150" height="8" rx="3" fill="${INK}" stroke="${DIM}"/>`+[0,1,2,3,4].map(i=>`<rect x="${20+i*28}" y="36" width="12" height="16" rx="2" fill="${i<3?GOLD:'none'}" stroke="${GOLD}"/>`).join('')+`<path d="M164 44l30-5-8 5 8 5z" fill="${GOLD}"/><text x="14" y="22" class="t">Momentum 0-5: +1 per Attack</text><text x="14" y="72" class="t">2+: Flourish = x2 up to x3.5</text><path d="M62 52v8" stroke="${GOLD}"/>`),
 map:()=>svg(210,70,`<path d="M20 36L70 14M20 36L70 56M70 14L120 36M70 56L120 36M120 36L170 36" stroke="${DIM}" fill="none"/>`+[[20,36,'⚔️'],[70,14,'❓'],[70,56,'🔥'],[120,36,'💀'],[170,36,'🔔']].map(([x,y,t])=>`<circle cx="${x}" cy="${y}" r="11" fill="${INK}" stroke="${GOLD}"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="11">${t}</text>`).join(''))
};
const cardsRow=(ids,k=0)=>`<div class="hw-cards">${ids.map((id,i)=>`<div class="hw-card">${cardHTML({id,uid:-9100-k-i,up:false})}</div>`).join('')}</div>`;
const intentsGrid=l=>`<div class="hw-ints">${l.map(([k,t])=>`<div class="hw-int"><span class="hw-ic">${intentIcon(k)}</span><span>${t}</span></div>`).join('')}</div>`;
const block=b=>`<section class="hw-b"><h3>${b.h}</h3><p>${b.html}</p>${b.cards?cardsRow(b.cards):''}${b.intents?intentsGrid(b.intents):''}${b.art?DIAGRAMS[b.art]():''}</section>`;
function genPage(id){const g=GENERAL.find(x=>x.id===id);
 return `<div class="hw-head"><h2>${g.title}</h2><span class="tb-epi">${g.epi}</span></div><div class="hw-grid">${g.blocks.map(block).join('')}</div>${id==='climb'?`<p class="hw-lore">${LEARN_HEDGE}</p><button class="tb-btn sm" id="replayintro" onclick="introStart(true)">▶ Replay intro</button>`:''}`}
const pair=([ids,t],i)=>`<div class="hw-pair">${cardsRow(ids,200+i*3)}<p>${t}</p></div>`;
function heroPage(k){const K=CLASSES[k],H=HEROES[k],G=HEROES_GUIDE[k],R=RELICS[K.relic],E=G.example;
 const kept=new Set(G.start||[]);void kept;
 return `<div class="hw-hero theme-${TH[k]}"><div class="hw-hhead">${spriteImg(k,'hw-spr')}<div><h2>${K.n}</h2><div class="tb-epi">${K.tag}</div>${R?`<div class="tb-rel"><b>${R.n}</b>: ${R.d}</div>`:''}</div></div>
 <div class="hw-grid">
 <section class="hw-b hw-meter"><h3>${G.meter.h}</h3><p>${G.meter.html}</p>${DIAGRAMS[G.meter.art]()}</section>
 <section class="hw-b"><h3>How it works</h3><ul class="hw-list">${G.flow.map(t=>`<li>${t}</li>`).join('')}</ul></section>
 <section class="hw-b hw-ex"><h3>${E.h}</h3>${cardsRow(E.cards,100)}<ol class="hw-steps">${E.steps.map(t=>`<li>${t}</li>`).join('')}</ol><p class="hw-res"><b>Result:</b> ${E.result}</p></section>
 <section class="hw-b"><h3>Best card pairings</h3>${G.pairs.map(pair).join('')}</section>
 <section class="hw-b hw-bad"><h3>Common mistakes</h3><ul class="hw-list">${G.mistakes.map(t=>`<li>${t}</li>`).join('')}</ul></section>
 <section class="hw-b hw-win"><h3>How to win with ${K.n}</h3><ul class="hw-list">${G.win.map(t=>`<li>${t}</li>`).join('')}</ul></section>
 </div></div>`}
export function guidePageHTML(n){const p=HOWTO_PAGES[Math.max(0,Math.min(LEARN_PAGES-1,n|0))];return p.kind==='gen'?genPage(p.id):heroPage(p.id)}
const tabs=(n,fn)=>`<span class="tb-dots hw-tabs" role="tablist">${HOWTO_PAGES.map((p,i)=>`<button role="tab" aria-selected="${i===n}" class="${i===n?'on':''}${p.kind==='hero'?' hero':''}" data-page="${i}" onclick="${fn}(${i})">${p.tab}</button>`).join('')}</span>`;
const resetBtn=()=>`<button class="tb-btn sm hw-reset" id="resethints" onclick="resetHints()" title="Show every first-time hint and the first-fight guide again">${W.S&&W.S.hintsReset?'Hints reset ✓':'Reset hints'}</button>`;
// ---- title menu door ----
export function learnScr(){const n=Math.max(0,Math.min(LEARN_PAGES-1,W.S.page|0));
 return `<div class="tb-scr tb-learn">${bgHTML()}<div class="tb-ov"><div class="tb-frame tb-lwin hw-win" id="learnwin">${frameOpen()}<div class="tb-lpage hw-page">${guidePageHTML(n)}</div>
 <div class="tb-lnav hw-nav"><button class="tb-btn sm" id="learnprev" onclick="learnPage(${n-1})" ${n?'':'disabled'}>${glyph('undo')}<span>Prev</span></button>
 ${tabs(n,'learnPage')}${resetBtn()}
 ${n<LEARN_PAGES-1?`<button class="tb-btn sm pri" id="learnnext" onclick="learnPage(${n+1})">Next</button>`:`<button class="tb-btn sm pri" id="learndone" onclick="titleGo('main')">Done</button>`}</div>
 <button class="tb-x" aria-label="Close" onclick="titleGo('main')">${glyph('cross')}</button>${frameClose()}</div></div></div>`}
export function learnPage(n){if(n<0||n>=LEARN_PAGES)return;W.S={...W.S,screen:'title',view:'learn',page:n};render();fitTabs()}
// ---- Settings door: an overlay over the run (W.S.ov==='learn'). Nothing about the run or the fight is changed. ----
export function learnOverlayHTML(){const n=Math.max(0,Math.min(LEARN_PAGES-1,W.S.learnPage|0));
 return `<div class="ov hw-ov" id="ovl"><div class="box plain hw-box" id="howto" role="dialog" aria-label="How to Play"><div class="hw-bar"><h2>How to Play</h2>${tabs(n,'learnOvPage')}<button class="hw-close" id="howtoclose" aria-label="Close How to Play" onclick="learnClose()">${glyph('cross')}</button></div>
 <div class="hw-page" id="howtopage">${guidePageHTML(n)}</div>
 <div class="hw-nav"><button class="btn sm" id="learnprev" onclick="learnOvPage(${n-1})" ${n?'':'disabled'}>Prev</button>${resetBtn()}<button class="btn sm" id="howtoback" onclick="learnClose()">Back to the game</button>${n<LEARN_PAGES-1?`<button class="btn sm pri" id="learnnext" onclick="learnOvPage(${n+1})">Next</button>`:`<button class="btn sm pri" id="learndone" onclick="learnClose()">Done</button>`}</div></div></div>`}
export function fitTabs(){const t=document.querySelector('.hw-tabs'),on=t&&t.querySelector('.on');if(on)t.scrollLeft=Math.max(0,on.offsetLeft-t.clientWidth/2+on.offsetWidth/2)}
export function learnOvPage(n){if(n<0||n>=LEARN_PAGES)return;W.S.learnPage=n;render();const p=document.getElementById('howtopage');if(p)p.scrollTop=0;fitTabs()}
export function learnClose(){W.S.ov=null;W.S.hintsReset=false;render()}
// Settings > How to Play. On the title it is the normal Learn page; in a run it opens the overlay (settings closes, the run stays as it was).
export function openHowTo(){if(W.S.screen==='title'||!W.run){W.S={screen:'title',view:'learn',page:0,hero:null};return render()}
 W.S.ov='learn';W.S.learnPage=W.S.learnPage|0;W.S.hintsReset=false;render();fitTabs()}
export {resetHints};
