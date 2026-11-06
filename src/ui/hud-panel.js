// ui/hud-panel.js (clovis/hud): the painted class energy orb (layout B) and its hold panel. HERO-HUD-BRIEF sections 6, 6.1, 9.1, 10b, 11.
// The ring of segments round the orb is ONLY the class ability meter (Spencer 10-12: health lives on the painted bar under the hero).
// The orb shows the current Energy number only ("3"). Clear glass sits over a class-colour glow that dims as Energy is spent.
// Press the orb = the hero's manual ability (Duelist Flourish, Echo Mage move a mark, Cartographer Advance). Tidecaller is read-only.
// Hold the orb 350 ms = the info panel (game frame-full9 9-slice + the Imagine class plate + live text). Lift to close.
import {W} from '../core/state.js';
import {CARDS} from '../core/registry.js';
import {cname,cost} from '../engine/cards.js';
import {CORE,canMark,flourishMin,flourishMult,echoPlan,echoPreview,GUARD_PER_RANK} from '../engine/combat.js';
import {mod} from '../core/bus.js';
import {CARD_ART} from '../assets.js';
import {playSound} from '../audio.js';
import * as PFX from './painted-fx.js';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const HUD='art/v2/hud/';
export const ORB_TITLE={tide:'Tide',echo:'Echo',carto:'Waypoints',duel:'Momentum'};
// ---- meter state per hero: segments lit / total, ready (manual and usable now), strain (one step from a trigger)
export function meterOf(cb,cls){
 if(cls==='tide'){const t=cb.tide??5;return {on:t,n:10,ready:false,strain:t===9||t===1,max:t>=10,manual:false}}
 if(cls==='echo'){const on=(cb.mark?1:0)+(cb.mark2?1:0);return {on,n:2,ready:canMark(),strain:false,max:on>=2,manual:true,free:true}}
 if(cls==='carto'){const s=cb.slots||[],n=cb.nslots||3,lim=mod('advances',{},1),max=CORE.carto.rank_max;const canAdv=!cb.busy&&!cb.mode&&cb.advUsed<lim&&s.some(w=>w&&(w.rank||0)<max);
  return {on:s.filter(Boolean).length,n,ready:canAdv,strain:s.some(w=>w&&(w.rank||0)===max-1)&&canAdv,max:s.length>=n&&s.every(w=>w&&(w.rank||0)>=max),manual:true}}
 if(cls==='duel'){const n=mod('momMax',{},CORE.duel.mom_max),m=cb.mom||0;return {on:Math.min(n,m),n,ready:!cb.busy&&m>=flourishMin(),strain:m===n-1,max:m>=n,manual:true}}
 return {on:0,n:1,ready:false,strain:false,max:false,manual:false}}
export const armedOf=(cb,cls)=>cls==='duel'?!!cb.armFlourish:cls==='echo'?!!cb.armMark:cls==='carto'?cartoArmed===cb:false;
let cartoArmed=null;
// ---- transient effects: compare with the last render, keep the effect running across re-renders with a negative delay
const FX=new WeakMap();
function fxState(cb,cls,m){let s=FX.get(cb);const now=performance.now();
 if(!s){s={e:cb.energy,on:m.on,ready:m.ready,turn:cb.turn,fx:{}};FX.set(cb,s);return s}
 if(!W.previewing){
  if(cb.turn!==s.turn&&cb.energy>=s.e)s.fx.refill=now;
  else if(cb.energy<s.e)s.fx.spend=now;else if(cb.energy>s.e)s.fx.gain=now;
  if(m.on>s.on)s.fx.segup=now;else if(m.on<s.on)s.fx.segdn=now;
  if(m.ready&&!s.ready&&m.manual){s.fx.readyIn=now;playSound(cls==='duel'?'steel':cls==='echo'?'bell':'rank',cls==='echo'?1.5:1.3)}
  if(m.on>s.on&&cls!=='duel')hint(cls,'gain');
  s.e=cb.energy;s.on=m.on;s.ready=m.ready;s.turn=cb.turn}
 return s}
