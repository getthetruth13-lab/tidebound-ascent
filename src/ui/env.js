// ui/env.js — environment backgrounds (design-v2 §W.7). Lives OUTSIDE #app, so render() never restarts effects.
//  • routing: per-floor band / boss lair / room scene / travel (envKeyFor)
//  • 5 parallax layers (sky far mid ground fg) with image-set @2x/@3x, ground anchored to the battle floor,
//    camera slide-in on battle entry (transform only) and idle drift on mid/fg (CSS `translate`, composited)
//  • ambient effects: none (code-drawn fog/particles/rings deleted 2026-10-13; painted effects to come)
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
import {syncLiving,prewarmLiving} from './env-living.js';
import './gfxstats.js';
const LAYERS=['sky','far','mid','ground'];// fg lives in #env-front (design-v2 §W.7.3 DOM order: over the figures, under the UI)
export const FEET=.694; // the painted battle floor: feet of every figure sit on this fraction of the viewport (sceneGeom, anchor() and stage all read it)
// C2 sun seal: on a landscape fight the whole standing line (figures, painted floor, HP bars, status rows) is 150px higher on a 1080-tall canvas, so nothing sits under the End Turn button. Portrait stays on FEET.
export const FIGHT_LIFT=150/1080;
export function fightFeet(vw,vh){return FEET-(vw>vh?FIGHT_LIFT:0)}
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
 allL().forEach(el=>{el.innerHTML='<div class="envSh" style="position:absolute;inset:0"></div>'}); // will-change comes from css only while the camera slides (gfxmem: an inline will-change kept all 5 full-size layers resident); .envSh is the wrapper stage.js animates (shake, camera push)
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
// B061: the reward tiles sit on the battle scene itself (hero + remains), so its background keeps the battle look with only a light dim
const victoryView=S=>!!(S&&S.screen==='reward'&&S.scene&&S.cardsOpen==null&&S.swap==null);
// v0.6.43 (as-is wiring, below the 9 review bar): Act 2 event scenes show a painted room env (ev_a2_*) instead of the last battle env + Act 1 painting.
const A2_EV_ENV={chapel:['a2_tithebox','a2_brazier','a2_quietbell','a2_holdstone','a2_lanternlick'],armoury:['a2_armoury','a2_magazine','a2_drill','a2_oathanvil','a2_pressgang','a2_oilcask'],mess:['a2_mess','a2_surgeon','a2_qmgift','a2_grellread','a2_auction']};
export function a2EventEnv(){const S=W.S,run=W.run;if(!S||S.screen!=='event'||!run||(run.act||1)!==2||!S.ev||!/^a2_/.test(S.ev.id||''))return null;
 let k='yard';for(const n in A2_EV_ENV)if(A2_EV_ENV[n].includes(S.ev.id))k=n;const id='ev_a2_'+k;const e=ENV.envs[id];return e&&e.art?id:null}
