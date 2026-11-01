// ui/screens/select.js: character select v2 "The Lamp Gallery" (Spencer-approved CHARSEL-IDEAS 1-12, see design/CHARSEL-BUILD-NOTES.md).
// Four Lampbearers stand side by side in the flooded lamp gallery, dark silhouettes until hovered/pressed. The drowned sun is the only key
// light: the picked hero is lit from it with a rising wipe, the floor streak swings toward them, the nearer lantern flares in the class tint,
// a bell sounds, and the name is carved into the stone. A tap opens a frameless logbook page above the hero that never blocks the others.
// Begin is a camera push into the sun, washing to gold, then the intro cinematic (newRun). Locked heroes (idea 11) are chained silhouettes.
// v0.6.99 stage: the artist's painted plates (art/v2/charsel/plates/layout-c2d.json, 3600x1440 canvas, screen crop x=240 3120x1440), one <img>
// per plate in json z order (tiled fog plates repeat their img), with .cs-heroes + .cs-halos between fog-far (z5) and near-l (z6).
// Parallax: offset_x = -camera_x * parallax, camera_x clamped to +-240 canvas px (the artist's measured safe travel).
// Heroes are layered under -> cloth -> prop -> lit (lit is screen-blended and shown only on the selected hero).
import {W} from '../../core/state.js';
import {U} from '../../core/timing.js';
import {CLASSES} from '../../core/registry.js';
import {SPRITES} from '../../data/sprites.js';
import {newRun} from '../../engine/run.js';
import {render,TH} from '../render.js';
import {HEROES,ORDER,SPRITE_OF,CHARSEL} from './heroes.js';
import {loadProfile,heroUnlocked,HERO_LOCKS,takeHeroNews} from '../../progress.js';
import {settings} from '../../save.js';
import {reducedMotion} from '../vfx.js';
import * as SND from './charsel-audio.js';
import {CS_LAYOUT,CS_PLATES} from './charsel-layout.js';
export const spriteImg=(cls,c='')=>{const s=SPRITES[SPRITE_OF[cls]];return s?`<img class="${c}" src="${s.f}" alt="" draggable="false" style="aspect-ratio:${s.w}/${s.h}">`:''};
const ART='art/v2/charsel/';
// Per-hero staging. x = centre (fraction of screen width), h = height (fraction of screen height), sun = side facing the sun (+1 right, -1 left).
// art: file stem in art/v2/charsel. Swapping a hero's art = re-run tools/charsel/build.py for that file (names stay the same); h is the only tweak.
// lamp: [x,y] of the hero's carried lamp inside the sprite (fractions). Every Lampbearer's lamp is a light source (glow + flicker).
// Measured on pose4 tide/echo + pose3 carto. Duelist measured on pose4.
// LIT_ART: set true per hero once the painted lit layer (design/CHARSEL-ART-NEEDED.md) replaces the generated stand-in *-lit.webp.
// lamp: [x,y] of the hero's carried lamp inside the body art (fractions, measured on the c2/c3 bodies by the artist, REPORT-charsel-heroes.md).
// L: the hero's layer files (art/v2/charsel), body = the single-image fallback used for --spr / reflection; aw = body width/height.
// piv: prop pivots (fractions of the hero canvas, REPORT-charsel-heroes.md) for the prop layer and the coming rigs.
export const STAGE={
 tide:{x:.135,h:.56,sun:1,tint:'#5fd4c8',lamp:[.86,.31],lampc:'190,245,225',aw:653/1000,piv:[[.82,.43]],L:{body:'tidecaller-body-c3',under:'tidecaller-under-c2',cloth:'tidecaller-cloth-c2',prop:'tidecaller-prop-c1',lit:'tidecaller-lit-c2'}},
 echo:{x:.335,h:.54,sun:1,tint:'#a58cff',lamp:[.28,.28],lampc:'232,200,255',aw:735/1000,piv:[[.28,.09],[.74,.29]],L:{body:'echo-mage-body-c3',under:'echo-mage-under-c1',cloth:'echo-mage-cloth-c1',prop:'echo-mage-prop-c1',lit:'echo-mage-lit-c2'}},
 carto:{x:.665,h:.52,sun:-1,tint:'#ffb257',lamp:[.26,.205],lampc:'255,200,120',aw:678/1000,piv:[[.26,.03],[.78,.33]],L:{body:'cartographer-body-c2',under:'cartographer-under-c1',cloth:'cartographer-cloth-c1',prop:'cartographer-prop-c1',lit:'cartographer-lit-c2'}},
 duel:{x:.865,h:.56,sun:-1,tint:'#ff5a5a',lamp:[.61,.535],lampc:'255,205,130',aw:665/1000,piv:[[.45,.30],[.60,.45],[.75,.50]],L:{body:'duelist-body-c2',under:'duelist-under-c2',cloth:'duelist-cloth-c2',prop:'duelist-prop-c1',lit:'duelist-lit-c2'}}};
