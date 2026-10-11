// Task 33: status tooltip screenshots + text dump. Usage: node tests/t30/task33.cjs
const {chromium}=require('playwright');const {start}=require('../util.js');const fs=require('fs');
const DEV={p2340:{viewport:{width:780,height:360},deviceScaleFactor:3,isMobile:true,hasTouch:true},p1480:{viewport:{width:740,height:462},deviceScaleFactor:2,isMobile:true,hasTouch:true}};
const out='/workspace/game/screenshots/t33';fs.mkdirSync(out,{recursive:true});
(async()=>{const srv=await start(0);const b=await chromium.launch();let bad=0;
 for(const d of Object.keys(DEV)){const ctx=await b.newContext({...DEV[d],serviceWorkers:'block'});const pg=await ctx.newPage();pg.on('pageerror',e=>{bad++;console.log('ERR',e.message)});
  await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.waitForLoadState('networkidle');
  await pg.evaluate(()=>{window.FAST=1;localStorage.clear();G.newRun('duel',{seed:7,skipTravel:true});G.startCombat('fight',['crab','knight']);const c=G.cb;
   Object.assign(c.p.st,{str:3,dex:2,weak:2,vuln:1,brittle:2,bleed:3,shell:4,barbs:2});c.p.block=6;c.parry=10;
   c.ens.forEach(e=>{Object.assign(e.st,{weak:2,vuln:2,bleed:4,drench:3,reson:2,str:2,mending:2,shell:3});e.block=5});G.render()});
  await pg.waitForTimeout(900);
  const shots=[['hero','.combat .hero .bd.st-str'],['heroweak','.combat .hero .bd.st-weak'],['heromore','.combat .hero .bd.st-more'],['enemyvuln','.combat .en .bd.st-vuln'],['enemyweak','.combat .en .bd.st-weak'],['enemybleed','.combat .en .bd.st-bleed'],['enemymore','.combat .en .bd.st-more'],['guard','.combat .hero .hpblk']];
  for(const [n,sel] of shots){const el=pg.locator(sel).first();if(!await el.count()){console.log('missing',sel);bad++;continue}
   await el.scrollIntoViewIfNeeded();const bb=await el.boundingBox();
   await pg.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await pg.waitForTimeout(300);
   const info=await pg.evaluate(()=>{const t=document.getElementById('kwtip');const r=t.getBoundingClientRect();return {on:t.classList.contains('on'),text:t.innerText.replace(/\n+/g,' | '),r:[r.left,r.top,r.width,r.height].map(Math.round),kw:t.querySelectorAll('.kw').length}});
   console.log(d,n,JSON.stringify(info));if(!info.on)bad++;
   await pg.screenshot({path:`${out}/${d}-${n}.png`});await pg.mouse.move(2,2);await pg.waitForTimeout(150);
   if(await pg.evaluate(()=>document.getElementById('kwtip').classList.contains('on'))){console.log('did not vanish');bad++}}
  // touch hold on an enemy icon, release closes it
  const el=pg.locator('.combat .en .bd.st-vuln').first();const bb=await el.boundingBox();
  const cdp=await ctx.newCDPSession(pg);const pt={x:bb.x+bb.width/2,y:bb.y+bb.height/2,id:1};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt]});await pg.waitForTimeout(800);
  const held=await pg.evaluate(()=>document.getElementById('kwtip').classList.contains('on'));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pg.waitForTimeout(300);
  const rel=await pg.evaluate(()=>document.getElementById('kwtip').classList.contains('on'));
  console.log(d,'touch hold shown',held,'closed after release',!rel);if(!held||rel)bad++;
  await ctx.close()}
 await b.close();srv.close&&srv.close();console.log(bad?'FAIL '+bad:'PASS');process.exit(bad?1:0)})();
