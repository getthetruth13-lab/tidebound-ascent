// cards/act2/carto.js: later-act (Act 2 + Act 3) behaviour. Registered through N2() from kit2.js. See studio/design FULL-CARD-POOL.md.
// Cartographer, 39 cards (Part 3, section 3.C rules notes). Style follows cards/act1/carto.js.
import {W} from '../../../core/state.js';
import {CARDS} from '../../../core/registry.js';
import {fire,forCombat} from '../../../core/bus.js';
import {cname,mk} from '../../../engine/cards.js';
import {alive,randAlive,drawCards,passiveDraw,refill,handLimit,isJunk,sinkCard,placeWp,removeWp,trigWp,loseHpEnemy,addSt,gainBlock,heal,F,CORE} from '../../../engine/combat.js';
import {ask,log,floatText,callout,zap,zapAll,rankUp,lowest,thisTurn} from '../kit.js';
import {N2} from './kit2.js';
const RMAX=CORE.carto.rank_max;
const N=N2('carto');
// ---- helpers ----
// A budget that resets every turn and lives in the combat (never on a deck card, so it cannot leak between fights).
function take(key,max,want){const cb=W.cb;const s=cb.flags[key]||(cb.flags[key]={t:-1,n:0});if(s.t!==cb.turn){s.t=cb.turn;s.n=0}const k=Math.max(0,Math.min(want,max-s.n));s.n+=k;return k}
const canRank=w=>(w.rank||0)<RMAX;
const freeSlot=()=>W.cb.slots.length<W.cb.nslots;
const wpLabel=w=>(CARDS[w.id].e||'')+' '+cname(w)+' (Rank '+(w.rank||0)+')';
const wpOpts=(list,cap,fn)=>list.map(w=>({l:wpLabel(w),card:{id:w.id,up:w.up,rank:w.rank},cap,f:()=>fn(w)}));
// Choose one of a list of Waypoints (auto when there is exactly one).
function pickWp(f,title,list,cap,fn){if(!list.length)return;if(list.length===1)return fn(list[0]);ask(f,title,wpOpts(list,cap,fn))}
const sc=(f,n)=>f.scale<1?Math.max(1,Math.floor(n*f.scale)):n; // Triangulate: half value, min 1, for counts the f helpers do not scale
// Bearing (Dual Compass: the top two cards, either counts). Returns the index of the matching card in the draw pile, or -1.
const hasDual=()=>!!W.cb&&W.cb.powers.some(p=>p.id==='dualcompass');
function bearingIdx(t){const cb=W.cb;const n=hasDual()?2:1;refill(n);for(let i=0;i<n&&i<cb.draw.length;i++)if(CARDS[cb.draw[i].id].t===t)return i;return -1}
// Chart that stays valid if a draw happens while its menu is open.
function chartSafe(f,n,then){f.chart(n,then);const cb=W.cb;if(!cb||!cb.mode||cb.mode.k!=='chart')return;const m=cb.mode;
 f.thisTurn({id:'chartClamp',on:{draw(inst){if(W.cb.mode!==m){inst.dead=true;return}m.n=Math.min(m.n,W.cb.draw.length)}}})}
// Advance a Waypoint of your choice (extra to the free one). then() when it resolves (also when nothing can Advance).
function cardAdvance(f,why,then){const ok=W.cb.slots.filter(canRank);if(!ok.length){log('⛰️ No Waypoint can Advance');then&&then();return}
 pickWp(f,why+': Advance which Waypoint?',ok,'Advance',w=>{rankUp(w,why);then&&then()})}
// Trigger a Waypoint's standing line now (mid-turn): its start-of-turn draws happen at once.
function trigNow(w){const cb=W.cb;const was=cb.wpDraw;cb.wpDraw=0;trigWp(w);const d=cb.wpDraw;cb.wpDraw=was;if(d)drawCards(d)}
const sinkFromHand=(ci,why)=>{const cb=W.cb;const i=cb.hand.indexOf(ci);if(i<0)return false;cb.hand.splice(i,1);sinkCard(ci,why);log('🗑️ '+cname(ci)+' Sunk');return true};
const topOf=n=>{const cb=W.cb;refill(n);return cb.draw.slice(0,n)};
// ================= COMMON =================
N('ridgeshot',{e:'🏹',d:'Deal {7|9}. Bearing (Skill): gain {7|9} Guard.',tg:1,
 p:f=>{const b=bearingIdx('S')>=0;f.dmg(f.v(7,9));if(!W.cb)return;if(b){floatText('p','🧭 Bearing!','');f.blk(f.v(7,9))}}});