export const LIT_ART={tide:true,echo:true,carto:true,duel:true};
export const HERO_PAR=0.55; // heroes + halos move with the ground plate (z3 parallax .55) so their feet stay planted
export const CAM_MAX=CS_LAYOUT.parallax.safe_max_travel_px; // 240
const UI=ART+'ui/';
const icon=d=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const CS_ICON={wave:'M2 15c3 0 3-3 6-3s3 3 6 3 3-3 6-3M2 20c3 0 3-3 6-3s3 3 6 3 3-3 6-3M7 8c2-4 8-5 11-1',crest:'M3 19c4 0 5-9 9-13 1 4 4 6 7 6-2 2-5 7-3 7M3 19h18',shell:'M12 4c5 0 8 5 8 9l-8 7-8-7c0-4 3-9 8-9zM12 4v16M8 6l4 14M16 6l-4 14',
 bell:'M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4M12 3v2',ring:'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16',chain:'M9 7a3 3 0 0 0-4 4l2 2a3 3 0 0 0 4 0M15 17a3 3 0 0 0 4-4l-2-2a3 3 0 0 0-4 0M9 15l6-6',
 eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',cairn:'M8 20h8l-1-4H9zM9 16l1-4h4l1 4M10 12l1-3h2l1 3M11 9l1-3 1 3',road:'M4 21l5-18M20 21l-5-18M12 5v3M12 11v3M12 17v3',
 blade:'M12 2l2 13h-4zM8 15h8M12 15v5M10 21h4',star:'M12 2l2.5 7H22l-6 4.5 2.5 7.5L12 16l-6.5 5 2.5-7.5L2 9h7.5z',drop:'M12 3c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z'};
// Idea 11 locked overlay: the painted lock (ui/lock-c1.webp) over the hero, which is dimmed to brightness .55 in CSS.
const LOCK=`<img class="cs-lockimg" src="${UI}lock-c1.webp" alt="" draggable="false">`;
// Idea 6 per-hero idle overlays (stand-in effects over the whole sprite until the split layers land).
const FX={
 tide:()=>`<span class="fx fx-tide">${[0,1,2,3,4,5,6].map(i=>`<i style="--i:${i}"></i>`).join('')}</span>`,
 echo:(k)=>`<span class="fx fx-echo"><img class="cs-ghost" src="${ART+STAGE[k].L.body}.webp" alt="" draggable="false"></span>`,
 carto:()=>`<span class="fx fx-carto"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M60 40q8 6 4 14t6 12M66 30q10 4 8 14M54 58q-6 8 2 14"/><path d="M20 20q6-2 8 4t8 2"/></svg></span>`,
 duel:()=>`<span class="fx fx-duel"><i class="cs-glint"></i></span>`};
const reduce=()=>reducedMotion()||document.body.classList.contains('reduce-motion');
const lockedK=k=>!heroUnlocked(loadProfile(),k);
const beating=new Set(); // heroes drawn chained for one beat after they unlock (profile.heroSeen, takeHeroNews)
function heroHTML(k,i,foc){const S=STAGE[k],K=CLASSES[k],lk=lockedK(k)||beating.has(k),on=foc===k&&!lk,L=S.L,f=n=>`${ART+L[n]}.webp`,im=(c,n,st='')=>`<img class="${c}" src="${f(n)}" alt="" draggable="false"${st}>`;
 return `<button class="st-pick cs-hero theme-${TH[k]}${on?' on':''}${lk?' locked':''}" data-cls="${k}" data-i="${i}" style="--x:${S.x};--h:${S.h};--sun:${S.sun};--spr:url('${new URL(f('body'),document.baseURI).href}');--tint:${S.tint}" onclick="selectHero('${k}')" aria-label="${K.n}${lk?' (locked)':''}" aria-pressed="${on}">
 <span class="cs-floor"><i class="cs-shadow"></i>${im('cs-refl','body')}</span>
 <span class="st-fig">${im('cs-base cs-under','under')}${im('cs-cloth','cloth')}${im('cs-prop','prop',` style="transform-origin:${S.piv[0][0]*100}% ${S.piv[0][1]*100}%"`)}${im('cs-lit'+(LIT_ART[k]?'':' standin'),'lit')}${LIT_ART[k]?'':'<i class="cs-rim"></i>'}${S.lamp?`<i class="cs-lamp" style="--lx:${S.lamp[0]};--ly:${S.lamp[1]};--lc:${S.lampc}"><i></i></i>`:''}${lk?LOCK:FX[k](k)}</span></button>`}
