// save.js
import {W} from './core/state.js';
import {render} from './ui/render.js';
// Local persistence: the current run (saved at every map screen) and settings.
const RUN_KEY='tidebound.run.v2',SET_KEY='tidebound.settings.v1';
export const settings=Object.assign({fastAnim:false,envFx:'full'},safeGet(SET_KEY)||{});
function safeGet(k){try{return JSON.parse(localStorage.getItem(k))}catch(_){return null}}
function safeSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
export function saveSettings(){safeSet(SET_KEY,settings)}
export function saveRun(){if(!W.run)return;safeSet(RUN_KEY,{v:2,t:Date.now(),uid:W.uid,run:W.run})}
export function loadRunData(){const d=safeGet(RUN_KEY);return d&&d.v===2&&d.run&&!d.run.won&&d.run.hp>0?d:null}
export function clearRun(){try{localStorage.removeItem(RUN_KEY)}catch(_){}}
export function continueRun(){const d=loadRunData();if(!d)return false;W.run=d.run;W.uid=Math.max(W.uid,d.uid||1);W.cb=null;W.S={screen:'map'};render();return true}