N('blaze',{e:'🪧',d:'Deal {7|9}. Bearing (Waypoint): draw that Waypoint; it costs 0 this turn.',tg:1,
 p:f=>{const i=bearingIdx('W');f.dmg(f.v(7,9));const cb=W.cb;if(!cb||i<0)return;floatText('p','🧭 Bearing!','');
  const c=cb.draw[i];if(!c)return;cb.draw.splice(i,1);
  if(cb.hand.length>=handLimit()){cb.disc.push(c);log('🪧 Blaze Mark: hand full, '+cname(c)+' goes to the discard pile');return}
  cb.draw.unshift(c);drawCards(1);if(cb.hand.includes(c)){c.tmp0=true;log('🪧 Blaze Mark: '+cname(c)+' drawn, costs 0')}}});
N('watch',{e:'🗼',wp:f=>{const t=randAlive();if(t)addSt(t,'vuln',1)},decamp:f=>{alive().forEach(e=>addSt(e,'vuln',2));log('🗼 Decamp: Watchtower, 2 Exposed to ALL')}});
N('salvagepit',{e:'🕳️',wp:f=>{},
 on:{afterDraw(inst){const cb=W.cb;if(!cb)return;const junk=cb.hand.filter(isJunk);if(!junk.length)return;
  const go=ci=>{if(sinkFromHand(ci,'salvagepit'))passiveDraw(1,'carto')};
  if(junk.length===1)return go(junk[0]);
  ask({echo:false,ci:inst},'Salvage Pit: Sink which?',junk.map(ci=>({l:(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},f:()=>go(ci)})))}},
 decamp:f=>{const cb=W.cb;const junk=cb.hand.filter(isJunk).slice(0,2);junk.forEach(ci=>sinkFromHand(ci,'salvagepit'));if(junk.length)callout('SALVAGED ×'+junk.length,'adv')}});
N('caravan',{e:'🐫',d:'Expedition: draw 1 card for every 2 Waypoints you have (Landmarks count 2; max 3). Gain {3|6} Guard.',
 p:f=>{const n=Math.min(3,Math.floor(f.wpCount()/2));if(n>0)drawCards(n);if(W.cb)f.blk(f.v(3,6))}});
N('deadfall',{e:'🪓',d:'Does nothing while it stands. The first time an enemy Attack hits you each turn, this Decamps itself. Decamp: deal {12|16} to the attacker.',wp:f=>{},
 on:{playerHit(inst,ctx){const cb=W.cb;if(!cb||!ctx.enemy)return;const first=cb.slots.find(w=>w.id==='deadfall');if(first!==inst)return;
  if(take('deadfallT',1,1)<1)return;cb.dfAtk=ctx.enemy;const i=cb.slots.indexOf(inst);if(i>=0){log('🪓 Deadfall springs');removeWp(i,'decamp')}cb.dfAtk=null}},
 decamp:f=>{const cb=W.cb;let t=cb.dfAtk;cb.dfAtk=null;if(!t||t.hp<=0||t.fled)t=randAlive();if(t){zap(t,f.v(12,16),f);callout('DEADFALL!','adv')}}});
N('stash',{e:'🧺',d:'Put a card from your hand on top of your draw pile. Gain {3|5} Guard.',
 p:f=>{const cb=W.cb;f.blk(f.v(3,5));const ok=cb.hand.filter(ci=>!(ci.moor||CARDS[ci.id].moor));if(!ok.length)return;
  const go=ci=>{const i=cb.hand.indexOf(ci);if(i<0)return;cb.hand.splice(i,1);cb.draw.unshift(ci);log('🧺 Stash: '+cname(ci)+' on top of your draw pile')};
  if(ok.length===1)return go(ok[0]);
  ask(f,'Stash: put which card on top of your draw pile?',ok.map(ci=>({l:(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},f:()=>go(ci)})))}});
N('lamppost',{e:'🏮',d:'At the end of your turn, gain 1 Guard for each card in your hand (max {6|8}). Decamp: draw 2.',
 on:{turnEnd(inst){const cb=W.cb;if(!cb)return;const n=Math.min(inst.up?8:6,cb.hand.length);if(n>0)gainBlock(n)}},
 decamp:f=>{drawCards(2)}});
