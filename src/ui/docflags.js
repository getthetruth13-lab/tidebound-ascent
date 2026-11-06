// ui/docflags.js (v0.6.89): page-state flags on <html> / <body>, kept in step with the DOM by one batched MutationObserver.
// They replace document-level :has() rules (html:has(.page.mappage), body:has(.tb-scr), body:has(#inspect:not(.held-hand))). While any rule
// whose subject is <html> or <body> uses :has(), Chrome re-checks it on every DOM insert anywhere and restyles the page: the Ledger's idle fills
// (6 tiles each) cost 20-45 ms of style recalc at 4x CPU, growing with the grid. With classes, an insert costs only the inserted nodes.
// The flag is set in the same microtask checkpoint as the change, so it is in place before the next style / paint.
const FLAGS=[[()=>document.documentElement,'has-mappage','.page.mappage'],[()=>document.body,'has-tbscr','.tb-scr'],[()=>document.body,'has-inspect','#inspect:not(.held-hand)']];
let queued=false;
export function syncDocFlags(){queued=false;for(const [el,cls,sel] of FLAGS){const e=el();if(e)e.classList.toggle(cls,!!document.querySelector(sel))}}
if(typeof document!=='undefined'&&typeof MutationObserver!=='undefined'){
 syncDocFlags();
 new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(syncDocFlags)}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','id']});
}
