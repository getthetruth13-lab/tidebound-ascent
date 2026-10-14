// data/cards/act1/artifacts.js — the 16 Act 1 Artifacts (FULL-CARD-POOL.md 5.1). Shared cards: they read only Guard, Energy, draw, Sink,
// junk, health, enemy intents and the hero's Big Moment (bigMoment event); they never use a hero verb.
import {card} from '../loader.js';
import {W} from '../../../core/state.js';
import {CARDS} from '../../../core/registry.js';
import {alive,heal,loseHp,gainEnergy,gainBlock,drawCards,sinkCard,isJunk,intentOf,addSt,dmgEnemy} from '../../../engine/combat.js';
import {cname} from '../../../engine/cards.js';
import {ask,log,floatText,forCombat} from '../kit.js';
const N=(id,o)=>card('artifact',id,o);
// Per-turn counter stored on the listener instance (resets when the turn changes).
const perTurn=(inst,k)=>{const cb=W.cb;if(inst[k+'T']!==cb.turn){inst[k+'T']=cb.turn;inst[k]=0}return inst[k]};
const opt=(ci,f)=>({l:(CARDS[ci.id].e||'')+' '+cname(ci),card:{id:ci.id,up:ci.up},f});

N('ledgerleaf',{e:'📜',d:'Put a card from your discard pile on top of your draw pile.{| Also draw 1.} Sink.',p:f=>{const cb=W.cb;
 const opts=cb.disc.map(ci=>opt(ci,()=>{const i=cb.disc.indexOf(ci);if(i<0)return;cb.disc.splice(i,1);cb.draw.unshift(ci);log('📜 Torn Ledger Leaf: '+cname(ci)+' goes on top');if(f.u)drawCards(1)}));
 if(!opts.length){log('📜 Torn Ledger Leaf: the discard pile is empty');if(f.u)drawCards(1);return}
 ask(f,'Torn Ledger Leaf: which card goes on top of your draw pile?',opts)}});

N('sealingwax',{e:'🔴',d:'Choose {a card|two cards} in your hand. For the rest of this fight {it has|they have} Moor. Sink.',p:f=>{
 const pick=left=>{const cand=W.cb.hand.filter(ci=>!ci.moor&&!CARDS[ci.id].moor);if(!left||!cand.length)return;
  ask(f,'Sealing Wax: choose a card to hold ('+left+' left)',cand.map(ci=>opt(ci,()=>{ci.moor=true;floatText('p','🔴 Moor','');log('🔴 Sealing Wax: '+cname(ci)+' has Moor');pick(left-1)})))};
 pick(f.v(1,2))}});

N('driftnet',{e:'🕸️',d:'Whenever a Flotsam or Burden is added to your hand, Sink it and gain 3 Guard (max 2 a turn).',power:{on:{
 cardAdded(inst,ctx){const cb=W.cb;if(!cb||ctx.pile!=='hand'||!isJunk(ctx.card)||perTurn(inst,'dn')>=2)return;const i=cb.hand.indexOf(ctx.card);if(i<0)return;
  inst.dn++;cb.hand.splice(i,1);sinkCard(ctx.card,'driftnet');gainBlock(3);log('🕸️ Drift-Net: '+cname(ctx.card)+' Sunk, +3 Guard')}}}});

N('ferrycoin',{e:'🪙',open:1,d:'Opening. Gain 1 Energy.{ Draw 1 fewer card next turn.|} Sink.',p:f=>{gainEnergy(1);if(!f.u){W.cb.nextDraw-=1;log('🪙 Ferryman\'s Coin: 1 fewer card next turn')}}});

N('ampoule',{e:'🛢️',d:'Lose {4|3} HP. Gain 2 Energy. Sink.',p:f=>{loseHp(f.v(4,3));gainEnergy(2)}});

N('salvagehook',{e:'🪝',d:'Sink up to 2 cards from your hand and draw 1 for each. A Flotsam or Burden gives 1 Energy next turn instead. Sink.',p:f=>{
 let draws=0,energy=0;
 const finish=()=>{if(draws)drawCards(draws);if(energy)f.nextTurn(()=>gainEnergy(energy))};
 const pick=left=>{const cand=W.cb.hand.slice();if(!left||!cand.length)return finish();
  ask(f,'Salvage Hook: Sink a card ('+left+' left)',[...cand.map(ci=>opt(ci,()=>{const i=W.cb.hand.indexOf(ci);if(i<0)return pick(left);W.cb.hand.splice(i,1);sinkCard(ci,'salvagehook');
   if(isJunk(ci))energy++;else draws++;log('🪝 Salvage Hook: '+cname(ci)+' Sunk');pick(left-1)})),{l:'✋ Done',tile:'choice-keep',f:finish}])};
 pick(2)}});

