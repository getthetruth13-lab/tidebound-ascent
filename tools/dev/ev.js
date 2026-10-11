// dev: run an expression in-page at S24 landscape (832x384): node tools/dev/ev.js "<setup js>" "<expr js returning JSON-able>" [png]
const path=require('path');const {chromium}=require('playwright');const {start,DEVICES}=require('../../tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const pg=await ctx.newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.addScriptTag({path:path.join(__dirname,'../../tests/p1/checks.js')});
await pg.evaluate(s=>eval(s),process.argv[2]||'');await pg.waitForTimeout(500);
const r=await pg.evaluate(s=>eval(s),process.argv[3]||'1');console.log(JSON.stringify(r,null,1));
if(process.argv[4])await pg.screenshot({path:process.argv[4]});if(errs.length)console.log('ERR',errs);await b.close();srv.close()})();
