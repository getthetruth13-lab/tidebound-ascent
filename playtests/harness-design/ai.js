// DESIGN SIM copy of ../harness/ai.js, adapted to the v2.1 rules (Flourish and Echo Mark are explicit choices).
// ===================== Playtest AI (runs inside the game's script scope) =====================
// Heuristic player: beam search over the current turn's card plays, each candidate line scored by
// actually simulating end-of-turn (Echo, Waypoints, enemy intents) on a cloned game state and
// evaluating the resulting position. Draw-pile order is hidden from the search (re-shuffled in the
// clone) for every class except the Cartographer, whose Open Map makes it legitimately visible.
var REAL=true, ST=null, SRC='card';
var CFG={sext:(typeof SIMD!=='undefined'&&SIMD.sext)||'signal',urgT:10,mech:true,noise:2,beam:5,maxDepth:10,W:{hp:2,ehp:1,alive:5,nextAtk:0.7}};
function addTo(o,k,v){o[k]=(o[k]||0)+v}
function F_(){return ST&&ST.fight}
// ---------- instrumentation wrappers ----------
const _dmgEnemy=dmgEnemy;
dmgEnemy=function(e,d){const b=e.hp;_dmgEnemy(e,d);if(REAL&&F_()){addTo(F_().dmg,SRC,Math.max(0,b-Math.max(0,e.hp)))}};
const _gainBlock=gainBlock;
gainBlock=function(n){_gainBlock(n);if(REAL&&F_()&&n>0)addTo(F_().blk,SRC,Math.floor(n))};
function withSrc(fn,s){return function(){const p=SRC;SRC=s;try{return fn.apply(null,arguments)}finally{SRC=p}}}
function STAT(k,n){if(REAL&&F_())addTo(F_(),k,n)}
const _doEcho=doEcho;doEcho=withSrc(function(){if(REAL&&F_()&&(cb.mark||(cb.last&&!CARDS[cb.last.id].faint)))F_().echoes++;return _doEcho()},'echo');
const _trigWp=trigWp;trigWp=withSrc(function(w){if(REAL&&F_())F_().wpTrig++;return _trigWp(w)},'wp');
const _checkTide=checkTide;checkTide=withSrc(function(){
  if(!CFG.mech&&run.cls==='tide'){cb.tide=Math.max(0,Math.min(10,cb.tide));return}
  if(REAL&&F_()){if(cb.tide>=10)F_().crest++;else if(cb.tide<=0)F_().undertow++}
  return _checkTide()},'tide');
const _enemyHitPlayer=enemyHitPlayer;enemyHitPlayer=withSrc(function(e,d){
  let saved=null;if(!CFG.mech&&run.cls==='duel'){saved=cb.parry;cb.parry=0}
  const before=e.hp;const r=_enemyHitPlayer(e,d);
  if(saved!==null)cb.parry=saved;
  
  return r},'parry');
const _hit=hit;hit=function(e,base,f,raw){
  if(run.cls==='duel'&&!raw&&e&&e.hp>0&&!e.fled){
    if(!CFG.mech){let d=base+cb.pstr;if(cb.p.st.weak)d=Math.floor(d*.75);if(e.st.vuln)d=Math.floor(d*1.5);return dmgEnemy(e,Math.max(0,d))}
    const top=Math.max(...alive().map(x=>x.hp));if(e.hp===top&&REAL&&F_())addTo(F_(),'focusBonus',SIMD.core.duel.focus*((f&&f.flourish)?f.fmult:1))}
  return _hit(e,base,f,raw)};
