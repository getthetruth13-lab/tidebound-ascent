import {W} from '../core/state.js';
import {previewCard} from '../engine/preview.js';
import {iconOf} from './combatant.js';
import {clearMeterPreview} from './classdais.js';
// Every prediction belongs to one transient layer. It never edits the real HUD.
export function clearOutcome(){document.querySelectorAll('#combat-preview,.outcome').forEach(e=>e.remove());clearMeterPreview()}
export function showOutcome(i,target=W.cb?.tgt){
 clearOutcome();if(W.S.screen!=='combat')return;
 const result=previewCard(i,target);if(!result)return;
 const root=document.createElement('div');root.id='combat-preview';root.dataset.card=W.cb.hand[i]?.uid;root.dataset.turn=W.cb.turn;const combat=W.cb,turn=W.cb.turn;
 const watch=()=>{if(!root.isConnected)return;if(W.cb!==combat||W.S.screen!=='combat'||combat.turn!==turn||combat.busy||combat.mode){clearOutcome();return}requestAnimationFrame(watch)};requestAnimationFrame(watch);
 Object.assign(root.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'35'});document.body.appendChild(root);
 const paint=(bar,d)=>{if(!bar)return;const r=bar.getBoundingClientRect(),layer=document.createElement('span');layer.className='outcome'+(d.lethal?' lethal':'');
 Object.assign(layer.style,{position:'absolute',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
 const max=+bar.dataset.max||1,hp=+bar.dataset.hp||0;
 layer.innerHTML=(d.loss?`<i class="outcome-chunk" style="left:${Math.max(0,hp-d.loss)/max*100}%;width:${Math.min(hp,d.loss)/max*100}%"></i>`:'')+
 `<b class="outcome-label">${d.lethal?'Lethal':d.loss||d.guardLoss||d.playerLoss||d.playerHeal?'HP → '+(d.playerHp??Math.max(0,hp-(d.loss||0))):''}</b>`+
 `<span class="outcome-status">${Object.entries(d.statuses||{}).map(([k,n])=>`<span>${iconOf(k)}+${n}</span>`).join('')}</span>`;
 const change=d.guardLoss?-d.guardLoss:d.guard||0;
 if(change)layer.innerHTML+=`<span class="guard-preview new-guard">Guard → ${Math.max(0,(+bar.dataset.blk||0)+change)}</span>`;
 root.appendChild(layer)};
 for(const e of result.enemies)if(e.loss||e.guardLoss||Object.keys(e.statuses).length)paint(document.querySelector(`.hpbar[data-who="e${e.uid}"]`),e);
 if(result.guard||result.playerLoss||result.playerHeal||Object.keys(result.statuses).length)paint(document.querySelector('.hero .hpbar'),result);
 const meter=document.querySelector('#dais');const key={tide:'tide',duel:'mom'}[W.run.cls];
 if(meter&&key&&result.meter&&result.meter[key]!==W.cb[key]){const r=meter.getBoundingClientRect(),label=document.createElement('b');label.className='outcome meter-preview';label.textContent='→ '+result.meter[key];Object.assign(label.style,{left:r.left+'px',top:r.bottom+'px',width:r.width+'px',height:'20px'});root.appendChild(label)}
}
