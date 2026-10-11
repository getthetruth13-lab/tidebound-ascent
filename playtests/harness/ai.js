// ===================== Playtest AI (runs inside the game's script scope) =====================
// Heuristic player: beam search over the current turn's card plays, each candidate line scored by
// actually simulating end-of-turn (Echo, Waypoints, enemy intents) on a cloned game state and
// evaluating the resulting position. Draw-pile order is hidden from the search (re-shuffled in the
// clone) for every class except the Cartographer, whose Open Map makes it legitimately visible.
var REAL=true, ST=null, SRC='card';
var CFG={mech:true,noise:2,beam:5,maxDepth:10,W:{hp:2,ehp:1,alive:5,nextAtk:0.7}};
function addTo(o,k,v){o[k]=(o[k]||0)+v}
function F_(){return ST&&ST.fight}
// ---------- instrumentation wrappers ----------
const _dmgEnemy=dmgEnemy;
dmgEnemy=function(e,d){const b=e.hp;_dmgEnemy(e,d);if(REAL&&F_()){addTo(F_().dmg,SRC,Math.max(0,b-Math.max(0,e.hp)))}};
const _gainBlock=gainBlock;
gainBlock=function(n){_gainBlock(n);if(REAL&&F_()&&n>0)addTo(F_().blk,SRC,Math.floor(n))};
function withSrc(fn,s){return function(){const p=SRC;SRC=s;try{return fn.apply(null,arguments)}finally{SRC=p}}}
const _doEcho=doEcho;doEcho=withSrc(function(){if(!CFG.mech&&run.cls==='echo')return;if(REAL&&F_()&&cb.last&&!CARDS[cb.last.id].faint)F_().echoes++;return _doEcho()},'echo');
const _trigWp=trigWp;trigWp=withSrc(function(w){if(REAL&&F_())F_().wpTrig++;return _trigWp(w)},'wp');
const _checkTide=checkTide;checkTide=withSrc(function(){
  if(!CFG.mech&&run.cls==='tide'){cb.tide=Math.max(0,Math.min(10,cb.tide));return}
  if(REAL&&F_()){if(cb.tide>=10)F_().crest++;else if(cb.tide<=0)F_().undertow++}
  return _checkTide()},'tide');
const _enemyHitPlayer=enemyHitPlayer;enemyHitPlayer=withSrc(function(e,d){
  let saved=null;if(!CFG.mech&&run.cls==='duel'){saved=cb.parry;cb.parry=0}
  const before=e.hp;const r=_enemyHitPlayer(e,d);
  if(saved!==null)cb.parry=saved;
  if(REAL&&F_()&&e.hp<before&&run.cls==='duel')F_().parryTrig++;
  return r},'parry');
const _hit=hit;hit=function(e,base,f,raw){
  if(run.cls==='duel'&&!raw&&e&&e.hp>0&&!e.fled){
    if(!CFG.mech){let d=base+cb.pstr;if(cb.p.st.weak)d=Math.floor(d*.75);if(e.st.vuln)d=Math.floor(d*1.5);return dmgEnemy(e,Math.max(0,d))}
    const top=Math.max(...alive().map(x=>x.hp));if(e.hp===top&&REAL&&F_())addTo(F_(),'focusBonus',(f&&f.flourish)?4:2)}
  return _hit(e,base,f,raw)};
const _gainMom=gainMom;gainMom=function(n){if(!CFG.mech&&run.cls==='duel')return;return _gainMom(n)};
const _playCard=playCard;playCard=function(i){const ci=cb.hand[i];if(!ci||!canPlay(ci))return _playCard(i);const d=CARDS[ci.id];
  if(!CFG.mech&&run.cls==='duel')cb.mom=0;
  const fl=run.cls==='duel'&&d.t==='A'&&cb.mom>=3;
  if(REAL&&F_()){addTo(ST.plays,ci.id,1);
    if(run.cls==='tide'){const hi=cb.tide>=7,lo=cb.tide<=3;if((hi&&['still','breaker','pressure'].includes(ci.id))||(lo&&['riptide','shoal','undercur'].includes(ci.id)))F_().tideBonus++}
    if(fl)F_().flourish++}
  const p=SRC;SRC=fl?'flourish':'card';try{return _playCard(i)}finally{SRC=p}};
