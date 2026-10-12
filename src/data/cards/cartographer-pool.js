// data/cards/cartographer-pool.js — Cartographer Phase 2 pool (56 cards). Archetypes: Outposts (WP: build and Advance
// Waypoints), Pathfinding (PF: Chart, Bearing, top-of-deck control), Decamp (DC: destroy Waypoints for payoffs).
// v2.1: Advance once per turn (+1 Rank, +3 Waypoint damage per Rank, Rank 3 = Landmark = 2 for Expedition).
import {W,pick} from '../../core/state.js';
import {CARDS} from '../../core/registry.js';
import {card} from './loader.js';
import {cname,mk} from '../../engine/cards.js';
import {alive,randAlive,gainBlock,gainEnergy,drawCards,addCard,handLimit,trigWp,removeWp,placeWp,pickSlot,refill,CORE} from '../../engine/combat.js';
import {fire} from '../../core/bus.js';
import {CA,ask,afterPlay,thisTurn,forCombat,callout,log,floatText,zap,zapAll,lowest,destroyWp,stacks,rankUp} from './kit.js';
const K=(id,o)=>card('carto',id,o);
const c=()=>W.cb;
// Bearing (Attack / Skill): checks the top card of your draw pile when played (doesn't reveal it).
const top=()=>{const d=W.cb.draw[0];return d?CARDS[d.id].t:null};
const bearing=(f,t)=>{const ok=top()===t;if(ok&&!f.wp)floatText('p','🧭 Bearing!','');return ok};
// Trigger a Waypoint mid-turn: its "draw" Waypoints (Lookout, Waystation) draw at once instead of at the next turn start.
const trigNow=w=>{const cb=W.cb;const was=cb.wpDraw;cb.wpDraw=0;trigWp(w);const d=cb.wpDraw;cb.wpDraw=was;if(d)drawCards(d)};
const toTop=(f,title)=>{const cb=W.cb;if(!cb.hand.length)return;ask(f,title,cb.hand.map(ci=>({l:(CARDS[ci.id].e||'')+' '+cname(ci),f:()=>{const i=cb.hand.indexOf(ci);if(i<0)return;cb.hand.splice(i,1);cb.draw.unshift(ci);log('⬆️ '+cname(ci)+' put on top of your draw pile')}})))};
const commonWps=()=>Object.values(CARDS).filter(d=>d.cls==='carto'&&d.t==='W'&&d.r==='c');
const allWps=()=>Object.values(CARDS).filter(d=>d.cls==='carto'&&d.t==='W'&&d.r!=='s'&&!(W.run&&W.run.lock&&W.run.lock.cards[d.id]));
// "You may destroy a Waypoint to deal N more" (Rockfall, Dismantle): an optional choice.
const mayBurn=(f,n,label)=>{if(!W.cb.slots.length)return;destroyWp(f,label+': destroy a Waypoint to deal '+n+' more?',w=>{if(w)f.dmg(n)},{optional:true})};
// Extra Advance from a card (Grand Expedition): same effect as the free Advance, without using it.
function cardAdvance(f){const cb=W.cb;const ok=cb.slots.filter(w=>(w.rank||0)<CA.rank_max);if(!ok.length){log('⛰️ No Waypoint can Advance');return}
 if(ok.length===1||f.echo)return rankUp(ok[0],'Grand Expedition');
 ask(f,'Grand Expedition: Advance which Waypoint?',ok.map(w=>({l:(CARDS[w.id].e||'')+' '+cname(w)+' (Rank '+(w.rank||0)+' → '+((w.rank||0)+1)+')',f:()=>rankUp(w,'Grand Expedition')})))}
// Rubble: returns from the discard pile whenever a Waypoint is destroyed. Its listener is armed the first time the card is
// drawn or played in a combat (discard-pile cards aren't bus listeners).
function armRubble(ci){const cb=W.cb;const s=cb.rubbleArmed||(cb.rubbleArmed={});if(s[ci.uid])return;s[ci.uid]=true;
 forCombat({id:'rubble',on:{decamp(inst,ctx){if(ctx.reason!=='destroyed')return;const i=cb.disc.indexOf(ci);if(i<0||cb.hand.length>=handLimit())return;cb.disc.splice(i,1);cb.hand.push(ci);log('🪨 Rubble returns to your hand');floatText('p','🪨 Rubble','')}}})}
