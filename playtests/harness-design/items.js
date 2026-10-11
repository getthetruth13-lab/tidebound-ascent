// DESIGN SIM v2.2 items layer: non-starter relics + potions on the frozen v1 engine, with the design's reward
// sources (§1.1-1.6): elite relic, Treasure chest table, Merchant relics/potions, potion drops (40% ±10, 3 slots),
// campfire relics. Numbers and the modelled lists come from SIMD.items (data-v2.json → v21.sim.items).
// ITEMOPT (set per run by ai.js): {items:false} turns item rewards off; {relics:[ids]} / {pots:[ids]} force a start.
var ITEMOPT={};
var IT=SIMD.items||{on:false};
function has(id){return !!(run&&run.relics&&run.relics.includes(id))}
var RELICS_SIM={},POTS_SIM={};
(function(){
if(!IT.on)return;
for(const r of IT.relics)RELICS_SIM[r.id]=r;for(const p of IT.potions)POTS_SIM[p.id]=p;
const R=()=>Math.random();
const pickOne=a=>a[Math.floor(R()*a.length)];
const tierRoll=w=>{const x=R()*100;return x<w[0]?'C':x<w[0]+w[1]?'U':'R'};
// ---------- acquisition ----------
function relicPool(tier){return IT.relics.filter(r=>r.tier===tier&&(r.cls==='any'||r.cls===run.cls)&&!run.relics.includes(r.id)).map(r=>r.id)}
function rollRelic(w){let t=tierRoll(w);for(const tt of [t,'U','C','R']){const p=relicPool(tt);if(p.length)return pickOne(p)}return null}
globalThis.gainRelic=function(id,src){if(!id||run.relics.includes(id))return;run.relics.push(id);(run.relicLog=run.relicLog||[]).push(id+'@'+(src||'?')+':'+run.floor);
  if(id==='biscuit'){run.max+=6;run.hp+=6}
  if(id==='bandolier')run.potSlots++;
  if(id==='apothecary'){const ids=[];for(let i=0;i<5;i++)ids.push(rollPotion());while(run.pots.length<run.potSlots&&ids.length){const k=typeof potChoice==='function'?potChoice(ids):0;gainPot(ids.splice(k,1)[0],'apothecary')}}};
function potPool(r){return IT.potions.filter(p=>p.rar===r&&(p.cls==='any'||p.cls===run.cls)).map(p=>p.id)}
globalThis.rollPotion=function(){const w=IT.potion.rar;const x=R()*100;const r=x<w[0]?'C':x<w[0]+w[1]?'U':'R';return pickOne(potPool(r))};
globalThis.gainPot=function(id,src){if(!id)return false;(run.potLog=run.potLog||[]).push(id+'@'+(src||'?'));
  if(run.pots.length<run.potSlots){run.pots.push(id);return true}
  // slots full: the AI decides (swap by value or discard the new one)
  const k=typeof potSwap==='function'?potSwap(id):-1;if(k>=0){run.pots[k]=id;return true}return false};
function potionDrop(kind){if(ITEMOPT.items===false||kind==='boss')return;const P=IT.potion;const ch=run.potChance+(kind==='elite'?P.elite_bonus:0);
  if(R()*100<ch){run.potChance=Math.max(P.min,run.potChance-P.step);gainPot(rollPotion(),kind);run.potDrops=(run.potDrops||0)+1}
  else run.potChance=Math.min(P.max,run.potChance+P.step)}
// ---------- run start ----------
const _newRun=newRun;newRun=function(cls){_newRun(cls);run.relics=[];run.pots=[];run.potSlots=IT.potion.slots;run.potChance=IT.potion.start;run.removals=0;run.opening=[];run.potUsed=[];
  (ITEMOPT.relics||[]).forEach(id=>gainRelic(id,'forced'));(ITEMOPT.pots||[]).forEach(id=>gainPot(id,'forced'))};
// ---------- rewards ----------
const _win=win;win=function(){const k=cb&&cb.kind;
  if(cb&&has('kelpwrap'))heal(IT.p.kelpwrap);
  if(cb&&cb.temper)cb.temper.forEach(c=>{c.up=false});
  _win();
  if(k&&k!=='boss'){potionDrop(k);
    if(k==='elite'&&ITEMOPT.items!==false&&IT.elite_relic&&S.rew){S.rew.upg=false;S.rew.relic=rollRelic(IT.relic_rar);gainRelic(S.rew.relic,'elite')}}};
const _lose=lose;lose=function(){if(cb&&cb.temper)cb.temper.forEach(c=>{c.up=false});return _lose()};
const _enter=enterNode;enterNode=function(t){
  if(t==='event'&&has('oysterpurse'))run.gold+=IT.p.oysterpurse;
  if(t==='treasure'&&ITEMOPT.items!==false){const C=IT.chest;const x=R()*100;const sz=x<C[0].w?0:x<C[0].w+C[1].w?1:2;const c=C[sz];
    const id=rollRelic(c.rar);gainRelic(id,'chest');if(R()<c.gold[0]){const g=c.gold[1]+Math.floor(R()*(c.gold[2]-c.gold[1]+1));run.gold+=g}
    (run.chests=run.chests||[]).push(['small','medium','large'][sz]);return goMap()}
  return _enter(t)};
const rngi=(a,b)=>a+Math.floor(R()*(b-a+1));
openShop=function(){const items=[];const used=[];const SP=IT.shop;const disc=has('guildtoken')?0.65:1;
  for(let i=0;i<5;i++){let c,g=0;do{c=pick(poolOf(rollRar(false)))}while(used.includes(c.id)&&g++<50);used.push(c.id);const pr=SP.card[{c:'C',u:'U',r:'R'}[c.r]];items.push({ci:mk(c.id),price:Math.round(rngi(pr[0],pr[1])*disc)})}
  const relics=[],pots=[];
  if(ITEMOPT.items!==false){
    for(let i=0;i<2;i++){const id=rollRelic(IT.relic_rar);if(id&&!relics.some(x=>x.id===id))relics.push({id,price:Math.round(rngi(...SP.relic[RELICS_SIM[id].tier])*disc)})}
    const sp=IT.relics.filter(r=>r.tier==='Shop'&&(r.cls==='any'||r.cls===run.cls)&&!run.relics.includes(r.id));if(sp.length){const id=pickOne(sp).id;relics.push({id,price:Math.round(rngi(...SP.relic.Shop)*disc)})}
    for(let i=0;i<3;i++){const id=rollPotion();pots.push({id,price:Math.round(rngi(...SP.potion[POTS_SIM[id].rar])*disc)})}}
  S={screen:'shop',items,relics,pots,removed:false};render()};
globalThis.buyRelic=function(i){const it=S.relics[i];if(it.sold||run.gold<it.price)return false;run.gold-=it.price;it.sold=true;gainRelic(it.id,'shop');return true};
globalThis.buyPot=function(i){const it=S.pots[i];if(it.sold||run.gold<it.price||run.pots.length>=run.potSlots)return false;run.gold-=it.price;it.sold=true;gainPot(it.id,'shop');return true};
globalThis.removalPrice=function(){return has('scale')?IT.p.scale:Math.round((IT.shop.removal+IT.shop.removal_step*(run.removals||0))*(has('guildtoken')?0.65:1))};
shopRemove=function(){const pr=removalPrice();if(S.removed||run.gold<pr)return;const back=S;openPick('remove','Remove a card',()=>{run.gold-=pr;run.removals++;back.removed=true;S=back;render()},()=>{S=back;render()})};
// campfire relic options (the AI picks; see ai.js handleRest)
globalThis.campCook=function(){run.max+=IT.p.galleypot;run.hp+=IT.p.galleypot;goMap()};
globalThis.campTrawl=function(){gainRelic(rollRelic([60,40,0]),'grapnel');goMap()};
globalThis.campAnnotate=function(ci){run.opening.push(ci.uid);goMap()};
// ---------- combat hooks ----------
const _sc=startCombat;startCombat=function(kind,enc){if(cb)cb.temper=null;return _sc(kind,enc)};
const _st=startTurn;startTurn=function(){
  const first=cb.turn===0;
  if(first){cb.it={};
    if(has('staratlas')&&run.cls==='carto'&&cb.slots.length<cb.nslots){const id=pick(['signal','cache','lookout'].filter(x=>!cb.slots.some(w=>w.id===x)));cb.slots.push({id,uid:UID++,up:false,temp:true})}
    if(run.opening.length){const op=cb.draw.filter(c=>run.opening.includes(c.uid));cb.draw=op.concat(cb.draw.filter(c=>!run.opening.includes(c.uid)))}
    if(has('musicstand')&&run.cls==='echo'){const k=cb.draw.findIndex(c=>/Resound/.test(CARDS[c.id].d||''));if(k>=0)cb.hand.push(cb.draw.splice(k,1)[0])}
    if(has('pocketcompass')&&typeof chartSort==='function')chartSort(IT.p.pocketcompass)}
  else{ // helm wheel: flip the drift arrow before the drift (AI decides)
    if(has('helmwheel')&&run.cls==='tide'&&cb.tdir&&typeof helmFlip==='function'&&helmFlip())cb.tdir=-cb.tdir}
  const pe=cb.it.pearl||0;cb.it.pearl=0;cb.it.ttUsed=false;cb.it.scUsed=false;cb.it.resvial=0;cb.it.mimic=0;
  _st();if(!cb)return;
  const t=cb.turn;
  if(t===1){if(has('barnaclecharm'))gainBlock(IT.p.barnaclecharm);if(has('coral'))cb.it.poise=IT.p.coral;if(has('coralspur'))cb.pstr+=IT.p.coralspur;
    if(has('foghorn'))alive().forEach(e=>addSt(e,'weak',IT.p.foghorn))}
  if(t===2&&has('lens'))gainBlock(IT.p.lens);
  if(has('totem')&&t%3===0)cb.energy++;
  if(pe)cb.energy+=pe;
  if(cb.it.oil>0){cb.energy++;cb.it.oil--}};
const _et=endTurn;endTurn=function(){if(!cb||cb.busy||cb.mode)return;
  if(has('abyssalpearl'))cb.it.pearl=Math.min(IT.p.abyssalpearl,cb.energy);
  if(has('barometer')&&cb.turn===IT.p.barometer[0]){alive().forEach(e=>dmgEnemy(e,IT.p.barometer[1]))}
  return _et()};
// Guard from cards: Brittle (world.js) and Poise
const F1=F;F=function(ci,o){const f=F1(ci,o);const bk=f.blk,pa=f.parry;
  f.blk=n=>{cb.__cardBlk=1;bk(n+((cb.it&&cb.it.poise)||0));cb.__cardBlk=0};
  f.parry=n=>{cb.__cardBlk=1;pa(n+(has('manual')?IT.p.manual:0)+((cb.it&&cb.it.poise)||0));cb.__cardBlk=0};return f};
const _hit=hit;hit=function(e,base,f,raw){if(f&&!raw&&cb.it&&cb.it.wt===1){_hit(e,base+IT.p.whaletooth[0],f,raw);if(e.hp>0)addSt(e,'vuln',IT.p.whaletooth[1]);return}return _hit(e,base,f,raw)};
const _dm=dmgEnemy;dmgEnemy=function(e,d){const was=e.hp;_dm(e,d);
  if(was>0&&e.hp<=0&&has('conch')&&!e.isSummon&&cb){if(cb.busy)cb.nextDraw=(cb.nextDraw||0)+1;else drawCards(1);gainBlock(IT.p.conch)}};
const _ehp=enemyHitPlayer;enemyHitPlayer=function(e,d){_ehp(e,d);if(run.hp>0)return;
  if(has('sirenscale')&&!run.sirenUsed){run.sirenUsed=1;run.hp=Math.floor(run.max*IT.p.sirenscale);return}
  const k=run.pots.indexOf('secondtide');if(k>=0){run.pots.splice(k,1);run.potUsed.push('secondtide@'+cb.kind);run.hp=Math.floor(run.max*IT.p.secondtide)}};
const _cost=cost;cost=function(ci){let c=_cost(ci);if(cb&&cb.it&&has('flags')&&!cb.it.flags&&CARDS[ci.id].t==='W')c=0;return c};
const _chart=chart;chart=function(n,then){if(cb&&cb.it&&has('surveychain')&&!cb.it.scUsed){cb.it.scUsed=1;drawCards(1)}return _chart(n,then)};
HK.prePlay=(ci,f)=>{const d=CARDS[ci.id];if(!cb.it)return;
  if(d.t==='A'&&has('whaletooth')&&!cb.it.wtDone){cb.it.wt=1;cb.it.wtDone=1}
  if(d.t==='W'&&has('flags'))cb.it.flags=1};
HK.postPlay=(ci,f)=>{if(!cb||!cb.it)return;cb.it.wt=0;
  if(has('chargedcoral')&&cb.played===4)alive().forEach(e=>hit(e,IT.p.chargedcoral,null,true));
  if(cb.it.mimic===1&&ci.id!=='__pot'){cb.it.mimic=0;const d=CARDS[ci.id];if(d.p&&alive().length){const g=F(ci,{tgt:curTgt()});d.p(g)}}};
HK.onSink=ci=>{if(has('earring'))gainBlock(IT.p.earring)};
HK.crestAdd=d=>d+(has('moonstone')?IT.p.moonstone:0);
HK.onCrest=()=>{if(has('anklet'))alive().forEach(e=>addSt(e,'vuln',1))};
HK.onUndertow=()=>{if(has('anklet'))alive().forEach(e=>addSt(e,'weak',1))};
HK.echoExtra=d=>d+((cb.it&&cb.it.resvial)||0);
HK.echoAll=d=>d||has('organpipe');
HK.markFaint=d=>d||has('hollowreed');
HK.onEcho=(ci,half)=>{if(has('tuningpeg'))gainBlock(IT.p.tuningpeg);if(has('hollowreed')&&CARDS[ci.id].faint)cb.nextDraw=(cb.nextDraw||0)+1};
HK.flMin=d=>has('featherfoil')?1:d;
HK.flExtra=d=>d+(has('griptape')&&cb.it&&!cb.it.grip?2:0);
HK.onFlourish=f=>{if(has('griptape')&&cb.it)cb.it.grip=1};
HK.wpReplaced=(old,ci,r)=>{if(has('cairnstone')&&r)ci.rank=r};
// ---------- potions ----------
// usePotion(k, arg): k = slot, arg = target enemy index or a mode (Moondraught 0/10).
globalThis.potionUsable=function(id){const p=POTS_SIM[id];if(!p)return false;if(!cb)return id==='kelpbroth';if(id==='secondtide')return false;
  if(id==='mistbomb')return cb.kind==='fight';if(id==='tidalflask')return run.pots.length<run.potSlots+1;return true};
globalThis.usePotion=function(k,arg){const id=run.pots[k];if(!id||!potionUsable(id))return false;run.pots.splice(k,1);run.potUsed.push(id+'@'+(cb?cb.kind:'map'));
  const P=IT.p,tg=()=>{let t=cb.ens[arg];if(!t||t.hp<=0||t.fled)t=alive()[0];return t};
  if(!cb){if(id==='kelpbroth')heal(Math.floor(run.max*P.kelpbroth));return true}
  switch(id){
   case 'salttonic':gainBlock(P.salttonic);break;
   case 'inkvial':addSt(tg(),'weak',3);break;
   case 'urchin':hit(tg(),P.urchin,null,true);break;
   case 'barnacledraught':cb.pstr+=2;break;
   case 'sprayflask':alive().forEach(e=>hit(e,P.sprayflask,null,true));break;
   case 'quickwater':drawCards(3);break;
   case 'coraldust':addSt(tg(),'vuln',3);break;
   case 'sparkphial':cb.energy+=2;break;
   case 'kelpbroth':heal(Math.floor(run.max*P.kelpbroth));break;
   case 'moondraught':cb.tide=arg===0?0:10;checkTide();break;
   case 'resvial':cb.it.resvial=2;break;
   case 'chartwater':{if(cb.slots.length<cb.nslots)cb.slots.push({id:pick(['cache','lookout']),uid:UID++,up:false,temp:true});if(typeof chartSort==='function')chartSort(6);break}
   case 'adrenalsalt':gainMom(3);cb.__cardBlk=1;gainBlock(8);cb.parry+=8;cb.__cardBlk=0;break;
   case 'mimicink':cb.it.mimic=1;break;
   case 'driftglass':{const pool=poolOf('u');const c=mk(pick(pool).id);c.tmp0=true;if(cb.hand.length<10)cb.hand.push(c);break}
   case 'temperoil':{cb.temper=cb.temper||[];cb.hand.forEach(c=>{if(!c.up){c.up=true;cb.temper.push(c)}});break}
   case 'tidalflask':while(run.pots.length<run.potSlots)run.pots.push(rollPotion());break;
   case 'abyssaloil':cb.it.oil=3;break;
   case 'mistbomb':cb=null;goMap();return true;
  }
  after();return true};
})();
