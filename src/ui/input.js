import {showOutcome,clearOutcome,outcomeLayout} from './outcome.js';
// ui/input.js
import {W} from '../core/state.js';
import {settings} from '../save.js';
import {needsTarget} from '../engine/cards.js';
import {alive,canPlay,playCard} from '../engine/combat.js';
import {layoutHand,render,openInspect,closeInspect,inspecting} from './render.js';
// ================= pointer / touch input: tap-to-select, drag-to-play =================
export let drag=null;
export function enemyAt(x,y){for(const el of document.elementsFromPoint(x,y)){const en=el.closest&&el.closest('.en');if(en)return +en.dataset.en}return null}
// ----- long-press (450 ms, < 10 px movement) or right-click enlarges ANY card (hand, reward, shop, piles) -----
export const LONGPRESS_MS=450;
let lp=null,eatClick=false;
function cardOf(el){const i=el.dataset.i;if(i!=null&&W.cb&&el.closest('.hand'))return W.cb.hand[+i];const uid=+el.dataset.uid;const piles=W.cb?[W.cb.hand,W.cb.draw,W.cb.disc,W.cb.exh,W.cb.slots]:[];if(W.run)piles.push(W.run.deck);const live=uid>0?piles.flat().find(c=>c&&c.uid===uid&&c.id===el.dataset.id):null;return {...live,id:el.dataset.id,uid,up:el.dataset.up==='1'}}
export const cancelLongPress=()=>{if(lp){clearTimeout(lp.t);lp=null}clearTimeout(hh);hh=0};
let hh=0,holdTouch=false;
// Held zoom uses the actual finger position; render's side rails keep edge cards on screen.
// Held-preview side is decided ONCE per hold from the card's slot in the hand: the centre card and everything right of it
// preview on the LEFT, cards left of centre preview on the RIGHT. Outside the hand, fall back to the press point.
function handSide(el,point){const cs=el&&el.closest?.('.hand')?[...el.closest('.hand').querySelectorAll('.card')]:[],i=cs.indexOf(el);
 if(i>=0)return i>=Math.floor(cs.length/2)?'left':'right';return point.x>=innerWidth/2?'left':'right'}
function inspectNow(el,touch,point){const side=touch?handSide(el,point):null;clearPeek();if(drag&&drag.el===el){if(drag.raf)cancelAnimationFrame(drag.raf);if(touch&&side&&!drag.moved){drag.hx=point.x;drag.hy=point.y;heldDrag=drag}drag=null;clearTargets()}eatClick=true;lp=null;holdTouch=!!touch;openInspect(cardOf(el),touch?point:null,side)}
document.addEventListener('pointerdown',ev=>{eatClick=false;if(lp){clearTimeout(lp.t);lp=null}if(ev.target.closest?.('#inspect')){eatClick=true;if(holdTouch&&ev.target.closest('.inspect-keywords'))return;closeInspect();return}let any=ev.target.closest&&ev.target.closest('.card');if(ev.pointerType==='mouse'&&any?.closest('.hand')&&peek?.isConnected)any=peek;if(!any||any.closest('#inspect'))return;
 if(ev.button>0)return;
 lp={el:any,x0:ev.clientX,y0:ev.clientY,t:setTimeout(()=>{if(lp&&lp.el===any&&(!drag||!drag.moved))inspectNow(any,true,{x:ev.clientX,y:ev.clientY})},LONGPRESS_MS)}},true);
