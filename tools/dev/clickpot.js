const {chromium}=require('playwright');const {start,DEVICES}=require('../../tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});ctx.setDefaultTimeout(3000);const pg=await ctx.newPage();
await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);
await pg.evaluate(()=>{window.FAST=1;G.newRun('echo',{seed:5,skipTravel:true});G.run.potions=['sparkphial','quickwater',null];G.startCombat('fight',['crab'])});
try{await pg.click('.potion:not(.empty)')}catch(e){console.log(e.message.split('\n').slice(0,12).join('\n'))}
console.log(await pg.evaluate(()=>G.S.potion));await b.close();srv.close();process.exit(0)})();
