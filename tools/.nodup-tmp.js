const {chromium}=require('playwright');const {start,tapCardUI}=require('/workspace/game/tests/util.js');const O='/workspace/game/screenshots/no-dup';require('fs').mkdirSync(O,{recursive:true});
(async()=>{const s=await start(0);const b=await chromium.launch();
for(const [w,h] of [[915,412],[1024,473]]){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});const pg=await ctx.newPage();
await pg.goto(s.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.evaluate(()=>{localStorage.clear();G.newRun('tide',{seed:42,skipTravel:true});G.startCombat('fight',['crab','slug'])});await pg.waitForTimeout(3000);
const n=await pg.evaluate(()=>document.querySelectorAll('.rline').length);console.log(w,'rline count',n);
await pg.screenshot({path:`${O}/${w}x${h}-rest.png`});await pg.waitForFunction(()=>document.querySelectorAll('.hand .card').length>2);await pg.evaluate(()=>tapCard(1));await pg.waitForTimeout(500);await pg.screenshot({path:`${O}/${w}x${h}-raised.png`});await ctx.close()}
await b.close();process.exit(0)})();
