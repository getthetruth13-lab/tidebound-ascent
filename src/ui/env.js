// ui/env.js — environment backgrounds (design-v2 §W.7). Lives OUTSIDE #app, so render() never restarts effects.
//  • routing: per-floor band / boss lair / room scene / travel (envKeyFor)
//  • 5 parallax layers (sky far mid ground fg) with image-set @2x/@3x, ground anchored to the battle floor,
//    camera slide-in on battle entry (transform only) and idle drift on mid/fg (CSS `translate`, composited)
//  • ambient effects: one <canvas id="envfx"> particle system (pooled, sprite atlas, ≤300 full / 150 reduced / 0 off,
//    DPR ≤2, redraw ≤60 Hz, 30 Hz when idle, paused when hidden or an overlay is open) + CSS fog/shafts/caustics/
//    ripples/flicker/rings/sweep/lightning in .envfx-back
//  • lighting: tint + vignette in one overlay, rim light var, dim for rooms/map
//  • transitions: tide wipe (map → battle; crimson edge for elites), iris (boss), crossfades (rooms), band toast —
//    all visual only (pointer-events:none) and never delay a render or a turn
//  • quality: settings.envFx Full / Reduced / Off, prefers-reduced-motion (quality(), static: drives data-q and builds), plus a load governor
//    (govQuality()): downgrades only on sustained load, upgrades only on a screen change, and only toggles .gov-* classes that fade effects
//    by opacity: no syncEnv, no layer rebuild, no camera restart, data-q never flips
import {ENV} from '../core/registry.js';
import {U} from '../core/timing.js';
import {W} from '../core/state.js';
import {settings} from '../save.js';
const LAYERS=['sky','far','mid','ground'];// fg lives in #env-front (design-v2 §W.7.3 DOM order: over the figures, under the UI)
export const FEET=.694; // the one battle floor line: feet of every figure sit at FEET of the viewport height (sceneGeom, anchor() and stage all read it)
const GROUND=.69; // ground line at 69% of the layer height (environments.json layers.ground)
const aspect=()=>{const e=ENV.envs[root&&root.dataset.env]||{};const sp=e.space||[3600,1440];return sp[0]/sp[1]};
let root=null,front=null,wipe=null,canvas=null,ctx2=null,cur='',last=null,curEnv=null,lastBand=null;
const reduceMQ=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
export const envFxSettingLabel=v=>({full:'Full',reduced:'Reduced',off:'Off'})[v]||v;
// ---------- quality ----------
let adaptive='full',govFlips=0,rebuilds=0,quietUntil=0,lastP75=0,lastScr='',raf=0;
const ts=[],ds=[];                 // env-frame samples (rAF dt) of the last 3 s
const hist=[0,0,0];                // dt buckets: ~120 Hz, ~90 Hz, ~60 Hz; panel interval = smallest bucket holding >=10% of frames
const BUCKET=[1000/120,1000/90,1000/60];
const panelMs=()=>{const n=hist[0]+hist[1]+hist[2];if(n<60)return BUCKET[2];for(let i=0;i<3;i++)if(hist[i]>=n*.1)return BUCKET[i];return BUCKET[2]};
const p75=a=>{const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length*.75)]||0};
const RIM_ON={a1_lair_kelp:.35};
// Map backdrop (map_a1): the current band's pre-blurred sky + far (a1-shore / a1-cloister / a1-bellcourt -*-blur.webp) behind the
// scrolling chart; the parchment strip (map-a1-mid@2x) is NOT an env layer: it tiles vertically on the scrolling .parch (--map-sheet).
function mapEnv(e,band){const kb=/^a1_(shore|cloister|bellcourt)$/.test(band||'')?band.replace(/_/g,'-'):'a1-shore';
 const sw=l=>((e.art&&e.art[l])||[]).map(x=>({...x,f:x.f.replace(/a1-(shore|cloister|bellcourt)-/,kb+'-')}));return {...e,art:{sky:sw('sky'),far:sw('far')}}}
