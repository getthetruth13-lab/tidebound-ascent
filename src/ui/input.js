import {showOutcome,clearOutcome} from './outcome.js';
// ui/input.js
import {W} from '../core/state.js';
import {needsTarget} from '../engine/cards.js';
import {alive,canPlay,playCard,tapCard} from '../engine/combat.js';
import {layoutHand,render,openInspect,closeInspect} from './render.js';
// ================= pointer / touch input: tap-to-select, drag-to-play =================
export let drag=null;
export function enemyAt(x,y){for(const el of document.elementsFromPoint(x,y)){const en=el.closest&&el.closest('.en');if(en)return +en.dataset.en}return null}
// ----- long-press (450 ms, < 10 px movement) or right-click enlarges ANY card (hand, reward, shop, piles) -----
export const LONGPRESS_MS=450;
let lp=null,eatClick=false;
function cardOf(el){const i=el.dataset.i;if(i!=null&&W.cb&&el.closest('.hand'))return W.cb.hand[+i];const uid=+el.dataset.uid;const piles=W.cb?[W.cb.hand,W.cb.draw,W.cb.disc,W.cb.exh,W.cb.slots]:[];if(W.run)piles.push(W.run.deck);const live=uid>0?piles.flat().find(c=>c&&c.uid===uid&&c.id===el.dataset.id):null;return {...live,id:el.dataset.id,uid,up:el.dataset.up==='1'}}
export const cancelLongPress=()=>{if(lp){clearTimeout(lp.t);lp=null}clearTimeout(hh);hh=0};
let hh=0,holdTouch=false;
function inspectNow(el,touch){clearPeek();if(drag&&drag.el===el){if(drag.raf)cancelAnimationFrame(drag.raf);drag=null}eatClick=true;lp=null;holdTouch=!!touch;openInspect(cardOf(el))}
document.addEventListener('pointerdown',ev=>{eatClick=false;if(lp){clearTimeout(lp.t);lp=null}const any=ev.target.closest&&ev.target.closest('.card');if(!any||any.closest('#inspect'))return;
 if(ev.button>0)return;
 lp={el:any,x0:ev.clientX,y0:ev.clientY,t:setTimeout(()=>{if(lp&&lp.el===any&&(!drag||!drag.moved))inspectNow(any,ev.pointerType==='touch'||ev.pointerType==='pen')},LONGPRESS_MS)}},true);
document.addEventListener('pointermove',ev=>{if(lp&&Math.hypot(ev.clientX-lp.x0,ev.clientY-lp.y0)>10){clearTimeout(lp.t);lp=null}},true);
document.addEventListener('pointerup',()=>{if(lp){clearTimeout(lp.t);lp=null}if(holdTouch){holdTouch=false;closeInspect()}},true); // touch: releasing the finger closes the enlarged card
document.addEventListener('pointercancel',()=>{cancelLongPress();if(holdTouch){holdTouch=false;closeInspect()}},true);
// Desktop hover-hold: resting the mouse on a card (1.5 s in the hand, 0.9 s elsewhere) enlarges it, like right-click.
document.addEventListener('pointerover',ev=>{if(ev.pointerType!=='mouse')return;clearTimeout(hh);hh=0;const c=ev.target.closest&&ev.target.closest('.card');if(!c||c.closest('#inspect,#cardtip,.cslot.lift')||ev.buttons)return;
 const hand=!!c.closest('.hand');hh=setTimeout(()=>{hh=0;if(!c.isConnected||!c.matches(':hover')||drag||(hand&&(c.classList.contains('sel')||c.classList.contains('drag')))||(W.cb&&W.cb.busy&&hand))return;inspectNow(c,false)},hand?1500:900)},true);
document.addEventListener('pointerdown',()=>{clearTimeout(hh);hh=0},true);
document.addEventListener('pointerout',ev=>{if(ev.pointerType==='mouse'&&(!ev.relatedTarget||!ev.relatedTarget.closest||ev.relatedTarget.closest('.card')!==ev.target.closest('.card'))){clearTimeout(hh);hh=0}},true);
document.addEventListener('click',ev=>{if(eatClick){eatClick=false;ev.stopPropagation();ev.preventDefault()}},true);
document.addEventListener('contextmenu',ev=>{const c=ev.target.closest&&ev.target.closest('.card');if(!c||c.closest('#inspect'))return;ev.preventDefault();inspectNow(c)});
document.addEventListener('pointerdown',ev=>{const c=ev.target.closest&&ev.target.closest('.hand .card');if(!c||!W.cb||W.cb.busy||W.cb.mode||W.S.ov)return;
 if(ev.button!=null&&ev.button>0)return;drag={el:c,i:+c.dataset.i,x0:ev.clientX,y0:ev.clientY,id:ev.pointerId,moved:false,bx:+c.dataset.x||0,by:+c.dataset.y||0};
 peekCard(c);
 try{c.setPointerCapture(ev.pointerId)}catch(_){}});
