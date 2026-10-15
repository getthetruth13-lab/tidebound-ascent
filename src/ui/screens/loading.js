// ui/screens/loading.js: the loading screen between the opening title video and the main menu (v0.6.12).
// Progress is real: sw.js caches the ~94 MB app shell in batches and posts {type:'precache-progress',name,done,total,state} to every page.
// Once the whole shell is cached the version is remembered in localStorage, so later launches skip this screen (instant).
// Never hangs: no service worker / failed install / no progress for STALL_MS lets the player continue with a button (or a tap).
import {W} from '../../core/state.js';
import {render} from '../render.js';
import {dip} from '../dip.js';
import {VERSION} from '../../../version.js';
const KEY='tidebound.artok';
const TIPS=['The tide gives back only what it chooses.','Keep your lantern lit. The stair is long.','Every landing remembers the ones who climbed it.','Salt keeps. Rust does not.'];
export const LS={done:0,total:0,state:'unknown',name:'',last:0,t0:0,sw:null,tip:0};
const want=()=>'tidebound-'+VERSION;
const stallMs=()=>window.LOADING_STALL_MS||20000;
export function artReady(){try{return localStorage.getItem(KEY)===VERSION}catch(_){return false}}
const noSW=()=>!('serviceWorker' in navigator)||!String(location.protocol).startsWith('http');
// Feed a progress message (from the service worker, or a test).
export function loadingFeed(m){if(!m||m.type!=='precache-progress')return;
 LS.done=m.done|0;LS.total=m.total|0;LS.name=m.name||'';LS.last=performance.now();
 const mine=!m.name||m.name===want();
 if(m.state==='done'&&mine){LS.state='done';try{localStorage.setItem(KEY,VERSION)}catch(_){}}
 else if(m.state==='done'){LS.state='old'} // an older worker still reports its own complete cache: keep waiting for the new one
 else LS.state=m.state;
 paint();if(LS.state==='done'&&W.S.screen==='title'&&W.S.view==='loading')loadingDone()}
export function loadingInit(){
 if(noSW())return;
 try{navigator.serviceWorker.addEventListener('message',e=>loadingFeed(e.data));navigator.serviceWorker.startMessages&&navigator.serviceWorker.startMessages()}catch(_){}
 navigator.serviceWorker.ready.then(reg=>{try{reg.active&&reg.active.postMessage({type:'precache-status'})}catch(_){}}).catch(()=>{})}
export const pct=()=>LS.state==='done'?100:LS.total?Math.min(99,Math.floor(100*LS.done/LS.total)):0;
function stalled(){const t=performance.now();if(LS.state==='error')return true;if(noSW())return true;
 // never heard from a worker at all (blocked / unsupported / hung registration): give up sooner than a mid-download stall
 return t-Math.max(LS.last,LS.t0)>(LS.state==='unknown'?Math.min(stallMs(),5000):stallMs())}
function paint(){const v=document.getElementById('ldfill');if(!v)return;const p=pct();
 v.style.setProperty('--p',p);const n=document.getElementById('ldpct');if(n)n.textContent=p+'%';
 const s=document.getElementById('ldskip');if(s)s.classList.toggle('on',stalled())}
let tick=0;
// Called from the start (video) screen tap. Instant when the art is already cached; otherwise the loading view.
export function toMenuOrLoad(){
 if(artReady()||noSW()||window.FAST&&!window.LOADING_TEST){return false}
 LS.t0=performance.now();LS.tip=(Math.random()*TIPS.length)|0;
 W.S={screen:'title',view:'loading',page:0,hero:null};render();clearInterval(tick);
 tick=setInterval(()=>{if(W.S.screen!=='title'||W.S.view!=='loading'){clearInterval(tick);return}paint();
  if(noSW()&&LS.state!=='done'){loadingDone()}},400);
 try{navigator.serviceWorker&&navigator.serviceWorker.ready.then(r=>r.active&&r.active.postMessage({type:'precache-status'}))}catch(_){}
 return true}
export function loadingFail(){LS.state='error';paint()}
export function loadingDone(){clearInterval(tick);if(W.S.screen!=='title'||W.S.view!=='loading')return;
 // Same backdrop as the menu, so only the words fade in: no black frame in between.
 W.S={screen:'title',view:'main',page:0,hero:null,fade:!window.FAST,noFly:1};render()}
export function loadingContinue(){loadingDone()}
export function loadingScr(){const p=pct();
 return `<div class="tb-scr tb-title tb-main tb-imgmenu tb-loading" id="loadingscr" onclick="if(document.getElementById('ldskip').classList.contains('on'))loadingContinue()"><div class="tv-stage"><img class="tv-img" src="art/v2/title/menu-plate.webp" alt="" draggable="false"></div><img class="tm-emb" src="art/v2/title/menu-emblem.webp" alt="The Drowned Sun" draggable="false">
 <div class="ld-box" role="progressbar" aria-label="Loading" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}">
  <div class="ld-top"><b>Lighting the lamp</b><span id="ldpct">${p}%</span></div>
  <div class="ld-bar" id="ldfill" style="--p:${p}"><i class="ld-fill"></i><img class="ld-frame" src="art/v2/ui/lamp/vic-lamp-frame.png" alt="" draggable="false"><img class="ld-lantern" src="art/v2/ui/lamp/vic-lamp-lantern.png" alt="" draggable="false"></div>
  <p class="ld-tip">${TIPS[LS.tip%TIPS.length]}</p>
  <button class="tb-btn sm pri ld-skip" id="ldskip" onclick="event.stopPropagation();loadingContinue()">Continue anyway</button></div>
 <span class="tm-ver">v${VERSION}</span></div>`}
