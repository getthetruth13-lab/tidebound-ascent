const {chromium}=require('playwright');const {start,DEVICES}=require('../../tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const pg=await ctx.newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.addScriptTag({path:__dirname+'/../../tests/p1/checks.js'});
const out=await pg.evaluate(()=>{const o={};for(const [n,set] of [['relic',RELIC_CHECKS],['potion',POTION_CHECKS]])for(const k in set){try{o[n+':'+k]=set[k]()}catch(e){o[n+':'+k]=[false,'ERR '+e.message+' '+e.stack.split('\n')[1]]}}return o});
let f=0;for(const k in out){if(!out[k][0]){f++;console.log('✘',k,JSON.stringify(out[k][1]))}}console.log('fail',f,'of',Object.keys(out).length);console.log(errs.slice(0,5).join('\n'));await b.close();srv.close();process.exit(0)})();