const LIVE={refill:400,spend:350,gain:400,segup:350,segdn:350,readyIn:500,fizzle:300,fire:1000};
function fxClasses(s){const now=performance.now();let c='',st='';for(const [k,t] of Object.entries(s.fx)){const el=now-t;if(el<LIVE[k]){c+=' fx-'+k;st+=`--d-${k}:-${Math.round(el)}ms;`}}return {c,st}}
// ---- first-time hints (brief 11.6): 2-4 words beside the orb once per save
const HINTS={tide:{gain:'Tide rises',strain:'Crest at 10!'},echo:{gain:'Marked: echoes later',ready:'Tap to move a mark'},carto:{gain:'Waypoint placed',ready:'Tap: Advance'},duel:{ready:'Tap: Flourish',gain:'Momentum +1'}};
let pendingHint=null;
function hint(cls,k){const txt=HINTS[cls]?.[k];if(!txt)return;let seen=[];try{seen=JSON.parse(localStorage.getItem('seenOrbHints')||'[]')}catch(e){}
 const id=cls+':'+k;if(seen.includes(id))return;seen.push(id);try{localStorage.setItem('seenOrbHints',JSON.stringify(seen))}catch(e){}pendingHint={txt,t:performance.now()}}
// ---- the orb
export function orbHTML(cb,cls){if(!ichQ&&typeof requestAnimationFrame!=='undefined')ichQ=requestAnimationFrame(()=>{ichQ=0;flashIntents()});const m=meterOf(cb,cls),s=fxState(cb,cls,m);if(m.ready)hint(cls,'ready');if(m.strain&&cls==='tide')hint(cls,'strain');
 const armed=armedOf(cb,cls),e=cb.energy,frac=Math.max(0,Math.min(1,e/Math.max(1,cb.maxE)));const f=fxClasses(s);
 const deg=(m.on/m.n*360).toFixed(1);
 const lab=cls==='tide'?`Tide ${m.on} of 10`:cls==='echo'?`${m.on} of ${m.n} cards marked`:cls==='carto'?`${m.on} of ${m.n} Waypoints`:`Momentum ${m.on} of ${m.n}`;
 const h=pendingHint&&performance.now()-pendingHint.t<2600?pendingHint:null;
 return `<div class="orb horb ho-${cls}${e?'':' empty'}${m.manual?' manual':''}${m.free?' free':''}${m.ready?' ready':''}${armed?' armed':''}${m.strain?' strain':''}${m.max?' maxed':''}${f.c}" id="orb" role="button" tabindex="0" aria-label="Energy ${e}. ${esc(ORB_TITLE[cls])}: ${esc(lab)}. Hold for details${m.manual?', tap to use':''}." data-meter="${m.on}" data-segs="${m.n}" style="--ef:${frac.toFixed(3)};--lit:${deg}deg;${f.st}">
 <i class="ho-ghost" aria-hidden="true"></i><img class="ho-art" src="${HUD}orb-${cls}.webp" alt="" draggable="false"><i class="ho-ring" aria-hidden="true"></i><i class="ho-ringpv" aria-hidden="true"></i><i class="ho-glow" aria-hidden="true"></i><img class="ho-glass" src="${HUD}orb-${cls}-glass.webp" alt="" draggable="false"><span>${e}</span>${m.manual?'<i class="ho-chev" aria-hidden="true"></i>':''}${h?`<b class="ho-hint" style="--d-hint:-${Math.round(performance.now()-h.t)}ms">${esc(h.txt)}</b>`:''}${cls==='carto'&&armed?cartoChips(cb):''}</div>`}
