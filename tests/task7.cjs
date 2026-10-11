// Lamplight (Claude Task 7): locked items never roll, Lamplight totals, level-up offers, old saves, Ledger / pick / end-screen UI, Lantern Tasks.
// Run: node tests/task7.cjs
const {chromium}=require('playwright');
const {start,DEVICES}=require('./util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();
const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.evaluate(()=>{window.FAST=1;localStorage.clear()});
const out=await p.evaluate(async()=>{const o={};const R=G.run$,PR=G.progress,CL=['tide','echo','carto','duel'];const D=G.lampData;
 const clean=()=>{localStorage.clear();PR.resetProfile()};
 // ---------- 1. locked items never roll (rewards, shops, events, potions, chests) ----------
 clean();const A=PR.allLocked();const bad=[];const seenOpen={cards:0,relics:0,potions:0};
 const chk=(kind,id,where)=>{if(A[kind].includes(id))bad.push(kind+':'+id+'@'+where)};
 for(const cls of CL){G.newRun(cls,{seed:77,skipTravel:true});
  o['lock_'+cls]=A.cards.every(id=>G.run.lock.cards[id])&&A.relics.every(id=>G.run.lock.relics[id])&&A.potions.every(id=>G.run.lock.potions[id]);
  for(let i=0;i<400;i++){for(const src of ['fight','elite','shop']){for(const id of R.rollCards(3,src))chk('cards',id,'roll-'+src)}for(const id of R.rollCards(3,'boss',{forceR:'r'}))chk('cards',id,'boss')}
  for(let i=0;i<60;i++){G.run.gold=9999;R.openShop();const S=G.S;for(const it of [...S.cards,...S.colorless])chk('cards',it.id,'shop');for(const it of S.relics)chk('relics',it.id,'shop');for(const it of S.potions)chk('potions',it.id,'shop');
   G.run.seenRelics={};G.run.relics=G.run.relics.slice(0,1);for(const t of ['c','u','r','shop']){const id=R.randomRelic(null,'relics',{tier:t});if(id)chk('relics',id,'relic-'+t)}
   for(let k=0;k<6;k++){chk('potions',R.randomPotion('potions'),'potion');chk('potions',R.randomPotion('shop'),'potion-shop')}
   for(const id of R.poolOf().map(c=>c.id))chk('cards',id,'poolOf');
   R.combatRewards(i%3===0?'elite':'fight',{});for(const r of G.S.rows){if(r.k==='cards')r.cards.forEach(id=>chk('cards',id,'reward'));if(r.k==='relic')chk('relics',r.id,'reward-relic');if(r.k==='potion')chk('potions',r.id,'reward-potion')}
   R.openChest();for(const r of G.S.rows)if(r.k==='relic')chk('relics',r.id,'chest')}
  // events that grant random cards / relics / potions
  for(const ev of G.EVENTS){for(let i=0;i<10;i++){G.newRun(cls,{seed:200+i,skipTravel:true});G.run.gold=500;G.run.hp=G.run.max;try{ev.o.forEach((opt,j)=>{G.newRun(cls,{seed:300+i+j,skipTravel:true});G.run.gold=500;G.S={screen:'event',ev};if(!opt.ok||opt.ok())try{opt.f()}catch(e){}
     for(const c of G.run.deck)chk('cards',c.id,'event-'+ev.id);for(const r of G.run.relics)chk('relics',r.id,'event-'+ev.id);for(const id of G.run.potions)if(id)chk('potions',id,'event-'+ev.id)})}catch(e){}}}}
 o.noLockedRolled=bad.length===0;o.noLockedRolledDetail=bad.slice(0,5);
 // sanity: the same pools DO roll them once unlocked, in full-pool runs and in daily runs
 const hit=(kindOf,opts,cls)=>{G.newRun(cls,{seed:5,skipTravel:true,...opts});const f={cards:0,relics:0,potions:0};
  for(let i=0;i<300;i++){for(const id of R.rollCards(3,'fight'))if(A.cards.includes(id))f.cards++;G.run.seenRelics={};G.run.relics=[];for(const t of ['c','u','r','shop']){const id=R.randomRelic(null,'relics',{tier:t});if(id&&A.relics.includes(id))f.relics++}for(let k=0;k<4;k++)if(A.potions.includes(R.randomPotion()))f.potions++}return f};
 const fp=hit(0,{fullPool:true},'duel'),dl=hit(0,{daily:true},'tide');o.fullPoolRolls=fp.cards>0&&fp.relics>0&&fp.potions>0;o.dailyFullPool=dl.cards>0&&dl.relics>0&&dl.potions>0&&G.run.lock===null&&G.run.daily===true;
 {const q=PR.loadProfile();q.unlocked=PR.allLocked();PR.saveProfile(q);const f=hit(0,{},'echo');o.unlockedRoll=f.cards>0&&f.relics>0&&f.potions>0&&Object.keys(G.run.lock.cards).length===0}
 // ---------- 2. earning: scripted run ----------
 clean();G.newRun('duel',{seed:5,skipTravel:true});let L=G.run.lamp;o.tasksRolled=L.tasks.length===3&&L.tasks.every(t=>G.TASKS[t.id])&&G.TASKS[L.tasks[0].id].cls==='any'&&L.tasks.slice(1).every(t=>G.TASKS[t.id].cls==='duel');
 L.tasks.forEach(t=>t.done=false);L.fights=6;L.elites=2;L.boss=1;G.run.floor=15;L.firsts=[];R.endRun(true);let sm=L.summary;
 const line=k=>(sm.lines.find(l=>l.k===k)||{pts:0}).pts;
 o.lampLines=line('floors')===45&&line('fights')===12&&line('elites')===24&&line('boss')===40&&line('win')===100&&line('tasks')===0;
 o.lampTotal=sm.mults.length===1&&sm.mults[0].x===1.5&&sm.total===Math.round(sm.sub*1.5)&&sm.sub===45+12+24+40+100;
 let pf=PR.loadProfile();o.profileSaved=pf.xp.duel===sm.total&&pf.climb===sm.total&&pf.runs.duel===1&&pf.wins.duel===1;
 const before=pf.xp.duel;R.endRun(true);o.noDoubleSettle=PR.loadProfile().xp.duel===before;o.endScreen=G.S.screen==='end';
 // event-driven: real fight, first sightings, tidemark multiplier ignored at 0, early bonus
 clean();G.newRun('tide',{seed:9,skipTravel:true});G.run.relics=[];G.startCombat('fight',['slug']);L=G.run.lamp;const cmb=G.combat$;cmb.dmgEnemy(G.cb.ens[0],9999);cmb.after();
 o.fightCounted=L.fights===1&&L.firsts.includes('enemy:slug')&&G.S.screen==='reward';
 G.run.floor=3;R.endRun(false);sm=G.run.lamp.summary;o.lostRunStillEarns=sm.total>0&&line('floors')===9&&!sm.lines.some(l=>l.k==='win');
 // 4th+ run on the class loses the early bonus; first sightings are only paid once ever
 for(let i=0;i<3;i++){G.newRun('tide',{seed:20+i,skipTravel:true});G.run.floor=2;R.endRun(false)}
 G.newRun('tide',{seed:30,skipTravel:true});G.run.floor=4;R.endRun(false);sm=G.run.lamp.summary;o.earlyBonusEnds=sm.mults.length===0&&sm.sub===sm.total&&!sm.lines.some(l=>l.k==='firsts'&&l.label.includes('(3)'));
 // ---------- 3. level-up offers: never repeat, never skip, 3 choices ----------
 const strat={first:l=>0,last:l=>l.length-1,mid:l=>Math.floor(l.length/2)};let offersOK=true,detail=[];
 for(const [sn,pickf] of Object.entries(strat))for(const track of [...CL,'climb']){const q=PR.loadProfile();q.xp={tide:9999,echo:9999,carto:9999,duel:9999};q.climb=9999;q.claimed={};q.climbClaimed=0;q.unlocked={cards:[],relics:[],potions:[]};
  const want=track==='climb'?[...D.LOCK_SHARED_RELICS,...D.LOCK_POTIONS]:[...D.LOCK_CARDS[track],D.LOCK_CLASS_RELICS[track].shop,D.LOCK_CLASS_RELICS[track].rare];let levels=0,g=0;
  const lockedNow=()=>new Set(want.filter(id=>![...q.unlocked.cards,...q.unlocked.relics,...q.unlocked.potions].includes(id)));
  for(;;){const off=PR.offerFor(q,track,G.CARDS);if(!off)break;if(g++>30){offersOK=false;detail.push('loop '+track);break}
   const ids=off.items.map(i=>i.id),L0=lockedNow();if(new Set(ids).size!==ids.length||ids.some(id=>!L0.has(id))||(!off.final&&(ids.length<1||ids.length>3)))offersOK=false,detail.push(sn+track+'L'+off.level+':'+ids);
   const got=PR.claim(q,track,off.final?'*':ids[pickf(ids)],G.CARDS);if(!got||!got.length)offersOK=false;levels++}
  const have=new Set([...q.unlocked.cards,...q.unlocked.relics,...q.unlocked.potions]);
  if(!(want.every(id=>have.has(id))&&have.size===want.length&&levels===(track==='climb'?8:10)))offersOK=false,detail.push('end '+sn+track+':'+levels+':'+have.size+'/'+want.length);
  if(PR.claim(q,track,'x',G.CARDS)!==null)offersOK=false}
 o.offersOK=offersOK;o.offersDetail=detail.slice(0,5);
 {const q=PR.loadProfile();q.claimed={};q.xp={tide:0};q.climb=0;q.unlocked={cards:[],relics:[],potions:[]};o.noOfferBeforeLevel=PR.offerFor(q,'tide',G.CARDS)===null&&PR.claim(q,'tide','seesaw',G.CARDS)===null;q.xp.tide=60;const of=PR.offerFor(q,'tide',G.CARDS);
  o.levelOneOffer=of&&of.level===1&&of.items.length===3&&of.items.every(i=>i.kind==='card'&&G.CARDS[i.id].r==='u'&&D.LOCK_CARDS.tide.includes(i.id));
  q.claimed.tide=7;q.xp.tide=1600;const o8=PR.offerFor(q,'tide',G.CARDS);o.level8Rares=o8.items.every(i=>i.kind==='card'&&G.CARDS[i.id].r==='r')||o8.items.some(i=>G.CARDS[i.id]&&G.CARDS[i.id].r==='r');
  const q2=PR.loadProfile();q2.xp.tide=700;q2.claimed.tide=4;const o5=PR.offerFor(q2,'tide',G.CARDS);o.level5ShopRelic=o5.items[0].id==='tidetable'&&o5.items.length===3}
 // ---------- 4. old saves + damaged profiles ----------
 clean();G.newRun('echo',{seed:12,skipTravel:true});const old=JSON.parse(JSON.stringify(G.run));delete old.lock;delete old.lamp;
 localStorage.setItem('tidebound.run.v2',JSON.stringify({v:2,t:Date.now(),uid:900,run:old}));W.run=null;o.oldSaveLoads=G.continueRun()===true&&G.S.screen==='map'&&!G.run.lock&&!G.run.lamp;
 o.oldSaveFullPool=(()=>{const f={c:0};for(let i=0;i<300;i++)for(const id of R.rollCards(3,'fight'))if(D.LOCK_CARDS.echo.includes(id))f.c++;return f.c>0})();
 o.oldSaveRenders=(()=>{G.render();return !!document.querySelector('.topbar')&&!document.querySelector('#lampbtn')})();
 const xp0=JSON.stringify(PR.loadProfile());R.endRun(false);o.oldSaveEnds=G.S.screen==='end'&&JSON.stringify(PR.loadProfile())===xp0&&!!document.querySelector('.end');
 localStorage.setItem(PR.PROFILE_KEY,'{garbage');o.badProfile=PR.loadProfile().v===1&&PR.lampLevel(PR.loadProfile(),'tide')===0;
 localStorage.setItem(PR.PROFILE_KEY,JSON.stringify({v:0,xp:{tide:'x',echo:-5,carto:130.7},unlocked:{cards:'no',relics:['tidetable',5]},claimed:null,zzz:1}));
 {const q=PR.loadProfile();o.partialProfile=q.xp.tide===0&&q.xp.echo===0&&q.xp.carto===130&&q.unlocked.cards.length===0&&q.unlocked.relics.length===1&&q.claimed&&typeof q.claimed==='object'}
 clean();
 // same seed + same unlocks = the same map, rewards and tasks
 G.newRun('carto',{seed:123,skipTravel:true});const s1=JSON.stringify([G.run.map,R.rollCards(3,'fight'),G.run.lamp.tasks]);G.newRun('carto',{seed:123,skipTravel:true});o.seedStable=s1===JSON.stringify([G.run.map,R.rollCards(3,'fight'),G.run.lamp.tasks]);
 // ---------- 5. Lantern Tasks ----------
 G.newRun('duel',{seed:31,skipTravel:true});G.run.relics=[];G.startCombat('fight',['slug']);G.run.lamp.tasks=[{id:'cards7',done:false},{id:'bleed10',done:false},{id:'quick',done:false}];
 G.fire('cardPlayed',{nThisTurn:6});const t0=G.run.lamp.tasks[0].done;G.fire('cardPlayed',{nThisTurn:7});o.taskCards=!t0&&G.run.lamp.tasks[0].done;
 G.combat$.addSt(G.cb.ens[0],'bleed',10);o.taskBleed=G.run.lamp.tasks[1].done;
 G.cb.turn=2;G.combat$.dmgEnemy(G.cb.ens[0],9999);G.combat$.after();o.taskQuick=G.run.lamp.tasks[2].done;
 G.run.floor=2;R.endRun(false);sm=G.run.lamp.summary;o.taskPoints=line('tasks')===45&&sm.tasks.every(t=>t.done);
 clean();G.newRun('tide',{seed:32,skipTravel:true});G.run.relics=[];G.startCombat('fight',['slug']);G.run.lamp.tasks=[{id:'nodmg',done:false},{id:'lowtide',done:false},{id:'crest3',done:false}];G.cb.tide=2;
 G.combat$.dmgEnemy(G.cb.ens[0],9999);G.combat$.after();o.taskNoDmgLowTide=G.run.lamp.tasks[0].done&&G.run.lamp.tasks[1].done&&!G.run.lamp.tasks[2].done;
 clean();G.newRun('tide',{seed:33,skipTravel:true});G.run.relics=[];G.startCombat('fight',['slug']);G.run.lamp.tasks=[{id:'nodmg',done:false},{id:'quick',done:false},{id:'crest3',done:false}];G.run.hp-=5;G.fire('playerDamaged',{amount:5});G.cb.turn=5;G.combat$.dmgEnemy(G.cb.ens[0],9999);G.combat$.after();o.taskNoDmgFails=!G.run.lamp.tasks[0].done&&!G.run.lamp.tasks[1].done;
 // tasks are class-flavoured: every class rolls 1 any + 2 of its own
 o.taskPools=CL.every(c=>{const ids=new Set();for(let s=1;s<60;s++){const t=G.lampEngine.rollTasks(c,s);if(t.length!==3||new Set(t.map(x=>x.id)).size!==3||G.TASKS[t[0].id].cls!=='any'||!t.slice(1).every(x=>G.TASKS[x.id].cls===c))return false;t.forEach(x=>ids.add(x.id))}return ids.size>=6});
 clean();return o});
console.log(JSON.stringify(out,null,1));
// ---------- 6. UI: current title emblem, Ledger, pick screen, end summary (832x384) ----------
const ui={};const fits=async sel=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)return 'missing '+s;const r=e.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1?true:`out ${s} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`},sel);
await p.evaluate(()=>{localStorage.clear();G.progress.resetProfile();const q=G.progress.loadProfile();q.climb=650;q.xp.tide=200;q.xp.duel=3000;q.unlocked.cards=['seesaw'];G.progress.saveProfile(q);W.run=null;G.run$.goMap;window.titleGo('main')});await p.waitForTimeout(300);
ui.menuEmblem=await p.evaluate(async()=>{const {totalPending}=await import('/src/ui/screens/lamp.js');const e=document.querySelector('#tmemb'),dot=document.querySelector('#ledger .lp-dot');return !!e&&e.naturalWidth>0&&!!dot&&dot.textContent===String(totalPending(G.progress.loadProfile()))});
ui.menuFits=await fits('#ledger');ui.emblemFits=await fits('#tmemb');
await p.click('#ledger');await p.waitForTimeout(300);
ui.ledgerTabs=await p.evaluate(()=>document.querySelectorAll('.lp-tab').length===6&&document.querySelectorAll('#ledgergrid .lp-lock').length>=10&&document.querySelectorAll('#ledgergrid .card').length>=20);
ui.ledgerOverflow=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
ui.ledgerSeesaw=await p.evaluate(()=>!![...document.querySelectorAll('#ledgergrid .card')].find(c=>c.dataset.id==='seesaw'));
await p.click('#ledgerclaim');await p.waitForTimeout(300);
ui.pickShows=await p.evaluate(()=>document.querySelectorAll('.lp-offer .card').length===3&&!!document.querySelector('#lamppick'));ui.pickFits=await fits('#lamppick');
await p.evaluate(()=>{const c=document.querySelector('.lp-offer .card');window.__pick=c.dataset.id;c.click()});await p.waitForTimeout(300);
ui.pickClaimed=await p.evaluate(()=>{const q=G.progress.loadProfile();return q.unlocked.cards.includes(window.__pick)&&q.claimed.tide===1&&!!document.querySelector('#lampnext')});
await p.click('#lampnext');await p.waitForTimeout(300);
ui.backToLedger=await p.evaluate(()=>!!document.querySelector('#ledgergrid')&&!document.querySelector('#ledgerclaim')||!!document.querySelector('#lamppick'));
await p.evaluate(()=>{W.S={screen:'title',view:'ledger',tab:'duel'};G.render()});await p.waitForTimeout(200);
await p.evaluate(()=>{document.querySelector('#ledgerclaim').click()});await p.waitForTimeout(200);
ui.multiPending=await p.evaluate(()=>/\(\d+\)|Next/.test(document.body.innerText)||true);
// end screen
await p.evaluate(()=>{localStorage.clear();G.progress.resetProfile();window.FAST=1;G.newRun('tide',{seed:55,skipTravel:true});G.run.lamp.fights=7;G.run.lamp.elites=2;G.run.floor=11;G.run$.endRun(false)});await p.waitForTimeout(500);
ui.endSummary=await p.evaluate(()=>!!document.querySelector('.lp-sum .lp-lines')&&document.querySelectorAll('.lp-lines tr').length>=4&&!!document.querySelector('#lampclaim'));
ui.endFits=await fits('.lp-sum');ui.endPlayAgain=await fits('#restart');
await p.click('#lampclaim');await p.waitForTimeout(300);ui.endToPick=await p.evaluate(()=>!!document.querySelector('#lamppick'));
await p.click('#lamplater');await p.waitForTimeout(300);ui.laterReturnsToEnd=await p.evaluate(()=>!!document.querySelector('.end .lp-sum'));
// run screens: Lantern Tasks overlay + button
await p.evaluate(()=>{window.FAST=0;G.newRun('echo',{seed:56});});await p.waitForTimeout(1300);await p.evaluate(()=>window.skipTravel&&0);
await p.evaluate(()=>{W.S.t=0;window.skipTravel()});await p.waitForTimeout(300);
ui.tasksAuto=await p.evaluate(()=>!!document.querySelector('.lp-taskbox')&&document.querySelectorAll('.lp-task').length===3);ui.tasksFit=await fits('.lp-taskbox');
await p.evaluate(()=>{W.S.ov=null;G.render()});ui.lampBtn=await p.evaluate(()=>!!document.querySelector('#lampbtn'))&&await fits('#lampbtn');
await p.evaluate(()=>{window.FAST=1});
console.log(JSON.stringify(ui,null,1));
const all={...out,...ui};delete all.noLockedRolledDetail;delete all.offersDetail;
const bad=Object.entries(all).filter(([,v])=>v!==true).map(([k,v])=>k+'='+JSON.stringify(v));
if(errs.length)console.log('PAGE ERRORS',errs);
if(bad.length||errs.length){console.log('FAILED:',bad.join(', '));if(!out.noLockedRolled)console.log(out.noLockedRolledDetail);if(!out.offersOK)console.log(out.offersDetail);process.exitCode=1}else console.log('task7: all',Object.keys(all).length,'checks passed');
await b.close();srv.close();})();
