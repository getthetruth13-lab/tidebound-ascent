const {chromium}=require('playwright');const {start}=require('./util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1480,height:924},serviceWorkers:'block'});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.waitForLoadState('networkidle');
 await pg.evaluate(()=>{localStorage.clear();G.newRun('duel',{seed:7,skipTravel:true});W.S={screen:'event',ev:G.EVENTS.find(e=>e.id==='sunkenchest'),t:0};G.render()});await pg.waitForTimeout(300);
 await pg.hover('.evo:nth-of-type(1) >> nth=1');await pg.waitForTimeout(500);await pg.screenshot({path:'/tmp/hover.png'});
 console.log('tip:',await pg.evaluate(()=>document.querySelector('#kwtip')?.innerText));
 // bad reveal: force roll by setting seed until bad
 for(let s=1;s<30;s++){await pg.evaluate(s=>{G.newRun('duel',{seed:s,skipTravel:true});W.S={screen:'event',ev:G.EVENTS.find(e=>e.id==='sailor'),t:0};G.render();evOpt(1)},s);if(await pg.evaluate(()=>W.S.ev.out&&W.S.ev.out.tone==='bad'))break}
 await pg.waitForTimeout(500);await pg.screenshot({path:'/tmp/bad.png'});
 await pg.click('#msgok');console.log('after continue:',await pg.evaluate(()=>W.S.screen),errs);
 await b.close();process.exit(0)})();
