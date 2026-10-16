// cards/act2/artifacts.js: the 22 later-act Artifacts (FULL-CARD-POOL.md Part 5.2 / 5.3): 12 for Act 2, 10 for Act 3.
// Shared cards like the Act 1 Artifacts: they read only Guard, Energy, draw, Sink, junk, HP, gold and enemy state; never a hero verb.
import {W,pick} from '../../../core/state.js';
import {CARDS} from '../../../core/registry.js';
import {thisTurn} from '../../../core/bus.js';
import {alive,heal,loseHp,gainEnergy,gainBlock,drawCards,sinkCard,addSt,dmgEnemy,addCard,choose,strongest} from '../../../engine/combat.js';
import {cname} from '../../../engine/cards.js';
import {log,floatText,ask} from '../kit.js';
import {N2} from './kit2.js';
const N=(id,o)=>N2('artifact')(id,o);
// Per-turn counter stored on the listener instance (resets when the turn changes).
const perTurn=(inst,k)=>{const cb=W.cb;if(inst[k+'T']!==cb.turn){inst[k+'T']=cb.turn;inst[k]=0}return inst[k]};
const opt=(ci,f)=>({l:(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},f});
const gold=()=>W.run&&W.run.gold||0;

// ---------------- Act 2 ----------------
N('oildrip',{e:'🛢️',d:'At the start of your turn, lose {2|1} HP and gain 1 Energy (max 3 times per fight).',power:{on:{
 turnStart(inst){const cb=W.cb;if(!cb||(inst.od||0)>=3)return;inst.od=(inst.od||0)+1;loseHp(inst.up?1:2);gainEnergy(1);log('🛢️ Lamp-Oil Drip: HP for Energy ('+inst.od+'/3)')}}}});

N('rubbing',{e:'🗒️',d:'Add a copy of a card in your hand to your hand. It costs 0 this turn and Sinks if not played. Cannot copy a Full Flame card, a Waypoint or an Artifact. Sink.',p:f=>{
 const cb=W.cb;const cand=cb.hand.filter(ci=>{const d=CARDS[ci.id];return ci!==f.ci&&d&&d.t!=='W'&&d.cls!=='artifact'&&!/Full Flame/.test(d.text||'')});
 if(!cand.length){log('🗒️ Brass Rubbing: nothing to copy');return}
 ask(f,'Brass Rubbing: copy which card?',cand.map(ci=>opt(ci,()=>{const c=addCard(ci.id,'hand',{up:ci.up,cost0Turn:true});if(!c)return;
  if(ci.lvl)c.lvl=ci.lvl;if(cb.hand.includes(c))thisTurn({id:'rubbing',on:{turnEnd(inst){if(inst.dead)return;inst.dead=true;const i=cb.hand.indexOf(c);if(i>=0){cb.hand.splice(i,1);sinkCard(c,'rubbing')}}}});
  log('🗒️ Brass Rubbing: copy of '+cname(ci)+' (0 this turn)')})))}});

N('tithebox',{e:'📦',d:'Lose {20|15} gold (cannot be played with less). Gain 2 Energy and draw 2. Sink.',req:f=>gold()>=f.v(20,15),p:f=>{
 const n=f.v(20,15);if(gold()<n)return;W.run.gold-=n;floatText('p','-'+n+'🪙','');gainEnergy(2);drawCards(2)}});

N('censer',{e:'🪔',d:'Sink a Burden in your hand; it is also removed from your deck for the rest of the run. Sink.',p:f=>{
 const cb=W.cb;const cand=cb.hand.filter(ci=>ci!==f.ci&&CARDS[ci.id]&&(CARDS[ci.id].cls==='curse'||CARDS[ci.id].curse));
 if(!cand.length){log('🪔 Censer: no Burden in hand');return}
 ask(f,'Censer: which Burden burns away?',cand.map(ci=>opt(ci,()=>{const i=cb.hand.indexOf(ci);if(i<0)return;cb.hand.splice(i,1);sinkCard(ci,'censer');
  const j=W.run.deck.indexOf(ci);if(j>=0)W.run.deck.splice(j,1);log('🪔 Censer: '+cname(ci)+' is gone for the run')})))}});

