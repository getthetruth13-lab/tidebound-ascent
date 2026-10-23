// Presentation-only combat observer. render() replaces the DOM on every change, so every animation here is either
//  (a) a body-level persistent element (ghosts, card clones, FX layer, see vfx.js), or
//  (b) a timed ENTRY: {t0,total,apply(elapsed)} that syncCombatAnimations() re-applies to the new DOM with the elapsed time,
//      so an animation resumes instead of restarting or vanishing when something re-renders mid-flight.
import {shakeLayers} from './stage.js';
import {syncRigs} from './rig.js';
import {ENEMY_POSES} from '../assets.js';
import {W} from '../core/state.js';
import {settings} from '../save.js';
import {CARDS} from '../core/registry.js';
import {observeEvents} from '../core/bus.js';
import {playSound,duckMusic} from '../audio.js';
import {deathStyleOf,DEATH_STYLES,BOSS_VARIANT,FINALE,DEATH_DRAIN} from './deathstyles.js';
import {alive} from '../engine/combat.js';
import {T,U,EB,HIT_WEIGHT,beatsFor} from '../core/timing.js';
import {cardHTML} from './render.js';
import {cloneCard,IMPACT_MS} from './fx.js';
import * as PFX from './painted-fx.js';
import {glideTo,lanternBusy} from './lantern.js';
import {fxOn,motionOn,reducedMotion,fxQueue,emit,ring,vignette,shakeFrames,slowmo,freezeIdle,rectOf,setImpact,impactBase,crossfade,xfadeEl,flyIcon,cue,COL,CLASS_COL} from './vfx.js';
const enabled=()=>motionOn();
export const motionEnabled=enabled;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let pending=[],combat=null,entries=[];
const enemy=e=>e&&W.cb?`.en[data-en="${W.cb.ens.indexOf(e)}"]`:null;
const figOf=sel=>sel&&$(sel+' .fig');
const centre=sel=>{const el=sel&&($(sel+' .fig')||$(sel));return el?rectOf(el):null};
// ---------- entries ----------
let activeEntry=null;
function entry(total,apply){total=T(total);const e={t0:performance.now(),total,animations:new Map(),slot:0};
 e.apply=elapsed=>{const previous=activeEntry;activeEntry=e;e.slot=0;try{apply(elapsed)}finally{activeEntry=previous}};
 entries.push(e);return e}
// element.animate with a delay and an elapsed offset (resume); frames use individual transform properties (translate/scale/rotate) so they stack
function play(el,frames,dur,elapsed,delay=0,easing='linear'){const slot=activeEntry?activeEntry.slot++:0;dur=T(dur);delay=T(delay);
 if(!el||!el.animate||elapsed>=delay+dur)return;
 // A retained element already runs this entry at its original timeline position.
 const previous=activeEntry?.animations.get(slot);if(previous?.el===el)return previous.animation;
 previous?.animation.cancel();const animation=el.animate(frames,{duration:dur,delay:delay-elapsed,easing,fill:'backwards'});
 if(activeEntry)activeEntry.animations.set(slot,{el,animation});return animation}
const at=(ms,total)=>+(ms/total).toFixed(4);
// ---------- one-shot visuals at a fixed time ----------
// All durations in this file are written in the original (design) ms; entry/play/later apply the central scale (core/timing.js).
const later=(ms,fn)=>ms>0?fxQueue.push(T(ms),fn):fn();
const laterU=(ms,fn)=>ms>0?fxQueue.push(U(ms),fn):fn();
function burstAt(sel,kind,ms=0,...args){later(ms,()=>{const c=centre(sel);if(c)emit(kind,c.x,c.y,...args)})}
function ringAt(sel,col,size,ms=0,ms2=360){later(ms,()=>{const c=centre(sel);if(c)ring(c.x,c.y,col,size,ms2)})}
// Attack cutouts keep idle height and foot anchor; wider weapons/gestures may extend beyond the idle box.
function attackPose(sel,pose,total){
 const touched=new Map();
 entry(total,elapsed=>{const im=sel&&$(sel+' img.spr');if(!im)return;
  if(!touched.has(im)){touched.set(im,{src:im.getAttribute('src'),style:im.getAttribute('style')});
   im.src=pose.f;im.dataset.pose='atk';
   const box=im.closest('.fig');const h=box.offsetHeight,w=h*pose.w/pose.h;
   const anchor=parseFloat(im.closest('.en').style.getPropertyValue('--ax'))||box.offsetWidth/2;
   Object.assign(im.style,{height:h+'px',width:w+'px',left:(anchor-w*pose.ax)+'px',top:'auto',bottom:'0'});
  }
 });
 setTimeout(()=>{for(const [im,old] of touched){if(im.dataset.pose!=='atk'||im.getAttribute('src')!==pose.f)continue;im.src=old.src;old.style==null?im.removeAttribute('style'):im.setAttribute('style',old.style);delete im.dataset.pose}},T(total));
}
// ---------- ghosts (persistent copies of a figure) ----------
function ghost(selector,kind,opts={}){const source=selector&&$(selector);if(!source)return null;
 const fig=source.querySelector('.fig'),r=(fig||source).getBoundingClientRect();
 const el=document.createElement('div');el.className=opts.bare?kind:`action-ghost ${kind}`;el.setAttribute('aria-hidden','true');
 Object.assign(el.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
 if(fig){el.appendChild(fig.cloneNode(true));el.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));el.querySelectorAll('.fig').forEach(n=>{n.className='fig';n.style.animation='none'});el.querySelectorAll('img').forEach(i=>{i.decoding='sync';i.loading='eager'})}
 document.body.appendChild(el);const ms=opts.life||T(580);el.addEventListener('animationend',e=>{if(e.target===el&&!opts.keep)el.remove()});setTimeout(()=>el.remove(),ms);
 return {el,r}}
function effect(selector,kind,col){const source=selector&&$(selector);if(!source)return;
 const r=source.getBoundingClientRect(),el=document.createElement('i');el.className=`combat-action ${kind}`;el.setAttribute('aria-hidden','true');
 Object.assign(el.style,{left:r.left+r.width/2+'px',top:r.top+r.height*.5+'px'});if(col)el.style.setProperty('--action-color',col);
 document.body.appendChild(el);setTimeout(()=>el.remove(),T(580));
}
// ---------- death (Task 41): every foe has a lore style (ui/deathstyles.js). The last foe adds the battle-won finale. ----------
//  dissolve = collapse into dark water, brine mist and salt · sink = topple, bubbles and a splash · gutter = flare, embers, smoke
//  boss = slow-motion, shake, flash, then a long disintegrate (the Knell's bell drops and tolls)
let finalEnd=0,finaleTimer=0,finaleEls=[],finaleOn=false,rewardAt=0;
const keep=el=>{finaleEls.push(el);return el};
const drop=el=>{el.remove();finaleEls=finaleEls.filter(x=>x!==el)};
// Remove every finale element and release the held screen. Always safe to call (new fight, tap, hidden tab).
export function finaleCleanup(){finaleTs.forEach(clearTimeout);finaleTs=[];clearTimeout(finaleTimer);finaleTimer=0;finaleEls.forEach(el=>el.remove());finaleEls=[];finaleOn=false;finalEnd=0;rewardAt=0;
 document.body.classList.remove('battle-finale','finale-hide')}
function skipFinale(){if(!finaleOn)return;xfadeEl()?.getAnimations().forEach(a=>{try{a.finish()}catch(_){}});holdUntil=0;finaleCleanup()}
document.addEventListener('pointerdown',()=>{if(finaleOn&&performance.now()-finaleStart>T(350))skipFinale()},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)finaleCleanup()});
let finaleStart=0;
function screenFlash(col,peak,ms){const el=keep(document.createElement('i'));el.className='finale-flash';el.style.background=col;document.body.appendChild(el);document.body.classList.add('battle-finale');
 const done=()=>drop(el);if(!el.animate)return done();el.animate([{opacity:0},{opacity:peak,offset:.2},{opacity:0}],{duration:T(ms),easing:'ease-out'}).finished.then(done,done);setTimeout(done,T(ms)+200)}
// particle recipes per style; (x,y) bottom-centre of the figure
const PUFF={
 dissolve:(x,y,w,h,k)=>{emit('mist',x,y,w,h,k?6:8);emit('salt',x,y,w,h,k?6:8);if(k)emit('splash',x,y,w*.8,6)},
 sink:(x,y,w,h,k)=>{emit('bubbles',x,y,w,h,k?7:5);if(!k)emit('splash',x+w*.25,y,w*.9,12)},
 gutter:(x,y,w,h,k)=>{emit('embers',x,y,w,h,k?7:10);emit('smoke',x,y,w,h,k?3:5)},
 bell:(x,y,w,h,k)=>{emit('salt',x,y,w,h,10);emit('mist',x,y,w,h,6);emit('burst',x,y-h*.5,COL.gold,k?10:18)},
 kelp:(x,y,w,h,k)=>{emit('spores',x,y,w,h,12);emit('mist',x,y,w,h,5,COL.kelp);emit('smoke',x,y,w,h,3)},
 water:(x,y,w,h,k)=>{emit('mist',x,y,w,h,8);emit('splash',x,y,w,16);emit('bubbles',x,y,w,h*.6,6);emit('salt',x,y,w,h,6)}};