const _startCombat=startCombat;startCombat=function(kind,enc){
  if(REAL&&ST){ST.fight={kind,enc:enc.join('+'),floor:run.floor,hp0:run.hp,dmg:{},blk:{},echoes:0,wpTrig:0,crest:0,undertow:0,tideBonus:0,flourish:0,parryTrig:0,focusBonus:0};}
  _startCombat(kind,enc);
  if(!CFG.mech&&run.cls==='carto'&&cb){cb.slots=cb.slots.filter(w=>!w.temp)}};
// ---------- search ----------
function snap(){return structuredClone({cb,run,S})}
function restore(s){const c=structuredClone(s);cb=c.cb;run=c.run;S=c.S}
function hideDraw(){if(cb&&(run.cls!=='carto'||!CFG.mech))shuffle(cb.draw)}
const AOE=new Set(['spray','whirl','tsunami','crackle','landslide','sweep','pressure','brace','still','swell','ebb','shoal','moonpull','slack','spring','neap','shimmer','hum','mirror','lownote','delay','overtone','recall','amplify','standing','tent','survey','plot','bivouac','shortcut','triang','grand','known','parry','counter','riposte','secondwind','engarde','perfect','footwork','ringing']);
function needsTarget(id){const d=CARDS[id];return !AOE.has(id)&&d.t!=='W'&&d.t!=='P'}
function legal(){const acts=[];
  const al=alive();const seen=new Set();
  cb.hand.forEach((ci,i)=>{if(!canPlay(ci))return;const key=ci.id+(ci.up?'+':'')+(cost(ci));if(seen.has(key))return;seen.add(key);
    if(needsTarget(ci.id)&&al.length>1)al.forEach(e=>acts.push({i,t:cb.ens.indexOf(e)}));else acts.push({i,t:al.length?cb.ens.indexOf(al[0]):0})});
  return acts}
// expand a play into variants for any choice/slot prompt it opens (Moonpull, Final Destination, full slots, Shortcut+)
function variants(nodeS,a){restore(nodeS);cb.tgt=a.t;playCard(a.i);if(cb&&cb.mode&&cb.mode.k!=='chart'){const n=cb.mode.k==='choice'?cb.mode.opts.length:cb.slots.length;const out=[];for(let k=0;k<n;k++)out.push({i:a.i,t:a.t,m:[k]});return out}return[a]}
function cardPri(ci){const d=CARDS[ci.id];if(d.t==='X')return-5;if(d.t==='P')return 9;if(d.t==='W')return cb.slots.length<cb.nslots?8:2;
  const inc=alive().reduce((s,e)=>{const m=intentOf(e);return s+(m.a?eAtk(e,m.a)*(m.h||1):0)},0);
  if(d.t==='A')return 5+(inc<6?2:0);return 5+(inc>=10?2:0)}
function doChart(){const m=cb.mode;const top=cb.draw.slice(0,m.n);top.sort((a,b)=>cardPri(b)-cardPri(a));for(let i=0;i<m.n;i++)cb.draw[i]=top[i];
  const r=top.findIndex(c=>CARDS[c.id].t==='X');if(r>=0)modeAct('bot',r);modeAct('done')}
function apply(a){if(a.end){endTurn();return}cb.tgt=a.t;playCard(a.i);let j=0;
  while(cb&&cb.mode){if(cb.mode.k==='chart')doChart();else modeAct(cb.mode.k,(a.m&&a.m[j++])||0)}}
