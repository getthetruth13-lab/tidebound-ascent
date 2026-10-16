// Piece-rig idle compositor (v0.6.27). A character with a rig (art/v2/rigs/<spriteId>/<spriteId>.rig.json) is drawn as stacked DOM pieces
// inside its normal `.spr-slot`, each moved by transform only (parent chain, pivots, sine channels), replacing the single-sprite sway.
// Characters without a rig, reduced motion, or a failed load keep the plain <img class="spr"> + CSS `combat-breathe`: nothing else changes.
// Everything else (lunge, hit flash, shake, death ghosts, targeting) acts on `.fig` / `.en` and therefore still applies to the rig.
// Format and maths: studio/design/RIG-FORMAT.md, src/ui/rig-math.js. Master switch: localStorage 'rig-off'=1 or ?rig=0.
import {prepare,loopU,glowAt,hash01} from './rig-math.js';
const INDEX_URL='./art/v2/rigs/index.json';
let index=null,indexP=null,off=false;
try{off=/[?&]rig=0\b/.test(location.search)||localStorage.getItem('rig-off')==='1'}catch(_){}
const rigs=new Map();          // spriteId -> {rig,prep,imgs:{id:HTMLImageElement},ok} | 'loading' | 'fail'
const live=new Set();          // attached .rig elements being animated
const state=new Map();         // figure key -> {skew,hold,at}  (hit-stop bookkeeping that survives re-renders)
let raf=0,frameNo=0,lastTs=0,slow=0,stats={frames:0,pieces:0};
export const rigStats=()=>({rigsLive:live.size,...stats,hidden:document.hidden,running:!!raf,slow,tier});
export const hasRig=id=>!!(index&&index.rigs&&index.rigs[id]);
const dir=id=>'./art/v2/rigs/'+id+'/';
function loadIndex(){if(indexP)return indexP;return indexP=fetch(INDEX_URL).then(r=>r.ok?r.json():Promise.reject(r.status)).then(j=>{index=j},()=>{index={rigs:{}}})}
function loadRig(id){let r=rigs.get(id);if(r)return r;rigs.set(id,'loading');
 fetch(dir(id)+index.rigs[id]).then(r=>r.ok?r.json():Promise.reject()).then(rig=>{
  const imgs={},jobs=[];for(const o of [...rig.pieces,...(rig.glows||[])]){const im=new Image();im.decoding='async';im.src=dir(id)+o.image;imgs[o.id]=im;jobs.push(im.decode().catch(()=>{if(!im.complete||!im.naturalWidth)throw 0}))}
  return Promise.all(jobs).then(()=>{rigs.set(id,{rig,prep:prepare(rig),imgs,ok:true,used:performance.now()});evict();syncRigs()})
 }).catch(()=>rigs.set(id,'fail'));return 'loading'}
// memory: keep at most MAXRIGS decoded rigs; drop the least recently used one that no live figure is showing (they reload from the SW cache)
const MAXRIGS=10;
function evict(){const loaded=[...rigs].filter(([,v])=>v&&v.ok);if(loaded.length<=MAXRIGS)return;
 const inUse=new Set([...live].map(r=>r._r.id));loaded.filter(([id])=>!inUse.has(id)).sort((a,b)=>a[1].used-b[1].used).slice(0,loaded.length-MAXRIGS).forEach(([id])=>rigs.delete(id))}
const px=n=>(Math.round(n*100)/100)+'px';
function build(slot,id,R,key){
 const fig=slot.parentElement,W=parseFloat(fig&&fig.style.width)||slot.clientWidth,rig=R.rig,k=W/rig.sprite.w;if(!(k>0))return null;
 const root=document.createElement('div');root.className='rig';root.dataset.rig=id;root.setAttribute('aria-hidden','true');
 const inn=document.createElement('div');inn.className='rig-in';inn.style.cssText=`width:${rig.sprite.w}px;height:${rig.sprite.h}px;transform:scale(${k})`;
 const els={},glows=[];
 for(const p of rig.pieces){const e=R.imgs[p.id].cloneNode();e.decoding='sync';e.draggable=false;e.alt='';e.className='rp';
  e.style.cssText=`left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px`;inn.appendChild(e);els[p.id]=e}
 for(const g of rig.glows||[]){const e=R.imgs[g.id].cloneNode();e.decoding='sync';e.draggable=false;e.alt='';e.className='rp rg';
  e.style.cssText=`left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px;opacity:0`;inn.appendChild(e);glows.push([g,e])}
 root.appendChild(inn);
 const sp=slot.querySelector('img.spr');if(sp&&sp.style.scale)root.style.scale=sp.style.scale;   // enemies facing right are mirrored
 root._r={id,R,els,glows,key,off:hash01(key),ms:[0,0,0,0,0,0],last:null};
 return root}
