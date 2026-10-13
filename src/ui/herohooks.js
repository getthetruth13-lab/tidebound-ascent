// ui/herohooks.js: per-hero UI slot registry (Task 67, FUN-REDESIGN 9.1). The hero plate asks the hook of the current hero for each slot;
// the hero steps 1-4 (Duelist, Tidecaller, Echo Mage, Cartographer) call registerHeroHook(cls,{...}) to plug in their own readouts
// without touching render.js. Slots (all optional, each gets the live combat `cb`):
//   ability(cb)   -> {html, info}  the compact ability readout shown on the plate (read by looking, not by reading)
//   info(cb)      -> string        extra hold/tap text for the plate popup (only what is not already visible)
//   intentTick(cb,enemy) -> "on" | "short" | ""  Clean Answer tick state (unwired in Step 0)
// Step 0 supplies the readouts for today's rules (no hero rule is changed here).
import {CARDS} from '../core/registry.js';
import {cname} from '../engine/cards.js';
import {echoPlan,echoPreview,CORE,bankOn} from '../engine/combat.js';
import {mod} from '../core/bus.js';
const HOOKS={};
export function registerHeroHook(cls,hook){HOOKS[cls]={...(HOOKS[cls]||{}),...hook}}
export const heroHook=cls=>HOOKS[cls]||{};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

// Tide forecast (FUN-REDESIGN 9.3): the next two drifts under the CURRENT rules. Pure: reads the meter, the arrow, Moonlock and drift mods.
// Returns [{to,ev}] where ev is 'crest' | 'undertow' | 'hold' | ''. A Crest or Undertow resets the meter to 5 (arrow flips, as in combat).
export function tideForecast(cb,n=2){const out=[];if(!cb||cb.tideDir===undefined)return out;
 let t=cb.tide,dir=cb.tideDir,hold=cb.holdDrift,banks=cb.banks||0,capped=!!cb.capped;const banking=bankOn();
 for(let i=0;i<n;i++){
  if(banking&&banks>=3){banks=0;if(t>=10){t=mod('crest',{preview:true,cause:'bank'},{dmg:CORE.tide.crest_dmg,resetTo:5}).resetTo;if(CORE.tide.flip_after_reset)dir=-1;capped=false}}
  if(!dir){out.push({to:t,ev:'hold'});continue}
  if(hold){hold=false;out.push({to:t,ev:'hold'});continue}
  let ev='';
  for(let k=0,count=mod('driftCount',{preview:true},1);k<count;k++){
   t+=dir*mod('drift',{preview:true},CORE.tide.drift);
   if(t>=10){if(banking){if(!capped){banks=Math.min(3,banks+1);capped=true}t=10;ev='bank'}else{ev='crest';t=mod('crest',{preview:true,cause:'drift'},{dmg:CORE.tide.crest_dmg,resetTo:5}).resetTo;if(CORE.tide.flip_after_reset)dir=-1}}
   else if(t<=0){ev='undertow';t=mod('undertow',{preview:true,cause:'drift'},{guard:CORE.tide.undertow_blk,draw:CORE.tide.undertow_draw,resetTo:5}).resetTo;if(CORE.tide.flip_after_reset)dir=1}
   if(t<10)capped=false;
  }
  out.push({to:t,ev})}
 return out}
// Bell ring preview (9.4): what each Marked card will repeat for at the end of this turn under the current rules.
export function ringPreview(cb){const out=[];if(!cb)return out;let remaining=Math.max(0,CORE.echo.cap-(cb.stat?.echoesTurn||0));
 for(const slot of [1,2]){let plan=echoPlan(true,slot);if(!plan||!remaining||!plan.repeats)continue;plan={...plan,repeats:Math.min(plan.repeats,remaining)};remaining-=plan.repeats;
  const pv=echoPreview(plan);const name=cname(plan.card),tg=plan.tgt&&plan.tgt.hp>0?plan.tgt.n:(plan.allTargets?'ALL':'a random foe');
  out.push({name,kind:pv?pv.kind:null,n:pv?pv.n:null,repeats:plan.repeats,tgt:tg,half:!!plan.half,slot})}
 return out}

const arrow=d=>d>0?'↑':d<0?'↓':'·';
registerHeroHook('tide',{ability:cb=>{const f=tideForecast(cb),dir=cb.tideDir;
 const fc=f.map(x=>x.ev==='hold'?'—':x.ev==='crest'?'Crest':x.ev==='undertow'?'Under':x.ev==='bank'?'Bank':x.to).join(' › ');
 return {html:'', // v0.6.2.1: the Tide gauge above the orb already shows the Tide; a second number here read as a stray "3."

  info:`Tide ${cb.tide}${dir?(dir>0?', rising':', falling'):''}.${dir&&cb.turn>=1?' Next drifts, before other Tide effects: '+f.map(x=>x.ev==='hold'?'none (held)':x.ev==='crest'?'Crest':x.ev==='undertow'?'Undertow':x.ev==='bank'?'Bank':x.to).join(', then ')+'.':''}`}}});
registerHeroHook('echo',{ability:cb=>{const r=ringPreview(cb);
 const cap=CORE.echo.cap,used=cb.stat?cb.stat.echoesTurn:0;
 return {html:`<b class="hp-n">${r.reduce((a,x)=>a+x.repeats,0)}</b><span class="hp-fc">of ${Math.max(0,cap-used)}</span>`,
  info:r.length?'Rings at end of turn: '+r.map(x=>`${x.name} ${x.n!=null?'about '+x.n+(x.kind==='blk'?' Guard':' to '+x.tgt):'repeats'}${x.repeats>1?' ×'+x.repeats:''}`).join('; ')+'.':'Nothing is Marked. Rings at end of turn: none.'}}});
registerHeroHook('carto',{ability:cb=>{const s=(cb.slots||[]).filter(Boolean);
 return {html:`<b class="hp-n">${s.length}</b><span class="hp-fc">${s.map(w=>(w.rank||0)).join(' ')}</span>`,info:s.length?'Waypoints in play: '+s.map(w=>`${CARDS[w.id]?.n||w.id} (Rank ${w.rank||0})`).join(', ')+'.':'No Waypoints in play.'}}});
registerHeroHook('duel',{ability:cb=>({html:`<b class="hp-n">${cb.mom||0}</b><span class="hp-fc">of ${mod('momMax',{},CORE.duel.mom_max)}</span>`,info:`Momentum ${cb.mom||0}. Fades by 1 at the end of your turn.`})});
