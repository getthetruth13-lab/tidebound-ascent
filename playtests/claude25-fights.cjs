const {chromium}=require('playwright');const {start}=require('../tests/util.js');const fs=require('fs');const out='screenshots/claude25/fights';fs.mkdirSync(out,{recursive:true});
const L=[['tenant','boss'],['penitent+slug','fight'],['mender+heap','fight'],['novice','fight'],['heap','fight'],['bell','boss'],['matriarch','boss'],['eel','elite'],['warden','elite']];
(async()=>{const srv=await start(0),b=await chromium.launch();
for(const [vn,w,h] of [['phone',780,360],['tab',1480,924]]){const ctx=await b.newContext({viewport:{width:w,height:h},serviceWorkers:'block'}),pg=await ctx.newPage(),errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto(srv.url);await pg.waitForFunction(()=>window.G);
 for(const cls of ['tide','echo','carto','duel'])for(const [ids,k] of L){if(cls!=='tide'&&!['tenant','bell','mender+heap'].includes(ids))continue;
  await pg.evaluate(([c,i,k])=>{FAST=1;G.newRun(c,{seed:11,skipTravel:true});G.run.floor=k==='boss'?15:9;G.startCombat(k,i.split('+'));G.render();const m=G.cb&&G.cb.mode;if(m&&m.k==='choice')G.modeAct('choice',0);G.render()},[cls,ids,k]);
  await pg.waitForTimeout(1600);await pg.screenshot({path:`${out}/${vn}-${cls}-${ids}.png`})}
 console.log(vn,errs);await ctx.close()}
await b.close();srv.close&&srv.close();process.exit(0)})();
