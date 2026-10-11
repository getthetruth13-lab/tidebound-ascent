const {chromium}=require('playwright');
const {start}=require('../tests/util.js');
const out='screenshots/codex19b';
(async()=>{const srv=await start(0),browser=await chromium.launch();
for(const [w,h] of [[915,412],[1024,473],[1480,924]]){
 const ctx=await browser.newContext({viewport:{width:w,height:h},serviceWorkers:'block'}),pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto(srv.url);
 const shot=async n=>{await pg.mouse.move(2,2);await pg.waitForTimeout(800);await pg.screenshot({path:`${out}/${w}-${n}.png`})};
 await shot('menu');
 await pg.evaluate(()=>{FAST=1;G.newRun('carto',{seed:5,skipTravel:true});G.startCombat('fight',['crab']);G.render()});await shot('sextant');
 await pg.evaluate(()=>{FAST=1;G.newRun('tide',{seed:5,skipTravel:true});G.startCombat('fight',['crab']);G.render()});await shot('tide-panel');
 await pg.evaluate(()=>{G.newRun('tide',{seed:5,skipTravel:true});G.startCombat('boss',['bell']);G.render()}).catch(e=>console.log('boss',e.message));await shot('bell-boss');
 await pg.evaluate(()=>{G.newRun('tide',{seed:5,skipTravel:true});openShop();G.render()}).catch(()=>{});await shot('shop');
 await pg.evaluate(()=>{G.newRun('duel',{seed:5,skipTravel:true});W.S={screen:'travel',t:Date.now()-2000};G.render()});await shot('travel');
 await pg.evaluate(()=>{G.newRun('duel',{seed:5,skipTravel:true});const ev=G.EVENTS.find(e=>e.id==='tidalwheel')||G.EVENTS[0];W.S={screen:'event',ev:{...ev},t:Date.now()};G.render()});await shot('event');
 await pg.evaluate(()=>{G.newRun('duel',{seed:5,skipTravel:true});G.run.floor=12;G.startCombat('fight',['crab']);G.render()}).catch(()=>{});await shot('court');
 console.log(w,errs);await ctx.close()}
await browser.close();srv.close&&srv.close();process.exit(0)})();