function enemyThreat(e){const m=e.next&&!e.next.mirror?e.next:intentOf(e);let v=0;if(m.a)v+=eAtk(e,m.a)*(m.h||1);if(m.boom)v+=0;return v}
const WPV={signal:4,cache:4,lookout:2,watch:4,waystation:5,camp:7};const PWV={known:8,standing:8,engarde:5,spring:5,neap:4};
function V(){const W=CFG.W;
  if(!cb){if(S.screen==='end'&&!run.won)return -1e6;return 1e5+run.hp*W.hp*5}
  if(run.hp<=0)return -1e6;
  let v=run.hp*W.hp;
  const ew=W.ehp*(1+Math.max(0,cb.turn-4)*0.6);for(const e of cb.ens){if(e.hp<=0||e.fled)continue;v-=e.hp*ew+e.block*ew*0.7+W.alive;v-=enemyThreat(e)*W.nextAtk;
    v-=(e.st.str||0)*4;v+=(e.st.weak||0)*1.5+(e.st.vuln||0)*1.5;if(e.key==='pod')v-=6*(e.t+1)}
  v+=cb.pstr*5-(cb.p.st.weak||0)*2-(cb.p.st.vuln||0)*3+cb.p.block*0.05;
  for(const w of cb.slots)v+=(WPV[w.id]||3)+(w.up?1:0);if(cb.nslots>3)v+=2;
  for(const k in cb.pw)v+=PWV[k]||0;
  if(cb.mom&&run.cls==='duel')v+=cb.mom*1.5;
  for(const c of cb.hand.concat(cb.draw,cb.disc))if(c.id==='ringing')v-=1;for(const c of cb.hand.concat(cb.draw,cb.disc))if(c.cres)v+=c.cres*0.5;
  v+=run.gold*0.03;return v}
function evalEnd(s){restore(s);if(!cb)return V();endTurn();while(cb&&cb.mode&&cb.mode.k==='chart')doChart();return V()}
function terminal(){return !cb}
var DECLOG=null;
function akey(a){if(!a||a.end)return 'end';return (cb&&cb.hand[a.i]?cb.hand[a.i].id:'?')}
function planTurn(){const real=snap();REAL=false;const startHand=cb.hand.map(c=>c.id);const FB={};const fk=a=>(!a||a.end)?'end':startHand[a.i]+(a.m?'#'+a.m.join(''):'');
  const note=(seq,sc)=>{const k=fk(seq[0]);if(FB[k]===undefined||sc>FB[k])FB[k]=sc};
  hideDraw();const root=snap();
  let best={score:evalEnd(root),seq:[{end:true}]};note([{end:true}],best.score);
  let beam=[{s:root,seq:[]}];
  for(let depth=0;depth<CFG.maxDepth&&beam.length;depth++){const kids=[];
    for(const node of beam){restore(node.s);const acts0=legal();const acts=[];for(const a of acts0)acts.push(...variants(node.s,a));
      for(const a of acts){restore(node.s);apply(a);const term=terminal();const s=snap();const seq=node.seq.concat([a]);
        if(term){const sc=V();note(seq,sc);if(sc>best.score)best={score:sc,seq};continue}
        const sc=evalEnd(s);note(seq,sc);
        if(sc>best.score)best={score:sc,seq:seq.concat([{end:true}])};
        kids.push({s,seq,score:sc})}}
    kids.sort((a,b)=>b.score-a.score);beam=kids.slice(0,CFG.beam)}
  restore(real);REAL=true;
  if(DECLOG&&cb.played===0&&cb.declogged!==cb.turn){cb.declogged=cb.turn;const vals=Object.values(FB).sort((a,b)=>b-a);
    const nov=CFG.novice?null:noviceAction();const handCost=cb.hand.reduce((t,c)=>t+(CARDS[c.id].t==='X'?0:cost(c)),0);
    DECLOG.push({cls:run.cls,enc:ST&&ST.fight&&ST.fight.enc,kind:cb.kind,turn:cb.turn,nFirst:vals.length,gap:vals.length>1?vals[0]-vals[1]:Infinity,
      best:fk(best.seq[0]),novice:nov?(nov.end?'end':cb.hand[nov.i].id):null,handCost,energy:cb.energy,seqLen:best.seq.filter(a=>!a.end).length,
      dmg0:ST&&ST.fight?Object.values(ST.fight.dmg).reduce((a,b)=>a+b,0):0})}
  return best.seq}
function playCombatReal(){let guard=0;
  while(cb&&S.screen==='combat'){if(++guard>3000||cb.turn>60){ST.stall=(ST.stall||0)+1;run.hp=0;lose();break}
    if(cb.mode&&cb.mode.k==='chart'){doChart();continue}
    const seq=planTurn();
    for(const a of seq){const h0=cb.hand.map(c=>c.uid).join(',');apply(a);if(!cb||a.end)break;
      // re-plan whenever the action drew cards or opened a choice (new information)
      if(cb.hand.length>=h0.split(',').length-(a.i!=null?0:0)&&h0!==''&&cb.hand.length>=h0.split(',').length)break}}}
