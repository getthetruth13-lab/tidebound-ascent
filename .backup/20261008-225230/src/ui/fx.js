// ui/fx.js
import {W} from '../core/state.js';
import {drag} from './input.js';
// Visual effects helpers. All animations use transform/opacity only.
// Animation that should play ONCE: returns a negative delay so a re-render resumes it instead of replaying it.
export function anim(ts,dur){const age=Date.now()-(ts||0);return age<dur?`animation-delay:-${age}ms`:null}
// card-play animation: a ghost of the card flies to its target (or upward) and fades.
export function flyCard(ci,target){if(window.FAST)return;const el=document.querySelector(`.hand .card[data-uid="${ci.uid}"]`);if(!el||!el.animate)return;
 const r=el.getBoundingClientRect();const g=el.cloneNode(true);g.classList.remove('sel','drag','unp');g.classList.add('flycard');g.removeAttribute('data-i');g.removeAttribute('data-uid');
 Object.assign(g.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',transform:'none',transition:'none'});document.body.appendChild(g);
 let tx=innerWidth/2-r.left-r.width/2,ty=-r.height*.9;const te=target&&document.querySelector(`.en[data-en="${W.cb.ens.indexOf(target)}"]`);
 if(te){const q=te.getBoundingClientRect();tx=q.left+q.width/2-r.left-r.width/2;ty=q.top+q.height/2-r.top-r.height/2}
 g.animate([{transform:'none',opacity:1},{transform:`translate(${tx*.6}px,${ty*.6}px) scale(.8) rotate(${tx>0?8:-8}deg)`,opacity:.9,offset:.6},{transform:`translate(${tx}px,${ty}px) scale(.35)`,opacity:0}],{duration:260,easing:'ease-in'}).onfinish=()=>g.remove()}