export function a2TravelEnv(){const S=W.S,run=W.run;if(!S||S.screen!=='travel'||S.kind!=='act'||S.to!==2)return null;const id=S.card?'tc_a2':'tr_a1a2';const e=ENV.envs[id];return e&&e.art?id:null}
export function envKeyFor(){if(forced)return forced;const s=W.S&&W.S.screen,run=W.run;
 if(!run||s==='title')return {id:'a1_shore',grade:'title',dim:.55};
 if(s==='travel'){const t2=a2TravelEnv();if(t2)return {id:t2,grade:'room',dim:0};return {id:'tr_start',grade:'normal',dim:.15}}
 {const ev2=a2EventEnv();if(ev2)return {id:ev2,grade:'room',dim:0}}
 if(s==='map'&&ENV.envs.map_a1&&ENV.envs.map_a1.art&&(run.act||1)===1){const f=Math.max(1,run.floor||1);return {id:'map_a1',grade:'map',dim:.1,band:bandEnv(1,Math.min(14,f+(run.pos.r>=0?1:0)))}}
 const act=run.act||1,floor=Math.max(1,run.floor||1);
 if(s==='combat'&&W.cb){if(!W.cb.envKey){const boss=W.cb.ens.find(e=>e.boss);
   W.cb.envKey=W.cb.kind==='boss'&&boss?{id:ENV.bossLair[boss.key]||bandEnv(act,15),grade:'boss'}:{id:bandEnv(act,floor),grade:W.cb.kind==='elite'?'elite':'normal'}}
  return last=W.cb.envKey}
 if(victoryView(W.S)&&last)return last; // the very same background as the fight; the reward scene dims itself
 if(s==='event'||s==='reward'||s==='pick'||s==='msg'||s==='potpick')return {...(last||{id:bandEnv(act,floor),grade:'normal'}),dim:.55};
 if(s==='end')return {...(last||{id:bandEnv(act,floor)}),grade:'boss',dim:.5};
 const room={event:'event',shop:'shop',rest:'rest',chest:'treasure'}[s];
 if(room)return {id:(ENV.screenScene[room]||{})[act]||(ENV.screenScene[room]||{})[1],grade:'room',dim:(ENV.envs[(ENV.screenScene[room]||{})[act]]||{}).dim??{event:.5,shop:.3,rest:.25,treasure:.8}[room]};
 return {id:bandEnv(act,Math.min(14,floor+(run.pos.r>=0?1:0))),grade:'map',dim:.4}}
// Called after every render(): touches the DOM only when the key changes.
// death-fix: the backdrop signature syncEnv() is about to apply vs the one on screen, so crossfade() can decide BEFORE paying for frozenCopy (15-50ms on phones)
// whether the backdrop changes at all. Must stay in step with the sig built in syncEnv().
const nextSig=()=>{const k=envKeyFor();return `${k.id}|${k.band||''}|${k.grade}|${k.dim||0}|${quality()}`};
// body.env-combat / body.scene-choice also restyle #env (stack position, blur + darken), so a flip of either counts as a backdrop change too
const sceneCls=()=>({'env-combat':!!(W.S&&(W.S.screen==='combat'||victoryView(W.S))),'scene-choice':!victoryView(W.S)&&(['event','reward','pick','msg','potpick'].includes(W.S.screen)||W.S.ov==='tasks'),'env-still':!!(W.S&&W.S.screen==='end'),'a2-room':!!a2EventEnv()});
export function envWillChange(){if(!root)return false;if(nextSig()!==cur)return true;const c=sceneCls();return Object.keys(c).some(n=>document.body.classList.contains(n)!==c[n])}
export function syncEnv(){if(!root)return;const scr=(W.S&&W.S.screen)+'|'+(W.S&&W.S.view||'');if(scr!==lastScr){lastScr=scr;quiet(500);document.body.toggleAttribute('data-env-rest',['title','reward','event','pick','msg','potpick'].includes(W.S.screen));if(adaptive!=='full'&&lastP75<=panelMs()*1.25)govTo(adaptive==='off'?'reduced':'full');if(W.S.screen==='map')prewarmEnv(W.run?bandEnv(W.run.act||1,Math.min(14,Math.max(1,(W.run.floor||1)+1))):'a1_shore')} // next screen: one step back up if the last stretch ran smooth
 startLoop();const k=envKeyFor();const sig=nextSig();anchor();
 overlayOpen=!!document.querySelector('#app .ov');{const c=sceneCls();for(const n in c)document.body.classList.toggle(n,c[n])}
 if(sig===cur)return;const prev=cur;cur=sig;
 const e0=ENV.envs[k.id]||ENV.envs.a1_shore||{};const e=k.id==='map_a1'?mapEnv(e0,k.band):e0;const g=ENV.grades[k.grade]||{tint_add:0,vig_add:0};
 const changedEnv=root.dataset.env!==k.id;
 root.dataset.env=k.id;root.dataset.grade=k.grade;if(k.band)root.dataset.band=k.band;else delete root.dataset.band;if(root.dataset.q!==quality())root.dataset.q=front.dataset.q=quality();
 // transitions (visual only)
 // v0.6.2: normal/elite fights no longer run the teal tide wipe; the screen crossfade is the whole transition (the flat panel swept across the battle).
 if(prev&&changedEnv){const kind=k.grade==='boss'?'iris':(k.grade==='normal'||k.grade==='elite')&&W.S.screen==='combat'?'':'fade';if(kind)playTransition(kind,k.grade==='elite'?'#7a2e4a':(e.pal&&e.pal[2])||'#0b1a20')}
 root.querySelector('.envfb').style.background=e.bg||'';
 // painted layers: each layer is the full rect space (3600x1440); every shipped file sits at its rect (trimmed mid / fg-l / fg-r)
 const sp=e.space||[3600,1440];root.classList.toggle('has-art',!!e.art);
 allL().forEach(el=>swapLayer(el,(e.art&&e.art[el.dataset.l])||[],sp));
 root.toggleAttribute('data-still',!!e.still);root.toggleAttribute('data-sandwich',!!e.sandwich);document.body.toggleAttribute('data-still-env',!!e.still);front.toggleAttribute('data-still',!!e.still);syncLiving(k.id,e); // still env: solids never move; painted living layers only
 const t=e.tint||{col:'#000',a:0},v=e.vig||{s:.4,col:'#000'};
 const hx=(c,a)=>c+Math.round(Math.max(0,Math.min(1,a))*255).toString(16).padStart(2,'0');
 root.querySelector('.envlight').style.background=`radial-gradient(ellipse 75% 70% at 50% 45%, transparent 55%, ${hx(v.col,(v.s||.4)+(g.vig_add||0)+.3)} 100%), linear-gradient(${hx(t.col,(t.a||0)+(g.tint_add||0))}, ${hx(t.col,(t.a||0)+(g.tint_add||0))})`;
 root.querySelector('.envdim').style.opacity=k.dim?1-k.dim:0;front.style.opacity=k.dim?k.dim:1;
 document.body.style.setProperty('--env-rim',e.rim||'#8fa3c7');
 {const ms=mapSheet();document.body.style.setProperty('--map-sheet',ms?`url("${new URL(ms,document.baseURI).href}")`:'none')} // absolute: a url() in a custom property resolves against the stylesheet (css/)
 // enemy rim light (AD): on where the backdrop swallows silhouettes (Matriarch's green hollow); strength 0..1
 document.body.style.setProperty('--env-rim-s',String(RIM_ON[k.id]||0));
 if(changedEnv||curEnv!==k.id+quality()){curEnv=k.id+quality();
  if(W.S.screen==='combat'&&motionOK()&&!e.still)slideIn()}
 // band toast on the map
 if(W.S.screen==='map'&&W.run){const b=bandOf(W.run.act||1,Math.max(1,Math.min(14,(W.run.floor||0)+1)));if(b&&lastBand&&b.band!==lastBand.band)bandToast(ENV.envs[b.env]?ENV.envs[b.env].n:b.band);lastBand=b}}
