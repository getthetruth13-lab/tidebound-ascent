// engine/lamplight.js: earns Lamplight during a run and settles it into the profile when the run ends (design/progression-proposal.md §2.2).
// A bus observer watches the same events the cards use, so no combat code is touched. Run state lives in run.lamp (saved with the run):
//   {fights,elites,boss,firsts:['enemy:slug',...],tasks:[{id,done}],settled,summary}
import {W,hash32} from '../core/state.js';
import {observeEvents} from '../core/bus.js';
import {CARDS,CLASSES} from '../core/registry.js';
import {DATA} from '../data/generated/data-v2.js';
import {EARN,LAMP_XP,CLIMB_XP} from '../data/lamplight.js';
import {loadProfile,saveProfile,lockedFor,barOf,lampPending,climbPending} from '../progress.js';
const CORE=DATA.v21.sim.core;
// ================= Lantern Tasks: short optional goals, 3 per run (1 any-class + 2 for your class) =================
// Each trigger is called with the event context and the live combat's tracker `t` (cb.lamp); it returns true when the goal is met.
const stat=()=>W.cb&&W.cb.stat||{};
export const TASKS={
 nodmg:{cls:'any',n:'Win a fight without taking damage',ev:{combatEnd:(c,t)=>c.won&&!c.escaped&&t&&t.minHp>=t.hp0}},
 potions3:{cls:'any',n:'Win an elite fight holding 3 potions',ev:{combatEnd:c=>c.won&&c.kind==='elite'&&W.run.potions.filter(Boolean).length>=3}},
 quick:{cls:'any',n:'Win a fight in 2 turns or fewer',ev:{combatEnd:c=>c.won&&!c.escaped&&W.cb.turn<=2}},
 bighit:{cls:'any',n:'Deal 25 or more damage in one hit',ev:{damageDealt:c=>c.amount>=25}},
 cards7:{cls:'any',n:'Play 7 cards in one turn',ev:{cardPlayed:c=>c.nThisTurn>=7}},
 crest3:{cls:'tide',n:'Crest 3 times in one fight',ev:{crest:()=>stat().crests>=3}},
 lowtide:{cls:'tide',n:'Win a fight while the Tide is Low',ev:{combatEnd:c=>c.won&&!c.escaped&&W.cb.tide<=CORE.tide.low}},
 tideturn3:{cls:'tide',n:'Turn the Tide 3 times in one turn',ev:{tideTurn:c=>c.nThisTurn>=3}},
 undertow2:{cls:'tide',n:'Undertow twice in one fight',ev:{undertow:()=>stat().undertows>=2}},
 echo3:{cls:'echo',n:'Echo 3 times in one turn',ev:{echo:()=>stat().echoesTurn>=3}},
 echokill:{cls:'echo',n:'Kill an enemy with an Echo',ev:{enemyKilled:c=>!!(c.f&&c.f.echo)}},
 echobig:{cls:'echo',n:'Deal 18 or more with one Echo hit',ev:{damageDealt:c=>!!(c.f&&c.f.echo)&&c.amount>=18}},
 wp3r2:{cls:'carto',n:'Have 3 Waypoints at Rank 2 or higher at once',ev:{advance:()=>W.cb.slots.filter(w=>(w.rank||0)>=2).length>=3}},
 landmark:{cls:'carto',n:'Raise a Waypoint to a Landmark',ev:{advance:c=>(c.wp.rank||0)>=CORE.carto.rank_max}},
 noadv:{cls:'carto',n:'Win a 3+ turn fight without Advancing',ev:{combatEnd:c=>c.won&&!c.escaped&&W.cb.turn>=3&&!stat().advances}},
 flourish30:{cls:'duel',n:'Flourish for 30 or more in one hit',ev:{damageDealt:c=>!!(c.f&&c.f.flourish)&&c.amount>=30}},
 bleed10:{cls:'duel',n:'Put 10 Bleed on one enemy',ev:{statusApplied:c=>c.key==='bleed'&&!c.player&&(c.target.st.bleed||0)>=10}},
 parry3:{cls:'duel',n:'Parry 3 times in one fight',ev:{parry:(c,t)=>t&&(t.parries=(t.parries||0)+1)>=3}}};
// Live progress [have, goal] for the counting tasks while a fight is on (null = a yes/no task). Shown on the Lantern Tasks cards.
export function taskProgress(id){const cb=W.cb;if(!cb)return null;const st=cb.stat||{},t=cb.lamp||{};const m={crest3:[st.crests,3],undertow2:[st.undertows,2],echo3:[st.echoesTurn,3],parry3:[t.parries,3]}[id];return m?[Math.min(m[0]||0,m[1]),m[1]]:null}
// 1 any-class task + 2 for the class. Own seeded rng (never the run's streams), so tasks never change maps, rewards or rolls.
export function rollTasks(cls,seed){let a=hash32(seed+'|tasks');const rnd=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
 const pick=l=>l.splice(Math.floor(rnd()*l.length),1)[0];const mine=Object.keys(TASKS).filter(k=>TASKS[k].cls===cls),any=Object.keys(TASKS).filter(k=>TASKS[k].cls==='any');
 return [pick(any),pick(mine),pick(mine)].map(id=>({id,done:false}))}