document.addEventListener('pointermove',ev=>{if(lp&&Math.hypot(ev.clientX-lp.x0,ev.clientY-lp.y0)>10){clearTimeout(lp.t);lp=null}},true);
document.addEventListener('pointerup',ev=>{if(lp){clearTimeout(lp.t);lp=null}if(holdTouch&&ev.target.closest?.('.inspect-keywords')&&!ev.isPrimary)return;if(holdTouch){holdTouch=false;closeInspect()}},true); // A held preview lasts exactly until release.
document.addEventListener('pointercancel',()=>{cancelLongPress()},true); // v0.5.1: a browser pan/cancel must not close a held zoom; only lifting the finger does
document.addEventListener('click',ev=>{if(holdTouch&&ev.target.closest?.('.inspect-keywords')){ev.stopPropagation();ev.preventDefault()}},true);
document.addEventListener('touchend',ev=>{if(holdTouch&&ev.touches.length===0){holdTouch=false;closeInspect()}},true);
document.addEventListener('touchcancel',ev=>{if(holdTouch&&ev.touches.length===0){holdTouch=false;closeInspect()}},true);
// Preserve shelf scrolling before the hold; once open, sliding must not become a native pan/cancel.
// While a card is held, a second finger on the glossary scrolls it by hand: the held card's touch sequence blocks native panning.
const kwScroll=new Map();
document.addEventListener('touchstart',ev=>{if(!holdTouch)return;for(const t of ev.changedTouches){const k=t.target?.closest?.('.inspect-keywords');if(k)kwScroll.set(t.identifier,{k,y:t.clientY,st:k.scrollTop})}},true);
document.addEventListener('touchmove',ev=>{if(!holdTouch){kwScroll.clear();return}ev.preventDefault();for(const t of ev.changedTouches){const s=kwScroll.get(t.identifier);if(s)s.k.scrollTop=s.st-(t.clientY-s.y)}},{passive:false});
const kwEnd=ev=>{for(const t of ev.changedTouches)kwScroll.delete(t.identifier)};document.addEventListener('touchend',kwEnd,true);document.addEventListener('touchcancel',kwEnd,true);
// Desktop hover-hold: resting the mouse on a card (1.5 s in the hand, 0.9 s elsewhere) enlarges it, like right-click.
document.addEventListener('pointerover',ev=>{if(ev.pointerType!=='mouse')return;clearTimeout(hh);hh=0;const c=ev.target.closest&&ev.target.closest('.card');if(!c||c.closest('#inspect,#cardtip,.cslot.lift')||ev.buttons)return;
 const hand=!!c.closest('.hand');hh=setTimeout(()=>{hh=0;if(holdTouch||inspecting||!c.isConnected||!c.matches(':hover')||drag||(hand&&(c.classList.contains('sel')||c.classList.contains('drag')))||(W.cb&&W.cb.busy&&hand))return;inspectNow(c,false)},hand?1500:900)},true);
document.addEventListener('pointerdown',()=>{clearTimeout(hh);hh=0},true);
document.addEventListener('pointerout',ev=>{if(ev.pointerType==='mouse'&&(!ev.relatedTarget||!ev.relatedTarget.closest||ev.relatedTarget.closest('.card')!==ev.target.closest('.card'))){clearTimeout(hh);hh=0}},true);
document.addEventListener('click',ev=>{if(eatClick){eatClick=false;ev.stopPropagation();ev.preventDefault()}},true);
// Android Chrome fires its own long-press 'contextmenu' while a card is already held; it used to reopen the preview
// with no point/side, which snapped the held preview to the screen centre. While a hold is open, just swallow it.
document.addEventListener('contextmenu',ev=>{const c=ev.target.closest&&ev.target.closest('.card');if(holdTouch||lp||ev.pointerType==='touch'||ev.sourceCapabilities?.firesTouchEvents){ev.preventDefault();return}if(!c||c.closest('#inspect'))return;ev.preventDefault();inspectNow(c)});
document.addEventListener('pointerdown',ev=>{const hit=ev.target.closest&&ev.target.closest('.hand .card');const c=ev.pointerType==='mouse'&&hit&&peek?.isConnected?peek:hit;if(!c||!W.cb||W.cb.busy||W.cb.mode||W.S.ov)return;
 if(ev.button!=null&&ev.button>0)return;
 // A second finger (multi-touch) supersedes the first press instead of leaving its card lifted.
 if(drag&&drag.id!==ev.pointerId){if(drag.raf)cancelAnimationFrame(drag.raf);if(drag.moved)drag.el.style.removeProperty('transform');drag.el.classList.remove('drag','armed');drag=null;clearTargets()}
 dropSel(c);rafPending=null;drag={el:c,i:+c.dataset.i,x0:ev.clientX,y0:ev.clientY,id:ev.pointerId,moved:false,bx:+c.dataset.x||0,by:+c.dataset.y||0,touch:ev.pointerType!=='mouse'};
 hc=null;leanX=null;peekCard(c,0,false,drag.touch);
 try{c.setPointerCapture(ev.pointerId)}catch(_){}});