// ---------------- Common ----------------
K('scout',{e:'🔭',d:'Choose: deal {8|11}; or deal {4|6} and Bearing (Attack): draw 2.',p:f=>{const b=bearing(f,'A');ask(f,'Scout Ahead',[{l:'Deal '+f.v(8,11),f:()=>f.dmg(f.v(8,11))},{l:'Deal '+f.v(4,6)+(b?'; draw 2':' (no Bearing)'),f:()=>{f.dmg(f.v(4,6));if(b)f.draw(2)}}])}});
K('stakes',{e:'🪵',d:'Gain {6|8} Guard. With 2+ Waypoints, gain {3|4} more.',p:f=>f.blk(f.v(6,8)+(W.cb.slots.length>=2?f.v(3,4):0))});
K('ropebridge',{e:'🌉',d:'Gain {5|8} Guard. Put a card from your hand on top of your draw pile.',p:f=>{f.blk(f.v(5,8));toTop(f,'Rope Bridge: put which card on top of your draw pile?')}});
K('cairn',{e:'🪨',wpGuard:1,d:'Waypoint: at the start of your turn, gain {2|3} Guard. Decamp: draw {1|2}.',wp:f=>f.blk(f.v(2,3)),decamp:f=>{drawCards(f.v(1,2));log('🪨 Decamp: Cairn, draw '+f.v(1,2))}});
K('breakcamp',{e:'🔥',d:'Destroy one of your Waypoints. Draw {2|3}.',req:f=>W.cb.slots.length>0,p:f=>destroyWp(f,'Break Camp: destroy which Waypoint?',()=>f.draw(f.v(2,3)))});
K('ridgeshot',{e:'🏔️',d:'Deal {8|10}. Bearing (Skill): gain {4|6} Guard.',p:f=>{const b=bearing(f,'S');f.dmg(f.v(8,10));if(b)f.blk(f.v(4,6))}});
K('pinpoint',{e:'📍',d:'Choose: deal {9|12}; or deal {6|8} and Chart 3.',p:f=>ask(f,'Pinpoint',[{l:'Deal '+f.v(9,12),f:()=>f.dmg(f.v(9,12))},{l:'Deal '+f.v(6,8)+'; Chart 3',f:()=>{f.dmg(f.v(6,8));f.chart(3)}}])});
K('smoke',{e:'💨',d:'Waypoint: at the start of your turn, apply 1 Soaked to a random enemy. Decamp: apply 2 Soaked to ALL.',wp:f=>{const t=randAlive();if(t)f.weak(1,t)},decamp:f=>{alive().forEach(e=>f.weak(2,e));log('💨 Decamp: Smoke Signal, 2 Soaked to ALL')}});
K('rations',{e:'🥫',d:'Gain {4|6} Guard + 1 per Waypoint. Draw 1. <b>Expedition.</b>',p:f=>{f.blk(f.v(4,6)+f.wpCount());f.draw(1)}});
K('blaze',{e:'🔥',d:'Deal {6|8}. If the top card of your draw pile is a Waypoint, deal {6|8} more.',p:f=>f.dmg(f.v(6,8),top()==='W'?2:1)});
K('flare',{e:'🎆',d:'Deal {4|6} + 1 per Waypoint to ALL. <b>Expedition.</b>',p:f=>f.all(f.v(4,6)+f.wpCount())});
K('stake',{e:'📌',d:'Waypoint: at the start of your turn, deal {2|3} to ALL.',wp:f=>zapAll(f.v(2,3),f)});
K('rockfall',{e:'🪨',d:'Deal {14|18}. You may destroy a Waypoint to deal {8|10} more.',p:f=>{f.dmg(f.v(14,18));mayBurn(f,f.v(8,10),'Rockfall')}});
K('packmule',{e:'🫏',d:'Draw {2|3}. Put a card from your hand on top of your draw pile.',p:f=>{f.draw(f.v(2,3));toTop(f,'Pack Mule: put which card on top of your draw pile?')}});
K('foldmap',{e:'🗺️',d:'Move the bottom card of your draw pile to the top. Draw 1.{| Then Chart 2.}',p:f=>{const cb=W.cb;refill(1);if(cb.draw.length>1){cb.draw.unshift(cb.draw.pop());log('🗺️ Folded Map: bottom card moved to the top')}f.draw(1);if(f.u)f.chart(2)}});
K('earthwork',{e:'⛏️',d:'Gain {12|15} + {2|3} Guard per Waypoint. <b>Expedition.</b>',p:f=>f.blk(f.v(12,15)+f.v(2,3)*f.wpCount())});
K('stakeclaim',{e:'🚩',d:'Deal {6|9}. If you have an empty Waypoint slot, add a random common Waypoint to your hand. It costs 0 this turn.',p:f=>{f.dmg(f.v(6,9));const cb=W.cb;
 if(cb.slots.length<cb.nslots){const d=pick(commonWps(),'combat');if(d){addCard(d.id,'hand',{cost0Turn:true});log('🚩 Stake a Claim: '+d.n+' (costs 0)');floatText('p','🚩 '+d.n,'')}}}});
