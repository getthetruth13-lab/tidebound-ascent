// ui/painted-fx.js (clovis/painted-fx): painted battle effects (Spencer 2026-10-13, option A for all five).
// Each effect is one or two painted cut-outs (art/v2/fx/*.webp) that the compositor moves, fades and tints with
// element.animate (transform / opacity / filter / clip-path only), so they run at 60 fps on the S24.
// Timing rule (Spencer): big payoffs ~1 s (Crest, Flourish, Echo replay, Advance), small effects 0.3-0.5 s
// (Waypoint placed/triggered, Guard pulse; Guard shatter 0.7 s per Spencer 10-13). Durations use core/timing U() (the player's speed setting only, not BATTLE_SCALE) so they stay on Spencer's timing rule.
import {U} from '../core/timing.js';
import {fxOn,reducedMotion} from './vfx.js';
export const PFX_ART={lensBeam:'art/v2/fx/lenswright-a3-beam.webp',crest:'art/v2/fx/tide-crest.webp',flourish:'art/v2/fx/duel-flourish.webp',echo:'art/v2/fx/echo-bell.webp',
 waypoint:'art/v2/fx/carto-waypoint.webp',shield:'art/v2/fx/guard-shield.webp',shatter:'art/v2/fx/guard-shatter.webp'};
// aspect ratios of the art (w/h), so pieces are sized before the image decodes
const AR={lensBeam:3.2,crest:900/497,flourish:794/645,echo:900/638,waypoint:900/570,shield:808/715,shatter:791/701};
const cache={};
export function preloadPaintedFx(){if(typeof Image==='undefined')return;for(const k in PFX_ART)if(k!=='lensBeam'&&!cache[k]){const i=new Image();i.decoding='async';i.src=PFX_ART[k];cache[k]=i}}
let live=[];
export const paintedLive=()=>live.filter(e=>e.isConnected).map(e=>e.dataset.pfx);
// One painted piece. x,y = centre in viewport px, w = width px. frames use individual transform props.
function piece(kind,{x,y,w,flip=false,z=57,blend=''},frames,ms,{delay=0,easing='ease-out'}={}){
 const el=document.createElement('img');el.src=PFX_ART[kind];el.alt='';el.setAttribute('aria-hidden','true');el.className='pfx pfx-'+kind;el.dataset.pfx=kind;el.draggable=false;
 const h=w/AR[kind];Object.assign(el.style,{left:x-w/2+'px',top:y-h/2+'px',width:w+'px',height:h+'px',zIndex:z});
 if(flip)el.style.transform='scaleX(-1)';if(blend)el.style.mixBlendMode=blend;
 document.body.appendChild(el);live.push(el);
 const done=()=>{el.remove();live=live.filter(e=>e!==el)};
 const dur=U(ms),del=U(delay);
 if(!el.animate){setTimeout(done,dur+del);return el}
 if(reducedMotion())frames=frames.map(f=>({opacity:f.opacity??1,offset:f.offset}));// reduced motion: fade only, no movement
 const a=el.animate(frames,{duration:dur,delay:del,easing,fill:'both'});a.finished.then(done,done);
 // safety net if 'finished' never fires; a paused (frame-stepped) or still-running piece is left alone
 const guard=()=>{if(!el.isConnected)return;if(a.playState==='paused'||a.playState==='running'){setTimeout(guard,400);return}done()};setTimeout(guard,dur+del+400);return el}
