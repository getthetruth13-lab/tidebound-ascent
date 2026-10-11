const {chromium}=require('playwright');
const {start,DEVICES}=require('../tests/util.js');
const fs=require('fs'),assert=require('assert');
const out=__dirname+'/screens-claude19';fs.mkdirSync(out,{recursive:true});
const tag=process.argv[2]||'';
(async()=>{const srv=await start(0),browser=await chromium.launch();
try{for(const dev of ['s24Landscape']){const ctx=await browser.newContext({...DEVICES[dev],serviceWorkers:'block'}),pg=await ctx.newPage(),errors=[];pg.on('pageerror',e=>errors.push(e.message));await pg.goto(srv.url);await pg.waitForFunction(()=>window.G&&G.newRun);
 for(const cls of ['tide','echo','carto','duel']){
  await pg.evaluate(c=>{FAST=0;G.newRun(c,{seed:19,skipTravel:true});G.startCombat('fight',['leech','knight','wisp']);let n=0;while(G.cb.mode&&n++<5)modeAct('choice',0);G.cb.sel=null;W.toasts=[];G.render()},cls);
  await pg.waitForTimeout(900);await pg.screenshot({path:`${out}/${tag}${cls}.png`});
 }
 assert.deepEqual(errors,[]);}
console.log('shots ok')}finally{await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exit(1)});
