// ui/place.js: the one placement system for battle popups (Task 19).
// Rules: modal choices are centred over the empty middle of the battlefield (css .ov.battle); tooltips and detail
// panels pick the candidate spot beside their anchor that covers the fewest combatants / HP + status plates / intents /
// resting hand / End Turn / class display. Nothing is ever placed over those if any free spot exists.
const OBST='.combat .fig>.slot>img.spr,.combat .fig>.sprph,.combat .plate,.combat .intentw,.combat .hand .card:not(.sel),.combat .ctl button,.combat .ctl .pile,.combat .topbar,.combat .dais';
const inter=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
export function obstacles(skip){if(!document.querySelector('.combat'))return [];
 return [...document.querySelectorAll(OBST)].filter(e=>!(skip&&(e===skip||(e.classList.contains('dais')&&e.contains(skip))))).map(e=>e.getBoundingClientRect()).filter(r=>r.width>2&&r.height>2)}
// Returns {x,y} (viewport px, top-left) for a popup of size w*h next to `anchor` (a DOMRect or null for a free popup).
export function pickSpot(w,h,anchor,anchorEl,scan){const W=innerWidth,H=innerHeight,m=6,obs=obstacles(anchorEl);
 const clampX=x=>Math.max(m,Math.min(W-w-m,x)),clampY=y=>Math.max(m,Math.min(H-h-m,y));const c=[];
 if(anchor){const cx=anchor.left+anchor.width/2-w/2,cy=anchor.top+anchor.height/2-h/2;
  const dz=anchorEl&&anchorEl.closest&&anchorEl.closest('.dais');
  if(dz){const d=dz.getBoundingClientRect();c.push([d.left,anchor.bottom+8],[d.left,anchor.top-h-8])}
  c.push([anchor.right+8,cy],[anchor.left-w-8,cy],[cx,anchor.top-h-8],[cx,anchor.bottom+8])}
 // free spots in the empty middle of the battlefield (between hero and enemies), then the top-centre
 c.push([W*.5-w/2,H*.2],[W*.5-w/2,H*.42],[W*.36,H*.12],[W*.5-w/2,H*.55]);
 // scan: also try a grid of spots; least overlap wins, then the one nearest the anchor (status tooltips: never cover the described figure or the hand)
 if(scan&&anchor){const ax=anchor.left+anchor.width/2,ay=anchor.top+anchor.height/2;let g=null;
  for(let y=m;y<=H-h-m;y+=10)for(let x=m;x<=W-w-m;x+=10){const r={left:x,top:y,right:x+w,bottom:y+h},o=obs.reduce((t,q)=>t+inter(r,q),0),d=Math.hypot(x+w/2-ax,y+h/2-ay);if(!g||o<g.o-1||(Math.abs(o-g.o)<=1&&d<g.d))g={x,y,o,d}}
  if(g)return {x:g.x,y:g.y,s:g.o}}
 let best=null;for(const [x0,y0] of c){const x=clampX(x0),y=clampY(y0),r={left:x,top:y,right:x+w,bottom:y+h};
  const s=obs.reduce((t,o)=>t+inter(r,o),0)+(anchor?0:0);if(!best||s<best.s){best={x,y,s};if(s===0)break}}
 return best}
// Put the in-scene detail panel (selected-card / enemy inspect) in the free middle, clear of every combatant.
export function placeDetail(){const t=document.getElementById('detail');if(!t||!document.querySelector('.combat'))return;
 t.style.left='0px';t.style.top='0px';t.style.right='auto';const r=t.getBoundingClientRect(),sc=t.offsetParent?t.offsetParent.getBoundingClientRect():{left:0,top:0};
 const hero=document.querySelector('.combat .hero .fig'),en=[...document.querySelectorAll('.combat .en .fig')];
 const hr=hero?hero.getBoundingClientRect():null,er=en.map(e=>e.getBoundingClientRect());
 const img=e=>{const i=e.querySelector('img.spr');return (i||e).getBoundingClientRect()};
 const dais=document.querySelector('.combat .dais'),dr=dais?dais.getBoundingClientRect().right+6:0;
 const pl=e=>{const p=e.parentNode.querySelector('.plate');return p?p.getBoundingClientRect():null};
 const gapL=Math.max(dr,hero?Math.max(img(hero).right,(pl(hero)||{right:0}).right)+6:0),gapR=en.length?Math.min(...en.map(e=>Math.min(img(e).left,(pl(e)||{left:1e9}).left)))-6:innerWidth;
 const gw=Math.max(0,gapR-gapL);let x,y=52;
 if(gw>=96){t.style.maxWidth=t.style.width=Math.min(144,gw)+'px';if(gw<150)t.classList.add('narrow');else t.classList.remove('narrow');const r2=t.getBoundingClientRect();x=gapL+(gw-r2.width)/2}
 else{const p=pickSpot(r.width,r.height,null);x=p.x;y=p.y}
 x=Math.max(6,Math.min(innerWidth-r.width-6,x));
 // never cover the lifted hand card: slide up to the top bar and, if still needed, scroll inside the panel
 const sel=document.querySelector('.combat .hand .card.sel');t.style.maxHeight='';
 if(sel){const c=sel.getBoundingClientRect(),h=t.getBoundingClientRect().height;if(x<c.right&&x+r.width>c.left&&y+h>c.top-4){y=52;if(y+h>c.top-4)t.style.maxHeight=Math.max(70,c.top-4-y)+'px';t.style.overflow='auto'}}
 t.style.left=Math.round(x-sc.left)+'px';t.style.top=Math.round(y-sc.top)+'px'}
