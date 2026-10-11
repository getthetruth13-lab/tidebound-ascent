// Screenshot tour of the Lamplight screens. Run: node playtests/task8-lamp.cjs
const {chromium}=require('playwright');const {start,DEVICES}=require('../tests/util.js');
const OUT=__dirname+'/screens-claude8';
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.waitForLoadState('networkidle');await p.evaluate(()=>{window.FAST=1;localStorage.clear()});
const shot=async n=>{await p.waitForTimeout(500);await p.screenshot({path:`${OUT}/${n}.png`})};
await p.evaluate(()=>{localStorage.clear();G.progress.resetProfile();const q=G.progress.loadProfile();q.climb=650;q.xp.tide=200;q.xp.carto=700;q.xp.duel=3000;q.unlocked.cards=['seesaw'];G.progress.saveProfile(q);W.run=null;window.titleGo('main')});await shot('lamp-title');
await p.evaluate(()=>openLedger('tide'));await shot('lamp-ledger-tide');
await p.evaluate(()=>{document.querySelector('#ledgergrid').scrollTop=600});await shot('lamp-ledger-tide-scrolled');
await p.evaluate(()=>openLedger('carto'));await shot('lamp-ledger-carto');
await p.evaluate(()=>openLedger('climb'));await shot('lamp-ledger-climb');
await p.evaluate(()=>{document.querySelector('#ledgergrid').scrollTop=300});await shot('lamp-ledger-climb-scrolled');
await p.evaluate(()=>{W.S={screen:'title',view:'ledger',tab:'tide'};G.render()});await p.click('#ledgerclaim');await shot('lamp-pick-card');
await p.evaluate(()=>{document.querySelector('.lp-offer .card').click()});await shot('lamp-pick-got');
await p.evaluate(()=>openLedger('climb'));await p.click('#ledgerclaim');await shot('lamp-pick-relic');
await p.evaluate(()=>{localStorage.clear();G.progress.resetProfile();window.FAST=1;G.newRun('tide',{seed:55,skipTravel:true});G.run.lamp.fights=7;G.run.lamp.elites=2;G.run.floor=11;G.run.lamp.tasks[0].done=true;G.run$.endRun(false)});await p.waitForTimeout(2600);await shot('lamp-end');
await p.evaluate(()=>{G.newRun('echo',{seed:56,skipTravel:true});W.S={screen:'map'};W.S.ov='tasks';G.render()});await shot('lamp-tasks');
await p.evaluate(()=>{W.S={screen:'map'};G.startCombat('fight',['crab']);G.cb.stat.echoesTurn=2;W.S.ov='tasks';G.render()});await shot('lamp-tasks-progress');
console.log('errors',JSON.stringify(errs));await b.close();process.exit(0)})()
