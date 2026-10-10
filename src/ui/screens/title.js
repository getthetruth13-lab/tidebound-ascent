// ui/screens/title.js: the launch screen and its sub-views (main menu, Load Game, Options, Learn to Play, character select).
// View lives in W.S.view ('main' by default, so older code that sets W.S={screen:'title'} lands on the menu).
import {W} from '../../core/state.js';
import {CLASSES} from '../../core/registry.js';
import {settings,saveSettings,loadRunData,continueRun,clearRun} from '../../save.js';
import {render,settingsHTML} from '../render.js';
import {bgHTML,frameOpen,frameClose} from './frame.js';
import {selectScr} from './select.js';
import {learnScr} from './learn.js';
import {introScr,newGame} from './intro.js';
import {lampPickScr,ledgerScr,lighthouseHTML,totalPending} from './lamp.js';
import {loadProfile} from '../../progress.js';
const RUN_KEY='tidebound.run.v2';
function ago(t){if(!t)return'';const m=Math.max(0,Math.round((Date.now()-t)/60000));if(m<1)return'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<24)return h+' h ago';return Math.round(h/24)+' d ago'}
// Every stored run slot (today a single autosave; any extra 'tidebound.run*' keys show up here too).
export function listSlots(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!/^tidebound\.run/.test(k))continue;
 const d=JSON.parse(localStorage.getItem(k));if(d&&d.run&&CLASSES[d.run.cls]&&!d.run.won&&d.run.hp>0)out.push({key:k,t:d.t||0,run:d.run,data:d})}}catch(_){}
 return out.sort((a,b)=>b.t-a.t)}
export function titleGo(view){W.S={screen:'title',view:view||'main',page:0,hero:null};render()}
export function loadSlot(key){if(key===RUN_KEY){continueRun();return}
 const s=listSlots().find(x=>x.key===key);if(!s)return;W.run=s.run;W.uid=Math.max(W.uid,s.data.uid||1);W.cb=null;W.S={screen:'map'};render()}
export function deleteSlot(key){if(W.S.confirmDel!==key){W.S={...W.S,confirmDel:key};return render()}
 if(key===RUN_KEY)clearRun();else try{localStorage.removeItem(key)}catch(_){}
 W.S={...W.S,confirmDel:null};render()}
// Reduced motion: stills the title-flow animations and the environment ambience (body class + Reduced effects).
export function applyMotion(){document.body.classList.toggle('reduce-motion',!!settings.reduceMotion)}
export function setReduceMotion(on){settings.reduceMotion=!!on;
 if(on){if(settings.envFx==='full'){settings.envFxBefore='full';settings.envFx='reduced'}}else if(settings.envFxBefore){settings.envFx=settings.envFxBefore;delete settings.envFxBefore}
 saveSettings();applyMotion();render()}
const slotHTML=s=>{const K=CLASSES[s.run.cls];return `<div class="tb-slot theme-${K.theme}" data-key="${s.key}"><span class="tb-sico">${K.e}</span><span class="tb-sinfo"><b>${K.n}</b> · Floor ${s.run.floor}/15<br><i>❤️ ${s.run.hp}/${s.run.max} · 💰 ${s.run.gold} · ${s.run.deck.length} cards · ${ago(s.t)}</i></span>
 <button class="tb-btn sm pri" onclick="loadSlot('${s.key}')">Load</button><button class="tb-btn sm${W.S.confirmDel===s.key?' danger':''}" onclick="deleteSlot('${s.key}')">${W.S.confirmDel===s.key?'Sure?':'Delete'}</button></div>`};
function framed(id,title,body,cls=''){return `<div class="tb-scr tb-title">${bgHTML()}<div class="tb-ov"><div class="tb-frame ${cls}" id="${id}">${frameOpen()}<h2>${title}</h2>${body}<button class="tb-x" aria-label="Back" onclick="titleGo('main')">✕</button>${frameClose()}</div></div></div>`}
export function titleScr(){const v=W.S.view||'main';
 if(v==='select')return selectScr();
 if(v==='learn')return learnScr();
 if(v==='intro')return introScr();
 if(v==='lamp')return lampPickScr();
 if(v==='ledger')return ledgerScr();
 if(v==='options')return framed('optionswin','Options',`${settingsHTML()}<div class="tb-actions"><button class="tb-btn pri" id="optback" onclick="titleGo('main')">Back</button></div>`,'tb-opt');
 if(v==='load'){const sl=listSlots();return framed('loadwin','Load Game',`<div class="tb-slots">${sl.length?sl.map(slotHTML).join(''):'<p class="tb-none">No saved journeys yet. Begin a new game and your climb is saved automatically.</p>'}</div><div class="tb-actions"><button class="tb-btn pri" id="loadback" onclick="titleGo('main')">Back</button></div>`,'tb-load')}
 const sv=loadRunData(),K=sv&&CLASSES[sv.run.cls];
 return `<div class="tb-scr tb-title tb-main">${bgHTML()}
 <header class="tb-logo"><div class="tb-kicker">The Drowned Stair awaits</div><h1><span>Tidebound</span> Ascent</h1><div class="tb-rule2"><i></i><b>◆</b><i></i></div></header>
 <nav class="tb-menu has3${K?' has-cont':''}" aria-label="Main menu">
 ${K?`<button class="tb-btn pri big" id="continue" onclick="continueRun()"><b>Continue</b><span>${K.n} · Floor ${sv.run.floor}/15</span></button>`:''}
 <button class="tb-btn ${K?'':'pri '}big" id="newgame" onclick="newGame()"><b>New Game</b><span>Choose your climber</span></button>
 <button class="tb-btn big" id="loadgame" onclick="titleGo('load')"><b>Load Game</b><span>${listSlots().length||'No'} saved climb${listSlots().length===1?'':'s'}</span></button>
 <button class="tb-btn" id="options" onclick="titleGo('options')">Options</button>
 <button class="tb-btn" id="learn" onclick="titleGo('learn')">Learn to Play</button>
 <button class="tb-btn" id="ledger" onclick="openLedger()">Ledger${totalPending(loadProfile())?`<em class="lp-dot">${totalPending(loadProfile())}</em>`:''}</button></nav>
 ${lighthouseHTML()}
 <div class="tb-foot">Act I · The Drowned Stair</div></div>`}