// ================= UNCOMMON =================
N('basecamp',{e:'⛺',power:{on:{waypointPlaced(inst){const k=take('basecampT',6,3);if(k>0){gainBlock(k);floatText('p','⛺ Pitched Camp','')}}}}});
N('cullantern',{e:'🏮',d:'Start of your turn: the lowest-HP enemy loses {3|4} HP (ignores Guard). Decamp: apply {2|3} Exposed to it.',
 wp:f=>{const t=lowest();if(t)loseHpEnemy(t,f.v(3,4)+(f.ci.rank||0),'lantern')},
 decamp:f=>{const t=lowest();if(!t)return;addSt(t,'vuln',sc(f,f.v(2,3))*(f.lm?2:1));log('🏮 Decamp: Culling Lantern marks '+t.n)}});
N('surveypost',{e:'⛺',d:'While it stands, whenever you Chart, gain 2 Guard (max {6|8} a turn). Decamp: Chart {4|5} and draw 1.',
 on:{chart(inst){const k=take('surveypostT',inst.up?8:6,2);if(k>0)gainBlock(k)}},
 decamp:f=>chartSafe(f,sc(f,f.v(4,5)),()=>drawCards(1))});
N('party',{e:'🧭',power:{on:{turnStart(inst){const cb=W.cb;if(cb)cb.chartQ=(cb.chartQ||0)+2}}}});
N('straightroad',{e:'🛤️',d:'Draw cards until you draw an Attack (max {5|6}). Sink.',
 p:f=>{const cb=W.cb;const mx=f.v(5,6);for(let i=0;i<mx;i++){if(!W.cb)return;if(!drawCards(1))break;const c=cb.hand[cb.hand.length-1];if(c&&CARDS[c.id].t==='A')break}}});
// Rubble: returns from the discard pile when a Waypoint leaves a slot. Discard-pile cards are not event sources, so a combat-long
// listener is registered the first time a Rubble is drawn or played this fight (see ENGINE-NEEDS).
function rubbleReg(){const cb=W.cb;if(!cb||cb.flags.rubbleL)return;cb.flags.rubbleL=1;
 forCombat({on:{decamp(){const c=W.cb;if(!c)return;for(const ci of c.disc.filter(x=>x.id==='rubble')){if(c.hand.length>=handLimit())break;const key='rb'+ci.uid;if(c.flags[key]===c.turn)continue;
  const i=c.disc.indexOf(ci);if(i<0)continue;c.disc.splice(i,1);c.hand.push(ci);c.flags[key]=c.turn;log('🪨 Rubble returns to your hand');floatText('p','🪨 Rubble','')}}}})}
N('rubble',{e:'🪨',d:'Deal {10|13}. Whenever one of your Waypoints leaves a slot, return this from your discard pile to your hand (once a turn).',tg:1,
 onDrawSelf:()=>rubbleReg(),p:f=>{rubbleReg();f.dmg(f.v(10,13))}});
N('cairnwright',{e:'🪨',power:{on:{decamp(inst,ctx){const cb=W.cb;if(!cb||!ctx.wp||ctx.wp.id!=='cairn'||ctx.reason==='replaced'||!freeSlot())return;
  if(take('cairnwrightT'+(inst.id),1,1)<1)return;placeWp(mk('cairn',false,{temp:true,rank:2}),{at:ctx.slot});callout('CAIRNWRIGHT: a taller Cairn rises','adv')}},
 mod:{expedition(inst,ctx,v){return v+W.cb.slots.filter(w=>w.id==='cairn').length}}}});
N('stakenext',{e:'🚩',p:f=>{const cb=W.cb;pickWp(f,'Stake the Shore: copy which Waypoint into your next fight?',cb.slots.slice(),'Stake it',w=>{
  W.run.preWp={id:w.id,up:w.up,rank:w.rank||0};log('🚩 Stake the Shore: '+cname(w)+' (Rank '+(w.rank||0)+') waits for your next fight');floatText('p','🚩 '+cname(w),'')})}});
function landmarkHit(inst){const n=inst.up?10:8;callout('CORNERSTONE','adv');passiveDraw(1,'carto');zapAll(n)}
N('cornerstone',{e:'🗿',d:'Whenever a Waypoint becomes a Landmark (Rank 3), draw 1 and deal {8|10} to ALL.',
 power:{on:{advance(inst,ctx){if(ctx.wp&&(ctx.wp.rank||0)>=RMAX)landmarkHit(inst)},landmark(inst){landmarkHit(inst)}}}});
