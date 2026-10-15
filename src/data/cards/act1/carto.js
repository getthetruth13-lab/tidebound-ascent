// data/cards/act1/carto.js — Cartographer Act 1 pool behaviour (cards-act1). Owned by ONE worker; see CARDS_ACT1_HANDOFF.md.
// Source of truth: FULL-CARD-POOL.md 3.A.1 + rule 31. Register new ids with card(), reworked ids with redef().
// Shared caps (rules 22-23): Cartographer Energy family (Mill Wheel, Scorch the Map) max 2 bonus Energy a turn;
// Cartographer passive draws (Lookout Post, Planned Collapse) max 3 a turn.
import {W,pick} from '../../../core/state.js';
import {CARDS} from '../../../core/registry.js';
import {card,redef} from '../loader.js';
import {cname,mk} from '../../../engine/cards.js';
import {alive,randAlive,drawCards,gainEnergy,bonusEnergy,passiveDraw,addCard,handLimit,trigWp,removeWp,placeWp,refill,isJunk,sinkCard,choose,CORE} from '../../../engine/combat.js';
import {ask,log,floatText,callout,zap,zapAll,rankUp} from '../kit.js';
const RMAX=CORE.carto.rank_max;
const R=(id,o)=>redef('carto',id,o);
const N=(id,o)=>card('carto',id,o);
// ---- helpers ----
const perTurn=(key)=>{const cb=W.cb;const s=cb.flags[key]||(cb.flags[key]={t:-1,n:0});if(s.t!==cb.turn){s.t=cb.turn;s.n=0}return s};
export function cartoEnergy(n,why){const k=bonusEnergy(n,'carto');if(k&&why)log('⚡ '+why+': +'+k+' Energy');return k}
export function cartoPassiveDraw(n,{startOfTurn=false}={}){return passiveDraw(n,'carto',{startOfTurn})}
const topType=()=>{const d=W.cb.draw[0];return d?CARDS[d.id].t:null};
const bearing=t=>{refill(1);return topType()===t};
const canRank=w=>(w.rank||0)<RMAX;
const wpLabel=w=>(CARDS[w.id].e||'')+' '+cname(w)+' (Rank '+(w.rank||0)+' → '+((w.rank||0)+1)+')';
// A card Advance (extra to the free one). then() after it resolves (also when nothing can Advance).
function cardAdvance(f,why,then){const ok=W.cb.slots.filter(canRank);if(!ok.length){log('⛰️ No Waypoint can Advance');then&&then();return}
 if(ok.length===1){rankUp(ok[0],why);then&&then();return}
 ask(f,why+': Advance which Waypoint?',ok.map(w=>({l:wpLabel(w),card:{id:w.id,up:w.up,rank:w.rank},cap:'Rank '+(w.rank||0)+' → '+((w.rank||0)+1),f:()=>{rankUp(w,why);then&&then()}})))}
// Trigger a Waypoint's standing line now (mid-turn): its start-of-turn draws happen at once.
function trigNow(w){const cb=W.cb;const was=cb.wpDraw;cb.wpDraw=0;trigWp(w);const d=cb.wpDraw;cb.wpDraw=was;if(d)drawCards(d)}
const commonWps=()=>Object.values(CARDS).filter(d=>d.cls==='carto'&&d.t==='W'&&d.r==='c'&&d.act1&&!d.cut&&!d.stub&&!(W.run&&W.run.lock&&W.run.lock.cards&&W.run.lock.cards[d.id]));
const freeSlot=()=>W.cb.slots.length<W.cb.nslots;
// Chart that stays valid if a draw happens while its menu is open (e.g. Planned Collapse drawing after Lookout Post's Decamp Chart).
function chartSafe(f,n,then){f.chart(n,then);const cb=W.cb;if(!cb||!cb.mode||cb.mode.k!=='chart')return;const m=cb.mode;
 f.thisTurn({id:'chartClamp',on:{draw(inst){if(W.cb.mode!==m){inst.dead=true;return}m.n=Math.min(m.n,W.cb.draw.length)}}})}
