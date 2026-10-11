// ui/dip.js: quick dip-to-black between title-flow screens (out ~140ms, swap, in ~180ms). Audio untouched, so menu music runs straight through.
let busy=0;
export function dip(fn){if(window.FAST||busy||typeof document==='undefined'){fn();return}
 const rm=document.body.classList.contains('reduce-motion'),tOut=rm?40:140,tIn=rm?60:180;
 let o=document.getElementById('tbdip');if(!o){o=document.createElement('div');o.id='tbdip';document.body.appendChild(o)}
 busy=1;o.style.transition=`opacity ${tOut}ms ease-in`;o.getBoundingClientRect();o.style.opacity='1';
 setTimeout(()=>{try{fn()}finally{requestAnimationFrame(()=>{o.style.transition=`opacity ${tIn}ms ease-out`;o.style.opacity='0';setTimeout(()=>{busy=0},tIn)})}},tOut)}