const _gainMom=gainMom;gainMom=function(n){if(!CFG.mech&&run.cls==='duel')return;return _gainMom(n)};
const _playCard=playCard;playCard=function(i){const ci=cb.hand[i];if(!ci||!canPlay(ci))return _playCard(i);const d=CARDS[ci.id];
  if(!CFG.mech&&run.cls==='duel')cb.mom=0;
  const fl=run.cls==='duel'&&d.t==='A'&&PLAYOPT&&PLAYOPT.fl&&cb.mom>=SIMD.core.duel.flourish_min;
  if(REAL&&F_()){addTo(ST.plays,ci.id,1);
    if(run.cls==='tide'){const hi=cb.tide>=SIMD.core.tide.high,lo=cb.tide<=SIMD.core.tide.low;if((hi&&['still','breaker','pressure'].includes(ci.id))||(lo&&['riptide','shoal','undercur'].includes(ci.id)))F_().tideBonus++}
    if(fl)F_().flourish++}
  const p=SRC;SRC=fl?'flourish':'card';try{return _playCard(i)}finally{SRC=p}};
function bestAdvance(o){return o.slice().sort((a,b)=>((b.id==='signal'?3:0)+(b.rank||0))-((a.id==='signal'?3:0)+(a.rank||0)))[0]}
function chartSort(n){if(!cb)return;refill(n);const m=Math.min(n,cb.draw.length);const top=cb.draw.slice(0,m);top.sort((a,b)=>cardPri(b)-cardPri(a));for(let i=0;i<m;i++)cb.draw[i]=top[i]}
function helmFlip(){if(CFG.novice)return false;return (cb.tide>5&&cb.tdir<0)||(cb.tide<5&&cb.tdir>0)}
const _startCombat=startCombat;startCombat=function(kind,enc){CURKIND=kind;
  if(REAL&&ST){ST.fight={kind,enc:enc.join('+'),floor:run.floor,hp0:run.hp,dmg:{},blk:{},echoes:0,wpTrig:0,crest:0,undertow:0,tideBonus:0,flourish:0,parryTrig:0,focusBonus:0,flourishMom:0,enterHigh:0,enterLow:0,drift:0,tideturn:0,echoMarked:0,echoFallback:0,echoBonus:0,wpRank:0,wpRankTrig:0,advance:0,landmark:0,momLost:0,maxMom:0};}
  _startCombat(kind,enc);
  if(!CFG.mech&&run.cls==='carto'&&cb){cb.slots=cb.slots.filter(w=>!w.temp)}};
// ---------- starter-relic choices (v2.1) ----------
// Moon Shell: expert opens at 7 (one Surge from High Tide); novice leaves it at 5. Brass Sextant: expert takes Signal Fire, novice random.
function moonStart(){return CFG.novice?5:7}
function sextantPick(){return CFG.novice?['signal','cache','lookout'][Math.floor(Math.random()*3)]:(CFG.sext||'signal')}
// ---------- search ----------
function snap(){return structuredClone({cb,run,S})}
function restore(s){const c=structuredClone(s);cb=c.cb;run=c.run;S=c.S}
function hideDraw(){if(cb&&(run.cls!=='carto'||!CFG.mech))shuffle(cb.draw)}
const AOE=new Set(['spray','whirl','tsunami','crackle','landslide','sweep','pressure','brace','still','swell','ebb','shoal','moonpull','slack','spring','neap','shimmer','hum','mirror','lownote','delay','overtone','recall','amplify','standing','tent','survey','plot','bivouac','shortcut','triang','grand','known','parry','counter','riposte','secondwind','engarde','perfect','footwork','ringing']);
function needsTarget(id){const d=CARDS[id];return !AOE.has(id)&&d.t!=='W'&&d.t!=='P'}
var PDEPTH=0,CURKIND='fight';
function danger(){const inc=alive().reduce((s,e)=>s+enemyThreat(e),0);return run.hp<=run.max*0.3||inc-cb.p.block>=run.hp*0.45}
function potActs(al){const out=[];if(!run.pots||!run.pots.length||cb.mode||cb.busy)return out;
  if(cb.kind==='fight'&&!danger())return out;const seen=new Set();
  run.pots.forEach((id,k)=>{if(seen.has(id)||!potionUsable(id))return;seen.add(id);
    if(id==='moondraught'){out.push({pot:k,arg:10},{pot:k,arg:0});return}
    if(['inkvial','urchin','coraldust'].includes(id)&&al.length>1)al.forEach(e=>out.push({pot:k,arg:cb.ens.indexOf(e)}));else out.push({pot:k,arg:al.length?cb.ens.indexOf(al[0]):0})});return out}