N('fieldsurvey',{e:'📜',d:'Chart 4. Deal {3|4} to ALL for each Attack among those 4 cards (max {9|12}).',
 p:f=>chartSafe(f,4,()=>{const cb=W.cb;if(!cb)return;const k=cb.draw.slice(0,4).filter(ci=>CARDS[ci.id].t==='A').length;if(k)zapAll(Math.min(f.v(9,12),k*f.v(3,4)),f)})});
N('triang',{e:'📐',p:f=>{const cb=W.cb;const half=thisTurn({id:'triang',mod:{damage(inst,ctx,v){return ctx.f&&ctx.f.tri?Math.floor(v/2):v}}});
  for(const w of cb.slots.slice()){const d=CARDS[w.id];if(!d.decamp)continue;if(!W.cb)break;const r=w.rank||0;const fd=F(w,{wp:true,lm:r>=RMAX,scale:.5});fd.tri=true;fd.rankLeft=r;fd.reason='triang';
   const ch=fd.chart;fd.chart=(n,then)=>ch(Math.max(1,Math.floor(n/2)),then);d.decamp(fd,'triang')}
  half.dead=true;callout('TRIANGULATED','adv')}});
N('menderstent',{e:'🧵',d:'At the start of your turn, heal {1|2} HP (max 6 HP per fight). Decamp: heal {5|7} HP (once per fight) and gain 5 Guard.',
 wp:f=>{const cb=W.cb;const k=Math.min(f.v(1,2),6-(cb.flags.tentHeal||0));if(k>0){cb.flags.tentHeal=(cb.flags.tentHeal||0)+k;heal(k)}},
 decamp:f=>{const cb=W.cb;if(!cb.flags.tentDec){if(f.reason!=='triang')cb.flags.tentDec=1;heal(f.scale<1?Math.floor(f.v(5,7)*f.scale):f.v(5,7))}f.blk(5)}});
N('rebuild',{e:'🧱',p:f=>{const cb=W.cb;const ws=cb.disc.filter(ci=>CARDS[ci.id].t==='W');if(!ws.length||!freeSlot()){log('🧱 Rebuild: nothing to put back');return}
  const go=ci=>{const i=cb.disc.indexOf(ci);if(i<0)return;if(!freeSlot())return;cb.disc.splice(i,1);ci.rank=0;placeWp(ci);log('🧱 Rebuild: '+cname(ci)+' stands again')};
  const seen=new Set(),uniq=ws.filter(ci=>{const k=ci.id+(ci.up?'+':'');if(seen.has(k))return false;seen.add(k);return true});
  if(uniq.length===1)return go(uniq[0]);
  ask(f,'Rebuild: put which Waypoint back?',uniq.map(ci=>({l:(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},f:()=>go(ci)})))}});
N('marchorders',{e:'🥁',power:{on:{afterDraw(inst){const cb=W.cb;if(!cb||cb.slots.length<3)return;const k=take0('marchMight',3);if(k){addSt(cb.p,'str',1);callout('MARCHING ORDERS: +1 Might','adv')}}}}});
// fight-long counter (never resets), kept in the combat flags
function take0(key,max){const cb=W.cb;const n=cb.flags[key]||0;if(n>=max)return 0;cb.flags[key]=n+1;return 1}
N('cistern',{e:'🪣',d:'At the start of your turn, store {4|5} Guard here (max 20). Decamp: gain all stored Guard.',
 on:{waypointPlaced(inst,ctx){if(ctx.wp===inst)inst.store=0}},
 wp:f=>{const w=f.ci;w.store=Math.min(20,(w.store||0)+f.v(4,5));floatText('p','🪣 '+w.store,'')},
 decamp:f=>{const w=f.ci;const n=w.store||0;if(n>0)f.blk(n);if(f.reason!=='triang')w.store=0}});
N('handover',{e:'🤝',d:'Move all Rank from one Waypoint to another (Rank 3 is the maximum; any excess is lost). Draw {1|2}.',
 p:f=>{const cb=W.cb;const fin=()=>{if(W.cb)drawCards(f.v(1,2))};
  const src=cb.slots.filter(w=>(w.rank||0)>0);if(!src.length||cb.slots.length<2)return fin();
  const fromW=w=>{const tg=cb.slots.filter(x=>x!==w&&canRank(x));if(!tg.length)return fin();
   const move=t=>{const r=w.rank||0,was=t.rank||0;t.rank=Math.min(RMAX,was+r);w.rank=0;w.advT=t.advT=Date.now();log('🤝 Handover: Rank '+r+' moves to '+cname(t)+(t.rank>=RMAX?' (LANDMARK)':''));
    if(was<RMAX&&t.rank>=RMAX){callout('LANDMARK!','adv');fire('landmark',{wp:t})}fin()};
   pickWp(f,'Handover: move Rank to which Waypoint?',tg,'Receive Rank',move)};
  pickWp(f,'Handover: take Rank from which Waypoint?',src,'Give Rank',fromW)}});
