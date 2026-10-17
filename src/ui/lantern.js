// ui/lantern.js — the map's "you are here" lantern (v0.6.15, Spencer: "a cool lantern that marks our location and glides smoothly between
// locations so it really feels like you are travelling"). One painted lantern (art/v2/ui/glyphs/lantern.webp) with one painted glow
// (art/v2/ui/map/lantern-glow.webp). It idles with a gentle sway/flicker (CSS, css/map-lantern.css), and glideTo() carries it along the
// connector curve to the chosen node: eased, 0.9-1.4 s by distance, tilted by its own velocity (lag), with a light trail, drifting motes and a
// small settle. The node's room opens only after arrival. Everything is transform/opacity (WAAPI); the map terrain never moves.
// Never traps the player: no motion / reduced motion / Fast animations / no Web Animations -> glideTo() returns false and the plain tap runs.
import {motionOn} from './vfx.js';
import {U} from '../core/timing.js';
export const LANTERN_SRC='art/v2/ui/glyphs/lantern.webp',GLOW_SRC='art/v2/ui/map/lantern-glow.webp';
export const lanternHTML=(x,y,act)=>act===2?`<div class="mlan a2" aria-hidden="true" style="left:${x}%;top:${y}px"><i class="mlan-glow"><img src="art/v2/map/map-a2-lamp-pole-glow.webp" alt="" draggable="false"></i><img class="mlan-img" src="art/v2/map/map-a2-lamp-pole.webp" alt="" draggable="false"></div>`:`<div class="mlan" aria-hidden="true" style="left:${x}%;top:${y}px"><i class="mlan-glow"><img src="${GLOW_SRC}" alt="" draggable="false"></i><img class="mlan-img" src="${LANTERN_SRC}" alt="" draggable="false"></div>`;
let busy=false;
export const lanternBusy=()=>busy;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; // easeInOutCubic
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const glideDurationMs=len=>900+Math.min(1,len/300)*500; // design ms before the animation-speed setting
export function pathPoint(p0,c,p1,t){const u=1-t;return {x:u*u*p0.x+2*u*t*c.x+t*t*p1.x,y:u*u*p0.y+2*u*t*c.y+t*t*p1.y}}
const el=(cls,src,css)=>{const e=document.createElement('i');e.className=cls;e.setAttribute('aria-hidden','true');if(src){const im=new Image();im.src=src;im.alt='';im.draggable=false;e.appendChild(im)}Object.assign(e.style,css);return e};
// Animate the lantern to `node` (a .node.av button), then call go(). Returns false when it cannot animate (caller lets the plain tap through).
export function glideTo(node,go){
 if(busy)return true; // a glide is running: swallow the tap
 const wrap=node&&node.parentElement,lan=wrap&&wrap.querySelector('.mlan');
 if(!lan||!lan.animate||!motionOn())return false;
 const W=wrap.clientWidth;if(!W)return false;
 const cur=wrap.querySelector('.node.cur');
 const p0={x:parseFloat(lan.style.left)/100*W,y:parseFloat(lan.style.top)},p1={x:node.offsetLeft,y:node.offsetTop};
 const bow=cur?((+cur.dataset.r+ +cur.dataset.i)%2?3:-3)*W/100:0; // same bend as the painted connector (map.js)
 const c={x:(p0.x+p1.x)/2+bow,y:(p0.y+p1.y)/2};
 let len=0,prev=p0;for(let k=1;k<=20;k++){const q=pathPoint(p0,c,p1,k/20);len+=Math.hypot(q.x-prev.x,q.y-prev.y);prev=q}
 const glide=U(glideDurationMs(len)),settle=U(190),total=glide+settle,N=44,gf=glide/total;
 busy=true;const wrapParch=wrap.closest('.parch');if(wrapParch)wrapParch.classList.add('gliding');
 // keyframes: eased progress along the curve, tilt from lateral velocity (lagged), tiny float, then a settle with overshoot
 const kf=[];let ang=0;const dt=glide/N/1000;let last=p0;
 for(let k=0;k<=N;k++){const q=pathPoint(p0,c,p1,ease(k/N));const vx=(q.x-last.x)/dt;last=q;if(k===0)continue;
  ang+=(clamp(vx*.014,-15,15)-ang)*.28;
  kf.push({transform:`translate3d(${(q.x-p0.x).toFixed(2)}px,${(q.y-p0.y-3.5*Math.sin(Math.PI*k/N)).toFixed(2)}px,0) rotate(${ang.toFixed(2)}deg)`,offset:+(gf*k/N).toFixed(4)})}
 const dx=p1.x-p0.x,dy=p1.y-p0.y,T=(a,s)=>`translate3d(${dx}px,${dy}px,0) rotate(${a}deg) scale(${s})`;
 kf.unshift({transform:'translate3d(0,0,0) rotate(0deg)',offset:0});
 kf.push({transform:T(-5.5,1.03),offset:+(gf+(1-gf)*.35).toFixed(4)},{transform:T(2.4,.985),offset:+(gf+(1-gf)*.68).toFixed(4)},{transform:T(0,1),offset:1});
 const extras=[],run=(e,frames,o)=>{try{const a=e.animate(frames,o);return a}catch(_){return null}};
 // the glow swells and brightens the path and nodes it passes, then relaxes (transform only; the CSS flicker keeps animating opacity)
 const glow=lan.querySelector('.mlan-glow');
 if(glow)run(glow,[{transform:'scale(1)'},{transform:'scale(1.55)',offset:Math.min(.5,gf*.5)},{transform:'scale(1.35)',offset:gf},{transform:'scale(1)'}],{duration:total,easing:'ease-in-out'});
 // trail puffs + drifting motes, each placed where the lantern passes and fading after it (few, small, removed on arrival)
 const sp=(t,cls,size,life,rise,peak,src)=>{const q=pathPoint(p0,c,p1,ease(t));const e=el(cls,src,{left:q.x+'px',top:q.y+'px',width:size+'px',height:size+'px',opacity:0});wrap.appendChild(e);extras.push(e);
  const jx=(Math.random()-.5)*16;run(e,[{opacity:0,transform:'translate(-50%,-50%) scale(1)'},{opacity:peak,transform:`translate(calc(-50% + ${jx*.4}px),calc(-50% - ${rise*.25}px)) scale(.95)`,offset:.18},{opacity:0,transform:`translate(calc(-50% + ${jx}px),calc(-50% - ${rise}px)) scale(.55)`}],{duration:U(life),delay:glide*t,fill:'both',easing:'ease-out'})};
 [.22,.42,.62,.82].forEach(t=>sp(t,'mlan-puff',46,720,6,.5,GLOW_SRC));
 [.12,.3,.5,.68,.9].forEach((t,k)=>sp(t,'mlan-mote',11,900,20+k*4,.95,GLOW_SRC));
 let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(guard);extras.forEach(e=>e.remove());busy=false;if(wrapParch)wrapParch.classList.remove('gliding');
  if(lan.isConnected){lan.style.left=p1.x/W*100+'%';lan.style.top=p1.y+'px';try{a.cancel()}catch(_){}}
  try{go()}catch(e){console.warn('lantern: go failed',e)}};
 let a;try{a=lan.animate(kf,{duration:total,easing:'linear',fill:'forwards'})}catch(_){busy=false;if(wrapParch)wrapParch.classList.remove('gliding');extras.forEach(e=>e.remove());return false}
 const guard=setTimeout(finish,total+500); // never trapped: even if the animation clock stalls, the room opens
 a.finished.then(finish,finish);
 return true}