N('rainbarrel',{e:'🪣',d:'At the end of your turn, gain {2|3} Guard for each unspent Energy (max {6|9}).',power:{on:{
 turnEnd(inst){const cb=W.cb;if(!cb||!(cb.energy>0))return;const per=inst.up?3:2;const g=Math.min(inst.up?9:6,per*cb.energy);gainBlock(g);log('🪣 Rain Barrel: +'+g+' Guard')}}}});

N('dryingrack',{e:'🧺',d:'At the start of your turn, remove one of Soaked, Exposed or Brittle from you (your choice).',power:{on:{
 turnStart(inst){const cb=W.cb;if(!cb)return;const st=cb.p.st;const names={weak:'Soaked',vuln:'Exposed',brittle:'Brittle'};
  const has=Object.keys(names).filter(k=>st[k]>0);if(!has.length)return;
  const rm=k=>{st[k]--;if(!st[k])delete st[k];log('🧺 Drying Rack: '+names[k]+' removed')};
  if(has.length===1)return rm(has[0]);
  if(cb.mode)return rm(pick(has,'combat'));
  choose('Drying Rack: remove which?',has.map(k=>({l:'🧺 '+names[k]+' ('+st[k]+')',f:()=>rm(k)})))}}}});

N('closedledger',{e:'📒',d:'Whenever you reshuffle your discard pile into your draw pile, gain {8|10} Guard and draw 1.',power:{on:{
 shuffle(inst){const cb=W.cb;if(!cb)return;gainBlock(inst.up?10:8);drawCards(1);log('📒 Closed Ledger: reshuffle pays')}}}});

N('masonlevel',{e:'📐',d:'The first Vigil or Waypoint you play each turn costs 1 less (minimum 0).',power:{mod:{
 cost(inst,ctx,v){const cb=W.cb;if(!cb||!ctx.def||(ctx.def.t!=='P'&&ctx.def.t!=='W'))return v;const t=cb.stat&&cb.stat.typesTurn||{};if(t.P||t.W)return v;return Math.max(0,v-1)}}}});

N('thirdwatch',{e:'🔔',d:'On your third turn of each fight, draw {3|4} cards and gain 1 Energy.',power:{on:{
 turnStart(inst,ctx){const cb=W.cb;if(!cb||cb.turn!==3||inst.tw3)return;inst.tw3=1;ctx.draw=(ctx.draw||0)+(inst.up?4:3);ctx.energy=(ctx.energy||0)+1;log('🔔 Third Watch: the guard changes')}}}});

N('ironrivet',{e:'🔩',d:'Whenever an enemy Attack costs you HP, gain 1 Might (max {3|4} for the fight).',power:{on:{
 playerDamaged(inst,ctx){const cb=W.cb;if(!cb||!(ctx.amount>0)||(inst.ir||0)>=(inst.up?4:3))return;inst.ir=(inst.ir||0)+1;addSt(cb.p,'str',1);floatText('p','🔩 +1 Might','');log('🔩 Iron Rivet: +1 Might ('+inst.ir+')')}}}});

N('bountychit',{e:'🧾',d:'Whenever you kill an enemy, gain {4|6} gold and heal 1 HP (max 20 gold and 3 HP per fight).',power:{on:{
 enemyKilled(inst,ctx){const cb=W.cb;if(!cb||(ctx&&ctx.summon))return;
  const g=Math.min(inst.up?6:4,20-(inst.bg||0));if(g>0){inst.bg=(inst.bg||0)+g;W.run.gold+=g;if(W.run.stats)W.run.stats.goldEarned+=g;floatText('p','+'+g+'🪙','')}
  if((inst.bh||0)<3){inst.bh=(inst.bh||0)+1;heal(1)}log('🧾 Bounty Chit: +'+Math.max(0,g)+' gold')}}}});