// Card-caused Decamp (not the free tap): the Waypoint leaves, its Decamp line fires.
const decampAt=i=>removeWp(i,'decamp');

// ---------------- Starters ----------------
R('signal',{e:'🔥',rk:{max:5},d:'At the start of your turn, deal {3|4|+1,1,0,0} to a random enemy. Decamp: deal {6|8|+} to a random enemy.',
 wp:f=>f.dmgRandom(f.r(3,4,'1,1,0,0')),decamp:f=>{f.dmgRandom(f.r(6,8));log('🔥 Decamp: Signal Fire')}});
R('bivouac',{e:'🏕️',rk:{max:5},d:'Gain {5|7|+} Guard, +{2|3} for each Waypoint. Expedition.',p:f=>f.blk(f.r(5,7)+f.v(2,3)*f.wpCount())});
R('cairn',{e:'🪨',rk:{max:5},d:'Enters at Rank 1. Does nothing while it stands. Decamp: draw {1|2}.{@2| Gain [0|0|+] Guard.}',wp:f=>{},
 on:{waypointPlaced(inst,ctx){if(ctx.wp===inst&&(inst.rank||0)<1)inst.rank=1}},
 decamp:f=>{drawCards(f.v(1,2));if(f.lvl>=2)f.blk(f.r(0,0));log('🪨 Decamp: Cairn, draw '+f.v(1,2))}});
// ---------------- Common ----------------
R('trail',{e:'🥾',d:'Deal {7|10}. Advance a Waypoint.',p:f=>{f.dmg(f.v(7,10));cardAdvance(f,'Trailblaze')}});
R('cache',{e:'📦',rk:{max:5},d:'At the start of your turn, gain {3|4|+1^8} Guard. Decamp: gain {6|8|+2} Guard.',wp:f=>f.blk(f.r(3,4,1,8)),decamp:f=>{f.blk(f.r(6,8,2));log('📦 Decamp: Supply Cache')}});
R('stake',{e:'📍',d:'At the start of your turn, deal {2|3} to ALL. Decamp: deal 6 to ALL.',wp:f=>zapAll(f.v(2,3),f),decamp:f=>{zapAll(6,f);log('📍 Decamp: Survey Stake, 6 to ALL')}});
R('lookout',{e:'🗼',d:'At the start of your turn, draw 1. Decamp: Chart 3.',wp:f=>cartoPassiveDraw(1,{startOfTurn:true}),decamp:f=>chartSafe(f,3)});
R('waymarker',{e:'🪧',d:'Turn start: if your top draw card is an Attack, deal {4|5} to a random enemy; if a Skill, gain {4|5} Guard. Decamp: Chart 3, gain 4 Guard.',
 wp:f=>{refill(1);const t=topType();if(t==='A')f.dmgRandom(f.v(4,5));else if(t==='S')f.blk(f.v(4,5))},decamp:f=>{f.blk(4);chartSafe(f,3)}});
R('compassrose',{e:'🧭',d:'Choose: gain {6|8} Guard; or Chart 4 and draw 1.',p:f=>ask(f,'Compass Rose',[{l:'Gain '+f.v(6,8)+' Guard',f:()=>f.blk(f.v(6,8))},{l:'Chart 4; draw 1',f:()=>chartSafe(f,4,()=>drawCards(1))}])});
R('scout',{e:'🔭',d:'Choose: deal {8|10}; or deal {4|6} and Bearing (Attack): draw 2.',tg:1,p:f=>{const b=bearing('A');ask(f,'Scout Ahead',[{l:'Deal '+f.v(8,10),f:()=>f.dmg(f.v(8,10))},{l:'Deal '+f.v(4,6)+(b?'; draw 2':' (no Bearing)'),f:()=>{f.dmg(f.v(4,6));if(b)f.draw(2)}}])}});
R('stakeclaim',{e:'🚩',d:'Deal {6|8}. If you have an empty slot, add a random common Waypoint to your hand; it costs 0 this turn.',
 p:f=>{f.dmg(f.v(6,8));if(!freeSlot())return;const d=pick(commonWps(),'combat');if(!d)return;addCard(d.id,'hand',{cost0Turn:true});log('🚩 Stake Claim: '+d.n+' (costs 0)');floatText('p','🚩 '+d.n,'')}});
