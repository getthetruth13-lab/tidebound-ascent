// Presentation-only combat observer. render() replaces the DOM on every change, so every animation here is either
//  (a) a body-level persistent element (ghosts, card clones, FX layer, see vfx.js), or
//  (b) a timed ENTRY: {t0,total,apply(elapsed)} that syncCombatAnimations() re-applies to the new DOM with the elapsed time,
//      so an animation resumes instead of restarting or vanishing when something re-renders mid-flight.
import {W} from '../core/state.js';
import {CARDS} from '../core/registry.js';
import {observeEvents} from '../core/bus.js';
import {playSound} from '../audio.js';
import {alive} from '../engine/combat.js';
import {cardHTML} from './render.js';
import {cloneCard,IMPACT_MS} from './fx.js';
import {fxOn,motionOn,reducedMotion,fxQueue,emit,ring,vignette,shakeFrames,slowmo,freezeIdle,rectOf,setImpact,impactBase,crossfade,flyIcon,COL,CLASS_COL} from './vfx.js';
const enabled=()=>motionOn();
export const motionEnabled=enabled;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let pending=[],combat=null,entries=[];
const enemy=e=>e&&W.cb?`.en[data-en="${W.cb.ens.indexOf(e)}"]`:null;
const figOf=sel=>sel&&$(sel+' .fig');
const centre=sel=>{const el=sel&&($(sel+' .fig')||$(sel));return el?rectOf(el):null};
// ---------- entries ----------
let activeEntry=null;
function entry(total,apply){const e={t0:performance.now(),total,animations:new Map(),slot:0};
 e.apply=elapsed=>{const previous=activeEntry;activeEntry=e;e.slot=0;try{apply(elapsed)}finally{activeEntry=previous}};
 entries.push(e);return e}
// element.animate with a delay and an elapsed offset (resume); frames use individual transform properties (translate/scale/rotate) so they stack
function play(el,frames,dur,elapsed,delay=0,easing='linear'){const slot=activeEntry?activeEntry.slot++:0;
 if(!el||!el.animate||elapsed>=delay+dur)return;
 // A retained element already runs this entry at its original timeline position.
 const previous=activeEntry?.animations.get(slot);if(previous?.el===el)return previous.animation;
 previous?.animation.cancel();const animation=el.animate(frames,{duration:dur,delay:delay-elapsed,easing,fill:'backwards'});
 if(activeEntry)activeEntry.animations.set(slot,{el,animation});return animation}
const at=(ms,total)=>+(ms/total).toFixed(4);
// ---------- one-shot visuals at a fixed time ----------
const later=(ms,fn)=>ms>0?fxQueue.push(ms,fn):fn();
function burstAt(sel,kind,ms=0,...args){later(ms,()=>{const c=centre(sel);if(c)emit(kind,c.x,c.y,...args)})}
function ringAt(sel,col,size,ms=0,ms2=360){later(ms,()=>{const c=centre(sel);if(c)ring(c.x,c.y,col,size,ms2)})}
// ---------- ghosts (persistent copies of a figure) ----------
function ghost(selector,kind,opts={}){const source=selector&&$(selector);if(!source)return null;
 const fig=source.querySelector('.fig'),r=(fig||source).getBoundingClientRect();
 const el=document.createElement('div');el.className=`action-ghost ${kind}`;el.setAttribute('aria-hidden','true');
 Object.assign(el.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
 if(fig){el.appendChild(fig.cloneNode(true));el.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));el.querySelectorAll('.fig').forEach(n=>{n.className='fig';n.style.animation='none'})}
 document.body.appendChild(el);const ms=opts.life||580;el.addEventListener('animationend',e=>{if(e.target===el&&!opts.keep)el.remove()});setTimeout(()=>el.remove(),ms);
 return {el,r}}
