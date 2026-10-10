// Transactional dry run of the real card-play pipeline. UI observers and combat
// completion are suspended; the full state graph is restored in finally.
import {W} from '../core/state.js';
import {canPlay,playCard,endTurn} from './combat.js';
// Restore each original object in place, so existing hook closures keep their
// card/target identity and every seeded stream, counter and pile is rolled back.
function journal(root){const seen=new Map();
 const visit=o=>{if(!o||typeof o!=='object'||seen.has(o))return;const d=Object.getOwnPropertyDescriptors(o);seen.set(o,d);for(const x of Object.values(d))if('value' in x)visit(x.value)};
 visit(root);return ()=>{for(const [o,d] of seen){for(const k of Reflect.ownKeys(o))if(!(k in d))delete o[k];Object.defineProperties(o,d)}};
}
export function previewCard(i,target=W.cb?.tgt,opts={}){
 if(!W.cb||W.cb.busy||W.cb.mode||W.previewing||!W.cb.hand[i])return null;
 const restore=journal(W);
 try{
  W.previewing=true;W.cb.tgt=target;
  if(!canPlay(W.cb.hand[i]))return null;
  const before=W.cb.ens.map(e=>({uid:e.uid,hp:e.hp,block:e.block,st:{...e.st}}));
  const playerHp=W.run.hp,guard=W.cb.p.block,st={...W.cb.p.st};
  playCard(i,{...opts});if(W.cb.previewEndTurn)endTurn();
  const delta=(a,b)=>Object.fromEntries(Object.entries(b).filter(([k,n])=>n>(a[k]||0)).map(([k,n])=>[k,n-(a[k]||0)]));
  return {enemies:before.map(e=>{const after=W.cb.ens.find(a=>a.uid===e.uid)||e;
   return {uid:e.uid,hp:e.hp,max:after.max,loss:Math.max(0,e.hp-after.hp),guardLoss:Math.max(0,e.block-after.block),lethal:after.hp<=0,statuses:delta(e.st,after.st)};
  }),playerHp:W.run.hp,playerLoss:Math.max(0,playerHp-W.run.hp),playerHeal:Math.max(0,W.run.hp-playerHp),guard:Math.max(0,W.cb.p.block-guard),statuses:delta(st,W.cb.p.st),pending:!!W.cb.mode};
 }finally{restore()}
}