R('rockfall',{e:'🪨',d:'Deal {14|17}. You may Decamp a Waypoint to deal {8|10} more.',tg:1,p:f=>{f.dmg(f.v(14,17));const cb=W.cb;if(!cb.slots.length||!W.cb)return;
 ask(f,'Rockfall: Decamp a Waypoint to deal '+f.v(8,10)+' more?',[{l:'🛡️ Keep my Waypoints',f:()=>{}},...cb.slots.map(w=>({l:'🔥 Decamp '+(CARDS[w.id].e||'')+' '+cname(w),card:{id:w.id,up:w.up,rank:w.rank},cap:'🔥 Decamp',f:()=>{const i=cb.slots.indexOf(w);if(i<0)return;decampAt(i);f.dmg(f.v(8,10))}}))])}});
// Fork in the Road: the path (A or B) is chosen when it is placed; an unchosen Fork (never placed by play) acts as A.
const forkPath=w=>w.fork||'A';
N('forkroad',{e:'🔀',d:'Choose when placed. A: turn start, deal {3|4} to a random enemy; Decamp: gain 8 Guard. B: turn start, gain {3|4} Guard; Decamp: deal 8 to a random enemy.',
 on:{waypointPlaced(inst,ctx){if(ctx.wp!==inst||inst.fork)return;const set=k=>{inst.fork=k;log('🔀 Fork in the Road: path '+k);floatText('p','🔀 Path '+k,'')};
  ask({echo:false},'Fork in the Road: choose a path',[{l:'A: start of turn deal '+(inst.up?4:3)+' to a random enemy; Decamp: gain 8 Guard',f:()=>set('A')},{l:'B: start of turn gain '+(inst.up?4:3)+' Guard; Decamp: deal 8 to a random enemy',f:()=>set('B')}])}},
 wp:f=>{if(forkPath(f.ci)==='A')f.dmgRandom(f.v(3,4));else f.blk(f.v(3,4))},
 decamp:f=>{if(forkPath(f.ci)==='A')f.blk(8);else f.dmgRandom(8);f.ci.fork=null}});
N('raisecairn',{e:'🪨',d:'Sink a Flotsam or Burden from your hand and place a Cairn (Rank 1) in a free slot, or replace one. If you have none, Chart 2 instead.{| Gain 3 Guard.}',
 p:f=>{const cb=W.cb;if(f.u)f.blk(3);const junk=cb.hand.filter(isJunk);if(!junk.length){chartSafe(f,2);return}
  const go=ci=>{const i=cb.hand.indexOf(ci);if(i<0)return;cb.hand.splice(i,1);sinkCard(ci,'raisecairn');log('🪨 Raise a Cairn: '+cname(ci)+' Sunk');placeWp(mk('cairn',false,{rank:0}))};
  if(junk.length===1){callout('SINK: '+cname(junk[0]),'adv');return go(junk[0])}ask(f,'Raise a Cairn: Sink which card?',junk.map(ci=>({l:(CARDS[ci.id].e||'')+' '+cname(ci),f:()=>go(ci)})))}});
// ---------------- Uncommon ----------------
R('landslide',{e:'⛰️',d:'Deal 8, +{2|3} for each Waypoint, to ALL. Expedition.',p:f=>f.all(8+f.v(2,3)*f.wpCount())});
R('waystation',{e:'🚉',d:'At the start of your turn, Advance another random Waypoint. Decamp: Advance each other Waypoint once.',
 wp:f=>{const ok=W.cb.slots.filter(x=>x!==f.ci&&canRank(x));if(ok.length)rankUp(pick(ok,'combat'),'Waystation')},
 decamp:f=>{const l=W.cb.slots.slice();l.forEach(w=>rankUp(w,'Waystation'))}});