// reduced motion: no movement or particles, just a short plain fade of the foe's figure (Task 42)
function deathFade(e){const sel=enemy(e),el=sel&&$(sel);if(!el)return;const g=ghost(sel,'death-fade',{life:T(500),keep:true,bare:true});if(!g)return;
 el.classList.add('gone');const done=()=>g.el.remove();
 if(!g.el.animate)return done();g.el.animate([{opacity:1},{opacity:0}],{duration:T(350),easing:'ease-out',fill:'forwards'}).finished.then(done,done)}
const lead0=(lead,drain)=>(lead-drain)/T(1);
// The dying foe's name plate + health bar: a body-level copy whose bar drains smoothly to zero at the impact, then fades as the figure collapses
function drainBar(el,start,drain,TT){if(!el.animate)return;
 const wrap=document.createElement('div');wrap.className='combat victory-wrap ghostwrap';wrap.setAttribute('aria-hidden','true');wrap.innerHTML='<div class="scene"><div class="foes"></div></div>';
 const c=el.cloneNode(true);c.removeAttribute('id');c.removeAttribute('onclick');c.className=c.className.replace(/\bgone\b/,'')+' plate-only';c.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));c.querySelectorAll('[onclick]').forEach(n=>n.removeAttribute('onclick'));
 wrap.querySelector('.foes').appendChild(c);wrap.style.zIndex=34;document.body.appendChild(wrap);
 const gone=()=>wrap.remove();setTimeout(gone,TT+400);
 const fills=[...c.querySelectorAll('.hpin>i')],num=c.querySelector('.hpnum'),from=+((c.querySelector('.hpbar')||{}).dataset||{}).hp||0;
 fills.forEach((f,i)=>{const cur=f.style.transform||'scaleX(1)';f.style.transformOrigin='0 50%';f.animate([{transform:cur},{transform:'scaleX(0)'}],{duration:drain||1,delay:start+(i===0?Math.round(drain*.25):0),easing:'ease-in',fill:'both'})});
 if(num&&from>0&&drain){const t0=performance.now()+start,tick=()=>{if(!wrap.isConnected)return;const k=Math.max(0,Math.min(1,(performance.now()-t0)/drain));num.firstChild.textContent=Math.round(from*(1-k));if(k<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)}
 wrap.animate([{opacity:1},{opacity:1,offset:Math.min(.98,(start+drain+T(120))/TT)},{opacity:0}],{duration:TT,easing:'linear',fill:'forwards'}).finished.then(gone,gone)}
function death(e,lead){const sel=enemy(e);const el=sel&&$(sel);if(!el)return;
 const style=deathStyleOf(e),def=DEATH_STYLES[style],boss=style==='boss',variant=boss?(BOSS_VARIANT[e.key]||'water'):style;
 const drain=motionOn()?T(DEATH_DRAIN):0;lead=T(lead)+drain;const D=T(def.ms),TT=lead+D; // the bar drains first (drainBar), the collapse starts after it
 drainBar(el,T(lead0(lead,drain)),drain,TT);
 const g=ghost(sel,'death-sink',{life:TT+240,keep:true});if(!g)return;
 el.classList.add('gone');
 const last=alive().length===0;
 const fig=g.el;const o=ms=>Math.min(1,at(lead+ms*D,TT)),L=at(lead,TT);
 const F=(k,props,easing)=>({offset:k,...props,...(easing?{easing}:{})});
 const calm={filter:'none',opacity:1};
 let frames;
 const flash=(b,s)=>({filter:`brightness(${b})`,opacity:1,transform:`scale(${s})`});
 if(style==='dissolve')frames=[F(0,{...calm,transform:'none'}),F(L,{...calm,transform:'none'}),F(L+.0001,flash(2.4,1.05)),F(o(.1),flash(1.3,1.02),'ease-in'),
  F(o(.17),{filter:'brightness(1.2)',opacity:1,transform:'translateX(-5%) rotate(-3deg)'}),F(o(.25),{filter:'brightness(1.1)',opacity:1,transform:'translateX(4%) rotate(2deg)'}),F(o(.32),{filter:'brightness(1)',opacity:1,transform:'translateX(-2%) rotate(-1deg) scale(1.02)'}), // stagger before the collapse
  F(o(.42),{filter:'brightness(.7) saturate(.5)',opacity:.95,transform:'translateY(10%) scale(1.05,.7)'},'ease-in'),
  F(1,{filter:'brightness(.35) saturate(.3) blur(4px)',opacity:0,transform:'translateY(26%) scale(1.25,.12)'})];
 else if(style==='sink')frames=[F(0,{...calm,transform:'none',translate:'0 0',rotate:'0deg'}),F(L,{...calm,transform:'none',translate:'0 0',rotate:'0deg'}),F(L+.0001,{...flash(1.9,1.04),translate:'0 0',rotate:'0deg'}),
  F(o(.06),{filter:'brightness(1.2)',opacity:1,transform:'none',translate:'-3% 0',rotate:'-4deg'}),F(o(.12),{filter:'brightness(1.1)',opacity:1,transform:'none',translate:'2% 0',rotate:'3deg'}),F(o(.18),{filter:'brightness(1.1)',opacity:1,transform:'none',translate:'-1% 0',rotate:'-6deg'},'ease-in'), // stagger, then topple
  F(o(.4),{filter:'brightness(.85)',opacity:1,transform:'none',translate:'4% 0',rotate:'84deg'},'ease-out'),
  F(o(.52),{filter:'brightness(.85)',opacity:1,transform:'none',translate:'4% 0',rotate:'80deg'},'ease-in'),
  F(1,{filter:'brightness(.4) saturate(.5) hue-rotate(-14deg)',opacity:0,transform:'none',translate:'10% 55%',rotate:'88deg'})];
 else if(style==='gutter')frames=[F(0,{...calm,transform:'none'}),F(L,{...calm,transform:'none'}),F(L+.0001,flash(3.4,1.18)),F(o(.14),{filter:'brightness(2) saturate(1.5)',opacity:1,transform:'scale(1.1)'}),
  F(o(.32),{filter:'brightness(.45)',opacity:.9,transform:'scale(.84,.95)'}),F(o(.46),{filter:'brightness(1.8) saturate(1.4)',opacity:1,transform:'scale(1.02)'}),
  F(o(.7),{filter:'brightness(.3) blur(1px)',opacity:.7,transform:'translateY(-8%) scale(.6,.82)'}),
  F(1,{filter:'brightness(.1) blur(3px)',opacity:0,transform:'translateY(-22%) scale(.25,.55)'})];
 else{ // boss: flash, shudder, (bell: drop and thud), then a bottom-up disintegrate
  const sh=[.12,.2,.28,.36,.44].map((k,i)=>F(o(k),{filter:`brightness(${i%2?1.1:1.9})`,opacity:1,transform:`translate(${i%2?5:-5}px,${i%2?-2:2}px) scale(1.03)`}));
  const bell=variant==='bell';
  frames=[F(0,{...calm,transform:'none'}),F(L,{...calm,transform:'none'}),F(L+.0001,{...flash(4,1.12),clipPath:'inset(0 0 0% 0)'}),F(o(.07),{filter:'brightness(1.4)',opacity:1,transform:'scale(1.05)',clipPath:'inset(0 0 0% 0)'}),
   ...sh.map(f=>({...f,clipPath:'inset(0 0 0% 0)'})),
   ...(bell?[F(o(.52),{filter:'brightness(1.1)',opacity:1,transform:'translateY(16%) rotate(-3deg)',clipPath:'inset(0 0 0% 0)'},'ease-in'),F(o(.57),{filter:'brightness(2)',opacity:1,transform:'translateY(14%) rotate(2deg) scale(1.04)',clipPath:'inset(0 0 0% 0)'})]:
     [F(o(.54),{filter:variant==='kelp'?'brightness(.8) sepia(.7) hue-rotate(40deg)':'brightness(1.8) saturate(.3)',opacity:1,transform:'scale(1.06)',clipPath:'inset(0 0 0% 0)'})]),
   F(1,{filter:'brightness(.5) blur(5px)',opacity:0,transform:`translateY(${bell?'30%':'12%'}) scale(${variant==='water'?'1.15,.7':'.95'})`,clipPath:'inset(0 0 100% 0)'},'ease-in')]}
 frames.sort((a,b)=>a.offset-b.offset);
 // clipPath must exist on every frame once used, and effect offsets must stay monotonic
 fig.animate(frames,{duration:TT,fill:'forwards'}).finished.then(()=>fig.remove(),()=>fig.remove());
 const x=g.r.left+g.r.width/2,y=g.r.top+g.r.height,w=g.r.width*.8,h=g.r.height*.85,puff=PUFF[variant];
 const at2=(k,fn)=>fxQueue.push(lead+k*D,fn);
 if(style==='dissolve'){at2(.08,()=>puff(x,y,w,h,0));at2(.4,()=>{puff(x,y-h*.1,w,h*.7,1);ring(x,y,COL.brine,w*1.1,500)});at2(.7,()=>puff(x,y,w,h*.5,1))}
 else if(style==='sink'){at2(.38,()=>{puff(x+w*.25,y,w,h*.4,0);ring(x+w*.3,y,COL.teal,w*1.1,520);playSound('splash')});at2(.55,()=>puff(x+w*.2,y,w,h*.4,1));at2(.8,()=>puff(x+w*.2,y,w,h*.4,1))}
 else if(style==='gutter'){at2(0,()=>{emit('flare',x,y-h*.5,COL.gold,16);ring(x,y-h*.5,COL.gold,w*1.4,420)});at2(.14,()=>puff(x,y,w,h,0));at2(.46,()=>{emit('flare',x,y-h*.5,COL.salt,8);puff(x,y,w,h,1)});at2(.75,()=>puff(x,y-h*.2,w,h*.6,1))}
 else{ // boss
  at2(0,()=>{shakeNow(12);vignette('gold',.8,520);screenFlash('#f4ecd0',.55,420);ring(x,y-h*.5,COL.gold,h*1.5,700)});
  if(motionOn())at2(0,()=>slowmo(520,.4));
  [.14,.26,.38,.5].forEach(k=>at2(k,()=>{emit('hit',x,y-h*.5,k>.3?-1:1);emit('death',x,y,w,h,10)}));
  if(variant==='bell'){at2(.52,()=>{shakeNow(9);playSound('deathBell',.8);ring(x,y-h*.4,COL.gold,h*1.8,900);ring(x,y-h*.4,COL.salt,h*1.2,700)});at2(.64,()=>ring(x,y-h*.4,COL.gold,h*2.4,1000))}
  else at2(.52,()=>{shakeNow(8);ring(x,y-h*.4,variant==='kelp'?COL.kelp:COL.brine,h*1.6,800)});
  [.56,.64,.72,.8,.88].forEach((k,i)=>at2(k,()=>puff(x,y-h*(.8-i*.16),w,h*(.8-i*.12),i>2?1:0)));
  at2(.84,()=>shakeNow(5))}
 if(last){const t=performance.now();finaleStart=t;document.body.classList.add('battle-finale','finale-hide');
  finalEnd=Math.max(finalEnd,t+TT+T(boss?FINALE.bossTotal+200:FINALE.total));
  fxQueue.push(lead,()=>{duckMusic(1400);if(!boss)document.querySelectorAll('.scene .fig').forEach(f=>freezeIdle(f,FINALE.beat))});
  rewardAt=boss?t+T(BOSS_REWARD_AT):0;
  scheduleFinale(TT-T(boss?0:160)+(boss?T(300):0),{hideEnd:rewardAt,boss,kind:W.cb?.kind,name:e.n,hero:ghost('#hero','hero-lantern',{life:TT+T(2600),keep:true})})}
}
// Boss kill: the reward screen shows ~0.6 s after the killing blow while the boss death and finale play on over it (sweep S2-1: it was hidden ~5 s).
const BOSS_REWARD_AT=600;
let finaleTs=[];const fT=(fn,ms)=>{const t=setTimeout(fn,ms);finaleTs.push(t);return t}; // victory-sweep: finale timers are stored so a cleanup / the next fight can cancel them
function scheduleFinale(delay,info){finaleTs.forEach(clearTimeout);finaleTs=[];fT(()=>document.body.classList.remove('finale-hide'),Math.max(0,(info.hideEnd||finalEnd)-performance.now()));
 clearTimeout(finaleTimer);finaleOn=true;if(info.hero)keep(info.hero.el);
 info.hero&&(info.hero.el.style.opacity=0);cue.victoryAt=performance.now()+delay;
 finaleTimer=setTimeout(()=>runFinale(info),delay);
 fT(()=>{if(finalEnd&&performance.now()>finalEnd+T(900))finaleCleanup()},delay+T(1800));
 fT(()=>finaleOn&&performance.now()>finalEnd+T(500)&&finaleCleanup(),delay+T(2600))}
