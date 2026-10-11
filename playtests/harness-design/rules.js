// ===================== DESIGN SIM: v2.1 rules layer =====================
// NOT the game. Runs inside the frozen v1 engine (../harness/game-snapshot.html) and replaces the
// core-rule functions with the v2.1 design, using numbers from design/data-v2.json → v21.sim (injected as SIMD).
// Loaded AFTER the game script and BEFORE ai.js, so the playtest instrumentation wraps these versions.
var PLAYOPT={};
var HK={};               // item hooks (items.js): hk(name,...) fires, hkv(name,default,...) modifies
function hk(k,a,b,c){return HK[k]?HK[k](a,b,c):undefined}
function hkv(k,d,a,b){return HK[k]?HK[k](d,a,b):d}            // set by the AI before playCard: {fl:true} Flourish, {mk:true} Mark for Echo
function STATX(k,n){if(typeof STAT==='function')STAT(k,n===undefined?1:n)}
(function(){
const D=SIMD, CR=D.core, EM=D.enemies, CD=D.cards, RL=D.relics||{};
// ---------- enemies (Act 1 retune) ----------
for(const [k,o] of Object.entries(EM)){const t=EN[k];if(!t)continue;if(o.hp)t.hp=o.hp.slice();if(o.b0!=null)t.b0=o.b0;
  const ai=t.ai;const am=o.atk||1, bm=o.blk||1;
  t.ai=e=>{let m=ai(e);if(!m)return m;m=Object.assign({},m);
    if(m.a&&!m.boom){m.a=(o.atkMap&&o.atkMap[m.a]!=null)?o.atkMap[m.a]:Math.round(m.a*am)}
    if(o.toll_might&&m.lbl==='Toll')m.s=(m.s||0)+o.toll_might;
    if(m.boom&&o.burst)m.a=o.burst;if(m.b&&!m.mirror)m.b=Math.round(m.b*bm);return m}}
if(EM.warden){ // mirror reset each turn; idle turn is punished
  const W=EM.warden;intentOf=function(e){const m=e.next;if(m&&m.mirror){const lt=cb.lastType;
    return lt==='A'?{a:W.mirrorAtk,lbl:'Mirror: Attack'}:lt==='S'?{b:W.mirrorBlk,lbl:'Mirror: Guard'}:lt==='P'?{s:2,lbl:'Mirror: Empower'}:(cb.turn>=1?{a:W.idleAtk,lbl:'Mirror: Punish idleness'}:{q:1,lbl:'Watching…'})}return m}}
// ---------- shared overrides ----------
const _startTurn=startTurn;
startTurn=function(){cb.parryUsed=false;cb.advUsed=false;cb.lastType=null;cb.mark=null;cb.afterMark=0;cb.markedThisTurn=false;
  const nd=cb.nextDraw||0;cb.nextDraw=0;
  _startTurn();if(!cb)return;
  if(cb.pendingE){cb.energy+=cb.pendingE;cb.pendingE=0}
  if(nd)drawCards(nd);
  // Tidecaller drift: after the Guard reset and draw, so a drift Undertow's Guard is kept
  if(run.cls==='tide'&&cb.turn>=2&&cb.tdir&&CR.tide.drift){STATX('drift');tideShift(cb.tdir*CR.tide.drift);after()}};
// ---------- TIDECALLER ----------
const T=CR.tide;
const F0=F;F=function(ci,o){const f=F0(ci,o);f.low=cb.tide<=T.low;f.high=cb.tide>=T.high;
  if(o&&o.bonus){const b=o.bonus,dm=f.dmg,al=f.all,bk=f.blk;f.dmg=(n,h)=>dm(n+b,h);f.all=(n,h)=>al(n+b,h);f.blk=n=>bk(n+b)}
  if(o&&o.half){const dm=f.dmg,al=f.all,bk=f.blk;f.dmg=(n,h)=>dm(Math.floor(n/2),h);f.all=(n,h)=>al(Math.floor(n/2),h);f.blk=n=>bk(Math.floor(n/2))}
  return f};
tideShift=function(n){if(cb.slack||!n)return;const prev=cb.tide;const dir=Math.sign(n);
  if(run.cls==='tide'){if(cb.tdir&&dir!==cb.tdir)STATX('tideturn');cb.tdir=dir}
  const nv=Math.max(0,Math.min(10,prev+n));
  if(run.cls==='tide'){if(prev<T.high&&nv>=T.high)STATX('enterHigh');if(prev>T.low&&nv<=T.low)STATX('enterLow')}
  setTide(prev+n)};
function moonShell(){if(RL.moon_shell&&!cb.moonUsed){cb.moonUsed=1;if(cb.busy)cb.pendingE=(cb.pendingE||0)+1;else cb.energy++}}
checkTide=function(){if(cb.tide>=10){moonShell();const d=(cb.pw.spring?T.crest_dmg*2:T.crest_dmg)+hkv('crestAdd',0);log('🌊 CREST! '+d+' to ALL');alive().forEach(e=>dmgEnemy(e,d));
    if(T.crest_exposed)alive().forEach(e=>addSt(e,'vuln',T.crest_exposed));cb.tide=5;if(T.flip_after_reset)cb.tdir=-1;hk('onCrest')}
  else if(cb.tide<=0){moonShell();const n=cb.pw.neap;gainBlock((n?T.undertow_blk*2:T.undertow_blk)+hkv('crestAdd',0));drawCards(n?2:T.undertow_draw);if(T.undertow_energy)cb.energy+=T.undertow_energy;cb.tide=5;if(T.flip_after_reset)cb.tdir=1;hk('onUndertow')}};
// ---------- DUELIST ----------
const DU=CR.duel;
gainMom=function(n){cb.mom=Math.min(DU.mom_max,cb.mom+n)};
hit=function(e,base,f,raw){if(!e||e.hp<=0||e.fled)return;let d=base;
  if(!raw){d+=cb.pstr;if(run.cls==='duel'){const top=Math.max(...alive().map(x=>x.hp));if(e.hp===top)d+=DU.focus;if(f&&f.flourish)d=Math.floor(d*f.fmult)}if(cb.p.st.weak)d=Math.floor(d*.75)}
  if(e.st.vuln)d=Math.floor(d*1.5);dmgEnemy(e,Math.max(0,d))};
enemyHitPlayer=function(e,d){const b=Math.min(cb.p.block,d);cb.p.block-=b;const rest=d-b;run.hp-=rest;
  if(run.cls==='duel'&&rest>0&&DU.lose_on_unblocked&&cb.mom>0){cb.mom=Math.max(0,cb.mom-DU.lose_on_unblocked);STATX('momLost')}
  if(b>=1&&cb.parry>0&&!cb.parryUsed){cb.parryUsed=true;const back=Math.floor(cb.parry*DU.parry_back_frac);e.parried=true;STATX('parryTrig');if(RL.dueling_glove&&!cb.gloveUsed){cb.gloveUsed=1;cb.perfNext=(cb.perfNext||0)+RL.dueling_glove}dmgEnemy(e,back);if(cb.perfect){cb.perfNext=2;cb.perfect=false}}};
// ---------- ECHO MAGE ----------
const EC=CR.echo;
doEcho=function(){if(run.cls!=='echo')return;let ci=cb.mark,tg=cb.markTgt,half=false;
  if(!ci){ci=cb.last;tg=cb.lastTgt;half=true;if(!ci||CARDS[ci.id].faint||!EC.unmarked_fallback)return}
  const d=CARDS[ci.id];if(d.faint&&!(hkv('markFaint',false)&&!half))return;
  const bonus=half?0:Math.min(EC.bonus_cap,EC.bonus_per_card_after*cb.afterMark);
  let times=(cb.overtone?2:1)+(cb.pw.standing?1:0)+hkv('echoExtra',0);times=Math.min(times,EC.cap||4);
  for(let k=0;k<times;k++){if(!alive().length)break;let mult=cb.amp?2:1;cb.amp=false;if(RL.tuning_fork&&!cb.forkUsed&&!half){cb.forkUsed=1;mult*=2}
    STATX(half?'echoFallback':'echoMarked');if(!half)STATX('echoBonus',bonus);
    const f=F(ci,{echo:true,mult,tgt:tg,bonus:k===0?bonus:0,half});if(d.t==='A'&&hkv('echoAll',false)){const dm=f.dmg;f.dmg=(n,h)=>f.all(n,h)}d.p(f);hk('onEcho',ci,half)}};
// ---------- CARTOGRAPHER ----------
const CA=CR.carto;
trigWp=function(w){const d=CARDS[w.id];const f=F(w,{});const r=w.rank||0;const v=f.v;const k=WPSCALE[w.id];
  f.v=(a,b)=>{const x=v(a,b);if(typeof x!=='number'||!k)return x;if(k==='g')return x+r*CA.guard_per_rank;return x+(CA.rank_dmg?CA.rank_dmg[r]:r*CA.per_rank)};
  d.wp(f);if(r)STATX('wpRankTrig',r)};
// Advance: free, once per turn: one Waypoint gains +1 Rank (max). Rank 3 = Landmark (counts double for Expedition).
function advance(k){const w=cb.slots[k];if(!w||cb.advUsed||(w.rank||0)>=CA.rank_max)return false;cb.advUsed=true;w.rank=(w.rank||0)+1;STATX('advance');if(w.rank>=CA.rank_max)STATX('landmark');return true}
globalThis.advance=advance;
function expCount(){return cb.slots.length+cb.slots.filter(w=>(w.rank||0)>=CA.rank_max).length*(CA.landmark_extra||0)}
// Ranks are lost when a Waypoint leaves its slot (design §V; the v2.1 sim kept them on the card: fixed in v2.2 via rank_fix)
placeWp=function(ci){if(CA.rank_fix)delete ci.rank;if(cb.slots.length<cb.nslots){cb.slots.push(ci);return}
  pickSlot('Slots full: replace which Waypoint?',i=>{const old=cb.slots[i];const r=old.rank||0;if(CA.rank_fix)delete old.rank;cb.slots[i]=ci;if(!old.temp)cb.disc.push(old);hk('wpReplaced',old,ci,r)})};
var WPSCALE={signal:'d',cache:'g',camp:'g',lookout:0,watch:0,waystation:0};
// ---------- playCard (all classes) ----------
playCard=function(i){const ci=cb.hand[i];if(!ci||!canPlay(ci))return;const d=CARDS[ci.id];const opt=PLAYOPT||{};PLAYOPT={};
  cb.energy-=cost(ci);cb.discount=0;cb.hand.splice(i,1);cb.played++;ci.tmp0=false;cb.sel=null;
  const tg=curTgt();const f=F(ci,{tgt:tg});
  if(run.cls==='duel'&&d.t==='A'&&opt.fl&&cb.mom>=hkv('flMin',DU.flourish_min)){f.flourish=true;const me=Math.min(DU.mom_max,cb.mom+hkv('flExtra',0));f.fmult=1+DU.flourish_per_mom*me;STATX('flourishMom',cb.mom);hk('onFlourish',f)}
  if(run.cls==='echo'){if(cb.mark)cb.afterMark++;
    if(opt.mk&&!cb.mark&&(!d.faint||hkv('markFaint',false))&&d.t!=='P'){cb.mark=ci;cb.markTgt=tg;cb.afterMark=0}}
  if(d.t==='W'){placeWp(ci);if(CA.first_wp_refund&&!cb.wpThisTurn){cb.wpThisTurn=1}}else if(d.t==='P'||isEx(ci)){cb.exh.push(ci);if(d.t!=='P')hk('onSink',ci)}else cb.disc.push(ci);
  hk('prePlay',ci,f);
  if(d.p)d.p(f);hk('postPlay',ci,f);
  if(run.cls==='duel'&&d.t==='A'){cb.mom=f.flourish?(cb.pw.endless?1:0):Math.min(DU.mom_max,cb.mom+1);cb.atkCount++}
  cb.lastType=d.t==='A'?'A':d.t==='P'?'P':'S';
  if(run.cls==='echo'){cb.last=d.t==='P'?null:ci;cb.lastTgt=tg}
  after()};
endTurn=function(){if(!cb||cb.busy||cb.mode)return;
  doEcho();if(!alive().length)return win();
  cb.hand.forEach(ci=>{ci.tmp0=false;cb.disc.push(ci)});cb.hand=[];cb.sel=null;
  if(run.cls==='duel'){if(!cb.press)cb.mom=Math.max(0,cb.mom-DU.decay)}else cb.mom=0;
  cb.press=false;tick(cb.p.st);cb.busy=true;setTimeout(enemyPhase,0)};
const _sc=startCombat;startCombat=function(kind,enc){
  if(CA.rank_fix)run.deck.forEach(c=>{delete c.rank});   // v2.2 sim fix: Ranks live on the slot, not the card
  _sc(kind,enc);
  if(cb&&run.cls==='carto'&&RL.brass_sextant){const pk=typeof sextantPick==='function'?sextantPick():'signal';const w=cb.slots[0];if(w&&w.temp){w.id=pk;w.up=true;if(CA.sextant_rank)w.rank=CA.sextant_rank}}
  if(!cb)return;cb.tdir=0;
  if(run.cls==='tide'&&RL.moon_shell&&typeof moonStart==='function'){cb.tide=moonStart()}
  if(run.cls==='duel'&&DU.start_mom){cb.mom=Math.max(cb.mom,DU.start_mom)}};
// ---------- card changes (numbers from data) ----------
const V=(f,a)=>f.v(a[0],a[1]);
const P={
 // Tidecaller
 pressure:f=>{f.blk(V(f,CD.pressure.blk));if(f.high){cb.pstr+=CD.pressure.might}f.recede(2)},
 slack:f=>{choose('Slack Water',[{l:'Surge',f:()=>{tideShift(CD.slack.move);drawCards(V(f,CD.slack.draw))}},{l:'Recede',f:()=>{tideShift(-CD.slack.move);drawCards(V(f,CD.slack.draw))}}])},
 sinking:f=>{f.dmg(V(f,CD.sinking.dmg));const u0=cb.__und||0;const before=cb.tide;f.recede(3);if(cb.tide<=T.low||before-3<=0)f.draw(2)},
 // Echo
 feedback:f=>f.dmg(f.echo?V(f,CD.feedback.res):V(f,CD.feedback.dmg)),
 delay:f=>f.blk(f.echo?V(f,CD.delay.res):V(f,CD.delay.blk)),
 mirror:f=>{f.blk(f.v(6,8));if(f.echo)cb.nextDraw=(cb.nextDraw||0)+1},
 crackle:f=>{f.all(f.v(3,4));if(f.echo)alive().forEach(e=>f.vuln(CD.crackle.res_vuln,e))},
 reverb:f=>f.dmg(f.echo?V(f,CD.reverb.res):V(f,CD.reverb.dmg)),
 // Cartographer
 cstrike:f=>f.dmg(V(f,CD.cstrike.dmg)),
 trail:f=>f.dmg(CD.trail.base+f.v(2,3)*expCount()),
 bivouac:f=>f.blk(5+f.v(2,3)*expCount()),
 landslide:f=>f.all(f.v(8,10)+2*expCount()),
 plot:f=>chart(f.v(4,5),()=>drawCards(1)),
 // Duelist
 secondwind:f=>f.blk(V(f,CD.secondwind.per)*Math.max(1,cb.mom)),
};
for(const [k,fn] of Object.entries(P))if(CARDS[k])CARDS[k].p=fn;
if(CD.waystation&&CD.waystation.mode==='advance'){CARDS.waystation.wp=f=>{const o=cb.slots.filter(w=>w!==f.ci&&(w.rank||0)<CA.rank_max);if(!o.length)return;
  const w=f.u&&typeof bestAdvance==='function'?bestAdvance(o):o[Math.floor(Math.random()*o.length)];w.rank=(w.rank||0)+1;STATX('wayAdvance');if(w.rank>=CA.rank_max)STATX('landmark')}}
if(CD.lookout){CARDS.lookout.wp=f=>{cb.wpDraw=(cb.wpDraw||0)+1;if(f.u){const t=strongest();if(t)addSt(t,'weak',1)}}}
for(const [k,o] of Object.entries(CD))if(CARDS[k]){if(o.c!=null)CARDS[k].c=o.c;if(o.cu!==undefined)CARDS[k].cu=o.cu}
if(D.hp)for(const [k,v] of Object.entries(D.hp))CLASSES[k].hp=v;
if(D.starter)for(const [k,v] of Object.entries(D.starter))CLASSES[k].starter=v.slice();
})();
function SIMSTARTER(cls){return CLASSES[cls].starter.slice()}
