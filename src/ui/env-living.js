// ui/env-living.js — painted living layers for "still" backgrounds (Wrack Terraces v-new2g, Spencer 2026-10-14).
// Solids (sky, far stacks, cliffs, stair, ground, rocks) never move: no parallax, drift or camera sway on a still env.
// Only painted plates animate, each as a composited transform/opacity loop on a painted image (no code-drawn effects):
//  clouds (sky), sea swell (far, water-masked), fog bands + wind veils, lantern flame frames (mid), pool sway (ground).
// Data: ENV.envs[id].living (design/environments.json), coords in the env's space (2340x1080 screen px).
const P=(v,t)=>(v/t*100).toFixed(4)+'%';
let styled=false;
function css(){if(styled)return;styled=true;const s=document.createElement('style');s.id='envlv-css';
 const seq=[0,3,1,4,2,5,1,3,0,4,5,2];
 s.textContent=`@keyframes envlv-scroll{from{transform:translate3d(0,0,0)}to{transform:translate3d(var(--dx),0,0)}}
@keyframes envlv-bob{from{translate:0 calc(var(--bob) * -1)}to{translate:0 var(--bob)}}
@keyframes envlv-swell{from{transform:translate3d(calc(var(--sx) * -1),calc(var(--sy) * -1),0)}to{transform:translate3d(var(--sx),var(--sy),0)}}
@keyframes envlv-flame{${seq.map((f,i)=>`${(i/seq.length*100).toFixed(3)}%{background-position:${f%3*50}% ${Math.floor(f/3)*100}%}`).join('')}}
@keyframes envlv-flicker{0%{opacity:.62}18%{opacity:.95}33%{opacity:.7}52%{opacity:1}71%{opacity:.66}86%{opacity:.9}100%{opacity:.62}}`;
 document.head.appendChild(s)}
const crops={};
// a sub-rect of an atlas as its own image URL (so a fog row can repeat-x); done once per row, off the frame loop
function crop(src,r){const key=src+'|'+r.join(',');if(crops[key])return crops[key];
 return crops[key]=new Promise(ok=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=r[2];c.height=r[3];
  c.getContext('2d').drawImage(im,r[0],r[1],r[2],r[3],0,0,r[2],r[3]);c.toBlob(b=>ok(b?URL.createObjectURL(b):''),'image/webp',.92)};im.onerror=()=>ok('');im.src=src})}
// swell plate x water mask, baked once into one alpha plate (luminance -> alpha): the plate then needs no live CSS mask (a mask forces a full-screen offscreen surface per group
// every frame). The mask edge now rides with the plate (+-2 css px, inside the mask's own feather). Rows are processed in slices so no frame is blocked; null -> keep hidden.
const baked={};
function bakeSwell(s,sp){const key=s.f+'|'+s.mask+'|'+s.r.join(',');if(baked[key])return baked[key];const load=u=>new Promise(ok=>{const im=new Image();im.decoding='async';im.onload=()=>ok(im);im.onerror=()=>ok(null);im.src=u});
 return baked[key]=Promise.all([load(s.f),load(s.mask)]).then(async([pl,mk])=>{if(!pl||!mk)return '';const [x,y,w,h]=s.r,[SW,SH]=sp;
  const m=document.createElement('canvas');m.width=w;m.height=h;const mc=m.getContext('2d',{willReadFrequently:true});mc.imageSmoothingQuality='high';mc.drawImage(mk,x/SW*mk.naturalWidth,y/SH*mk.naturalHeight,w/SW*mk.naturalWidth,h/SH*mk.naturalHeight,0,0,w,h);
  const c=document.createElement('canvas');c.width=w;c.height=h;const cc=c.getContext('2d',{willReadFrequently:true});cc.drawImage(pl,0,0,w,h);
  for(let y0=0;y0<h;y0+=128){const n=Math.min(128,h-y0),md=mc.getImageData(0,y0,w,n),pd=cc.getImageData(0,y0,w,n),a=pd.data,b=md.data;
   for(let i=0;i<a.length;i+=4)a[i+3]=a[i+3]*(b[i]*.2126+b[i+1]*.7152+b[i+2]*.0722)/255;
   cc.putImageData(pd,0,y0);await new Promise(r=>setTimeout(r,0))}
  return new Promise(ok=>c.toBlob(b=>ok(b?URL.createObjectURL(b):''),'image/webp',.92))})}
