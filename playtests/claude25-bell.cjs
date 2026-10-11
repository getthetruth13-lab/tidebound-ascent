const {chromium}=require('playwright');const {start}=require('../tests/util.js');const out='screenshots/claude25';
(async()=>{const srv=await start(0),b=await chromium.launch();
for(const [w,h] of [[832*1,384*1],[1480,924]]){
 const ctx=await b.newContext({viewport:{width:w,height:h},serviceWorkers:'block'}),pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto(srv.url);await pg.waitForFunction(()=>window.G);
 for(const [n,floor,boss] of [['court',12,0],['lair',15,1]]){
  await pg.evaluate(([f,bo])=>{FAST=1;G.newRun('duel',{seed:5,skipTravel:true});G.run.floor=f;G.startCombat(bo?'boss':'fight',bo?['bell']:['crab']);G.render()},[floor,boss]);
  await pg.waitForTimeout(2200);await pg.screenshot({path:`${out}/${w}-${n}.png`});
  console.log(w,n,await pg.evaluate(()=>JSON.stringify(window.G.envState?G.envState():document.getElementById('env').dataset)))}
 console.log(w,errs);await ctx.close()}
await b.close();srv.close&&srv.close();process.exit(0)})();
