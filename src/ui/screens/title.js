// ui/screens/title.js: the launch screen and its sub-views (main menu, Load Game, Options, Learn to Play, character select).
// View lives in W.S.view ('main' by default, so older code that sets W.S={screen:'title'} lands on the menu).
import {glyph} from '../glyphs.js';
import {W} from '../../core/state.js';
import {CLASSES} from '../../core/registry.js';
import {settings,saveSettings,loadRunData,continueRun,clearRun} from '../../save.js';
import {render,settingsHTML} from '../render.js';
import {bgHTML,frameOpen,frameClose} from './frame.js';
import {selectScr} from './select.js';
import {learnScr} from './learn.js';
import {introScr,newGame} from './intro.js';
import {lampPickScr,ledgerScr,totalPending} from './lamp.js';
import {loadProfile} from '../../progress.js';
import {dip} from '../dip.js';
import {VERSION} from '../../../version.js';
const RUN_KEY='tidebound.run.v2';
function ago(t){if(!t)return'';const m=Math.max(0,Math.round((Date.now()-t)/60000));if(m<1)return'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<24)return h+' h ago';return Math.round(h/24)+' d ago'}
// Every stored run slot (today a single autosave; any extra 'tidebound.run*' keys show up here too).
export function listSlots(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!/^tidebound\.run/.test(k))continue;
 const d=JSON.parse(localStorage.getItem(k));if(d&&d.run&&CLASSES[d.run.cls]&&!d.run.won&&d.run.hp>0)out.push({key:k,t:d.t||0,run:d.run,data:d})}}catch(_){}
 return out.sort((a,b)=>b.t-a.t)}
// Studio logo slot: set to an image path (e.g. 'art/v2/ui/studio-logo.webp') to show it, skippable, before the start screen. Off for now (no studio name picked).
export const STUDIO_LOGO=null;
export const bootView=()=>STUDIO_LOGO?'studio':'start';
const logoHTML=()=>`<header class="tb-logo"><h1 aria-label="The Drowned Sun"><span class="pre">The Drowned</span><span class="sun">Sun</span></h1>
 <div class="tb-rule2"><i></i><svg class="tb-emb" viewBox="0 0 60 36" aria-hidden="true"><defs><radialGradient id="tbsg" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="#fff6d6"/><stop offset=".55" stop-color="#e9d9a4"/><stop offset="1" stop-color="#b79a55"/></radialGradient><clipPath id="tbsc"><rect x="0" y="0" width="60" height="23"/></clipPath></defs>
  <circle cx="30" cy="22" r="20" fill="#ffcf6a" opacity=".22"/><circle cx="30" cy="22" r="14" fill="url(#tbsg)" clip-path="url(#tbsc)"/>
  <path d="M28 21 L28.8 9 H31.2 L32 21Z M28.3 9 H31.7 L32.3 7 H27.7Z M29 7 V5 H31 V7 M30 5 V3" fill="#16222a"/>
  <path d="M0 22 Q7.5 18.5 15 22 T30 22 T45 22 T60 22 V36 H0Z" fill="#0b1a22"/><path d="M0 22 Q7.5 18.5 15 22 T30 22 T45 22 T60 22" fill="none" stroke="#6db3b4" stroke-width=".8" opacity=".7"/>
  <path d="M0 27 Q7.5 24 15 27 T30 27 T45 27 T60 27" fill="none" stroke="#2d5961" stroke-width=".8" opacity=".8"/></svg><i></i></div>
 <div class="tb-sub">A Deckbuilding Ascent</div></header>`;
let studioTimer=0;
export function studioNext(){clearTimeout(studioTimer);if(W.S.screen==='title'&&W.S.view==='studio')titleGo('start')}
// Tap anywhere on the start screen: fade out, then the main menu (the tap also unlocks audio, so the menu music starts).
export function startTap(){if(W.S.screen!=='title'||W.S.view!=='start'||W.S.leaving)return;
 // Menu background is the video's frame 0, so swap instantly and fade only the words in.
 dip(()=>{W.S={screen:'title',view:'main',page:0,hero:null,fade:!window.FAST};render()})}
