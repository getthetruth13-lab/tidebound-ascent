// data/cards/kit.js — small content-side helpers shared by the Phase 2 card modules (no engine changes).
// Everything here composes the public engine API (combat.js exports, the bus, the f effect context).
import {W,pick} from '../../core/state.js';
import {CARDS} from '../../core/registry.js';
import {mod,fire,thisTurn,forCombat} from '../../core/bus.js';
import {cname} from '../../engine/cards.js';
import {alive,hit,log,callout,floatText,addSt,choose,pickSlot,removeWp,CORE} from '../../engine/combat.js';
export const TI=CORE.tide,EC=CORE.echo,CA=CORE.carto,DU=CORE.duel;
export const cb=()=>W.cb;
// Power stacks (replaying a Power stacks inst.n).
export const stacks=inst=>inst&&inst.n||1;
// Cards played this turn BEFORE the current one (during an Echo: every card played this turn).
export const playedBefore=()=>W.cb.stat.playedTurn;
// A choice. Echoes (end of turn) and Mimic Ink replays can't open a menu: an Echo repeats the option the player picked when the card
// was played this turn (Chime, Ping, Mirror Step); anything else takes a seeded random option.
export function ask(f,title,opts){opts=opts.filter(Boolean);if(!opts.length)return;if(opts.length===1&&opts[0].auto){return opts[0].f()}
 const ci=f.ci,turn=W.cb.turn,key=title.replace(/:.*$/,'');
 if(f.echo||W.cb.mode||W.cb.ending){const last=f.echo&&ci&&ci._askPick&&ci._askPick.turn===turn&&ci._askPick.key===key?ci._askPick:null;
  const o=last&&(opts.find(x=>x.l===last.l)||(opts.length===last.n?opts[last.i]:null));if(o){log('🔔 '+key+': '+o.l);return o.f()}
  const r=pick(opts,'combat');log('🎲 '+key+': '+r.l);return r.f()}
 choose(title,opts.map((o,i)=>({...o,f:(...a)=>{if(ci)ci._askPick={turn,key,l:o.l,i,n:opts.length};return o.f(...a)}})))}
// Run fn after this card has fully resolved (after the engine's own Momentum step, etc.). Echoes run it at once.
export function afterPlay(f,fn){if(f.echo||!W.cb)return fn();const ci=f.ci;thisTurn({id:'afterPlay',on:{cardPlayed(inst,ctx){if(inst.dead||ctx.card!==ci)return;inst.dead=true;fn(ctx)}}})}
// Snapshot of the Tide counters around an action: did it cause a Crest / Undertow / Tideturn?
export function tideWatch(fn){const s=W.cb.stat,c=s.crests,u=s.undertows,t=s.tideturnsTurn;const r=fn();
 return {reached:r,crest:!!W.cb&&W.cb.stat.crests>c,undertow:!!W.cb&&W.cb.stat.undertows>u,tideturn:!!W.cb&&W.cb.stat.tideturnsTurn>t}}
// Parry from a non-card source (Powers, Matador...): same 'parry' modifier pipeline as f.parry.
export function addParry(n,src){const c=W.cb;const p=Math.floor(mod('parry',{card:src||null,f:null},n));if(p<=0)return 0;c.parry+=p;floatText('p','Parry '+p,'b');return p}
// Bleed with feedback (status pipeline: Rebuff, 'applyStatus' modifiers such as Open Veins, cap 20).
export function bleed(t,n){if(!t||t.hp<=0||n<=0)return;const was=t.st.bleed||0;addSt(t,'bleed',n);const got=(t.st.bleed||0)-was;if(got>0)floatText(t.uid,'🩸+'+got,'bleed')}
// Non-Attack damage to one/all enemies from a Power, Waypoint or Tide effect (Exposed applies; Might / Flourish don't).
export function zap(e,n,f){if(!e||e.hp<=0)return 0;return hit(e,n+((f&&f.rankDmg)||0),f||null,{raw:true})}
export function zapAll(n,f){alive().forEach(e=>zap(e,n,f))}
export const lowest=()=>alive().sort((a,b)=>a.hp-b.hp)[0];
// Destroy one of your Waypoints (you choose). then(w|null). Echo / auto: a random slot.
export function destroyWp(f,title,then,{optional=false}={}){const c=W.cb;if(!c.slots.length){if(then)then(null);return}
 const go=i=>{const w=removeWp(i,'destroyed');if(w){log('💥 '+cname(w)+' destroyed');floatText('p','💥 '+CARDS[w.id].n,'')}if(then)then(w)};
 if(f.echo||c.ending||c.mode){go(pick([...c.slots.keys()],'combat'));return}
 if(optional){choose(title,[{l:'🛡️ Keep my Waypoints: destroy nothing',tile:'choice-keep',f:()=>{if(then)then(null)}},...c.slots.map((w,i)=>({l:'💥 Destroy '+(CARDS[w.id].e||'')+' '+cname(w)+((w.rank||0)?' (Rank '+w.rank+')':''),card:{id:w.id,up:w.up,rank:w.rank},cap:'💥 Destroy'+((w.rank||0)?' · Rank '+w.rank:''),f:()=>go(i)}))]);return}
 pickSlot(title,go)}
// A Waypoint gains +1 Rank outside the free Advance (Grand Expedition, Waystation): same feedback and 'advance' event.
export function rankUp(w,why){const c=W.cb;if(!w||!c.slots.includes(w)||(w.rank||0)>=CA.rank_max)return false;w.rank=(w.rank||0)+1;c.stat.advances++;w.advT=Date.now();
 log(`⛰️ ${why?why+': ':''}${cname(w)} → Rank ${w.rank}${w.rank>=CA.rank_max?' (LANDMARK)':''}`);callout(w.rank>=CA.rank_max?'LANDMARK!':'Advance → Rank '+w.rank,'adv');
 fire('advance',{wp:w,slot:c.slots.indexOf(w),card:true});return true}
// Turn-scoped and combat-scoped listeners (re-exported for card modules).
export {thisTurn,forCombat,callout,log,floatText};