function cartoChips(cb){const max=CORE.carto.rank_max;return `<div class="ho-chips">${(cb.slots||[]).map((w,i)=>w?`<button class="ho-chip${(w.rank||0)>=max?' land':''}" type="button" data-adv="${i}" ${(w.rank||0)>=max?'disabled':''}>${esc(cname(w))}<small>Rank ${w.rank||0}${(w.rank||0)<max?' → '+((w.rank||0)+1):''}</small></button>`:'').join('')}</div>`}
// ---- hold panel (copy trimmed as panel2.py; live values)
const thumb=ci=>{const a=CARD_ART[ci.id];return a?`<img src="${a.thumb}" alt="" draggable="false">`:`<i class="hpn-noart"></i>`};
function panelBody(cb,cls){const T=CORE.tide;let expl='',vis='',cap='',nxt='',can=[];
 if(cls==='tide'){const t=cb.tide??5,dir=cb.tideDir||0;expl='Your cards raise or lower the Tide.';
  cap=cb.holdDrift||!dir?'It holds next turn.':`It drifts ${dir>0?'up':'down'} 1 next turn.`;
  nxt=`At 10, Crest hits all enemies for ${T.crest_dmg}. At 0, Undertow gives ${T.undertow_blk} Guard and draws ${T.undertow_draw}.`;
  can=[10-t<=t?`Raise the Tide ${10-t} more to reach Crest.`:`Lower the Tide ${t} more to reach Undertow.`];
  let ticks='';for(let i=0;i<=10;i++)ticks+=`<i style="--i:${i}"${i===t?' class="on"':''}><b>${i===0||i===10||i===t?i:''}</b></i>`;
  vis=`<div class="hpn-tidevis" style="--t:${t}"><div class="hpn-staff"><i class="hpn-water"></i><i class="hpn-float"></i>${dir&&!cb.holdDrift?`<i class="hpn-arrow ${dir>0?'up':'dn'}"></i>`:''}</div><div class="hpn-ticks">${ticks}</div><div class="hpn-ends"><span class="lo">▼ 0 Undertow</span><span class="hi">Crest 10 ▲</span></div></div>`}
 else if(cls==='echo'){expl='Your first Attack and first Skill each turn are marked.';
  const ms=[1,2].map(k=>{try{const p=echoPlan(true,k);return p&&{ci:p.card,pv:echoPreview(p)}}catch(e){return null}}).filter(Boolean);
  const last=cb.stat?.echoesLast||0;cap=last&&!ms.length?`Last turn: ${last} ${last>1?'cards':'card'} replayed.`:'';
  nxt=ms.length?`When you end your turn, ${ms.length>1?'both marked cards play':'the marked card plays'} again for free.`:'When you end your turn, marked cards play again for free.';
  can=[canMark()?'Tap the orb, then a card, to move a mark. Free: costs no Energy.':ms.length?'No card in hand can take a mark now.':'Play an Attack or a Skill to mark it.'];
  vis=`<div class="hpn-cards">${ms.length?ms.map(({ci,pv})=>`<div class="hpn-card mk">${thumb(ci)}<b>${esc(cname(ci))}</b><em>${pv?(pv.kind==='dmg'?`ECHO ${pv.total} DMG`:`ECHO ${pv.total} GUARD`):'MARKED'}</em></div>`).join(''):'<div class="hpn-card empty"><span>Nothing marked yet</span></div>'}</div>`}
 else if(cls==='carto'){const s=cb.slots||[],n=cb.nslots||3,max=CORE.carto.rank_max,lim=mod('advances',{},1);expl='Waypoints fire at the start of every turn.';
  const ws=s.filter(Boolean),names=ws.map(w=>CARDS[w.id]?.n||w.id);
  nxt=ws.length?`${names.length>1?names.slice(0,-1).join(', ')+' and '+names[names.length-1]:names[0]} ${names.length>1?'fire':'fires'} when your next turn starts.`:'No Waypoints yet. Play one to fill a slot.';
  const adv=cb.advUsed<lim&&ws.find(w=>(w.rank||0)<max);const rd=CORE.carto.rank_dmg;
  if(adv){const r=adv.rank||0,gain=rd?(rd[Math.min(r+1,rd.length-1)]-rd[Math.min(r,rd.length-1)]):CORE.carto.per_rank;can.push(`Tap the orb, then ${CARDS[adv.id]?.n||'a Waypoint'}, to Advance it: ${CARDS[adv.id]?.wpGuard?`+${GUARD_PER_RANK} Guard`+(/deal/i.test(CARDS[adv.id].d||'')?` and +${gain} damage`:''):`+${gain} damage`}.`)}
  else if(ws.length)can.push(cb.advUsed>=lim?'Advance is used this turn.':'Every Waypoint is a Landmark.');else can.push('Play a Waypoint card.');
  let cards='';for(let i=0;i<n;i++){const w=s[i];if(!w){cards+='<div class="hpn-card empty"><span>Empty slot</span></div>';continue}const r=w.rank||0,land=r>=max;
   cards+=`<div class="hpn-card${land?' land':''}">${thumb(w)}<b>${esc(cname(w))}</b>${land?'<em class="gold">LANDMARK</em>':''}<span class="hpn-rank">${Array.from({length:max},(_,k)=>`<i${k<r?' class="on"':''}></i>`).join('')}</span></div>`}
  vis=`<div class="hpn-cards">${cards}</div>`}
 else if(cls==='duel'){const n=mod('momMax',{},CORE.duel.mom_max),m=cb.mom||0;expl='Attacks add 1, up to 5. Flourish spends it all on one hit.';
  nxt=`You lose ${CORE.duel.decay||1} when your turn ends.`;can=[m>=flourishMin()?`Tap the orb, then an Attack, to Flourish for x${flourishMult(m)}.`:`Play an Attack to build Momentum. Flourish at ${flourishMin()}.`];
  vis=`<div class="hpn-flames">${Array.from({length:n},(_,i)=>`<i class="${i<m?'on':''}"><b>${i+1}</b></i>`).join('')}<div class="hpn-mult${m>=flourishMin()?'':' off'}">x${flourishMult(m)}</div></div>`}
 return `<header><img src="${HUD}orb-${cls}.webp" alt=""><div><h3>${ORB_TITLE[cls].toUpperCase()}</h3><p>${esc(expl)}</p></div></header>
 <h4>NOW</h4><div class="hpn-well">${vis}</div>${cap?`<p>${esc(cap)}</p>`:''}<h4>NEXT</h4><p class="b">${esc(nxt)}</p><h4>YOU CAN</h4>${can.map(c=>`<p class="can">${esc(c)}</p>`).join('')}`}
