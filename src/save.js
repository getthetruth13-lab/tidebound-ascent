// save.js
import {W} from './core/state.js';
import {render} from './ui/render.js';
// Map checkpoint plus deterministic room actions preserves callback-based choices.
const RUN_KEY='tidebound.run.v2',SET_KEY='tidebound.settings.v1';
export const settings=Object.assign({fastAnim:false,envFx:'full',musicVolume:.35,sfxVolume:.55,audioMuted:false,reduceMotion:false,screenShake:true,charselParallax:true},safeGet(SET_KEY)||{});
function safeGet(k){try{return JSON.parse(localStorage.getItem(k))}catch(_){return null}}
function safeSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
export function saveSettings(){safeSet(SET_KEY,settings)}
const actions=new Map();let checkpoint=null,journal=[],depth=0;
export function registerSaveActions(mod){for(const [name,fn] of Object.entries(mod))if(typeof fn==='function')actions.set(name,fn)}
const clone=v=>JSON.parse(JSON.stringify(v));
// v5: later acts (run.act 1-3, run.bosses, per-act map). Older saves are Act 1 and load unchanged.
// v4: card instances carry lvl (multi-level Temper). Older saves have only up:true, which is level 1.
export const migrateRun=run=>{for(const c of (run&&run.deck)||[])if(c.lvl==null)c.lvl=c.up?1:0;return run};
function write(){if(checkpoint&&W.run&&!W.run.won&&W.run.hp>0)safeSet(RUN_KEY,{v:5,t:Date.now(),run:W.run,checkpoint,journal})}
export function saveRun(){
 if(W.replaying||W.previewing||depth||!W.run||W.S.screen==='end'||W.S.screen==='title')return;
 if(W.S.screen==='map'||W.S.screen==='travel'){
  checkpoint=clone({run:W.run,uid:W.uid});journal=[];write();
 }else write();
}
// Record the outermost player action before mutation. A killed app during an
// enemy animation completes that committed turn once, with the same seeded rolls.
export function savedAction(name,args,fn){
 if(W.replaying||W.previewing||depth||!checkpoint)return fn();
 const cb=W.cb,context=cb?{tgt:cb.tgt,sel:cb.sel,armMark:cb.armMark,armFlourish:cb.armFlourish}:null;
 const recorded=args.slice();while(recorded.length&&recorded[recorded.length-1]===undefined)recorded.pop();
 journal.push({name,args:clone(recorded),context,t:Date.now()});write();depth++;
 try{return fn()}finally{depth--;saveRun()}
}
export function loadRunData(){const d=safeGet(RUN_KEY);return d&&(d.v===2||d.v===3||d.v===4||d.v===5)&&d.run&&!d.run.won&&d.run.hp>0?d:null}
export function clearRun(){if(W.previewing)return;checkpoint=null;journal=[];try{localStorage.removeItem(RUN_KEY)}catch(_){}}
export function continueRun(){
 const d=loadRunData();if(!d)return false;
 const oldFast=window.FAST,clock=Date.now,old={run:W.run,cb:W.cb,S:W.S,uid:W.uid};
 try{
  const base=d.v>=3?d.checkpoint:{run:d.run,uid:d.uid};
  const R=base&&base.run;if(!R||typeof R.cls!=='string'||!Array.isArray(R.map)||!R.map.length||!Array.isArray(R.deck)||!Array.isArray(R.relics)||!R.pos||typeof R.pos!=='object')throw Error('Damaged save');
  migrateRun(base.run);W.run=clone(base.run);W.uid=base.uid||1;W.cb=null;W.S={screen:'map'};
  W.replaying=true;window.FAST=1;
  for(const action of d.journal||[]){
   const fn=actions.get(action.name);if(!fn)throw Error('Unknown saved action '+action.name);
   Date.now=()=>action.t;
   if(W.cb&&action.context)Object.assign(W.cb,action.context);
   fn(...action.args);
  }
  checkpoint=clone(base);journal=d.journal||[];
 }catch(e){Object.assign(W,old);console.warn('Could not restore run:',e);return false}
 finally{Date.now=clock;window.FAST=oldFast;W.replaying=false}
 if(W.S.screen==='end')clearRun();
 try{render()}catch(e){Object.assign(W,old);console.warn('Could not draw the restored run:',e);return false}
 return true;
}