N('unisonpipe',{e:'🎺',d:'The third time each turn you play a card of the same type (Attack, Skill, Vigil or Waypoint), draw 1 (once a turn).',power:{on:{
 cardPlayed(inst,ctx){const cb=W.cb;if(!cb||!ctx.type)return;if(inst.upT!==cb.turn){inst.upT=cb.turn;inst.cnt={};inst.done=false}
  inst.cnt[ctx.type]=(inst.cnt[ctx.type]||0)+1;if(inst.cnt[ctx.type]===3&&!inst.done){inst.done=true;drawCards(1);log('🎺 Unison Pipe: one note, one card')}}}}});

// ---------------- Act 3 ----------------
N('staticjar',{e:'🫙',d:'Whenever you gain Energy on your turn (from a card or effect, not the start-of-turn refill), draw 1 (max {2|3} a turn).',power:{on:{
 // Preferred: the engine fires 'energyGained' from gainEnergy. Fallback until it does: compare Energy around each played card.
 energyGained(inst,ctx){const cb=W.cb;if(!cb||cb.enemyTurn||!(ctx.amount>0))return;inst.evt=1;if(perTurn(inst,'sj')>=(inst.up?3:2))return;inst.sj++;drawCards(1);log('🫙 Static Jar: Energy becomes a card')},
 beforeCardPlay(inst){const cb=W.cb;if(cb)inst.eb=cb.energy}, // Energy after the cost was paid
 cardPlayed(inst){const cb=W.cb;if(!cb||inst.evt||inst.eb==null)return;const gained=cb.energy>inst.eb;inst.eb=null;
  if(gained&&perTurn(inst,'sj')<(inst.up?3:2)){inst.sj++;drawCards(1);log('🫙 Static Jar: Energy becomes a card')}}}}});

N('bankedflame',{e:'🕯️',d:'Up to {1|2} unspent Energy carries over to your next turn.',power:{on:{
 turnEnd(inst){const cb=W.cb;if(!cb||!(cb.energy>0))return;const n=Math.min(inst.up?2:1,cb.energy);cb.pendingE=(cb.pendingE||0)+n;log('🕯️ Banked Flame: '+n+' Energy carried over')}}}});

N('sailorcoat',{e:'🧥',d:'The first time this fight you would be reduced to 0 HP, you survive with 1 HP and gain {10|15} Guard. Then Sink this.',power:{on:{
 playerDeath(inst,ctx){const cb=W.cb;if(!cb||inst.spent||W.run.hp>0)return;inst.spent=true;W.run.hp=1;ctx.cancel=true;gainBlock(inst.up?15:10);
  const i=cb.powers.indexOf(inst);if(i>=0)cb.powers.splice(i,1);sinkCard(inst.ci||{id:inst.id,up:inst.up},'sailorcoat');log('🧥 Drowned Sailor\'s Coat: you live, at 1 HP')}}}});

// ENGINE-NEEDS: randAlive() (combat.js) should read mod('randomTarget',{},picked) so "random enemy" effects pick the highest-HP enemy.
N('lodestone',{e:'🧲',d:'Your effects that pick a random enemy pick the enemy with the most HP instead. Parries you call on that enemy are +2.',power:{
 mod:{randomTarget(inst,ctx,v){return strongest()||v}},
 on:{parryCalled(inst,ctx){const cb=W.cb;if(!cb||inst.lsBusy||!ctx.enemy||ctx.enemy!==strongest())return;cb.parries[ctx.enemy.uid]=(cb.parries[ctx.enemy.uid]||0)+2;ctx.total=cb.parries[ctx.enemy.uid];log('🧲 Lodestone: Parry +2 on '+ctx.enemy.n)}}}});

// ENGINE-NEEDS: enemyHitPlayer should run mod('hpLoss',{enemy,amount},rest) before applying HP loss; until then this refunds the HP in the 'playerHit' event.
N('hailcap',{e:'🧢',d:'The first time each enemy phase you would lose HP, lose {4|6} less.',power:{on:{
 playerHit(inst,ctx){const cb=W.cb;if(!cb||!(ctx.amount>0)||inst.hcT===cb.turn)return;inst.hcT=cb.turn;const r=Math.min(ctx.amount,inst.up?6:4);W.run.hp=Math.min(W.run.max,W.run.hp+r);ctx.amount-=r;floatText('p','🧢 -'+r+' less','b');log('🧢 Hailstone Cap: lose '+r+' less')}}}});