export function openOrbPanel(){const cb=W.cb,cls=W.run?.cls;if(!cb||!cls)return;cb.tutHeld=1; // tutorial 'hold' step
 closeOrbPanel();const orb=document.getElementById('orb');if(!orb)return;
 const p=document.createElement('div');p.id='orbpanel';p.className=`hpanel hpn-${cls}`;p.setAttribute('role','dialog');p.setAttribute('aria-label',ORB_TITLE[cls]+' details');
 p.style.setProperty('--plate',`url(${HUD}plate-${cls}.webp)`);p.innerHTML=`<div class="hpn-in">${panelBody(cb,cls)}</div><i class="hpn-ptr"></i>`;document.body.appendChild(p);
 const r=orb.getBoundingClientRect(),H=innerHeight,Wd=innerWidth;const pw=p.offsetWidth,ph=p.offsetHeight;
 // never over the hand: the panel's bottom sits above the top of the resting hand (or the orb's middle, whichever is higher)
 const cards=[...document.querySelectorAll('.hand .card:not(.sel)')].map(c=>c.getBoundingClientRect().top).filter(t=>t>0);const handTop=cards.length?Math.min(...cards):H;
 let left=r.right+6,bottom=H-Math.min(handTop-4,r.top+r.height*.75);if(left+pw>Wd-4)left=Wd-4-pw;const topBar=document.querySelector('.topbar')?.getBoundingClientRect().bottom||40;
 if(H-bottom-ph<topBar+2){const room=H-bottom-topBar-2;if(room<ph){p.style.setProperty('--fit',Math.max(.72,room/ph).toFixed(3));p.classList.add('fit')}}
 Object.assign(p.style,{left:left+'px',bottom:bottom+'px'});if(p.classList.contains('fit'))p.style.transformOrigin='0 100%';p.style.setProperty('--py',Math.max(10,Math.min(ph-20,(H-bottom)-(r.top+r.height/2)))+'px');playSound('menuOpen',1.1)}
