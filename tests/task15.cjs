const {chromium}=require('playwright');
const {start,cardPoint}=require('./util.js');
const assert=require('assert'),fs=require('fs');
const out='playtests/screens-codex15';fs.mkdirSync(out,{recursive:true});
(async()=>{const srv=await start(0),browser=await chromium.launch();
try{const ctx=await browser.newContext({viewport:{width:1012,height:473},deviceScaleFactor:1,hasTouch:true,isMobile:true,serviceWorkers:'block'}),page=await ctx.newPage();const errors=[],missing=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404){missing.push(r.url());console.log('Missing:',r.url())}});
await page.goto(srv.url);await page.waitForFunction(()=>window.G);await page.waitForLoadState('networkidle');
const results=await page.evaluate(async()=>{
 const {previewCard}=await import('./src/engine/preview.js');window.previewCard=previewCard;
 const tests=[];
 for(const [cls,id,setup] of [['tide','lash','crest'],['tide','whirl','multi'],['tide','brace','guard'],['echo','reverb','echo'],['carto','trail','rank'],['carto','mirrorsig','rank'],['tide','saltvolley','random'],['duel','lunge','flourish'],['tide','splash','lethal']]){
  FAST=1;G.newRun(cls,{seed:15,skipTravel:true});G.giveRelic('whaletooth');G.startCombat('fight',['crab','knight']);let n=0;while(G.cb.mode&&n++<5)modeAct('choice',0);
  const cb=G.cb;cb.hand=[{id,uid:8000,up:true}];cb.energy=10;cb.p.st={str:4,dex:3,weak:1,brittle:1};cb.ens.forEach(e=>{e.st={vuln:2,drench:3,reson:2,bleed:2};e.block=3;e.hp=e.max=100});
  if(setup==='crest')cb.tide=8;if(setup==='rank')cb.slots=[{id:'signal',uid:8200,rank:2,up:false}];if(setup==='flourish'){cb.mom=4;cb.armFlourish=true}if(setup==='echo')cb.mimic=true;if(setup==='lethal'){cb.ens[0].hp=1;cb.ens[0].block=0}
  G.render();const original=JSON.stringify(W),html=document.getElementById('app').innerHTML,save=JSON.stringify(localStorage);
  const prediction=previewCard(0,0);if(!prediction)throw Error('No preview '+id);
  if(JSON.stringify(W)!==original||document.getElementById('app').innerHTML!==html||JSON.stringify(localStorage)!==save)throw Error('Preview mutated live state '+id);
  const before=cb.ens.map(e=>({hp:e.hp,block:e.block,st:{...e.st}})),guard=cb.p.block;G.playCard(0);
  prediction.enemies.forEach((p,i)=>{const e=cb.ens[i];if(p.loss!==Math.max(0,before[i].hp-e.hp)||p.guardLoss!==Math.max(0,before[i].block-e.block))throw Error('Damage mismatch '+id);for(const [k,v] of Object.entries(p.statuses))if(v!==e.st[k]-(before[i].st[k]||0))throw Error('Status mismatch '+id)});
  if(prediction.guard!==Math.max(0,cb.p.block-guard))throw Error('Guard mismatch '+id);tests.push({cls,id,setup,prediction});
 }

 // Every playable card must leave both the state graph and the DOM unchanged,
 // including callback captures, created cards, deck order and deferred effects.
 const pool=[];
 for(const id of Object.keys(G.CARDS)){
  const cls=['tide','echo','carto','duel'].includes(G.CARDS[id].cls)?G.CARDS[id].cls:'tide';
  if(!G.cb||G.run.cls!==cls){G.newRun(cls,{seed:16,skipTravel:true});G.startCombat('fight',['crab','knight']);let n=0;while(G.cb.mode&&n++<5)modeAct('choice',0)}
  G.cb.hand=[{id,uid:9000,up:false}];G.cb.energy=20;G.cb.mom=5;G.cb.tide=8;G.cb.ens.forEach(e=>e.hp=e.max=1000);
  await Promise.resolve();const state=JSON.stringify(W),dom=document.getElementById('app').innerHTML,cb=G.cb;
  const result=previewCard(0,0);if(document.getElementById('app').innerHTML!==dom)throw Error('Preview rendered DOM: '+id);await Promise.resolve();
  if(JSON.stringify(W)!==state||G.cb!==cb)throw Error('Card-pool isolation failed: '+id+' state='+ (JSON.stringify(W)!==state)+' dom='+ (document.getElementById('app').innerHTML!==dom)+' cb='+(G.cb!==cb));
  pool.push({id,playable:!!result,pending:!!result?.pending});
 }
 tests.push({poolIsolation:pool.length,playable:pool.filter(x=>x.playable).length});
 G.newRun('tide',{seed:15,skipTravel:true});G.startCombat('fight',['leech']);let n=0;while(G.cb.mode&&n++<5)modeAct('choice',0);G.cb.sel=null;W.toasts=[];G.render();return tests;
});
await page.waitForTimeout(1300);await page.screenshot({path:out+'/1012x473-tide-composition.png'});
const handSizes=await page.evaluate(()=>{const cb=G.cb,old=cb.hand;const out=[];for(let n=1;n<=10;n++){cb.hand=Array.from({length:n},(_,i)=>({id:'splash',uid:9100+i,up:false}));G.render();out.push({n,bottom:Math.max(...[...document.querySelectorAll('.hand .card')].map(c=>c.getBoundingClientRect().bottom))})}cb.hand=old;G.render();return out});assert(handSizes.every(r=>r.bottom>=473&&r.bottom<=473+473*.40*.55),JSON.stringify(handSizes));
const geom=await page.evaluate(()=>{const r=document.querySelector('.hero .fig').getBoundingClientRect();return {height:r.height,center:(r.left+r.width/2)/innerWidth,bottom:r.bottom,cards:[...document.querySelectorAll('.hand .card')].map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})}});
assert(geom.height>=155&&geom.center>=.24&&geom.center<=.26,JSON.stringify(geom));assert(geom.cards.every(r=>r.top<473&&r.bottom<=473+473*.40*.55),JSON.stringify(geom));
const cdp=await ctx.newCDPSession(page),p=await cardPoint(page,0);assert(p);
const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1}]});
await touch('touchStart',p.x,p.y);await page.waitForTimeout(160);assert.equal(await page.locator('.hand .card.peek').count(),1);
const next=await page.evaluate(()=>{const hand=document.querySelector('#hand'),cards=hand.querySelectorAll('.card');return hand.getBoundingClientRect().left+hand.clientWidth/2+(+cards[1].dataset.x)});
await touch('touchMove',next,p.y);await page.waitForTimeout(180);assert.equal(await page.locator('.hand .card.peek').getAttribute('data-i'),'1');assert.equal(await page.locator('.hand .card.drag').count(),0);
await page.screenshot({path:out+'/touch-scrub-peek.png'});await touch('touchEnd');await page.waitForTimeout(200);assert.equal(await page.locator('.hand .card.peek').count(),0);
await page.evaluate(()=>{G.cb.sel=null;G.render()});const long=await cardPoint(page,0);await touch('touchStart',long.x,long.y);await page.waitForTimeout(520);assert.equal(await page.locator('#inspect').count(),1);await touch('touchEnd');await page.waitForTimeout(150);assert.equal(await page.locator('#inspect').count(),0);
await page.evaluate(()=>{G.cb.hand=[{id:'brace',uid:9200,up:false},{id:'splash',uid:9201,up:false}];G.cb.energy=3;G.cb.sel=null;G.render()});
const playPoint=await cardPoint(page,0),oldBlock=await page.evaluate(()=>G.cb.p.block);await touch('touchStart',playPoint.x,playPoint.y);await touch('touchMove',playPoint.x,playPoint.y-160);await page.waitForTimeout(100);assert.equal(await page.locator('.hand .card.drag').count(),1);await touch('touchEnd');await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>G.cb.hand.length),1);assert(await page.evaluate(old=>G.cb.p.block>old,oldBlock));
await page.mouse.move(50,50);const hover=await cardPoint(page,0);await page.mouse.move(hover.x,hover.y);await page.waitForTimeout(160);assert.equal(await page.locator('.hand .card.peek').count(),1);await page.mouse.move(50,50);await page.waitForTimeout(150);assert.equal(await page.locator('.hand .card.peek').count(),0);
await page.evaluate(()=>{G.cb.sel=0;G.render()});await page.screenshot({path:out+'/outcome-and-pinned-play.png'});
assert.equal(await page.locator('#playbtn,#detail').count(),0,'drag-only hand has no play popup');

