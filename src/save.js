// save.js
import {W} from './core/state.js';
import {render} from './ui/render.js';
import {VERSION} from '../version.js';
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
// Fields older saves may lack get the same defaults newRun() gives (a missing one used to crash the next event / unknown room / map step).
const RUN_DEFAULTS=()=>({seenEvents:{},shrinesThisAct:{},seenRelics:{},charms:[],encHist:[],vis:{},removals:0,fights:0,rareNext:false,kills:0,floor:0,act:1,potionChance:40,swell:-4,qOdds:{fight:12,shop:4,treasure:3}});
const STAT_DEFAULTS=()=>({floors:0,kills:0,elites:[0,0,0],bosses:0,goldEarned:0,maxHit:0,maxCardsTurn:0,cardsPlayed:0,path:[],potionsUsed:0,relicsAtBoss:null,potionsAtBoss:null,startT:Date.now()});
export const migrateRun=run=>{if(!run)return run;for(const c of run.deck||[])if(c.lvl==null)c.lvl=c.up?1:0;
 const d=RUN_DEFAULTS();for(const k in d)if(run[k]==null)run[k]=d[k];
 if(!run.qOdds||typeof run.qOdds!=='object')run.qOdds=d.qOdds;else for(const k in d.qOdds)if(run.qOdds[k]==null)run.qOdds[k]=d.qOdds[k];
 if(!run.stats||typeof run.stats!=='object')run.stats={};const sd=STAT_DEFAULTS();for(const k in sd)if(run.stats[k]==null)run.stats[k]=sd[k];
 if(!run.bosses&&run.boss)run.bosses={1:run.boss};
 return run};
function write(){if(checkpoint&&W.run&&!W.run.won&&W.run.hp>0)safeSet(RUN_KEY,{v:5,gv:VERSION,t:Date.now(),run:W.run,checkpoint,journal})}
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
// Save version gate (review item 17): saves are a replay journal, so a rules change can break a mid-fight replay. A save written by a build older than
// COMPAT_FLOOR (or with no stamp) is resumed from its last map checkpoint without replaying the journal. Raise COMPAT_FLOOR whenever a release changes rules.
export const COMPAT_FLOOR='0.6.54';
const vnum=v=>String(v||'0').split('.').map(n=>parseInt(n,10)||0);
export function versionBefore(a,b){const x=vnum(a),y=vnum(b);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)<(y[i]||0)}return false}
export const saveIsOld=d=>!!d&&versionBefore(d.gv||'0.0.0',COMPAT_FLOOR);
export function loadRunData(){const d=safeGet(RUN_KEY);return d&&(d.v===2||d.v===3||d.v===4||d.v===5)&&d.run&&!d.run.won&&d.run.hp>0?d:null}
// Win-screen state (Continue to Act 2/3): the run is cleared at a win, so the winning snapshot is kept under its own key until the player continues or leaves the win screen.
const WIN_KEY='tidebound.win.v1';
export function saveWin(snap){if(W.previewing||!snap)return;safeSet(WIN_KEY,{v:1,t:Date.now(),to:snap.to,uid:snap.uid,run:snap.run})}
export function loadWin(){const d=safeGet(WIN_KEY);return d&&d.v===1&&(d.to===2||d.to===3)&&d.run&&d.run.won&&typeof d.run.cls==='string'&&Array.isArray(d.run.deck)&&Array.isArray(d.run.relics)?d:null}
export function clearWin(){if(W.previewing)return;try{localStorage.removeItem(WIN_KEY)}catch(_){}}
export function clearRun(){if(W.previewing)return;checkpoint=null;journal=[];try{localStorage.removeItem(RUN_KEY)}catch(_){}}
export function continueRun(){
 const d=loadRunData();if(!d)return false;
 const oldFast=window.FAST,clock=Date.now,old={run:W.run,cb:W.cb,S:W.S,uid:W.uid};
 try{
  const base=d.v>=3?d.checkpoint:{run:d.run,uid:d.uid};
  const R=base&&base.run;if(!R||typeof R.cls!=='string'||!Array.isArray(R.map)||!R.map.length||!Array.isArray(R.deck)||!Array.isArray(R.relics)||!R.pos||typeof R.pos!=='object')throw Error('Damaged save');
  migrateRun(base.run);W.run=clone(base.run);W.uid=base.uid||1;W.cb=null;W.S={screen:'map'};
  W.replaying=true;window.FAST=1;
  const oldSave=saveIsOld(d);
  for(const action of oldSave?[]:d.journal||[]){
   const fn=actions.get(action.name);if(!fn)throw Error('Unknown saved action '+action.name);
   Date.now=()=>action.t;
   if(W.cb&&action.context)Object.assign(W.cb,action.context);
   fn(...action.args);
  }
  checkpoint=clone(base);journal=oldSave?[]:d.journal||[];W.oldSaveNote=oldSave;
 }catch(e){Object.assign(W,old);console.warn('Could not restore run:',e);return false}
 finally{Date.now=clock;window.FAST=oldFast;W.replaying=false}
 if(W.S.screen==='end')clearRun();
 if(W.oldSaveNote){W.oldSaveNote=false;W.toasts=(W.toasts||[]);W.toasts.push({txt:'Saved by an older version: resumed from your last map step',cls:'',t:Date.now()})}
 try{render()}catch(e){Object.assign(W,old);console.warn('Could not draw the restored run:',e);return false}
 return true;
}