export function mapSheet(){const m=ENV.envs.map_a1;const t=m&&m.art&&m.art.mid&&m.art.mid[0];return t?t.f:''}
export function quality(){const user=settings.envFx||'full';if(reduceMQ.matches)return user==='off'?'off':'reduced';return user}
export function govQuality(){const order=['off','reduced','full'];return order[Math.min(order.indexOf(quality()),order.indexOf(adaptive))]}
const govTo=l=>{if(l===adaptive)return;adaptive=l;govFlips++;ts.length=ds.length=0;if(!root)return;root.classList.toggle('gov-reduced',l==='reduced');root.classList.toggle('gov-off',l==='off');if(canvas)canvas.style.opacity=l==='off'?'0':'1'};
const quiet=(ms=500)=>{quietUntil=performance.now()+ms;ts.length=ds.length=0};
const motionOK=()=>!reduceMQ.matches&&quality()!=='off';
export function initEnv(){if(root)return;root=document.createElement('div');root.id='env';root.setAttribute('aria-hidden','true');
 root.innerHTML=`<div class="envfb"></div><div class="envstack">${LAYERS.map(l=>`<div class="envL" data-l="${l}"></div>`).join('')}</div><div class="envfx-back"></div><div class="envlight"></div><div class="envdim"></div>`;
 document.body.insertBefore(root,document.body.firstChild);document.body.classList.add('env-on');
 canvas=document.createElement('canvas');canvas.id='envfx';canvas.setAttribute('aria-hidden','true');root.after(canvas);ctx2=canvas.getContext('2d');
 front=document.createElement('div');front.id='env-front';front.setAttribute('aria-hidden','true');front.innerHTML='<div class="envstack"><div class="envL" data-l="fg"></div></div>';canvas.after(front);canvas.style.transition='opacity .5s';
 allL().forEach(el=>{el.style.willChange='transform';el.innerHTML='<div class="envSh" style="position:absolute;inset:0"></div>'}); // will-change set once; .envSh is the wrapper stage.js animates (shake, camera push)
 wipe=document.createElement('div');wipe.id='envwipe';wipe.setAttribute('aria-hidden','true');document.body.appendChild(wipe);
 addEventListener('resize',()=>{anchor(true);sizeCanvas()});sizeCanvas();
 ['pointerdown','keydown'].forEach(t=>addEventListener(t,()=>{lastInput=performance.now()},{passive:true}));
 document.addEventListener('visibilitychange',()=>{lastT=performance.now();quiet(500)});
 quiet(1500);
 // live: toggling the OS reduced-motion setting rebuilds effects at once
 try{reduceMQ.addEventListener('change',()=>{cur='';curEnv=null;syncEnv()})}catch(_){}
 startLoop()}
const bandOf=(act,f)=>ENV.bands.find(b=>b.act===act&&f>=b.floors[0]&&f<=b.floors[1]);
const bandEnv=(act,f)=>{const b=bandOf(act,f);return b?b.env:'a1_shore'};
const allL=()=>document.querySelectorAll('#env .envL,#env-front .envL');
let forced=null;
export function envKeyFor(){if(forced)return forced;const s=W.S&&W.S.screen,run=W.run;
 if(!run||s==='title')return {id:'a1_shore',grade:'title',dim:.55};
 if(s==='travel')return {id:'tr_start',grade:'normal',dim:.15};
 if(s==='map'&&ENV.envs.map_a1&&ENV.envs.map_a1.art&&(run.act||1)===1){const f=Math.max(1,run.floor||1);return {id:'map_a1',grade:'map',dim:.1,band:bandEnv(1,Math.min(14,f+(run.pos.r>=0?1:0)))}}
 const act=run.act||1,floor=Math.max(1,run.floor||1);
 if(s==='combat'&&W.cb){if(!W.cb.envKey){const boss=W.cb.ens.find(e=>e.boss);
   W.cb.envKey=W.cb.kind==='boss'&&boss?{id:ENV.bossLair[boss.key]||bandEnv(act,15),grade:'boss'}:{id:bandEnv(act,floor),grade:W.cb.kind==='elite'?'elite':'normal'}}
  return last=W.cb.envKey}
 if(s==='event'||s==='reward'||s==='pick'||s==='msg'||s==='potpick')return {...(last||{id:bandEnv(act,floor),grade:'normal'}),dim:.55};
 if(s==='end')return {...(last||{id:bandEnv(act,floor)}),grade:'boss',dim:.5};
 const room={event:'event',shop:'shop',rest:'rest',chest:'treasure'}[s];
 if(room)return {id:(ENV.screenScene[room]||{})[act]||(ENV.screenScene[room]||{})[1],grade:'room',dim:{event:.5,shop:.3,rest:.25,treasure:.8}[room]};
 return {id:bandEnv(act,Math.min(14,floor+(run.pos.r>=0?1:0))),grade:'map',dim:.4}}
