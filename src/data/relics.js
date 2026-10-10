// data/relics.js — relic BEHAVIOUR. Names, tiers, classes, texts, hooks, flavour and phase come from data-v2.json
// (generated/data-v2.js); only the code lives here. Instances in W.run.relics are {id,n,used,...}; per-combat flags are
// reset on combatStart (r.c = {}), per-turn flags on turnStart (r.t = {}).
// Listen with on:{event(r,ctx)} and modify with mod:{name(r,ctx,value)} (see core/bus.js). pickup(r) runs on gain.
// Phase: P1 relics roll in pools; P2 (need Phase 2 keywords) and P3 (boss relics) are registered but never roll yet.
import {registerRelic,RELICS,CARDS} from '../core/registry.js';
import {W,pick} from '../core/state.js';
import {DATA} from './generated/data-v2.js';
import {addCard,addSt,alive,choose,dmgEnemy,drawCards,flash,gainBlock,gainEnergy,gainMom,heal,log,callout,curTgt} from '../engine/combat.js';
import {gainGold,gainCurse,openPick,pickPotions,gainMaxHp,addPotionSlot,revealRows} from '../engine/run.js';
const TIER={Starter:'s',Common:'c',Uncommon:'u',Rare:'r',Boss:'b',Shop:'shop',Event:'e'};
export const RELIC_ICON={moonshell:'🐚',tuningfork:'🎐',sextant:'🧭',glove:'🧤',barnaclecharm:'🦪',kelpwrap:'🌿',coral:'🪸',whaletooth:'🦷',biscuit:'🍪',oysterpurse:'👛',starfish:'⭐',bandolier:'🎽',foghorn:'📯',galleypot:'🍲',
 wetsand:'🏖️',tuningpeg:'🎚️',pocketcompass:'🧭',griptape:'🎗️',totem:'🗿',coralspur:'🦴',earring:'🦪',lens:'🔆',conch:'🐚',scale:'⚖️',chargedcoral:'⚡',pumice:'🪨',anklet:'📿',echochamber:'🕳️',flags:'🚩',fencermask:'🥽',
 sirenscale:'🧜',barometer:'🌡️',abyssalpearl:'🔮',grapnel:'⚓',boots:'🥾',moonstone:'🌙',organpipe:'🎹',staratlas:'🌌',rapier:'🗡️',guildtoken:'🪙',apothecary:'🧰',rutter:'📘',tidetable:'📅',musicstand:'🎼',surveychain:'⛓️',manual:'📕',
 krakenink:'🦑',drownedcoin:'🪙',brinemirror:'🪞',goldengull:'🐤',sunkenidol:'🗿',helmwheel:'☸️',hollowreed:'🎋',cairnstone:'🪨',featherfoil:'🪶',
 anchor:'⚓',gullcrown:'👑',fogcompass:'🌫️',inkwell:'🖋️',ledger:'📒',hourglass:'⏳',satchel:'🎒',divernet:'🥅',salvage:'📦',fullmoon:'🌕',resfork:'🔱',celestial:'🔭',gauntlet:'🥊',springlocket:'📿',twinclapper:'🔔',trailboots:'👢',gamblersedge:'🎲',stormglass:'⛈️',tithebowl:'🥣',duetbell:'🛎️',soundinglead:'🪢',farglass:'🔭',plinth:'🗿',champsash:'🎀',lancet:'🩸'};
