// ui/screens/loading.js: the loading screen between the opening title video and the main menu (v0.6.12).
// Progress is real and byte-weighted: sw.js installs the small ESSENTIALS set, then fills the rest of the ~125 MB Act 1 set in chunks this page asks for
// ({type:'fill'}); it posts {type:'precache-progress',name,done,total,bytes,bytesTotal,ess,state,chunk,gain} to every page.
// Once the whole set is cached the version is remembered in localStorage (artok), so later launches skip this screen (instant). Once the ESSENTIALS are
// cached (essok) later launches also go straight to the menu and the rest keeps filling in the background (small status chip, never blocks play).
// Never hangs: no service worker / failed install / no progress for STALL_MS, or a long predicted wait, lets the player continue with a button (or a tap).
import {W} from '../../core/state.js';
import {render} from '../render.js';
import {dip} from '../dip.js';
import {VERSION} from '../../../version.js';
const KEY='tidebound.artok',ESS='tidebound.essok';
const TIPS=['The tide gives back only what it chooses.','Keep your lantern lit. The stair is long.','Every landing remembers the ones who climbed it.','Salt keeps. Rust does not.'];
export const LS={done:0,total:0,bytes:0,bytesTotal:0,ess:false,p:0,state:'unknown',name:'',last:0,t0:0,sw:null,tip:0,r0:null,retry:false};
const want=()=>'tidebound-'+VERSION;
const stallMs=()=>window.LOADING_STALL_MS||20000;
export function artReady(){try{return localStorage.getItem(KEY)===VERSION}catch(_){return false}}
export function essReady(){try{return localStorage.getItem(ESS)===VERSION}catch(_){return false}}
const noSW=()=>!('serviceWorker' in navigator)||!String(location.protocol).startsWith('http');
// Feed a progress message (from the service worker, or a test).
let kn=0,kt=0;
function post(type){try{navigator.serviceWorker.ready.then(r=>{const w=r.active||navigator.serviceWorker.controller;w&&w.postMessage({type})}).catch(()=>{})}catch(_){}}
// Ask the worker for the next fill chunk (it re-reads the cache each time, so an interrupted fill resumes with only what is missing).
export function fillKick(){clearTimeout(kt);kt=0;if(noSW()||LS.state==='done'||window.LOADING_NOFILL)return;post('fill')}
export function loadingFeed(m){if(!m||m.type!=='precache-progress')return;
 const now=performance.now(),mine=!m.name||m.name===want();LS.last=now;
 if(mine&&m.name&&LS.name&&m.name!==LS.name){LS.p=0;LS.r0=null} // a newer version's worker took over
 if(mine||m.state!=='done'){LS.done=m.done|0;LS.total=m.total|0;LS.bytes=m.bytes|0;LS.bytesTotal=m.bytesTotal|0;LS.name=m.name||'';
  if(m.ess)LS.ess=true;if(LS.bytesTotal&&!LS.r0)LS.r0={t:now,b:LS.bytes}}
 LS.retry=m.state==='retry';
 if(m.state==='done'&&mine){LS.state='done';try{localStorage.setItem(KEY,VERSION);localStorage.setItem(ESS,VERSION)}catch(_){}}
 else if(m.state==='done'){LS.state='old'} // an older worker still reports its own complete cache: keep waiting for the new one
 else LS.state=m.state;
 if(mine&&m.ess&&LS.state!=='done'){try{localStorage.setItem(ESS,VERSION)}catch(_){}}
 if(m.chunk&&mine&&LS.state!=='done'){ // next chunk now; after a chunk with failures and no progress back off 2,4,8..60 s
  if(m.state==='retry'&&!(m.gain>0)){kt=setTimeout(fillKick,Math.min(60000,2000*2**Math.min(kn++,5)))}else{kn=0;kt=setTimeout(fillKick,0)}}
 paint();chip();if(LS.state==='done'&&W.S.screen==='title'&&W.S.view==='loading')loadingDone()}
export function loadingInit(){
 if(noSW())return;
 try{navigator.serviceWorker.addEventListener('message',e=>loadingFeed(e.data));navigator.serviceWorker.startMessages&&navigator.serviceWorker.startMessages()}catch(_){}
 navigator.serviceWorker.ready.then(()=>fillKick()).catch(()=>{});
 // watchdog: the worker can be stopped by the browser between chunks, or a message lost; ask again if it has been quiet. Network back = retry at once.
 setInterval(()=>{if(LS.state!=='done'&&performance.now()-LS.last>30000)fillKick()},15000);
 addEventListener('online',()=>{kn=0;fillKick()})}
// Byte-weighted (small files barely move it, the big music/video files do) and never goes backwards.
export const pct=()=>{if(LS.state==='done')return 100;if(LS.state==='old')return LS.p;
 const raw=LS.bytesTotal?100*LS.bytes/LS.bytesTotal:LS.total?100*LS.done/LS.total:0;return LS.p=Math.max(LS.p,Math.min(99,Math.floor(raw)))};
const mb=n=>(n/1048576).toFixed(n<10485760?1:0);
export const mbText=()=>LS.bytesTotal?mb(Math.min(LS.bytes,LS.bytesTotal))+' of '+mb(LS.bytesTotal)+' MB':'';
// Predicted time left (ms) from the speed measured since the first message, or null while unknown.
export function remainMs(){const r=LS.r0,now=performance.now();if(!r||!LS.bytesTotal||now-r.t<4000||LS.bytes<=r.b)return null;
 return (LS.bytesTotal-LS.bytes)/((LS.bytes-r.b)/(now-r.t))}