export let rafPending=null;
document.addEventListener('pointermove',ev=>{const d=drag;if(!d||ev.pointerId!==d.id)return;if(d.moved)ev.preventDefault();rafPending=ev;if(d.raf)return;d.raf=requestAnimationFrame(()=>{d.raf=0;if(drag===d&&rafPending)dragMove(d,rafPending)})},{passive:false});
function clearTargets(outcome=true){document.querySelectorAll('.drop-valid,.drop-invalid,.drop-over,.en.hot,.foes.armed').forEach(e=>e.classList.remove('drop-valid','drop-invalid','drop-over','hot','armed'));if(outcome)clearOutcome()}
function dropTarget(ci,x,y,geometry=null){
 const upper=y>48&&y<innerHeight*.65;
 const blocked=document.elementsFromPoint(x,y).some(e=>e.closest?.('.topbar,.dais,.ctl button,.ov,.pop'));
 if(blocked)return null;
 if(needsTarget(ci)){
  const en=enemyAt(x,y);if(en!=null&&W.cb.ens[en]?.hp>0&&!W.cb.ens[en].fled)return en;
  const live=alive();if(live.length===1){const el=document.querySelector(`.en[data-en="${W.cb.ens.indexOf(live[0])}"]`),r=geometry?.enemies.get(el)||el.getBoundingClientRect();
   if(upper||(x>=r.left-45&&x<=r.right+45&&y>=r.top-45&&y<=r.bottom+45&&y<innerHeight*.72))return W.cb.ens.indexOf(live[0]);}
  return null;
 }
 const hero=geometry?.hero||document.querySelector('.hero').getBoundingClientRect();
 return upper||(x>=hero.left-45&&x<=hero.right+45&&y>=hero.top-45&&y<=hero.bottom+45&&y<innerHeight*.72)?'hero':null;
}
// v0.5.1 (StS mobile): while a long-press zoom is open, the same finger can drag the card into play. Wobble under HOLD_DRAG_PX keeps the zoom.
export const HOLD_DRAG_PX=36;
let heldDrag=null;
document.addEventListener('pointermove',ev=>{const d=heldDrag;if(!d||ev.pointerId!==d.id||!holdTouch)return;const hx=ev.clientX-d.hx,hy=ev.clientY-d.hy;if(hy>-HOLD_DRAG_PX&&Math.abs(hx)<HOLD_DRAG_PX*1.5)return;ev.preventDefault();heldDrag=null;holdToDrag(d);drag=d;d.y0=Math.max(d.y0,ev.clientY+33);dragMove(d,ev)},{passive:false});
document.addEventListener('pointerup',()=>{heldDrag=null},true);
function holdToDrag(d){holdTouch=false;closeInspect();const el=document.querySelector(`.hand .card[data-i="${d.i}"]`);if(el){d.el=el;try{el.setPointerCapture(d.id)}catch(_){}}}
export function dragMove(d,ev){const dy=ev.clientY-d.y0;
 d.x=ev.clientX;d.y=ev.clientY;
 if(!d.moved){if(dy>-32){if(dy>-10&&(d.scrubbing||Math.abs(ev.clientX-d.x0)>12)){d.scrubbing=true;scrubAt(ev.clientX,d.touch)}return}clearPeek();cancelLongPress();d.moved=true;d.el.classList.remove('sel');d.el.classList.add('drag');layoutHand(true);W.cb.sel=null;W.cb.insp=null;const t=document.getElementById('detail');if(t)t.remove();
 const hand=document.getElementById('hand').getBoundingClientRect(),cw=d.el.offsetWidth,ch=d.el.offsetHeight;
 d.geometry={hand,cw,ch,scale:Math.max(1.12,(+d.el.dataset.zl||1.2)*.75),baseY:hand.bottom-(parseFloat(getComputedStyle(d.el).bottom)||0)-ch/2,
 hero:document.querySelector('.hero').getBoundingClientRect(),enemies:new Map([...document.querySelectorAll('.en')].map(e=>[e,e.getBoundingClientRect()])),outcome:outcomeLayout()};}
 // Keep the painted card beside the pointer so the aimed-at HP/intent remains visible.
 const {scale,cw,ch,hand,baseY}=d.geometry;
 const cx=ev.clientX>innerWidth*.5?ev.clientX-cw*scale/2-45:ev.clientX+cw*scale/2+45;
 const x=Math.max(cw*scale/2+4,Math.min(innerWidth-cw*scale/2-4,cx));
 const y=Math.max(ch*scale/2+44,Math.min(innerHeight-ch*scale/2-8,ev.clientY-40));
 d.el.style.transform=`translate(${x-hand.left-hand.width/2}px,${y-baseY}px) scale(${scale.toFixed(3)})`;
 const ci=W.cb.hand[d.i];clearTargets(false);if(!ci){clearOutcome();return}
 const playable=canPlay(ci),target=playable?dropTarget(ci,d.x,d.y,d.geometry):null,nt=needsTarget(ci);
 document.querySelectorAll('.en').forEach(e=>e.classList.add(playable&&nt&&W.cb.ens[+e.dataset.en].hp>0&&!W.cb.ens[+e.dataset.en].fled?'drop-valid':'drop-invalid'));
 const hero=document.querySelector('.hero');hero.classList.add(playable&&!nt?'drop-valid':'drop-invalid');
 if(target!=null){const el=target==='hero'?hero:document.querySelector(`.en[data-en="${target}"]`);el.classList.add('drop-over');if(target!=='hero')el.classList.add('hot');showOutcome(d.i,target==='hero'?W.cb.tgt:target,d.geometry.outcome)}else clearOutcome()
 d.el.classList.toggle('armed',target!=null);
}
export function endDrag(ev,cancel){const d=drag;if(!d||ev.pointerId!==d.id)return;cancelLongPress();
 if(d.raf)cancelAnimationFrame(d.raf);
 // Pointer release can arrive before the queued animation-frame move.
 if(!cancel&&rafPending&&rafPending.pointerId===d.id)dragMove(d,rafPending);
 drag=null;rafPending=null;if(!d.moved&&!cancel)releasePeek();else clearPeek();dropSel();d.el.classList.remove('drag','armed');d.el.style.removeProperty('transform');clearTargets();eatClick=true;
 if(cancel||!W.cb){if(W.cb){W.cb.sel=null;render()}return}
 if(!d.moved){W.cb.sel=null;W.cb.insp=null;layoutHand();return}
 const ci=W.cb.hand[d.i],target=ci&&canPlay(ci)?dropTarget(ci,ev.clientX,ev.clientY):null;
 if(target!=null){if(target!=='hero')W.cb.tgt=target;return playCard(d.i)}
 render();
}
document.addEventListener('pointerup',ev=>endDrag(ev,false));
document.addEventListener('pointercancel',ev=>endDrag(ev,true));
document.addEventListener('lostpointercapture',ev=>endDrag(ev,true));
addEventListener('blur',()=>{cancelLongPress();heldDrag=null;if(drag)endDrag({pointerId:drag.id},true);clearPeek();dropSel();if(holdTouch){holdTouch=false;closeInspect()}});
addEventListener('resize',()=>{hc=null;if(W.S.screen==='combat'&&!drag)requestAnimationFrame(()=>render())});// figure positions are viewport px


