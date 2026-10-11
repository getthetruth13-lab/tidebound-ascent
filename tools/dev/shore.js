// dev/test: in-game S24 battle on a1_shore → screenshots/s24-a1-shore-battle.png (832x384 @ DPR 3.75 = 3120x1440)
const path=require('path');const {chromium}=require('playwright');const {start,DEVICES}=require('../../tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const pg=await ctx.newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.addScriptTag({path:path.join(__dirname,'../../tests/p1/checks.js')});
const cls=process.env.CLS||'duel';
await pg.evaluate(cls=>{window.FAST=1;G.newRun(cls,{seed:21,skipTravel:true});G.run.floor=1;G.run.pos={r:0,i:0};G.startCombat('fight',['crab','knight']);P1.res();G.render()},cls);
await pg.waitForFunction(()=>{const s=G.envState();return s.id==='a1_shore'&&s.files>=6},null,{timeout:15000});
await pg.waitForTimeout(1600);
const info=await pg.evaluate(()=>{const s=G.envState();const r=e=>{const b=e.getBoundingClientRect();return [b.x|0,b.y|0,b.width|0,b.height|0]};
 return {env:s,stack:r(document.querySelector('#env .envstack')),front:getComputedStyle(document.querySelector('#env-front')).zIndex,app:getComputedStyle(document.querySelector('#app')).zIndex,
 imgs:[...document.querySelectorAll('#env .envI,#env-front .envI')].map(i=>i.parentNode.dataset.l+':'+r(i).join(',')),hero:r(document.querySelector('.hero .fig')),foes:[...document.querySelectorAll('.en .fig')].map(r),
 hit:[[60,350],[416,300],[770,250]].map(([x,y])=>{const h=document.elementFromPoint(x,y);return h&&(h.closest('#env-front')?'ENV-FRONT':h.className)})}});
console.log(JSON.stringify(info,null,1));
const out=process.argv[2]||path.join(__dirname,'../../screenshots/s24-a1-shore-battle.png');await pg.screenshot({path:out});console.log('wrote',out,errs);await b.close();srv.close()})();
