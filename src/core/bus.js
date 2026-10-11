// Event bus + modifier pipeline (design/content-impl-plan.md §2 and §4.2; design/content-hook-map.json).
//   fire(event, ctx)       notify every listener source, e.g. fire('turnStart',{turn})
//   mod(name, ctx, value)  pass a value through every modifier, e.g. dmg=mod('damage',{target,f},dmg)
// Listener sources, in this fixed order:
//   1. turn-scoped effects  W.cb.fx[]     ({on:{...},mod:{...}} objects; cleared at end of the player's turn)
//   2. relics               W.run.relics  ({id,n,used,...} instances, in pickup order) -> RELICS[id]
//   3. charms               W.run.charms  (ids) -> CHARMS[id]   (run-long event modifiers, design §V.7)
//   4. Powers in play       W.cb.powers   ({id,up,n}; replaying a Power stacks n) -> CARDS[id]
//   5. Waypoints in slots   W.cb.slots -> CARDS[id]
//   6. cards in hand        W.cb.hand -> CARDS[id]   (only for HAND_EVENTS / HAND_MODS)
//   7. passive potions      W.run.potions -> POTIONS[id]
// A def listens with  on:{turnStart(inst,ctx,src){...}}  and modifies with  mod:{cost(inst,ctx,value,src){return value-1}}.
// Event names are the hook names without the "on" prefix, in lowerCamelCase (onTurnStart -> 'turnStart').
// The full list of events and modifiers the engine fires is in README.md ("Engine hooks").
import {W} from './state.js';
import {CARDS,RELICS,POTIONS,CHARMS} from './registry.js';
export const HAND_EVENTS=new Set(['turnEndInHand','whileInHand']);
export const HAND_MODS=new Set(['cost','canPlay']);
export function sources(event){const out=[],cb=W.cb,run=W.run;
 if(cb&&cb.fx)for(const l of cb.fx)if(!l.dead)out.push({kind:'turn',def:l,inst:l});
 if(run&&run.relics)for(const r of run.relics){const def=RELICS[typeof r==='string'?r:r.id];if(def)out.push({kind:'relic',def,inst:r})}
 if(run&&run.charms)for(const c of run.charms){const def=CHARMS[c];if(def)out.push({kind:'charm',def,inst:c})}
 if(cb&&cb.powers)for(const p of cb.powers){const def=CARDS[p.id];if(def)out.push({kind:'power',def,inst:p})}
 if(cb&&cb.slots)for(const w of cb.slots){const def=CARDS[w.id];if(def)out.push({kind:'waypoint',def,inst:w})}
 if(cb&&cb.hand&&(HAND_EVENTS.has(event)||HAND_MODS.has(event)))for(const c of cb.hand){const def=CARDS[c.id];if(def)out.push({kind:'hand',def,inst:c})}
 if(run&&run.potions)for(const id of run.potions){const def=id&&POTIONS[id];if(def&&(def.on||def.mod))out.push({kind:'potion',def,inst:id})}
 return out}
const observers=new Set(),replayObservers=new WeakSet();
export function observeEvents(listener,{replay=false}={}){observers.add(listener);if(replay)replayObservers.add(listener);return ()=>observers.delete(listener)}
export function fire(event,ctx={}){if(W.previewing)ctx.preview=true;for(const s of sources(event)){const h=s.def.on&&s.def.on[event];if(h)h(s.inst,ctx,s);if(ctx.cancel)break}if(!W.previewing)for(const listener of observers){if(W.replaying&&!replayObservers.has(listener))continue;try{listener(event,ctx)}catch(e){console.warn("Event observer failed",e)}}return ctx}
export function mod(name,ctx,value){for(const s of sources(name)){const h=s.def.mod&&s.def.mod[name];if(h){const v=h(s.inst,ctx,value,s);if(v!==undefined)value=v}}return value}
// Turn-scoped listener helper: thisTurn({on:{cardPlayed(){...}}}) — expires at end of the player's turn.
export function thisTurn(listener){if(W.cb)W.cb.fx.push(listener);return listener}
// Combat-scoped listener (expires when the combat ends): forCombat({on:{...}})
export function forCombat(listener){if(W.cb){listener.combat=true;W.cb.fx.push(listener)}return listener}
