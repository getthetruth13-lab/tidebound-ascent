import {W} from '../core/state.js';
import {previewCard} from '../engine/preview.js';
import {iconOf} from './combatant.js';
import {clearMeterPreview} from './classdais.js';
import {orbGhost} from './hud-panel.js';
// clovis/hud: painted-bar restyle (EFFECTS.md C16). Same data flow; painted dmg/heal/block digits, skull for lethal, Guard crack.
const D='art/v2/hud/d-';
const digits=(n,style)=>`<span class="pdig pd-${style}" aria-hidden="true">${String(n).split('').map(ch=>`<img src="${D}${style}-${ch==='+'?'plus':ch==='-'?'minus':ch}.png" alt="">`).join('')}</span>`;
let prediction=null,watchFrame=0;
// Capture stable HUD rectangles once per drag, before transform writes.
export const healDigits=(n,age=0)=>`<span class="healpop" style="animation-delay:${300-age}ms">${digits('+'+n,'heal')}</span>`; // negative delay after re-renders: the pop never restarts
export function outcomeLayout(){return new Map([...document.querySelectorAll('.hpbar,#dais')].map(el=>[el,el.getBoundingClientRect()]))}
// Every prediction belongs to one transient layer. It never edits the real HUD.
export function clearOutcome(){cancelAnimationFrame(watchFrame);watchFrame=0;prediction=null;document.querySelectorAll('#combat-preview,.outcome').forEach(e=>e.remove());clearMeterPreview();orbGhost(null)}
export function showOutcome(i,target=W.cb?.tgt,layout=null){
 if(W.S.screen!=='combat'){clearOutcome();return}
 const result=previewCard(i,target);if(!result){clearOutcome();return}
 const signature=JSON.stringify([W.cb.hand[i]?.uid,W.cb.turn,result]);
 if(prediction?.combat===W.cb&&prediction.key===signature&&prediction.root.isConnected)return;
 clearOutcome();
 const root=document.createElement('div');root.id='combat-preview';root.dataset.card=W.cb.hand[i]?.uid;root.dataset.turn=W.cb.turn;const combat=W.cb,turn=W.cb.turn;
 prediction={combat,key:signature,root};
 const watch=()=>{if(!root.isConnected)return;if(W.cb!==combat||W.S.screen!=='combat'||combat.turn!==turn||combat.busy||combat.mode){clearOutcome();return}watchFrame=requestAnimationFrame(watch)};watchFrame=requestAnimationFrame(watch);
 Object.assign(root.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'35'});document.body.appendChild(root);
 const paint=(bar,d)=>{if(!bar)return;const r=layout?.get(bar)||bar.getBoundingClientRect(),layer=document.createElement('span');layer.className='outcome'+(d.lethal?' lethal':'');
 Object.assign(layer.style,{position:'absolute',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
 const max=+bar.dataset.max||1,hp=+bar.dataset.hp||0;
 const loss=d.loss||d.playerLoss||0,heal=d.playerHeal||0,blk=+bar.dataset.blk||0;
 layer.innerHTML=(d.loss?`<i class="outcome-chunk" style="left:${Math.max(0,hp-d.loss)/max*100}%;width:${Math.min(hp,d.loss)/max*100}%"></i>`:'')+
 (heal?`<i class="outcome-heal" style="left:${hp/max*100}%;width:${Math.min(max-hp,heal)/max*100}%"></i>`:'')+
 (loss&&!d.lethal?`<span class="outcome-dmg" style="left:${Math.max(0,hp-Math.min(hp,loss)/2)/max*100}%">${digits(Math.min(hp,loss),'dmg')}</span>`:'')+
 (heal?`<span class="outcome-dmg" style="left:${Math.min(100,(hp+heal/2)/max*100)}%">${digits('+'+heal,'heal')}</span>`:'')+
 (d.lethal?`<img class="outcome-skull" src="art/v2/hud/elite-skull.webp" alt="" style="left:${Math.max(0,hp-Math.min(hp,loss||hp)/2)/max*100}%">`:'')+
 (d.guardLoss&&blk?`<i class="outcome-crack${d.guardLoss>=blk?' broken':''}"></i>`:'')+
 `<b class="outcome-label">${d.lethal?'<span class="sr-only">Lethal</span>':d.loss||d.guardLoss||d.playerLoss||d.playerHeal?'HP → '+(d.playerHp??Math.max(0,hp-(d.loss||0))):''}</b>`+
 `<span class="outcome-status">${Object.entries(d.statuses||{}).map(([k,n])=>`<span>${iconOf(k)}+${n}</span>`).join('')}</span>`;
 const change=d.guardLoss?-d.guardLoss:d.guard||0;
 if(change)layer.innerHTML+=`<span class="guard-preview new-guard">Guard → ${Math.max(0,(+bar.dataset.blk||0)+change)}${digits((change>0?'+':'-')+Math.abs(change),'block')}</span>`;
 root.appendChild(layer)};
 for(const e of result.enemies)if(e.loss||e.guardLoss||Object.keys(e.statuses).length)paint(document.querySelector(`.hpbar[data-who="e${e.uid}"]`),e);
 if(result.guard||result.playerLoss||result.playerHeal||Object.keys(result.statuses).length)paint(document.querySelector('.hero .hpbar'),result);
 const meter=document.querySelector('#dais');const key={tide:'tide',duel:'mom'}[W.run.cls];
 if(key&&result.meter&&result.meter[key]!==W.cb[key])orbGhost(result.meter[key]);
 else if(W.run.cls==='carto'||W.run.cls==='echo')orbGhost(null);
 if(meter&&key&&result.meter&&result.meter[key]!==W.cb[key]){const r=layout?.get(meter)||meter.getBoundingClientRect(),label=document.createElement('b');label.className='outcome meter-preview';label.textContent='→ '+result.meter[key];Object.assign(label.style,{left:r.left+'px',top:r.bottom+'px',width:r.width+'px',height:'20px'});root.appendChild(label)}
}