// Carved names live in .cs-names above the near plates (the heroes stand behind near-l/near-r, json z6/z7, and a name must never be hidden).
function nameHTML(k,foc){const S=STAGE[k],K=CLASSES[k],lk=lockedK(k)||beating.has(k),on=foc===k&&!lk;
 return `<span class="st-slab cs-name${on?' on':''}${lk?' locked':''}" data-cls="${k}" style="--x:${S.x}"><b data-n="${K.n}">${K.n}</b><i>${lk?'Locked':HEROES[k].epithet}</i></span>`}
const PLAYSTYLE={tide:'How you play: move the Tide up and down. Hit 10 for a Crest (damage to all), hit 0 for an Undertow (Guard and cards).',echo:'How you play: Mark one card each turn. It plays again for free at the end of your turn.',carto:'How you play: place Waypoints that act every turn, raise their Rank, or Decamp them for a big payoff.',duel:'How you play: every landed hit builds Momentum. Spend it all on a Flourish for a huge Attack.'};
function loreHTML(k){const K=CLASSES[k],C=CHARSEL[k],S=STAGE[k];
 if(lockedK(k))return `<div class="cs-lore locked" data-cls="${k}" style="--x:${S.x}"><p class="cs-epi">Locked</p><p class="cs-l" style="--l:0">${HERO_LOCKS[k]?.hint||'Not yet.'}</p><i class="cs-thread"></i></div>`;
 return `<div class="cs-lore theme-${TH[k]}" data-cls="${k}" style="--x:${S.x};--tint:${S.tint}" role="note" aria-label="About ${K.n}">${C.lore.map((l,j)=>`<p class="cs-l" style="--l:${j}">${l}</p>`).join('')}
 <p class="cs-play" style="--l:1">${PLAYSTYLE[k]||''}</p>
 <div class="cs-tags">${C.tags.map(([ic,w],j)=>`<span style="--l:${j+2}">${icon(CS_ICON[ic])}<b>${w}</b></span>`).join('')}</div><i class="cs-thread"><i class="cs-link"></i></i></div>`}
// One <img> per plate, in the json's z order. Each plate is placed in canvas px (--u = one canvas px on screen) and moves by --par.
const plateHTML=l=>{const st=`--x:${l.x};--y:${l.y};--w:${l.w};--h:${l.h};--par:${l.parallax};mix-blend-mode:${l.blend};opacity:${l.opacity}`,src=CS_PLATES+l.file;
 if(!l.tile_x)return `<img class="cs-pl cs-par cs-pl-${l.id}" data-pl="${l.id}" data-z="${l.z}" src="${src}" alt="" draggable="false" style="${st}">`;
 const n=Math.ceil((CS_LAYOUT.canvas.w+2*CAM_MAX*l.parallax)/l.w)+2; // tiles from x-w so +-travel never shows an end
 return `<div class="cs-pl cs-par cs-tile cs-pl-${l.id}" data-pl="${l.id}" data-z="${l.z}" style="${st};--n:${n}">${Array.from({length:n},()=>`<img src="${src}" alt="" draggable="false">`).join('')}</div>`};
