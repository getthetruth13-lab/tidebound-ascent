const {chromium}=require('playwright');
const {start,dragCardUI,cardPoint}=require('../tests/util.js');
const fs=require('fs'),assert=require('assert');
const out='screenshots/codex19';fs.mkdirSync(out,{recursive:true});
(async()=>{const srv=await start(0),browser=await chromium.launch();const report=[];
try{for(const [width,height] of [[915,412],[1024,473],[1480,924]]){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'}),pg=await ctx.newPage(),errors=[];pg.on('pageerror',e=>errors.push(e.message));await pg.goto(srv.url);await pg.waitForFunction(()=>window.G);
 const capture=async name=>{if(!name.startsWith('drag-'))await pg.mouse.move(2,2);await pg.waitForTimeout(700);await pg.screenshot({path:`${out}/${width}-${name}.png`})};
 const choiceAudit=async name=>{await capture(name);const data=await pg.evaluate(()=>{const box=document.querySelector('.battle .box'),opts=[...box.querySelectorAll('.tile,.tcard,.cslot')];return {boxFits:box.getBoundingClientRect().bottom<=innerHeight&&box.scrollHeight<=box.clientHeight+1,compact:box.getBoundingClientRect().width<innerWidth*.85,opts:opts.map(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,hit:e.contains(hit),hitName:hit?.className}})}});assert.ok(data.compact,'content-sized choice window');assert.ok(data.boxFits,JSON.stringify(data));assert.ok(data.opts.every(r=>r.top>=0&&r.bottom<=height&&r.left>=0&&r.right<=width&&r.hit),JSON.stringify(data));assert.ok(Math.max(...data.opts.map(r=>r.top))-Math.min(...data.opts.map(r=>r.top))<2,JSON.stringify(data));report.push({width,name,...data})};
 await pg.evaluate(()=>{FAST=1;G.newRun('tide',{seed:19,skipTravel:true});G.startCombat('fight',['crab','knight']);G.render()});await choiceAudit('moon-shell');
 const before=await pg.evaluate(()=>G.cb.mode.k);await pg.locator('.tipi').first().tap();assert.equal(await pg.evaluate(()=>G.cb.mode.k),before);assert.ok(await pg.locator('#kwtip.on').count());
 assert.ok(await pg.locator('.tipi').first().evaluate(e=>e.getBoundingClientRect().width>=44&&e.getBoundingClientRect().height>=44));
 await pg.locator('.tile').nth(1).tap({position:{x:20,y:65}});assert.equal(await pg.evaluate(()=>G.cb.mode),null);
 await pg.evaluate(()=>{G.cb.hand=[{id:'splash',uid:9901,up:false}];G.cb.energy=3;tapCard(0);G.render()});await capture('raised-card');
 assert.equal(await pg.locator('#playbtn').count(),0);
 for(const count of [1,5,10])for(const index of [...new Set([0,count-1])]){
  await pg.evaluate(({count,index})=>{G.cb.hand=Array.from({length:count},(_,i)=>({id:'splash',uid:9700+i,up:false}));G.cb.sel=null;G.cb.energy=3;G.cb.ens.forEach(e=>{e.hp=e.max=1000;e.block=0});tapCard(index);tapCard(index);G.render()},{count,index});
  await capture(`raised-${count}-${index}`);
  assert.ok(await pg.locator('.hand .card.sel').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));
  assert.equal(await pg.evaluate(()=>G.cb.hand.length),count);
  await dragCardUI(pg,index,1,{touch:true});assert.equal(await pg.evaluate(()=>G.cb.hand.length),count-1);
 }
 // Cancel, invalid drop, single-target forgiveness, self play, powers, and mouse/touch.
 for(const touch of [false,true]){
  await pg.evaluate(()=>{G.cb.hand=[{id:'splash',uid:9600,up:false}];G.cb.energy=10;G.cb.sel=null;G.render()});
  await dragCardUI(pg,0,'empty',{touch});assert.equal(await pg.evaluate(()=>G.cb.hand.length),1);
  await dragCardUI(pg,0,0,{touch:true,cancel:true});assert.equal(await pg.evaluate(()=>G.cb.hand.length),1);
  await pg.evaluate(()=>{G.cb.ens[1].hp=0;G.render()});await dragCardUI(pg,0,'empty',{touch});assert.equal(await pg.evaluate(()=>G.cb.hand.length),0);
  for(const id of ['brace','spring']){
   await pg.evaluate(id=>{G.cb.hand=[{id,uid:9601,up:false}];G.cb.energy=10;G.cb.sel=null;G.render()},id);
   await dragCardUI(pg,0,'empty',{touch});assert.equal(await pg.evaluate(()=>G.cb.hand.length),0);
  }
  await pg.evaluate(()=>{G.cb.ens[1].hp=1000;G.cb.hand=[{id:'splash',uid:9602,up:false}];G.cb.energy=0;G.render()});await dragCardUI(pg,0,0,{touch});assert.equal(await pg.evaluate(()=>G.cb.hand.length),1);
 }
 await pg.evaluate(()=>{G.cb.hand=[{id:'splash',uid:9603,up:false}];G.cb.energy=3;G.render()});
 const a=await cardPoint(pg,0),b=await pg.locator('.en[data-en="0"] .fig').boundingBox();await pg.mouse.move(a.x,a.y);await pg.mouse.down();await pg.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});await pg.waitForTimeout(100);
 assert.equal(await pg.locator('.en.drop-valid').count(),2);assert.equal(await pg.locator('.hero.drop-invalid').count(),1);assert.ok(await pg.locator('.en.drop-over .outcome').count());await capture('drag-target-preview');await pg.mouse.up();assert.equal(await pg.locator('.drop-valid,.drop-invalid,.drop-over').count(),0);
 assert.equal(await pg.evaluate(()=>getComputedStyle(document.querySelector('#env-front')).display),'none');
 assert.ok(await pg.locator('#orb').evaluate(e=>e.getBoundingClientRect().right<100));
 await pg.evaluate(async()=>{G.newRun('carto',{seed:19,skipTravel:true});G.run.relics=[{id:'sextant'}];G.startCombat('fight',['crab','knight']);G.render()});await choiceAudit('sextant');
 await pg.evaluate(async()=>{const {pickSlot}=await import('/src/engine/combat.js');G.cb.slots=['camp','camp','camp'].map((id,i)=>({id,uid:9800+i,up:false,rank:i}));pickSlot('Replace a Waypoint',()=>{});G.render()});await choiceAudit('slots');
 await pg.evaluate(async()=>{const {chart}=await import('/src/engine/combat.js');G.cb.mode=null;chart(3);G.render()});await choiceAudit('chart');
 await pg.evaluate(()=>{G.newRun('tide',{skipTravel:true});W.S={screen:'reward',rows:[{k:'potion',id:'kelpbroth'},{k:'relic',id:'moonshell'}],swap:0};G.run.potions=['kelpbroth','kelpbroth','kelpbroth'];G.render()});await capture('potion-swap');
 const icons=await pg.locator('.tart .slot').evaluateAll(es=>es.every(e=>{const s=getComputedStyle(e);return s.borderRadius==='0px'&&s.borderTopWidth==='0px'&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.boxShadow==='none'}));assert.ok(icons);
 await pg.evaluate(()=>{W.S={screen:'reward',rows:[{k:'relic',id:'moonshell'},{k:'potion',id:'kelpbroth'}]};G.render()});await capture('relic-potion');
 await pg.evaluate(async()=>{const {learnPage}=await import('/src/ui/screens/learn.js');learnPage(0)});await capture('learn');assert.ok(await pg.locator('.tb-dots button').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})));await pg.locator('.tb-dots button').nth(1).tap();assert.equal(await pg.evaluate(()=>W.S.page),1);
 await pg.evaluate(()=>{G.newRun('duel',{skipTravel:true});W.S={screen:'rest'};G.render()});await capture('camp');
 await pg.evaluate(()=>{W.S.ov='settings';G.render()});await capture('settings');assert.ok(await pg.locator('.ov .box').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.scrollHeight<=e.clientHeight+1}));await pg.evaluate(()=>{W.S.ov=null;G.render()});
 const events=await pg.evaluate(()=>G.EVENTS.map(e=>e.id));
 for(const id of events){
  await pg.evaluate(id=>{W.S={screen:'event',ev:G.EVENTS.find(e=>e.id===id),t:0};G.render()},id);
  const options=await pg.locator('.evtiles .tile,.evtiles .tcard').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}}));
  assert.ok(options.every(r=>r.top>=0&&r.bottom<=height&&r.left>=0&&r.right<=width),id+JSON.stringify(options));
  if(id===events[0])await capture('event');
 }
 assert.deepEqual(errors,[]);await ctx.close();
}fs.writeFileSync(`${out}/geometry.json`,JSON.stringify(report,null,2));console.log('Codex 19 UI: PASS (three viewports; choices, info taps, drag-only mouse/touch play, cancellation, forgiveness, highlights and preview)');}
finally{await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exit(1)});
