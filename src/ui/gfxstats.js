// ui/gfxstats.js: GPU-memory budget tool (gfxmem task, 2026-10-14). The Galaxy S24 flashes when too many big composited layers pile up.
//  gfxStats(): estimated composited layers + GPU MB of the painted backdrop (#env, #env-front) and the rest of the page, from the DOM (an estimate: the real
//   layer tree is only visible through CDP, see tests/perf/gfxmem.cjs which reads LayerTree and checks this estimate against it).
//  Overlay: open the game with ?gfx=1 (or run localStorage.gfx=1) to see "layers / MB" top-left, refreshed every second. Tap it to log the biggest layers to the console.
// A layer = an element the compositor must keep a texture for: running transform/opacity/translate animation, will-change transform/opacity, or a 3D transform.
// MB = css box x DPR^2 x 4 bytes (full layer, offscreen parts included, the worst case; "vis" is the part inside the viewport).
export function gfxStats(){const dpr=devicePixelRatio||1,vw=innerWidth,vh=innerHeight,seen=new Set();let list=[];
 const add=(e,why)=>{if(seen.has(e)||!e.isConnected)return;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return;const w=e.offsetWidth,h=e.offsetHeight;if(!w||!h)return;seen.add(e);
  const r=e.getBoundingClientRect(),vis=Math.max(0,Math.min(r.right,vw)-Math.max(r.left,0))*Math.max(0,Math.min(r.bottom,vh)-Math.max(r.top,0));
  list.push({el:e,why,area:w*h,vis,mb:w*h*dpr*dpr*4/1048576,inEnv:!!e.closest('#env,#env-front'),big:w*h>=.5*vw*vh})};
 for(const a of document.getAnimations()){const t=a.effect&&a.effect.target;if(!t||a.playState!=='running')continue;const k=a.effect.getKeyframes?a.effect.getKeyframes():[];
  if(k.some(f=>'transform' in f||'opacity' in f||'translate' in f||'scale' in f))add(t,'anim')}
 for(const e of document.querySelectorAll('#env *,#env-front *,.xfade *'))if(!seen.has(e)){const w=getComputedStyle(e).willChange;if(/transform|opacity/.test(w))add(e,'will-change')}
 const sum=l=>({layers:l.length,big:l.filter(x=>x.big).length,mb:Math.round(l.reduce((s,x)=>s+x.mb,0)),visMB:Math.round(l.reduce((s,x)=>s+x.vis*dpr*dpr*4/1048576,0))});
 const env=list.filter(x=>x.inEnv);return {dpr,all:sum(list),env:sum(env),top:list.sort((a,b)=>b.mb-a.mb).slice(0,8).map(x=>({cls:(x.el.className&&x.el.className.baseVal===undefined?x.el.className:'')||x.el.tagName,why:x.why,mb:Math.round(x.mb*10)/10}))}}
let box=null,timer=0;
export function gfxOverlay(on){if(on===false){clearInterval(timer);timer=0;if(box)box.remove();box=null;return}if(box)return;
 box=document.createElement('div');box.id='gfxstats';box.style.cssText='position:fixed;left:4px;top:4px;z-index:99999;font:11px/1.25 monospace;color:#9fffb0;background:rgba(0,0,0,.72);padding:3px 6px;border-radius:3px;pointer-events:auto;white-space:pre';
 const upd=()=>{const s=gfxStats();box.textContent=`env ${s.env.layers}L ${s.env.mb}MB (big ${s.env.big})\nall ${s.all.layers}L ${s.all.mb}MB  @${s.dpr}x`};
 box.onclick=()=>console.table(gfxStats().top);document.body.appendChild(box);upd();timer=setInterval(upd,1000)}
// debug handles for tests / the console (main.js is not touched): window.__gfx.stats()
if(typeof window!=='undefined'){window.__gfx={stats:gfxStats,overlay:gfxOverlay};
 try{if(/[?&]gfx=1/.test(location.search)||localStorage.gfx==='1')addEventListener('load',()=>gfxOverlay(true))}catch(_){}}