function stageHTML(foc,sel){let h='';for(const l of [...CS_LAYOUT.layers].sort((a,b)=>a.z-b.z)){h+=plateHTML(l);
  if(l.id==='sun')h+=`<i class="cs-suncall cs-par" style="--par:${l.parallax}"></i><button class="cs-sunbtn cs-par" id="beginfocus" style="--par:${l.parallax}" onclick="beginFocused()" aria-label="Begin" aria-disabled="${!sel}"><span class="cs-begin">Begin</span><span class="cs-prompt">Choose a Lampbearer</span></button>`;
  if(l.id==='fog-far')h+=`<div class="cs-halos">${ORDER.map(k=>`<img class="cs-halo cs-par${foc===k&&!lockedK(k)?' on':''}" data-cls="${k}" src="${UI}halo-c3.webp" alt="" draggable="false" style="--par:${HERO_PAR};--x:${STAGE[k].x};--hw:${(STAGE[k].h*.92*STAGE[k].aw*1.25).toFixed(4)};--tint:${STAGE[k].tint}">`).join('')}</div><div class="cs-heroes cs-par" style="--par:${HERO_PAR}">${ORDER.map((k,i)=>heroHTML(k,i,foc)).join('')}</div>`}
 return h+`<div class="cs-names cs-par" style="--par:${HERO_PAR}">${ORDER.map(k=>nameHTML(k,foc)).join('')}</div>`}
export function selectScr(){for(const k of takeHeroNews()){beating.add(k);setTimeout(()=>{beating.delete(k);charselUnlockBeat(k)},U(700))}
 const S=W.S,foc=S.hero&&CLASSES[S.hero]?S.hero:null,sel=foc&&!lockedK(foc);
 return `<div class="tb-scr tb-select tb-stair cs2${S.lifting?' lifting':''}${foc?' has-sel':''}" data-focus="${foc||''}" style="--fx:${foc?STAGE[foc].x:.5};--tint:${foc?STAGE[foc].tint:'#ffd27a'}">
 <div class="cs-world">
  <div class="cs-stage">${stageHTML(foc,sel)}</div>
  <canvas class="cs-motes" aria-hidden="true"></canvas>
 </div>
 <div class="cs-vig"></div>
 <button class="cs-word cs-backbtn" id="selback" onclick="titleGo('main')">‹ Back</button>
 <h2 class="cs-title">Choose Your Lampbearer</h2>
 <div class="cs-lores">${sel&&S.heroPanel?loreHTML(foc):''}</div>
 <div class="cs-wash"></div></div>`}
// ---------- live (no re-render) state changes so light can travel between heroes ----------
const root=()=>document.querySelector('.cs2');
function setLore(k){const box=document.querySelector('.cs-lores');if(!box)return;for(const o of box.querySelectorAll('.cs-lore:not(.out)')){o.classList.add('out');setTimeout(()=>o.remove(),U(220))}
 if(k){box.insertAdjacentHTML('beforeend',loreHTML(k));const n=box.lastElementChild;placeLore(n);SND.breath()}}
// Keep the page above its hero, clamped inside the screen (it never covers another hero: it sits in the band above all heads).
function placeLore(n){const r=root();if(!n||!r)return;const W_=r.clientWidth,w=n.offsetWidth,x=parseFloat(n.style.getPropertyValue('--x'))*W_;
 const left=Math.max(10,Math.min(W_-w-10,x-w/2));n.style.left=left+'px';n.style.setProperty('--tx',(x-left)+'px')}
// light() edits the live DOM directly, so the render diff (which compares template to template) can miss a change such as a newly locked hero. Re-apply the state after every render.
export function syncSelect(){const r=root();if(!r)return;const k=W.S.hero&&CLASSES[W.S.hero]?W.S.hero:null,lk=k&&lockedK(k);
 for(const b of r.querySelectorAll('.cs-hero')){const on=b.dataset.cls===k&&!b.classList.contains('locked');b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}
 halos(r);const bf=document.getElementById('beginfocus');if(bf)bf.setAttribute('aria-disabled',String(!k||!!lk))}
