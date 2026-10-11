// Reproducible Task 10 mobile CPU profile; response-only instrumentation never edits UI sources.
const {chromium}=require('playwright'),{start}=require('../tests/util.js');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const crypto=require('node:crypto');
const out=path.resolve(process.argv[2]||'tests/task10-results/perf');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'source-hashes.json'),JSON.stringify(Object.fromEntries(['src/ui/render.js','src/ui/anim.js','src/ui/vfx.js','src/ui/fx.js','src/ui/env.js','css/style.css'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),null,2));
const stats=a=>{a.sort((x,y)=>x-y);return {n:a.length,mean:a.reduce((s,x)=>s+x,0)/(a.length||1),p95:a[Math.floor(a.length*.95)]||0,max:a.at(-1)||0}};
(async()=>{const srv=await start(0),browser=await chromium.launch();const results=[];
try{for(const rate of (process.env.RATES||'4,6').split(',').map(Number)){const ctx=await browser.newContext({viewport:{width:915,height:412},deviceScaleFactor:3.75,isMobile:true,hasTouch:true,serviceWorkers:'block'}),pg=await ctx.newPage(),errors=[];
 pg.on('pageerror',e=>errors.push(e.message));
 await pg.route('**/src/ui/render.js',async route=>{const r=await route.fetch();let s=await r.text();s=s.replace('export function render(){',"export function render(){performance.mark('render-start');");s=s.replace("n.scrollIntoView({block:'center'})}}","n.scrollIntoView({block:'center'})}performance.measure('render','render-start');}");await route.fulfill({response:r,body:s})});
 await pg.route('**/src/ui/vfx.js',async route=>{const r=await route.fetch();let s=await r.text();const count=name=>"window.__fxCounts??={};window.__fxCounts['"+name+"']=(window.__fxCounts['"+name+"']||0)+1;";
 s=s.replace('if(!fxOn()||!PRE[kind])return;','if(!fxOn()||!PRE[kind])return;'+count('emit')+"window.__fxCounts['particle:'+kind]=(window.__fxCounts['particle:'+kind]||0)+1;");
 s=s.replace('if(!el||!el.getAnimations)return;','if(!el||!el.getAnimations)return;'+count('freezeIdle'));
 s=s.replace('if(!motionOn()||!app||!app.firstChild)return;','if(!motionOn()||!app||!app.firstChild)return;'+count('crossfade'));
 s=s.replace('export function shakeFrames(amp){','export function shakeFrames(amp){'+count('shakeFrames'));await route.fulfill({response:r,body:s})});
 if(process.env.ABLATE==='ambient')await pg.route('**/src/ui/env.js',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('function buildParticles(fx){','function buildParticles(fx){parts=[];emitters=[];return;')})});
 await pg.goto(srv.url);await pg.waitForFunction(()=>window.G);await pg.addScriptTag({path:path.resolve('tests/p1/checks.js')});
 await pg.evaluate(()=>{G.settings.envFx='full';G.settings.reduceMotion=false;G.settings.fastAnim=false;window.FAST=0});
 const cdp=await ctx.newCDPSession(pg);await cdp.send('Emulation.setCPUThrottlingRate',{rate});await cdp.send('Performance.enable');
 for(const scenario of (process.env.SCENARIOS||'combat,combat-bellcourt,boss-death,map-travel,transitions').split(',')){
 await pg.reload();await pg.waitForFunction(()=>window.G);await pg.addScriptTag({path:path.resolve('tests/p1/checks.js')});await pg.evaluate(async()=>{await document.fonts.ready;G.settings.envFx='full';G.settings.reduceMotion=false;G.settings.fastAnim=false});
 if(process.env.ABLATE==='filters')await pg.addStyleTag({content:'*,*::before,*::after{filter:none!important;backdrop-filter:none!important}'});
 await pg.evaluate(()=>{P1.fr('duel',null);window.FAST=0;G.debugEnv();G.render()});await pg.waitForTimeout(500);
 const before=await cdp.send('Performance.getMetrics');
 await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline.stack,blink.user_timing',transferMode:'ReturnAsStream'});
 await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
 const sample=await pg.evaluate(async scenario=>{window.__fxCounts={};const sleep=ms=>new Promise(r=>setTimeout(r,ms));const frames=[],long=[],actions=[],scrollSamples=[];let stop=false,last=performance.now(),maxNodes=0,maxAnimations=0;
 const obs=new PerformanceObserver(l=>long.push(...l.getEntries().map(e=>({start:e.startTime,ms:e.duration}))));obs.observe({type:'longtask'});performance.clearMeasures('render');
 const tick=t=>{if(t>last)frames.push(t-last);last=t;if(!stop)requestAnimationFrame(tick)};requestAnimationFrame(tick);
 const act=(label,f)=>{const t=performance.now();f();const elapsed=performance.now()-t;maxNodes=Math.max(maxNodes,document.querySelectorAll('*').length);maxAnimations=Math.max(maxAnimations,document.getAnimations().length);actions.push({label,ms:elapsed})};
 const normal=scenario.startsWith('combat');if(normal||scenario==='boss-death'){
 act('combat-entry',()=>{G.startCombat(normal?'fight':'boss',normal?['knight','crab','slug']:['bell']);P1.res();if(scenario==='combat-bellcourt')G.debugEnv('a1_bellcourt','normal');G.run.hp=G.run.max=500;G.cb.energy=10;G.cb.hand=['thrust','thrust','parry','lunge'].map(id=>P1.mkc(id));G.render()});await sleep(800);
 act('attack',()=>{G.cb.tgt=0;G.playCard(0)});await sleep(220);act('second-attack',()=>G.playCard(0));await sleep(240);act('guard',()=>G.playCard(0));await sleep(400);
 if(normal){act('end-turn',()=>G.endTurn());await sleep(2400);act('normal-death',()=>{dmgEnemy(G.cb.ens[1],999);G.combat$.after()});await sleep(1200)}
 else{act('boss-death',()=>{dmgEnemy(G.cb.ens[0],999);G.combat$.after()});await sleep(2200)}
 }else if(scenario==='map-travel'){
 act('travel',()=>G.newRun('duel',{seed:27}));await sleep(1300);act('map',()=>skipTravel());await sleep(600);if(G.S.ov){act('tasks-close',()=>{G.S.ov=null;G.render()});await sleep(300)}
 scrollSamples.push(scrollY);for(let j=0;j<4;j++){scrollBy(0,-250);await sleep(150);scrollSamples.push(scrollY)}if(new Set(scrollSamples).size<2)throw new Error('Map did not actually scroll');
 act('node',()=>{const i=G.run$.reachable()[0];G.run$.goNode(0,i);P1.res();if(G.S.screen!=='combat')throw new Error('Map node did not enter combat')});await sleep(1800);
 }else{for(const s of ['rest','shop','treasure']){act(s,()=>G.run$.enterNode(s));await sleep(650);act('map',()=>G.run$.goMap());await sleep(650)}}
 stop=true;await sleep(80);obs.disconnect();return {frames,long,actions,scrollSamples,renders:performance.getEntriesByName('render').map(e=>e.duration),maxNodes,maxAnimations,fxCounts:window.__fxCounts,env:G.envState()};},scenario);
 if(!sample.renders.length)throw new Error('Render instrumentation did not match the live renderer');
 const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(path.join(out,`${rate}x-${scenario}.cpuprofile`),JSON.stringify(profile));
 const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await done;let chunks='';for(;;){const r=await cdp.send('IO.read',{handle:stream});chunks+=r.base64Encoded?Buffer.from(r.data,'base64').toString():r.data;if(r.eof)break}await cdp.send('IO.close',{handle:stream});fs.writeFileSync(path.join(out,`${rate}x-${scenario}.trace.json.gz`),zlib.gzipSync(chunks));
 const events=JSON.parse(chunks).traceEvents,aggregate={};for(const e of events)if(e.ph==='X'&&e.dur&&['Layout','UpdateLayoutTree','Paint','PrePaint','FunctionCall','FireAnimationFrame','TimerFire'].includes(e.name)){const a=aggregate[e.name]??=[];a.push(e.dur/1000)}
 const forced={};for(const e of events)if(e.name==='Layout'&&e.dur){const stack=e.args?.beginData?.stackTrace;if(stack?.length){const f=stack[0],key=f.functionName+' '+f.url.split('/').slice(-3).join('/')+':'+f.lineNumber;const a=forced[key]??={n:0,totalMs:0,maxMs:0};a.n++;a.totalMs+=e.dur/1000;a.maxMs=Math.max(a.maxMs,e.dur/1000)}}
 const after=await cdp.send('Performance.getMetrics');const metrics=Object.fromEntries(after.metrics.filter(x=>/Layout|RecalcStyle|ScriptDuration|TaskDuration/.test(x.name)).map(x=>[x.name,x.value-(before.metrics.find(b=>b.name===x.name)?.value||0)]));
 const nodes=new Map(profile.nodes.map(n=>[n.id,n]));const hot={};for(let i=0;i<(profile.samples||[]).length;i++){const n=nodes.get(profile.samples[i]),f=n.callFrame,key=`${f.functionName||'(anonymous)'} ${f.url.split('/').slice(-3).join('/')}:${f.lineNumber+1}`;hot[key]=(hot[key]||0)+(profile.timeDeltas[i]||0)/1000}
 const r={rate,scenario,ablation:process.env.ABLATE||null,frameMs:stats(sample.frames),longTasks:stats(sample.long.map(x=>x.ms)),renderMs:stats(sample.renders),actions:sample.actions,scrollSamples:sample.scrollSamples,maxNodes:sample.maxNodes,maxAnimations:sample.maxAnimations,fxCounts:sample.fxCounts,env:sample.env,metrics,forcedLayout:Object.entries(forced).sort((a,b)=>b[1].totalMs-a[1].totalMs),timeline:Object.fromEntries(Object.entries(aggregate).map(([k,a])=>[k,{...stats(a),total:a.reduce((s,x)=>s+x,0)}])),hot:Object.entries(hot).sort((a,b)=>b[1]-a[1]).slice(0,18),errors};results.push(r);console.log(JSON.stringify(r));fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(results,null,2));
 }await ctx.close()}}finally{await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