// ================= run hooks =================
export function initRun(run){run.lamp={fights:0,elites:0,boss:0,firsts:[],tasks:rollTasks(run.cls,run.seed),settled:false}}
export const hasLamp=()=>!!(W.run&&W.run.lamp&&!W.run.lamp.settled);
// First time ever meeting an enemy / event / item: worth Lamplight once (committed to the profile when the run settles).
export function noteSeen(kind,id){const L=W.run&&W.run.lamp;if(!L||L.settled||id==null)return;const key=kind+':'+id;if(L.firsts.includes(key))return;
 if(loadProfile().seen[kind]&&loadProfile().seen[kind][id])return;L.firsts.push(key)}
function taskDone(task){task.done=true;const T=TASKS[task.id];try{const a=W.toasts=(W.toasts||[]).filter(t=>Date.now()-t.t<2600);a.push({txt:`🏮 Lantern Task: ${T.n} (+${EARN.task})`,cls:'relic',t:Date.now()})}catch(_){}}
function onEvent(event,ctx){const run=W.run,L=run&&run.lamp;if(!L||L.settled)return;const cb=W.cb;
 if(event==='combatStart'){cb.lamp={hp0:run.hp,minHp:run.hp};for(const e of ctx.enemies)noteSeen('enemy',e.key)}
 const t=cb&&cb.lamp;if(t&&run.hp<t.minHp)t.minHp=run.hp;
 if(event==='combatEnd'&&ctx.won&&!ctx.escaped){if(ctx.kind==='elite')L.elites++;else if(ctx.kind==='boss')L.boss++;else L.fights++}
 else if(event==='relicGained')noteSeen('relic',ctx.relic.id);
 else if(event==='gainCard')noteSeen('card',ctx.card.id);
 for(const task of L.tasks){if(task.done)continue;const h=TASKS[task.id]&&TASKS[task.id].ev[event];if(!h)continue;let ok=false;try{ok=h(ctx,t)}catch(_){}if(ok)taskDone(task)}}
observeEvents(onEvent);
// ================= settle =================
// Called once by endRun. Adds the run's Lamplight to the class Lamp and the Stair Climb, commits first-time sightings, and keeps an itemised summary for the end screen.
export function settleRun(run,won){const L=run.lamp;if(!L||L.settled)return L&&L.summary||null;
 const p=loadProfile(),cls=run.cls;L.settled=true;
 const floors=Math.max(0,Math.min(15,run.floor||0)),tasksDone=L.tasks.filter(t=>t.done),newFirsts=L.firsts.filter(k=>{const [kind,id]=k.split(':');return !(p.seen[kind]&&p.seen[kind][id])});
 const lines=[{k:'floors',label:`Floors reached (${floors})`,pts:floors*EARN.floor},{k:'fights',label:`Fights won (${L.fights})`,pts:L.fights*EARN.fight},
  {k:'elites',label:`Elites felled (${L.elites})`,pts:L.elites*EARN.elite},{k:'boss',label:'Tide-bell silenced',pts:L.boss*EARN.boss},{k:'win',label:'Act 1 cleared',pts:won?EARN.win:0},
  {k:'firsts',label:`First sightings (${newFirsts.length})`,pts:newFirsts.length*EARN.first},{k:'tasks',label:`Lantern Tasks (${tasksDone.length}/${L.tasks.length})`,pts:tasksDone.length*EARN.task}].filter(l=>l.pts>0);
 let sub=lines.reduce((a,l)=>a+l.pts,0);const mults=[];
 const tm=run.tidemark||0;if(tm>0){mults.push({label:`Tidemark ${tm}`,x:1+EARN.tidemark*tm})}
 if((p.runs[cls]||0)<EARN.earlyRuns)mults.push({label:'Early climbs +50%',x:EARN.earlyBonus});
 let total=sub;for(const m of mults)total*=m.x;total=Math.round(total);
 const before={lamp:p.xp[cls]||0,climb:p.climb||0};
 p.xp[cls]=before.lamp+total;p.climb=before.climb+total;p.runs[cls]=(p.runs[cls]||0)+1;if(won)p.wins[cls]=(p.wins[cls]||0)+1;p.tasks+=tasksDone.length;
 for(const k of newFirsts){const [kind,id]=k.split(':');(p.seen[kind]||(p.seen[kind]={}))[id]=1}
 p.best[cls]=Math.max(p.best[cls]||0,total);saveProfile(p);
 L.summary={cls,won:!!won,floor:floors,lines,mults,sub,total,before,after:{lamp:p.xp[cls],climb:p.climb},
  lampBar:{from:barOf(before.lamp,LAMP_XP),to:barOf(p.xp[cls],LAMP_XP)},climbBar:{from:barOf(before.climb,CLIMB_XP),to:barOf(p.climb,CLIMB_XP)},
  lampPending:lampPending(p,cls),climbPending:climbPending(p),tasks:L.tasks.map(t=>({id:t.id,n:TASKS[t.id].n,done:t.done}))};
 return L.summary}