// The selection halo sits on the floor under the selected (unlocked) hero only.
function halos(r){for(const h of r.querySelectorAll('.cs-halo,.cs-name')){const b=r.querySelector(`.cs-hero[data-cls="${h.dataset.cls}"]`);h.classList.toggle('on',!!b?.classList.contains('on'));if(h.classList.contains('cs-name'))h.classList.toggle('locked',!!b?.classList.contains('locked'))}}
function pulse(el,c){if(!el)return;el.classList.remove(c);void el.offsetWidth;el.classList.add(c)}
function light(k){const r=root();if(!r)return;const prev=r.dataset.focus;r.dataset.focus=k||'';r.classList.toggle('has-sel',!!k);
 if(k){r.style.setProperty('--fx',STAGE[k].x);r.style.setProperty('--tint',STAGE[k].tint)}
 for(const b of r.querySelectorAll('.cs-hero')){const on=b.dataset.cls===k&&!b.classList.contains('locked');b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);if(b.dataset.cls===prev&&prev!==k)pulse(b,'dim')}
 halos(r);
 const lk=k&&lockedK(k);document.getElementById('beginfocus').setAttribute('aria-disabled',String(!k||!!lk));
 if(k&&!lk&&prev!==k){SND.bell(k);SND.swell();motes.focus=STAGE[k].x}}
export function selectHero(cls){if(!CLASSES[cls]||W.S.lifting)return;const S=W.S,same=S.hero===cls,open=!(same&&S.heroPanel);
 W.S={...S,screen:'title',view:'select',hero:cls,heroPanel:open};
 if(!root())return render();light(cls);setLore(open?cls:null)}
export function openHero(cls){if(!CLASSES[cls])return;W.S={...W.S,screen:'title',view:'select',hero:cls,heroPanel:true};if(!root())return render();light(cls);setLore(cls)}
export function closeHero(){W.S={...W.S,heroPanel:false};if(!root())return render();setLore(null)}
export function beginHero(cls){if(!CLASSES[cls]||lockedK(cls))return;SND.stopBed(.3);newRun(cls,{skipTravel:true})} // v0.6.99 (D4, StS): Embark lands on the first map, no travel card
// Idea 10: the others sink, mist pulls back, the camera pushes toward the sun, gold wash, bell -> low drone -> silence, then the intro.
// The drowned sun is the Begin button. Before a pick (or on a locked hero) a tap only prompts: engraved hint + the light wave over the heroes.
export function beginFocused(){const S=W.S,cls=S.hero&&CLASSES[S.hero]?S.hero:null;if(S.lifting)return;
 if(!cls||lockedK(cls)){const r=root();if(r)pulse(r,'prompt');return}
 if(reduce())return beginHero(cls);
 W.S={...S,hero:cls,heroPanel:false,lifting:true};const r=root();if(!r){render()}else{light(cls);setLore(null);r.classList.add('lifting')}
 SND.bell(cls,.12);setTimeout(()=>SND.drone(),U(250));setTimeout(()=>{if(W.S.lifting)beginHero(cls)},U(1600))}
// Tap empty space closes the logbook page.
document.addEventListener('click',e=>{if(!root()||!W.S.heroPanel)return;if(e.target.closest('.cs-hero,.cs-word,button'))return;closeHero()});
// ---------- motion engine: parallax + particles, one rAF loop, self-throttling (S24 notes in CHARSEL-IDEAS) ----------
const motes={focus:.5,run:false,size:null};
const PAR={tx:0,ty:0,x:0,y:0,gyro:false};
addEventListener('pointermove',e=>{if(PAR.gyro||!root())return;PAR.tx=(e.clientX/innerWidth-.5)*2;PAR.ty=(e.clientY/innerHeight-.5)*2},{passive:true});
addEventListener('deviceorientation',e=>{if(!root()||e.gamma==null)return;PAR.gyro=true;const land=Math.abs(window.orientation||screen.orientation?.angle||0)===90;
 const a=land?e.beta:e.gamma,b=land?e.gamma:e.beta;PAR.tx=Math.max(-1,Math.min(1,(a||0)/18));PAR.ty=Math.max(-1,Math.min(1,((b||0)-35)/18))},{passive:true});
