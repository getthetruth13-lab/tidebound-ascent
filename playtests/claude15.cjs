// Claude Task 15: screenshots at 915x412. Usage: node playtests/claude15.cjs <tag>
const {chromium}=require('playwright');const fs=require('fs');const {start}=require('../tests/util.js');
const tag=process.argv[2]||'after';const OUT=__dirname+'/screens-claude15/';fs.mkdirSync(OUT,{recursive:true});
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:915,height:412},deviceScaleFactor:2,hasTouch:true,isMobile:true,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const shot=async(n,w=700)=>{await p.waitForTimeout(w);await p.screenshot({path:OUT+tag+'-'+n+'.png',scale:'css'})};
 await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);
 await shot('start',1800);
 await p.evaluate(()=>{localStorage.clear();window.FAST=1});
 await p.evaluate(()=>{G.newRun('echo',{seed:42,skipTravel:true});W.S={screen:'chest',name:'Sunken Chest',chest:'large',opened:false,rows:[]};G.render()});await shot('chest-closed');
 await p.evaluate(()=>{G.newRun('echo',{seed:42,skipTravel:true});W.S={screen:'map'};G.render()});await shot('map',1200);
 await p.waitForTimeout(700);await shot('map2',100);
 await p.evaluate(()=>{G.newRun('echo',{seed:42,skipTravel:true});const r=W.run;const i=0;r.pos={r:2,i};r.vis['0:'+r.map[0].findIndex(()=>true)]=1;r.vis['1:0']=1;r.vis['2:'+i]=1;W.S={screen:'map'};G.render()});await shot('map-cur',1200);
 console.log('errors',errs);await b.close();srv.close&&srv.close();process.exit(0)})();
