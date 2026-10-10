// Foil / holo sheen on rare and uncommon cards: the highlight follows the finger / mouse / drag, or the phone's tilt.
// Only writes two CSS vars on the one card under the pointer (no per-card work, no filters).
let last=null;
function aim(el,cx,cy){const r=el.getBoundingClientRect();if(!r.width)return;const x=Math.max(0,Math.min(1,(cx-r.left)/r.width)),y=Math.max(0,Math.min(1,(cy-r.top)/r.height));
 el.style.setProperty('--mx',(x*100).toFixed(0)+'%');el.style.setProperty('--my',(y*100).toFixed(0)+'%');el.style.setProperty('--fx',(x*100).toFixed(0)+'%')}
if(typeof document!=='undefined'){
 document.addEventListener('pointermove',ev=>{const el=ev.target.closest&&ev.target.closest('.card.r-r,.card.r-u');if(!el)return;last=el;aim(el,ev.clientX,ev.clientY)},{passive:true,capture:true});
 addEventListener('deviceorientation',ev=>{if(ev.gamma==null||!last||!last.isConnected)return;const x=Math.max(0,Math.min(1,.5+ev.gamma/60)),y=Math.max(0,Math.min(1,.5+(ev.beta-45)/60));
  last.style.setProperty('--mx',(x*100).toFixed(0)+'%');last.style.setProperty('--my',(y*100).toFixed(0)+'%');last.style.setProperty('--fx',(x*100).toFixed(0)+'%')},{passive:true});
 // idle foil cards (no pointer yet) get tilt too: pick the first visible rare in a reward / shop / inspect view
 addEventListener('deviceorientation',ev=>{if(last&&last.isConnected)return;last=document.querySelector('.insp .card.r-r,.rewgrid .card.r-r,.shopitem .card.r-r')},{passive:true});
}