const longMs=()=>window.LOADING_LONG_MS||20000;
// Continue is offered when: the worker failed / is silent (stall), or the wait is predicted to be long, or the essentials are in and it has taken long already.
function stalled(){const t=performance.now();if(LS.state==='error')return true;if(noSW())return true;
 // never heard from a worker at all (blocked / unsupported / hung registration): give up sooner than a mid-download stall
 if(t-Math.max(LS.last,LS.t0)>(LS.state==='unknown'?Math.min(stallMs(),5000):stallMs()))return true;
 const rem=remainMs();return rem!=null&&rem>longMs()||LS.ess&&LS.state!=='done'&&t-LS.t0>longMs()}
function paint(){const v=document.getElementById('ldfill');if(!v)return;const p=pct();
 v.style.setProperty('--p',p);const n=document.getElementById('ldpct');if(n)n.textContent=p+'%';
 const m=document.getElementById('ldmb');if(m)m.textContent=mbText();const b=document.getElementById('ldbox');if(b)b.setAttribute('aria-valuenow',p);
 const s=document.getElementById('ldskip');if(s)s.classList.toggle('on',stalled())}
// Small honest status for players who went on while the rest of the set downloads. Never blocks input.
let chipHide=0;
function chip(){if(window.FAST&&!window.LOADING_TEST)return;let el=document.getElementById('dlchip');
 if(LS.state==='done'){if(el&&!chipHide){el.textContent='Ready for offline play';chipHide=setTimeout(()=>{el.remove();chipHide=0},3500)}return}
 const live=LS.state!=='old'&&LS.state!=='unknown'&&LS.state!=='error'&&LS.bytesTotal>0&&(LS.ess||essReady());
 if(!live){if(el)el.remove();return}
 if(!el){el=document.createElement('div');el.id='dlchip';
  el.style.cssText='position:fixed;left:6px;bottom:3px;z-index:60;font:600 9px var(--font-display,serif);color:#d9c39a;background:rgba(10,14,20,.55);padding:1px 6px;border-radius:6px;opacity:.7;pointer-events:none;letter-spacing:.3px';document.body.appendChild(el)}
 el.style.display=W.S.screen==='combat'||W.S.screen==='title'&&(W.S.view==='start'||W.S.view==='loading')?'none':'';
 el.textContent=(LS.retry?'Download paused, retrying ':'Downloading for offline play ')+pct()+'%'}
let tick=0;
// Called from the start (video) screen tap. Instant when the art is already cached; otherwise the loading view.
export function toMenuOrLoad(){
 if(artReady()||noSW()||window.FAST&&!window.LOADING_TEST){return false}
 if(essReady())return false; // essentials already cached (earlier launch): play now, the rest keeps downloading in the background
 LS.t0=performance.now();LS.tip=(Math.random()*TIPS.length)|0;
 W.S={screen:'title',view:'loading',page:0,hero:null};render();clearInterval(tick);
 tick=setInterval(()=>{if(W.S.screen!=='title'||W.S.view!=='loading'){clearInterval(tick);return}paint();
  if(noSW()&&LS.state!=='done'){loadingDone()}},400);
 return true}
export function loadingFail(){LS.state='error';paint()}
export function loadingDone(){clearInterval(tick);if(W.S.screen!=='title'||W.S.view!=='loading')return;
 // Same backdrop as the menu, so only the words fade in: no black frame in between.
 W.S={screen:'title',view:'main',page:0,hero:null,fade:!window.FAST,noFly:1};render();chip()}
export function loadingContinue(){loadingDone()}
export function loadingScr(){const p=pct();
 return `<div class="tb-scr tb-title tb-main tb-imgmenu tb-loading" id="loadingscr" onclick="if(document.getElementById('ldskip').classList.contains('on'))loadingContinue()"><div class="tv-stage"><img class="tv-img" src="art/v2/title/menu-plate.webp" alt="" draggable="false"></div><img class="tm-emb" src="art/v2/title/menu-emblem.webp" alt="The Drowned Sun" draggable="false">
 <div class="ld-box" id="ldbox" role="progressbar" aria-label="Loading" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}">
  <div class="ld-top"><b>Lighting the lamp</b><span id="ldpct">${p}%</span></div>
  <div class="ld-bar" id="ldfill" style="--p:${p}"><i class="ld-fill"></i><img class="ld-frame" src="art/v2/ui/lamp/vic-lamp-frame.png" alt="" draggable="false"><img class="ld-lantern" src="art/v2/ui/lamp/vic-lamp-lantern.png" alt="" draggable="false"></div>
  <p class="ld-mb" id="ldmb" style="margin:-14px 0 6px;font:600 10px var(--font-display,serif);color:#d9c39a;opacity:.85">${mbText()}</p>
  <p class="ld-tip">${TIPS[LS.tip%TIPS.length]}</p>
  <button class="tb-btn sm pri ld-skip" id="ldskip" onclick="event.stopPropagation();loadingContinue()">Continue anyway</button></div>
 <span class="tm-ver">v${VERSION}</span></div>`}