function legal(){const acts=[];
  const al=alive();const seen=new Set();
  if(PDEPTH===0&&!CFG.novice)acts.push(...potActs(al));
  if(run.cls==='tide'&&has('tidetable')&&cb.it&&!cb.it.ttUsed&&cb.played===0&&!cb.mode)acts.push({tt:1},{tt:-1});
  if(run.cls==='carto'&&!cb.advUsed&&!cb.busy&&!cb.mode)cb.slots.forEach((w,k)=>{if((w.rank||0)<SIMD.core.carto.rank_max)acts.push({adv:k})});
  cb.hand.forEach((ci,i)=>{if(!canPlay(ci))return;const key=ci.id+(ci.up?'+':'')+(cost(ci));if(seen.has(key))return;seen.add(key);
    const d=CARDS[ci.id];const ex=[{}];
    if(run.cls==='duel'&&d.t==='A'&&cb.mom>=hkv('flMin',SIMD.core.duel.flourish_min))ex.push({fl:1});
    if(run.cls==='echo'&&!cb.mark&&(!d.faint||hkv('markFaint',false))&&d.t!=='P')ex.push({mk:1});
    for(const o of ex){if(needsTarget(ci.id)&&al.length>1)al.forEach(e=>acts.push(Object.assign({i,t:cb.ens.indexOf(e)},o)));else acts.push(Object.assign({i,t:al.length?cb.ens.indexOf(al[0]):0},o))}});
  return acts}
// expand a play into variants for any choice/slot prompt it opens (Moonpull, Final Destination, full slots, Shortcut+)
function variants(nodeS,a){if(a.adv!=null||a.pot!=null||a.tt)return[a];restore(nodeS);cb.tgt=a.t;PLAYOPT={fl:a.fl,mk:a.mk};playCard(a.i);if(cb&&cb.mode&&cb.mode.k!=='chart'){const n=cb.mode.k==='choice'?cb.mode.opts.length:cb.slots.length;const out=[];for(let k=0;k<n;k++)out.push({i:a.i,t:a.t,m:[k],fl:a.fl,mk:a.mk});return out}return[a]}
function cardPri(ci){const d=CARDS[ci.id];if(d.t==='X')return-5;if(d.t==='P')return 9;if(d.t==='W')return cb.slots.length<cb.nslots?8:2;
  const inc=alive().reduce((s,e)=>{const m=intentOf(e);return s+(m.a?eAtk(e,m.a)*(m.h||1):0)},0);
  if(d.t==='A')return 5+(inc<6?2:0);return 5+(inc>=10?2:0)}
function doChart(){const m=cb.mode;const top=cb.draw.slice(0,m.n);top.sort((a,b)=>cardPri(b)-cardPri(a));for(let i=0;i<m.n;i++)cb.draw[i]=top[i];
  const r=top.findIndex(c=>CARDS[c.id].t==='X');if(r>=0)modeAct('bot',r);modeAct('done')}
function apply(a){if(a.end){endTurn();return}if(a.adv!=null){advance(a.adv);return}
  if(a.pot!=null){usePotion(a.pot,a.arg);while(cb&&cb.mode&&cb.mode.k==='chart')doChart();return}
  if(a.tt){cb.it.ttUsed=true;tideShift(a.tt);checkTide();after();return}cb.tgt=a.t;PLAYOPT={fl:a.fl,mk:a.mk};playCard(a.i);let j=0;
  while(cb&&cb.mode){if(cb.mode.k==='chart')doChart();else modeAct(cb.mode.k,(a.m&&a.m[j++])||0)}}