// Stable resting centres, independent of the enlarged card's hit box and pointer capture.
let peek=null;
// Only one card may ever be lifted: pressing a card lowers the previously selected one in place
// (class removal, no re-render) so it animates back into the fan while the pressed card peeks up.
function dropSel(keep){if(!W.cb)return;let any=false;document.querySelectorAll('.hand .card.sel').forEach(c=>{if(c!==keep){c.classList.remove('sel');any=true}});
 if(W.cb.sel!=null&&(!keep||+keep.dataset.i!==W.cb.sel)){W.cb.sel=null;W.cb.insp=null;any=true}
 if(any){const t=document.getElementById('detail');if(t)t.remove();clearOutcome()}}
// Restore the resting --x from dataset (not removeProperty): layoutHand's unchanged-hand cache returns early
// and would otherwise leave the peek neighbours collapsed onto the centre.
let relT=0,hc=null,leanX=null,leanDir=0,lastBuzz=0;
// Haptic tick when the lifted card changes: touch only, ~50 ms rate limit so a fast sweep is a soft riffle. No sound (UI tap sounds were removed on purpose).
function buzz(){if(settings.handHaptic===false||!navigator.vibrate)return;const t=performance.now();if(t-lastBuzz<50)return;lastBuzz=t;try{navigator.vibrate(4)}catch(_){}}
const NB_SHIFT=[16,6,2]; // px pushed from the lifted card: neighbour, next, then the third card out
// Soft release (Task 43): an undragged tap keeps the lifted card ~150 ms, then lowers.
function releasePeek(){const p=peek;if(!p)return;clearTimeout(relT);relT=setTimeout(()=>{relT=0;if(peek===p)clearPeek(true)},150)}
function clearPeek(soft){clearTimeout(relT);relT=0;peek=null;leanDir=0;document.querySelectorAll('.hand .card.peek,.hand .card.peek-neighbour').forEach(c=>{c.classList.remove('peek','peek-neighbour','peek-fast');for(const v of ['--roll','--pn','--nl','--nr'])c.style.removeProperty(v);if(c.dataset.x!=null)c.style.setProperty('--x',c.dataset.x+'px');else c.style.removeProperty('--x')});if(W.S.screen==='combat')layoutHand();if(!soft)clearOutcome()}
// The finger's sweep direction leans the lifted card (roll) and slides it a little away so the thumb does not cover the art.
function lean(c,dir){if(leanDir===dir)return;leanDir=dir;c.style.setProperty('--roll',dir*3+'deg');c.style.setProperty('--pn',(-dir*.2*c.offsetWidth).toFixed(1)+'px')}
function peekCard(c,dir=0,fast=false,haptic=false){clearTimeout(relT);relT=0;if(peek===c){lean(c,dir);return}clearPeek();peek=c;c.classList.add('peek');if(fast)c.classList.add('peek-fast');
 const cards=[...document.querySelectorAll('.hand .card')],i=cards.indexOf(c);
 cards.forEach((el,k)=>{const d=Math.abs(k-i);if(d>=1&&d<=3){const sg=k<i?-1:1;el.classList.add('peek-neighbour');el.style.setProperty('--x',(+el.dataset.x+sg*NB_SHIFT[d-1])+'px');
  if(d===1){el.style.setProperty('--nl','-6px');el.style.setProperty('--nr',sg*2.5+'deg')}}});
 lean(c,dir);if(haptic)buzz();
 showOutcome(+c.dataset.i);
}
// Resting centres are cached per gesture (layoutHand only changes them with the hand), instead of sorting the hand on every move.
function handCache(){const hand=document.getElementById('hand');if(!hand)return null;const cards=[...hand.querySelectorAll('.card')];if(!cards.length)return null;
 const last=cards[cards.length-1];
 if(hc&&hc.hand===hand&&hc.cards.length===cards.length&&hc.cards.every((c,i)=>c===cards[i])&&hc.x0===cards[0].dataset.x&&hc.x1===last.dataset.x)return hc;
 const r=hand.getBoundingClientRect();hc={hand,cards,x0:cards[0].dataset.x,x1:last.dataset.x,xs:cards.map(c=>+c.dataset.x||0),cx:r.left+hand.clientWidth/2,cw:cards[0].offsetWidth};return hc}