N('counterweight',{e:'⚖️',d:'Whenever a Waypoint leaves a slot, gain {3|4} Guard for each Rank it had (max {9|12}).',
 power:{on:{decamp(inst,ctx){const r=ctx.rank||0;if(r<=0)return;const n=Math.min(inst.up?12:9,r*(inst.up?4:3));if(n>0){gainBlock(n);floatText('p','⚖️ Counterweight','')}}}}});
N('dualcompass',{e:'🧭',power:{}});
N('armory',{e:'🗡️',d:'While it stands, your Attacks deal {2|3} more (once per card; +1 more per Rank). Decamp: gain 1 Might.',
 mod:{damageAdd(inst,ctx,v){const f=ctx.f;if(!ctx.attack||!f||f.preview||f.potion||f.armT)return v;f.armT=1;return v+(inst.up?3:2)+(inst.rank||0)}},
 decamp:f=>{addSt(W.cb.p,'str',1);log('🗡️ Decamp: Armory, +1 Might')}});
N('packedearth',{e:'🟫',d:'Sink up to 2 Flotsam or Burdens from your hand. Advance a Waypoint once for each.{| Also draw 1.}',
 p:f=>{const cb=W.cb;const junk=cb.hand.filter(isJunk);let n=0;
  const adv=k=>{if(!W.cb)return;if(k<=0)return end();cardAdvance(f,'Packed Earth',()=>adv(k-1))};
  const end=()=>{if(W.cb&&f.u)drawCards(1)};
  const sink=ci=>{if(sinkFromHand(ci,'packedearth'))n++};
  if(junk.length<=2){junk.forEach(sink);return adv(n)}
  ask(f,'Packed Earth: Sink which (1 of 2)?',junk.map(ci=>({l:(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},f:()=>{sink(ci);const rest=cb.hand.filter(isJunk);
   ask(f,'Packed Earth: Sink which (2 of 2)?',rest.map(c2=>({l:(CARDS[c2.id].e||'')+' '+cname(c2),card:{id:c2.id,up:c2.up},f:()=>{sink(c2);adv(n)}})))}})))}});
N('rubbleroad',{e:'🛣️',d:'Up to {2|3} Flotsam or Burdens in your hand count as Waypoints for Expedition cards.',
 power:{mod:{expedition(inst,ctx,v){const cb=W.cb;return v+Math.min(inst.up?3:2,cb.hand.filter(isJunk).length)}}}});
N('torchrelay',{e:'🔥',power:{on:{decamp(inst,ctx){const cb=W.cb;if(!cb||!cb.slots.length)return;if(inst.trT===cb.turn)return;const w=cb.slots.find(x=>x!==ctx.wp&&CARDS[x.id].wp);if(!w)return;
  inst.trT=cb.turn;log('🔥 Torch Relay: '+cname(w)+' works a shift');trigNow(w)}}}});
// ================= RARE =================
N('known',{e:'🌍',power:{mod:{cost(inst,ctx,v){const cb=W.cb;return cb&&cb.slots.length>=3&&cb.stat.playedTurn===0?v-1:v}}}});
let LIT=null; // Lit Road: the one discounted card {cb,ci}
N('litroad',{e:'💡',power:{on:{chartDone(){const cb=W.cb;LIT=cb&&cb.draw[0]?{cb,ci:cb.draw[0]}:null},cardPlayed(inst,ctx){if(LIT&&LIT.ci===ctx.card)LIT=null}},
 mod:{cost(inst,ctx,v){return LIT&&LIT.cb===W.cb&&LIT.ci===ctx.card?v-1:v}}}});
N('breachmarker',{e:'🚧',d:'Does nothing while it stands. Decamp: apply {3|4} Brittle and {2|3} Exposed to ALL.',wp:f=>{},
 decamp:f=>{alive().forEach(e=>{addSt(e,'brittle',sc(f,f.v(3,4)));addSt(e,'vuln',sc(f,f.v(2,3)))});log('🚧 Decamp: Breach Marker, Brittle and Exposed to ALL')}});