function enemyThreat(e){const m=e.next&&!e.next.mirror?e.next:intentOf(e);let v=0;if(m.a)v+=eAtk(e,m.a)*(m.h||1);if(m.boom)v+=0;return v}
// v2.1: Waypoints entrench (grow every turn), so an expert values them as engines: ~3 turns of output.
const WPV={signal:10,cache:9,lookout:6,watch:7,waystation:7,camp:15};const PWV={known:8,standing:8,engarde:5,spring:5,neap:4};
function V(){const W=CFG.W;
  if(!cb){if(S.screen==='end'&&!run.won)return -1e6;return 1e5+run.hp*W.hp*5+potHold()*5}
  if(run.hp<=0)return -1e6;
  let v=run.hp*W.hp;
  // v2.1 sim: urgency starts at turn 10 (the Warden stall is fixed by the rules), so the expert doesn't trade HP recklessly in long boss fights
  const ew=W.ehp*(1+Math.max(0,cb.turn-CFG.urgT)*0.6);for(const e of cb.ens){if(e.hp<=0||e.fled)continue;v-=e.hp*ew+e.block*ew*0.7+W.alive;v-=enemyThreat(e)*W.nextAtk;
    v-=(e.st.str||0)*4;v+=(e.st.weak||0)*1.5+(e.st.vuln||0)*1.5;if(e.key==='pod')v-=6*(e.t+1)}
  v+=cb.pstr*5-(cb.p.st.weak||0)*2-(cb.p.st.vuln||0)*3+cb.p.block*0.05;
  for(const w of cb.slots)v+=(WPV[w.id]||3)+(w.up?1:0)+(w.rank||0)*2.5;if(cb.nslots>3)v+=2;
  for(const k in cb.pw)v+=PWV[k]||0;
  if(cb.mom&&run.cls==='duel')v+=cb.mom*2.5;
  if(run.cls==='tide'&&cb.tdir)v+=0;
  for(const c of cb.hand.concat(cb.draw,cb.disc))if(c.id==='ringing')v-=1;for(const c of cb.hand.concat(cb.draw,cb.disc))if(c.cres)v+=c.cres*0.5;
  v+=run.gold*0.03+potHold();return v}
function potHold(){if(!run.pots)return 0;const per=(IT.hold||{})[CURKIND];return run.pots.filter(id=>id!=='secondtide').length*(per==null?9:per)}
function evalEnd(s){restore(s);if(!cb)return V();endTurn();while(cb&&cb.mode&&cb.mode.k==='chart')doChart();return V()}
function terminal(){return !cb}
function planTurn(){const real=snap();REAL=false;
  hideDraw();const root=snap();
  let best={score:evalEnd(root),seq:[{end:true}]};
  let beam=[{s:root,seq:[]}];
  for(let depth=0;depth<CFG.maxDepth&&beam.length;depth++){const kids=[];PDEPTH=depth;
    for(const node of beam){restore(node.s);const acts0=legal();const acts=[];for(const a of acts0)acts.push(...variants(node.s,a));
      for(const a of acts){restore(node.s);apply(a);const term=terminal();const s=snap();const seq=node.seq.concat([a]);
        if(term){const sc=V();if(sc>best.score)best={score:sc,seq};continue}
        const sc=evalEnd(s);
        if(sc>best.score)best={score:sc,seq:seq.concat([{end:true}])};
        kids.push({s,seq,score:sc})}}
    kids.sort((a,b)=>b.score-a.score);beam=kids.slice(0,CFG.beam)}
  PDEPTH=0;restore(real);REAL=true;return best.seq}
function playCombatReal(){let guard=0;
  while(cb&&S.screen==='combat'){if(++guard>3000||cb.turn>60){ST.stall=(ST.stall||0)+1;run.hp=0;lose();break}
    if(cb.mode&&cb.mode.k==='chart'){doChart();continue}
    const seq=planTurn();
    for(const a of seq){const h0=cb.hand.map(c=>c.uid).join(',');apply(a);if(!cb||a.end)break;
      // re-plan whenever the action drew cards or opened a choice (new information)
      if(cb.hand.length>=h0.split(',').length-(a.i!=null?0:0)&&h0!==''&&cb.hand.length>=h0.split(',').length)break}}}
