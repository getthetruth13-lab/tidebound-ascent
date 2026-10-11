const {chromium}=require('playwright');const {start,DEVICES}=require('../util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.evaluate(()=>{localStorage.clear();W.S={screen:'title',view:'select',hero:'duel'};G.render()});
 await p.click('#beginfocus');await p.waitForTimeout(250);const lifting=await p.evaluate(()=>!!document.querySelector('.tb-stair.lifting'));await p.waitForTimeout(1500);
 const r=await p.evaluate(()=>({screen:W.S.screen,cls:W.run&&W.run.cls}));console.log(JSON.stringify({lifting,...r,errs}));await b.close();process.exit(lifting&&r.cls==='duel'&&!errs.length?0:1)})();
