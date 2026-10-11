// dev: node tools/dev/peek.js "<js to eval>" out.png  — S24 landscape screenshot after evaluating js
const {chromium}=require('playwright');const {start,DEVICES}=require('../../tests/util.js');
(async()=>{const [js,out]=process.argv.slice(2);const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,deviceScaleFactor:1.5,serviceWorkers:'block'});const pg=await ctx.newPage();
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message+' '+(e.stack||'').split('\n')[1]));
await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);
const r=await pg.evaluate(async js=>{try{const v=await eval(js);return JSON.stringify(v)}catch(e){return 'ERR '+e.message+' '+e.stack}},js);console.log(r&&r.slice(0,3000));
await pg.waitForTimeout(1200);await pg.screenshot({path:out||'/tmp/peek.png'});console.log(errs.join('\n'));await b.close();srv.close();process.exit(0)})();
