import {W} from '../core/state.js';
import {previewCard} from '../engine/preview.js';
import {iconOf} from './combatant.js';
import {showMeterPreview,clearMeterPreview} from './classdais.js';
const names={weak:'Soaked',vuln:'Exposed',brittle:'Brittle',drench:'Drenched',reson:'Resonating',bleed:'Bleed',str:'Might',dex:'Poise',sink:'Sink'};
export function clearOutcome(){document.querySelectorAll('.outcome').forEach(e=>e.remove());clearMeterPreview()}
export function showOutcome(i,target=W.cb?.tgt){
 clearOutcome();if(W.S.screen!=='combat')return;
 const result=previewCard(i,target);if(!result)return;showMeterPreview(result);
 const paint=(bar,d)=>{if(!bar)return;const layer=document.createElement('span');layer.className='outcome'+(d.lethal?' lethal':'');
  const max=+bar.dataset.max||1, hp=+bar.dataset.hp||0;
  layer.innerHTML=(d.loss?`<i class="outcome-chunk" style="left:${Math.max(0,hp-d.loss)/max*100}%;width:${Math.min(hp,d.loss)/max*100}%"></i>`:'')+
   `<b class="outcome-label">${d.lethal?'Lethal':d.loss||d.guardLoss||d.playerLoss||d.playerHeal?'HP → '+(d.playerHp??Math.max(0,hp-(d.loss||0))):''}</b>`+
   `<span class="outcome-status">${Object.entries(d.statuses||{}).map(([k,n])=>`<span title="${names[k]||k}">${iconOf(k)}+${n}</span>`).join('')}</span>`;
  bar.appendChild(layer);
  const change=d.guardLoss?-d.guardLoss:d.guard||0;
  if(change){const shield=bar.querySelector('.hpblk');if(shield){const ghost=document.createElement('span');ghost.className='outcome guard-preview';ghost.textContent=' → '+Math.max(0,(+bar.dataset.blk||0)+change);shield.appendChild(ghost)}else{const ghost=document.createElement('span');ghost.className='outcome guard-preview new-guard';ghost.textContent='Guard '+change;bar.appendChild(ghost)}}
 };
 for(const e of result.enemies)if(e.loss||e.guardLoss||Object.keys(e.statuses).length)paint(document.querySelector(`.hpbar[data-who="e${e.uid}"]`),e);
 if(result.guard||result.playerLoss||result.playerHeal||Object.keys(result.statuses).length)paint(document.querySelector('.hero .hpbar'),result);
}
