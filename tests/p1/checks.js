// Browser-side Phase 1 check library (loaded by mech.js / tests/phase1.js with addScriptTag).
// window.P1 = helpers; window.RELIC_CHECKS[id]() and window.POTION_CHECKS[id]() return [ok, detail].
(function(){
const {run$,combat$}=G;const C=combat$,R=run$;
const mkc=(id,up)=>({id,uid:Math.floor(Math.random()*1e9),up:!!up});
function res(){let g=0;while(G.cb&&G.cb.mode&&g++<6){const m=G.cb.mode;if(m.k==='choice')C.modeAct('choice',0);else if(m.k==='chart')C.modeAct('done');else if(m.k==='slot')C.modeAct('slot',0)}}
// fresh run (fixed seed, no starter relic unless listed), optional combat
function fr(cls,enc,rel=[],o={}){window.FAST=1;G.newRun(cls,{seed:o.seed||11,skipTravel:true});G.run.relics=[];W.toasts=[];rel.forEach(id=>G.giveRelic(id));
 if(enc){G.startCombat(o.kind||'fight',enc);if(!o.keepMode)res()}return G.cb}
function hand(ids){G.cb.hand=ids.map(i=>typeof i==='string'?mkc(i):i);G.cb.energy=10;G.cb.sel=null}
const idle=()=>G.cb&&G.cb.ens.forEach(e=>{e.next={none:1}});
function endT(){idle();G.cb.hand=[];C.endTurn();res()}
const hp=(i=0)=>G.cb.ens[i].hp;
window.P1={mkc,res,fr,hand,idle,endT,hp};
const has=(k)=>R.campOptions().some(o=>o.k===k);
window.RELIC_CHECKS={
 moonshell(){fr('tide',['bell'],['moonshell'],{keepMode:true});const m=G.cb.mode;const n=m&&m.opts.length;C.modeAct('choice',2);const t=G.cb.tide;hand([]);
  const e0=G.cb.energy;G.cb.tide=9;C.tideShift(1);const e1=G.cb.energy;G.cb.tide=9;C.tideShift(1);const e2=G.cb.energy;return [n===3&&t===7&&e1===e0+1&&e2===e1,{n,t,e0,e1,e2}]},
 tuningfork(){fr('echo',['bell'],['tuningfork']);hand(['arc']);G.playCard(0,{mark:true});const p=C.echoPlan(true);const h0=hp();endT();const d=h0-hp();hand(['arc']);G.playCard(0,{mark:true});const p2=C.echoPlan(true);
  return [p.mult===2&&p2.mult===1&&d===14,{m1:p.mult,m2:p2.mult,d}]},
 sextant(){fr('carto',['bell'],['sextant'],{keepMode:true});const m=G.cb.mode;const n=m&&m.k==='choice'&&m.opts.length;C.modeAct('choice',0);res();const w=G.cb.slots[0];return [n===3&&w&&w.up&&w.rank===1,{n,w}]},
 glove(){const f=rel=>{fr('duel',['knight'],rel);G.cb.parry=5;G.cb.ens[0].next={a:3};G.cb.hand=[];C.endTurn();return G.cb.mom};const a=f(['glove']),b=f([]);return [a-b===2,{a,b}]},
 // Act 1 pull-forward (P2 -> P1): Wet Sand, Sounding Cave, Fencer's Mask, Blood Rapier
 wetsand(){fr('tide',['bell'],['wetsand']);hand([]);G.cb.tideDir=1;const b0=G.cb.p.block;C.tideShift(-1);const b1=G.cb.p.block;C.tideShift(1);const b2=G.cb.p.block;return [b1-b0===2&&b2===b1,{b0,b1,b2}]},
 echochamber(){fr('echo',['bell'],['echochamber']);const n=G.cb.hand.filter(c=>c.id==='note').length;const i=G.cb.hand.findIndex(c=>c.id==='note');G.cb.energy=10;const h0=hp();G.playCard(i);const d=h0-hp();
  const f=()=>{fr('echo',['bell'],[]);hand(['note']);const h=hp();G.playCard(0);return h-hp()};const base=f();return [n>=1&&d-base===2,{n,d,base}]},
 fencermask(){fr('duel',['knight'],['fencermask']);G.cb.parry=5;G.cb.ens[0].next={a:3};G.cb.hand=[];C.endTurn();res();return [(G.cb.ens[0].st.bleed||0)>=1,G.cb.ens[0].st]},
 rapier(){fr('duel',['bell'],['rapier']);G.cb.mom=2;hand(['thrust']);const b0=G.cb.p.block;G.playCard(0,{flourish:true});return [(G.cb.ens[0].st.bleed||0)>=3&&G.cb.p.block-b0===4,/* 4 Bleed applied on Flourish; the Flourish hit itself may tick 1 */{st:G.cb.ens[0].st,blk:G.cb.p.block-b0}]},
 barnaclecharm(){fr('tide',['slug'],['barnaclecharm']);return [G.cb.p.block===8,G.cb.p.block]},
 kelpwrap(){fr('tide',['slug'],['kelpwrap']);G.run.hp=50;C.dmgEnemy(G.cb.ens[0],999);C.after();return [G.run.hp===53,G.run.hp]},
 coral(){fr('tide',['slug'],['coral']);return [G.cb.p.st.dex===1,G.cb.p.st]},
 whaletooth(){const f=rel=>{fr('duel',['bell'],rel);hand(['thrust','thrust']);const h0=hp();G.playCard(0);const d1=h0-hp();const v=G.cb.ens[0].st.vuln||0;return [d1,v]};const a=f(['whaletooth']),b=f([]);return [a[0]-b[0]===6&&a[1]===1&&b[1]===0,{a,b}]},
 biscuit(){fr('tide',null,[]);const m=G.run.max;G.giveRelic('biscuit');return [G.run.max-m===6,G.run.max-m]},
 oysterpurse(){fr('tide',null,['oysterpurse']);const g=G.run.gold;R.enterNode('unknown');return [G.run.gold-g===15,G.run.gold-g]},
 starfish(){fr('tide',null,['starfish']);const a=R.gainCurse('dread'),b=R.gainCurse('dread'),c=R.gainCurse('dread');return [!a&&!b&&!!c,{a,b,c:!!c}]},
 bandolier(){fr('tide',null,[]);const n=G.run.potions.length;G.giveRelic('bandolier');return [G.run.potions.length===n+1,G.run.potions.length]},
 foghorn(){fr('tide',['knight','slug'],['foghorn']);return [G.cb.ens.every(e=>e.st.weak===1),G.cb.ens.map(e=>e.st)]},
 galleypot(){fr('tide',null,['galleypot']);W.S={screen:'rest'};const ok=has('cook');const m=G.run.max;R.campDo('cook');return [ok&&G.run.max===m+4,{ok,d:G.run.max-m}]},
 tuningpeg(){fr('echo',['bell'],['tuningpeg']);hand(['arc']);G.playCard(0,{mark:true});const b=G.cb.p.block;C.doEcho();return [G.cb.p.block-b===2,G.cb.p.block-b]},
 pocketcompass(){fr('carto',['slug'],['pocketcompass'],{keepMode:true});const m=G.cb.mode;return [m&&m.k==='chart'&&m.n===3,m&&{k:m.k,n:m.n}]},
 griptape(){fr('duel',['bell'],['griptape']);G.cb.mom=2;hand(['thrust']);G.playCard(0,{flourish:true});const a=G.cb.log.find(l=>/FLOURISH/.test(l));G.cb.mom=2;hand(['thrust']);G.playCard(0,{flourish:true});const b=G.cb.log.find(l=>/FLOURISH/.test(l));return [/×3 /.test(a)&&/×2 /.test(b),{a,b}]},
 totem(){const f=rel=>{fr('tide',['bell'],rel);G.cb.ens[0].hp=G.cb.ens[0].max=999;endT();endT();return [G.cb.turn,G.cb.energy]};const a=f(['totem']),b=f([]);return [a[0]===3&&a[1]-b[1]===1,{a,b}]},
 coralspur(){fr('tide',['slug'],['coralspur']);return [G.cb.p.st.str===1,G.cb.p.st]},
 earring(){fr('tide',['slug'],['earring']);const b=G.cb.p.block;C.sinkCard(mkc('brace'),'test');return [G.cb.p.block-b===3,G.cb.p.block-b]},
 lens(){const f=rel=>{fr('tide',['bell'],rel);endT();return G.cb.p.block};const a=f(['lens']),b=f([]);return [a-b===12,{a,b}]},
 conch(){fr('tide',['slug','slug'],['conch']);const h=G.cb.hand.length,b=G.cb.p.block;C.dmgEnemy(G.cb.ens[0],999);return [G.cb.hand.length===h+1&&G.cb.p.block-b===3,{dh:G.cb.hand.length-h,db:G.cb.p.block-b}]},
 scale(){fr('tide',null,['scale']);G.run.removals=3;return [R.scrubPrice()===50,R.scrubPrice()]},
 chargedcoral(){fr('tide',['bell'],['chargedcoral']);hand(['brace','brace','brace','brace']);const h0=hp();for(let i=0;i<3;i++)G.playCard(0);const mid=hp();G.playCard(0);return [mid===h0&&h0-hp()===5,{mid:h0-mid,d:h0-hp()}]},
 pumice(){fr('tide',null,['pumice']);W.S={screen:'rest'};const ok=has('scour');const n=G.run.deck.length;R.campDo('scour');const pk=G.S.screen==='pick';if(pk)R.pickCard(G.run.deck[0].uid);return [ok&&pk&&G.run.deck.length===n-1,{ok,pk,n:G.run.deck.length}]},
 anklet(){fr('tide',['knight','slug'],['anklet']);hand([]);G.cb.tide=9;C.tideShift(1);const v=G.cb.ens.map(e=>e.st.vuln);G.cb.tide=1;C.tideShift(-1);const w=G.cb.ens.map(e=>e.st.weak);return [v.every(x=>x===1)&&w.every(x=>x===1),{v,w}]},
 flags(){fr('carto',['bell'],['flags']);hand(['camp','camp']);const c0=G.cards$.cost(G.cb.hand[0]);G.cb.energy=10;G.playCard(0);res();const c1=G.cards$.cost(G.cb.hand[0]);return [c0===0&&c1===2,{c0,c1}]},
 sirenscale(){fr('tide',['knight'],['sirenscale']);G.run.hp=3;C.enemyHitPlayer(G.cb.ens[0],50);return [G.run.hp===Math.floor(G.run.max*.4),{hp:G.run.hp,max:G.run.max}]},
 barometer(){fr('tide',['bell'],['barometer']);G.cb.ens[0].hp=G.cb.ens[0].max=999;let d5=0;for(let t=1;t<=6;t++){const h=hp();endT();if(t===5)d5=h-hp();if(t===6)return [h-hp()===40&&d5===0,{d6:h-hp(),d5}]}},
 abyssalpearl(){fr('tide',['bell'],['abyssalpearl']);G.cb.hand=[];G.cb.energy=3;idle();C.endTurn();return [G.cb.energy===G.cb.maxE+1,{e:G.cb.energy,max:G.cb.maxE}]},
 grapnel(){fr('tide',null,['grapnel']);W.S={screen:'rest'};const ok=has('trawl');const n=G.run.relics.length;R.campDo('trawl');return [ok&&G.run.relics.length===n+1,{ok,n:G.run.relics.length}]},
 boots(){fr('tide',null,['boots']);return [R.bootsLeft()===3,R.bootsLeft()]},
 moonstone(){fr('tide',['bell'],['moonstone']);const c=G.mod('crest',{preview:true},{dmg:12,resetTo:5}),u=G.mod('undertow',{preview:true},{guard:12,draw:1,resetTo:5});return [c.dmg===16&&u.guard===16,{c,u}]},
 organpipe(){fr('echo',['knight','slug'],['organpipe']);hand(['arc']);G.playCard(0,{mark:true});const p=C.echoPlan(true);return [!!p.allTargets,p]},
 staratlas(){fr('carto',['bell'],['staratlas']);return [G.cb.slots.length===2,G.cb.slots.length]},
 guildtoken(){fr('tide',null,['guildtoken']);const v=G.mod('price',{kind:'card'},100);return [v===65,v]},
 apothecary(){fr('tide',null,[]);G.giveRelic('apothecary');const S=G.S;return [S.screen==='potpick'&&S.ids.length===5,{s:S.screen,n:S.ids&&S.ids.length}]},
 rutter(){fr('tide',null,['rutter']);W.S={screen:'rest'};const ok=has('annotate');R.campDo('annotate');const pk=G.S.screen==='pick';const ci=pk&&R.pickable(G.S.mode,G.S.filter)[0];if(ci)R.pickCard(ci.uid);return [ok&&pk&&ci&&ci.open,{ok,pk}]},
 tidetable(){fr('tide',['bell'],['tidetable']);hand([]);const t=G.cb.tide;C.tideAct('up');const t1=G.cb.tide;C.tideAct('up');const t2=G.cb.tide;return [t1===t+1&&t2===t1,{t,t1,t2}]},
 musicstand(){fr('echo',['bell'],['musicstand']);const rs=G.run.deck.filter(c=>/Resound/.test(G.CARDS[c.id].d)).map(c=>c.id);const ok=!rs.length||G.cb.hand.some(c=>rs.includes(c.id));return [ok&&rs.length>0,{rs,hand:G.cb.hand.map(c=>c.id)}]},
 surveychain(){fr('carto',['bell'],['surveychain']);const h=G.cb.hand.length;C.chart(2,null);C.modeAct('done');const h1=G.cb.hand.length;C.chart(2,null);C.modeAct('done');return [h1===h+1&&G.cb.hand.length===h1,{h,h1,h2:G.cb.hand.length}]},
 manual(){fr('duel',['bell'],['manual']);hand(['parry']);G.playCard(0);return [G.cb.parry===7,G.cb.parry]},
 krakenink(){fr('tide',['knight','slug'],['krakenink']);return [G.cb.ens.every(e=>e.st.weak===2),G.cb.ens.map(e=>e.st)]},
 drownedcoin(){fr('tide',null,[]);const g=G.run.gold;G.giveRelic('drownedcoin');return [G.run.gold-g===120,G.run.gold-g]},
 brinemirror(){fr('tide',null,[]);const n=G.run.deck.length;G.giveRelic('brinemirror');const pk=G.S.screen==='pick'&&G.S.mode==='duplicate';if(pk)R.pickCard(G.run.deck[0].uid);return [pk&&G.run.deck.length===n+1,{pk,n:G.run.deck.length}]},
 goldengull(){fr('tide',null,['goldengull']);const v=G.mod('gold',{combat:true,kind:'fight'},100);return [v===130,v]},
 sunkenidol(){fr('tide',null,[]);const m=G.run.max;G.giveRelic('sunkenidol');const v=G.mod('gold',{combat:true,kind:'fight'},100);return [G.run.max-m===10&&G.run.deck.some(c=>c.id==='dread')&&v===105,{dm:G.run.max-m,v}]},
 helmwheel(){fr('tide',['bell'],['helmwheel']);hand(['splash']);G.playCard(0);const d0=G.cb.tideDir;C.tideAct('flip');return [d0!==0&&G.cb.tideDir===-d0,{d0,d1:G.cb.tideDir}]},
 hollowreed(){const f=rel=>{fr('echo',['bell'],rel);hand(['lownote']);G.playCard(0,{mark:true});return G.cb.mark&&G.cb.mark.id};const a=f(['hollowreed']),b=f([]);return [a==='lownote'&&!b,{a,b}]},
 cairnstone(){fr('carto',['bell'],['cairnstone']);const w=G.cb.slots[0];w.rank=2;C.removeWp(0,'test');C.placeWp(mkc('camp'));const n=G.cb.slots[G.cb.slots.length-1];return [n.id==='camp'&&n.rank===2,{rank:n.rank}]},
 featherfoil(){fr('duel',['bell'],['featherfoil']);G.cb.mom=1;hand(['thrust']);const fm=C.flourishMin();G.playCard(0,{flourish:true});const l=G.cb.log.find(l=>/FLOURISH/.test(l));return [fm===1&&/×1.5 /.test(l),{fm,l}]},

 // Task 6 rare build-around relics
 stormglass(){fr('tide',['bell'],['stormglass']);hand([]);G.cb.tideDir=1;const h=hp();C.tideShift(-1);return [G.cb.ens[0].st.drench===1&&h-hp()===1,{st:G.cb.ens[0].st,d:h-hp()}]},
 tithebowl(){fr('tide',['bell'],['tithebowl']);hand([]);G.cb.tide=7;const a=G.cb.energy;C.spendTide(2);const b=G.cb.energy;C.spendTide(1);const c=G.cb.energy;C.tideShift(-1);return [b===a+1&&c===b&&G.cb.energy===c,{a,b,c}]},
 duetbell(){fr('echo',['bell'],['duetbell']);hand(['arc','arc']);G.playCard(0,{mark:true});G.playCard(0,{mark:true});const p2=C.echoPlan(true,2);return [!!G.cb.mark&&!!G.cb.mark2&&p2.scale===.5&&!C.canMark(),{p2:p2&&p2.scale}]},
 soundinglead(){fr('echo',['bell'],['soundinglead']);hand(['arc','arc']);G.playCard(0);const a=G.cb.ens[0].st.reson;G.playCard(0);return [a===2&&G.cb.ens[0].st.reson===2,{a,b:G.cb.ens[0].st.reson}]},
 farglass(){fr('carto',null,['farglass']);const m=G.run.map;[0,1,2].forEach(r=>{m[r][0].t='unknown';delete m[r][0].pre});R.goMap();return [!!m[0][0].pre&&!!m[1][0].pre&&!m[2][0].pre,{a:m[0][0].pre,b:m[1][0].pre,c:m[2][0].pre}]},
 plinth(){fr('carto',['bell'],['plinth']);const w=mkc('stake');w.rank=3;const x=mkc('stake');x.rank=2;return [G.mod('wpTriggers',{wp:w},1)===2&&G.mod('wpTriggers',{wp:x},1)===1,{}]},
 champsash(){fr('duel',['bell'],['champsash']);G.cb.mom=4;hand(['thrust']);G.playCard(0,{flourish:true});return [G.cb.mom===2,G.cb.mom]},
 lancet(){const f=rel=>{fr('duel',['bell'],rel);hand(['thrust']);G.cb.ens[0].st.bleed=4;const h=hp();G.playCard(0);return h-hp()};const a=f(['lancet']),b=f([]);return [a-b===2,{a,b}]},
};
// Potions: each one is drinkable where it should be, leaves its slot, does its thing, and is NOT a card play.
const e0=()=>G.cb.ens[0];
const PC={
 salttonic:['tide',()=>G.cb.p.block===12], inkvial:['tide',()=>e0().st.weak===3], urchin:['tide',()=>e0().max-e0().hp===20],
 barnacledraught:['tide',()=>G.cb.p.st.str===2], sprayflask:['tide',()=>e0().max-e0().hp===10], quickwater:['tide',()=>G.cb.hand.length===8],
 coraldust:['tide',()=>e0().st.vuln===3], sparkphial:['tide',()=>G.cb.energy===12], kelpbroth:['tide',()=>G.run.hp===Math.min(G.run.max,40+Math.floor(G.run.max*.15))],
 moondraught:['tide',()=>G.cb.tide===0||G.cb.tide===5], resvial:['echo',()=>{G.cb.mark=null;G.playCard(0,{mark:true});return C.echoPlan(true).repeats===3}],
 chartwater:['carto',()=>G.cb.slots.length>=2], adrenalsalt:['duel',()=>G.cb.mom>=4&&G.cb.parry===8],
 mimicink:['tide',()=>{const h=e0().hp;G.cb.hand.unshift(P1.mkc('splash'));G.playCard(0);return h-e0().hp===12}],
 driftglass:['tide',()=>G.cb.hand.length===6&&G.cards$.cost(G.cb.hand[5])===0], temperoil:['tide',()=>G.cb.hand.every(c=>G.cards$.isUp(c))],
 squallbottle:['tide',()=>e0().st.drench===4&&G.cb.tide===7], duetdraught:['echo',()=>e0().st.reson===3&&G.cb.extraMarks===1], cairndust:['carto',()=>G.cb.slots.length>0&&G.cb.slots.every(w=>w.rank>=1)], redsalt:['duel',()=>e0().st.bleed===6],
 tidalflask:['tide',()=>G.run.potions.every(Boolean)], abyssaloil:['tide',()=>{endT();return G.cb.energy===G.cb.maxE+1}]};
window.POTION_CHECKS={};
for(const id of Object.keys(G.POTIONS)){window.POTION_CHECKS[id]=()=>{const p=G.POTIONS[id];const cls=(PC[id]&&PC[id][0])||p.cls||'tide';
 fr(cls,['bell'],[]);hand(['brace','splash','brace','splash','brace']);G.cb.energy=10;G.cb.ens[0].hp=G.cb.ens[0].max=300;G.cb.ens[0].block=0;G.cb.p.block=0;G.run.hp=40;G.run.potions=[id,null,null];
 const played=G.cb.stat.playedTurn,pc=G.cb.stat.playedCombat;
 if(p.passive){G.run.hp=1;C.enemyHitPlayer(G.cb.ens[0],40);return [G.run.hp>1&&G.run.potions[0]===null,{hp:G.run.hp}]}
 if(id==='mistbomb'){const ok=C.drinkPotion(0);return [!!ok&&G.S.screen!=='combat',{s:G.S.screen}]}
 const ok=C.drinkPotion(0,0);res();const left=G.run.potions[0];const notPlay=G.cb.stat.playedTurn===played&&G.cb.stat.playedCombat===pc;const eff=!PC[id]||PC[id][1]();
 return [!!ok&&(left===null||id==='tidalflask')&&eff&&notPlay,{ok:!!ok,left,eff,notPlay}]}}
})();
