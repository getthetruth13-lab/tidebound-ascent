const {chromium}=require('playwright');const {start,DEVICES}=require('../../tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const pg=await ctx.newPage();
const errs=[];pg.on('pageerror',e=>errs.push('PAGEERR '+e.message+'\n'+(e.stack||'').split('\n').slice(0,4).join('\n')));pg.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url())});pg.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
await pg.goto(srv.url+'index.html');await pg.waitForTimeout(1500);
const r=await pg.evaluate(()=>!!window.G);console.log('G',r);
if(r){const out=await pg.evaluate(()=>{const o=[];try{window.FAST=1;G.newRun('tide',{seed:1});o.push(G.S.screen);G.startCombat('fight',['knight']);o.push(G.S.screen);o.push(G.cb.hand.length,document.querySelectorAll('.hand .card').length,document.querySelector('#app').innerHTML.slice(0,600))}catch(e){o.push('ERR '+e.message+e.stack)}return o});console.log(out)}
console.log(errs.join('\n'));await b.close();srv.close();process.exit(0)})();