await page.evaluate(()=>{closeInspect();G.cb.sel=null;G.render();G.run$.goMap()});await page.waitForTimeout(500);assert.equal(await page.locator('#inspect').count(),0);await page.screenshot({path:out+'/1012x473-map.png'});
await page.evaluate(()=>{W.S.ov='tasks';G.render()});await page.waitForTimeout(250);await page.screenshot({path:out+'/1012x473-tasks.png'});assert(await page.evaluate(()=>document.body.classList.contains('scene-choice')));await page.evaluate(()=>{W.S.ov=null;G.render()});
await page.evaluate(()=>{W.S={screen:'event',ev:G.EVENTS[0],t:0};G.render()});await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>W.S.screen),'event');await page.screenshot({path:out+'/1012x473-event.png'});
await page.evaluate(()=>{G.run.floor=15;Object.assign(G.run.lamp,{floors:15,fights:12,elites:3,boss:1});G.run.lamp.tasks.forEach(t=>t.done=true);G.run$.endRun(true)});await page.waitForTimeout(700);await page.screenshot({path:out+'/1012x473-end.png'});
const rows=await page.evaluate(()=>[...document.querySelectorAll('.lp-lines tr')].map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})));assert(rows.every((r,i)=>!i||r.top>=rows[i-1].bottom-1),JSON.stringify(rows));
fs.writeFileSync(out+'/preview-results.json',JSON.stringify({results,geom,errors,missing},null,2));assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
console.log('Task 15: preview parity, isolation, full hand, composition, real touch scrub and long-press PASS');
}finally{await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
