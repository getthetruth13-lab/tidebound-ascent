// Claude Task 16: screenshots at 915x412 (rename: The Drowned Sun / Lampbearers).
const {chromium}=require('playwright');const fs=require('fs');const {start}=require('../tests/util.js');
const OUT=__dirname+'/screens-claude16/';fs.mkdirSync(OUT,{recursive:true});
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:915,height:412},deviceScaleFactor:2,hasTouch:true,isMobile:true,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 const shot=async(n,w=700)=>{await p.waitForTimeout(w);await p.screenshot({path:OUT+n+'.png',scale:'css'})};
 await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);
 await shot('start',2600);
 await p.evaluate(()=>{window.FAST=1;titleGo('main')});await shot('menu');
 await p.evaluate(()=>titleGo('select'));await shot('select');
 await p.evaluate(()=>{W.S={screen:'intro',n:5};render()}).catch(()=>{});await shot('intro');
 console.log('errors',errs);await b.close();srv.close&&srv.close();process.exit(0)})();