// Camera: camera_x = PAR.x * 240 canvas px (clamped); every .cs-par layer reads --cam and its own --par in CSS (offset_x = -camera_x * parallax).
export const camX=x=>Math.max(-CAM_MAX,Math.min(CAM_MAX,x*CAM_MAX));
function startMotion(){const r=root();if(!r||motes.run)return;const cv=r.querySelector('.cs-motes'),stage=()=>root()?.querySelector('.cs-stage');
 const parOn=()=>settings.charselParallax!==false&&!reduce(),fxOn=settings.envFx!=='off'&&!reduce();
 const dpr=Math.min(2,devicePixelRatio||1),c=cv.getContext('2d');let w=0,h=0;const size=()=>{w=cv.clientWidth;h=cv.clientHeight;cv.width=w*dpr;cv.height=h*dpr;c.setTransform(dpr,0,0,dpr,0,0)};size();
 const P=[];const spawn=(p,gold,first)=>{p.gold=gold;if(gold){p.x=(Math.random()<.5?motes.focus+(Math.random()-.5)*.25:Math.random())*w;p.y=first?Math.random()*h:h*(.75+Math.random()*.25);p.vx=(Math.random()-.5)*6;p.vy=-(6+Math.random()*12);p.r=.6+Math.random()*1.4;p.life=0;p.max=4+Math.random()*5}
  else{p.x=Math.random()*w*1.2;p.y=first?Math.random()*h:-10;p.vx=-40-Math.random()*30;p.vy=160+Math.random()*90;p.r=.5;p.len=6+Math.random()*8}return p};
 for(let i=0;i<48;i++)P.push(spawn({},i<20,true));
 let parRan=false,last=performance.now(),acc=0,n=0,dropped=!fxOn,settled=false;
 // The low-fx frame-time window starts once the stage art has decoded, so first-load image decode doesn't count as a slow device.
 Promise.all([...r.querySelectorAll('.cs-stage img')].map(i=>i.decode().catch(()=>{}))).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{settled=true})));if(dropped)cv.style.display='none';motes.run=true;
 const tick=now=>{if(!cv.isConnected){motes.run=false;motes.size=null;SND.stopBed();return}const dt=Math.min(.05,(now-last)/1000);if(!document.hidden){
  if(settled&&n<240){acc+=now-last;n++;if(n===240&&acc/240>17.5&&!dropped){dropped=true;cv.style.display='none';root()?.classList.add('lowfx')}}
  if(parOn()){PAR.x+=(PAR.tx-PAR.x)*.06;PAR.y+=(PAR.ty-PAR.y)*.06;parRan=true;stage()?.style.setProperty('--cam',camX(PAR.x).toFixed(1))}
  else if(parRan){parRan=false;PAR.x=PAR.y=0;stage()?.style.setProperty('--cam','0')}
  if(!dropped){c.clearRect(0,0,w,h);for(const p of P){p.x+=p.vx*dt;p.y+=p.vy*dt;
   if(p.gold){p.life+=dt;const f=Math.sin(Math.PI*Math.min(1,p.life/p.max));c.globalAlpha=.75*f;c.fillStyle='#ffcf7a';c.beginPath();c.arc(p.x+Math.sin(p.life*1.3+p.r)*4,p.y,p.r,0,6.283);c.fill();if(p.life>p.max)spawn(p,true)}
   else{c.globalAlpha=.10;c.strokeStyle='#bcd2ea';c.lineWidth=.6;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.03,p.y-p.len);c.stroke();if(p.y>h+10)spawn(p,false)}}c.globalAlpha=1}}
  last=now;requestAnimationFrame(tick)};requestAnimationFrame(tick);motes.size=size;SND.startBed()}
addEventListener('resize',()=>{if(root()&&motes.run)motes.size?.()},{passive:true}); // once, module-level: startMotion re-runs per visit and must not stack listeners
// Called after every render (render() is synchronous; a microtask lands after the DOM swap).
const mo=new MutationObserver(()=>{const r=root();if(!r)return;for(const b of r.querySelectorAll('.cs-hero.on.locked'))b.classList.remove('on');halos(r);if(!motes.run)startMotion();const l=r.querySelector('.cs-lore:not(.out)');if(l&&!l.style.left)placeLore(l);if(r.dataset.focus)motes.focus=STAGE[r.dataset.focus]?.x??.5});
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>mo.observe(document.body,{childList:true,subtree:true}),{once:true});
if(document.readyState!=='loading')mo.observe(document.body,{childList:true,subtree:true});
// Idea 11 "freshly unlocked" beat (off until unlocks ship): the lock falls and the hero lights once on its own with the bell.
export function charselUnlockBeat(k){const b=document.querySelector(`.cs-hero[data-cls="${k}"]`);if(!b)return;b.classList.add('unchaining');setTimeout(()=>{b.classList.remove('locked','unchaining');b.querySelector('.cs-lockimg')?.remove();const n=document.querySelector(`.cs-name[data-cls="${k}"]`);if(n){n.classList.remove('locked');n.querySelector('i').textContent=HEROES[k].epithet}light(k)},U(900))}