N('meridian',{e:'🧭',power:{on:{advance(inst,ctx){const cb=W.cb;if(cb&&ctx.wp&&cb.slots.includes(ctx.wp))trigNow(ctx.wp)}}}});
N('forcedmarch',{e:'🥾',power:{mod:{advances(inst,ctx,v){return v+1}}}});
N('raisemound',{e:'⛰️',d:'Place a Cairn at Rank 3 in a free slot. Each Cairn you have deals {4|6} to ALL. Sink.',
 p:f=>{const cb=W.cb;if(freeSlot())placeWp(mk('cairn',false,{temp:true,rank:3}));else log('⛰️ Raise the Mound: no free slot');
  const n=cb.slots.filter(w=>w.id==='cairn').length;for(let i=0;i<n;i++){if(!W.cb)return;zapAll(f.v(4,6),f)}if(n)callout('THE MOUND ×'+n,'adv')}});
N('finaldest',{e:'🏁',d:'Expedition: deal {6|7} to one enemy for each Waypoint you have (Landmarks count 2). Then Decamp one Waypoint of your choice.',tg:1,
 p:f=>{const cb=W.cb;const n=f.wpCount();if(n<=0){log("🏁 Journey's End: no Waypoints");return}f.dmg(f.v(6,7)*n);if(!W.cb)return;
  pickWp(f,"Journey's End: Decamp which Waypoint?",cb.slots.slice(),'🔥 Decamp',w=>{const i=cb.slots.indexOf(w);if(i>=0)removeWp(i,'decamp')})}});
N('redrawnmap',{e:'🗺️',power:{on:{chartDone(inst,ctx){const cb=W.cb;if(!cb)return;const seen=cb.draw.slice(0,Math.min(ctx.n||0,cb.draw.length));if(!seen.length)return;
  const st=cb.flags.redrawnT;if(st&&st.t===cb.turn&&st.n>=2)return;
  ask({echo:false,ci:inst.ci||inst},'Redrawn Map: Sink one card you found?',[{l:'Sink nothing',f:()=>{}},...seen.map(ci=>({l:'Sink '+(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},
   f:()=>{const i=cb.draw.indexOf(ci);if(i<0||take('redrawnT',2,1)<1)return;cb.draw.splice(i,1);sinkCard(ci,'redrawnmap');log('🗺️ Redrawn Map: '+cname(ci)+' Sunk')}}))])}}}});
N('heirloom',{e:'🏕️',p:f=>{const cb=W.cb;pickWp(f,'Heirloom Camp: Decamp which Waypoint? (the same one is raised again)',cb.slots.slice(),'🔥 Decamp, then rebuilt',w=>{
  const i=cb.slots.indexOf(w);if(i<0)return;const id=w.id,up=w.up,rank=w.rank||0;removeWp(i,'decamp');if(!W.cb||!freeSlot())return;
  placeWp(mk(id,up,{temp:true,rank}),{at:Math.min(i,cb.slots.length)});log('🏕️ Heirloom Camp: '+CARDS[id].n+' stands again (Rank '+rank+')')})}});
// ENGINE-NEEDS:
// - Breach Marker: enemy Brittle is applied (addSt) but the engine does not yet cut the Guard an enemy gains by 25% while it is Brittle.
// - Rubble: discard-pile cards are not event sources, so Rubble registers a combat-long 'decamp' listener (forCombat) when first drawn or played.
//   Cleaner: let sources() scan the discard pile for defs with a flag (e.g. def.fromDiscard).
// - Dual Compass: only the Bearing cards in this file read it. Act 1 Bearing cards (Scout Ahead, Long Shot, act1/carto.js bearing()) should
//   check cb.powers for 'dualcompass' (top two cards, either counts); needs an edit to act1/carto.js.
// - Cornerstone: also listens to a custom 'landmark' event (fired by Handover). Patient Road (act1/carto.js) raises Rank without any event,
//   so it should fire('landmark',{wp}) when a Waypoint reaches Rank 3 for Cornerstone to trigger on it.
// - Triangulate: halves damage through a temporary 'damage' modifier and Guard/Chart through the f helpers; direct drawCards() calls inside
//   other Decamp lines (Cairn+ draws 2) are not halved.
// - Salvage Pit: runs on 'afterDraw' (before the Drift); the contract wants "after the draw and the drift" (rule 8 step 7).
// - Survey Party: adds to cb.chartQ at 'turnStart' (before the draw, per rule 8 step 2); does not offer the "Chart culls" Sink of junk.
// - Marching Orders runs on 'afterDraw' rather than directly after the Waypoint triggers.
