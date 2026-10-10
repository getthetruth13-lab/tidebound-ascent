// Presentation-only combat observer. Persistent ghosts survive synchronous render replacement.
import {W} from '../core/state.js';
import {CARDS} from '../core/registry.js';
import {observeEvents} from '../core/bus.js';
import {playSound} from '../audio.js';
import {settings} from '../save.js';
import {cardHTML} from './render.js';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const enabled=()=>!window.FAST&&!reduced()&&settings.envFx!=='off'&&!document.hidden;
let pending=[],combat=null;
const enemy=e=>e&&W.cb?`.en[data-en="${W.cb.ens.indexOf(e)}"]`:null;
function ghost(selector,kind){const source=selector&&document.querySelector(selector);if(!source)return;
 const fig=source.querySelector('.fig'),r=(fig||source).getBoundingClientRect();
 const el=document.createElement('div');el.className=`action-ghost ${kind}`;el.setAttribute('aria-hidden','true');
 Object.assign(el.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
 if(fig){el.appendChild(fig.cloneNode(true));el.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));el.querySelectorAll('.fig').forEach(n=>{n.className='fig';n.style.animation='none'})}
 document.body.appendChild(el);el.addEventListener('animationend',e=>{if(e.target===el)el.remove()});setTimeout(()=>el.remove(),580);
}
function effect(selector,kind,col){const source=selector&&document.querySelector(selector);if(!source)return;
 const r=source.getBoundingClientRect(),el=document.createElement('i');el.className=`combat-action ${kind}`;el.setAttribute('aria-hidden','true');
 Object.assign(el.style,{left:r.left+r.width/2+'px',top:r.top+r.height*.5+'px'});if(col)el.style.setProperty('--action-color',col);
 document.body.appendChild(el);setTimeout(()=>el.remove(),580);
}
function queue(selector,kind){if(selector)pending.push({selector,kind,t:performance.now()})}
observeEvents((event,c)=>{if(!enabled()||!W.cb||W.S.screen!=='combat')return;
 const cls=W.run.cls,target=enemy(c.target||c.enemy),hero='#hero';
 if(event==='beforeCardPlay'){
  const d=CARDS[c.card.id];queue(hero,d.t==='A'?'strike':'cast');
  effect(d.t==='A'?enemy(c.f.tgt)||hero:hero,{tide:'wave',echo:'rings',carto:'quill',duel:d.t==='A'?'slash':'spark'}[cls]);
 }
 if(event==='crest'||event==='undertow'){effect(hero,event);playSound(event==='crest'?'heavy':'guard')}
 if(event==='echo'){
  effect(hero,'rings');ghost(hero,'echo-replay');playSound('play');
  // Recreate the actual echoed card, including its art, without interactive attributes.
  const holder=document.createElement('div');holder.innerHTML=cardHTML(c.card);const card=holder.firstElementChild;
  if(card){const g=card.cloneNode(true);g.querySelectorAll('*').forEach(n=>{for(const a of [...n.attributes])if(a.name.startsWith('on'))n.removeAttribute(a.name)});for(const a of [...g.attributes])if(a.name.startsWith('on')||a.name.startsWith('data-'))g.removeAttribute(a.name);
   g.className+=' echo-card';g.setAttribute('aria-hidden','true');document.body.appendChild(g);setTimeout(()=>g.remove(),550)}
 }
 if(event==='flourish'){effect(enemy(c.f.tgt)||hero,'flourish');playSound('heavy')}
 if(event==='parry'){effect(hero,'spark');playSound('guard')}
 if(event==='waypointPlaced'||event==='waypointTrigger'||event==='advance'){
  effect(hero,event==='advance'&&(c.wp.rank||0)>=3?'landmark':'waypoint');
  if(event==='advance')playSound('guard');
 }
 if(event==='guardGained')effect(hero,'guard','var(--status-block,#5fa3ea)');
 if(event==='statusApplied'){const bad=['weak','vuln','brittle','soaked','bleed','sink','drench','reson'].includes(c.key)?c.n>0:c.n<0;
  effect(c.player?hero:enemy(c.target),'pulse',bad?'var(--status-debuff,#e48a3c)':'var(--status-buff,#5cc98a)')}
 if(event==='damageDealt'&&c.amount>0)queue(target,'flinch');
 if(event==='playerDamaged')queue(hero,'flinch');
 if(event==='playerAttacked')queue(target,'enemy-strike');
 if(event==='enemyKilled')ghost(enemy(c.enemy),'death-sink');
});
export function syncCombatAnimations(){
 const active=W.S.screen==='combat'&&W.cb;
 document.body.classList.toggle('combat-motion',!!active&&enabled());
 if(combat!==W.cb){combat=W.cb;pending=[]}
 if(!enabled()){pending=[];document.querySelectorAll('.combat-action,.action-ghost,.echo-card').forEach(n=>n.remove());return}
 if(!active){pending=[];return}
 document.querySelectorAll('.hero .spr-slot,.en .spr-slot').forEach((el,i)=>{
  const key=el.closest('.en')?.dataset.key||W.run.cls;let hash=0;for(const c of key)hash+=c.charCodeAt(0);
  el.style.setProperty('--idle-phase',`-${(Date.now()+hash*17+i*719)%(3800+hash%1700)}ms`);
  el.style.setProperty('--idle-period',`${3800+hash%1700}ms`);
 });
 for(const {selector,kind,t} of pending){const el=document.querySelector(selector+' .fig');if(!el||performance.now()-t>550)continue;
  const dir=kind==='enemy-strike'?-1:1;
  const frames=kind==='flinch'?[{translate:'0 0'},{translate:`${-dir*5}px 0`,offset:.22},{translate:'0 0'}]:kind==='cast'?[{rotate:'0deg'},{rotate:'-2deg',offset:.35},{rotate:'0deg'}]:[{translate:'0 0'},{translate:`${dir*16}px -2px`,offset:.3},{translate:'0 0'}];
  el.animate(frames,{duration:kind==='cast'?430:330,easing:'ease-out'});
 }
 pending=[];
}
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncCombatAnimations);