N('barnacledplate',{e:'🐚',d:'When your Guard blocks an Attack, deal {2|3} to the attacker (max 3 a turn).',power:{on:{
 playerHit(inst,ctx){const cb=W.cb;if(!cb||!(ctx.blocked>0)||!ctx.enemy||ctx.enemy.hp<=0||perTurn(inst,'bp')>=3)return;inst.bp++;
  const n=inst.up?3:2;dmgEnemy(ctx.enemy,n);log('🐚 Barnacled Plate: '+n+' to '+ctx.enemy.n)}}}});

N('watchwhistle',{e:'📯',d:'Gain {3|4} Guard for each enemy that intends to attack (max 12).',p:f=>{
 const k=alive().filter(e=>{const m=intentOf(e);return m&&m.a}).length;f.blk(Math.min(12,f.v(3,4)*k))}});

N('smokedglass',{e:'🕶️',d:'Your first Attack each turn that deals damage also applies 1 Exposed to its target.',power:{on:{
 damageDealt(inst,ctx){const cb=W.cb;const f=ctx.f;if(!cb||!f||!f.def||f.def.t!=='A'||f.potion||!(ctx.amount>0)||inst.sgT===cb.turn)return;
  inst.sgT=cb.turn;addSt(ctx.target,'vuln',1);log('🕶️ Smoked Glass: 1 Exposed on '+ctx.target.n)}}}});

N('midden',{e:'🐚',tg:1,d:'Deal 1 for each card in your discard pile (max {15|20}).',p:f=>{f.dmg(Math.min(f.v(15,20),W.cb.disc.filter(c=>c!==f.ci).length))}});

N('manyfaced',{e:'🪞',d:'Deal {5|6} to ALL for each card type you played this turn, this one included. Sink.',p:f=>{
 const seen=Object.assign({},W.cb.stat.typesTurn||{});seen[f.def.t]=1;const k=Object.keys(seen).filter(t=>'ASPW'.includes(t)).length;
 f.all(f.v(5,6)*k)}});

N('tallystick',{e:'📏',d:'Whenever you have a Big Moment, gain {2|3} Guard (max 3 a turn).',power:{on:{
 bigMoment(inst){const cb=W.cb;if(!cb||perTurn(inst,'ts')>=3)return;inst.ts++;gainBlock(inst.up?3:2)}}}});

N('tollingcup',{e:'🏆',d:'End of turn: if you had 3 or more Big Moments this turn, gain 1 Might (max 4).',power:{on:{
 turnEnd(inst){const cb=W.cb;if(!cb||(cb.stat.bigTurn||0)<3||(inst.cup||0)>=4)return;inst.cup=(inst.cup||0)+1;addSt(cb.p,'str',1);floatText('p','🏆 +1 Might','');log('🏆 Tolling Cup: +1 Might ('+inst.cup+'/4)')}}}});

N('bastionbar',{e:'🔩',d:'Your Guard is not removed at the start of your next turn. Sink.',p:f=>{const want=W.cb.turn+1;
 forCombat({id:'bastionbar',want,on:{turnStart(inst){if(W.cb.turn>want)inst.dead=true}},mod:{retainGuard(inst,ctx,v){if(W.cb.turn===want){inst.dead=true;log('🔩 Bastion Bar: your Guard holds');return true}return v}}});
 log('🔩 Bastion Bar: Guard will carry over')}});

N('lifebuoy',{e:'🛟',d:'Gain 1 Guard for every {3|2} HP you are missing (max 15). Draw 1. Sink.',p:f=>{
 f.blk(Math.min(15,Math.floor((W.run.max-W.run.hp)/f.v(3,2))),15);drawCards(1)}});

N('needle',{e:'🪡',d:'Heal {5|7} HP. If you are at half HP or less, heal {8|10} instead. Sink.',p:f=>{
 f.heal(W.run.hp*2<=W.run.max?f.v(8,10):f.v(5,7))}});