function rng(seed){let s=seed*2654435761>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function el(tag,cls,st){const e=document.createElement(tag);if(cls)e.className=cls;if(st)e.style.cssText=st;return e}
function scrollBand(box,W,H,{src,y,h,tw,v,op,filter}){ // a repeat-x painted band drifting right->left on a seamless track
 const w=W+tw,e=el('i','envlv-a envlv-band',`left:0;top:${P(y,H)};height:${P(h,H)};width:${P(w,W)};opacity:${op};background:url("${src}") 0 0/${P(tw,w)} 100% repeat-x;--dx:${P(-tw,w)};animation:envlv-scroll ${(tw/Math.abs(v)).toFixed(2)}s linear infinite${filter?';filter:'+filter:''}`);
 box.appendChild(e);return e}
function build(layer,L,sp,still){const [W,H]=sp;const box=el('div','envlv','position:absolute;inset:0;z-index:1;pointer-events:none');css();
 for(const c of L.clouds||[]){const tw=c.tile[0]*c.h/c.tile[1];scrollBand(box,W,H,{src:c.f,y:c.y,h:c.h,tw,v:c.v,op:c.op,filter:[c.con?`contrast(${c.con})`:'',c.dark?`brightness(${c.dark})`:''].join(' ').trim()})}
 for(const s of L.swell||[]){const r=s.r,e=el('i','envlv-a envlv-swell',`left:${P(r[0],W)};top:${P(r[1],H)};width:${P(r[2],W)};height:${P(r[3],H)};background:0 0/100% 100% no-repeat;--sx:${P(s.amp[0],r[2])};--sy:${P(s.amp[1],r[3])};animation:envlv-swell ${s.period/2}s ease-in-out infinite alternate;visibility:hidden`);
  bakeSwell(s,sp).then(u=>{if(u){e.style.backgroundImage=`url("${u}")`;e.style.visibility=''}});box.appendChild(e)}
 for(const f of L.fog||[]){const tw=f.tw,b=scrollBand(box,W,H,{src:'',y:f.y,h:f.h,tw,v:f.v,op:f.op});crop(f.atlas,f.crop).then(u=>{if(u)b.style.backgroundImage=`url("${u}")`})}
 for(const lan of L.lantern||[]){const r=lan.r,w=el('i','envlv-a envlv-lantern',`left:${P(r[0],W)};top:${P(r[1],H)};width:${P(r[2],W)};height:${P(r[3],H)};mix-blend-mode:${lan.blend||'screen'};opacity:${lan.op};animation:envlv-flicker 2.3s linear infinite`);
  w.appendChild(el('i','',`position:absolute;inset:0;background:url("${lan.f}") 0 0/300% 200% no-repeat;animation:envlv-flame ${(12/lan.fps).toFixed(2)}s step-end infinite`));box.appendChild(w)}
 for(const pd of L.particles||[]){const R=rng(pd.seed),[aw,ah]=pd.atlas,items=[];let maxw=0,y0=1e9,y1=-1e9;
  for(let k=0;k<pd.n;k++){const r=pd.rects[Math.floor(R()*pd.rects.length)],w=pd.w[0]+R()*(pd.w[1]-pd.w[0]),h=r[3]*w/r[2],y=pd.y[0]+R()*(pd.y[1]-pd.y[0]);items.push({r,w,h,y,x:R()});maxw=Math.max(maxw,w);y0=Math.min(y0,y);y1=Math.max(y1,y+h)}
  // gfxmem: one composited layer per particle SET (was 3 elements per particle): the veils of a set ride one wide track that scrolls at the set's speed (transform) and bobs (translate).
  // Each veil sits at its own random x on the track (period = the viewport width), repeated one period later so the loop is seamless.
  const P0=W,CW=W+P0,CH=y1-y0,dur=P0/(pd.v*.65),c=el('i','envlv-a envlv-part',`left:0;top:${P(y0,H)};width:${P(CW,W)};height:${P(CH,H)};opacity:${pd.op};--dx:${P(-P0,CW)};--bob:${P(7,CH)};animation:envlv-scroll ${dur.toFixed(2)}s linear infinite,envlv-bob 1.55s ease-in-out ${(-R()*3).toFixed(2)}s infinite alternate`);
  for(const it of items){const {r,w,h}=it,bx=aw>r[2]?r[0]/(aw-r[2])*100:0,by=ah>r[3]?r[1]/(ah-r[3])*100:0,x0=it.x*(P0-w);
   for(const x of [x0,x0+P0])c.appendChild(el('i','',`left:${P(x,CW)};top:${P(it.y-y0,CH)};width:${P(w,CW)};height:${P(h,CH)};background:url("${pd.f}") ${bx.toFixed(3)}% ${by.toFixed(3)}%/${(aw/r[2]*100).toFixed(3)}% ${(ah/r[3]*100).toFixed(3)}% no-repeat`))}
  box.appendChild(c)}
 for(const s of L.statics||[]){const r=s.r;box.appendChild(el('i','envlv-static'+(s.combatOnly?' envlv-combat':''),`left:${P(r[0],W)};top:${P(r[1],H)};width:${P(r[2],W)};height:${P(r[3],H)};background:url("${s.f}") 0 0/100% 100%`))}
 return box}
// Called by syncEnv on every backdrop change: one .envlv per layer, rebuilt only when the env changes.
export function syncLiving(id,e){document.querySelectorAll('#env .envL').forEach(l=>{const layer=l.firstElementChild;if(!layer)return;const old=layer.querySelector(':scope>.envlv');const L=e&&e.living&&e.living[l.dataset.l];
 if(old&&old.dataset.env===id&&L)return;if(old)old.remove();if(!L)return;const b=build(layer,L,e.space||[3600,1440]);b.dataset.env=id;layer.appendChild(b)})}
// Idle-time prebuild (called from env.js prewarmEnv while the map is up (not title)): bake every swell plate and fog crop now, so entering the fight only builds DOM.
export function prewarmLiving(e){const sp=(e&&e.space)||[3600,1440];return Promise.all(Object.values((e&&e.living)||{}).flatMap(L=>[...(L.swell||[]).map(s=>bakeSwell(s,sp)),...(L.fog||[]).map(f=>crop(f.atlas,f.crop))]))}
export function livingCount(){return document.querySelectorAll('#env .envlv .envlv-a').length}