// A/B art swap: the new art is built off-screen in its own box, decoded (img.decode, off the main thread), then faded in OVER the old
// art, which is removed only after the fade. The old art is never blanked and a slow decode never freezes a frame.
function swapLayer(el,list,sp){const sig=list.map(x=>x.f).join('|');const sh=el.firstChild;
 if(el.dataset.src===sig){el.style.opacity=list.length?1:0;return}
 el.dataset.src=sig;const tok=el._tok=(el._tok||0)+1; // victory-sweep: a late decode of an older swap to the same art must not append/prune over a newer one
 if(!list.length){el.style.opacity=0;setTimeout(()=>{if(el.dataset.src===sig)sh.innerHTML=''},450);return}
 const box=document.createElement('div');box.className='envS';box.style.cssText='position:absolute;inset:0;opacity:0;transition:opacity .35s';
 box.innerHTML=list.map(x=>`<i class="envI" style="left:${x.r[0]/sp[0]*100}%;top:${x.r[1]/sp[1]*100}%;width:${x.r[2]/sp[0]*100}%;height:${x.r[3]/sp[1]*100}%"></i>`).join('');
 const load=(x,i)=>{const im=new Image();im.decoding='async';im.src=x.f;
  const done=()=>{const it=box.children[i];if(it)it.style.backgroundImage=`url("${x.f}")`};
  return (im.decode?im.decode():new Promise((ok,no)=>{im.onload=ok;im.onerror=no})).then(done,()=>{})};
 Promise.race([Promise.all(list.map(load)),new Promise(r=>setTimeout(r,3000))]).then(()=>{if(el.dataset.src!==sig||el._tok!==tok)return;
  const fresh=!sh.firstChild||el.style.opacity==='0';rebuilds++;
  if(fresh)box.style.transition='none';sh.appendChild(box);el.style.opacity=1;box.getBoundingClientRect();box.style.opacity=1;
  setTimeout(()=>{if(box.parentNode===sh)[...sh.children].forEach(c=>{if(c!==box&&!c.classList.contains('envlv'))c.remove()})},fresh?60:450)})} // .envlv (painted living layers) is owned by env-living.js
