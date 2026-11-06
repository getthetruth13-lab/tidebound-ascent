// ui/map-a2.js — the painted Act 2 map (map_a2 v4, 9.0 review): riveted iron plate, chalk route, portcullis gate seals, ward banners, pole lamp.
// Art lives in art/v2/map/map-a2-*.webp (a2 token = later-act pack, not part of the Act 1 install precache). Geometry from
// studio/art/act2/map/map_a2-v4/slots.json: wrapper 760 css wide, N=16 rows, H=74, TOP=84; the plate box is -4.348% / 108.696% wide, top -50 css, 1468.6 css tall.
// Cosmetic only: no gameplay or map-generation change. Act 1 and Act 3 maps never come here.
export const A2_DIR='art/v2/map/map-a2-';
export const A2_W=760,A2_R=22,A2_RB=40,A2_RG=36,BANNER_ROWS=[2,7,12],GATE_ROWS=[4,9];
const LAIR={colossus:'sluice',wreckqueen:'basin',battery:'turntable'};
// Literal list so tools/gen-precache.cjs finds every file (they land in the Act 2 art pack, tests/precache-coverage.cjs checks them).
export const A2_FILES=[
 'art/v2/map/map-a2-banner-galleries.webp',
 'art/v2/map/map-a2-banner-quay.webp',
 'art/v2/map/map-a2-banner-ramparts.webp',
 'art/v2/map/map-a2-chalk.webp',
 'art/v2/map/map-a2-cutaway.webp',
 'art/v2/map/map-a2-lair-basin.webp',
 'art/v2/map/map-a2-lair-sluice.webp',
 'art/v2/map/map-a2-lair-turntable.webp',
 'art/v2/map/map-a2-lamp-pole-glow.webp',
 'art/v2/map/map-a2-lamp-pole.webp',
 'art/v2/map/map-a2-lamp-top.webp',
 'art/v2/map/map-a2-node-boss-ghost.webp',
 'art/v2/map/map-a2-node-boss-vis.webp',
 'art/v2/map/map-a2-node-boss.webp',
 'art/v2/map/map-a2-node-elite-ghost.webp',
 'art/v2/map/map-a2-node-elite-vis.webp',
 'art/v2/map/map-a2-node-elite.webp',
 'art/v2/map/map-a2-node-event-ghost.webp',
 'art/v2/map/map-a2-node-event-vis.webp',
 'art/v2/map/map-a2-node-event.webp',
 'art/v2/map/map-a2-node-fight-ghost.webp',
 'art/v2/map/map-a2-node-fight-vis.webp',
 'art/v2/map/map-a2-node-fight.webp',
 'art/v2/map/map-a2-node-gate-ghost.webp',
 'art/v2/map/map-a2-node-gate-vis.webp',
 'art/v2/map/map-a2-node-gate.webp',
 'art/v2/map/map-a2-node-rest-ghost.webp',
 'art/v2/map/map-a2-node-rest-vis.webp',
 'art/v2/map/map-a2-node-rest.webp',
 'art/v2/map/map-a2-node-shop-ghost.webp',
 'art/v2/map/map-a2-node-shop-vis.webp',
 'art/v2/map/map-a2-node-shop.webp',
 'art/v2/map/map-a2-node-treasure-ghost.webp',
 'art/v2/map/map-a2-node-treasure-vis.webp',
 'art/v2/map/map-a2-node-treasure.webp',
 'art/v2/map/map-a2-plate.webp',
 'art/v2/map/map-a2-toplamp-glow.webp'];
