// ui/chartdrag.js: touch + mouse drag-and-drop for the Chart screen. Drag a card left/right to set the draw order
// (leftmost = drawn first); drop it on the Bottom slot to send it under the pile (once per Chart). While a drag is live
// W.chartDrag is set so no background render() rebuilds the cards under the finger.
import {W} from '../core/state.js';
import {modeAct} from '../engine/combat.js';
import {render} from './render.js';
import {cancelLongPress} from './input.js';
import {hideTip} from './kwtip.js';
let d=null;
const slots=()=>[...document.querySelectorAll('#chartcards .cslot')];
const inRect=(r,x,y)=>r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
document.addEventListener('pointerdown',ev=>{const c=ev.target.closest&&ev.target.closest('#chartcards .cslot .card');if(!c||ev.button>0||!W.cb||!W.cb.mode||W.cb.mode.k!=='chart')return;
 const slot=c.closest('.cslot'),all=slots();d={slot,all,i:all.indexOf(slot),to:all.indexOf(slot),id:ev.pointerId,x0:ev.clientX,y0:ev.clientY,rects:all.map(s=>s.getBoundingClientRect()),bottom:document.getElementById('chartbottom')?.getBoundingClientRect(),moved:false,zone:false};
 try{slot.setPointerCapture(ev.pointerId)}catch(_){}});
document.addEventListener('pointermove',ev=>{if(!d||ev.pointerId!==d.id)return;const dx=ev.clientX-d.x0,dy=ev.clientY-d.y0;
 if(!d.moved){if(Math.hypot(dx,dy)<6)return;d.moved=true;W.chartDrag=Date.now();cancelLongPress();hideTip();d.slot.classList.add('lift');document.getElementById('chartbox')&&document.getElementById('chartbox').classList.add('dragging')}
 ev.preventDefault();W.chartDrag=Date.now();d.slot.style.transform=`translate(${dx}px,${dy}px) scale(1.07)`;
 const bz=document.getElementById('chartbottom'),zr=d.bottom;d.zone=!W.cb.mode.moved&&inRect(zr,ev.clientX,ev.clientY);bz&&bz.classList.toggle('hot',d.zone);
 const cx=d.rects[d.i].left+d.rects[d.i].width/2+dx;let to=d.i,best=1e9;d.rects.forEach((r,k)=>{const g=Math.abs(cx-(r.left+r.width/2));if(g<best){best=g;to=k}});if(d.zone)to=d.i;d.to=to;
 d.all.forEach((s,k)=>{if(k===d.i)return;let sh=0;if(d.i<to&&k>d.i&&k<=to)sh=d.rects[k-1].left-d.rects[k].left;else if(d.i>to&&k>=to&&k<d.i)sh=d.rects[k+1].left-d.rects[k].left;s.style.transform=sh?`translateX(${sh}px)`:''});
 d.slot.classList.toggle('over-zone',d.zone)},{passive:false});
function finish(cancel){const x=d;d=null;if(!x||!x.moved)return;W.chartDrag=0;if(!document.body.contains(x.slot))return render();
 if(!cancel&&x.zone)return modeAct('bot',x.i);if(!cancel&&x.to!==x.i)return modeAct('mv',x.i,x.to);render()}
document.addEventListener('pointerup',ev=>{if(d&&ev.pointerId===d.id)finish(false)});
document.addEventListener('pointercancel',ev=>{if(d&&ev.pointerId===d.id)finish(true)});
