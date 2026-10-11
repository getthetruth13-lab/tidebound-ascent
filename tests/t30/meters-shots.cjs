// Dev screenshots of the four class meters, idle and mid-drag (live preview). node tests/t30/meters-shots.cjs [device...]
const {chromium}=require('playwright');const fs=require('fs');const {start,DEVICES,cardPoint}=require('../util.js');
const OUT=__dirname+'/../../screenshots/t30';fs.mkdirSync(OUT,{recursive:true});
const SETUP={
 tide:`G.newRun('tide',{seed:5,skipTravel:true});G.giveRelic('tidetable');G.startCombat('fight',['crab','slug']);const c=G.cb;c.mode=null;c.tide=6;c.tideDir=1;c.hand=[{id:'moonpull',uid:9001,up:false},{id:'splash',uid:9002,up:false},{id:'lash',uid:9003,up:false}];G.render()`,
 echo:`G.newRun('echo',{seed:5,skipTravel:true});G.startCombat('fight',['crab','slug']);const c=G.cb;c.mode=null;c.hand=G.cb.hand.slice(0,5);c.mark=c.hand[0];c.afterMark=1;G.render()`,
 carto:`G.newRun('carto',{seed:5,skipTravel:true});G.startCombat('fight',['crab','slug']);const c=G.cb;if(c.mode&&c.mode.k==='chart')modeAct('done');c.mode=null;c.hand=c.hand.slice(0,5);const ids=Object.keys(G.CARDS).filter(i=>G.CARDS[i].cls==='carto'&&/^(lookout|watch|camp)/.test(i)).slice(0,2);c.slots=[{id:ids[0]||c.hand[0].id,uid:7001,rank:2},{id:ids[1]||c.hand[1].id,uid:7002,rank:3}];G.render()`,
 duel:`G.newRun('duel',{seed:5,skipTravel:true});G.startCombat('fight',['crab','slug']);const c=G.cb;c.mode=null;c.mom=3;c.parry=4;G.render()`};
(async()=>{const srv=await start(0);const b=await chromium.launch();const devs=process.argv.slice(2).length?process.argv.slice(2):['s24Landscape'];
 const DEV={...DEVICES,small:{viewport:{width:624,height:288},deviceScaleFactor:3.75,isMobile:true,hasTouch:true},p2340:{viewport:{width:780,height:360},deviceScaleFactor:3,isMobile:true,hasTouch:true},p1480:{viewport:{width:740,height:462},deviceScaleFactor:2,isMobile:true,hasTouch:true}};
 for(const d of devs){const ctx=await b.newContext({...DEV[d],serviceWorkers:'block'});const pg=await ctx.newPage();pg.on('pageerror',e=>console.log('ERR',e.message));
  await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.waitForLoadState('networkidle');
  for(const cls of Object.keys(SETUP)){await pg.evaluate(`localStorage.clear();(()=>{${SETUP[cls]}})()`);await pg.waitForTimeout(1300);
   await pg.screenshot({path:`${OUT}/${d}-meter-${cls}.png`});
   // mid-drag preview: lift card 0 and hover the first enemy
   const a=await cardPoint(pg,cls==='tide'?1:0);if(a){const t=await pg.evaluate(()=>{const r=document.querySelector('.en .fig').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*.55}});
    await pg.mouse.move(a.x,a.y);await pg.mouse.down();await pg.mouse.move(t.x,t.y,{steps:10});await pg.waitForTimeout(300);await pg.screenshot({path:`${OUT}/${d}-meter-${cls}-drag.png`});await pg.mouse.up()}
   console.log(cls,'ok')}
  await ctx.close()}
 await b.close();srv.close&&srv.close()})();