K('mirrorsig',{e:'🪞',d:'Trigger one of your Waypoints.',req:f=>W.cb.slots.length>0,p:f=>{const cb=W.cb;if(cb.slots.length===1||f.echo)return trigNow(pick(cb.slots,'combat'));
 ask(f,'Mirror Signal: trigger which Waypoint?',cb.slots.map(w=>({l:(CARDS[w.id].e||'')+' '+cname(w)+((w.rank||0)?' (Rank '+w.rank+')':''),f:()=>{if(cb.slots.includes(w))trigNow(w)}})))}});
K('dismantle',{e:'🔧',d:'Deal {6|8}. You may destroy a Waypoint to deal {10|12} more.',p:f=>{f.dmg(f.v(6,8));mayBurn(f,f.v(10,12),'Dismantle')}});
K('waymarker',{e:'🪧',d:'Waypoint: at the start of your turn, if the top card of your draw pile is an Attack, deal {4|6} to a random enemy. If it\'s a Skill, gain {4|6} Guard.',
 wp:f=>{refill(1);const t=top();if(t==='A')zap(randAlive(),f.v(4,6),f);else if(t==='S')f.blk(f.v(4,6))}});
K('compassrose',{e:'🧭',d:'Choose: gain {6|9} Guard; or Chart 4 and draw 1.',p:f=>ask(f,'Compass Rose',[{l:'Gain '+f.v(6,9)+' Guard',f:()=>f.blk(f.v(6,9))},{l:'Chart 4; draw 1',f:()=>f.chart(4,()=>drawCards(1))}])});
K('watchfire',{e:'🔥',d:'Waypoint: at the start of your turn, deal {5|7} to the lowest-HP enemy. Decamp: deal {10|12} to it.',wp:f=>zap(lowest(),f.v(5,7),f),decamp:f=>{const t=lowest();if(t){zap(t,f.v(10,12),f);log('🔥 Decamp: Watchfire hits '+t.n)}}});
K('contour',{e:'📐',d:'Gain {3|4} Guard per Waypoint (minimum 1 Waypoint counted). <b>Expedition.</b>',p:f=>f.blk(f.v(3,4)*Math.max(1,f.wpCount()))});
K('abandon',{e:'🏚️',d:'Destroy one of your Waypoints. Gain 1 Energy.{| Also draw 1.}',req:f=>W.cb.slots.length>0,p:f=>destroyWp(f,'Abandon Post: destroy which Waypoint?',()=>{f.gainEnergy(1);if(f.u)f.draw(1)})});
K('switchback',{e:'↪️',d:'Deal {4|6} twice. Bearing (Skill): gain 4 Guard.',p:f=>{const b=bearing(f,'S');f.dmg(f.v(4,6),2);if(b)f.blk(4)}});
K('pace',{e:'🚶',d:'Gain {7|10} Guard. Next turn, draw 1 extra card.',p:f=>{f.blk(f.v(7,10));W.cb.nextDraw++}});
// ---------------- Uncommon ----------------
K('basecamp',{e:'🏕️',d:'Whenever you place a Waypoint, gain {2|3} Guard.',power:{on:{waypointPlaced(inst){gainBlock((inst.up?3:2)*stacks(inst),{fromCard:true})}}}});
K('charge',{e:'🧨',d:'Waypoint: does nothing each turn. Decamp: deal {18|24} to ALL.',wp:f=>{},decamp:f=>{const n=f.v(18,24);callout('BOOM! '+n+' to ALL','adv');zapAll(n,null)}});
K('burn',{e:'🔥',d:'Whenever one of your Waypoints is destroyed or replaced, draw 1 and deal 5 to a random enemy.',power:{on:{decamp(inst,ctx){if(ctx.reason==='returned')return;const n=stacks(inst);drawCards(n);zap(randAlive(),5*n,null)}}}});
K('march',{e:'🥾',d:'Chart {4|5}. Draw 2.',p:f=>f.chart(f.v(4,5),()=>drawCards(2))});
K('party',{e:'👣',d:'At the start of your turn, Chart {2|3}.',power:{on:{turnStart(inst){W.cb.chartQ+=(inst.up?3:2)*stacks(inst)}}}});
K('supplyline',{e:'🚚',d:'Expedition cards count {1|2} extra Waypoint{|s}.',power:{mod:{expedition(inst,ctx,v){return v+(inst.up?2:1)*stacks(inst)}}}});
K('avalanche',{e:'🏔️',d:'Deal {6|8} to ALL for each Waypoint destroyed this combat (minimum 1).',p:f=>{const n=Math.max(1,W.cb.stat.wpDestroyed);f.all(f.v(6,8)*n);if(n>=3)callout('AVALANCHE ×'+n,'adv')}});
K('route',{e:'🛤️',d:'The next card you draw this turn costs 0. Draw {1|2}.',p:f=>{thisTurn({id:'route',on:{draw(inst,ctx){if(inst.dead)return;inst.dead=true;ctx.card.tmp0=true;floatText('p','🛤️ '+cname(ctx.card)+' costs 0','')}}});f.draw(f.v(1,2))}});
K('huntmark',{e:'🎯',d:'Deal {9|12}. Bearing (Attack): apply {2|3} Exposed.',p:f=>{const b=bearing(f,'A');if(b)f.vuln(f.v(2,3));f.dmg(f.v(9,12))}});
K('outpost',{e:'🏯',wpGuard:1,d:'Waypoint: at the start of your turn, deal {4|6} to a random enemy and gain {4|6} Guard.',wp:f=>{zap(randAlive(),f.v(4,6),f);f.blk(f.v(4,6))}});
K('millwheel',{e:'⚙️',d:'Waypoint: every 2nd turn, gain 1 Energy.',wp:f=>{const w=f.ci,t=W.cb.turn;if(w.mwT===t)return;w.mwT=t;w.mwN=(w.mwN||0)+1;if(w.mwN%2===0){gainEnergy(1);log('⚙️ Mill Wheel: +1 Energy')}else floatText('p','⚙️ next turn','')}});
K('scorched',{e:'🔥',d:'Destroy all your Waypoints. For each one, gain {7|9} Guard and deal {7|9} to ALL.',p:f=>{const cb=W.cb;let n=0;
 while(cb.slots.length){removeWp(cb.slots.length-1,'destroyed');n++}if(!n){log('🔥 Scorched Earth: no Waypoints');return}callout('SCORCHED EARTH ×'+n,'adv');for(let i=0;i<n;i++){f.blk(f.v(7,9));f.all(f.v(7,9))}}});