export function titleGo(view){dip(()=>{W.S={screen:'title',view:view||'main',page:0,hero:null};render()})}
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
const slotHTML=s=>{const K=CLASSES[s.run.cls];return `<div class="tb-slot theme-${K.theme}" data-key="${s.key}"><span class="tb-sico">${K.e}</span><span class="tb-sinfo"><b>${K.n}</b> · Floor ${s.run.floor}/15<br><i>${glyph('heart')} ${s.run.hp}/${s.run.max} · ${glyph('coin')} ${s.run.gold} · ${s.run.deck.length} cards · ${ago(s.t)}</i></span>
 <button class="tb-btn sm pri" onclick="loadSlot('${s.key}')">Load</button><button class="tb-btn sm${W.S.confirmDel===s.key?' danger':''}" onclick="deleteSlot('${s.key}')">${W.S.confirmDel===s.key?'Sure?':'Delete'}</button></div>`};
function framed(id,title,body,cls=''){return `<div class="tb-scr tb-title">${bgHTML()}<div class="tb-ov"><div class="tb-frame ${cls}" id="${id}">${frameOpen()}<h2>${title}</h2>${body}${frameClose()}</div></div></div>`}
export function titleScr(){const v=W.S.view||'main';
 if(v==='studio'){clearTimeout(studioTimer);studioTimer=setTimeout(studioNext,window.FAST?50:2500);return `<div class="tb-scr tb-studio" id="studio" onclick="studioNext()"><img src="${STUDIO_LOGO}" alt=""></div>`}
 if(v==='start')return `<div class="tb-scr tb-title tb-start tb-vid" id="startscr" onclick="startTap()"><div class="tv-stage"><video class="tv-video" src="art/v2/title/title-loop.mp4" poster="art/v2/title/title-poster.jpg" autoplay muted loop playsinline webkit-playsinline disablepictureinpicture preload="auto" aria-label="The Drowned Sun. Tap to begin"></video></div></div>`;
 if(v==='select')return selectScr();
 if(v==='learn')return learnScr();
 if(v==='intro')return introScr();
 if(v==='lamp')return lampPickScr();
 if(v==='ledger')return ledgerScr();
 if(v==='options')return framed('optionswin','Options',`${settingsHTML()}<div class="tb-actions"><button class="tb-btn pri" id="optback" onclick="titleGo('main')">${glyph('undo')}<span>Back</span></button></div>`,'tb-opt');
 if(v==='load'){const sl=listSlots();return framed('loadwin','Load Game',`<div class="tb-slots">${sl.length?sl.map(slotHTML).join(''):'<p class="tb-none">No saved journeys yet. Begin a new game and your climb is saved automatically.</p>'}</div><div class="tb-actions"><button class="tb-btn pri" id="loadback" onclick="titleGo('main')">${glyph('undo')}<span>Back</span></button></div>`,'tb-load')}
 const sv=loadRunData(),K=sv&&CLASSES[sv.run.cls];
 const pend=totalPending(loadProfile()),nsl=listSlots().length;
 const mi=(id,label,act,opt={})=>`<button class="tb-mi${opt.off?' off':''}" id="${id}"${opt.off?' disabled':` onclick="${act}"`}><i class="tb-flame" aria-hidden="true"></i><b>${label}</b>${opt.sub?`<small>${opt.sub}</small>`:''}${opt.dot?`<em class="lp-dot">${opt.dot}</em>`:''}<u aria-hidden="true"></u></button>`;
 // Menu: video frame 0 with title/emblem painted out (menu-plate.webp), small cut-out title+emblem (menu-emblem.webp) up top, one centred column of live words.
 const R=[['continue','Continue','continueRun()',!K],['newgame','New Game','newGame()'],['loadgame','Load Game',"titleGo('load')",!nsl],
  ['options','Options',"titleGo('options')"],['learn','Learn to Play',"titleGo('learn')"],['ledger','Ledger','openLedger()']];
 const w=([id,label,act,off],i)=>`<button class="tm-w${off?' off':''}" id="${id}" data-sfx="confirm" style="--i:${i}" aria-label="${label}${id==='continue'&&K?`: ${K.n}, Floor ${sv.run.floor}/15`:''}"${off?' disabled':` onclick="menuPress(this,&quot;${act.replace(/"/g,'')}&quot;)"`}><span>${label}</span>${id==='ledger'&&pend?`<em class="lp-dot">${pend}</em>`:''}</button>`;
 const fade=W.S.fade?' tm-fade':'';if(W.S.fade){W.S.fade=0;requestAnimationFrame(flyEmblem)}
 return `<div class="tb-scr tb-title tb-main tb-imgmenu${fade}">${TITLE_LAYERED?layeredStage():`<div class="tv-stage"><img class="tv-img" src="art/v2/title/menu-plate.webp" alt="" draggable="false"></div>`}<img class="tm-emb" id="tmemb" src="art/v2/title/menu-emblem.webp" alt="The Drowned Sun" draggable="false">
 <nav class="tm-nav tm-words" aria-label="Main menu">${R.map(w).join('')}</nav><span class="tm-ver" id="tmver">v${VERSION}</span></div>`}