function scrubAt(x,haptic){const h=handCache();if(!h)return;const {cards,xs,cx,cw}=h,dist=k=>Math.abs(cx+xs[k]-x);
 let best=0;for(let k=1;k<cards.length;k++)if(dist(k)<dist(best))best=k;
 const cur=peek?cards.indexOf(peek):-1;
 // Hysteresis: keep the current card until the finger is ~22% of a card width past the midpoint to the next one.
 if(cur>=0&&best!==cur){const gap=Math.abs(xs[best]-xs[cur]);if(dist(cur)-dist(best)<2*Math.min(.22*cw,.3*gap))best=cur}
 if(leanX!=null&&Math.abs(x-leanX)>=1){leanSign=Math.sign(x-leanX)}leanX=x;
 const skip=cur>=0&&Math.abs(best-cur)>1; // a fast flick skipped cards: the final card takes the shortest transition so the fan does not visibly jump
 const c=cards[best];peekCard(c,leanSign,skip,haptic&&peek!==c);
 if(drag){drag.el=c;drag.i=+c.dataset.i;drag.bx=+c.dataset.x;drag.by=+c.dataset.y}
}
let leanSign=0;
document.addEventListener('pointermove',ev=>{if(ev.pointerType!=='mouse'||drag)return;const hand=document.getElementById('hand');if(!hand)return;const r=hand.getBoundingClientRect();const m=peek?peek.offsetWidth*.5:0; // a pointer just past either end keeps the end card lifted
 if(ev.clientY>=innerHeight*.65&&ev.clientX>=r.left-m&&ev.clientX<=r.right+m&&W.cb&&!W.cb.busy&&!W.cb.mode){const hit=ev.target.closest?.('.hand .card');if(hit)peekCard(hit);else scrubAt(ev.clientX);}else if(peek)clearPeek()});