// Called after every render(): touches the DOM only when the key changes.
export function syncEnv(){if(!root)return;const scr=(W.S&&W.S.screen)+'|'+(W.S&&W.S.view||'');if(scr!==lastScr){lastScr=scr;quiet(500);if(adaptive!=='full'&&lastP75<=panelMs()*1.25)govTo(adaptive==='off'?'reduced':'full')} // next screen: one step back up if the last stretch ran smooth
 startLoop();const k=envKeyFor();const sig=`${k.id}|${k.band||''}|${k.grade}|${k.dim||0}|${quality()}`;anchor();
 overlayOpen=!!document.querySelector('#app .ov');document.body.classList.toggle('env-combat',!!(W.S&&W.S.screen==='combat'));
 document.body.classList.toggle('scene-choice',['event','reward','pick','msg','potpick'].includes(W.S.screen)||W.S.ov==='tasks');
 if(sig===cur)return;const prev=cur;cur=sig;
 const e0=ENV.envs[k.id]||ENV.envs.a1_shore||{};const e=k.id==='map_a1'?mapEnv(e0,k.band):e0;const g=ENV.grades[k.grade]||{tint_add:0,vig_add:0};
 const changedEnv=root.dataset.env!==k.id;
 root.dataset.env=k.id;root.dataset.grade=k.grade;if(k.band)root.dataset.band=k.band;else delete root.dataset.band;if(root.dataset.q!==quality())root.dataset.q=front.dataset.q=quality();
 // transitions (visual only)
 if(prev&&changedEnv){const kind=k.grade==='boss'?'iris':(k.grade==='normal'||k.grade==='elite')&&W.S.screen==='combat'?'wipe':'fade';playTransition(kind,k.grade==='elite'?'#7a2e4a':(e.pal&&e.pal[2])||'#0b1a20')}
 root.querySelector('.envfb').style.background=e.bg||'';
 // painted layers: each layer is the full rect space (3600x1440); every shipped file sits at its rect (trimmed mid / fg-l / fg-r)
 const sp=e.space||[3600,1440];root.classList.toggle('has-art',!!e.art);
 allL().forEach(el=>swapLayer(el,(e.art&&e.art[el.dataset.l])||[],sp));
 const t=e.tint||{col:'#000',a:0},v=e.vig||{s:.4,col:'#000'};
 const hx=(c,a)=>c+Math.round(Math.max(0,Math.min(1,a))*255).toString(16).padStart(2,'0');
 root.querySelector('.envlight').style.background=`radial-gradient(ellipse 75% 70% at 50% 45%, transparent 55%, ${hx(v.col,(v.s||.4)+(g.vig_add||0)+.3)} 100%), linear-gradient(${hx(t.col,(t.a||0)+(g.tint_add||0))}, ${hx(t.col,(t.a||0)+(g.tint_add||0))})`;
 root.querySelector('.envdim').style.opacity=k.dim?1-k.dim:0;front.style.opacity=k.dim?k.dim:1;
 document.body.style.setProperty('--env-rim',e.rim||'#8fa3c7');
 {const ms=mapSheet();document.body.style.setProperty('--map-sheet',ms?`url("${new URL(ms,document.baseURI).href}")`:'none')} // absolute: a url() in a custom property resolves against the stylesheet (css/)
 // enemy rim light (AD): on where the backdrop swallows silhouettes (Matriarch's green hollow); strength 0..1
 document.body.style.setProperty('--env-rim-s',String(RIM_ON[k.id]||0));
 const fx=(e.fx||[]).concat(g.extra||g.fx||[]);
 if(changedEnv||curEnv!==k.id+quality()){curEnv=k.id+quality();buildCssFx(fx);buildParticles(fx);
  if(W.S.screen==='combat'&&motionOK())slideIn()}
 // band toast on the map
 if(W.S.screen==='map'&&W.run){const b=bandOf(W.run.act||1,Math.max(1,Math.min(14,(W.run.floor||0)+1)));if(b&&lastBand&&b.band!==lastBand.band)bandToast(ENV.envs[b.env]?ENV.envs[b.env].n:b.band);lastBand=b}}