N('groundrod',{e:'📡',d:'Static never costs you Energy. Whenever you draw a Static, Sink it and gain {3|4} Guard.',power:{
 on:{draw(inst,ctx){const cb=W.cb;if(!cb||!ctx.card||ctx.card.id!=='static')return;const i=cb.hand.indexOf(ctx.card);if(i<0)return;cb.hand.splice(i,1);sinkCard(ctx.card,'groundrod');gainBlock(inst.up?4:3);log('📡 Grounding Rod: Static Sunk')}}}});
// Static's own onDrawSelf (cards/status.js) drains 1 Energy; skip that while Grounding Rod is in play.
if(CARDS.static&&!CARDS.static._rodWrapped){const o=CARDS.static.onDrawSelf;CARDS.static._rodWrapped=true;
 CARDS.static.onDrawSelf=(f,c)=>{if(W.cb&&W.cb.powers.some(p=>p.id==='groundrod'))return;return o&&o(f,c)}}

N('cutdeck',{e:'✂️',d:'Discard your hand, then draw that many cards. Sink.',p:f=>{const cb=W.cb;const n=cb.hand.filter(c=>c!==f.ci).length;
 cb.hand.filter(c=>c!==f.ci).forEach(c=>{const i=cb.hand.indexOf(c);if(i>=0){cb.hand.splice(i,1);cb.disc.push(c)}});drawCards(n)}});

N('twingale',{e:'🌬️',d:'Whenever an Attack card deals damage to one enemy, deal {2|3} to another random enemy (once per card).',power:{on:{
 damageDealt(inst,ctx){const cb=W.cb;const f=ctx.f;if(!cb||!f||!f.def||f.def.t!=='A'||f.potion||f.tgale||!(ctx.amount>0)||f.allTargets)return;
  const others=alive().filter(e=>e!==ctx.target);if(!others.length)return;f.tgale=true;const e=pick(others,'combat');dmgEnemy(e,inst.up?3:2);log('🌬️ Twin Gale: '+(inst.up?3:2)+' to '+e.n)}}}});

N('fletching',{e:'🪶',d:'Your first Attack each turn ignores the target\'s Guard.',power:{on:{
 beforeCardPlay(inst,ctx){const cb=W.cb;if(!cb||!ctx.f||!ctx.f.def||ctx.f.def.t!=='A'||inst.flT===cb.turn)return;inst.flT=cb.turn;const e=ctx.f.tg;
  if(e&&e.block>0){inst.fl={e,b:e.block};e.block=0;log('🪶 Fletching: '+e.n+'\'s Guard is ignored')}},
 cardPlayed(inst){const s=inst.fl;inst.fl=null;if(s&&s.e.hp>0&&s.e.block===0)s.e.block=s.b},
 turnEnd(inst){const s=inst.fl;inst.fl=null;if(s&&s.e.hp>0&&s.e.block===0)s.e.block=s.b}}}});

N('brimmingbasin',{e:'🫗',d:'If you have {20|15} or more Guard at the end of your turn, gain 1 Energy next turn (once a turn).',power:{on:{
 turnEnd(inst){const cb=W.cb;if(!cb||cb.p.block<(inst.up?15:20))return;cb.nextTurnQ.push(()=>{gainEnergy(1);log('🫗 Brimming Basin: +1 Energy')})}}}});

// ENGINE-NEEDS: gainEnergy() in combat.js should fire('energyGained',{amount}) (Static Jar uses it; it has a card-play fallback until then).
// ENGINE-NEEDS: randAlive() should use mod('randomTarget') (Lodestone); enemyHitPlayer should use mod('hpLoss') (Hailstone Cap, currently a refund in 'playerHit').
// ENGINE-NEEDS: a 'parry' modifier context carrying the target enemy (Lodestone currently adds +2 via the 'parryCalled' event).