// t472: names are hidden in combat; a small name tip shows only while a mouse hovers or a finger holds a figure (flavour after a longer hold).
{let nmEl=null,nmT=0;const off=()=>{clearTimeout(nmT);if(nmEl){nmEl.classList.remove('nameon','namelong');nmEl=null}};
 const on=f=>{if(drag||nmEl===f)return;off();nmEl=f;f.classList.add('nameon');nmT=setTimeout(()=>{if(nmEl===f)f.classList.add('namelong')},650)};
 const fig=ev=>ev.target&&ev.target.closest?ev.target.closest('.combat .en,.combat .hero'):null;
 document.addEventListener('pointerover',ev=>{if(ev.pointerType!=='mouse')return;const f=fig(ev);if(f)on(f);else off()});
 document.addEventListener('pointerdown',ev=>{if(ev.pointerType==='mouse')return;const f=fig(ev);if(f)on(f);else off()},true);
 for(const t of ['pointerup','pointercancel'])document.addEventListener(t,ev=>{if(ev.pointerType!=='mouse')off()},true);
 document.addEventListener('pointerleave',off);document.addEventListener('pointerout',ev=>{if(ev.pointerType==='mouse'&&nmEl&&!nmEl.contains(ev.relatedTarget))off()});}
// Choice screens: a frantic double tap must not fall through onto the next screen (e.g. chained upgrade/remove picks
// or a reward pick reopening the list). A card click is ignored when it lands <350 ms after the screen changed AND follows another card click
// at the same spot (<600 ms, <40 px), i.e. a continuation of the same frantic tapping; a single deliberate tap always goes through.
{let lastS=null,sAt=0,lastPick=-1e9,lpX=0,lpY=0;const watch=()=>{if(W.S!==lastS){lastS=W.S;sAt=performance.now()}requestAnimationFrame(watch)};requestAnimationFrame(watch);
 document.addEventListener('click',ev=>{const c=ev.target.closest&&ev.target.closest('.card');if(!c||c.closest('.hand,#inspect'))return;
  if(W.S!==lastS){lastS=W.S;sAt=performance.now()}
  const now=performance.now();if(now-sAt<350&&now-lastPick<600&&Math.hypot(ev.clientX-lpX,ev.clientY-lpY)<40){ev.stopPropagation();ev.preventDefault();return}lastPick=now;lpX=ev.clientX;lpY=ev.clientY},true);}