export function closeOrbPanel(){document.getElementById('orbpanel')?.remove()}
// ---- press = ability, hold = panel. Guards: no taps while a card is dragged, during enemy turns/animations, or 250 ms after a card lands.
let hold=null,lastLand=0;
export function noteCardLanded(){lastLand=performance.now()}
function fizzle(cls,why){const cb=W.cb;const s=cb&&FX.get(cb);if(s){s.fx.fizzle=performance.now()}playSound(cls==='duel'?'gutter':cls==='echo'?'metal':'cancel',cls==='echo'?.6:.7);
 if(why){pendingHint={txt:why,t:performance.now()}}window.G?.render?.()}
export function orbTap(){const cb=W.cb,cls=W.run?.cls;if(!cb||!cls||W.S.screen!=='combat')return;
 if(cb.busy||cb.enemyTurn||performance.now()-lastLand<250)return;
 const m=meterOf(cb,cls);if(!m.manual)return;
 if(cls==='duel'){if(!cb.armFlourish&&!m.ready)return fizzle(cls,`Needs ${flourishMin()} Momentum`);playSound(cb.armFlourish?'cancel':'steel',cb.armFlourish?1:1.4);window.armFlourish?.();return}
 if(cls==='echo'){if(!cb.armMark&&!canMark())return fizzle(cls,cb.mark||cb.mark2?'No card in hand can take the mark':'Play an Attack or Skill to mark it');playSound(cb.armMark?'cancel':'bell',1.3);window.armMark?.();return}
 if(cls==='carto'){if(cartoArmed===cb){cartoArmed=null;playSound('cancel');window.G?.render?.();return}if(!m.ready)return fizzle(cls,cb.advUsed?'Advance used this turn':'No Waypoint to Advance');cartoArmed=cb;playSound('flip',1.2);window.G?.render?.()}}
function cartoAdvance(i){cartoArmed=null;const s=FX.get(W.cb);if(s)s.fx.fire=performance.now();playSound('rank',1);window.advance?.(i)}
if(typeof document!=='undefined'){
 document.addEventListener('pointerdown',ev=>{const chip=ev.target.closest?.('.ho-chip[data-adv]');if(chip){ev.stopPropagation();ev.preventDefault();if(!chip.disabled)cartoAdvance(+chip.dataset.adv);return}
  const orb=ev.target.closest?.('#orb.horb');if(!orb){if(cartoArmed&&!ev.target.closest?.('.hplate')){cartoArmed=null;window.G?.render?.()}return}
  if(document.querySelector('.hand .card.drag,.card.dragging')||window.__drag)return;
  ev.preventDefault();hold={x:ev.clientX,y:ev.clientY,open:false,t:setTimeout(()=>{if(hold){hold.open=true;openOrbPanel()}},350)}},true);
 const end=ev=>{if(!hold)return;clearTimeout(hold.t);const h=hold;hold=null;if(h.open){closeOrbPanel();if(W.cb&&W.cb.tutHeld===1){W.cb.tutHeld=2;window.G?.render?.()}return}if(ev.type==='pointerup'&&ev.target.closest?.('#orb.horb'))orbTap()};
 document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
 document.addEventListener('pointermove',ev=>{if(hold&&!hold.open&&Math.hypot(ev.clientX-hold.x,ev.clientY-hold.y)>12){clearTimeout(hold.t);hold=null}},true);
 document.addEventListener('contextmenu',ev=>{if(ev.target.closest?.('#orb.horb'))ev.preventDefault()},true);
 document.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&document.activeElement?.matches?.('#orb.horb')){ev.preventDefault();orbTap()}});
}
// ---- hold-card ghost (brief 11.1): outcome.js passes the predicted meter value while a card is held
export function orbGhost(next){const o=document.getElementById('orb');if(!o)return;const n=+o.dataset.segs||1;
 if(next==null){o.classList.remove('ghost');return}o.style.setProperty('--ghost',(Math.max(0,Math.min(n,next))/n*360).toFixed(1)+'deg');o.classList.add('ghost')}