const ok=()=>typeof document!=='undefined'&&fxOn();
// 1) Tidecaller Crest (~1 s): the wave rolls in from the hero side, breaks over the enemies, then dissolves into spray.
//    ps = enemy rects {x,y,w,h}. Kept below the enemies' heads so they stay readable.
export function crest(ps){if(!ok()||!ps.length)return;
 const x0=Math.min(...ps.map(p=>p.x-p.w*.5)),x1=Math.max(...ps.map(p=>p.x+p.w*.5)),feet=Math.max(...ps.map(p=>p.y+p.h*.5)),eh=Math.max(...ps.map(p=>p.h));
 const w=Math.max(260,Math.min(x1-x0+eh*.8,innerWidth*.5)),cx=(x0+x1)/2,cy=feet-w/AR.crest*.42,s=w*.55;
 piece('crest',{x:cx,y:cy,w},[
  {translate:`${-s}px 18px`,scale:'.62 .5',opacity:0,filter:'brightness(.8)'},
  {translate:`${-s*.45}px 6px`,scale:'.9 .92',opacity:.95,offset:.25},
  {translate:'0 0',scale:'1 1',opacity:.95,filter:'brightness(1.12)',offset:.55},
  {translate:`${s*.18}px 10px`,scale:'1.06 .9',opacity:.6,filter:'brightness(1.3) blur(1px)',offset:.8},
  {translate:`${s*.3}px 22px`,scale:'1.12 .74',opacity:0,filter:'brightness(1.5) blur(4px)'}],1000,{easing:'cubic-bezier(.3,.1,.3,1)'});
 // moon-teal glow copy on the crest (screen blend) so the break lights the enemies
 piece('crest',{x:cx,y:cy,w,blend:'screen',z:58},[{opacity:0,translate:`${-s*.45}px 6px`,scale:'.9 .92',filter:'blur(6px) brightness(1.4) saturate(1.4)'},{opacity:0,offset:.3},
  {opacity:.45,translate:'0 0',scale:'1 1',offset:.55},{opacity:0,translate:`${s*.2}px 12px`,scale:'1.06 .88',filter:'blur(10px) brightness(1.6) saturate(1.4)'}],1000)}
// 2) Duelist Flourish (~0.9 s): the crescent is cut in along its own diagonal (clip wipe), flares, then bleeds off.
export function flourish(p){if(!ok()||!p)return;const w=Math.max(190,Math.min(p.h*1.9,innerWidth*.32));
 piece('flourish',{x:p.x,y:p.y,w},[
  {clipPath:'inset(0 100% 100% 0)',opacity:1,scale:'.94',filter:'brightness(1.6)'},
  {clipPath:'inset(0 0 0 0)',opacity:1,scale:'1',filter:'brightness(1.25)',offset:.28},
  {clipPath:'inset(0 0 0 0)',opacity:.9,scale:'1.02',filter:'brightness(1)',offset:.6},
  {clipPath:'inset(0 0 0 0)',opacity:0,scale:'1.05',translate:'8px 10px',filter:'brightness(.8) blur(2px)'}],900,{easing:'cubic-bezier(.2,.8,.3,1)'})}
// 3) Echo Mage replay (~0.9 s): the bell and its rune rings swell out of the target, ring once more, and fade.
export function echo(p){if(!ok()||!p)return;const w=Math.max(234,Math.min(p.h*2.08,innerWidth*.39));
 piece('echo',{x:p.x,y:p.y-p.h*.05,w},[{scale:'.4',opacity:0,filter:'brightness(1.6)',easing:'cubic-bezier(.2,.9,.3,1)'},{scale:'1',opacity:1,filter:'brightness(1.1)',offset:.22},
  {scale:'1.03',opacity:1,filter:'brightness(1)',offset:.72},{scale:'1.2',opacity:0,filter:'brightness(1) blur(3px)'}],900,{easing:'linear'});
 piece('echo',{x:p.x,y:p.y-p.h*.05,w,blend:'screen',z:58},[{scale:'.9',opacity:0,filter:'blur(2px) saturate(1.5) brightness(1.4)'},{scale:'1',opacity:0,offset:.3},{scale:'1.15',opacity:.35,offset:.45},
  {scale:'1.7',opacity:0,filter:'blur(8px) saturate(1.5) brightness(1.4)'}],900)}