// Press: warm flash (CSS .tm-hit) then act, so the flash is seen. Click SFX comes from audio.js (data-sfx).
// Title backdrop flag: true = layered moving scene (v0.6.1.1); false = the old still menu-plate.webp. One-line revert.
export const TITLE_LAYERED=true;
const L='art/v2/title/layers/';
function layeredStage(){return `<div class="tv-stage tl-stage" aria-hidden="true"><div class="tl-sky tl-drift"><img src="${L}sky.webp" alt="" draggable="false"></div><div class="tl-sea"><img src="${L}sea.webp" alt="" draggable="false"></div><i class="tl-shimmer"></i><div class="tl-tower"><i class="tl-beam"></i><img src="${L}lighthouse.webp" alt="" draggable="false"><i class="tl-lamp"></i></div><div class="tl-steps"><img src="${L}steps.webp" alt="" draggable="false"></div><i class="tl-ghost"><img src="${L}ghost.webp" alt="" draggable="false"></i><i class="tl-rain"></i><i class="tl-vig"></i></div>`}
export function menuPress(el,act){if(el.classList.contains('tm-hit'))return;el.classList.add('tm-hit');
 const go=()=>{try{(new Function(act))()}catch(e){console.error(e)}};dip(go)}
// Tap from title: the cut-out title/emblem starts exactly where the big one sits in the video (cover, 50% 42%) and glides up to its small slot.
const VW=1280,VH=720,EB=[270,45,1010,560];
export function flyEmblem(){const e=document.getElementById('tmemb');if(!e||document.body.classList.contains('reduce-motion'))return;
 const st=document.querySelector('.tb-imgmenu .tv-stage');if(!st)return;const sr=st.getBoundingClientRect(),sc=sr.width/VW,ox=sr.left,oy=sr.top;
 const r=e.getBoundingClientRect();if(!r.width)return;const bx=ox+EB[0]*sc,by=oy+EB[1]*sc,bw=(EB[2]-EB[0])*sc;
 const k=bw/r.width;e.style.transition='none';e.style.transformOrigin='0 0';e.style.transform=`translate(${bx-r.left}px,${by-r.top}px) scale(${k})`;
 e.getBoundingClientRect();requestAnimationFrame(()=>{e.style.transition='transform 1.1s cubic-bezier(.45,.05,.2,1)';e.style.transform='none'})}
