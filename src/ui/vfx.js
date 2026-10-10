// ui/vfx.js — persistent FX layer (R1). Lives on <body>, so render() never restarts anything in it.
//  • fxQueue      tiny timer queue with await-able waits; dropped when effects are off
//  • particles    pooled canvas-2D emitter (cap 60 full / 30 reduced), DPR <= 2, loop runs only while particles live
//  • vignette     edge flash (red = HP loss, pale blue = Guard absorbed, gold = level-up)
//  • shakeFrames  decaying screen shake keyframes; slowmo; snapshot crossfade; flyIcon (reward -> HUD)
// Everything is transform / opacity (canvas for particles). Quality follows the Effects option (env.quality()).
import {settings} from '../save.js';
import {quality} from './env.js';
const mq=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
export const reducedMotion=()=>mq.matches||!!settings.reduceMotion;
// effects that are allowed at all (flashes, particles)
export const fxOn=()=>!window.FAST&&!document.hidden&&quality()!=='off';
// effects that move things around (shake, lunges, flights)
export const motionOn=()=>fxOn()&&!reducedMotion();
// ---------- palette: drowned, painterly (salt, pale teal, rust, tarnished gold) ----------
export const COL={salt:'#eef3f0',ash:'#b9b4a6',ashDark:'#7f796c',rust:'#a8322e',teal:'#7fd0c8',pale:'#bfe3ff',gold:'#d8a446',heal:'#a8d98a',tide:'#2fb8c4',echo:'#a07bff',carto:'#d8a446',duel:'#ec5f4a'};
export const CLASS_COL={tide:COL.tide,echo:COL.echo,carto:COL.carto,duel:COL.duel};
// ---------- queue ----------
const timers=new Set();
export const fxQueue={
 push(ms,run){if(!fxOn())return null;const t=setTimeout(()=>{timers.delete(t);try{run()}catch(e){console.warn('fx step failed',e)}},Math.max(0,ms));timers.add(t);return t},
 wait(ms){return new Promise(res=>{if(!fxOn())return res();fxQueue.push(ms,res)})},
 clear(){timers.forEach(clearTimeout);timers.clear()}};
// ---------- layer ----------
let layer=null,cv=null,cx=null,dpr=1,running=false,lastT=0;
function ensure(){if(layer&&layer.isConnected)return layer;
 layer=document.createElement('div');layer.id='fxlayer';layer.setAttribute('aria-hidden','true');
 layer.innerHTML='<canvas id="fxcv"></canvas><i class="vig red"></i><i class="vig blue"></i><i class="vig gold"></i>';
 document.body.appendChild(layer);cv=layer.firstChild;cx=cv.getContext('2d');size();return layer}
function size(){if(!cv)return;dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(innerWidth*dpr);cv.height=Math.round(innerHeight*dpr)}
addEventListener('resize',size);
// ---------- particles ----------
const POOL=60,P=[];
const cap=()=>quality()==='reduced'?POOL/2:POOL;
function spawn(o){if(P.length>=cap())return;P.push(o)}
const rnd=(a,b)=>a+Math.random()*(b-a);
function loop(t){const dt=Math.min(.05,(t-(lastT||t))/1000);lastT=t;
 if(document.hidden||!P.length){running=false;lastT=0;cx&&cx.clearRect(0,0,cv.width,cv.height);return}
 cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,innerWidth,innerHeight);
 for(let i=P.length-1;i>=0;i--){const p=P[i];p.age+=dt;if(p.age>=p.life){P.splice(i,1);continue}
  p.vy+=p.g*dt;p.vx*=p.drag;p.x+=p.vx*dt;p.y+=p.vy*dt;const k=p.age/p.life;
  cx.globalAlpha=p.a*(k<.15?k/.15:1-(k-.15)/.85);cx.fillStyle=p.col;
  if(p.shape==='shard'){cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot+p.age*p.spin);cx.fillRect(-p.r,-p.r*.4,p.r*2,p.r*.8);cx.restore()}
  else if(p.shape==='drop'){cx.beginPath();cx.ellipse(p.x,p.y,p.r*.7,p.r*1.2,0,0,6.283);cx.fill()}
  else{cx.beginPath();cx.arc(p.x,p.y,p.r*(p.shrink?1-k*.6:1),0,6.283);cx.fill()}}
 cx.globalAlpha=1;requestAnimationFrame(loop)}