N('gtraverse',{e:'🗺️',req:f=>W.cb.energy>=1,d:'Full Flame. Advance {X|X + 1} times, split as you like. Then trigger each Waypoint once. Sink.',
 p:f=>{if(!(f.x>=1)){log('🗺️ Grand Traverse: X is 0');return}const n=f.x+(f.u?1:0);
  const fin=()=>{if(!W.cb)return;W.cb.slots.slice().forEach(w=>{if(W.cb&&W.cb.slots.includes(w))trigNow(w)})};
  const step=k=>{if(k<=0||!W.cb.slots.some(canRank))return fin();cardAdvance(f,'Grand Traverse ('+k+' left)',()=>step(k-1))};step(n)}});
N('pilotseye',{e:'🧐',tg:1,d:'Chart {3|4}. If the top card is an Attack, deal 6 to a target you choose. If it is a Waypoint and you have a free slot, place it there for free.',
 p:f=>chartSafe(f,f.v(3,4),()=>{const cb=W.cb;const t=topType();if(t==='A')f.dmg(6);else if(t==='W'&&freeSlot()){const ci=cb.draw.shift();log('🧐 Pilot\'s Eye: '+cname(ci)+' placed for free');placeWp(ci)}})});
N('clearbrush',{e:'🌿',d:'Chart {3|4}. You may Sink one of them. Sink.',p:f=>{const n=f.v(3,4);chartSafe(f,n,()=>{const cb=W.cb;const seen=cb.draw.slice(0,n);if(!seen.length)return;
 ask(f,'Clear the Brush: Sink one?',[{l:'Sink nothing',f:()=>{}},...seen.map(ci=>({l:'Sink '+(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},f:()=>{const i=cb.draw.indexOf(ci);if(i<0)return;cb.draw.splice(i,1);sinkCard(ci,'clearbrush');log('🌿 '+cname(ci)+' Sunk')}}))])})}});
R('foreknow',{e:'🔮',tg:1,d:'Fleeting. If the top card of your draw pile is an Attack, deal {6|8}. If it is a Skill, gain {6|8} Guard. Then draw it. Sink.',
 p:f=>{refill(1);const t=topType();if(!t)return;if(t==='A')f.dmg(f.v(6,8));else if(t==='S')f.blk(f.v(6,8));drawCards(1)}});
R('longshot',{e:'🏹',moor:1,rk:{max:5},d:'Moor. Deal {16|19|+2,2,1,1}. Bearing (Attack): deal {24|28|+3,3,2,1} instead.',p:f=>{const b=bearing('A');if(b)floatText('p','🧭 Bearing!','');f.dmg(b?f.r(24,28,'3,3,2,1'):f.r(16,19,'2,2,1,1'))}});
R('burn',{e:'🔥',d:'Whenever one of your Waypoints leaves a slot, draw 1 and deal {5|6} to a random enemy (max 3 a turn).',
 power:{on:{decamp(inst,ctx){const cb=W.cb;if(!cb)return;if(inst.pcT!==cb.turn){inst.pcT=cb.turn;inst.pcN=0}if(inst.pcN>=3)return;inst.pcN++;
  cartoPassiveDraw(1);zap(randAlive(),inst.up?6:5,null);floatText('p','🔥 Planned Collapse','')}}}});
R('avalanche',{e:'🏔️',d:'Deal {6|7} to ALL for each Waypoint that has left a slot this combat (min 1).',p:f=>{const n=Math.max(1,W.cb.stat.wpLeft||0);f.all(f.v(6,7)*n);if(n>=3)callout('AVALANCHE ×'+n,'adv')}});
R('scorched',{e:'🔥',d:'Decamp all your Waypoints (their Decamp lines fire). Gain {4|5} Guard for each.',p:f=>{const cb=W.cb;const list=cb.slots.slice();let n=0;
 for(const w of list){if(!W.cb)return;const i=cb.slots.indexOf(w);if(i<0)continue;decampAt(i);n++}
 if(!n){log('🔥 Burnt Bridges: no Waypoints');return}callout('BURNT BRIDGES ×'+n,'adv');for(let k=0;k<n;k++)f.blk(f.v(4,5))}});