// A/B art swap: the new art is built off-screen in its own box, decoded (img.decode, off the main thread), then faded in OVER the old
// art, which is removed only after the fade. The old art is never blanked and a slow decode never freezes a frame.
function swapLayer(el,list,sp){const sig=list.map(x=>x.f).join('|');const sh=el.firstChild;
 if(el.dataset.src===sig){el.style.opacity=list.length?1:0;return}
 el.dataset.src=sig;
 if(!list.length){el.style.opacity=0;setTimeout(()=>{if(el.dataset.src===sig)sh.innerHTML=''},450);return}
 const box=document.createElement('div');box.className='envS';box.style.cssText='position:absolute;inset:0;opacity:0;transition:opacity .35s';
 box.innerHTML=list.map(x=>`<i class="envI" style="left:${x.r[0]/sp[0]*100}%;top:${x.r[1]/sp[1]*100}%;width:${x.r[2]/sp[0]*100}%;height:${x.r[3]/sp[1]*100}%"></i>`).join('');
 const load=(x,i)=>{const im=new Image();im.decoding='async';im.src=x.f;
  const done=()=>{const it=box.children[i];if(it)it.style.backgroundImage=`url("${x.f}")`};
  return (im.decode?im.decode():new Promise((ok,no)=>{im.onload=ok;im.onerror=no})).then(done,()=>{})};
 Promise.race([Promise.all(list.map(load)),new Promise(r=>setTimeout(r,3000))]).then(()=>{if(el.dataset.src!==sig)return;
  const fresh=!sh.firstChild||el.style.opacity==='0';rebuilds++;
  if(fresh)box.style.transition='none';sh.appendChild(box);el.style.opacity=1;box.getBoundingClientRect();box.style.opacity=1;
  setTimeout(()=>{if(box.parentNode===sh)while(sh.firstChild&&sh.firstChild!==box)sh.firstChild.remove()},fresh?60:450)})}
// ---------- camera: slide-in (cam.x 1 → 0, 900 ms cubic-out) via transform on each layer ----------
let cam={x:0,from:0,t0:0,dur:0};
function slideIn(){cam={x:1,from:1,t0:performance.now(),dur:window.FAST?315:900};root.classList.add('sliding')}
function applyCam(now){if(!cam.dur)return;const p=Math.min(1,(now-cam.t0)/cam.dur);cam.x=cam.from*(1-(1-Math.pow(1-p,3)));
 const vw=innerWidth;allL().forEach(el=>{const f=(ENV.layers[el.dataset.l]||{}).factor||0;el.style.transform=`translate3d(${(-cam.x*f*.03*vw).toFixed(1)}px,0,0)`});
 if(p>=1){cam.dur=0;root.classList.remove('sliding');allL().forEach(el=>{el.style.transform=''})}}
// ---------- CSS effects ----------
function buildCssFx(fx){const box=root.querySelector('.envfx-back');const q=quality();if(q==='off'){box.innerHTML='';return}
 let h='';fx.filter(f=>f.render==='css').forEach((f,k)=>{const n=Math.max(1,Math.round((f.n||1)*(q==='reduced'?.5:1)));const col=f.col||'#fff',a=f.a||.2;
  for(let i=0;i<n;i++){const st=`--c:${col};--a:${a};--i:${i};--n:${n};--spd:${Math.max(2,f.spd||4)};--per:${f.period_s||9}s;--sway:${f.sway_deg||3}deg;--hz:${f.hz||.6}`;
   if(['fog','shafts','caustics','ripples','flicker','rings','sweep','aurora','corona','wavecrash'].includes(f.t))h+=`<i class="efx ${f.t}" style="${st}"></i>`;
   else if(f.t==='lightning'&&i===0)h+=`<i class="efx lightning" data-every="${JSON.stringify(f.every_s||[8,12])}" style="${st}"></i>`}});
 box.innerHTML=h;box.classList.toggle('still',!motionOK())}
// ---------- canvas particles ----------
let parts=[],emitters=[],sprites={},lastT=performance.now(),lastDraw=0,lastInput=performance.now(),overlayOpen=false,flashT=0,nextFlash=0;
export const PARTICLE_CAP={full:300,reduced:150,off:0};
function sizeCanvas(){if(!canvas)return;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*d);canvas.height=Math.round(innerHeight*d);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx2.setTransform(d,0,0,d,0,0)}
function sprite(col,size,kind){const key=col+size+kind;if(sprites[key])return sprites[key];const s=Math.max(2,Math.ceil(size*4));const c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
 const r=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,col);r.addColorStop(kind==='soft'?.2:.55,col);r.addColorStop(1,col+'00');g.fillStyle=r;g.fillRect(0,0,s,s);return sprites[key]=c}