K('relocate',{e:'📦',d:'Return one of your Waypoints to your hand (triggers Decamp). It costs 0 this turn.{| Max once per turn.}',
 req:f=>W.cb.slots.length>0&&W.cb.flags.relocT!==W.cb.turn,
 p:f=>{const cb=W.cb;cb.flags.relocT=cb.turn;const go=i=>{const w=removeWp(i,'returned');if(!w)return;w.tmp0=true;if(cb.hand.length<handLimit())cb.hand.push(w);else cb.disc.push(w);log('📦 Relocate: '+cname(w)+' back to your hand (costs 0)')};
  if(f.echo||cb.slots.length===1)return go(0);pickSlot('Relocate: return which Waypoint?',go)}});
K('lore',{e:'📚',d:'Whenever you Chart, gain {3|5} Guard.',power:{on:{chart(inst){gainBlock((inst.up?5:3)*stacks(inst),{fromCard:true})}}}});
K('longshot',{e:'🏹',d:'Deal {16|20}. Bearing (Attack): deal {24|30} instead.',p:f=>f.dmg(bearing(f,'A')?f.v(24,30):f.v(16,20))});
K('beacon',{e:'🗼',d:'Waypoint: at the start of your turn, deal {3|4} to ALL.{| Decamp: deal 10 to ALL.}',wp:f=>zapAll(f.v(3,4),f),decamp:f=>{if(f.u){zapAll(10,null);log('🗼 Decamp: Beacon, 10 to ALL')}}});
K('quartermaster',{e:'🎒',d:'Add a random Waypoint to your hand. It costs 0 this turn.{| (Choose 1 of 3.)}',p:f=>{const add=d=>{addCard(d.id,'hand',{cost0Turn:true});log('🎒 Quartermaster: '+d.n+' (costs 0)');floatText('p','🎒 '+d.n,'')};
 const pool=allWps();if(!f.u)return add(pick(pool,'combat'));const three=[];const p2=pool.slice();while(three.length<3&&p2.length)three.push(p2.splice(Math.floor(pick([...p2.keys()],'combat')),1)[0]);
 ask(f,'Quartermaster: choose a Waypoint',three.map(d=>({l:(d.e||'')+' '+d.n,f:()=>add(d)})))}});
