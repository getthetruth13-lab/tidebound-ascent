// ui/screens/frame.js: shared pieces of the title-flow screens (painted backdrop, ornate iron-and-parchment frame).
export const bgHTML=()=>`<div class="tb-bg"><div class="tb-sea"></div><div class="tb-fog f1"></div><div class="tb-fog f2"></div><div class="tb-shim"></div></div><div class="tb-vig"></div>`;
// Corner rivets + inner rule come from CSS (.tb-frame); this wraps the inside of a framed panel.
export const frameOpen=()=>`<i class="tb-orn tl"></i><i class="tb-orn tr"></i><i class="tb-orn bl"></i><i class="tb-orn br"></i><div class="tb-inner">`;
export const frameClose=()=>`</div>`;
// Task 49: auto frame size. Full frame (--s .19) by default, .fr-sm under 420x220 CSS px, .fr-slim under 260x140 (see /workspace/frames/NOTES.md).
// Tips / keyword popups / toasts are always slim (CSS). Measured with the size classes off so the result never flips back and forth.
const FRAMED='.ov .box,.pop,.msgp,.potpop,.relpop,.tb-frame,.tb-hero,.insp .ikw,.panel.win,.win,.panel,.lp-sum,.endr>div:first-child';
export function fitFrame(el){
 const had=el.classList.contains('fr-sm')||el.classList.contains('fr-slim');
 if(had)el.classList.remove('fr-sm','fr-slim');
 const w=el.offsetWidth,h=el.offsetHeight;
 if(had&&!w&&!h){return}
 const slim=w&&h&&(w<260||h<140),sm=!slim&&w&&h&&(w<420||h<220);
 if(slim)el.classList.add('fr-slim');else if(sm)el.classList.add('fr-sm');
}
let queued=false;
export function fitAllFrames(root=document){
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;root.querySelectorAll(FRAMED).forEach(fitFrame)});
}
if(typeof document!=='undefined'&&typeof MutationObserver!=='undefined'){
 const start=()=>{new MutationObserver(()=>fitAllFrames()).observe(document.body,{childList:true,subtree:true});addEventListener('resize',()=>fitAllFrames());fitAllFrames()};
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
}