const CANVAS_TYPES=new Set(['rain','drizzle','hail','uprain','spray','spores','motes','dust','phosphor','embers','bubbles','drips','sparks','wind','birds','vortex','snowash']);
function buildParticles(fx){parts=[];emitters=[];const q=quality();const cap=PARTICLE_CAP[q];if(!cap||!motionOK()){if(ctx2)ctx2.clearRect(0,0,canvas.width,canvas.height);return} // Effects Off: no frozen last frame
 const list=fx.filter(f=>f.render==='canvas'&&CANVAS_TYPES.has(f.t));let total=list.reduce((a,f)=>a+(f.n||0),0);const scale=Math.min(q==='reduced'?.5:1,cap/Math.max(1,total));
 const sx=innerWidth/832,sy=innerHeight/384;
 for(const f of list){const n=Math.max(1,Math.floor((f.n||0)*scale));const em={...f,n,img:sprite(f.col||'#fff',f.size||1.5,['motes','spores','dust','phosphor','bubbles','embers'].includes(f.t)?'soft':'hard'),sx,sy,burstT:0};emitters.push(em);
  for(let i=0;i<n;i++)parts.push(spawnP(em,true))}
 parts.length=Math.min(parts.length,cap)}
function spawnP(em,init){const w=innerWidth,h=innerHeight;const rnd=Math.random;const sp=(em.spd||10)*em.sx;const dir=(em.dir!=null?em.dir:-90)*Math.PI/180;
 const p={em,x:rnd()*w,y:rnd()*h,vx:Math.cos(dir)*sp,vy:Math.sin(dir)*sp,life:1e9,age:0,ph:rnd()*6.28,sz:(em.size||1.5)};
 switch(em.t){case 'rain':case 'drizzle':case 'hail':case 'uprain':if(!init){if(em.t==='uprain')p.y=h+5;else p.y=-5}break;
  case 'drips':p.y=init?rnd()*h:rnd()*h*.2;p.vy=Math.abs(sp);p.vx=0;break;
  case 'bubbles':p.y=init?rnd()*h:h+5;p.vy=-Math.abs(sp);p.vx=0;break;
  case 'embers':p.y=init?rnd()*h:h*.7+rnd()*h*.3;p.vy=-Math.abs(sp);p.vx=(rnd()-.5)*sp*.4;p.life=3+rnd()*3;break;
  case 'spray':p.x=w*(.1+rnd()*.8);p.y=h*.72;p.vx=(rnd()-.5)*sp*.6;p.vy=-sp*(.6+rnd()*.6);p.life=init?0:1.4;p.age=init?2:0;break;
  case 'sparks':p.life=.3+rnd()*.5;p.x=w*(.3+rnd()*.5);p.y=h*(.3+rnd()*.3);p.vx=(rnd()-.5)*sp;p.vy=(rnd()-.5)*sp;break;
  case 'wind':p.vx=sp;p.vy=0;p.len=(em.size||30)*em.sx;if(!init)p.x=-p.len;break;
  case 'birds':p.y=h*(.08+rnd()*.25);p.vx=sp*(rnd()<.5?-1:1);p.vy=0;if(!init)p.x=p.vx>0?-20:w+20;break;
  case 'vortex':p.r=40+rnd()*h*.4;p.a=rnd()*6.28;break;
  default:p.vx=(rnd()-.5)*sp;p.vy=(rnd()-.5)*sp}
 return p}