// ---------- out-of-combat policy ----------
const TIER={
 tide:{splash:3,brace:3,riptide:4,still:4,swell:5,ebb:4,breaker:7,shoal:6,spray:5,undercur:5,lash:8,sinking:6,moonpull:5,pressure:7,slack:3,whirl:7,spring:6,neap:5,tsunami:6},
 echo:{arc:3,shimmer:3,reverb:5,hum:2,ping:4,mirror:5,afterimg:5,lownote:3,crackle:5,prism:6,cascade:5,feedback:9,delay:7,overtone:5,recall:3,amplify:5,standing:8,silence:6,crescendo:7},
 carto:{cstrike:3,tent:3,survey:2,signal:5,plot:2,trail:6,bivouac:6,cache:5,lookout:3,shortcut:3,landslide:7,watch:6,waystation:7,triang:5,camp:8,foreknow:5,grand:5,known:8,finaldest:4},
 duel:{thrust:3,parry:4,lunge:4,footwork:3,jab:4,feint:4,slash:7,sweep:6,counter:6,bind:6,flurry:6,riposte:6,press:5,secondwind:4,disarm:5,coup:7,engarde:7,perfect:7,cuts:6}};
function tier(id){return (TIER[run.cls][id]||3)}
function noise(){return (Math.random()*2-1)*CFG.noise}
function upgScore(ci){const d=CARDS[ci.id];return tier(ci.id)+((d.cu!=null)?1.5:0)+(d.t==='X'?-99:0)}
function bestUpg(list){let b=null,bs=-1e9;for(const c of list){const s=upgScore(c);if(s>bs){bs=s;b=c}}return b}
function worstCard(){let b=null,bs=1e9;for(const c of run.deck){let s=tier(c.id)+(c.up?2:0);if(CARDS[c.id].t==='A'&&['splash','arc','cstrike','thrust'].includes(c.id))s-=0.5;if(s<bs){bs=s;b=c}}return b}
function nodeVal(t){const hpf=run.hp/run.max;
  return {fight:3,elite:hpf>0.75?5:hpf>0.55?1:-6,rest:hpf<0.5?7:hpf<0.7?3:1,shop:run.gold>=110?4:run.gold>=60?2:0.5,event:2.5,treasure:4,boss:0}[t]}
function pathVal(r,i,d){const n=run.map[r][i];let v=nodeVal(n.t);if(d>0&&n.to.length)v+=0.8*Math.max(...n.to.map(j=>pathVal(r+1,j,d-1)));return v}
function chooseMap(){const opts=run.pos.r<0?run.map[0].map((_,i)=>i):run.map[run.pos.r][run.pos.i].to;const r=run.pos.r+1;
  let b=opts[0],bs=-1e9;for(const i of opts){const s=pathVal(r,i,3)+Math.random()*0.5;if(s>bs){bs=s;b=i}}
  ST.path.push(run.map[r][b].t);goNode(r,b)}
function handleReward(){const r=S.rew;const th=run.deck.length>22?5.5:4;
  let b=-1,bs=-1e9;r.cards.forEach((id,i)=>{const s=tier(id)+noise();if(s>bs){bs=s;b=i}});
  ST.offers.push({cards:r.cards.slice(),picked:bs>=th?r.cards[b]:null,elite:r.upg});
  if(bs>=th)rewPick(b);else rewDone()}
function handlePick(){const list=run.deck.filter(c=>S.mode!=='upgrade'||!c.up);
  if(S.mode==='upgrade'){const c=bestUpg(list);if(c){ST.upgrades.push(c.id);return pickCard(c.uid)}return S.then()}
  const c=worstCard();if(S.mode==='remove')ST.removed.push(c.id);return pickCard(c.uid)}
function handleShop(){const items=S.items.map((it,i)=>({it,i,s:tier(it.ci.id)+noise()})).sort((a,b)=>b.s-a.s);
  if(run.gold>=75&&!S.removed&&!(items[0].s>=7.5&&run.gold>=items[0].it.price)){shopRemove();handlePick();}
  for(const x of items){if(!x.it.sold&&x.s>=6&&run.gold>=x.it.price){buy(x.i);ST.bought.push(x.it.ci.id)}}
  if(run.gold>=75&&!S.removed){shopRemove();handlePick()}
  goMap()}
