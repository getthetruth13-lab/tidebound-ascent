const {chromium}=require('playwright');const {start,DEVICES}=require('../util.js');const fs=require('fs');
const DEV={...DEVICES,small:{viewport:{width:624,height:288},deviceScaleFactor:3.75,isMobile:true,hasTouch:true},p2340:{viewport:{width:780,height:360},deviceScaleFactor:3,isMobile:true,hasTouch:true},p1480:{viewport:{width:740,height:462},deviceScaleFactor:2,isMobile:true,hasTouch:true},mid:{viewport:{width:740,height:462},deviceScaleFactor:2,isMobile:true,hasTouch:true}};
module.exports=async function(shots,devs=['s24Landscape'],out='/workspace/game/screenshots/t30'){fs.mkdirSync(out,{recursive:true});const srv=await start(0);const b=await chromium.launch();
 for(const d of devs){const ctx=await b.newContext({...DEV[d],serviceWorkers:'block'});const pg=await ctx.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.waitForLoadState('networkidle');
  for(const [name,fn] of shots){await pg.evaluate(fn);await pg.waitForTimeout(900);await pg.screenshot({path:`${out}/${d}-${name}.png`});console.log(`${out}/${d}-${name}.png`)}
  await ctx.close()}
 await b.close();srv.close&&srv.close()}