// ---- clarity (EFFECTS.md C3 End Turn pulse, C8 unspent energy flash)
export function playableCount(cb){let n=0;for(const ci of cb.hand||[]){const d=CARDS[ci.id];if(!d||d.unplay)continue;try{if(cost(ci)<=cb.energy)n++}catch(e){}}return n}
if(typeof document!=='undefined')document.addEventListener('pointerdown',ev=>{if(!ev.target.closest?.('#endbtn'))return;const cb=W.cb;if(!cb||cb.busy||!cb.energy||!playableCount(cb))return;
 const o=document.getElementById('orb');if(o){o.classList.remove('fx-unspent');void o.offsetWidth;o.classList.add('fx-unspent')}},true);
// ---- C2: touching a card you can't afford shakes it, rings its cost gem red and flashes the orb red (300 ms). Play rules unchanged.
export function flashNoAfford(cardEl){const c=cardEl&&cardEl.isConnected?cardEl:document.querySelector('.hand .card.peek,.hand .card.tap-armed');
 for(const el of [c,document.getElementById('orb')])if(el){el.classList.remove(el===c?'fx-noafford':'fx-poor');void el.offsetWidth;el.classList.add(el===c?'fx-noafford':'fx-poor')}
 playSound('cancel',.7)}
// Short reason (not an energy problem) near the tapped card: fixed-position, no layout change, gone in ~1.4 s.
export function showNoPlay(cardEl,text){document.querySelectorAll('.noplay-tip').forEach(e=>e.remove());const c=cardEl&&cardEl.isConnected?cardEl:document.querySelector('.hand .card.peek,.hand .card.tap-armed');if(!c)return;
 const r=c.getBoundingClientRect(),t=document.createElement('div');t.className='noplay-tip';t.setAttribute('role','status');t.textContent=text;document.body.appendChild(t);
 const w=t.offsetWidth;t.style.left=Math.max(4,Math.min(innerWidth-w-4,r.left+r.width/2-w/2))+'px';t.style.top=Math.max(4,r.top-t.offsetHeight-6)+'px';
 c.classList.remove('fx-noafford');playSound('cancel',.5);setTimeout(()=>t.remove(),1400)}
function handCardEl(node){const hit=node?.closest?.('.hand-hit');if(hit)return document.querySelector(`.hand .card[data-i="${hit.dataset.i}"]`);return node?.closest?.('.hand .card[data-uid]')||null}
if(typeof document!=='undefined')document.addEventListener('pointerdown',ev=>{const c=handCardEl(ev.target);const cb=W.cb;if(!c||!cb||W.S.screen!=='combat')return;
 const ci=cb.hand.find(h=>String(h.uid)===c.dataset.uid);if(!ci||CARDS[ci.id]?.unplay)return;let k;try{k=cost(ci)}catch(e){return}if(k<=cb.energy)return;
 flashNoAfford(c)},true);
// ---- C7: an intent number that changed since the last render flashes (green = weaker, red = stronger), 400 ms
const INT=new Map();let intFor=null;
export function flashIntents(){if(typeof document==='undefined')return;if(intFor!==W.cb){intFor=W.cb;INT.clear()} // victory-sweep: memory is per encounter, not per slot
 for(const el of document.querySelectorAll('.en[data-en] .intent')){const k=el.closest('.en').dataset.en,v=el.textContent.replace(/\s+/g,'');const n=parseInt(v)||0;
 const prev=INT.get(k);INT.set(k,{v,n,t:prev&&prev.v!==v&&prev.n&&n?performance.now():prev?.t||0,dir:prev&&prev.v!==v?(n<prev.n?'down':'up'):prev?.dir});const r=INT.get(k);
 el.classList.remove('fx-ichange','fx-iup','fx-idown');if(r.t&&performance.now()-r.t<400){void el.offsetWidth;el.classList.add('fx-ichange','fx-i'+r.dir);el.style.setProperty('--d-ich',-(performance.now()-r.t|0)+'ms');setTimeout(()=>{if(performance.now()-r.t>=400)el.classList.remove('fx-ichange','fx-iup','fx-idown')},420)}}}