function kick(){if(running||!P.length)return;running=true;lastT=0;requestAnimationFrame(loop)}
function mk(x,y,a,sp,o){const ang=a+rnd(-o.spread,o.spread),s=rnd(sp[0],sp[1]);
 return {x,y,vx:Math.cos(ang)*s,vy:Math.sin(ang)*s,g:o.g||0,drag:o.drag||.99,age:0,life:rnd(o.life[0],o.life[1])/1000,r:rnd(o.r[0],o.r[1]),col:o.col,a:o.a||1,shape:o.shape||'dot',rot:rnd(0,6.28),spin:rnd(-8,8),shrink:o.shrink}}
// dir: +1 flies right, -1 flies left (away from the attacker)
const PRE={
 hit(x,y,dir=1){for(let i=0;i<6;i++)spawn(mk(x,y,dir>0?0:Math.PI,[120,300],{spread:.9,g:420,life:[260,420],r:[1.2,2.4],col:COL.salt,shrink:1}));
  for(let i=0;i<3;i++)spawn(mk(x,y,dir>0?0:Math.PI,[80,200],{spread:1.1,g:620,life:[320,520],r:[1.8,2.8],col:COL.rust,shape:'drop'}))},
 guard(x,y){for(let i=0;i<7;i++)spawn(mk(x,y,rnd(0,6.28),[70,190],{spread:0,g:200,life:[300,460],r:[2,4],col:COL.pale,shape:'shard',drag:.96}))},
 heal(x,y,w=40){for(let i=0;i<7;i++)spawn(mk(x+rnd(-w/2,w/2),y+rnd(-8,14),-Math.PI/2,[30,80],{spread:.35,g:-30,life:[600,950],r:[1.4,2.6],col:i%2?COL.heal:COL.gold,drag:.985,shrink:1}))},
 death(x,y,w=60,h=80,n=14){for(let i=0;i<n;i++)spawn(mk(x+rnd(-w/2,w/2),y-rnd(0,h),Math.PI/2,[10,50],{spread:1.6,g:rnd(20,60),life:[650,1000],r:[1.4,3],col:i%3?COL.ash:COL.ashDark,a:.85,drag:.98,shrink:1}))},
 trail(x,y,col=COL.teal){spawn(mk(x,y,rnd(0,6.28),[0,18],{spread:0,life:[180,300],r:[1.6,3],col,a:.8,shrink:1}))},
 coin(x,y){for(let i=0;i<8;i++)spawn(mk(x,y,rnd(0,6.28),[40,150],{spread:0,g:320,life:[350,600],r:[1.5,2.6],col:i%2?COL.gold:COL.salt,shrink:1}))},
 burst(x,y,col=COL.gold,n=18){for(let i=0;i<n;i++)spawn(mk(x,y,rnd(0,6.28),[60,240],{spread:0,g:-30,life:[500,900],r:[1.6,3.2],col:i%3?col:COL.salt,drag:.97,shrink:1}))},
 drip(x,y){for(let i=0;i<4;i++)spawn(mk(x+rnd(-10,10),y+rnd(-8,8),Math.PI/2,[10,50],{spread:.3,g:700,life:[300,480],r:[1.8,2.8],col:COL.rust,shape:'drop'}))},
 ripple(x,y){for(let i=0;i<5;i++)spawn(mk(x,y,rnd(0,6.28),[30,90],{spread:0,g:60,life:[300,500],r:[1.2,2.2],col:COL.teal,shrink:1}))}};
export function emit(kind,x,y,a,b,c){if(!fxOn()||!PRE[kind])return;ensure();PRE[kind](x,y,a,b,c);kick()}
export const rectOf=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,l:r.left,t:r.top}};
// ---------- vignette flash ----------
export function vignette(kind,strength=.5,ms=380){if(!fxOn())return;ensure();const el=layer.querySelector('.vig.'+kind);if(!el||!el.animate)return;
 el.getAnimations().forEach(a=>a.cancel());el.animate([{opacity:0},{opacity:strength,offset:.18},{opacity:0}],{duration:ms,easing:'ease-out'})}
// ---------- shake: decaying, transform only. amp in px; returns keyframes for WAAPI ----------
export function shakeFrames(amp){const n=7,f=[];for(let i=0;i<=n;i++){const k=1-i/n,s=i%2?-1:1;f.push({translate:i===n?'0 0':`${(s*amp*k).toFixed(2)}px ${(-s*amp*k*.45).toFixed(2)}px`})}return f}
// ---------- slow-motion beat: every running animation at `rate` for `ms` ----------
export function slowmo(ms=400,rate=.5){if(!motionOn()||!document.getAnimations)return;const list=document.getAnimations();
 list.forEach(a=>{try{a.updatePlaybackRate(rate)}catch(_){}});setTimeout(()=>list.forEach(a=>{try{a.updatePlaybackRate(1)}catch(_){}}),ms)}