// ---------- camera: slide-in (cam.x 1 → 0, 900 ms cubic-out) via transform on each layer ----------
let cam={x:0,from:0,t0:0,dur:0};
function slideIn(){cam={x:1,from:1,t0:performance.now(),dur:window.FAST?315:900};root.classList.add('sliding')}
function applyCam(now){if(!cam.dur)return;const p=Math.min(1,(now-cam.t0)/cam.dur);cam.x=cam.from*(1-(1-Math.pow(1-p,3)));
 const vw=innerWidth;allL().forEach(el=>{const f=(ENV.layers[el.dataset.l]||{}).factor||0;el.style.transform=`translate3d(${(-cam.x*f*.03*vw).toFixed(1)}px,0,0)`});
 if(p>=1){cam.dur=0;root.classList.remove('sliding');allL().forEach(el=>{el.style.transform=''})}}
// Ambient code-drawn effects (CSS .efx + canvas particles) were deleted 2026-10-13 (Spencer): they will be redone as painted effects.
// The #envfx canvas stays (empty) for the loop / tests; the rAF loop now only drives the camera slide-in and the load governor.
let lastT=performance.now(),lastInput=performance.now(),overlayOpen=false;const parts=[];
export const PARTICLE_CAP={full:300,reduced:150,off:0};
function sizeCanvas(){if(!canvas)return;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(innerWidth*d);canvas.height=Math.round(innerHeight*d);canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx2.setTransform(d,0,0,d,0,0)}
function startLoop(){if(raf||!motionOK())return;lastT=performance.now();raf=requestAnimationFrame(loop)}
function stopLoop(){if(raf)cancelAnimationFrame(raf);raf=0;if(ctx2)ctx2.clearRect(0,0,canvas.width,canvas.height)}
function loop(now){raf=requestAnimationFrame(loop);const dtMs=now-lastT;lastT=now;if(document.hidden)return;
 if(!motionOK()&&!cam.dur){stopLoop();return} // Effects Off / reduced motion: nothing animates, so no rAF at all
 const live=(cam.dur||(root.hasAttribute('data-still')&&W.S&&W.S.screen==='combat'))&&!overlayOpen; // still env: the painted living layers are the load to govern
 // governor: env frames only, ignoring 500 ms after a screen / visibility change. Down only after >=3 s with p75 > 1.5x the panel interval.
 if(live&&dtMs>4&&dtMs<1000){hist[dtMs<9.7?0:dtMs<13.9?1:2]++;if(hist[0]+hist[1]+hist[2]>2000)for(let i=0;i<3;i++)hist[i]>>=1;
  if(now>=quietUntil){ts.push(now);ds.push(dtMs);while(ts.length&&now-ts[0]>3000){ts.shift();ds.shift()}
   if(now-ts[0]>=1000){lastP75=p75(ds);if(now-ts[0]>=2900&&lastP75>panelMs()*1.5&&adaptive!=='off'){govTo(adaptive==='full'?'reduced':'off')}}}}
 applyCam(now);
}
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
function anchor(force){if(!root)return;if(force||!anchorWidth){anchorWidth=innerWidth;anchorHeight=innerHeight}const vw=anchorWidth,vh=anchorHeight;const combat=W.S.screen==='combat'||(W.S.screen==='reward'&&!!W.S.scene); // victory-sweep: the reward screen keeps the battle scene (hero + remains on the fight line), so the backdrop keeps the fight anchor; it used to snap to the map anchor (stack ~2.2x smaller) the moment the last foe fell
 const ASPECT=aspect();let h=Math.max(vh,vw*1.04/ASPECT),top,gy;const still=!!(ENV.envs[root.dataset.env]||{}).still;
 if(still){h=Math.max(vh,vw/ASPECT);top=vh-h;const sig=`${vw}x${vh}@${Math.round(top)}/${Math.round(h)}`;if(!force&&root.dataset.anchor===sig)return;root.dataset.anchor=sig;
  document.querySelectorAll('#env .envstack,#env-front .envstack').forEach(el=>{const st=el.style;st.height=h+'px';st.width=h*ASPECT+'px';st.top=top+'px'});return} // still env (no parallax): exact cover, bottom anchored, no overscan
 if(combat){// painted floor row (env.foot of the plate) lands on the fight line (FEET, lifted in landscape); stack grows until it also covers the bottom of the screen
  const id=envKeyFor().id,foot=ENV.envs[id]?.foot||GROUND,line=fightFeet(vw,vh);gy=vh*line;h=Math.max(h,vh*line/foot,vh*(1-line)/(1-foot));top=gy-h*foot}
 else{gy=vh*GROUND;top=gy-h*GROUND}
 const sig=`${vw}x${vh}@${Math.round(top)}/${Math.round(h)}`;if(!force&&root.dataset.anchor===sig)return;root.dataset.anchor=sig;
 document.querySelectorAll('#env .envstack,#env-front .envstack').forEach(el=>{const st=el.style;st.height=h+'px';st.width=h*ASPECT+'px';st.top=top+'px'})}