K('exppack',{e:'🎒',d:'Gain {6|8} + {2|3} Guard per Waypoint. Draw 1. <b>Expedition.</b>',p:f=>{f.blk(f.v(6,8)+f.v(2,3)*f.wpCount());f.draw(1)}});
K('piton',{e:'🧗',d:'Put any card from your draw pile on top of it. Draw 1.',p:f=>{const cb=W.cb;refill(1);const seen=new Set();const opts=[];
 cb.draw.forEach(ci=>{const k=ci.id+(ci.up?'+':'');if(seen.has(k))return;seen.add(k);opts.push({l:(CARDS[ci.id].e||'')+' '+cname(ci),f:()=>{const i=cb.draw.indexOf(ci);if(i>0){cb.draw.splice(i,1);cb.draw.unshift(ci)}f.draw(1)}})});
 if(opts.length<=1)return f.draw(1);ask(f,'Piton: which card goes on top (then draw it)?',opts)}});
K('rubble',{e:'🧱',d:'Deal {10|13}. Whenever one of your Waypoints is destroyed, return this from your discard pile to your hand.',onDrawSelf:(f,ci)=>armRubble(ci),p:f=>{armRubble(f.ci);f.dmg(f.v(10,13))}});
K('fieldnotes',{e:'📓',d:'Draw {2|3}. Chart 2.',p:f=>{f.draw(f.v(2,3));f.chart(2)}});
// ---------------- Rare ----------------
K('atlas',{e:'🌍',d:'Your Waypoints trigger twice at the start of your turn.',power:{mod:{wpTriggers(inst,ctx,v){return v+stacks(inst)}}}});
K('rekindle',{e:'🕯️',d:'Once per turn, when one of your Waypoints is destroyed, place a random common Waypoint (temporary) in its slot.',power:{on:{decamp(inst,ctx){const cb=W.cb;
 if(ctx.reason!=='destroyed'||inst.rkT===cb.turn||cb.slots.length>=cb.nslots)return;inst.rkT=cb.turn;const d=pick(commonWps(),'combat');if(!d)return;
 const w=mk(d.id,false,{temp:true});placeWp(w);callout('REKINDLED: '+d.n,'adv')}}}});
// Far Sight: the top card of your draw pile sits in your hand (flagged) while nothing else is happening, so you can play it.
// It goes back on top before any card resolves, whenever you draw, and at the end of your turn, so Bearing / Chart / draws
// still see the real draw pile. (Engine request: a native "play from the draw pile" slot would replace this.)
function fsSurface(){const cb=W.cb;if(!cb||cb.mode||cb.busy||cb.fsCard||cb.hand.length>=handLimit())return;if(!cb.draw.length)return;
 const ci=cb.draw.shift();ci.fsTop=true;cb.fsCard=ci;cb.hand.push(ci);log('🔭 Far Sight: '+cname(ci)+' (top of your draw pile) is playable')}