// ---------- hit-stop for idle loops: pause the CSS animations under `el` for `ms` ----------
export function freezeIdle(el,ms){if(!el||!el.getAnimations)return;const as=el.getAnimations({subtree:true}).filter(a=>a instanceof CSSAnimation);
 as.forEach(a=>a.pause());setTimeout(()=>as.forEach(a=>{try{a.play()}catch(_){}}),ms)}
// ---------- impact timing: damage numbers and reactions land when the swing connects ----------
let base=0,counts={};
export function setImpact(ms){base=fxOn()&&!reducedMotion()?ms:0;counts={}}
export const impactBase=()=>base;
export function impactDelay(who){if(!base)return 0;const n=counts[who]=(counts[who]||0)+1;return base+(n-1)*85}
export function stackIndex(who){return counts[who]||0}
// ---------- one-shot DOM bits on the persistent layer ----------
export function ring(x,y,col=COL.teal,size=70,ms=360){if(!fxOn())return;ensure();const el=document.createElement('i');el.className='fxring';
 Object.assign(el.style,{left:x+'px',top:y+'px',width:size+'px',height:size+'px',borderColor:col});layer.appendChild(el);
 const done=()=>el.remove();if(!el.animate||reducedMotion()){el.animate&&el.animate([{opacity:.7},{opacity:0}],{duration:200}).finished.then(done,done);if(!el.animate)done();return}
 el.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:.85},{transform:'translate(-50%,-50%) scale(1)',opacity:0}],{duration:ms,easing:'ease-out'}).finished.then(done,done)}
// an emoji/icon node flies from a rect to another element (reward -> HUD counter), then calls done
export function flyIcon(fromEl,toEl,{html,ms=520,col=COL.gold,done}={}){
 if(!motionOn()||!fromEl||!toEl||!fromEl.animate){done&&done();return}
 ensure();const a=rectOf(fromEl),b=rectOf(toEl);const el=document.createElement('div');el.className='flyicon';el.innerHTML=html||'';
 Object.assign(el.style,{left:a.x+'px',top:a.y+'px'});layer.appendChild(el);
 const dx=b.x-a.x,dy=b.y-a.y;let tr=0;const t0=performance.now();
 const tick=()=>{if(!el.isConnected)return;const r=el.getBoundingClientRect();emit('trail',r.left+r.width/2,r.top+r.height/2,col);tr=requestAnimationFrame(tick)};tr=requestAnimationFrame(tick);
 el.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx*.4}px),calc(-50% + ${dy*.4-34}px)) scale(1.15)`,opacity:1,offset:.45},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.5)`,opacity:.9}],{duration:ms,easing:'cubic-bezier(.4,0,.4,1)'}).finished.then(()=>{cancelAnimationFrame(tr);el.remove();emit('coin',b.x,b.y);ring(b.x,b.y,col,44,300);done&&done()},()=>{cancelAnimationFrame(tr);el.remove();done&&done()})}
// ---------- screen crossfade: the old #app contents fade out over the new screen ----------
let xf=null;
export function crossfade(app,{hold=0,ms=260,gray=false}={}){if(!motionOn()||!app||!app.firstChild)return;
 if(xf){xf.remove();xf=null}
 const o=app.cloneNode(true);o.removeAttribute('id');o.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));o.classList.add('xfade');o.setAttribute('aria-hidden','true');
 o.style.cssText=`position:fixed;left:0;right:0;top:${-scrollY}px;height:${app.scrollHeight}px;z-index:55;pointer-events:none;overflow:hidden;visibility:visible`;
 o.querySelectorAll('[onclick]').forEach(n=>n.removeAttribute('onclick'));
 document.body.appendChild(o);xf=o;
 const fin=()=>{o.remove();if(xf===o)xf=null};
 const k=hold/(hold+ms)||0,f=gray?'grayscale(1) brightness(.55)':'none';
 o.animate([{opacity:1,filter:'none',offset:0},{opacity:1,filter:f,offset:k},{opacity:0,filter:f,offset:1}],{duration:hold+ms,easing:'ease-out'}).finished.then(fin,fin)}
export const xfadeEl=()=>xf;
// pause/resume tab visibility
document.addEventListener('visibilitychange',()=>{if(document.hidden){P.length=0;fxQueue.clear()}});