// per-figure key: heroes by class, enemies by uid (stable across re-renders; index shifts when a foe dies)
function keyOf(slot,id){const en=slot.closest('.en');if(!en)return 'hero:'+id;const who=en.querySelector('.hpbar')?.dataset.who;return 'en:'+(who||en.dataset.en)+':'+id}
export function syncRigs(){
 if(off||!document.body.classList.contains('combat-motion')){for(const r of live)if(!r.isConnected)live.delete(r);return}
 const slots=document.querySelectorAll('.hero .spr-slot,.en .spr-slot');
 for(const slot of slots){
  if(slot.querySelector(':scope>.rig'))continue;
  const id=(slot.dataset.asset||'').replace(/^sprites\./,'');if(!id||id==='none')continue;
  if(!index){loadIndex().then(syncRigs);return}
  if(!hasRig(id))continue;
  const R=loadRig(id);if(!R||R==='loading'||R==='fail'||!R.ok)continue;R.used=performance.now();
  const root=build(slot,id,R,keyOf(slot,id));if(!root)continue;
  slot.insertBefore(root,slot.querySelector('img.spr')?.nextSibling||null);slot.classList.add('rigged');live.add(root);grace=performance.now()+2500;
  pose(root,performance.now(),true)}
 for(const r of live)if(!r.isConnected)live.delete(r);
 start()}
function pose(root,now,force){
 const c=root._r,R=c.R,st=state.get(c.key)||(state.set(c.key,{skew:0,hold:0,at:0}),state.get(c.key));
 let te;if(st.hold){if(now<st.hold)te=st.at-st.skew;else{st.skew+=st.hold-st.at;st.hold=0;te=now-st.skew}}else te=now-st.skew;
 const u=loopU(R.rig,te/1000,c.off),w=R.prep.pose(u),m=c.ms;
 for(const p of R.rig.pieces){const par=p.parent;if(par==='static'||(p.id==='base'&&!R.rig.root))continue;
  R.prep.css(w[p.id],p.x,p.y,m);const s=`matrix(${m[0].toFixed(5)},${m[1].toFixed(5)},${m[2].toFixed(5)},${m[3].toFixed(5)},${m[4].toFixed(2)},${m[5].toFixed(2)})`;
  const e=c.els[p.id];if(e._s!==s){e._s=s;e.style.transform=s}}
 for(const [g,e] of c.glows){const par=g.parent||'static';const W=par==='static'?null:w[par];
  if(W){R.prep.css(W,g.x,g.y,m);e.style.transform=`matrix(${m[0].toFixed(5)},${m[1].toFixed(5)},${m[2].toFixed(5)},${m[3].toFixed(5)},${m[4].toFixed(2)},${m[5].toFixed(2)})`}
  const o=Math.min(1,glowAt(g,u)).toFixed(3);if(e._o!==o){e._o=o;e.style.opacity=o}}
 stats.pieces+=R.rig.pieces.length}
// Adaptive quality: the loop watches its own frame spacing once per second. Tier 0 = every frame (60 fps), 1 = every 2nd (30), 2 = every 4th (15),
// 3 = poses frozen (the cheapest: layers stop changing so nothing is re-composited). A phone that keeps up never leaves tier 0 for <=4 figures;
// more than 4 live rigs start at tier 1 (idle motion is slow sine waves, 30 fps is indistinguishable). Tiers only go up within a session.
let tier=0,winT=0,winN=0,grace=0,locked=false;const EVERY=[1,2,4,0];
export const rigTier=()=>tier;
function tick(ts){raf=0;if(document.hidden||!live.size)return;
 const dt=lastTs?ts-lastTs:16;lastTs=ts;if(dt<250&&ts>grace){winT+=dt;winN++}else if(ts<=grace){winT=0;winN=0}
 if(winT>=1000){const avg=winT/winN;winT=0;winN=0;slow=avg;
  // expected spacing at the current tier is 16.7ms (vsync); heavy main-thread/compositor work shows as spacing well above it
  if(!locked){if(avg>30&&tier<3)tier++;else if(avg>22&&tier<2)tier++}}
 frameNo++;const base=live.size>4&&tier<1?1:tier,ev=EVERY[base];let i=0;
 if(ev)for(const r of live){if(!r.isConnected){live.delete(r);continue}if(((frameNo+i)%ev)===0)pose(r,ts);i++}
 else for(const r of live)if(!r.isConnected)live.delete(r);
 stats.frames++;if(live.size)raf=requestAnimationFrame(tick)}
function start(){if(!raf&&live.size&&!document.hidden){lastTs=0;raf=requestAnimationFrame(tick)}}
// hit-stop: freezeIdle() (vfx.js) calls this so rigs hold their pose like the CSS idle does
export function rigFreeze(el,ms){if(!el||!live.size)return;const now=performance.now();
 const hit=n=>{const c=n._r;if(!c)return;const st=state.get(c.key);if(!st)return;
  if(st.hold){st.hold=Math.max(st.hold,now+ms)}else{st.at=now;st.hold=now+ms}};
 if(el._r)hit(el);el.querySelectorAll&&el.querySelectorAll('.rig').forEach(hit)}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0}else start()});
// test hooks
if(typeof window!=='undefined')window.__rig={setTier:(n,lock)=>{tier=n;locked=!!lock},syncRigs,rigStats,live,state,hasRig,pose:(el,t)=>pose(el,t,true)};
