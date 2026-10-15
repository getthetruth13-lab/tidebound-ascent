// Scene integration only: keep combat rules and future character idles independent.
import {ENV,CARDS} from '../core/registry.js';
import {W} from '../core/state.js';
import {observeEvents} from '../core/bus.js';
import {envKeyFor,quality,govQuality,FEET,fightFeet} from './env.js';
export {FEET,fightFeet};
import {settings} from '../save.js';
import {motionOn} from './vfx.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const PROFILES={
 a1_shore:{grade:'saturate(.88) brightness(.94)',light:-1,haze:.08},
 a1_cloister:{grade:'saturate(.82) brightness(.90)',light:-1,haze:.10},
 a1_bellcourt:{grade:'saturate(.90) sepia(.08) brightness(.96)',light:1,haze:.07},
 a1_lair_row:{grade:'saturate(.88) brightness(.93)',light:1,haze:.09},
 a1_lair_kelp:{grade:'saturate(.83) brightness(.88)',light:-1,haze:.11}
};
export function stageProfile(){const id=envKeyFor().id,e=ENV.envs[id]||{};return {grade:'saturate(.88) brightness(.93)',light:-1,haze:.08,...PROFILES[id],rim:e.rim||'#8fa3c7',air:e.tint?.col||e.pal?.[1]||'#587c83'}}
// Perspective size of figures on this background (design/environments.json: scale, boss_scale).
export function figureScale(boss){const e=ENV.envs[envKeyFor().id]||{};return (boss?e.boss_scale??e.scale:e.scale)||1}
export function stageAtmosphereHTML(front){return `<div class="stage-air ${front?'front':'back'}" aria-hidden="true"><i class="stage-mist"></i>${Array.from({length:front?4:6},(_,i)=>`<i class="stage-spray" style="--i:${i};left:${15+i*13}%;top:${front?47+i%2*3:38+i%3*4}%"></i>`).join('')}</div>`}
export function syncStage(){const scene=document.querySelector('.combat .scene');if(!scene)return;const p=stageProfile();
 scene.style.setProperty('--stage-grade',p.grade);scene.style.setProperty('--stage-rim',p.rim);scene.style.setProperty('--stage-air',p.air);scene.style.setProperty('--stage-haze',p.haze);scene.style.setProperty('--stage-light',p.light+'px');
 scene.classList.toggle('stage-still',reduced.matches||settings.reduceMotion||quality()!=='full');scene.classList.toggle('stage-off',quality()==='off');}
let camera=[];
function pushCamera(){if(document.querySelector('#env[data-still]'))return;if(!motionOn()||govQuality()!=='full')return;
 camera.forEach(a=>a.cancel());camera=[];
 // Animate only painted layers (via each layer's .envSh wrapper: env.js owns the layer's own transform, drift and slide-in), leaving text, targets and mechanic controls stationary.
 document.querySelectorAll('#env .envL,#env-front .envL').forEach(layer=>{const el=layer.firstElementChild;if(!el)return;const f={sky:.25,far:.4,mid:.65,ground:.85,fg:1}[layer.dataset.l]||.5;
 camera.push(el.animate([{scale:'1'},{scale:String(1+.018*f),offset:.35},{scale:'1'}],{duration:420,easing:'ease-out'}));});}
observeEvents((event,c)=>{if(W.S.screen!=='combat')return;
 if((event==='beforeCardPlay'&&CARDS[c.card.id]?.t==='A')||(event==='enemyAct'&&c.intent?.a))pushCamera();
 if((event==='damageDealt'&&c.hpLoss>=c.target?.max*.25)||(event==='playerHit'&&c.amount>=W.run.max*.15))shakeLayers();
});

export function shakeLayers(){if(document.querySelector('#env[data-still]'))return;if(!motionOn()||govQuality()!=='full')return;
 document.querySelectorAll('#env .envL,#env-front .envL').forEach(layer=>{const el=layer.firstElementChild;if(!el)return;const f={sky:.2,far:.35,mid:.6,ground:.8,fg:1}[layer.dataset.l]||.5;el.animate([{translate:'0px'},{translate:`${2*f}px -1px`,offset:.2},{translate:`${-f}px 0px`,offset:.5},{translate:'0px'}],{duration:260,easing:'ease-out'});});}
reduced.addEventListener('change',()=>{camera.forEach(a=>a.cancel());camera=[];syncStage()});
