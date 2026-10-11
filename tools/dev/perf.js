// dev: frame-time sample in an a1_shore battle with 4x CPU throttle (rough S24 proxy; headless has no GPU, so this is pessimistic for compositing)
const path=require('path');const {chromium}=require('playwright');const {start,DEVICES}=require('../../tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const pg=await ctx.newPage();
await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.addScriptTag({path:path.join(__dirname,'../../tests/p1/checks.js')});
const cdp=await ctx.newCDPSession(pg);await cdp.send('Emulation.setCPUThrottlingRate',{rate:+(process.env.RATE||4)});
for(const env of ['a1_shore','a1_bellcourt','a1_cloister']){
const r=await pg.evaluate(async env=>{G.newRun('tide',{seed:3,skipTravel:true});G.startCombat('fight',['crab','knight']);P1.res();G.debugEnv(env,'normal');G.render();await new Promise(r=>setTimeout(r,2500));
 const t=[];let last=performance.now();await new Promise(res=>{const f=now=>{t.push(now-last);last=now;if(t.length<180)requestAnimationFrame(f);else res()};requestAnimationFrame(f)});
 // input latency: tap a card while effects run
 const t0=performance.now();G.tapCard(0);const lat=performance.now()-t0;
 t.sort((a,b)=>a-b);return {env,avg:+(t.reduce((a,b)=>a+b)/t.length).toFixed(2),p95:+t[Math.floor(t.length*.95)].toFixed(2),max:+t[t.length-1].toFixed(2),q:G.envState().q,particles:G.envState().particles,tapMs:+lat.toFixed(2)}},env);
console.log(JSON.stringify(r))}
await b.close();srv.close()})();