export const a2Src=n=>A2_DIR+n+'.webp';
const KEY={unknown:'event',fight:'fight',elite:'elite',rest:'rest',shop:'shop',treasure:'treasure',boss:'boss'};
export const isGateNode=(n,r)=>GATE_ROWS.includes(r)&&n.c===1.5&&n.t!=='boss';
export const a2X=(n,r,x)=>{if(isGateNode(n,r))return 50;if(n.c===0&&BANNER_ROWS.some(b=>Math.abs(b-r)<=1))return Math.max(x,18.2);return x}; // gate seal on the chalk line's centre; column 0 on banner rows (and the rows next to them) keeps clear of the banner
// Edge polyline (css, wrapper space) trimmed to end on the node rims (same curve the game and the lantern glide use).
export function a2Edge(A,B,ra,rb,mxPct,steps=28){
 const M=[mxPct*A2_W/100,(A[1]+B[1])/2],bez=t=>[(1-t)**2*A[0]+2*(1-t)*t*M[0]+t*t*B[0],(1-t)**2*A[1]+2*(1-t)*t*M[1]+t*t*B[1]],d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
 let lo=0,hi=.5;for(let k=0;k<30;k++){const m=(lo+hi)/2;if(d(bez(m),A)<ra)lo=m;else hi=m}const t0=hi;
 lo=.5;hi=1;for(let k=0;k<30;k++){const m=(lo+hi)/2;if(d(bez(m),B)<rb)hi=m;else lo=m}const t1=lo;
 const P=[];for(let s=0;s<=steps;s++){const p=bez(t0+(t1-t0)*s/steps);P.push(p[0].toFixed(1)+' '+p[1].toFixed(1))}
 return 'M'+P.join(' L')}
export const a2Rim=(n,r)=>n.t==='boss'?A2_RB:isGateNode(n,r)?A2_RG:A2_R;
export function a2Path(d,lit,live){ // chalk dashes #cfc7b0 over a dark under-stroke; lit route = muted amber; no glow
 const base=`<path d="${d}" fill="none" stroke="#0c0f11" stroke-width="5" stroke-linecap="round" opacity=".38" vector-effect="non-scaling-stroke"/>`;
 return base+(lit?`<path d="${d}" fill="none" stroke="#cdb88a" stroke-width="3.2" stroke-dasharray="7 5" stroke-linecap="round" opacity=".95" vector-effect="non-scaling-stroke"/>`
  :`<path d="${d}" fill="none" stroke="#cfc7b0" stroke-width="2.6" stroke-dasharray="7 5" stroke-linecap="round" opacity="${live?.9:.6}" vector-effect="non-scaling-stroke"/>`)}
// plate layers + fixed decor (banners, top lamp, this run's lair). Placed before the route SVG and the nodes.
export function a2Layers(Y,N,boss){
 const img=(c,n,st)=>`<img class="${c}" src="${a2Src(n)}" alt="" draggable="false" decoding="async"${st?` style="${st}"`:''}>`;
 const box=`<div class="a2box" aria-hidden="true">${img('a2plate','plate')}${img('a2cut','cutaway')}${img('a2chalk','chalk')}${img('a2tg','toplamp-glow')}</div>`;
 const at=(c,n,x,y)=>`<i class="a2d ${c}" aria-hidden="true" style="left:${x}%;top:${y}px">${img('',n)}</i>`;
 const ban=[['quay',2],['galleries',7],['ramparts',12]].map(([k,r])=>at('a2ban','banner-'+k,5.66,Y(r))).join('');
 const lair=LAIR[boss]?at('a2lair','lair-'+LAIR[boss],80,128):'';
 return box+ban+at('a2lamp','lamp-top',19,44)+lair}
// v0.6.56: Act 2 nodes now draw the shared Act 1 icons (map.js); only the gate seal ring is still Act 2 art. a2NodeInner is kept but unused,
// and the painted Act 2 node icons stay on disk and in A2_FILES (never remove later-act art).
export const a2GateRing=state=>`<img class="a2seal" src="${a2Src('node-gate'+(state?'-'+state:''))}" alt="" draggable="false">`;
// node face: painted icon per state (normal / vis = visited / ghost = passed over); gate seal nodes carry their room icon on the portcullis
export function a2NodeInner(n,r,state,uiFallback){
 const k=KEY[n.t]||'fight',sfx=state?'-'+state:'';
 if(isGateNode(n,r))return `<img class="nodeic a2seal" src="${a2Src('node-gate'+sfx)}" alt="" draggable="false"><img class="nodeic a2sealic" src="${a2Src('node-'+k+sfx)}" alt="" draggable="false">`;
 return `<img class="nodeic a2ic" src="${a2Src('node-'+k+sfx)}" alt="" draggable="false">`}