// ---------- out-of-combat policy ----------
const TIER={
 tide:{splash:3,brace:3,riptide:4,still:4,swell:5,ebb:4,breaker:7,shoal:6,spray:5,undercur:5,lash:8,sinking:6,moonpull:5,pressure:7,slack:5,whirl:7,spring:6,neap:5,tsunami:6},
 echo:{arc:3,shimmer:3,reverb:5,hum:2,ping:4,mirror:5,afterimg:5,lownote:3,crackle:5,prism:6,cascade:5,feedback:9,delay:7,overtone:6,recall:3,amplify:5,standing:8,silence:6,crescendo:7},
 carto:{cstrike:3,tent:3,survey:2,signal:5,plot:4,trail:6,bivouac:6,cache:5,lookout:5,shortcut:3,landslide:7,watch:6,waystation:7,triang:5,camp:8,foreknow:5,grand:5,known:8,finaldest:4},
 duel:{thrust:3,parry:4,lunge:4,footwork:3,jab:4,feint:4,slash:7,sweep:6,counter:6,bind:6,flurry:6,riposte:6,press:5,secondwind:5,disarm:5,coup:7,engarde:7,perfect:7,cuts:6}};
function tier(id){return (TIER[run.cls][id]||3)}
function noise(){return (Math.random()*2-1)*CFG.noise}
function upgScore(ci){const d=CARDS[ci.id];return tier(ci.id)+((d.cu!=null)?1.5:0)+(d.t==='X'?-99:0)}
function bestUpg(list){let b=null,bs=-1e9;for(const c of list){const s=upgScore(c);if(s>bs){bs=s;b=c}}return b}
function worstCard(){let b=null,bs=1e9;for(const c of run.deck){let s=tier(c.id)+(c.up?2:0);if(CARDS[c.id].t==='A'&&['splash','arc','cstrike','thrust'].includes(c.id))s-=0.5;if(s<bs){bs=s;b=c}}return b}
function nodeVal(t){const hpf=run.hp/run.max;
  return {fight:3,elite:hpf>0.75?5:hpf>0.55?1:-6,rest:hpf<0.5?7:hpf<0.7?3:1,shop:run.gold>=110?4:run.gold>=60?2:0.5,event:2.5,treasure:4,boss:0}[t]}
function pathVal(r,i,d){const n=run.map[r][i];let v=nodeVal(n.t);if(d>0&&n.to.length)v+=0.8*Math.max(...n.to.map(j=>pathVal(r+1,j,d-1)));return v}
function chooseMap(){if(!CFG.novice&&run.pots&&run.hp<run.max*0.45){const k=run.pots.indexOf('kelpbroth');if(k>=0)usePotion(k)}
  const opts=run.pos.r<0?run.map[0].map((_,i)=>i):run.map[run.pos.r][run.pos.i].to;const r=run.pos.r+1;
  let b=opts[0],bs=-1e9;for(const i of opts){const s=pathVal(r,i,3)+Math.random()*0.5;if(s>bs){bs=s;b=i}}
  ST.path.push(run.map[r][b].t);goNode(r,b)}
function handleReward(){const r=S.rew;const th=run.deck.length>22?5.5:4;
  let b=-1,bs=-1e9;r.cards.forEach((id,i)=>{const s=tier(id)+noise();if(s>bs){bs=s;b=i}});
  ST.offers.push({cards:r.cards.slice(),picked:bs>=th?r.cards[b]:null,elite:r.upg});
  if(bs>=th)rewPick(b);else rewDone()}
function handlePick(){const list=run.deck.filter(c=>S.mode!=='upgrade'||!c.up);
  if(S.mode==='upgrade'){const c=bestUpg(list);if(c){ST.upgrades.push(c.id);return pickCard(c.uid)}return S.then()}
  const c=worstCard();if(S.mode==='remove')ST.removed.push(c.id);return pickCard(c.uid)}