// 4) Cartographer Waypoint: glyph ring burns onto the ground at the hero's feet and flares.
//    big=true (Advance / Landmark) ~1 s; placed or triggered ~0.45 s.
export function waypoint(p,big=false){if(!ok()||!p)return;const w=Math.max(big?220:180,Math.min(p.w*(big?2.4:2),innerWidth*.32)),y=p.y+p.h*.42;
 const ms=big?1000:450;
 piece('waypoint',{x:p.x,y,w},[{scale:'.55 .4',opacity:0,filter:'brightness(.6)'},{scale:'1 .9',opacity:1,filter:'brightness(1.1)',offset:.35},
  {scale:'1.03 .92',opacity:1,filter:'brightness(1.5)',offset:big?.6:.55},{scale:'1.08 .95',opacity:0,filter:'brightness(.9) blur(2px)'}],ms);
 if(big)piece('waypoint',{x:p.x,y,w,blend:'screen',z:58},[{opacity:0,scale:'1 .9',filter:'blur(6px) brightness(1.6)'},{opacity:0,offset:.45},{opacity:.7,offset:.6},{opacity:0,scale:'1.15 1',filter:'blur(12px) brightness(1.6)'}],ms)}
// 5) Guard: the shield pulses up in front of the fighter (0.4 s); its break shatters it into shards (0.5 s).
//    dir: +1 the fighter faces right (hero), -1 faces left (enemy).
export function guardPulse(p,dir=1){if(!ok()||!p)return;const w=Math.max(110,Math.min(p.h*.85,innerWidth*.18));
 piece('shield',{x:p.x+dir*p.w*.38,y:p.y,w,flip:dir<0},[{scale:'.6',opacity:0,filter:'brightness(1.7)'},{scale:'1.08',opacity:1,filter:'brightness(1.25)',offset:.25,easing:'cubic-bezier(.2,1.3,.4,1)'},
  {scale:'1',opacity:1,filter:'brightness(1)',offset:.75},{scale:'.98',opacity:0,translate:'0 -6px'}],400,{easing:'linear'})}
export function guardShatter(p,dir=1){if(!ok()||!p)return;const w=Math.max(210,Math.min(p.h*1.6,innerWidth*.36)),x=p.x+dir*p.w*.38,y=p.y;
 // flash-in of the whole shattering shield (no blur filter: it showed the piece's box), then 7 wedge shards fly apart, each fading on its own
 piece('shatter',{x,y,w,flip:dir<0},[{scale:'.55',opacity:0,filter:'brightness(2)'},{scale:'.95',opacity:1,filter:'brightness(1.3)',offset:.25},{scale:'1.05',opacity:1,filter:'brightness(1)',offset:.4},{scale:'1.08',opacity:0}],350,{easing:'linear'});
 const N=7;for(let i=0;i<N;i++){const a0=i/N*6.283+.3,a1=(i+1)/N*6.283+.3,am=(a0+a1)/2,P=a=>`${50+80*Math.cos(a)}% ${50+80*Math.sin(a)}%`;
  const el=piece('shatter',{x,y,w,flip:dir<0},[{opacity:0,offset:0},{opacity:0,translate:'0 0',rotate:'0deg',offset:.3},{opacity:1,translate:'0 0',rotate:'0deg',offset:.36,easing:'cubic-bezier(.25,.6,.5,1)'},
   {opacity:0,translate:`${Math.cos(am)*w*.6}px ${Math.sin(am)*w*.45+w*.08}px`,rotate:`${(i%2?1:-1)*(18+i*5)}deg`,scale:'.9'}],700,{easing:'linear'});
  el.classList.add('pfx-shard');el.style.clipPath=`polygon(50% 50%, ${P(a0)}, ${P(am)}, ${P(a1)})`}}
if(typeof document!=='undefined')preloadPaintedFx();

// The reviewed attack beam is a separate plate: idle and fallen art never contain it.
export function lensBeam(from,to){if(!ok()||!from||!to)return;
 const x=from.x-from.w*.38,y=from.y-from.h*.28,dx=x-to.x,dy=y-to.y,w=Math.hypot(dx,dy);
 const e=piece('lensBeam',{x:(x+to.x)/2,y:(y+to.y)/2,w,z:58,blend:'screen'},[{opacity:0,scale:'1 .35'},{opacity:1,scale:'1 1',offset:.18},{opacity:.8,offset:.65},{opacity:0,scale:'1 .5'}],440);
 e.style.rotate=Math.atan2(dy,dx)+'rad';
}