function fsSink(){const cb=W.cb;if(!cb||!cb.fsCard)return;const ci=cb.fsCard;cb.fsCard=null;ci.fsTop=false;const i=cb.hand.indexOf(ci);if(i>=0){cb.hand.splice(i,1);cb.draw.unshift(ci)}}
K('farsight',{e:'👁️',d:'You may play the top card of your draw pile as if it were in your hand.',p:f=>afterPlay(f,fsSurface),power:{on:{
 afterDraw(){fsSurface()},
 beforeCardPlay(inst,ctx){const cb=W.cb;if(cb.fsCard&&ctx.card===cb.fsCard){cb.fsCard.fsTop=false;cb.fsCard=null;log('🔭 Played from the top of your draw pile')}else fsSink()},
 cardPlayed(){fsSurface()},chartDone(){fsSink();fsSurface()},
 draw(inst,ctx){const cb=W.cb;if(!cb.fsCard||ctx.card===cb.fsCard||ctx.card.fsTop)return;const old=cb.fsCard;old.fsTop=false;cb.fsCard=null;
  const i=cb.hand.indexOf(ctx.card);if(i>=0){cb.hand.splice(i,1);cb.draw.unshift(ctx.card)}fsSurface()},
 turnEnd(){fsSink()},combatEnd(){fsSink()}}}});
K('cataclysm',{e:'☄️',d:'Destroy all your Waypoints. Deal {12|16} to ALL for each (minimum 1).',p:f=>{const cb=W.cb;let n=0;while(cb.slots.length){removeWp(cb.slots.length-1,'destroyed');n++}
 n=Math.max(1,n);callout('CATACLYSM ×'+n,'adv');f.all(f.v(12,16)*n)}});
K('grandexp',{e:'🌐',d:'Deal {10|14} + {5|6} per Waypoint. Advance a Waypoint. <b>Expedition.</b>',p:f=>{f.dmg(f.v(10,14)+f.v(5,6)*f.wpCount());cardAdvance(f)}});
K('perfectroute',{e:'🗺️',xu:0,d:'Chart 10. Draw 2.{ Sink.|}',p:f=>f.chart(10,()=>drawCards(2))});
K('leylines',{e:'✳️',d:'Whenever you Advance a Waypoint, it also triggers now.',power:{on:{advance(inst,ctx){const cb=W.cb;if(!ctx.wp||!cb.slots.includes(ctx.wp))return;for(let k=0;k<stacks(inst);k++)trigNow(ctx.wp);floatText('p','✳️ Ley Lines','')}}}});
K('gambit',{e:'🎲',xu:0,d:'Draw cards until you draw an Attack. It costs 0 this turn.{ Sink.|}',p:f=>{const cb=W.cb;for(let g=0;g<60;g++){const n=cb.hand.length;if(!drawCards(1))break;const ci=cb.hand[cb.hand.length-1];
 if(cb.hand.length>n&&CARDS[ci.id].t==='A'){ci.tmp0=true;floatText('p','🎲 '+cname(ci)+' costs 0','');break}}}});
K('scorchmap',{e:'🔥',d:'Whenever you destroy one of your Waypoints, gain 1 Energy (max 2 per turn).',power:{on:{decamp(inst,ctx){const cb=W.cb;if(ctx.reason!=='destroyed')return;
 if(inst.smT!==cb.turn){inst.smT=cb.turn;inst.smN=0}if(inst.smN>=2)return;inst.smN++;gainEnergy(1)}}}});

// Placement hook also runs after a full-slot replacement has resolved.
K('shorepost',{e:'📍',wpGuard:1,d:'Fast Waypoint: when placed and at the start of your turn, gain {3|5} Guard.',
 wp:f=>f.blk(f.v(3,5)),on:{waypointPlaced(inst,ctx){if(ctx.wp===inst)trigNow(inst)}}});
