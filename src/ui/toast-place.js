// v0.6.95: in battle the pop-up messages (toasts: relic, potion, gold, Lantern Task) used a fixed top-right stack (top 54px, right 10px)
// that sat over enemy intents. Each toast now goes in the nearest free slot, worked out from the live element rects after every combat
// render: never over an intent, health plate or name plate, status badge, relic, hand card, button, the orb, a coach pill, a callout,
// the boss title or the top bar (nor another toast), and preferably not over a figure. When the full width does not fit, narrower
// widths (text wraps) are tried. A toast keeps its slot while that slot stays clear, so messages do not jump around between renders.
const HARD='.en .intentw,.bossbeat h2,.callouts .co,.plate,.badges .bd,.stw .bd,#relicbar .relic,#relicbar,.hand .card,#endbtn,.orb,.topbar,.coach,.chartbox,.pop,.potpop,.relpop,#kwtip,.detail,.insp,button,[onclick]';
const SOFT='.en,.combat .hero';
// v0.7.03: when a start-of-fight choice (e.g. the Navigator's) fills the middle of the screen there can be no spot clear of every
// obstacle; the toast then fell back to the top-right corner, on an enemy's health bar or the End Turn button. A second pass now lets
// a toast sit over an enemy's body (tappable to target, so it is in HARD) but still never over its bar, intent, badges or End.
const CORE=HARD.replace('[onclick]','[onclick]:not(.en)');
const M=6;// margin from the screen edge and around obstacles
const WIDTHS=[0,300,220,160,120],PEN={0:0,300:400,220:900,160:1600,120:2600};// narrower (wrapped) toasts cost a little more
let slots=new Map();
// An element that is fading or scaling in (coach pill, callout) is still at opacity 0 or off its final spot on the render that adds it,
// so anything with a running animation counts as present and gets a wider margin.
const anim=e=>{try{return e.getAnimations().some(x=>x.playState==='running')}catch(_){return false}};
const vis=e=>{if(e.closest('.xfade,.toasts'))return false;const cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&(+cs.opacity!==0||anim(e))};
// v0.7.03: toasts placed while the hand is still being dealt (or a plate, button or pill is still sliding in) were measured against
// the in-flight rects: on a fight's first render the dealt cards sit stacked mid-screen, so a start-of-combat toast landed where the
// fanned hand ends up and covered it until the next render. Obstacles are now measured at the end of their running finite animations
// and transitions: each one is moved to just before its end, the rects are read, and its time is put back in the same frame, so
// nothing is painted and no finish handlers fire. Show-then-fade animations are measured
// at their hold instead; looping (idle) animations and the toasts' own animations are left alone.
function atRest(a,read){const moved=[];
 try{for(const an of document.getAnimations()){const t=an.effect&&an.effect.target;if(!t||!a.contains(t)||t.closest('.toasts')||an.playState!=='running'||an.currentTime==null||!(an.playbackRate>0))continue;
  const end=an.effect.getComputedTiming().endTime;if(!isFinite(end)||end-an.currentTime<1)continue;const c=an.currentTime;an.currentTime=end-.5;
  // a show-then-fade animation (callout, boss title, hint pill) ends invisible and off its resting spot: measure it at the first
  // point of its remaining run where it is clearly shown (its hold), or where it is now if there is none
  if(t instanceof Element&&+getComputedStyle(t).opacity<.05){let at=c;for(const f of [.25,.5,.15,.75]){an.currentTime=c+(end-c)*f;if(+getComputedStyle(t).opacity>=.5){at=an.currentTime;break}}an.currentTime=at}
  moved.push([an,c])}}catch(_){}
 try{return read()}finally{for(const [an,c] of moved){try{an.currentTime=c}catch(_){}}}}