// Per-relic behaviour. Anything not listed is a P3 boss relic that ships in Phase 3 (meta only, `stub:true`).
const B={
 // ---- starters ----
 moonshell:{on:{combatStart(r){r.c={};if(W.run.cls!=='tide')return;W.cb.startQ.push(()=>choose('🐚 Moon Shell: choose the starting Tide',[3,5,7].map(v=>({l:(v>5?'🌕 ':v<5?'🌑 ':'🌗 ')+'Tide '+v,f:()=>{W.cb.tide=v;log('🐚 Moon Shell: the Tide starts at '+v)}}))))},
  crest(r){if(!r.c.e){r.c.e=1;gainEnergy(1);flash(r);log('🐚 Moon Shell: +1 Energy')}},undertow(r){if(!r.c.e){r.c.e=1;gainEnergy(1);flash(r);log('🐚 Moon Shell: +1 Energy')}}}},
 tuningfork:{on:{combatStart(r){r.c={}}},mod:{echoPlan(r,ctx,p){if(ctx.slot===2||r.c&&r.c.used||p.mult>1)return p;if(!ctx.preview){r.c.used=1;flash(r)}return {...p,mult:2,fork:1}}}},
 sextant:{}, // engine: startCombat offers the choice of 3 starting Waypoints (upgraded, Rank 1)
 glove:{on:{combatStart(r){r.c={}},parry(r){if(r.c.used)return;r.c.used=1;flash(r);W.cb.nextTurnQ.push(()=>{gainMom(2);log('🧤 Dueling Glove: +2 Momentum')})}}},
 // ---- common ----
 barnaclecharm:{on:{combatStart(r){gainBlock(8);flash(r)}}},
 kelpwrap:{on:{combatEnd(r,ctx){if(ctx.won){heal(3);flash(r)}}}},
 coral:{on:{combatStart(r){addSt(W.cb.p,'dex',1)}}},
 whaletooth:{on:{combatStart(r){r.c={armed:1}},cardPlayed(r,ctx){if(r.c.vt){const t=r.c.vt;r.c.vt=null;if(t.hp>0)addSt(t,'vuln',1)}}},
  mod:{damageAdd(r,ctx,v){if(r.c&&r.c.armed&&ctx.attack&&!(ctx.f&&ctx.f.echo)){r.c.armed=0;r.c.vt=ctx.target;flash(r);return v+6}return v}}},
 biscuit:{pickup(r){gainMaxHp(6)}},
 oysterpurse:{on:{enterRoom(r,ctx){if(ctx.type==='unknown'){gainGold(15);flash(r)}}}},
 starfish:{pickup(r){r.n=2},on:{gainCurse(r,ctx){if(r.n>0){r.n--;ctx.cancel=true;flash(r);ctx.msg='⭐ Lucky Starfish negates the curse ('+r.n+' left)'}}}},
 bandolier:{pickup(r){addPotionSlot()}},
 foghorn:{on:{combatStart(r){alive().forEach(e=>addSt(e,'weak',1));flash(r)}}},
 galleypot:{camp:'cook',campfire:1},
 tuningpeg:{on:{echo(r){gainBlock(2);flash(r)}}},
 pocketcompass:{on:{combatStart(r){if(W.run.cls==='carto')W.cb.chartQ=Math.max(W.cb.chartQ||0,3)}}},
 griptape:{on:{combatStart(r){r.c={}},flourish(r,ctx){if(!r.c.used){r.c.used=1;ctx.extra+=2;flash(r)}}}},
 // ---- uncommon ----
 totem:{on:{turnStart(r){if(W.cb.turn%3===0){gainEnergy(1);flash(r)}}}},
 coralspur:{on:{combatStart(r){addSt(W.cb.p,'str',1)}}},
 earring:{on:{sink(r){gainBlock(3);flash(r)}}},
 lens:{on:{turnStart(r){if(W.cb.turn===2){gainBlock(12);flash(r)}}}},
 conch:{on:{enemyKilled(r,ctx){if(ctx.summon)return;drawCards(1);gainBlock(3);flash(r)}}},
 scale:{mod:{scrubPrice(r,ctx,v){return 50}}},
 chargedcoral:{on:{cardPlayed(r,ctx){if(ctx.nThisTurn===4){alive().forEach(e=>dmgEnemy(e,5));flash(r);log('⚡ Charged Coral: 5 to ALL')}}}},
 pumice:{camp:'scour',campfire:1},
 anklet:{on:{crest(r){alive().forEach(e=>addSt(e,'vuln',1));flash(r)},undertow(r){alive().forEach(e=>addSt(e,'weak',1));flash(r)}}},
 flags:{on:{combatStart(r){r.c={}},cardPlayed(r,ctx){if(ctx.type==='W')r.c.used=1}},mod:{cost(r,ctx,v){return r.c&&!r.c.used&&ctx.card&&CARDS[ctx.card.id].t==='W'?0:v}}},
 // ---- rare ----
 sirenscale:{on:{playerDeath(r,ctx){if(r.used)return;r.used=true;W.run.hp=Math.max(1,Math.floor(W.run.max*.4));ctx.cancel=true;flash(r);log('🧜 Siren Scale: you cheat death!');callout('SIREN SCALE!','relic')}}},
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
};
// Act 1 pull-forward (design/act1-complete.md §(b)): these 4 P2 relics join the Act 1 pools because their archetypes are in the Act 1 card set.
export const ACT1_PULL=new Set(['wetsand','echochamber','fencermask','rapier']);
for(const m of DATA.relics){const b=B[m.id]||{stub:true};
 registerRelic(m.id,Object.assign({n:m.name,tier:TIER[m.tier]||'c',tierName:m.tier,cls:m.cls==='any'?null:m.cls,d:m.effect,flavour:m.flavour,hooks:m.hooks,phase:ACT1_PULL.has(m.id)?'P1':m.phase,e:RELIC_ICON[m.id]||'💠'},b))}
// Relics that roll in Phase 1 pools (elite drops, chests, merchant, Trawl, Wishing Undertow).
export const inPool=r=>r.phase==='P1'&&!r.stub&&r.tier!=='s'&&r.tier!=='b'&&r.tier!=='e';
export {RELICS};
