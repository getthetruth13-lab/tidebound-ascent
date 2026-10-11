const {chromium}=require('playwright'),{start}=require('./util.js'),fs=require('fs'),assert=require('assert');
const CPU=+(process.env.CPU_RATE||6);
const out='tests/task22-results';fs.mkdirSync(out,{recursive:true});
let expert=fs.readFileSync('playtests/task2/ai21.mjs','utf8');
expert=expert.slice(expert.indexOf('// ---------------- private RNG'));
expert='const C=G.combat$,R=G.run$,K=G.cards$,REG=window.REG,BUS=window.BUS,CORE=C.CORE;const {CARDS,EN,RELICS,POTIONS}=REG;\n'+expert;
expert=expert.replace(/export /g,'').replace('REAL=false;','REAL=false;W.previewing=true;').replace('restoreExact(real);REAL=true;','restoreExact(real);REAL=true;W.previewing=false;').replace('function playRun(','async function playRun(').replace("const s=W.S.screen;\n  if(s==='combat')", "const s=W.S.screen;await new Promise(r=>setTimeout(r,0));\n  if(s==='combat')");
expert+='\nwindow.expertRun=playRun;';
(async()=>{const srv=await start(0),browser=await chromium.launch({...(process.env.PERF_ONLY?{channel:'chromium'}:{}),args:['--autoplay-policy=no-user-gesture-required']});const results={runs:process.env.SKIP_RUNS&&fs.existsSync(`${out}/runs.json`)?JSON.parse(fs.readFileSync(`${out}/runs.json`)):[],saves:[],perf:[]};try{
 const page=await browser.newPage({viewport:{width:2340,height:1080},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function boot(){await page.goto(srv.url);await page.waitForFunction(()=>window.G);await page.evaluate(async()=>{window.FAST=1;window.REG=await import('/src/core/registry.js');window.BUS=await import('/src/core/bus.js')})}
 await boot();await page.evaluate(s=>eval(s),expert);
 if(!process.env.SKIP_RUNS)for(const viewport of [{width:2340,height:1080},{width:1480,height:924}]){await page.setViewportSize(viewport);
  for(const cls of ['tide','echo','carto','duel']){let won=null,attempts=0;for(let seed=1;seed<=8;seed++){const r=await page.evaluate(([c,s])=>expertRun(c,s),[cls,seed]);assert(!r.stall,JSON.stringify(r));attempts++;if(r.won){won={cls,viewport,seed,...r,attempts};break}}
   assert(won,cls+' no boss completion');results.runs.push(won);fs.writeFileSync(`${out}/runs.json`,JSON.stringify(results.runs,null,2));await page.screenshot({path:`${out}/${cls}-${viewport.width}-complete.png`});console.log('Run',cls,viewport.width,'seed',won.seed,'floor',won.floor);
  }
 }
 if(!process.env.PERF_ONLY){
 const snapshot=()=>page.evaluate(()=>{
  const skip=new Set(['startT','flashT','blockT','blkT','driftT','crestT','undertowT','atkT','advT','trigT','pshake','shake','vfx','callouts','banner','beat','coach','curF','log','_simT']);
  return JSON.parse(JSON.stringify({run:W.run,cb:W.cb,S:W.S,uid:W.uid},(k,v)=>skip.has(k)||/T$/.test(k)||(k==='t'&&typeof v==='number')||typeof v==='function'?undefined:v));
 });
 async function reopen(name){const before=await snapshot();await boot();assert(await page.evaluate(()=>G.continueRun()),name+' continue');const after=await snapshot();try{assert.deepStrictEqual(after,before)}catch(e){fs.writeFileSync(`${out}/${name}-mismatch.json`,JSON.stringify({before,after},null,2));throw e}results.saves.push(name);console.log('Save',name)}
 for(const cls of ['tide','echo','carto','duel']){
  await page.evaluate(c=>{G.newRun(c,{seed:42,skipTravel:true});G.run$.goNode(0,0)},cls);
  await reopen(cls+'-fight-opening');
  await page.evaluate(()=>{let n=0;while(G.cb.mode&&n++<10){if(G.cb.mode.k==='chart')modeAct('done');else modeAct('choice',0)}const i=G.cb.hand.findIndex(c=>G.combat$.canPlay(c));if(i>=0)G.playCard(i)});
  await reopen(cls+'-fight-card');await page.evaluate(()=>{let n=0;while(G.cb.mode&&n++<10){if(G.cb.mode.k==='chart')modeAct('done');else modeAct('choice',0)}G.endTurn()});await reopen(cls+'-fight-turn');
 }
 await page.evaluate(()=>{G.newRun('tide',{seed:7,skipTravel:true});G.run.map[0][0].t='unknown';G.run.map[0][0].pre='event';G.saveRun();goNode(0,0)});await reopen('event');
 await page.evaluate(()=>{const i=W.S.ev.o.findIndex(o=>!o.ok||o.ok());evOpt(i)});await reopen('event-choice');
 if(await page.evaluate(()=>W.S.screen==='msg')){await page.evaluate(()=>continueMessage());await reopen('event-continue')}
 await page.evaluate(()=>{G.newRun('tide',{seed:12,skipTravel:true});openChest();openChestLid();claimRow(W.S.rows.findIndex(r=>r.k==='gold'))});await reopen('chest-gold-claimed');
 await page.evaluate(()=>{const i=W.S.rows.findIndex(r=>r.k==='relic');if(i>=0)claimRow(i)});await reopen('chest-relic-claimed');await page.evaluate(()=>goMap());await reopen('map');
 await page.evaluate(()=>{G.newRun('duel',{seed:33,skipTravel:true});G.run.gold=300;G.saveRun();openShop()});await reopen('shop');
 await page.evaluate(()=>shopRemove());await reopen('shop-pending-remove');
 await page.evaluate(()=>pickCard(W.run.deck[0].uid));await reopen('shop-remove-paid');
 await page.evaluate(()=>{G.newRun('duel',{seed:9,skipTravel:true});enterNode('rest');campDo('temper')});await reopen('camp-pending-upgrade');
 await page.evaluate(()=>pickCard(W.run.deck[0].uid));await reopen('camp-upgraded');
 await page.evaluate(()=>{G.newRun('duel',{seed:4,skipTravel:true});G.startCombat('fight',['crab']);let n=0;while(W.cb&&W.S.screen==='combat'&&n++<100){if(W.cb.mode){modeAct('choice',0);continue}const i=W.cb.hand.findIndex(c=>G.combat$.canPlay(c));if(i>=0)G.playCard(i);else G.endTurn()}});assert.equal(await page.evaluate(()=>W.S.screen),'reward');await reopen('reward');
 await page.evaluate(()=>claimRow(W.S.rows.findIndex(r=>r.k==='gold')));await reopen('reward-gold-claimed');
 await page.evaluate(()=>claimRow(W.S.rows.findIndex(r=>r.k==='cards')));await reopen('reward-pending-cards');await page.evaluate(()=>rewCard(0));await reopen('reward-card-claimed');
 await page.evaluate(()=>{G.newRun('duel',{seed:4,skipTravel:true});G.startCombat('fight',['crab']);window.FAST=0;G.endTurn()});
 assert(await page.evaluate(()=>W.cb.busy));await boot();assert(await page.evaluate(()=>G.continueRun()));assert.equal(await page.evaluate(()=>W.cb.turn),2);await reopen('interrupted-enemy-turn-once');

 }
 // Slow-phone simulation: Chrome CPU throttle, real render path and animation frames.
 await page.setViewportSize({width:780,height:360});await page.evaluate(n=>window.BENCH_CPU=n,CPU);const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:CPU});
 await page.evaluate(()=>{window.FAST=0;G.newRun('duel',{seed:42,skipTravel:true});G.startCombat('fight',['crab','knight'])});await page.waitForTimeout(1500);
 const perf=await page.evaluate(async()=>{const gaps=[],renders=[];let last=performance.now(),running=true;function tick(t){gaps.push(t-last);last=t;if(running)requestAnimationFrame(tick)}requestAnimationFrame(tick);
 const begin=performance.now();for(let n=0;n<80;n++){const t=performance.now();G.render();renders.push(performance.now()-t);await new Promise(r=>setTimeout(r,50))}running=false;gaps.sort((a,b)=>a-b);renders.sort((a,b)=>a-b);return {cpuThrottle:window.BENCH_CPU,seconds:(performance.now()-begin)/1000,frames:gaps.length,fps:gaps.length/((performance.now()-begin)/1000),frameP95:gaps[Math.floor(gaps.length*.95)],renderP95:renders[Math.floor(renders.length*.95)],over50ms:gaps.filter(x=>x>50).length}});results.perf.push(perf);
 results.perf.push(await page.evaluate(async()=>{const gaps=[];let last=performance.now(),running=true,actions=0;function tick(t){gaps.push(t-last);last=t;if(running)requestAnimationFrame(tick)}requestAnimationFrame(tick);const begin=performance.now();
 while(performance.now()-begin<6000&&W.cb){const cb=W.cb;if(!cb.busy){if(cb.mode){if(cb.mode.k==='chart')modeAct('done');else modeAct('choice',0)}else{const i=cb.hand.findIndex(c=>G.combat$.canPlay(c));if(i>=0)G.playCard(i);else G.endTurn()}actions++}await new Promise(r=>setTimeout(r,90))}
 running=false;gaps.sort((a,b)=>a-b);const seconds=(performance.now()-begin)/1000;return {kind:'active-card-plays-and-enemy-turns',cpuThrottle:window.BENCH_CPU,seconds,actions,frames:gaps.length,fps:gaps.length/seconds,frameP95:gaps[Math.floor(gaps.length*.95)],over50ms:gaps.filter(x=>x>50).length}}));

 await page.evaluate(()=>{localStorage.clear()});const t=Date.now();await boot();results.loadReadyMs=Date.now()-t;await page.waitForTimeout(1000);await page.evaluate(()=>titleGo('start'));
 results.video=await page.evaluate(async()=>{const v=document.querySelector('video');if(!v)return {missing:true};await v.play().catch(()=>{});const a=v.getVideoPlaybackQuality(),time=v.currentTime;await new Promise(r=>setTimeout(r,5000));const b=v.getVideoPlaybackQuality();return {seconds:v.currentTime-time,frames:b.totalVideoFrames-a.totalVideoFrames,dropped:b.droppedVideoFrames-a.droppedVideoFrames,paused:v.paused,readyState:v.readyState}});
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});assert.deepEqual(errors,[]);results.errors=errors;fs.writeFileSync(`${out}/${process.env.PERF_ONLY?'perf-'+CPU+'x':'browser'}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({saves:results.saves,perf:results.perf,loadReadyMs:results.loadReadyMs,video:results.video}));
 }finally{await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