function rects(a,sel){const vw=innerWidth,vh=innerHeight,out=[];
 for(const e of a.querySelectorAll(sel)){const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;if(r.width*r.height>.25*vw*vh)continue;if(r.right<0||r.bottom<0||r.left>vw||r.top>vh)continue;if(!vis(e))continue;const p=anim(e)?M*2:M/2;out.push([r.left-p,r.top-p,r.right+p,r.bottom+p])}return out}
const ov=(x,y,w,h,r)=>{const ix=Math.min(x+w,r[2])-Math.max(x,r[0]),iy=Math.min(y+h,r[3])-Math.max(y,r[1]);return ix>0&&iy>0?ix*iy:0};
const clear=(x,y,w,h,hard,vw,vh)=>x>=M-1&&y>=M-1&&x+w<=vw-M+1&&y+h<=vh-M+1&&!hard.some(r=>ov(x,y,w,h,r));
function search(w,h,hard,soft,vw,vh,px,py){let best=null;
 for(let y=M;y<=vh-M-h;y+=3)for(let x=M;x<=vw-M-w;x+=6){let bad=false;for(const r of hard)if(ov(x,y,w,h,r)){bad=true;break}if(bad)continue;
  let c=0;for(const r of soft)c+=ov(x,y,w,h,r);c+=Math.hypot(x+w-px,y-py)*.5;if(!best||c<best.c)best={x,y,c}}
 return best}
// Measured at the top-left corner: a fixed box near the right edge would shrink to the space left and read too narrow.
function size(t,mw){t.style.left=t.style.top='0px';t.classList.toggle('wrap',!!mw);t.style.maxWidth=mw?mw+'px':'';const b=t.getBoundingClientRect();return [Math.ceil(b.width),Math.ceil(b.height)]}
export function placeToasts(a){const box=a.querySelector('.toasts');
 if(!box||a.dataset.screen!=='combat'){if(box&&box.classList.contains('placed')){box.classList.remove('placed');for(const t of box.children){t.classList.remove('wrap');t.style.left=t.style.top=t.style.maxWidth=''}}slots=new Map();return}
 const vw=innerWidth,vh=innerHeight;const [hard,soft,core]=atRest(a,()=>[rects(a,HARD),rects(a,SOFT),rects(a,CORE)]);box.classList.add('placed');
 const next=new Map();let py=54;// the old top-right anchor is the preferred spot; later toasts prefer to sit below earlier ones
 const seen=new Map();// several toasts can share a timestamp, so the slot key is time + text + repeat count
 for(const t of box.children){const k0=(t.dataset.k||'')+'|'+t.textContent,c=(seen.get(k0)||0)+1;seen.set(k0,c);const k=k0+'|'+c;let best=null;const old=slots.get(k);
  if(old){const [w,h]=size(t,old.mw);if(w===old.w&&h===old.h&&clear(old.x,old.y,w,h,hard,vw,vh)&&!soft.some(r=>ov(old.x,old.y,w,h,r)))best=old}
  if(!best)for(const mw of WIDTHS){const [w,h]=size(t,mw);if(w>vw-2*M)continue;const p=search(w,h,hard,soft,vw,vh,vw-10,py);
   if(p&&(!best||p.c+PEN[mw]<best.c))best={x:p.x,y:p.y,w,h,mw,c:p.c+PEN[mw]}}
  if(!best)for(const mw of WIDTHS){const [w,h]=size(t,mw);if(w>vw-2*M)continue;const p=search(w,h,core,soft,vw,vh,vw-10,py);// over an enemy body
   if(p&&(!best||p.c+PEN[mw]<best.c))best={x:p.x,y:p.y,w,h,mw,c:p.c+PEN[mw]}}
  if(!best){const [w,h]=size(t,0);best={x:vw-10-w,y:py,w,h,mw:0}}// nowhere clear even then (should not happen): the old spot
  size(t,best.mw);t.style.left=best.x+'px';t.style.top=best.y+'px';next.set(k,best);
  hard.push([best.x-2,best.y-2,best.x+best.w+2,best.y+best.h+2]);core.push(hard[hard.length-1]);py=best.y+best.h+4}
 slots=next}