function step(dt,n){const w=innerWidth,h=innerHeight;const now=performance.now()/1000;
 for(const em of emitters)if(em.t==='spray'&&em.burst_every_s){em.burstT-=dt;if(em.burstT<=0){em.burstT=em.burst_every_s;let k=0;for(const p of parts)if(p.em===em&&k<em.n){Object.assign(p,spawnP(em,false));k++}}}
 for(let i=0;i<n;i++){const p=parts[i],t=p.em.t;p.age+=dt;
  if(t==='vortex'){p.a+=dt*(p.em.spd||40)/p.r;p.x=w*.62+Math.cos(p.a)*p.r;p.y=h*.45+Math.sin(p.a)*p.r*.5;continue}
  if(t==='spray'){p.vy+=260*p.em.sy*dt}
  if(['spores','motes','dust','phosphor','snowash'].includes(t)){p.vx+=Math.sin(now+p.ph)*2*dt;p.vy+=Math.cos(now*.7+p.ph)*2*dt}
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  const out=p.x<-60||p.x>w+60||p.y<-30||p.y>h+30||p.age>p.life||(t==='bubbles'&&p.y<h*.15);
  if(out&&!(t==='spray'&&p.em.burst_every_s))parts[i]=spawnP(p.em,false);
  if(['spores','motes','dust','phosphor','snowash'].includes(t)){if(p.x<0)p.x+=w;if(p.x>w)p.x-=w;if(p.y<0)p.y+=h;if(p.y>h)p.y-=h}}}
function draw(n){const w=innerWidth,h=innerHeight;ctx2.clearRect(0,0,w,h);
 for(let i=0;i<n;i++){const p=parts[i],em=p.em,t=em.t;if(t==='spray'&&p.age>p.life)continue;ctx2.globalAlpha=em.a||.5;
  if(t==='rain'||t==='drizzle'||t==='uprain'||t==='wind'){ctx2.strokeStyle=em.col;ctx2.lineWidth=em.size||1;const L=t==='wind'?p.len:Math.min(14,Math.hypot(p.vx,p.vy)*.025);const a=Math.atan2(p.vy,p.vx);ctx2.beginPath();ctx2.moveTo(p.x,p.y);ctx2.lineTo(p.x-Math.cos(a)*L,p.y-Math.sin(a)*L);ctx2.stroke();continue}
  if(t==='birds'){ctx2.strokeStyle=em.col;ctx2.lineWidth=1.4;const s=em.size||8;const f=Math.sin(p.age*8+p.ph)*s*.3;ctx2.beginPath();ctx2.moveTo(p.x-s/2,p.y-f);ctx2.lineTo(p.x,p.y);ctx2.lineTo(p.x+s/2,p.y-f);ctx2.stroke();continue}
  if(t==='embers'||t==='sparks')ctx2.globalAlpha=(em.a||.5)*Math.max(0,1-p.age/p.life)*(.6+.4*Math.sin(p.age*20+p.ph));
  const s=em.img.width/(t==='bubbles'?1.6:2);ctx2.drawImage(em.img,p.x-s/2,p.y-s/2,s,s)}
 ctx2.globalAlpha=1}
function startLoop(){if(raf||!motionOK())return;lastT=performance.now();raf=requestAnimationFrame(loop)}
function stopLoop(){if(raf)cancelAnimationFrame(raf);raf=0;if(ctx2)ctx2.clearRect(0,0,canvas.width,canvas.height)}
function loop(now){raf=requestAnimationFrame(loop);const dtMs=now-lastT;lastT=now;if(document.hidden)return;
 if(!motionOK()&&!cam.dur){stopLoop();return} // Effects Off / reduced motion: nothing animates, so no rAF at all
 const live=(parts.length||cam.dur)&&!overlayOpen;
 // governor: env frames only, ignoring 500 ms after a screen / visibility change. Down only after >=3 s with p75 > 1.5x the panel interval.
 if(live&&dtMs>4&&dtMs<1000){hist[dtMs<9.7?0:dtMs<13.9?1:2]++;if(hist[0]+hist[1]+hist[2]>2000)for(let i=0;i<3;i++)hist[i]>>=1;
  if(now>=quietUntil){ts.push(now);ds.push(dtMs);while(ts.length&&now-ts[0]>3000){ts.shift();ds.shift()}
   if(now-ts[0]>=1000){lastP75=p75(ds);if(now-ts[0]>=2900&&lastP75>panelMs()*1.5&&adaptive!=='off'){govTo(adaptive==='full'?'reduced':'off')}}}}
 applyCam(now);
 if(!parts.length&&!emitters.length)return;
 if(overlayOpen||adaptive==='off')return;
 const idle=now-lastInput>30000;const minDt=idle?1000/30:1000/60;if(now-lastDraw<minDt-1)return;
 const dt=Math.min(.05,(now-(lastDraw||now))/1000);lastDraw=now;const n=adaptive==='reduced'?(parts.length+1)>>1:parts.length;step(dt,n);draw(n)}