// ---------- debug / tests ----------
export function envState(){return root?{id:root.dataset.env,band:root.dataset.band||undefined,grade:root.dataset.grade,q:root.dataset.q,anchor:root.dataset.anchor,particles:parts.length,gov:adaptive,govFlips,rebuilds,raf:!!raf,cap:PARTICLE_CAP[quality()],
 cssFx:root.querySelectorAll('.envfx-back .efx').length,layers:[...allL()].filter(l=>l.dataset.src).map(l=>l.dataset.l),files:[...document.querySelectorAll('#env .envI,#env-front .envI')].filter(i=>i.style.backgroundImage).length,wipeEvents:getComputedStyle(wipe).pointerEvents}:null}
// G.debugEnv(id, grade): force an environment (shot.js / art review). Pass no id to return to normal routing.
export function debugEnv(id,grade){forced=id&&ENV.envs[id]?{id,grade:grade||'normal'}:null;cur='';syncEnv();return !!forced||!id}
export function envFiles(id){const e=ENV.envs[id];if(!e||!e.art)return [];const live=e.living?[...new Set(JSON.stringify(e.living).match(/art\/[^"]+\.webp/g)||[])]:[];return [...new Set([...Object.values(e.art).flat().map(x=>x.f),...live])]}
// Offline precache: only the current act's painted layers (they are large).
export function envURLs(act){return Object.entries(ENV.envs).filter(([,e])=>e.act===(act||1)&&e.art).flatMap(([id])=>envFiles(id))}
export function preloadEnv(id){envFiles(id).forEach(f=>{const im=new Image();im.src=f})}
// gfxmem: while the map / title is up, decode the next fight's backdrop (img.decode, off the main thread) and bake its living plates in idle slices, one file per task,
// so entering a fight does not stall the dissolve. Once per env id.
const warm=new Set();
export function prewarmEnv(id){if(warm.has(id)||!ENV.envs[id]||window.FAST)return;warm.add(id);const e=ENV.envs[id],q=envFiles(id).slice();
 const idle=f=>typeof requestIdleCallback==='function'?requestIdleCallback(f,{timeout:1500}):setTimeout(f,60);
 const step=()=>{const f=q.shift();if(!f){prewarmLiving(e).catch(()=>{});return}const im=new Image();im.decoding='async';im.src=f;(im.decode?im.decode():Promise.resolve()).catch(()=>{}).then(()=>idle(step))};idle(step)}