function handleShop(){const items=S.items.map((it,i)=>({it,i,s:tier(it.ci.id)+noise()})).sort((a,b)=>b.s-a.s);const rp=typeof removalPrice==='function'?removalPrice():75;
  if(run.gold>=rp&&!S.removed&&!(items[0].s>=7.5&&run.gold>=items[0].it.price)){shopRemove();handlePick();}
  if(S.relics){const rs=S.relics.map((it,i)=>({it,i,s:relV(it.id)+noise()*0.5})).sort((a,b)=>b.s-a.s);for(const x of rs)if(!x.it.sold&&x.s>=6&&run.gold>=x.it.price){buyRelic(x.i);ST.bought.push('relic:'+x.it.id)}}
  for(const x of items){if(!x.it.sold&&x.s>=6&&run.gold>=x.it.price){buy(x.i);ST.bought.push(x.it.ci.id)}}
  if(run.gold>=removalPrice()&&!S.removed){shopRemove();handlePick()}
  if(S.pots){const ps=S.pots.map((it,i)=>({it,i,s:potV(it.id)})).sort((a,b)=>b.s-a.s);for(const x of ps)if(!x.it.sold&&x.s>=5&&run.gold>=x.it.price+20&&run.pots.length<run.potSlots){buyPot(x.i);ST.bought.push('pot:'+x.it.id)}}
  goMap()}
function handleEvent(){const e=S.ev,hpf=run.hp/run.max;let k=1;
  if(e.n==='Tidepool Shrine')k=hpf>0.6?0:1;
  else if(e.n==='Wandering Cartomancer')k=run.gold>=120?0:1;
  else if(e.n==='Sunken Chest')k=hpf>0.5?0:1;
  else if(e.n==='Campfire Stranger')k=hpf<0.75?0:1;
  ST.events.push(e.n+':'+k);evOpt(k)}
function handleRest(){const hpf=run.hp/run.max;if(hpf<0.5||(run.floor===14&&hpf<0.8)){ST.rests.push('heal');restHeal();return}
  if(typeof has==='function'){
    if(has('grapnel')){ST.rests.push('trawl');return campTrawl()}
    const w=worstCard();if(has('pumice')&&w&&tier(w.id)<=3){ST.rests.push('scour');ST.removed.push(w.id);run.deck.splice(run.deck.indexOf(w),1);return goMap()}
    if(has('rutter')&&!run.opening.length){const b=run.deck.slice().sort((a,b)=>(CARDS[b.id].t==='P'?3:0)+tier(b.id)-(CARDS[a.id].t==='P'?3:0)-tier(a.id))[0];ST.rests.push('annotate');return campAnnotate(b)}
    const up=run.deck.filter(c=>!c.up);if(has('galleypot')&&(!up.length||upgScore(bestUpg(up))<5)){ST.rests.push('cook');return campCook()}}
  ST.rests.push('upg');openPick('upgrade','x',goMap)}
// ---------- item values (AI estimates, like TIER for cards) ----------
const RELV={barnaclecharm:6,kelpwrap:6,coral:6,whaletooth:6,biscuit:5,oysterpurse:4,bandolier:4,foghorn:6,galleypot:4,pocketcompass:5,griptape:6,tuningpeg:6,
  totem:8,coralspur:8,earring:4,lens:7,conch:6,scale:5,chargedcoral:6,pumice:6,anklet:7,flags:6,sirenscale:8,barometer:7,abyssalpearl:7,grapnel:7,moonstone:8,
  organpipe:8,staratlas:8,helmwheel:6,hollowreed:6,cairnstone:6,featherfoil:7,guildtoken:6,apothecary:6,rutter:6,tidetable:7,musicstand:6,surveychain:6,manual:6};
function relV(id){return RELV[id]||5}
const POTV={salttonic:5,inkvial:5,urchin:6,barnacledraught:6,sprayflask:6,quickwater:5,coraldust:5,sparkphial:6,kelpbroth:5,moondraught:7,resvial:7,chartwater:6,
  adrenalsalt:7,mimicink:6,driftglass:5,temperoil:6,secondtide:9,tidalflask:7,abyssaloil:8,mistbomb:4};