// ---------- transitions (visual only; never block input) ----------
function playTransition(kind,col){if(!wipe||!wipe.animate)return;const fast=(window.FAST?.35:1)*U(1);const rm=reduceMQ.matches||quality()==='off';
 wipe.className='';wipe.style.setProperty('--wc',col);
 if(rm||kind==='fade'){wipe.className='fade';wipe.animate([{opacity:.6},{opacity:0}],{duration:(rm?200:350)*fast,easing:'ease-out'});return}
 if(kind==='wipe'){wipe.className='wipe';wipe.animate([{transform:'translateX(-110%)'},{transform:'translateX(110%)'}],{duration:800*fast,easing:'cubic-bezier(.4,0,.3,1)'});return}
 if(kind==='iris'){wipe.className='iris';wipe.animate([{clipPath:'circle(0% at 50% 45%)',opacity:1,offset:0},{clipPath:'circle(150% at 50% 45%)',opacity:1,offset:.85},{clipPath:'circle(150% at 50% 45%)',opacity:0}],{duration:1050*fast,easing:'ease-out'});return}}
export function bandToast(name){const el=document.createElement('div');el.className='bandtoast';el.textContent='Entering '+name;document.body.appendChild(el);setTimeout(()=>el.remove(),window.FAST?600:1700)}
// ---------- ground anchor ----------
// In combat the painted floor row (env.foot of the layer space) is aligned to FEET of the viewport; outside combat the 69% line sits at 69%. Layers cover the viewport
// (the S24's 19.5:9 frame is exactly the centred 3120×1440, i.e. 240 px overscan each side), aspect never distorted.
// On screens wider than 2.5:1 the stack grows 4% so the fg parallax still has overscan.
let anchorWidth=0,anchorHeight=0;
function anchor(force){if(!root)return;if(force||!anchorWidth){anchorWidth=innerWidth;anchorHeight=innerHeight}const vw=anchorWidth,vh=anchorHeight;const combat=W.S.screen==='combat';
 const ASPECT=aspect();let h=Math.max(vh,vw*1.04/ASPECT),top,gy;
 if(combat){// painted floor row (env.foot of the plate) lands on FEET; stack grows until it also covers the bottom of the screen
  const id=envKeyFor().id,foot=ENV.envs[id]?.foot||GROUND;gy=vh*FEET;h=Math.max(h,vh*FEET/foot,vh*(1-FEET)/(1-foot));top=gy-h*foot}
 else{gy=vh*GROUND;top=gy-h*GROUND}
 const sig=`${vw}x${vh}@${Math.round(top)}/${Math.round(h)}`;if(!force&&root.dataset.anchor===sig)return;root.dataset.anchor=sig;
 document.querySelectorAll('#env .envstack,#env-front .envstack').forEach(el=>{const st=el.style;st.height=h+'px';st.width=h*ASPECT+'px';st.top=top+'px'})}
// ---------- debug / tests ----------
export function envState(){return root?{id:root.dataset.env,band:root.dataset.band||undefined,grade:root.dataset.grade,q:root.dataset.q,anchor:root.dataset.anchor,particles:parts.length,gov:adaptive,govFlips,rebuilds,raf:!!raf,cap:PARTICLE_CAP[quality()],
 cssFx:root.querySelectorAll('.envfx-back .efx').length,layers:[...allL()].filter(l=>l.dataset.src).map(l=>l.dataset.l),files:[...document.querySelectorAll('#env .envI,#env-front .envI')].filter(i=>i.style.backgroundImage).length,wipeEvents:getComputedStyle(wipe).pointerEvents}:null}
// G.debugEnv(id, grade): force an environment (shot.js / art review). Pass no id to return to normal routing.
export function debugEnv(id,grade){forced=id&&ENV.envs[id]?{id,grade:grade||'normal'}:null;cur='';syncEnv();return !!forced||!id}
export function envFiles(id){const e=ENV.envs[id];return e&&e.art?Object.values(e.art).flat().map(x=>x.f):[]}
// Offline precache: only the current act's painted layers (they are large).
export function envURLs(act){return Object.entries(ENV.envs).filter(([,e])=>e.act===(act||1)&&e.art).flatMap(([id])=>envFiles(id))}
export function preloadEnv(id){envFiles(id).forEach(f=>{const im=new Image();im.src=f})}