function handleEvent(){const e=S.ev,hpf=run.hp/run.max;let k=1;
  if(e.n==='Tidepool Shrine')k=hpf>0.6?0:1;
  else if(e.n==='Wandering Cartomancer')k=run.gold>=120?0:1;
  else if(e.n==='Sunken Chest')k=hpf>0.5?0:1;
  else if(e.n==='Campfire Stranger')k=hpf<0.75?0:1;
  ST.events.push(e.n+':'+k);evOpt(k)}
function handleRest(){const hpf=run.hp/run.max;if(hpf<0.5||(run.floor===14&&hpf<0.8)){ST.rests.push('heal');restHeal()}else{ST.rests.push('upg');openPick('upgrade','x',goMap)}}
function endFight(){const f=ST.fight;if(!f)return;f.turns=f._turns;f.hpLost=f.hp0-Math.max(0,run.hp);f.won=run.hp>0;ST.fights.push(f);ST.fight=null}
function playRun(cls,seed,opts){opts=opts||{};__seed(seed);CFG.mech=opts.mech!==false;
  ST={cls,seed,fights:[],offers:[],upgrades:[],removed:[],bought:[],events:[],rests:[],path:[],plays:{},fight:null};
  newRun(cls);if(opts.extra)opts.extra.forEach(id=>run.deck.push(mk(id)));
  let guard=0;
  while(++guard<5000){const s=S.screen;
    if(s==='combat'){playCombatReal();if(ST.fight){ST.fight._turns=ST.lastTurn;endFight()}continue}
    if(s==='end')break;
    if(s==='map')chooseMap();else if(s==='reward')handleReward();else if(s==='pick')handlePick();else if(s==='shop')handleShop();
    else if(s==='event')handleEvent();else if(s==='rest')handleRest();else if(s==='msg')S.next();else throw new Error('screen '+s)}
  return {cls,seed,won:run.won,floor:run.floor,hp:run.hp,max:run.max,deck:run.deck.map(c=>c.id+(c.up?'+':'')),stall:ST.stall||0,
    fights:ST.fights,offers:ST.offers,upgrades:ST.upgrades,removed:ST.removed,bought:ST.bought,events:ST.events,rests:ST.rests,path:ST.path,plays:ST.plays}}
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
function noviceAction(){const al=alive();if(!al.length)return{end:true};
  const inc=al.reduce((s,e)=>{const m=intentOf(e);return s+(m.a?eAtk(e,m.a)*(m.h||1):0)},0);
  const ok=cb.hand.map((c,i)=>({c,i,d:CARDS[c.id]})).filter(x=>canPlay(x.c));if(!ok.length)return{end:true};
  const low=al.slice().sort((a,b)=>a.hp-b.hp)[0];const t=cb.ens.indexOf(low);
  const by=f=>ok.filter(f).sort((a,b)=>tier(b.c.id)-tier(a.c.id))[0];
  let x=by(x=>x.d.t==='P'||(x.d.t==='W'&&cb.slots.length<cb.nslots));
  if(!x&&cb.p.block<inc)x=by(x=>BLOCKC.has(x.c.id));
  if(!x)x=by(x=>x.d.t==='A');
  if(!x)x=by(x=>x.d.t==='S'&&!BLOCKC.has(x.c.id));
  if(!x&&cb.p.block<inc+6)x=by(x=>BLOCKC.has(x.c.id));
  if(!x)return{end:true};return{i:x.i,t,m:[0]}}
const _playRun=playRun;
playRun=function(cls,seed,opts){CFG.novice=!!(opts&&opts.novice);return _playRun(cls,seed,opts)};
const _playG=playGauntlet;playGauntlet=function(cls,seed,kind,enc,deck,opts){CFG.novice=!!(opts&&opts.novice);return _playG(cls,seed,kind,enc,deck,opts)};
const _pcr=playCombatReal;playCombatReal=function(){if(!CFG.novice)return _pcr();let guard=0;
  while(cb&&S.screen==='combat'){if(++guard>3000||cb.turn>60){ST.stall=(ST.stall||0)+1;run.hp=0;lose();break}
    if(cb.mode&&cb.mode.k==='chart'){doChart();continue}apply(noviceAction())}};