function potV(id){return POTV[id]||5}
function potSwap(id){if(CFG.novice)return -1;let k=-1,v=potV(id);run.pots.forEach((p,i)=>{if(potV(p)<v){v=potV(p);k=i}});return k}
function potChoice(ids){let k=0;ids.forEach((id,i)=>{if(potV(id)>potV(ids[k]))k=i});return k}
function endFight(){const f=ST.fight;if(!f)return;f.turns=f._turns;f.hpLost=f.hp0-Math.max(0,run.hp);f.won=run.hp>0;ST.fights.push(f);ST.fight=null}
function playRun(cls,seed,opts){opts=opts||{};__seed(seed);CFG.mech=opts.mech!==false;
  ST={cls,seed,fights:[],offers:[],upgrades:[],removed:[],bought:[],events:[],rests:[],path:[],plays:{},fight:null};
  ITEMOPT=opts;newRun(cls);if(opts.extra)opts.extra.forEach(id=>run.deck.push(mk(id)));
  let guard=0;
  while(++guard<5000){const s=S.screen;
    if(s==='combat'){playCombatReal();if(ST.fight){ST.fight._turns=ST.lastTurn;endFight()}continue}
    if(s==='end')break;
    if(s==='map')chooseMap();else if(s==='reward')handleReward();else if(s==='pick')handlePick();else if(s==='shop')handleShop();
    else if(s==='event')handleEvent();else if(s==='rest')handleRest();else if(s==='msg')S.next();else throw new Error('screen '+s)}
  return {cls,seed,won:run.won,floor:run.floor,hp:run.hp,max:run.max,deck:run.deck.map(c=>c.id+(c.up?'+':'')),stall:ST.stall||0,
    fights:ST.fights,offers:ST.offers,relics:run.relics||[],relicLog:run.relicLog||[],potLog:run.potLog||[],potUsed:run.potUsed||[],chests:run.chests||[],potDrops:run.potDrops||0,potMode:CFG.potMode,upgrades:ST.upgrades,removed:ST.removed,bought:ST.bought,events:ST.events,rests:ST.rests,path:ST.path,plays:ST.plays}}
// track turns: wrap startTurn
const _startTurn=startTurn;startTurn=function(){_startTurn.apply(null,arguments);if(REAL&&cb&&ST)ST.lastTurn=cb.turn};
// Gauntlet: one combat with a given deck at full HP
function playGauntlet(cls,seed,kind,enc,deckIds,opts){opts=opts||{};__seed(seed);CFG.mech=opts.mech!==false;
  ST={cls,seed,fights:[],offers:[],upgrades:[],removed:[],bought:[],events:[],rests:[],path:[],plays:{},fight:null};
  newRun(cls);if(deckIds)run.deck=deckIds.map(x=>{const c=mk(x.replace('+',''));c.up=x.endsWith('+');return c});
  run.floor=kind==='boss'?15:kind==='elite'?8:6;
  startCombat(kind,enc);playCombatReal();ST.fight._turns=ST.lastTurn;endFight();return ST.fights[0]}
// ---------- "novice" rule-based policy (no simulation, no class-mechanic awareness) ----------
const BLOCKC=new Set(['brace','still','ebb','shoal','pressure','shimmer','mirror','lownote','delay','tent','bivouac','parry','counter','riposte','secondwind','perfect']);
// NOVX (env, JSON): diagnostics for the novice policy. noAdv: never Advance. sloppy: the casual player (see SLOPPY below).
var NOVX=(typeof SIMNOVX!=='undefined'&&SIMNOVX)||{};
function sloppy(){return NOVX.sloppy!=null?!!NOVX.sloppy:!!SIMD.novice_sloppy}
function novicePot(al){if(!run.pots||!run.pots.length||!cb.it||cb.it.nt||cb.played>0)return null;cb.it.nt=1;
  const use=CFG.potMode==='random'?Math.random()<0.22:run.hp<run.max*0.28;if(!use)return null;
  const ks=run.pots.map((id,k)=>k).filter(k=>potionUsable(run.pots[k]));if(!ks.length)return null;const k=ks[Math.floor(Math.random()*ks.length)];
  const low=al.slice().sort((a,b)=>a.hp-b.hp)[0];return{pot:k,arg:run.pots[k]==='moondraught'?(Math.random()<0.5?0:10):cb.ens.indexOf(low)}}
