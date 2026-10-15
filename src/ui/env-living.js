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
@keyframes envlv-bob{from{transform:translate3d(0,calc(var(--bob) * -1),0)}to{transform:translate3d(0,var(--bob),0)}}
@keyframes envlv-swell{from{transform:translate3d(calc(var(--sx) * -1),calc(var(--sy) * -1),0)}to{transform:translate3d(var(--sx),var(--sy),0)}}
@keyframes envlv-flame{${seq.map((f,i)=>`${(i/seq.length*100).toFixed(3)}%{background-position:${f%3*50}% ${Math.floor(f/3)*100}%}`).join('')}}
@keyframes envlv-flicker{0%{opacity:.62}18%{opacity:.95}33%{opacity:.7}52%{opacity:1}71%{opacity:.66}86%{opacity:.9}100%{opacity:.62}}`;
 document.head.appendChild(s)}
const crops={};
// a sub-rect of an atlas as its own image URL (so a fog row can repeat-x); done once per row, off the frame loop
function crop(src,r){const key=src+'|'+r.join(',');if(crops[key])return crops[key];
 return crops[key]=new Promise(ok=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=r[2];c.height=r[3];
  c.getContext('2d').drawImage(im,r[0],r[1],r[2],r[3],0,0,r[2],r[3]);c.toBlob(b=>ok(b?URL.createObjectURL(b):''),'image/webp',.92)};im.onerror=()=>ok('');im.src=src})}
function rng(seed){let s=seed*2654435761>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
function el(tag,cls,st){const e=document.createElement(tag);if(cls)e.className=cls;if(st)e.style.cssText=st;return e}
function scrollBand(box,W,H,{src,y,h,tw,v,op,filter}){ // a repeat-x painted band drifting right->left on a seamless track
 const w=W+tw,e=el('i','envlv-a envlv-band',`left:0;top:${P(y,H)};height:${P(h,H)};width:${P(w,W)};opacity:${op};background:url("${src}") 0 0/${P(tw,w)} 100% repeat-x;--dx:${P(-tw,w)};animation:envlv-scroll ${(tw/Math.abs(v)).toFixed(2)}s linear infinite${filter?';filter:'+filter:''}`);
 box.appendChild(e);return e}
function build(layer,L,sp,still){const [W,H]=sp;const box=el('div','envlv','position:absolute;inset:0;z-index:1;pointer-events:none');css();
 for(const c of L.clouds||[]){const tw=c.tile[0]*c.h/c.tile[1];scrollBand(box,W,H,{src:c.f,y:c.y,h:c.h,tw,v:c.v,op:c.op,filter:[c.con?`contrast(${c.con})`:'',c.dark?`brightness(${c.dark})`:''].join(' ').trim()})}
 for(const s of L.swell||[]){const m=el('div','envlv-a envlv-water',`position:absolute;inset:0;-webkit-mask:url("${s.mask}") 0 0/100% 100%;mask:url("${s.mask}") 0 0/100% 100% luminance`);
  const r=s.r;m.appendChild(el('i','',`position:absolute;left:${P(r[0],W)};top:${P(r[1],H)};width:${P(r[2],W)};height:${P(r[3],H)};background:url("${s.f}") 0 0/100% 100%;--sx:${P(s.amp[0],r[2])};--sy:${P(s.amp[1],r[3])};animation:envlv-swell ${s.period/2}s ease-in-out infinite alternate`));box.appendChild(m)}
 for(const f of L.fog||[]){const tw=f.tw,b=scrollBand(box,W,H,{src:'',y:f.y,h:f.h,tw,v:f.v,op:f.op});crop(f.atlas,f.crop).then(u=>{if(u)b.style.backgroundImage=`url("${u}")`})}
 for(const lan of L.lantern||[]){const r=lan.r,w=el('i','envlv-a envlv-lantern',`left:${P(r[0],W)};top:${P(r[1],H)};width:${P(r[2],W)};height:${P(r[3],H)};mix-blend-mode:${lan.blend||'screen'};opacity:${lan.op};animation:envlv-flicker 2.3s linear infinite`);
  w.appendChild(el('i','',`position:absolute;inset:0;background:url("${lan.f}") 0 0/300% 200% no-repeat;animation:envlv-flame ${(12/lan.fps).toFixed(2)}s step-end infinite`));box.appendChild(w)}
 for(const pd of L.particles||[]){const R=rng(pd.seed);
  for(let k=0;k<pd.n;k++){const r=pd.rects[Math.floor(R()*pd.rects.length)],w=pd.w[0]+R()*(pd.w[1]-pd.w[0]),h=r[3]*w/r[2],y=pd.y[0]+R()*(pd.y[1]-pd.y[0]);
   const D=W+w+200,dur=D/(pd.v*.65),o=el('i','envlv-a envlv-part',`left:${P(W+100,W)};top:${P(y,H)};width:${P(w,W)};height:${P(h,H)};opacity:${pd.op};--dx:${P(-D,w)};animation:envlv-scroll ${dur.toFixed(2)}s linear ${(-R()*dur).toFixed(2)}s infinite`);
   const b=el('i','',`position:absolute;inset:0;--bob:${P(7,h)};animation:envlv-bob 1.55s ease-in-out ${(-R()*3).toFixed(2)}s infinite alternate`);
   const c=el('i','',`position:absolute;inset:0;overflow:hidden`);c.appendChild(el('i','',`position:absolute;left:${P(-r[0],r[2])};top:${P(-r[1],r[3])};width:${P(pd.atlas[0],r[2])};height:${P(pd.atlas[1],r[3])};background:url("${pd.f}") 0 0/100% 100%`));
   b.appendChild(c);o.appendChild(b);box.appendChild(o)}}
 for(const s of L.statics||[]){const r=s.r;box.appendChild(el('i','envlv-static'+(s.combatOnly?' envlv-combat':''),`left:${P(r[0],W)};top:${P(r[1],H)};width:${P(r[2],W)};height:${P(r[3],H)};background:url("${s.f}") 0 0/100% 100%`))}
 return box}
// Called by syncEnv on every backdrop change: one .envlv per layer, rebuilt only when the env changes.
export function syncLiving(id,e){document.querySelectorAll('#env .envL').forEach(l=>{const layer=l.firstElementChild;if(!layer)return;const old=layer.querySelector(':scope>.envlv');const L=e&&e.living&&e.living[l.dataset.l];
 if(old&&old.dataset.env===id&&L)return;if(old)old.remove();if(!L)return;const b=build(layer,L,e.space||[3600,1440]);b.dataset.env=id;layer.appendChild(b)})}
export function livingCount(){return document.querySelectorAll('#env .envlv .envlv-a').length}