let ichQ=0;
// ---- cause trails (brief 10b / 11.2) and payoff travel (11.4). Fixed-position overlay, transform/opacity only, never blocks input.
import {observeEvents} from '../core/bus.js';
const reduce=()=>document.documentElement.classList.contains('reduce-motion')||document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
const centre=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height}};
// Canvas FX engine: one fixed overlay canvas, one rAF loop that idles when empty. Zero-size .hud-mark markers keep fx-check timings.
let fxc=null,fctx=null,fxs=[],fraf=0;
function fxCtx(){if(!fxc||!fxc.isConnected){fxc=document.createElement('canvas');fxc.className='hud-fxc';document.body.appendChild(fxc)}
 const d=Math.min(window.devicePixelRatio||1,2),w=innerWidth,h=innerHeight;if(fxc.width!==Math.round(w*d)||fxc.height!==Math.round(h*d)){fxc.width=Math.round(w*d);fxc.height=Math.round(h*d);fxc.style.width=w+'px';fxc.style.height=h+'px'}
 fctx=fxc.getContext('2d');fctx.setTransform(d,0,0,d,0,0);return fctx}
function addFx(mark,ms,draw,delay=0){if(typeof document==='undefined')return;const go=()=>{fxCtx();const m=document.createElement('i');m.className='hud-mark '+mark;document.body.appendChild(m);fxs.push({t0:performance.now(),ms,draw,m});if(!fraf)fraf=requestAnimationFrame(fxLoop)};delay?setTimeout(go,delay):go()}
function fxLoop(now){const c=fctx;c.clearRect(0,0,innerWidth,innerHeight);c.globalCompositeOperation='lighter';
 fxs=fxs.filter(f=>{const p=(now-f.t0)/f.ms;if(p>=1){f.m.remove();return false}c.save();try{f.draw(c,Math.max(0,p))}catch(e){}c.restore();return true});
 c.globalCompositeOperation='source-over';fraf=fxs.length?requestAnimationFrame(fxLoop):0;if(!fraf)c.clearRect(0,0,innerWidth,innerHeight)}
const easeO=t=>1-Math.pow(1-t,3),cl=t=>t<0?0:t>1?1:t;
const rgba=(col,a)=>col.replace(/^rgb\(/,'rgba(').replace(/\)$/,','+a.toFixed(3)+')');
const toRgb=c=>c.startsWith('#')?`rgb(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)})`:c;
const rnd=seed=>()=>((seed=(seed*16807)%2147483647)/2147483647);
// Tapered curved trail: bezier with a slight lift, glowing body, bright head, fading tail, 5 hero-colour sparks.
function streak(a,b,{color,ms=350,width=3,cls=''}={}){if(!a||!b)return;const col=toRgb(color||'#ffffff');
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,lift=Math.min(70,len*.22),cx=(a.x+b.x)/2+dy/len*-lift*.2,cy=(a.y+b.y)/2-lift;
 const B=t=>({x:(1-t)*(1-t)*a.x+2*(1-t)*t*cx+t*t*b.x,y:(1-t)*(1-t)*a.y+2*(1-t)*t*cy+t*t*b.y});
 const r=rnd((a.x*7+b.y*13|0)+1),sp=[...Array(5)].map(()=>({t:.25+r()*.6,vx:(r()-.5)*40,vy:-10-r()*30,s:1+r()*1.6}));const W=Math.max(3,width*1.4);
 addFx('hud-streak '+cls,ms,(c,p)=>{const head=easeO(cl(p/.7)),tail=cl((p-.3)/.7),N=18;
  for(let pass=0;pass<2;pass++){let q=B(tail);for(let i=1;i<=N;i++){const t=tail+(head-tail)*i/N,n=B(t),u=i/N;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(n.x,n.y);c.lineCap='round';
   c.lineWidth=pass?W*u*.45+.5:W*u*2.4+1;c.strokeStyle=pass?`rgba(255,255,255,${(.25+.6*u).toFixed(3)})`:rgba(col,.12+.3*u);c.stroke();q=n}}
  if(p<.85){const h=B(head),g=c.createRadialGradient(h.x,h.y,0,h.x,h.y,W*3);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.35,rgba(col,.6));g.addColorStop(1,rgba(col,0));c.fillStyle=g;c.beginPath();c.arc(h.x,h.y,W*3,0,6.283);c.fill()}
  for(const s of sp){if(head<s.t)continue;const age=(p-s.t*.7)/.45;if(age>1)continue;const o=B(s.t),k=cl(age);c.fillStyle=rgba(col,.9*(1-k));c.beginPath();c.arc(o.x+s.vx*k,o.y+s.vy*k+12*k*k,s.s*(1-k*.5),0,6.283);c.fill()}})}