function noviceAction(){const al=alive();if(!al.length)return{end:true};
  const pa=novicePot(al);if(pa)return pa;
  if(run.cls==='carto'&&!cb.advUsed&&cb.slots.length&&SIMD.novice_advances&&!NOVX.noAdv){
    if(sloppy()){cb.advUsed=true;if(Math.random()<0.35)return noviceAction(); // forgets to Advance about 1 turn in 3
      const k=Math.floor(Math.random()*cb.slots.length);if((cb.slots[k].rank||0)<SIMD.core.carto.rank_max){cb.advUsed=false;return{adv:k}}return noviceAction()} // random slot, even a maxed one (wasted)
    const ks=cb.slots.map((w,k)=>k).filter(k=>(cb.slots[k].rank||0)<SIMD.core.carto.rank_max);if(ks.length)return{adv:ks[Math.floor(Math.random()*ks.length)]};cb.advUsed=true}
  const inc=al.reduce((s,e)=>{const m=intentOf(e);return s+(m.a?eAtk(e,m.a)*(m.h||1):0)},0);
  const ok=cb.hand.map((c,i)=>({c,i,d:CARDS[c.id]})).filter(x=>canPlay(x.c));if(!ok.length)return{end:true};
  const low=al.slice().sort((a,b)=>a.hp-b.hp)[0];const t=cb.ens.indexOf(low);
  const by=f=>ok.filter(f).sort((a,b)=>tier(b.c.id)-tier(a.c.id))[0];
  let x=by(x=>x.d.t==='P'||(x.d.t==='W'&&cb.slots.length<cb.nslots));
  if(!x&&cb.p.block<inc)x=by(x=>BLOCKC.has(x.c.id));
  if(!x)x=by(x=>x.d.t==='A');
  if(!x)x=by(x=>x.d.t==='S'&&!BLOCKC.has(x.c.id));
  if(!x&&cb.p.block<inc+6)x=by(x=>BLOCKC.has(x.c.id));
  if(!x)return{end:true};const o={i:x.i,t,m:[0]};
  if(sloppy()){ // casual play: replaces a random Waypoint (ignores Rank), Marks whatever it plays first, Flourishes at a random point
    o.m=[Math.floor(Math.random()*Math.max(1,cb.slots.length))];
    if(run.cls==='duel'&&x.d.t==='A'&&cb.mom>=SIMD.core.duel.flourish_min&&Math.random()<0.5)o.fl=1;
    if(run.cls==='echo'&&!cb.mark&&!x.d.faint&&x.d.t!=='P'&&SIMD.novice_marks)o.mk=1;
    if(run.cls==='carto'&&x.d.t==='W'&&cb.slots.length>=cb.nslots&&Math.random()<0.5){} // still places it
    return o}
  if(run.cls==='duel'&&x.d.t==='A'&&cb.mom>=Math.max(3,SIMD.core.duel.flourish_min))o.fl=1;
  if(run.cls==='echo'&&!cb.mark&&x.d.t==='A'&&!x.d.faint&&SIMD.novice_marks)o.mk=1;
  return o}
const _playRun=playRun;
playRun=function(cls,seed,opts){CFG.novice=!!(opts&&opts.novice);CFG.potMode=CFG.novice?(((seed*2654435761)>>>0)%2?'random':'hoard'):'expert';return _playRun(cls,seed,opts)};
const _playG=playGauntlet;playGauntlet=function(cls,seed,kind,enc,deck,opts){CFG.novice=!!(opts&&opts.novice);ITEMOPT=opts||{};CFG.potMode=CFG.novice?'hoard':'expert';return _playG(cls,seed,kind,enc,deck,opts)};
const _pcr=playCombatReal;playCombatReal=function(){if(!CFG.novice)return _pcr();let guard=0;
  while(cb&&S.screen==='combat'){if(++guard>3000||cb.turn>60){ST.stall=(ST.stall||0)+1;run.hp=0;lose();break}
    if(cb.mode&&cb.mode.k==='chart'){doChart();continue}apply(noviceAction())}};
