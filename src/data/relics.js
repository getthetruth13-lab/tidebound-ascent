// data/relics.js — relic BEHAVIOUR. Names, tiers, classes, texts, hooks, flavour and phase come from data-v2.json
// (generated/data-v2.js); only the code lives here. Instances in W.run.relics are {id,n,used,...}; per-combat flags are
// reset on combatStart (r.c = {}), per-turn flags on turnStart (r.t = {}).
// Listen with on:{event(r,ctx)} and modify with mod:{name(r,ctx,value)} (see core/bus.js). pickup(r) runs on gain.
// Phase: P1 relics roll in pools; P2 (need Phase 2 keywords) are registered but never roll yet. P3 boss relics (tier 'b') are offered
// as a pick-1-of-3 row on the boss reward screen (engine/run.js bossRelicChoices).
import {registerRelic,RELICS,CARDS} from '../core/registry.js';
import {W,pick} from '../core/state.js';
import {DATA} from './generated/data-v2.js';
import {addCard,addSt,alive,choose,dmgEnemy,drawCards,flash,gainBlock,gainEnergy,bonusEnergy,gainMom,heal,log,callout,curTgt} from '../engine/combat.js';
import {gainGold,gainCurse,openPick,pickPotions,gainMaxHp,addPotionSlot,revealRows,loseRelic,gainRelic,randomRelic} from '../engine/run.js';
import {render} from '../ui/render.js';
import {ACT23_ITEMS} from './generated/act2-items.js';
import {RELICS_B} from './act2/relics-b.js';
const TIER={Starter:'s',Common:'c',Uncommon:'u',Rare:'r',Boss:'b',Shop:'shop',Event:'e'};
export const RELIC_ICON={moonshell:'🐚',tuningfork:'🎐',sextant:'🧭',glove:'🧤',barnaclecharm:'🦪',kelpwrap:'🌿',coral:'🪸',whaletooth:'🦷',biscuit:'🍪',oysterpurse:'👛',starfish:'⭐',bandolier:'🎽',foghorn:'📯',galleypot:'🍲',
 wetsand:'🏖️',tuningpeg:'🎚️',pocketcompass:'🧭',griptape:'🎗️',totem:'🗿',coralspur:'🦴',earring:'🦪',lens:'🔆',conch:'🐚',scale:'⚖️',chargedcoral:'⚡',pumice:'🪨',anklet:'📿',echochamber:'🕳️',flags:'🚩',fencermask:'🥽',
 sirenscale:'🐟',barometer:'🌡️',abyssalpearl:'🔮',grapnel:'⚓',boots:'🥾',moonstone:'🌙',organpipe:'🎹',staratlas:'🌌',rapier:'🗡️',guildtoken:'🪙',apothecary:'🧰',rutter:'📘',tidetable:'📅',musicstand:'🎼',surveychain:'⛓️',manual:'📕',
 krakenink:'🕯️',drownedcoin:'🪙',brinemirror:'🪞',goldengull:'🐤',sunkenidol:'🗿',helmwheel:'☸️',hollowreed:'🎋',cairnstone:'🪨',featherfoil:'🪶',
 anchor:'⚓',gullcrown:'👑',fogcompass:'🌫️',inkwell:'🖋️',ledger:'📒',hourglass:'⏳',satchel:'🎒',divernet:'🥅',salvage:'📦',fullmoon:'🌕',resfork:'🔱',celestial:'🔭',gauntlet:'🥊',springlocket:'📿',twinclapper:'🔔',trailboots:'👢',gamblersedge:'🎲',stormglass:'⛈️',tithebowl:'🥣',duetbell:'🛎️',soundinglead:'🪢',farglass:'🔭',plinth:'🗿',champsash:'🎀',lancet:'🩸'};