function effect(selector,kind,col){const source=selector&&$(selector);if(!source)return;
 const r=source.getBoundingClientRect(),el=document.createElement('i');el.className=`combat-action ${kind}`;el.setAttribute('aria-hidden','true');
 Object.assign(el.style,{left:r.left+r.width/2+'px',top:r.top+r.height*.5+'px'});if(col)el.style.setProperty('--action-color',col);
 document.body.appendChild(el);setTimeout(()=>el.remove(),580);
}
// ---------- death (R10): flash, hit-stop, bottom-up dissolve + ash. Elites/bosses take longer. ----------
let finalKillAt=0,finalKillBig=false;
function death(e,lead){const sel=enemy(e);const el=sel&&$(sel);if(!el)return;
 const big=e.boss||e.elite,hold=big?120:60,sink=big?800:430,total=lead+hold+sink;
 const g=ghost(sel,'death-sink',{life:total+120,keep:true});if(!g)return;
 el.classList.add('gone');
 const last=alive().length===0;if(last){finalKillAt=performance.now();finalKillBig=big}
 const fig=g.el.firstChild||g.el;
 const T=lead+hold+sink,o=ms=>at(ms,T),L=lead;
 const frames=[{filter:'none',transform:'none',clipPath:'inset(0 0 0% 0)',opacity:1,offset:0},
  {filter:'none',transform:'none',clipPath:'inset(0 0 0% 0)',opacity:1,offset:o(L)},
  {filter:'brightness(3)',transform:'scale(1.07)',clipPath:'inset(0 0 0% 0)',opacity:1,offset:o(L)+.0001},
  {filter:'brightness(1.5)',transform:'scale(1.06)',clipPath:'inset(0 0 0% 0)',opacity:1,offset:o(L+Math.min(55,hold*.8))},
  {filter:'brightness(1.2)',transform:'scale(1.06)',clipPath:'inset(0 0 0% 0)',opacity:1,offset:o(L+hold),easing:'ease-in'},
  {filter:'brightness(.8)',transform:`translateY(${big?26:20}px) scale(.96,.9)`,clipPath:big?'inset(0 0 100% 0)':'inset(0 0 45% 0)',opacity:big?.9:0,offset:1}];
 g.el.animate(frames,{duration:T,fill:'forwards'}).finished.then(()=>g.el.remove(),()=>g.el.remove());
 const {x,y,w,h}={x:g.r.left+g.r.width/2,y:g.r.top+g.r.height,w:g.r.width*.7,h:g.r.height*.8};
 const steps=big?5:2;for(let i=0;i<steps;i++)fxQueue.push(lead+hold+i*(sink/steps)*.8,()=>emit('death',x,y-(i/steps)*h*.4,w,h*(1-i/steps)*.6,big?9:7));
 if(last)fxQueue.push(lead+hold,()=>slowmo(400,.5));
}
export const deathHold=()=>performance.now()-finalKillAt<250?(finalKillBig?950:560):0;
// ---------- observer ----------
function queue(rec){pending.push(rec)}
observeEvents((event,c)=>{if(!W.cb||W.S.screen!=='combat')return;
 if(!fxOn())return;
 const cls=W.run.cls,target=enemy(c.target||c.enemy),hero='#hero',move=enabled();
 if(event==='beforeCardPlay'){
  const d=CARDS[c.card.id];setImpact(d.t==='A'?IMPACT_MS:0);
  if(move)queue({k:d.t==='A'?'strike':'cast'});
  effect(d.t==='A'?enemy(c.f.tgt)||hero:hero,{tide:'wave',echo:'rings',carto:'quill',duel:d.t==='A'?'slash':'spark'}[cls]);
 }
 if(event==='cardPlayed')setImpact(0);
 if(event==='crest'||event==='undertow'){effect(hero,event);playSound(event==='crest'?'heavy':'guard');
  if(event==='crest'){shakeNow(5);vignette('blue',.35,420)}}
 if(event==='echo'){
  effect(hero,'rings');ghost(hero,'echo-replay');playSound('play');
  // Recreate the actual echoed card, including its art, without interactive attributes.
  const holder=document.createElement('div');holder.innerHTML=cardHTML(c.card);const card=holder.firstElementChild;
  if(card){const g=card.cloneNode(true);g.querySelectorAll('*').forEach(n=>{for(const a of [...n.attributes])if(a.name.startsWith('on'))n.removeAttribute(a.name)});for(const a of [...g.attributes])if(a.name.startsWith('on')||a.name.startsWith('data-'))g.removeAttribute(a.name);
   g.className+=' echo-card';g.setAttribute('aria-hidden','true');document.body.appendChild(g);setTimeout(()=>g.remove(),550)}
 }
 if(event==='flourish'){effect(enemy(c.f.tgt)||hero,'flourish');playSound('heavy')}
 if(event==='parry'){effect(hero,'spark');playSound('guard');burstAt(hero,'guard',0)}
 if(event==='waypointPlaced'||event==='waypointTrigger'||event==='advance'){
  effect(hero,event==='advance'&&(c.wp.rank||0)>=3?'landmark':'waypoint');
  if(event==='advance')playSound('guard');
 }
 if(event==='guardGained'){effect(hero,'guard','var(--status-block,#5fa3ea)');if(move)queue({k:'guard'})}
 if(event==='statusApplied'){const bad=['weak','vuln','brittle','soaked','bleed','sink','drench','reson'].includes(c.key)?c.n>0:c.n<0;
  const sel=c.player?hero:enemy(c.target);
  effect(sel,'pulse',bad?'var(--status-debuff,#e48a3c)':'var(--status-buff,#5cc98a)');queue({k:'status',sel,key:c.key,bad,n:c.n})}
 if(event==='damageDealt'&&c.amount>0){
  const t=c.target,dealt=c.hpLoss||0,big=t&&(t.hp<=0||dealt>=t.max*.25);
  queue({k:'hit',sel:target,amount:dealt,big:!!big,boss:!!(t&&t.boss),kill:!!(t&&t.hp<=0),delay:IMPACT_MS,e:t});
  if(!c.hpLoss&&c.amount)queue({k:'blocked',sel:target})}
 if(event==='playerHit'){queue({k:'herohit',amount:c.amount,blocked:c.blocked,enemy:c.enemy})}
 if(event==='enemyTelegraph'){setImpact(0);queue({k:'telegraph',sel:enemy(c.enemy)})}
 if(event==='enemyAct'){setImpact(110);queue({k:'estrike',sel:enemy(c.enemy)})}
 if(event==='playerAttacked')setImpact(0);
 if(event==='enemyKilled'){const e=c.enemy;if(move){death(e,impactBase());queue({k:'shake',amp:(e.boss||e.elite)?7:3,delay:impactBase()})}}
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
  el.animate([{transform:'translate(-50%,-50%) scale(.9) rotate(0deg)',opacity:0},{transform:`translate(calc(-50% + ${dx*.5}px),calc(-50% + ${dy*.5+lift}px)) scale(1) rotate(${i%2?14:-14}deg)`,opacity:1,offset:.5},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.9) rotate(0deg)`,opacity:0}],{duration:360,delay:i*45,easing:'ease-in-out',fill:'backwards'}).finished.then(()=>el.remove(),()=>el.remove())}
 b.animate([{transform:'scale(1)'},{transform:'scale(1.14)',offset:.7},{transform:'scale(1)'}],{duration:260,delay:330})}
function discardHand(){if(!enabled()||!W.cb)return;const pile=$('#discpile');if(!pile)return;const dest=rectOf(pile);
 const cards=$$('.hand .card').filter(el=>W.cb.hand.some(ci=>ci.uid==el.dataset.uid));const rects=new Map(cards.map(el=>[el,el.getBoundingClientRect()]));let n=0;
 for(const el of cards){const ci=W.cb.hand.find(c=>c.uid==el.dataset.uid),d=CARDS[ci.id];if(d.moor||ci.moor)continue;
  const {g,r}=cloneCard(el,rects.get(el));const i=n++,delay=i*40;
  if(d.fleet){emit('death',r.left+r.width/2,r.top+r.height/2,r.width*.7,r.height*.6,8);
   g.animate([{opacity:1,filter:'none',transform:'none'},{opacity:.9,filter:'brightness(1.8) grayscale(.5)',transform:'scale(1.04)',offset:.35},{opacity:0,filter:'brightness(.7) grayscale(1)',transform:'translateY(-14px) scale(.9)'}],{duration:320,delay,easing:'ease-out',fill:'backwards'}).finished.then(()=>g.remove(),()=>g.remove());continue}
  const tx=dest.x-(r.left+r.width/2),ty=dest.y-(r.top+r.height/2);
  g.animate([{transform:'none',opacity:1},{transform:`translate(${tx*.7}px,${ty*.7}px) scale(.55) rotate(-10deg)`,opacity:.8,offset:.7},{transform:`translate(${tx}px,${ty}px) scale(.25) rotate(-16deg)`,opacity:0}],{duration:250,delay,easing:'cubic-bezier(.5,0,.8,.5)',fill:'backwards'}).finished.then(()=>{g.remove()},()=>g.remove())}
 if(n)dest.pulse=pile.animate([{transform:'scale(1)'},{transform:'scale(1.16)',offset:.8},{transform:'scale(1)'}],{duration:260,delay:n*40+120})}
// ---------- screen shake on #scene (transform only; reduced motion gets the vignette instead) ----------
function shakeNow(amp){if(!enabled())return;entry(300,el=>play($('.scene'),shakeFrames(amp),300,el,0,'linear')).apply(0)}
// ---------- hp bars: delayed ghost chunk, flash on loss, heal motes ----------
let hpMem={},blkMem={},lastEnergy=null,lastTide=null,lastTurn=0;
function syncGuard(bar,who){const b=+bar.dataset.blk||0,prev=blkMem[who];blkMem[who]=b;if(prev==null||prev===b)return;
 if(b>prev){const sh=bar.querySelector('.hpblk');if(sh)entry(450,el=>{const n=$(`.hpbar[data-who="${who}"] .hpblk`);if(n)play(n,[{transform:'scale(.4)',filter:'brightness(2.4)'},{transform:'scale(1.25)',offset:.6},{transform:'scale(1)',filter:'none'}],450,el,0,'cubic-bezier(.2,1.4,.4,1)')})}
 else if(prev>0&&b===0)entry(520,el=>{const bb=$(`.hpbar[data-who="${who}"]`);if(!bb)return;
  let g=bb.querySelector('.guardbreak');if(!g){g=document.createElement('span');g.className='guardbreak';g.innerHTML=document.querySelector('.hpblk .sti')?.outerHTML||'<svg class="sti" viewBox="0 0 24 28"><path d="M12 1.5L2.5 5v8c0 6.5 4 11 9.5 13.5C17.5 24 21.5 19.5 21.5 13V5z" fill="currentColor"/></svg>';bb.appendChild(g)}
  const a=play(g,[{transform:'scale(1) rotate(0)',opacity:1,filter:'brightness(2)'},{transform:'scale(1.3) rotate(-8deg)',opacity:.9,offset:.3},{transform:'translate(-6px,18px) scale(.6) rotate(-30deg)',opacity:0}],520,el,0,'ease-in');if(a)a.onfinish=()=>g.remove();else g.remove()})}
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
 if(!active){pending=[];syncScreens();if(combat){combat=null;hpMem={};blkMem={};lastEnergy=lastTide=null}return}
 if(combat!==W.cb){combat=W.cb;pending=[];entries=entries.filter(e=>e.keep);hpMem={};blkMem={};lastEnergy=lastTide=null;lastTurn=0;firstDrawn=false;enterCombat()}
 if(!enabled()){const recs=pending;pending=[];for(const e of entries)for(const {animation} of e.animations.values())animation.cancel();entries=[];document.querySelectorAll('.combat-action,.action-ghost,.echo-card').forEach(n=>n.remove());
  // reduced motion: no movement, just a short edge flash when the hero is hit
  if(fxOn())for(const r of recs)if(r.k==='herohit'){vignette(r.amount>0?'red':'blue',r.amount>0?.4:.26,300);break}
  return}
 $$('.hero .spr-slot,.en .spr-slot').forEach((el,i)=>{
  const key=el.closest('.en')?.dataset.key||W.run.cls;let hash=0;for(const c of key)hash+=c.charCodeAt(0);
  if(!el.style.getPropertyValue('--idle-period'))el.style.setProperty('--idle-phase',`-${(Date.now()+hash*17+i*719)%(3800+hash%1700)}ms`);
  el.style.setProperty('--idle-period',`${3800+hash%1700}ms`);
 });
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
 const hits=recs.filter(r=>r.k==='hit'),stopOf=h=>h.big?125:60;
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
   const s=stopOf(r),dur=s+300,sel=r.sel,dir=1;
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
  else if(r.k==='herohit'){const k=heroHits++,delay=110+k*95;
   if(r.amount>0){const s=r.amount>=W.run.max*.15?90:55,dur=s+300;
    entry(delay+dur,el=>play($('#hero .fig'),[{filter:'brightness(2.4) sepia(.6) hue-rotate(-30deg)',scale:'1.06',translate:'0 0',offset:0},{filter:'brightness(1.3)',scale:'1.05',translate:'0 0',offset:at(s,dur),easing:'ease-out'},{filter:'none',scale:'1',translate:'-10px 0',offset:at(s+90,dur),easing:'ease-in-out'},{filter:'none',scale:'1',translate:'0 0',offset:1}],dur,el,delay));
    later(delay,()=>{freezeIdle($('#hero .fig'),s);const c=centre('#hero');if(c)emit('hit',c.x,c.y-c.h*.1,-1)});
    const a=r.amount>=W.run.max*.15?(r.enemy&&r.enemy.boss?8:5):2;later(delay,()=>shakeNow(a));vig='red'}
   if(r.blocked>0){later(delay,()=>{const c=centre('#hero');if(c){emit('guard',c.x+10,c.y);ring(c.x,c.y,COL.pale,80,320)}});if(!vig)vig='blue'}}
  else if(r.k==='telegraph'){const sel=r.sel;
   entry(250+60,el=>{play(figOf(sel),[{scale:'1 1',translate:'0 0',filter:'none',offset:0},{scale:'1.03 .94',translate:'0 0',filter:'brightness(1.3)',offset:.35,easing:'linear'},{scale:'1.03 .94',translate:'3px 0',filter:'brightness(1.35)',offset:.5},{scale:'1.03 .94',translate:'-3px 0',filter:'brightness(1.35)',offset:.65},{scale:'1.03 .94',translate:'0 0',filter:'brightness(1.3)',offset:1}],250,el,0,'ease-out');
    const ic=$(sel+' .intentw');if(ic)play(ic,[{scale:'1.4',filter:'brightness(1.6)'},{scale:'1',filter:'none'}],240,el,0,'cubic-bezier(.2,1.4,.4,1)')})}
  else if(r.k==='estrike'){const sel=r.sel,total=60+50+60+200,dir=-1;
   entry(total,el=>play(figOf(sel),[{translate:'0 0',scale:'1 1',offset:0},{translate:`${-dir*7}px 0`,scale:'1.02 .97',offset:at(60,total),easing:'cubic-bezier(.2,.9,.3,1)'},{translate:`${dir*30}px 0`,scale:'1.06 .96',offset:at(110,total)},{translate:`${dir*30}px 0`,scale:'1.06 .96',offset:at(170,total),easing:'ease-out'},{translate:'0 0',scale:'1 1',offset:1}],total,el,0,'linear'))}
  else if(r.k==='status'){statusFx(r)}
  else if(r.k==='draw'){const i=drawI++;
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
export const holdLeft=()=>Math.max(0,holdUntil-performance.now());
export function holdFor(ms){holdUntil=performance.now()+ms}
function reveal(sel,from,dur,gap,delay,tilt){const els=$$(sel);els.forEach((el,i)=>{if(!el.animate)return;const rot=tilt?(i%2?1:-1)*(3+i):0;
 el.animate([{translate:`${from[0]}px ${from[1]}px`,scale:from[2]||'.92',rotate:`${rot}deg`,opacity:0},{translate:'0 0',scale:'1',rotate:'0deg',opacity:1}],{duration:dur,delay:delay+i*gap,easing:'cubic-bezier(.2,.9,.3,1.1)',fill:'backwards'})})}
// Card rewards: cards start face-down, flip in one by one; rares get a light burst and a sparkle.
function flipReveal(delay){const ws=$$('.rewgrid .rcw');ws.forEach((w,i)=>{const card=w.querySelector('.card'),back=w.querySelector('.cardback');if(!card||!back||!card.animate)return;
 const t0=delay+i*190,half=170,rare=card.classList.contains('r-r');
 back.animate([{opacity:1,transform:'rotateY(0deg)'},{opacity:1,transform:'rotateY(90deg)'}],{duration:half,delay:t0,easing:'ease-in',fill:'both'}).finished.then(()=>back.remove(),()=>back.remove());
 card.animate([{transform:'rotateY(-90deg)'},{transform:'rotateY(0deg)'}],{duration:half+60,delay:t0+half,easing:'ease-out',fill:'backwards'});
 later(t0,()=>playSound('flip'));
 if(rare)later(t0+half+80,()=>{const r=rectOf(card);playSound('sparkle');emit('burst',r.x,r.y,COL.gold,26);ring(r.x,r.y,COL.gold,170,560);
  card.classList.add('foiling');card.style.setProperty('--fx','0%');card.animate([{filter:'brightness(2.2)'},{filter:'brightness(1)'}],{duration:520,easing:'ease-out'});
  const beam=document.createElement('div');beam.className='rarebeam';beam.style.left=r.x+'px';beam.style.top=r.y+'px';document.body.appendChild(beam);
  beam.animate([{opacity:.95,transform:'scale(.3)'},{opacity:0,transform:'scale(2.6)'}],{duration:620,easing:'ease-out'}).finished.then(()=>beam.remove(),()=>beam.remove());
  setTimeout(()=>card.classList.remove('foiling'),900)})})}
function syncScreens(){if(!motionOn())return;const S=W.S,s=S.screen;
 const key=(s==='reward'?'r'+(S.cardsOpen!=null?'c'+S.cardsOpen:S.swap!=null?'s':'rows'):s==='chest'?'x'+(S.opened?'o':'c'):(s==='title'&&S.view==='lamp'&&S.got)?'lamp':'');
 if(!key||(revealed===S&&revealKey===key))return;revealed=S;revealKey=key;const hold=holdLeft();
 if(key==='rrows'||key==='xo'){reveal('.rewtiles .tile',[0,26,'.9'],340,95,hold+40);
  if(key==='xo'){const c=$('.chestwrap');if(c){const r=rectOf(c);later(hold+10,()=>{emit('burst',r.x,r.y,COL.gold,22);ring(r.x,r.y,COL.gold,140,520);vignette('gold',.4,520)});
   c.animate([{filter:'brightness(3)',scale:'1.12'},{filter:'brightness(1.4)',scale:'1.04',offset:.4},{filter:'none',scale:'1'}],{duration:520,delay:hold,easing:'ease-out',fill:'backwards'})}}}
 else if(key.startsWith('rc'))flipReveal(hold+30);
 else if(key==='lamp'){const els=$$('.lp-offer.got .tile,.lp-offer.got .lp-pick');els.forEach(el=>{const r=rectOf(el);later(120,()=>{emit('burst',r.x,r.y,COL.gold,22);ring(r.x,r.y,COL.gold,120,520)})});vignette('gold',.35,520)}
}
// capture-phase click hooks: flights start before the click's own handler re-renders the screen
addEventListener('click',ev=>{if(!motionOn())return;const t=ev.target;if(!t.closest)return;
 const card=t.closest('.rewgrid .card');
 if(card){const deck=$('#deckbtn');if(deck){const all=$$('.rewgrid .card').filter(c=>c!==card);const b=rectOf(deck),rects=new Map([card,...all].map(c=>[c,c.getBoundingClientRect()]));const {g,r}=cloneCard(card,rects.get(card));
   all.forEach(c=>{const o=cloneCard(c,rects.get(c));o.g.animate([{opacity:1},{opacity:0,transform:'translateY(18px) scale(.9)'}],{duration:260,easing:'ease-in'}).finished.then(()=>o.g.remove(),()=>o.g.remove())});
   const dx=b.x-(r.left+r.width/2),dy=b.y-(r.top+r.height/2);let raf=0;
   const trail=()=>{if(!g.isConnected)return;const q=g.getBoundingClientRect();emit('trail',q.left+q.width/2,q.top+q.height/2,COL.gold);raf=requestAnimationFrame(trail)};raf=requestAnimationFrame(trail);
   const end=()=>{cancelAnimationFrame(raf);g.remove();ring(b.x,b.y,COL.gold,54,360);emit('burst',b.x,b.y,COL.gold,10);deck.animate([{transform:'scale(1)'},{transform:'scale(1.3)',offset:.4},{transform:'scale(1)'}],{duration:320})};
   g.animate([{transform:'none',opacity:1},{transform:`translate(${dx*.3}px,${dy*.3-30}px) scale(.8) rotate(-6deg)`,opacity:1,offset:.4},{transform:`translate(${dx}px,${dy}px) scale(.18)`,opacity:.6}],{duration:520,easing:'cubic-bezier(.4,0,.5,1)'}).finished.then(end,end)}return}
 const tile=t.closest('.rewtiles .tile:not(.done)');
 if(tile){const k=tile.classList.contains('k-gold')?'gold':tile.classList.contains('k-potion')?'potion':tile.classList.contains('k-relic')?'relic':'';
  const art=tile.querySelector('.tart')||tile;
  if(k==='gold'){const dst=$('.topbar .stat.gold');if(dst){const from=W.run.gold;const html=tile.querySelector('.tart').innerHTML;flyIcon(art,dst,{html,col:COL.gold});
    setTimeout(()=>countUp('.topbar .stat.gold',from,W.run.gold),520)}}
  else if(k==='potion'||k==='relic'){const dst=$(k==='potion'?'#potions':'#relicbar');if(dst)flyIcon(art,dst,{html:art.innerHTML,col:COL.pale})}}
 const chest=t.closest('#openchest');
 if(chest&&!chest.dataset.shaking){chest.dataset.shaking=1;ev.stopImmediatePropagation();ev.preventDefault();
  chest.animate([{translate:'0 0'},{translate:'-5px 0',rotate:'-3deg',offset:.15},{translate:'5px 0',rotate:'3deg',offset:.3},{translate:'-4px 0',rotate:'-2deg',offset:.45},{translate:'4px 0',rotate:'2deg',offset:.6},{translate:'0 0',rotate:'0deg'}],{duration:340});
  setTimeout(()=>{if(window.openChestLid)window.openChestLid()},340)}
 // map travel: a lantern glides from the current node (or the foot of the map) to the chosen node while the old map lingers
 const node=t.closest('.node.av');
 if(node&&W.S.screen==='map'&&!W.S.ov){const cur=$('.node.cur'),from=cur?rectOf(cur):{x:innerWidth/2,y:innerHeight+20},to=rectOf(node);
  const m=document.createElement('i');m.className='travelmark';m.setAttribute('aria-hidden','true');Object.assign(m.style,{left:from.x+'px',top:from.y+'px'});document.body.appendChild(m);
  const dx=to.x-from.x,dy=to.y-from.y;let raf=0;const trail=()=>{if(!m.isConnected)return;const q=m.getBoundingClientRect();emit('trail',q.left+q.width/2,q.top+q.height/2,COL.gold);raf=requestAnimationFrame(trail)};raf=requestAnimationFrame(trail);
  const end=()=>{cancelAnimationFrame(raf);m.remove();ring(to.x,to.y,COL.gold,56,320)};
  m.animate([{transform:'translate(-50%,-50%) translate(0,0)'},{transform:`translate(-50%,-50%) translate(${dx*.5}px,${dy*.5-8}px)`,offset:.5},{transform:`translate(-50%,-50%) translate(${dx}px,${dy}px)`}],{duration:480,easing:'ease-in-out'}).finished.then(end,end);
  holdFor(480)}
},true);
function countUp(sel,from,to){if(from===to)return;const t0=performance.now(),dur=420;const tick=()=>{const el=$(sel);if(!el)return;const k=Math.min(1,(performance.now()-t0)/dur);const v=Math.round(from+(to-from)*k);
 const tn=[...el.childNodes].reverse().find(n=>n.nodeType===3);if(tn)tn.textContent=' '+v;if(k<1)requestAnimationFrame(tick)};requestAnimationFrame(tick)}
// ---------- screen change: old screen lingers and fades (called by render()) ----------
const quiet=new Set(['title']);
export function screenChange(app,prev,next){if(!prev||prev===next||quiet.has(prev)||quiet.has(next))return;
 const hero=W.run&&W.run.hp<=0&&prev==='combat';const hold=Math.max(prev==='combat'?deathHold():0,holdLeft(),hero?700:0);
 if(hold)holdUntil=Math.max(holdUntil,performance.now()+hold);
 crossfade(app,{hold,ms:prev==='combat'?340:260,gray:hero})}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncCombatAnimations);
