// Transactional dry run of the real card-play pipeline. UI observers and combat
// completion are suspended; the full state graph is restored in finally.
import {W} from '../core/state.js';
import {canPlay,playCard,endTurn} from './combat.js';
// Restore each original object in place, so existing hook closures keep their
// card/target identity and every seeded stream, counter and pile is rolled back.
// A50: `skip` objects (the run map: combat never writes it) are left out, so each drag preview journals only the live combat/run state.
export function journal(root,skip=[]){const seen=new Map(),no=new Set(skip.filter(Boolean));
 const visit=o=>{if(!o||typeof o!=='object'||seen.has(o)||no.has(o))return;const d=Object.getOwnPropertyDescriptors(o);seen.set(o,d);for(const x of Object.values(d))if('value' in x)visit(x.value)};
 visit(root);journal.last=seen.size;return ()=>{for(const [o,d] of seen){for(const k of Reflect.ownKeys(o))if(!(k in d))delete o[k];Object.defineProperties(o,d)}};
}
export function previewCard(i,target=W.cb?.tgt,opts={}){
 if(!W.cb||W.cb.busy||W.cb.mode||W.previewing||!W.cb.hand[i])return null;
 const restore=journal(W,[W.run&&W.run.map]);
 try{
  W.previewing=true;W.cb.tgt=target;
  if(!canPlay(W.cb.hand[i]))return null;
  const before=W.cb.ens.map(e=>({uid:e.uid,hp:e.hp,block:e.block,st:{...e.st}}));
  const playerHp=W.run.hp,guard=W.cb.p.block,st={...W.cb.p.st},crest0=W.cb.stat.crests,under0=W.cb.stat.undertows,flourish0=W.cb.stat.flourishes;
  playCard(i,{...opts});if(W.cb.previewEndTurn)endTurn();
  const cb=W.cb,meter={tide:cb.tide,mom:cb.mom,parry:cb.parry,mark:!!cb.mark,mark2:!!cb.mark2,after:cb.afterMark,after2:cb.after2,slots:(cb.slots||[]).filter(Boolean).length,waypoints:(cb.slots||[]).map(w=>w?{uid:w.uid,id:w.id,rank:w.rank||0}:null),crest:cb.stat.crests>crest0,undertow:cb.stat.undertows>under0,flourish:cb.stat.flourishes>flourish0};
  const delta=(a,b)=>Object.fromEntries(Object.entries(b).filter(([k,n])=>n>(a[k]||0)).map(([k,n])=>[k,n-(a[k]||0)]));
  return {enemies:before.map(e=>{const after=W.cb.ens.find(a=>a.uid===e.uid)||e;
   return {uid:e.uid,hp:e.hp,max:after.max,loss:Math.max(0,e.hp-after.hp),guardLoss:Math.max(0,e.block-after.block),lethal:after.hp<=0,statuses:delta(e.st,after.st)};
  }),playerHp:W.run.hp,playerLoss:Math.max(0,playerHp-W.run.hp),playerHeal:Math.max(0,W.run.hp-playerHp),guard:Math.max(0,W.cb.p.block-guard),statuses:delta(st,W.cb.p.st),pending:!!W.cb.mode,meter};
 }finally{restore()}
}
