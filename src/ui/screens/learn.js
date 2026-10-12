// ui/screens/learn.js: Learn to Play. Two pages of core rules, then one page per class (mechanic text from the class-select data).
import {glyph} from '../glyphs.js';
import {W} from '../../core/state.js';
import {CLASSES,RELICS} from '../../core/registry.js';
import {render,TH} from '../render.js';
import {HEROES,ORDER} from './heroes.js';
import {bgHTML,frameOpen,frameClose} from './frame.js';
import {spriteImg} from './select.js';
import {introStart} from './intro.js';
import {LEARN_HEDGE,LEARN_LAMPLIGHT} from '../../data/lore.js';
const CORE=[
 ['The climb','Climb 15 floors of the Wrack Terraces, the foot of the Drowned Stair, along the Tidewater Chart: fights, elites, events, merchants and camps. A boss waits at the top. '+LEARN_HEDGE],
 ['Your turn','Normally, each turn refreshes 3 Energy and draws 5 cards (4 for the Cartographer). Tap a card to lift it. Drag Attacks onto an enemy; drag Skills and Powers onto yourself or up into the battlefield. Release back over the hand to cancel. Hold a card to enlarge it.'],
 ['Guard and intents','Guard soaks damage and fades at the start of your turn. Above each enemy, an intent shows what it will do next, so you can plan your defence.'],
 ['Rewards','Won fights give gold and a choice of three cards. Elites also drop a relic, and a potion sometimes drops. Skipping a card is allowed: a lean deck is a strong deck.'],
 ['Underlined words','Tap or hold any underlined word on a card, relic or potion for a quick explanation.'],
 LEARN_LAMPLIGHT];
const CORE_PAGES=[CORE.slice(0,3),CORE.slice(3)];
export const LEARN_PAGES=CORE_PAGES.length+ORDER.length;
function pageHTML(n){
 if(n<CORE_PAGES.length)return `<div class="tb-lhead"><h2>The Basics</h2><div class="tb-epi">${n?'Rewards, words and the lamp':'How a climb works'}</div></div><div class="tb-cols">${CORE_PAGES[n].map(([h,t])=>`<section><h3>${h}</h3><p>${t}</p></section>`).join('')}</div>${n===CORE_PAGES.length-1?'<button class="tb-btn sm" id="replayintro" onclick="introStart(true)">▶ Replay intro</button>':''}`;
 const k=ORDER[n-CORE_PAGES.length],K=CLASSES[k],H=HEROES[k],R=RELICS[K.relic];
 return `<div class="tb-lclass theme-${TH[k]}">${spriteImg(k,'tb-lspr')}<div class="tb-lbody"><h2>${K.n}</h2><div class="tb-epi">${K.tag}</div>
 <p class="tb-rule">${K.rule}</p>${R?`<div class="tb-rel"><b>${R.n}</b>: ${R.d}</div>`:''}<ul>${H.tips.map(t=>`<li>${t}</li>`).join('')}</ul></div></div>`}
export function learnScr(){const n=Math.max(0,Math.min(LEARN_PAGES-1,W.S.page|0));
 return `<div class="tb-scr tb-learn">${bgHTML()}<div class="tb-ov"><div class="tb-frame tb-lwin" id="learnwin">${frameOpen()}<div class="tb-lpage">${pageHTML(n)}</div>
 <div class="tb-lnav"><button class="tb-btn sm" id="learnprev" onclick="learnPage(${n-1})" ${n?'':'disabled'}>${glyph('undo')}<span>Prev</span></button>
 <span class="tb-dots">${Array.from({length:LEARN_PAGES},(_,i)=>`<button class="${i===n?'on':''}" aria-label="Page ${i+1}" onclick="learnPage(${i})"></button>`).join('')}</span>
 ${n<LEARN_PAGES-1?`<button class="tb-btn sm pri" id="learnnext" onclick="learnPage(${n+1})">Next</button>`:`<button class="tb-btn sm pri" id="learndone" onclick="titleGo('main')">Done</button>`}</div>
 <button class="tb-x" aria-label="Close" onclick="titleGo('main')">${glyph('cross')}</button>${frameClose()}</div></div></div>`}
export function learnPage(n){if(n<0||n>=LEARN_PAGES)return;W.S={...W.S,screen:'title',view:'learn',page:n};render()}
