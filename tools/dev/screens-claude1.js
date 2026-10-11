// Claude task 1 screenshots (832x384 @3.75x): title, character select, hero panel, keyword tooltip, Learn to Play.
//   node tools/dev/screens-claude1.js   -> playtests/screens-claude1/*.png
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const {start,DEVICES}=require('../../tests/util.js');
const OUT=path.join(__dirname,'../../playtests/screens-claude1');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.evaluate(()=>{localStorage.clear();G.S&&0});await pg.reload();await pg.waitForFunction(()=>window.G);await pg.waitForLoadState('networkidle');await pg.waitForTimeout(1200);
 const shot=async n=>pg.screenshot({path:`${OUT}/${n}.png`});
 await shot('01-title');
 await pg.click('#newgame');await pg.waitForTimeout(900);await shot('02-character-select');
 await pg.click('.tb-pick[data-cls="echo"]');await pg.waitForTimeout(500);await shot('03-select-panel');
 await pg.click('#heroback');await pg.click('#selback');await pg.waitForTimeout(300);
 await pg.click('#learn');await pg.waitForTimeout(500);await shot('05-learn-basics');await pg.click('#learnnext');await pg.waitForTimeout(300);await pg.click('#learnnext');await pg.waitForTimeout(300);await shot('06-learn-class');
 await pg.evaluate(()=>titleGo('options'));await pg.waitForTimeout(300);await shot('07-options');
 await pg.evaluate(()=>{G.newRun('tide',{seed:42,skipTravel:true});G.run.relics=[];G.run.potions=['salttonic',null,null];G.startCombat('fight',['crab','knight']);modeAct('choice',2);G.cb.hand=[{id:'splash',uid:9001,up:false},{id:'brace',uid:9002,up:false},{id:'riptide',uid:9003,up:false}];G.cb.sel=2;G.render()});await pg.waitForTimeout(800);
 const kw=await pg.evaluate(()=>{const e=[...document.querySelectorAll('.tip .kw')].find(x=>x.getBoundingClientRect().width);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:e.textContent}});
 if(kw){await pg.mouse.click(kw.x,kw.y);await pg.waitForTimeout(400)}await shot('04-keyword-tooltip');
 console.log('kw',JSON.stringify(kw),'errors',JSON.stringify(errs));await b.close();srv.close()})();
