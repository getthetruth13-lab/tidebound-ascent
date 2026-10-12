// ui/dip.js: quick dip-to-black between title-flow screens (out ~140ms, swap, in ~180ms). Audio untouched, so menu music runs straight through.
import {U} from '../core/timing.js';
let busy=0,t0=0,inside=0;
export function dip(fn){if(window.FAST||typeof document==='undefined'||inside){fn();return} // nested dip (menuPress -> titleGo) runs inside the current dark frame instead of being dropped
 const now=performance.now();if(busy&&now-t0<1500)return; // a fast double tap swaps once (the 1.5 s cap frees a stuck flag)
 const rm=document.body.classList.contains('reduce-motion'),tOut=rm?40:U(140),tIn=rm?60:U(180);
 let o=document.getElementById('tbdip');if(!o){o=document.createElement('div');o.id='tbdip';document.body.appendChild(o)}
 busy=1;t0=now;o.style.transition=`opacity ${tOut}ms ease-in`;o.getBoundingClientRect();o.style.opacity='1';
 setTimeout(()=>{inside=1;try{fn()}finally{inside=0;requestAnimationFrame(()=>{o.style.transition=`opacity ${tIn}ms ease-out`;o.style.opacity='0';setTimeout(()=>{busy=0},tIn)})}},tOut)}