// The battle-won moment: a sweep of light, the hero's lantern flares, then the centred banner. All body-level, so rerenders can't disturb it.
function runFinale({boss,kind,name,hero}){if(!finaleOn||document.hidden)return;finaleTimer=0;
 const part=(cls,html='')=>{const el=keep(document.createElement('div'));el.className=cls;el.setAttribute('aria-hidden','true');el.innerHTML=html;document.body.appendChild(el);return el};
 const end=Math.max(T(400),finalEnd-performance.now()),life=end+T(450);
 const anim=(el,frames,o)=>{if(!el.animate)return;const a=el.animate(frames,{fill:'both',...o});a.finished.then(()=>{},()=>{});return a};
 vignette('gold',.4,Math.min(700,FINALE.total));
 const dim=part('finale-dim');anim(dim,[{opacity:0},{opacity:.55,offset:.3},{opacity:.55,offset:.9},{opacity:.55}],{duration:Math.max(T(700),end+T(300)),easing:'ease-out'}); // the background dims a little; the reward scene picks the same dim up
 const sweep=part('finale-sweep');anim(sweep,[{transform:'translateX(-60%) skewX(-18deg)',opacity:0},{opacity:1,offset:.3},{transform:'translateX(160%) skewX(-18deg)',opacity:0}],{duration:T(FINALE.sweep),easing:'ease-in-out'});
 if(hero){const r=hero.r,x=r.left+r.width/2,y=r.top+r.height*.45;
  const glow=part('finale-glow');Object.assign(glow.style,{left:x+'px',top:y+'px',width:r.height*1.7+'px',height:r.height*1.7+'px'});
  anim(glow,[{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:.9,offset:.35},{transform:'translate(-50%,-50%) scale(1.15)',opacity:.55}],{duration:Math.max(T(600),end*.8),easing:'ease-out'});
  hero.el.style.opacity='';anim(hero.el,[{opacity:0,filter:'brightness(1)',transform:'none'},{opacity:1,filter:'brightness(1.7) drop-shadow(0 0 10px #f1c85a)',transform:'translateY(-5px) scale(1.04)',offset:.3},{opacity:1,filter:'brightness(1.25) drop-shadow(0 0 6px #f1c85a)',transform:'translateY(-3px) scale(1.02)'}],{duration:Math.max(T(600),end*.8),easing:'ease-out'});
  emit('flare',x,y,COL.gold,18);emit('heal',x,y+r.height*.4,r.width);ring(x,y,COL.gold,r.height*1.6,600);ring(x,y,COL.salt,r.height,420)}
 setTimeout(()=>{if(!finaleOn)return;const b=part('finale-banner',`<b>Victory</b>${kind==='boss'||kind==='elite'?`<small>${name} is silenced</small>`:''}`);
  anim(b,[{opacity:0,transform:'translate(-50%,-28%) scale(.82)',letterSpacing:'14px'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',letterSpacing:'6px',offset:.3},{opacity:1,transform:'translate(-50%,-52%) scale(1.03)',offset:.84},{opacity:0,transform:'translate(-50%,-62%) scale(1.06)'}],{duration:Math.max(T(500),end-T(boss?160:200)+T(120))})},T(boss?160:200));
 setTimeout(()=>{if(finaleOn)finaleCleanup()},life+T(300))}
export const deathHold=()=>Math.max(0,(rewardAt?Math.min(rewardAt,finalEnd):finalEnd)-performance.now());
// Combo beats are presentation only: never delay input or combat resolution.
let lastBeat=0,phase=null,phaseTimer=null,drawTimer=0;
function comboBeat(kind,size=1,delay=impactBase()){
 const cb=W.cb;
 later(delay,()=>{if(W.cb!==cb||W.S.screen!=='combat')return;
  if(performance.now()-lastBeat<55){if(kind!=='critical')playSound(kind);return}lastBeat=performance.now();
  playSound(kind);vignette(kind==='crest'?'blue':'gold',.16,240);
  if(!enabled())return;
  const stop=Math.min(120,60+size*15);
  document.querySelectorAll('.scene .fig').forEach(el=>freezeIdle(el,stop));
  shakeLayers();
 });
}
function phaseSweep(text){
 phase?.remove();clearTimeout(phaseTimer);if(!fxOn())return;
 phase=document.createElement('div');phase.className='banner turn-sweep'+(reducedMotion()?' still':'');
 phase.setAttribute('role','status');phase.textContent=text;document.body.appendChild(phase);
 const node=phase;phaseTimer=setTimeout(()=>{node.remove();if(phase===node)phase=null},T(750));
 vignette('gold',.12,340);
 if(enabled())entry(320,e=>play($('#hand'),[{translate:'0 0',opacity:1},{translate:'0 55px',opacity:.25},{translate:'0 0',opacity:1}],320,e));
}
document.addEventListener('pointerdown',()=>{if(phase){phase.remove();phase=null;clearTimeout(phaseTimer)}},true);
// ---------- observer ----------
function queue(rec){pending.push(rec)}
observeEvents((event,c)=>{if(!W.cb||W.S.screen!=='combat')return;
 if(event==='draw'&&!enabled()){const now=performance.now(),delay=Math.max(0,drawTimer-now);drawTimer=now+delay+62;const cb=W.cb;setTimeout(()=>{if(W.cb===cb&&!document.hidden)playSound('draw',.96+Math.random()*.08)},delay)}
 if(!fxOn())return;
 if(event==='bossPhase'||event==='bossBeat'&&c.kind==='phase'){if(enabled()){shakeNow(10);slowmo(500,.4)}vignette('red',.7,900);const ce=centre(enemy(c.enemy));if(ce){ring(ce.x,ce.y,COL.rust,160,700);emit('burst',ce.x,ce.y,COL.rust,26)}return}
 if(event==='turnEnd')phaseSweep('Enemy Turn');
 if(event==='turnStart')phaseSweep('Your Turn');
 const cls=W.run.cls,target=enemy(c.target||c.enemy),hero='#hero',move=enabled();
 if(event==='beforeCardPlay'){
  const d=CARDS[c.card.id];setImpact(d.t==='A'?IMPACT_MS:0);
  if(move)queue({k:d.t==='A'?'strike':'cast'});
  effect(d.t==='A'?enemy(c.f.tgt)||hero:hero,{tide:'wave',echo:'rings',carto:'quill',duel:d.t==='A'?'slash':'spark'}[cls]);
 }
 if(event==='cardPlayed')setImpact(0);
 if(event==='crest')for(const v of W.cb.vfx)if(Date.now()-v.t<60&&v.txt==='-'+c.dmg)v.cls+=' combo-pop';
 if(event==='crest'||event==='undertow'){effect(hero,event);if(event==='crest')comboBeat('crest',c.dmg/10);else playSound('guard');
  if(event==='crest'){shakeNow(5);vignette('blue',.35,420)}}
 if(event==='echo'){
  ghost(hero,'echo-replay');comboBeat('echo',1+c.k);
  // Recreate the actual echoed card, including its art, without interactive attributes.
  const holder=document.createElement('div');holder.innerHTML=cardHTML(c.card);const card=holder.firstElementChild;
  if(card){const g=card.cloneNode(true);g.querySelectorAll('*').forEach(n=>{for(const a of [...n.attributes])if(a.name.startsWith('on'))n.removeAttribute(a.name)});for(const a of [...g.attributes])if(a.name.startsWith('on')||a.name.startsWith('data-'))g.removeAttribute(a.name);
   g.className+=' echo-card';g.setAttribute('aria-hidden','true');document.body.appendChild(g);setTimeout(()=>g.remove(),T(550))}
 }
 if(event==='flourish'){if(!enemy(c.f.tgt))effect(hero,'flourish');comboBeat('flourish',c.mom/2)}
 if(event==='parry'){effect(hero,'spark');playSound('guard');burstAt(hero,'guard',0)}
 if(event==='waypointPlaced'||event==='waypointTrigger'||event==='advance'){
  PFX.waypoint(centre(hero),event==='advance');
  if(event==='advance')comboBeat((c.wp.rank||0)>=3?'landmark':'rank',c.wp.rank,0);
 }
 if(event==='guardGained'){PFX.guardPulse(centre(hero),1);if(move)queue({k:'guard'})}
 if(event==='statusApplied'){const bad=['weak','vuln','brittle','soaked','bleed','sink','drench','reson'].includes(c.key)?c.n>0:c.n<0;
  const sel=c.player?hero:enemy(c.target);
  effect(sel,'pulse',bad?'var(--status-debuff,#e48a3c)':'var(--status-buff,#5cc98a)');queue({k:'status',sel,key:c.key,bad,n:c.n})}
 if(event==='damageDealt'&&c.amount>0){
  const t=c.target,dealt=c.hpLoss||0,big=t&&(t.hp<=0||dealt>=t.max*.25);
  if(big||c.f?.flourish||c.f?.echo||c.f?.doubled){comboBeat(c.f?.flourish?'flourish':c.f?.echo?'echo':'critical',dealt/12);
   const number=W.cb.vfx.findLast(v=>v.who===t.uid&&v.txt==='-'+dealt);if(number)number.cls+=' combo-pop';}
  queue({k:'hit',sel:target,amount:dealt,big:!!big,boss:!!(t&&t.boss),kill:!!(t&&t.hp<=0),delay:IMPACT_MS,e:t});
  if(t&&t.key==='gateplate'&&dealt>0&&fxOn())later(IMPACT_MS,()=>{const f=document.querySelector(target+' .fig');if(f)PFX.plateSpark(rectOf(f))});
  if(!c.hpLoss&&c.amount)queue({k:'blocked',sel:target})}
 if(event==='playerHit'){queue({k:'herohit',amount:c.amount,blocked:c.blocked,enemy:c.enemy,B:W.cb&&W.cb.beats||beatsFor(c.enemy,{a:1})})}
 if(event==='enemyTelegraph'){setImpact(0);queue({k:'telegraph',sel:enemy(c.enemy),B:c.beats||beatsFor(c.enemy,{a:1}),e:c.enemy})}
 if(event==='enemyStrike'){queue({k:'estrike',sel:enemy(c.enemy),B:c.beats,m:c.intent||{},e:c.enemy})}
 if(event==='enemyAct'){setImpact(Math.round((W.cb&&W.cb.beats||EB()).impact||0))}
 if(event==='playerAttacked')setImpact(0);
 if(event==='enemyKilled'){const e=c.enemy;if(move){death(e,impactBase());queue({k:'shake',amp:(e.boss||e.elite)?7:3,delay:impactBase()})}else if(reducedMotion()&&fxOn())deathFade(e)}
 if(event==='draw')queue({k:'draw',uid:c.card.uid});
 if(event==='shuffle')reshuffle();
 if(event==='turnEnd')discardHand();
 if(event==='roundEnd')setImpact(0);
});
// ---------- draw / discard / reshuffle (R4) ----------
const cardBack=()=>{const b=document.createElement('i');b.className='cardback';b.setAttribute('aria-hidden','true');return b};
function reshuffle(){if(!enabled())return;const a=$('#discpile'),b=$('#drawpile');if(!a||!b)return;const ra=rectOf(a),rb=rectOf(b);
 for(let i=0;i<6;i++){const el=cardBack();Object.assign(el.style,{left:ra.x+'px',top:ra.y+'px'});document.body.appendChild(el);
  const dx=rb.x-ra.x,dy=rb.y-ra.y,lift=-26-(i%3)*10;
  el.animate([{transform:'translate(-50%,-50%) scale(.9) rotate(0deg)',opacity:0},{transform:`translate(calc(-50% + ${dx*.5}px),calc(-50% + ${dy*.5+lift}px)) scale(1) rotate(${i%2?14:-14}deg)`,opacity:1,offset:.5},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.9) rotate(0deg)`,opacity:0}],{duration:T(360),delay:T(i*45),easing:'ease-in-out',fill:'backwards'}).finished.then(()=>el.remove(),()=>el.remove())}
 b.animate([{transform:'scale(1)'},{transform:'scale(1.14)',offset:.7},{transform:'scale(1)'}],{duration:T(260),delay:T(330)})}
function discardHand(){if(!enabled()||!W.cb)return;const pile=$('#discpile');if(!pile)return;const dest=rectOf(pile);
 const cards=$$('.hand .card').filter(el=>W.cb.hand.some(ci=>ci.uid==el.dataset.uid));const rects=new Map(cards.map(el=>[el,el.getBoundingClientRect()]));let n=0;
 for(const el of cards){const ci=W.cb.hand.find(c=>c.uid==el.dataset.uid),d=CARDS[ci.id];if(d.moor||ci.moor)continue;
  const {g,r}=cloneCard(el,rects.get(el));const i=n++,delay=T(i*40);
  if(d.fleet){emit('death',r.left+r.width/2,r.top+r.height/2,r.width*.7,r.height*.6,8);
   g.animate([{opacity:1,filter:'none',transform:'none'},{opacity:.9,filter:'brightness(1.8) grayscale(.5)',transform:'scale(1.04)',offset:.35},{opacity:0,filter:'brightness(.7) grayscale(1)',transform:'translateY(-14px) scale(.9)'}],{duration:T(320),delay,easing:'ease-out',fill:'backwards'}).finished.then(()=>g.remove(),()=>g.remove());continue}
  const tx=dest.x-(r.left+r.width/2),ty=dest.y-(r.top+r.height/2);
  g.animate([{transform:'none',opacity:1},{transform:`translate(${tx*.7}px,${ty*.7}px) scale(.55) rotate(-10deg)`,opacity:.8,offset:.7},{transform:`translate(${tx}px,${ty}px) scale(.25) rotate(-16deg)`,opacity:0}],{duration:T(250),delay,easing:'cubic-bezier(.5,0,.8,.5)',fill:'backwards'}).finished.then(()=>{g.remove()},()=>g.remove())}
 if(n)dest.pulse=pile.animate([{transform:'scale(1)'},{transform:'scale(1.16)',offset:.8},{transform:'scale(1)'}],{duration:T(260),delay:T(n*40+120)})}
// ---------- screen shake on #scene (transform only; reduced motion gets the vignette instead) ----------
function shakeNow(amp){if(!enabled()||settings.screenShake===false)return;entry(300,el=>play($('.scene'),shakeFrames(amp),300,el,0,'linear')).apply(0)}
// ---------- hp bars: delayed ghost chunk, flash on loss, heal motes ----------
let hpMem={},blkMem={},lastEnergy=null,lastTide=null,lastTurn=0;
function syncGuard(bar,who){const b=+bar.dataset.blk||0,prev=blkMem[who];blkMem[who]=b;if(prev==null||prev===b)return;
 if(b>prev){const sh=bar.querySelector('.hpblk');if(sh)entry(450,el=>{const n=$(`.hpbar[data-who="${who}"] .hpblk`);if(n)play(n,[{transform:'scale(.4)',filter:'brightness(2.4)'},{transform:'scale(1.25)',offset:.6},{transform:'scale(1)',filter:'none'}],450,el,0,'cubic-bezier(.2,1.4,.4,1)')})}
 else if(prev>0&&b===0){let shattered=false;entry(520,el=>{const bb=$(`.hpbar[data-who="${who}"]`);if(!bb)return;
  if(!shattered){shattered=true;const isP=who==='p',f=isP?$('#hero .fig'):bb.closest('.en')?.querySelector('.fig');if(f)PFX.guardShatter(rectOf(f),isP?1:-1)}
  let g=bb.querySelector('.guardbreak');if(!g){g=document.createElement('span');g.className='guardbreak';g.innerHTML=document.querySelector('.hpblk .sti')?.outerHTML||'<svg class="sti" viewBox="0 0 24 28"><path d="M12 1.5L2.5 5v8c0 6.5 4 11 9.5 13.5C17.5 24 21.5 19.5 21.5 13V5z" fill="currentColor"/></svg>';bb.appendChild(g)}
  const a=play(g,[{transform:'scale(1) rotate(0)',opacity:1,filter:'brightness(2)'},{transform:'scale(1.3) rotate(-8deg)',opacity:.9,offset:.3},{transform:'translate(-6px,18px) scale(.6) rotate(-30deg)',opacity:0}],520,el,0,'ease-in');if(a)a.onfinish=()=>g.remove();else g.remove()})}}
function syncBars(){for(const bar of $$('.hpbar[data-who]')){const who=bar.dataset.who,hp=+bar.dataset.hp,mx=+bar.dataset.max||1,prev=hpMem[who];hpMem[who]=hp;syncGuard(bar,who);
  if(prev==null||prev===hp)continue;
  if(hp<prev){const from=Math.min(1,prev/mx),to=Math.max(0,hp/mx);
   entry(750,el=>{const b=$(`.hpbar[data-who="${who}"]`);if(!b)return;
    const gh=b.querySelector('.gh');if(gh)play(gh,[{transform:`scaleX(${from})`},{transform:`scaleX(${from})`,offset:.45},{transform:`scaleX(${to})`}],750,el,0,'ease-out');
    const f=b.querySelector('i:not(.gh)');if(f)play(f,[{transform:`scaleX(${from})`,filter:'brightness(2.6)'},{transform:`scaleX(${to})`,filter:'none'}],350,el,0,'ease-out')})}
  else{const from=Math.max(0,prev/mx),to=Math.min(1,hp/mx);entry(450,el=>{const fill=$(`.hpbar[data-who="${who}"] i:not(.gh)`);if(fill)play(fill,[{transform:`scaleX(${from})`,filter:'brightness(1.7)'},{transform:`scaleX(${to})`,filter:'none'}],450,el,0,'ease-out')});const f=bar.closest('.en,.hero'),c=f&&f.querySelector('.fig')&&rectOf(f.querySelector('.fig'));if(c)emit('heal',c.x,c.y+c.h*.1,c.w*.5)}}
}
// ---------- resources: energy orb, tide gauge ----------
function syncResources(){const cb=W.cb;if(!cb)return;
 if(lastEnergy!=null&&enabled()){const orb=$('#orb');
  if(orb&&cb.turn===lastTurn&&cb.energy<lastEnergy)entry(260,el=>play($('#orb'),[{transform:'scale(1)'},{transform:'scale(.84)',offset:.3},{transform:'scale(1)'}],260,el,0,'ease-out'));
  if(orb&&cb.turn!==lastTurn&&cb.energy>0)entry(520,el=>{const o=$('#orb');play(o,[{filter:'brightness(2.2)',transform:'scale(1.22)'},{filter:'brightness(1.3)',transform:'scale(1.04)',offset:.5},{filter:'none',transform:'scale(1)'}],520,el,0,'ease-out')});
  if(orb&&cb.turn!==lastTurn&&cb.energy>0)later(60,()=>{const o=$('#orb');if(o){const c=rectOf(o);ring(c.x,c.y,COL.gold,64,420)}})}
 if(lastTide!=null&&cb.tide!==lastTide&&enabled()&&W.run.cls==='tide'){const up=cb.tide>lastTide;
  entry(480,el=>{const g=$('.gauge');if(!g)return;play(g,[{rotate:'0deg'},{rotate:`${up?-1.4:1.4}deg`,offset:.25},{rotate:`${up?.8:-.8}deg`,offset:.6},{rotate:'0deg'}],480,el,0,'ease-in-out');
   const cur=g.querySelector('i.cur');if(cur)play(cur,[{scale:'1 2.3',filter:'brightness(2)'},{scale:'1 1',filter:'none'}],380,el,0,'ease-out')})}
 lastEnergy=cb.energy;lastTide=cb.tide;lastTurn=cb.turn}
// ---------- sync: called at the end of every render() ----------
export function syncCombatAnimations(){
 const active=W.S.screen==='combat'&&W.cb;
 document.body.classList.toggle('combat-motion',!!active&&enabled());
 if(!active){phase?.remove();phase=null;clearTimeout(phaseTimer);drawTimer=0;pending=[];syncScreens();if(combat){combat=null;hpMem={};blkMem={};lastEnergy=lastTide=null}return}
 if(combat!==W.cb){combat=W.cb;pending=pending.filter(r=>r.k==='draw');entries=entries.filter(e=>e.keep);hpMem={};blkMem={};lastEnergy=lastTide=null;lastTurn=0;firstDrawn=false;enterCombat()}
 if(!enabled()){const recs=pending;pending=[];for(const e of entries)for(const {animation} of e.animations.values())animation.cancel();entries=[];document.querySelectorAll('.combat-action,.action-ghost,.echo-card').forEach(n=>n.remove());
  // reduced motion: no movement, just a short edge flash when the hero is hit
  if(fxOn())for(const r of recs)if(r.k==='herohit'){vignette(r.amount>0?'red':'blue',r.amount>0?.4:.26,300);break}
  return}
 $$('.hero .spr-slot,.en .spr-slot').forEach((el,i)=>{
  const key=el.closest('.en')?.dataset.key||W.run.cls;let hash=0;for(const c of key)hash+=c.charCodeAt(0);
  if(!el.style.getPropertyValue('--idle-period'))el.style.setProperty('--idle-phase',`-${(Date.now()+hash*17+i*719)%(3800+hash%1700)}ms`);
  el.style.setProperty('--idle-period',`${3800+hash%1700}ms`);
 });
 syncRigs();
 syncBars();syncResources();
 flush();
 const now=performance.now();entries=entries.filter(e=>now-e.t0<e.total);
 for(const e of entries)e.apply(now-e.t0);
}
let firstDrawn=false;
// combat start: heroes and foes slide in (the env layer already pans the camera)
function enterCombat(){if(!enabled())return;const hold=holdLeft();
 entry(hold+520,el=>{play($('#hero .fig'),[{translate:'-46px 0',opacity:0},{translate:'0 0',opacity:1}],380,el,hold,'ease-out');
  $$('.en .fig').forEach((f,i)=>play(f,[{translate:'60px 0',opacity:0},{translate:'0 0',opacity:1}],400,el,hold+120+i*90,'ease-out'))})}
// ---------- turn pending records into timed entries ----------
function flush(){let recs=pending;pending=[];if(!recs.length)return;
 {const by=new Map();recs=recs.filter(r=>{if(r.k!=='hit')return true;const m=by.get(r.sel);if(m){m.big=m.big||r.big;m.kill=m.kill||r.kill;m.amount+=r.amount;return false}by.set(r.sel,r);return true})}
 const hits=recs.filter(r=>r.k==='hit'),stopOf=h=>h.big?120:35;
 const stop=hits.length?Math.max(...hits.map(stopOf)):60;
 let drawI=0,heroHits=0,vig=null;
 const draws=recs.filter(r=>r.k==='draw'),baseDraw=W.cb&&W.cb.turn===1&&!firstDrawn?holdLeft()+520:holdLeft();
 for(const r of recs){
  if(r.k==='strike'){const hold=hits.length?stop:60,total=90+70+hold+160;
   entry(total,el=>play($('#hero .fig'),[
    {translate:'0 0',scale:'1 1',rotate:'0deg',offset:0},
    {translate:'-10px 0',scale:'1 1',rotate:'-3deg',offset:at(90,total),easing:'cubic-bezier(.2,.9,.3,1)'},
    {translate:'28px 0',scale:'1.06 .96',rotate:'2deg',offset:at(160,total)},
    {translate:'28px 0',scale:'1.06 .96',rotate:'2deg',offset:at(160+hold,total),easing:'ease-out'},
    {translate:'0 0',scale:'1 1',rotate:'0deg',offset:1}],total,el,0,'linear'));
   later(160,()=>freezeIdle($('#hero .fig'),hold))}
  else if(r.k==='cast'){entry(430,el=>play($('#hero .fig'),[{translate:'0 0',filter:'brightness(1)'},{translate:'0 -9px',filter:'brightness(1.3)',offset:.4},{translate:'0 0',filter:'brightness(1)'}],430,el,0,'ease-out'))}
  else if(r.k==='guard'){entry(420,el=>{play($('#hero .fig'),[{filter:'brightness(1)'},{filter:'brightness(1.5) saturate(.8)',offset:.3},{filter:'brightness(1)'}],420,el,0,'ease-out')});
   burstAt('#hero','guard',IMPACT_MS*0);ringAt('#hero',COL.pale,84,0,400)}
  else if(r.k==='hit'){if(r.kill)continue;                   // killed foes are handled by their death ghost
   const s=stopOf(r)*HIT_WEIGHT,dur=s+300,sel=r.sel,dir=1;
   entry(r.delay+dur,el=>{const f=figOf(sel);if(!f)return;
    play(f,[{filter:'brightness(3)',scale:'1.07',translate:'0 0',offset:0},
     {filter:'brightness(1.4)',scale:'1.06',translate:'0 0',offset:at(Math.min(55,s*.8),dur)},
     {filter:'brightness(1.1)',scale:'1.06',translate:'0 0',offset:at(s,dur),easing:'ease-out'},
     {filter:'none',scale:'1',translate:`${dir*(r.big?12:7)}px 0`,offset:at(s+90,dur),easing:'ease-in-out'},
     {filter:'none',scale:'1',translate:'0 0',offset:1}],dur,el,r.delay,'linear')});
   later(r.delay,()=>{freezeIdle(figOf(sel),s);const c=centre(sel);if(c)emit('hit',c.x,c.y-c.h*.1,1)});
   const a=r.boss&&r.big?8:r.big?5:2;later(r.delay,()=>shakeNow(a))}
  else if(r.k==='blocked'){burstAt(r.sel,'guard',IMPACT_MS);ringAt(r.sel,COL.pale,70,IMPACT_MS,300)}
  else if(r.k==='shake'){const a=r.amp;later(r.delay,()=>shakeNow(a))}
  else if(r.k==='herohit'){const k=heroHits++,B=r.B,delay=Math.round((B.impact||0)+k*(B.lead>0?B.hitGap:95*B.strike/370));
   if(r.amount>0){const hf=EB().hit/355,ratio=r.amount/Math.max(1,W.run.max),big=ratio>=.15,s=B.lead>0?B.hitstop:(big?90:55)*hf,dur=(s+300*hf),rec=Math.min(22,8+r.amount*.9)*(B.shake||1);
    entry(delay+dur,el=>play($('#hero .fig'),[{filter:'brightness(2.4) sepia(.6) hue-rotate(-30deg)',scale:'1.06',translate:'0 0',offset:0},{filter:'brightness(1.3)',scale:'1.05',translate:'0 0',offset:at(s,dur),easing:'ease-out'},{filter:'none',scale:'1',translate:`${-Math.round(rec)}px 0`,offset:at(s+90*hf,dur),easing:'ease-in-out'},{filter:'none',scale:'1',translate:'0 0',offset:1}],dur,el,delay));
    later(delay,()=>{freezeIdle($('#hero .fig'),s);const c=centre('#hero');if(c)emit('hit',c.x,c.y-c.h*.1,-1)});
    const a=B.lead>0?Math.max(2,Math.min(12,Math.round((2+ratio*28)*(B.shake||1)))):(big?(r.enemy&&r.enemy.boss?8:5):2);later(delay,()=>shakeNow(a));vig='red'}
   if(r.blocked>0){later(delay,()=>{const c=centre('#hero');if(c){emit('guard',c.x+10,c.y);ring(c.x,c.y,COL.pale,80,320)}});if(!vig)vig='blue'}}
  else if(r.k==='telegraph'){const sel=r.sel,B=r.B,tm=B.tele,w=B.w==='boss'?1.5:B.w==='elite'?1.25:1;
   entry(tm+B.teleHold,el=>{
    if(B.dmg||B.lead<=0)play(figOf(sel),[{scale:'1 1',translate:'0 0',filter:'none',offset:0},{scale:`${1+.03*w} ${1-.06*w}`,translate:`${Math.round(6*w)}px 0`,filter:'brightness(1.3)',offset:.35,easing:'linear'},{scale:`${1+.03*w} ${1-.06*w}`,translate:`${Math.round(9*w)}px 0`,filter:'brightness(1.4)',offset:.5},{scale:`${1+.03*w} ${1-.07*w}`,translate:`${Math.round(7*w)}px 0`,filter:'brightness(1.4)',offset:.65},{scale:`${1+.03*w} ${1-.06*w}`,translate:`${Math.round(8*w)}px 0`,filter:'brightness(1.35)',offset:1}],tm,el,0,'ease-out');
    else play(figOf(sel),[{scale:'1 1',translate:'0 0',filter:'none',offset:0},{scale:'1.04',translate:'0 -3px',filter:'brightness(1.35)',offset:1}],tm,el,0,'ease-out');
    const ic=$(sel+' .intentw');if(ic)play(ic,[{scale:'1.4',filter:'brightness(1.6)'},{scale:'1',filter:'none'}],tm*.96,el,0,'cubic-bezier(.2,1.4,.4,1)')})}
  else if(r.k==='estrike'){const sel=r.sel,dir=-1,B=r.B||EB(),m=r.m||{};
   if(B.dmg||m.a){
    const pose=ENEMY_POSES[r.e?.key]?.atk,total=B.lead>0?B.lead+B.hitstop+Math.max(0,B.hits-1)*B.hitGap+B.recover:B.strike;
    if(pose)attackPose(sel,pose,total);
    if(r.e?.key==='lenswright')later(B.lead||0,()=>{const im=sel&&$(sel+' img.spr');PFX.lensBeam(im?rectOf(im):centre(sel),centre('#hero'))});
   }
   if(!(B.lead>0)){const total=B.strike,f=total/370;   // 370 = the classic stage sum 60+50+60+200
    const st=n=>n*f;
    entry(total,el=>play(figOf(sel),[{translate:'0 0',scale:'1 1',offset:0},{translate:`${-dir*7}px 0`,scale:'1.02 .97',offset:at(st(60),total),easing:'cubic-bezier(.2,.9,.3,1)'},{translate:`${dir*30}px 0`,scale:'1.06 .96',offset:at(st(110),total)},{translate:`${dir*30}px 0`,scale:'1.06 .96',offset:at(st(170),total),easing:'ease-out'},{translate:'0 0',scale:'1 1',offset:1}],total,el,0,'linear'))}
   else{const L=B.lead,H=B.hitstop+Math.max(0,B.hits-1)*B.hitGap,total=L+H+B.recover,w=B.w==='boss'?1.5:B.w==='elite'?1.25:1;
    if(B.dmg){const d=Math.round(30*w),fr=[{translate:`${-dir*Math.round(8*w)}px 0`,scale:`${1+.03*w} ${1-.06*w}`,filter:'brightness(1.3)',offset:0,easing:'ease-out'},
      {translate:`${-dir*Math.round(15*w)}px 0`,scale:`${1+.05*w} ${1-.09*w}`,filter:'brightness(1.35)',offset:at(L*.55,total),easing:'cubic-bezier(.7,0,1,.6)'},
      {translate:`${dir*d}px 0`,scale:`${1+.06*w} ${1-.05*w}`,filter:'brightness(1.5)',offset:at(L,total),easing:'linear'}];
     for(let i=1;i<B.hits;i++){fr.push({translate:`${dir*Math.round(d*.55)}px 0`,scale:'1.03 .98',filter:'brightness(1.2)',offset:at(L+i*B.hitGap-B.hitGap*.45,total),easing:'cubic-bezier(.7,0,1,.6)'});fr.push({translate:`${dir*d}px 0`,scale:`${1+.06*w} ${1-.05*w}`,filter:'brightness(1.5)',offset:at(L+i*B.hitGap,total),easing:'linear'})}
     fr.push({translate:`${dir*d}px 0`,scale:`${1+.06*w} ${1-.05*w}`,filter:'brightness(1.4)',offset:at(L+H,total),easing:'ease-out'},{translate:'0 0',scale:'1 1',filter:'none',offset:1});
     entry(total,el=>play(figOf(sel),fr,total,el,0,'linear'))}
    else{entry(total,el=>play(figOf(sel),[{translate:'0 0',scale:'1 1',filter:'brightness(1.2)',offset:0,easing:'ease-out'},{translate:'0 -6px',scale:'1.07',filter:'brightness(1.8)',offset:at(L,total)},{translate:'0 -6px',scale:'1.07',filter:'brightness(1.6)',offset:at(L+50,total),easing:'ease-in-out'},{translate:'0 0',scale:'1 1',filter:'none',offset:1}],total,el,0,'linear'));
     const col=m.heal||m.healAlly?COL.heal:m.b||m.allyB?COL.pale:m.s||m.allyS?COL.ember:m.summon?COL.kelp:m.steal||m.stealPotion?COL.gold:COL.echo;
     ringAt(sel,col,96,L,380);burstAt(sel,'burst',L,col,8)}}}
  else if(r.k==='status'){statusFx(r)}
  else if(r.k==='draw'){const i=drawI++;const cb=W.cb;later(baseDraw+i*62,()=>{if(W.cb===cb&&!document.hidden)playSound('draw',.96+Math.random()*.08)});
   entry(baseDraw+draws.length*60+360,el=>{const card=$(`.hand .card[data-uid="${r.uid}"]`),pile=$('#drawpile');if(!card||!pile)return;
    const a=rectOf(pile),b=rectOf(card),dx=a.x-b.x,dy=a.y-b.y;
    play(card,[{translate:`${dx}px ${dy}px`,scale:'.35',rotate:'-14deg',opacity:0},{translate:`${dx*.35}px ${dy*.35-22}px`,scale:'.8',rotate:'-5deg',opacity:1,offset:.55},{translate:'0 0',scale:'1',rotate:'0deg',opacity:1}],300,el,baseDraw+i*62,'cubic-bezier(.3,.7,.4,1)')})}
 }
 if(draws.length)firstDrawn=true;
 if(vig)vignette(vig,vig==='red'?.5:.32,vig==='red'?420:320);
}
// Status-specific effects (R13), each under 400 ms.
function statusFx(r){const sel=r.sel;if(!sel)return;const k=r.key;
 const fig=(frames,dur)=>entry(dur,el=>play(figOf(sel),frames,dur,el,0,'ease-out'));
 if(k==='vuln'){fig([{filter:'brightness(1)'},{filter:'brightness(2.4) contrast(1.4)',offset:.12},{filter:'brightness(1.2)',offset:.3},{filter:'brightness(1.9) contrast(1.3)',offset:.42},{filter:'none'}],380);burstAt(sel,'hit',0,1);ringAt(sel,'#e8dcc4',60,0,260)}
 else if(k==='weak'||k==='brittle'){if(r.bad)fig([{translate:'0 0',filter:'saturate(1)'},{translate:'0 5px',filter:'saturate(.2) brightness(.85)',offset:.4},{translate:'0 0',filter:'saturate(1)'}],380);else fig([{filter:'brightness(1)'},{filter:'brightness(1.4)',offset:.4},{filter:'none'}],300);
  burstAt(sel,'ripple',0)}
 else if(k==='bleed'){fig([{filter:'none'},{filter:'sepia(.8) saturate(3) hue-rotate(-40deg)',offset:.3},{filter:'none'}],300);for(let i=0;i<3;i++)burstAt(sel,'drip',i*110)}
 else if(k==='soaked'||k==='sink'||k==='drench'){burstAt(sel,'ripple',0);ringAt(sel,COL.teal,70,0,380);ringAt(sel,COL.teal,46,120,320)}
 else if(k==='str'){fig([{filter:'brightness(1) sepia(0)'},{filter:'brightness(1.6) sepia(.8) saturate(2.4)',offset:.35},{filter:'none'}],380);ringAt(sel,'#e0894a',80,0,380);burstAt(sel,'burst',0,'#e0894a',8)}
 else if(!r.bad&&r.n>0){burstAt(sel,'heal',0,40)}
}
// ---------- screens other than combat: reveals, reward flights, chest, map travel ----------
let revealed=null,revealKey='',holdUntil=0;
const holdReal=()=>Math.max(0,holdUntil-performance.now());
export const holdLeft=()=>holdReal()/T(1); // in design ms, ready for entry()/play()/later()
export function holdFor(ms){holdUntil=performance.now()+ms}
function reveal(sel,from,dur,gap,delay,tilt){const els=$$(sel);els.forEach((el,i)=>{if(!el.animate)return;const rot=tilt?(i%2?1:-1)*(3+i):0;
 el.animate([{translate:`${from[0]}px ${from[1]}px`,scale:from[2]||'.92',rotate:`${rot}deg`,opacity:0},{translate:'0 0',scale:'1',rotate:'0deg',opacity:1}],{duration:U(dur),delay:U(delay+i*gap),easing:'cubic-bezier(.2,.9,.3,1.1)',fill:'backwards'})})}
// Card rewards: cards start face-down, flip in one by one; rares get a light burst and a sparkle.
function flipReveal(delay){const ws=$$('.rewgrid .rcw');ws.forEach((w,i)=>{const card=w.querySelector('.card'),back=w.querySelector('.cardback');if(!card||!back||!card.animate)return;
 const t0=delay+i*190,half=170,rare=card.classList.contains('r-r');
 back.animate([{opacity:1,transform:'rotateY(0deg)'},{opacity:1,transform:'rotateY(90deg)'}],{duration:U(half),delay:U(t0),easing:'ease-in',fill:'both'}).finished.then(()=>back.remove(),()=>back.remove());
 card.animate([{transform:'rotateY(-90deg)'},{transform:'rotateY(0deg)'}],{duration:U(half+60),delay:U(t0+half),easing:'ease-out',fill:'backwards'});
 laterU(t0,()=>playSound('flip'));
 if(rare)laterU(t0+half+80,()=>{const r=rectOf(card);playSound('sparkle');emit('burst',r.x,r.y,COL.gold,26);ring(r.x,r.y,COL.gold,170,560);
  card.classList.add('foiling');card.style.setProperty('--fx','0%');card.animate([{filter:'brightness(2.2)'},{filter:'brightness(1)'}],{duration:U(520),easing:'ease-out'});
  const beam=document.createElement('div');beam.className='rarebeam';beam.style.left=r.x+'px';beam.style.top=r.y+'px';document.body.appendChild(beam);
  beam.animate([{opacity:.95,transform:'scale(.3)'},{opacity:0,transform:'scale(2.6)'}],{duration:U(620),easing:'ease-out'}).finished.then(()=>beam.remove(),()=>beam.remove());
  setTimeout(()=>card.classList.remove('foiling'),U(900))})})}
// B061 reward tiles: each one flies from the fallen foes to its usual spot, one after another (design ms, see ANIMATION-TIMINGS.md)
const TILE_FLY={ms:760,gap:640,lift:20};
function flyInTiles(hold){const tiles=$$('.rewtiles .tile');if(!tiles.length)return;
 const rem=$$('.victory-wrap .remains').map(rectOf),ox=rem.length?rem.reduce((a,r)=>a+r.x,0)/rem.length:innerWidth*.72,oy=rem.length?rem.reduce((a,r)=>a+r.y,0)/rem.length:innerHeight*.55;
 const ban=$('.reward-banner');ban&&ban.animate&&ban.animate([{opacity:0,translate:'0 10px'},{opacity:1,translate:'0 0'}],{duration:U(520),delay:U(hold),easing:'ease-out',fill:'backwards'});
 const sub=$('#pksub');sub&&sub.animate&&sub.animate([{opacity:0},{opacity:1}],{duration:U(500),delay:U(hold+TILE_FLY.gap),easing:'ease-out',fill:'backwards'});
 tiles.forEach((el,i)=>{if(!el.animate)return;const r=rectOf(el),dx=ox-r.x,dy=oy-r.y,t0=hold+260+i*TILE_FLY.gap;
  el.animate([{translate:`${dx}px ${dy}px`,scale:'.25',rotate:`${i%2?9:-9}deg`,opacity:0},{translate:`${dx*.35}px ${dy*.35-TILE_FLY.lift*3}px`,scale:'.7',rotate:`${i%2?-4:4}deg`,opacity:1,offset:.45},
   {translate:`0 -${TILE_FLY.lift}px`,scale:'1.07',rotate:'0deg',opacity:1,offset:.82},{translate:'0 0',scale:'1',rotate:'0deg',opacity:1}],{duration:U(TILE_FLY.ms),delay:U(t0),easing:'cubic-bezier(.3,.7,.35,1)',fill:'backwards'});
  laterU(t0+TILE_FLY.ms*.8,()=>{playSound('flip');ring(r.x,r.y,COL.gold,r.w?Math.min(r.w,160):90,380)})})}
// Proceed: the hero turns toward the path and walks off to the right in a step-and-bob, the tiles and prompt fade; then the map (design ms)
export const HERO_WALK={turn:260,walk:2300,steps:7,bob:7};
let walking=false;
function heroWalkOff(done){const hero=$('.victory-wrap .hero');if(!hero||!hero.animate||walking)return false;walking=true;const S0=W.S;$$('#app .rewtiles,#app .pk-foot,#app #proceed').forEach(el=>{el.style.pointerEvents='none'});
 const r=hero.getBoundingClientRect(),fig=hero.querySelector('.fig'),dist=innerWidth-r.left+40,W0=U(HERO_WALK.turn),W1=U(HERO_WALK.walk),tot=W0+W1;
 $$('.rewtiles .tile,#pksub,.reward-banner,.bossvic,.pk-foot').forEach(el=>el.animate&&el.animate([{opacity:1},{opacity:0}],{duration:U(420),easing:'ease-in',fill:'forwards'}));
 hero.querySelector('.plate')?.animate([{opacity:1},{opacity:0}],{duration:U(300),fill:'forwards'});
 const k=W0/tot;
 hero.animate([{translate:'0 0',scale:'1',offset:0},{translate:'0 0',scale:'.8 1',offset:k*.5},{translate:'0 0',scale:'1',offset:k},{translate:`${dist}px 0`,scale:'1',offset:1}],{duration:tot,easing:'linear',fill:'forwards'}).finished.then(()=>{walking=false;if(W.S===S0&&W.S.screen==='reward')done()},()=>{walking=false}); // victory-sweep: a cancelled walk (double Proceed, tap on a reward tile, re-render) must NOT call done() again: it re-ran rewDone (boss end -> map)
 // the walk's x-motion eases in on its own layer (the bob is on .fig so the two never fight over one property)
 if(fig&&fig.animate){const b=[{translate:'0 0',rotate:'0deg',offset:0},{translate:'0 0',rotate:'0deg',offset:k}];
  for(let i=0;i<HERO_WALK.steps*2;i++)b.push({translate:`0 ${i%2?0:-HERO_WALK.bob}px`,rotate:`${i%2?0:(i%4?-1.6:1.6)}deg`,offset:k+(1-k)*(i+1)/(HERO_WALK.steps*2),easing:'ease-in-out'});
  fig.animate(b,{duration:tot,fill:'forwards'})}
 return true}
function syncScreens(){if(!motionOn())return;const S=W.S,s=S.screen;
 const key=(s==='reward'?'r'+(S.cardsOpen!=null?'c'+S.cardsOpen:S.swap!=null?'s':'rows'):s==='chest'?'x'+(S.opened?'o':'c'):(s==='title'&&S.view==='lamp'&&S.got)?'lamp':'');
 if(!key||(revealed===S&&revealKey===key))return;revealed=S;revealKey=key;const hold=holdReal();
 if(key==='rrows'&&S.scene){if(!S.flown){S.flown=true;flyInTiles(hold)}return} // B061: victory view, tiles fly in one at a time (only the first time; coming back from the card pick shows them at rest)
 if(key==='rrows')reveal('.reward-banner',[0,-8,'.82'],420,0,hold);
 if(key==='rrows'||key==='xo'){reveal('.rewtiles .tile',[0,26,'.9'],340,95,hold+40);
  if(key==='xo'){const c=$('.chestwrap');if(c){const r=rectOf(c);laterU(hold+10,()=>{emit('burst',r.x,r.y,COL.gold,22);ring(r.x,r.y,COL.gold,140,520);vignette('gold',.4,520)});
   c.animate([{filter:'brightness(3)',scale:'1.12'},{filter:'brightness(1.4)',scale:'1.04',offset:.4},{filter:'none',scale:'1'}],{duration:U(520),delay:U(hold),easing:'ease-out',fill:'backwards'})}}}
 else if(key.startsWith('rc'))flipReveal(hold+30);
 else if(key==='lamp'){const els=$$('.lp-offer.got .tile,.lp-offer.got .lp-pick');els.forEach(el=>{const r=rectOf(el);laterU(120,()=>{emit('burst',r.x,r.y,COL.gold,22);ring(r.x,r.y,COL.gold,120,520)})});vignette('gold',.35,520)}
}
// capture-phase click hooks: flights start before the click's own handler re-renders the screen
addEventListener('click',ev=>{if(!motionOn())return;const t=ev.target;if(!t.closest)return;
 const card=t.closest('#confirmcard')&&W.S.cardSelected!=null&&!W.S.skipConfirm?$('.rewgrid .reward-selected .card'):null;
 if(card){const deck=$('#deckbtn');if(deck){const all=$$('.rewgrid .card').filter(c=>c!==card);const b=rectOf(deck),rects=new Map([card,...all].map(c=>[c,c.getBoundingClientRect()]));const {g,r}=cloneCard(card,rects.get(card));
   all.forEach(c=>{const o=cloneCard(c,rects.get(c));o.g.animate([{opacity:1},{opacity:0,transform:'translateY(18px) scale(.9)'}],{duration:U(260),easing:'ease-in'}).finished.then(()=>o.g.remove(),()=>o.g.remove())});
   const dx=b.x-(r.left+r.width/2),dy=b.y-(r.top+r.height/2);let raf=0;
   const trail=()=>{if(!g.isConnected)return;const q=g.getBoundingClientRect();emit('trail',q.left+q.width/2,q.top+q.height/2,COL.gold);raf=requestAnimationFrame(trail)};raf=requestAnimationFrame(trail);
   const end=()=>{cancelAnimationFrame(raf);g.remove();ring(b.x,b.y,COL.gold,54,360);emit('burst',b.x,b.y,COL.gold,10);deck.animate([{transform:'scale(1)'},{transform:'scale(1.3)',offset:.4},{transform:'scale(1)'}],{duration:U(320)})};
   g.animate([{transform:'none',opacity:1},{transform:`translate(${dx*.3}px,${dy*.3-30}px) scale(.8) rotate(-6deg)`,opacity:1,offset:.4},{transform:`translate(${dx}px,${dy}px) scale(.18)`,opacity:.6}],{duration:U(520),easing:'cubic-bezier(.4,0,.5,1)'}).finished.then(end,end)}return}
 const go=t.closest('#proceed,#leaveyes');
 if(go&&W.S.screen==='reward'&&W.S.scene&&W.S.cardsOpen==null&&W.S.swap==null&&/rewDone/.test(go.getAttribute('onclick')||'')&&!walking){
  const ov=$('#app .ov');if(ov)ov.style.display='none';
  if(heroWalkOff(()=>window.rewDone())){ev.stopImmediatePropagation();ev.preventDefault();return}}
 const tile=t.closest('.rewtiles .tile:not(.done)');
 if(tile&&tile.closest('.pk-rewards.vic')&&!tile.classList.contains('k-cards'))rewardGhost(tile);
 if(tile){const k=tile.classList.contains('k-gold')?'gold':tile.classList.contains('k-potion')?'potion':tile.classList.contains('k-relic')?'relic':'';
  const art=tile.querySelector('.tart')||tile;
  if(k==='gold'){const dst=$('.topbar .stat.gold');if(dst){const from=W.run.gold;const html=tile.querySelector('.tart').innerHTML;flyIcon(art,dst,{html,col:COL.gold});
    setTimeout(()=>countUp('.topbar .stat.gold',from,W.run.gold),U(520))}}
  else if(k==='potion'||k==='relic'){const dst=$(k==='potion'?'#potions':'#relicbar');if(dst)flyIcon(art,dst,{html:art.innerHTML,col:COL.pale})}}
 const chest=t.closest('#openchest');
 if(chest&&!chest.dataset.shaking){chest.dataset.shaking=1;ev.stopImmediatePropagation();ev.preventDefault();
  chest.animate([{translate:'0 0'},{translate:'-5px 0',rotate:'-3deg',offset:.15},{translate:'5px 0',rotate:'3deg',offset:.3},{translate:'-4px 0',rotate:'-2deg',offset:.45},{translate:'4px 0',rotate:'2deg',offset:.6},{translate:'0 0',rotate:'0deg'}],{duration:U(340)});
  setTimeout(()=>{if(window.openChestLid)window.openChestLid()},U(340))}
 // map travel: the painted map lantern glides to the chosen node along the path; the room opens on arrival (ui/lantern.js). Input is locked meanwhile.
 const mnode=t.closest('.node');
 if(mnode&&W.S.screen==='map'&&!W.S.ov){if(lanternBusy()){ev.stopImmediatePropagation();ev.preventDefault()}
  else if(mnode.classList.contains('av')){const r=+mnode.dataset.r,i=+mnode.dataset.i;if(glideTo(mnode,()=>{if(W.S.screen==='map'&&!W.S.ov&&window.goNode)window.goNode(r,i)})){ev.stopImmediatePropagation();ev.preventDefault()}}}
},true);
// A collected reward's frame lifts away (its art flies to the HUD separately); the live slot is hidden by CSS so the other tiles stay put
function rewardGhost(tile){const r=tile.getBoundingClientRect(),g=tile.cloneNode(true);g.removeAttribute('onclick');g.removeAttribute('id');g.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));g.querySelectorAll('[onclick]').forEach(n=>n.removeAttribute('onclick'));
 g.classList.add('reward-ghost');g.setAttribute('aria-hidden','true');Object.assign(g.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
 const art=g.querySelector('.tart');if(art)art.style.visibility='hidden';document.body.appendChild(g);
 const rm=()=>g.remove();if(!g.animate)return rm();setTimeout(rm,U(460)+150); // never left behind (sweep E-08: a faded potion tile under PLAY AGAIN)
 g.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-26px) scale(.86)'}],{duration:U(460),easing:'ease-in'}).finished.then(rm,rm)}
function countUp(sel,from,to){if(from===to)return;const t0=performance.now(),dur=U(420);const tick=()=>{const el=$(sel);if(!el)return;const k=Math.min(1,(performance.now()-t0)/dur);const v=Math.round(from+(to-from)*k);
 const tn=[...el.childNodes].reverse().find(n=>n.nodeType===3);if(tn)tn.textContent=' '+v;if(k<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)}
// ---------- screen change: old screen lingers and fades (called by render()) ----------
const quiet=new Set(['title']);
export function screenChange(app,prev,next){if(prev!==next)document.querySelectorAll('.reward-ghost').forEach(g=>g.remove());if(!prev||prev===next||quiet.has(prev)||quiet.has(next))return;
 if(next==='combat')finaleCleanup();const hero=W.run&&W.run.hp<=0&&prev==='combat';const hold=Math.max(prev==='combat'?deathHold():0,holdReal(),hero?U(700):0);
 if(hold)holdUntil=Math.max(holdUntil,performance.now()+hold);
 crossfade(app,{hold,ms:prev==='combat'?T(340):U(260),gray:hero});
 // screen-flicker: the battle-won finale layers (lantern hero ghost, glow, dim, banner) live on <body>, outside #app, so the snapshot never had them. Leaving the
 // victory scene for the map while they were alive dropped the dim on the snapshot's first frame (a brightness pop), then left the battle hero standing on the
 // map for ~0.5 s until the finale timer removed it. Hand them to the snapshot so they fade out with the old screen, then end the finale.
 if(next!=='reward'&&finaleEls.length){const x=xfadeEl();if(x){const env=x.lastElementChild;for(const el of finaleEls)if(el.isConnected)x.insertBefore(el,env&&env.style.zIndex==='-1'?env:null);finaleEls=[]}finaleCleanup()}}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncCombatAnimations);