// Soft glow burst / ring.
function burst(p,{color,ms=450,size=60,cls='',delay=0}={}){if(!p)return;const col=toRgb(color||'#ffffff');
 addFx('hud-burst '+cls,ms,(c,t)=>{const k=easeO(t),R=size/2*(.3+1.1*k),al=1-t;
  if(cls==='ring'){c.lineWidth=Math.max(.5,4*(1-t));c.strokeStyle=rgba(col,.85*al);c.beginPath();c.arc(p.x,p.y,R,0,6.283);c.stroke()}
  else{const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,R);g.addColorStop(0,`rgba(255,255,255,${(.9*al).toFixed(3)})`);g.addColorStop(.3,rgba(col,.7*al));g.addColorStop(1,rgba(col,0));c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,R,0,6.283);c.fill()}},delay)}
// Crest: painted wave, see ui/painted-fx.js (replaced the canvas water ribbon).
// Flourish: painted crescent, see ui/painted-fx.js (replaced the canvas blade arc).
const COL={tide:'rgb(80,230,215)',echo:'rgb(190,150,255)',carto:'rgb(255,200,110)',duel:'rgb(255,110,40)'};
let src=null,before=null;
const orbP=()=>{const o=document.getElementById('orb');return o&&centre(o)};
const enP=e=>{const bar=e&&document.querySelector(`.hpbar[data-who="e${e.uid}"]`);const el=bar&&(bar.closest('.en')?.querySelector('.fig,.spr,img')||bar);return el&&centre(el)};
const heroP=()=>{const el=document.querySelector('.hero .fig,.hero .hpbar');return el&&centre(el)};
if(typeof document!=='undefined')observeEvents((ev,c)=>{const cb=W.cb,cls=W.run?.cls;if(!cb||W.previewing||W.replaying||!cls||W.S.screen!=='combat'||reduce())return;
 try{
 if(ev==='beforeCardPlay'){const ci=c?.ci||c?.card;const el=ci&&document.querySelector(`.hand .card[data-uid="${ci.uid}"]`);src=el?centre(el):null;before=meterOf(cb,cls).on;return}
 if(ev==='cardPlayed'){const s=src,b0=before;src=null;setTimeout(()=>{const now=W.cb&&meterOf(W.cb,cls).on;if(s&&b0!=null&&now!=null&&now!==b0)streak(s,orbP(),{color:now>b0?COL[cls]:'#8a8a90'})},30);return}
 const o=orbP();if(!o)return;
 if(ev==='crest'){const ps=cb.ens.filter(e=>e.hp>0).map(enP).filter(Boolean);if(ps.length){PFX.crest(ps);ps.forEach((p,i)=>burst(p,{color:COL.tide,ms:420,size:70,delay:420+i*90}))}}
 else if(ev==='undertow'){const h=heroP();if(h){streak(o,h,{color:'#bfe9ff',ms:600,width:5});setTimeout(()=>burst(h,{color:'#bfe9ff',ms:500,size:110,cls:'ring'}),450)}}
 else if(ev==='flourish'){const p=enP(cb.ens[cb.tgt]||cb.ens.find(e=>e.hp>0));if(p){streak(o,p,{color:COL.duel,ms:350,width:4});setTimeout(()=>PFX.flourish(p),350);burst(p,{color:'#ffd27a',ms:400,size:56,delay:520})}}
 else if(ev==='echo'){const s=FX.get(cb);if(s)s.fx.fire=performance.now();burst(o,{color:COL.echo,ms:450,size:o.w*1.2,cls:'ring'});const p=enP(cb.markTgt)||enP(cb.ens.find(e=>e.hp>0));if(p){streak(o,p,{color:COL.echo,ms:350,width:3});setTimeout(()=>PFX.echo(p),330)}}
 else if(ev==='advance'){burst(o,{color:COL.carto,ms:450,size:o.w*1.2,cls:'ring'})}
 }catch(e){}});