// Per-relic behaviour. Anything not listed is a P3 boss relic that ships in Phase 3 (meta only, `stub:true`).
const B={
 // ---- starters ----
 moonshell:{ready:r=>W.run.cls==='tide'&&!!r.c&&!r.c.e,on:{combatStart(r){r.c={};if(W.run.cls!=='tide')return;gainBlock(5);W.cb.startQ.push(()=>choose('🐚 Moon Shell: choose the starting Tide',[3,5,7].map(v=>({l:(v>5?'🌕 ':v<5?'🌑 ':'🌗 ')+'Tide '+v,tile:v>5?'choice-tide-high':v<5?'choice-tide-low':'choice-tide-mid',sum:v>5?'Start near High Tide: closer to a Crest (damage to all).':v<5?'Start near Low Tide: closer to an Undertow (Guard and a card).':'Start balanced: both breaks are five away.',f:()=>{W.cb.tide=v;log('🐚 Moon Shell: the Tide starts at '+v)}}))))},
  crest(r){if(!r.c.e){r.c.e=1;bonusEnergy(1,'tide');drawCards(1);flash(r);log('🐚 Moon Shell: +1 Energy, draw 1')}},undertow(r){if(!r.c.e){r.c.e=1;gainEnergy(1);drawCards(1);flash(r);log('🐚 Moon Shell: +1 Energy, draw 1')}}}},
 tuningfork:{ready:r=>!!r.c&&!r.c.used,on:{combatStart(r){r.c={};W.cb.nextDraw+=1},echo(r){if(r.c&&!r.c.ward){r.c.ward=1;gainBlock(4);flash(r)}}},mod:{echoPlan(r,ctx,p){if(ctx.slot===2||r.c&&r.c.used||p.mult>1)return p;if(!ctx.preview){r.c.used=1;flash(r)}return {...p,mult:2,fork:1}}}},
 sextant:{}, // engine: startCombat offers the choice of 3 starting Waypoints (upgraded, Rank 1)
 glove:{ready:r=>!!r.c&&!r.c.used,on:{combatStart(r){r.c={}},parry(r){if(r.c.used)return;r.c.used=1;flash(r);{const q=()=>{gainMom(2);log('🧤 Dueling Glove: +2 Momentum')};q.meta={mom:2};W.cb.nextTurnQ.push(q)}}}},
 // ---- common ----
 barnaclecharm:{on:{combatStart(r){gainBlock(8);flash(r)}}},
 kelpwrap:{on:{combatEnd(r,ctx){if(ctx.won){heal(3);flash(r)}}}},
 coral:{on:{combatStart(r){addSt(W.cb.p,'dex',1)}}},
 whaletooth:{ready:r=>!!r.c&&!!r.c.armed,on:{combatStart(r){r.c={armed:1}},cardPlayed(r,ctx){if(r.c.vt){const t=r.c.vt;r.c.vt=null;if(t.hp>0)addSt(t,'vuln',1)}}},
  mod:{damageAdd(r,ctx,v){if(r.c&&r.c.armed&&ctx.attack&&!(ctx.f&&ctx.f.echo)){r.c.armed=0;r.c.vt=ctx.target;flash(r);return v+6}return v}}},
 biscuit:{pickup(r){gainMaxHp(6)}},
 oysterpurse:{on:{enterRoom(r,ctx){if(ctx.type==='unknown'){gainGold(15);flash(r)}}}},
 starfish:{pickup(r){r.n=2},on:{gainCurse(r,ctx){if(r.n>0){r.n--;ctx.cancel=true;flash(r);ctx.msg='⭐ Lucky Starfish negates the curse ('+r.n+' left)'}}}},
 bandolier:{pickup(r){addPotionSlot()}},
 foghorn:{on:{combatStart(r){alive().forEach(e=>addSt(e,'weak',1));flash(r)}}},
 galleypot:{camp:'cook',campfire:1},
 tuningpeg:{on:{echo(r){gainBlock(2);flash(r)}}},
 pocketcompass:{on:{combatStart(r){if(W.run.cls==='carto')W.cb.chartQ=Math.max(W.cb.chartQ||0,3)}}},
 griptape:{ready:r=>!!r.c&&!r.c.used,on:{combatStart(r){r.c={}},flourish(r,ctx){if(!r.c.used){r.c.used=1;ctx.extra+=2;flash(r)}}}},
 // ---- uncommon ----
 totem:{on:{turnStart(r){if(W.cb.turn%3===0){gainEnergy(1);flash(r)}}}},
 coralspur:{ready:r=>!!r.c&&r.c.armed,on:{combatStart(r){r.c={armed:1}}},mod:{damageAdd(r,ctx,v){if(r.c&&r.c.armed&&ctx.attack&&ctx.f&&!ctx.f.echo&&!ctx.f.wp){r.c.armed=0;flash(r);return v+3}return v}}},
 earring:{on:{sink(r){gainBlock(3);flash(r)}}},
 lens:{on:{turnStart(r){if(W.cb.turn===2){gainBlock(12);flash(r)}}}},
 conch:{d:'Whenever an enemy dies (excluding summons), draw 1 and gain 3 Guard.',on:{enemyKilled(r,ctx){if(ctx.summon)return;drawCards(1);gainBlock(3);flash(r)}}},
 scale:{flavour:"Wren's own scale. Weighted slightly in your favour.",mod:{scrubPrice(r,ctx,v){return 50}}},
 chargedcoral:{on:{cardPlayed(r,ctx){if(ctx.nThisTurn===4){alive().forEach(e=>dmgEnemy(e,5));flash(r);log('⚡ Charged Coral: 5 to ALL')}}}},
 pumice:{camp:'scour',campfire:1},
 anklet:{on:{crest(r){alive().forEach(e=>addSt(e,'vuln',1));flash(r)},undertow(r){alive().forEach(e=>addSt(e,'weak',1));flash(r)}}},
 flags:{ready:r=>W.run.cls==='carto'&&!!r.c&&!r.c.used,on:{combatStart(r){r.c={}},cardPlayed(r,ctx){if(ctx.type==='W')r.c.used=1}},mod:{cost(r,ctx,v){return r.c&&!r.c.used&&ctx.card&&CARDS[ctx.card.id].t==='W'?0:v}}},
 // ---- rare ----
 sirenscale:{on:{playerDeath(r,ctx){if(r.used)return;r.used=true;W.run.hp=Math.max(1,Math.floor(W.run.max*.4));ctx.cancel=true;flash(r);log('🐟 Tidewrack Scale: you cheat death!');callout('TIDEWRACK SCALE!','relic')}}},
 barometer:{on:{turnEnd(r){if(W.cb.turn===6){alive().forEach(e=>dmgEnemy(e,40));flash(r);log('🌡️ Barometer of Gales: 40 to ALL');callout('GALE! 40 to ALL','relic')}}}},
 abyssalpearl:{on:{combatStart(r){r.carry=0},turnEnd(r){r.carry=Math.min(1,W.cb.energy)},turnStart(r){if(r.carry){gainEnergy(r.carry);r.carry=0;flash(r)}}}},
 grapnel:{camp:'trawl',campfire:1},
 boots:{pickup(r){r.n=3}},
 moonstone:{mod:{crest(r,ctx,c){return {...c,dmg:c.dmg+4}},undertow(r,ctx,u){return {...u,guard:u.guard+4}}}},
 organpipe:{mod:{echoPlan(r,ctx,p){return CARDS[p.card.id].t==='A'?{...p,allTargets:true}:p}}},
 staratlas:{}, // engine: an extra random starting Waypoint
 helmwheel:{}, // engine: once-per-turn "flip the drift arrow" button on the Tide meter (tideAct('flip'))
 hollowreed:{on:{echo(r,ctx){if(CARDS[ctx.card.id].faint&&ctx.k===0){drawCards(1);flash(r)}}}},
 cairnstone:{}, // engine: removeWp stores Ranks, placeWp restores them
 featherfoil:{mod:{flourishMin(r,ctx,v){return Math.min(v,1)}}},
 // ---- Task 6 rare build-arounds ----
 stormglass:{on:{tideTurn(r){alive().forEach(e=>addSt(e,'drench',1));flash(r)}}},
 tithebowl:{on:{combatStart(r){r.tt=0},recede(r,ctx){if(ctx.cause!=='spend'||r.tt===W.cb.turn)return;r.tt=W.cb.turn;gainEnergy(1);flash(r);log('🥣 Tithe Bowl: +1 Energy')}}},
 duetbell:{mod:{markSlots(r,ctx,v){return v+1},markSecondScale(r,ctx,v){return .5}}},
 soundinglead:{on:{cardPlayed(r,ctx){if(ctx.type!=='A'||W.cb.stat.attacksTurn!==1||ctx.f.echo)return;const t=ctx.f.tg;if(t&&t.hp>0){addSt(t,'reson',2);flash(r)}}}},
 farglass:{on:{mapEnter(r){revealRows(2);flash(r)}}},
 plinth:{mod:{wpTriggers(r,ctx,v){return ctx.wp&&(ctx.wp.rank||0)>=3?v+1:v}}},
 champsash:{mod:{momAfterFlourish(r,ctx,v){return Math.max(v,2)}}},
 lancet:{mod:{bleedDamage(r,ctx,v){return v*1.5}}},
 // ---- shop ----
 guildtoken:{mod:{price(r,ctx,v){return v*.65}}},
 apothecary:{pickup(r){pickPotions(5,'🧰 Apothecary Chest: choose up to 3 potions')}},
 rutter:{camp:'annotate',campfire:1},
 tidetable:{}, // engine: once-per-turn Surge 1 / Recede 1 buttons on the Tide meter (tideAct('up'|'down'))
 musicstand:{on:{combatStart(r){const cb=W.cb;const res=cb.draw.filter(c=>/Resound/.test(CARDS[c.id].d));if(!res.length)return;const c=pick(res,'combat');cb.draw.splice(cb.draw.indexOf(c),1);cb.hand.push(c);flash(r);log('🎼 Music Stand: '+CARDS[c.id].n+' to hand')}}},
 surveychain:{on:{turnStart(r){r.t={}},chartDone(r){if(r.t&&r.t.used)return;(r.t=r.t||{}).used=1;W.cb.nextDraw=W.cb.nextDraw||0;drawCards(1);flash(r)}}},
 manual:{mod:{parry(r,ctx,v){return ctx.f&&!ctx.f.potion?v+2:v}}},
 // ---- event ----
 krakenink:{on:{combatStart(r){alive().forEach(e=>addSt(e,'weak',2));flash(r)}}},
 drownedcoin:{pickup(r){gainGold(120)}},
 brinemirror:{pickup(r){openPick('duplicate','🪞 Mirror of Brine: duplicate a non-Rare card',null,null,ci=>CARDS[ci.id].r!=='r'&&ci.id!=='recall'&&!CARDS[ci.id].curse)}},
 goldengull:{mod:{gold(r,ctx,v){return ctx.combat?Math.round(v*1.3):v}}},
 sunkenidol:{pickup(r){gainMaxHp(10);gainCurse('dread')},mod:{gold(r,ctx,v){return ctx.combat&&ctx.kind==='fight'?v+5:v}}},
 // ---- P2 (need Phase 2 keywords; registered for tests, never roll yet) ----
 wetsand:{on:{tideTurn(r,ctx){if(ctx.nThisTurn===1){gainBlock(2);flash(r)}}}},
 echochamber:{on:{combatStart(r){addCard('note','hand');flash(r)}},mod:{damageAdd(r,ctx,v){return ctx.f&&ctx.f.ci&&ctx.f.ci.id==='note'?v+2:v}}},
 fencermask:{on:{parry(r,ctx){addSt(ctx.enemy,'bleed',2);flash(r)}}},
 rapier:{on:{flourish(r,ctx){const t=ctx.f.tg;if(t)addSt(t,'bleed',4);gainBlock(4);flash(r)}}},
 // ---- P3 boss relics (offered after the boss reward; v0.6.4 clovis/victory-fixes) ----
 anchor:{on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1}},mod:{handLimit(r,ctx,v){return Math.min(v,7)}}},
 gullcrown:{on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1}},mod:{rewardCards(r,ctx,v){return Math.min(v,2)}}},
 fogcompass:{on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1}},mod:{intentDisplay(r,ctx,m){return m?{...m,fog:1}:m}}},
 inkwell:{on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1},shuffle(r){if(W.cb){addCard('murk','drawRandom');flash(r)}}}},
 ledger:{on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1}},mod:{gold(r,ctx,v){return ctx.combat?0:v}}},
 hourglass:{on:{turnStart(r,ctx){ctx.energy=(ctx.energy||0)+1}},mod:{mendFrac(r,ctx,v){return Math.min(v,.10)}}},
 satchel:{on:{turnStart(r,ctx){ctx.draw=(ctx.draw||0)+1}},mod:{cost(r,ctx,c){return W.cb&&W.cb.stat.playedTurn===0&&!CARDS[ctx.card.id].unplay?Math.max(1,c+1):c}}},
 divernet:{pickup(r){const back=W.S;const ret=()=>{if(back){W.S=back;render()}};
  openPick('remove','Diver\'s Net: remove a card (1 of 2)',()=>openPick('remove','Diver\'s Net: remove a card (2 of 2)',()=>openPick('transform','Diver\'s Net: transform a card',ret,ret),ret),ret)}},
 salvage:{pickup(r){for(let k=0;k<2;k++){const id=randomRelic({c:50,u:50,r:0},'relics');if(id)gainRelic(id)}gainCurse('anchorchain')}},
 fullmoon:{pickup(){loseRelic('moonshell')},ready:r=>W.run.cls==='tide'&&!!r.c&&(!r.c.ec||!r.c.eu),on:{combatStart(r){r.c={};if(W.run.cls!=='tide')return;W.cb.startQ.push(()=>choose('🌕 Full Moon: choose the starting Tide',[2,3,4,5,6,7,8].map(v=>({l:'Tide '+v,tile:v>5?'choice-tide-high':v<5?'choice-tide-low':'choice-tide-mid',sum:v>5?'Start near High Tide.':v<5?'Start near Low Tide.':'Start balanced.',f:()=>{W.cb.tide=v;log('🌕 Full Moon: the Tide starts at '+v)}}))))},
  crest(r){if(!r.c.ec){r.c.ec=1;bonusEnergy(1,'tide');flash(r);log('🌕 Full Moon: +1 Energy')}},undertow(r){if(!r.c.eu){r.c.eu=1;gainEnergy(1);flash(r);log('🌕 Full Moon: +1 Energy')}}}},
 resfork:{pickup(){loseRelic('tuningfork')},on:{turnStart(r){r.t={}}},mod:{echoPlan(r,ctx,p){if(!p||r.t&&r.t.used||p.mult>1)return p;if(!ctx.preview){r.t={used:1};flash(r)}return {...p,mult:2,fork:1}}}},
 celestial:{pickup(){loseRelic('sextant')}}, // engine: startCombat offers 3 starting Waypoints (upgraded, Rank 1) and sets 4 Waypoint slots
 gauntlet:{pickup(){loseRelic('glove')},on:{turnStart(r){r.t={}},parry(r){if(r.t&&r.t.used)return;r.t={used:1};flash(r);const q=()=>{gainMom(1);log('🥊 Gauntlet: +1 Momentum')};q.meta={mom:1};W.cb.nextTurnQ.push(q)}},mod:{keepMomentum(){return true}}},
 springlocket:{mod:{drift(r,ctx,v){return v*2},crest(r,ctx,c){return {...c,dmg:c.dmg+6}},undertow(r,ctx,u){return {...u,guard:u.guard+6}}}},
 twinclapper:{mod:{markPer(){return 0}}}, // two Marks per turn are already the base rule (Twin Tines), so only the drawback applies
 trailboots:{mod:{advances(r,ctx,v){return Math.max(v,2)}}}, // engine: startCombat places no starting Waypoint when held
 gamblersedge:{on:{flourish(r,ctx){if(ctx.mom>=6){ctx.f.allTargets=true;flash(r)}}},mod:{momMax(r,ctx,v){return Math.max(v,8)},momLoss(){return 99}}},
};
// Act 1 pull-forward (design/act1-complete.md §(b)): these 4 P2 relics join the Act 1 pools because their archetypes are in the Act 1 card set.
export const ACT1_PULL=new Set(['wetsand','echochamber','fencermask','rapier']);
for(const m of DATA.relics){const b=B[m.id]||{stub:true};
 registerRelic(m.id,Object.assign({n:m.name,tier:TIER[m.tier]||'c',tierName:m.tier,cls:m.cls==='any'?null:m.cls,d:m.effect,flavour:m.flavour,hooks:m.hooks,phase:ACT1_PULL.has(m.id)?'P1':m.phase,e:RELIC_ICON[m.id]||'💠'},b))}
// Relics that roll in Phase 1 pools (elite drops, chests, merchant, Trawl, Wishing Undertow).
// Act 2 / Act 3 relics (task ACT2_BUILD): meta from generated/act2-items.js, behaviour from act2/relics-b.js. `act` gates every roll path (actOK in engine/run.js).
for(const m of ACT23_ITEMS.relics){const b=RELICS_B[m.id]||{stub:true};
 registerRelic(m.id,Object.assign({n:m.name,tier:m.tier,tierName:m.tierName,cls:m.cls,d:m.effect,flavour:m.flavour,hooks:m.hooks,phase:'P1',act:m.act,e:'💠',iconBrief:m.icon},b))}
export const inPool=r=>r.phase==='P1'&&!r.stub&&r.tier!=='s'&&r.tier!=='b'&&r.tier!=='e';
export {RELICS};