R('charge',{e:'🧨',d:'Does nothing while it stands. Decamp: deal {18|24} to ALL.',wp:f=>{},decamp:f=>{const n=f.v(18,24);callout('BOOM! '+(f.lm?n*2:n)+' to ALL','adv');zapAll(n,f)}});
R('millwheel',{e:'⚙️',d:'Every 2nd turn{| (every turn at Rank 2+)}, gain 1 Energy. Decamp: gain 1 Energy (once, even as a Landmark).',
 wp:f=>{const w=f.ci,t=W.cb.turn;if(w.mwT===t)return;w.mwT=t;w.mwN=(w.mwN||0)+1;
  if((f.u&&(w.rank||0)>=2)||w.mwN%2===0)cartoEnergy(1,'Mill Wheel');else floatText('p','⚙️ next turn','')},
 decamp:f=>cartoEnergy(1,'Mill Wheel Decamp')});
// ---------------- Rare ----------------
R('grand',{e:'🌐',d:'You have 4 Waypoint slots.',p:f=>{W.cb.nslots=Math.max(W.cb.nslots,4)},power:{}});
// Patient Road: resolves after the start-of-turn Waypoint triggers (rule 8: Waypoints first, then Vigils).
N('patientroad',{e:'🌿',d:'From your 2nd turn on, at the start of your turn, if no Waypoint left a slot last turn, every Waypoint gains 1 Rank (max 3). This is not an Advance.',
 power:{on:{
  afterDraw(inst){const cb=W.cb;if(cb.turn<2||cb.stat.wpLeftLast>0)return;let k=0;for(const w of cb.slots)if(canRank(w)){w.rank=(w.rank||0)+1;w.advT=Date.now();k++}
   if(k){log('🌿 Patient Road: every Waypoint +1 Rank');floatText('p','🌿 Patient Road','')}}}}});
R('perfectroute',{e:'🗺️',d:'Look at the top 10 cards of your draw pile. Put {2|3} of them into your hand and the rest back in any order. Sink.',
 p:f=>{const cb=W.cb;refill(10);const look=cb.draw.slice(0,10);let k=Math.min(f.v(2,3),look.length);
  const rest=()=>{const n=look.filter(ci=>cb.draw.includes(ci)).length;if(n)chartSafe(f,n)};
  const take=()=>{if(k<=0)return rest();const opts=look.filter(ci=>cb.draw.includes(ci));if(!opts.length)return;
   ask(f,'Perfect Route: take a card ('+k+' left)',opts.map(ci=>({l:(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},f:()=>{const i=cb.draw.indexOf(ci);if(i<0)return;cb.draw.splice(i,1);
    if(cb.hand.length<handLimit())cb.hand.push(ci);else cb.disc.push(ci);log('🗺️ Perfect Route: '+cname(ci));k--;take()}})))};take()}});
R('rekindle',{e:'🕯️',d:'Once per turn, when one of your Waypoints leaves a slot, place a random common Waypoint (temporary) in it.',
 power:{on:{decamp(inst,ctx){const cb=W.cb;if(!cb||ctx.reason==='replaced'||inst.rkT===cb.turn||!freeSlot())return;const d=pick(commonWps(),'combat');if(!d)return;inst.rkT=cb.turn;
  placeWp(mk(d.id,false,{temp:true,rank:0}),{at:ctx.slot});callout('REKINDLED: '+d.n,'adv')}}}});
R('scorchmap',{e:'🔥',d:'Whenever a Waypoint leaves a slot, gain 1 Energy (max 2 a turn).',power:{on:{decamp(inst){const cb=W.cb;if(!cb)return;if(inst.smT!==cb.turn){inst.smT=cb.turn;inst.smN=0}if(inst.smN>=2)return;if(cartoEnergy(1,'Scorch the Map'))inst.smN++}}}});
