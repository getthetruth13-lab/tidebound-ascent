// ui/fx.js
import {W} from '../core/state.js';
import {drag} from './input.js';
import {CARDS} from '../core/registry.js';
import {isEx} from '../engine/cards.js';
import {motionOn,emit,ring,rectOf,COL,CLASS_COL} from './vfx.js';
export {syncCombatAnimations} from './anim.js';
// Visual effects helpers. All animations use transform/opacity only.
// Animation that should play ONCE: returns a negative delay so a re-render resumes it instead of replaying it.
export function anim(ts,dur){const age=Date.now()-(ts||0);return age<dur?`animation-delay:-${age}ms`:null}
// A positioned, inert copy of a rendered hand card (body-level, so it survives render()).
export function cloneCard(el){const r=el.getBoundingClientRect();const g=el.cloneNode(true);g.classList.remove('sel','drag','unp');g.classList.add('flycard');
 for(const a of ['data-i','data-uid','id'])g.removeAttribute(a);g.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));g.querySelectorAll('[onclick]').forEach(n=>n.removeAttribute('onclick'));g.removeAttribute('onclick');g.setAttribute('aria-hidden','true');
 Object.assign(g.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',transform:'none',transition:'none'});document.body.appendChild(g);return {g,r}}
// Card play (R7): 60 ms anticipation (lift 8 px, scale 1.1), then a type-specific flight with a class-coloured trail and a landing flash.
//   Attack: fast and straight, lands at IMPACT_MS (the swing connects then).  Skill: floats to the hero and shimmers.  Power: slow glowing ascent.
export const IMPACT_MS=160;
export function flyCard(ci,target){if(!motionOn())return;const el=document.querySelector(`.hand .card[data-uid="${ci.uid}"]`);if(!el||!el.animate)return;
 const d=CARDS[ci.id],type=d.t==='A'?'A':d.t==='P'?'P':'S',col=CLASS_COL[W.run.cls]||COL.teal;
 const {g,r}=cloneCard(el);const cx=r.left+r.width/2,cy=r.top+r.height/2;let dest=null;
 const te=target&&document.querySelector(`.en[data-en="${W.cb.ens.indexOf(target)}"] .fig`);
 if(type==='A'){if(te)dest=rectOf(te);else{const fs=[...document.querySelectorAll('.en .fig')].map(rectOf);if(fs.length)dest={x:fs.reduce((a,b)=>a+b.x,0)/fs.length,y:fs[0].y}}}
 else{const h=document.querySelector('#hero .fig');if(h)dest=rectOf(h)}
 if(!dest)dest={x:innerWidth/2,y:innerHeight*.3};
 const tx=dest.x-cx,ty=dest.y-cy,rot=tx>0?8:-8;
 const fly=type==='A'?100:type==='S'?260:520,total=60+fly,k=60/total;
 const frames=type==='A'
  ?[{transform:'none',opacity:1},{transform:'translateY(-8px) scale(1.1)',opacity:1,offset:k,easing:'cubic-bezier(.5,0,.9,.6)'},{transform:`translate(${tx}px,${ty}px) scale(.5) rotate(${rot}deg)`,opacity:.9}]
  :type==='S'
  ?[{transform:'none',opacity:1},{transform:'translateY(-8px) scale(1.1)',opacity:1,offset:k,easing:'ease-in-out'},{transform:`translate(${tx*.55}px,${ty*.55-26}px) scale(.8) rotate(${rot/2}deg)`,opacity:.95,offset:.7},{transform:`translate(${tx}px,${ty-6}px) scale(.4)`,opacity:0}]
  :[{transform:'none',opacity:1,filter:'none'},{transform:'translateY(-10px) scale(1.12)',opacity:1,filter:'brightness(1.3)',offset:k,easing:'ease-in-out'},{transform:`translate(${tx*.6}px,${ty*.6-40}px) scale(.95)`,opacity:1,filter:'brightness(1.5)',offset:.6},{transform:`translate(${tx}px,${ty-10}px) scale(.45)`,opacity:0,filter:'brightness(1.8)'}];
 const exhaust=isEx(ci);let raf=0;
 const trail=()=>{if(!g.isConnected)return;const q=g.getBoundingClientRect();emit('trail',q.left+q.width/2,q.top+q.height/2,col);raf=requestAnimationFrame(trail)};raf=requestAnimationFrame(trail);
 const end=()=>{cancelAnimationFrame(raf);g.remove();
  if(type==='A'){ring(dest.x,dest.y,col,64,300)}else if(type==='S'){ring(dest.x,dest.y,COL.pale,80,380);emit('guard',dest.x,dest.y)}else{ring(dest.x,dest.y,COL.gold,110,520);emit('burst',dest.x,dest.y,COL.gold,16)}
  if(exhaust)emit('death',dest.x,dest.y,r.width*.6,r.height*.6,10)};
 g.animate(frames,{duration:total,easing:'ease-in'}).finished.then(end,end)}