export let rafPending=null;
document.addEventListener('pointermove',ev=>{const d=drag;if(!d||ev.pointerId!==d.id)return;if(d.moved)ev.preventDefault();rafPending=ev;if(d.raf)return;d.raf=requestAnimationFrame(()=>{d.raf=0;if(drag===d&&rafPending)dragMove(d,rafPending)})},{passive:false});
export function dragMove(d,ev){const dx=ev.clientX-d.x0,dy=ev.clientY-d.y0;
 if(!d.moved){if(dy>-38){scrubAt(ev.clientX);return}clearPeek();cancelLongPress();d.moved=true;d.el.classList.remove('sel');d.el.classList.add('drag');W.cb.sel=null;const t=document.getElementById('detail');if(t)t.remove()}
 d.el.style.transform=`translate(${d.bx+dx}px,${d.by+dy+(+d.el.dataset.ly||0)*.6}px) scale(${Math.max(1.12,(+d.el.dataset.zl||1.2)*.75).toFixed(3)})`;
 const ci=W.cb.hand[d.i];const en=enemyAt(ev.clientX,ev.clientY);showOutcome(d.i,en==null?W.cb.tgt:en);document.querySelectorAll('.en.hot').forEach(x=>x.classList.remove('hot'));
 const handTop=document.getElementById('hand').getBoundingClientRect().top;const up=ev.clientY<handTop-20;
 if(ci&&needsTarget(ci)){if(en!=null)document.querySelector(`.en[data-en="${en}"]`).classList.add('hot');document.querySelector('.foes').classList.toggle('armed',en==null&&up)}
 d.el.classList.toggle('armed',ci&&(needsTarget(ci)?en!=null:up))}
export function endDrag(ev,cancel){const d=drag;if(!d||ev.pointerId!==d.id)return;drag=null;clearPeek();if(d.raf)cancelAnimationFrame(d.raf);
 if(cancel||!W.cb){if(W.cb)render();return}
 if(!d.moved)return tapCard(d.i);
 const ci=W.cb.hand[d.i];const en=enemyAt(ev.clientX,ev.clientY);const handTop=document.getElementById('hand').getBoundingClientRect().top;const up=ev.clientY<handTop-20;
 if(ci&&canPlay(ci)){if(needsTarget(ci)){let t=en;if(t==null&&up&&alive().length===1)t=W.cb.ens.indexOf(alive()[0]);if(t!=null&&W.cb.ens[t].hp>0){W.cb.tgt=t;return playCard(d.i)}}
  else if(up)return playCard(d.i)}
 render()}
document.addEventListener('pointerup',ev=>endDrag(ev,false));
document.addEventListener('pointercancel',ev=>endDrag(ev,true));
addEventListener('resize',()=>{if(W.S.screen==='combat'&&!drag)requestAnimationFrame(()=>render())});// figure positions are viewport px


// Stable resting centres, independent of the enlarged card's hit box and pointer capture.
let peek=null;
function clearPeek(){peek=null;document.querySelectorAll('.hand .card.peek,.hand .card.peek-neighbour').forEach(c=>{c.classList.remove('peek','peek-neighbour');c.style.removeProperty('--x')});if(W.S.screen==='combat')layoutHand();clearOutcome()}
function peekCard(c){if(peek===c)return;clearPeek();peek=c;c.classList.add('peek');
 const cards=[...document.querySelectorAll('.hand .card')],i=cards.indexOf(c);
 cards.forEach((el,k)=>{if(Math.abs(k-i)===1){el.classList.add('peek-neighbour');el.style.setProperty('--x',(+el.dataset.x+(k<i?-12:12))+'px')}});
 showOutcome(+c.dataset.i);
}
function scrubAt(x){const hand=document.getElementById('hand');if(!hand)return;
 const centre=hand.getBoundingClientRect().left+hand.clientWidth/2;
 const cards=[...hand.querySelectorAll('.card')];const c=cards.sort((a,b)=>Math.abs(centre+(+a.dataset.x)-x)-Math.abs(centre+(+b.dataset.x)-x))[0];
 if(c){peekCard(c);if(drag){drag.el=c;drag.i=+c.dataset.i;drag.bx=+c.dataset.x;drag.by=+c.dataset.y}}
}
document.addEventListener('pointermove',ev=>{if(ev.pointerType!=='mouse'||drag)return;const hand=document.getElementById('hand');if(!hand)return;const r=hand.getBoundingClientRect();if(ev.clientY>=innerHeight*.65&&ev.clientX>=r.left&&ev.clientX<=r.right&&W.cb&&!W.cb.busy&&!W.cb.mode)scrubAt(ev.clientX);else if(peek)clearPeek()});
