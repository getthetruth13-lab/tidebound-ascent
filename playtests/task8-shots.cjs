// Screenshot tour of every Task 8 screen (S24 landscape). Run: node playtests/task8-shots.cjs [only-substring]
const {chromium}=require('playwright');const {start,DEVICES}=require('../tests/util.js');
const OUT=__dirname+'/screens-claude8';require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.waitForLoadState('networkidle');await p.evaluate(()=>{window.FAST=1;localStorage.clear()});
const only=process.argv[2]||'';const shot=async n=>{if(only&&!n.includes(only))return;await p.waitForTimeout(350);await p.screenshot({path:`${OUT}/${n}.png`})};
const run=(cls,seed=5)=>p.evaluate(([c,s])=>{localStorage.clear();G.newRun(c,{seed:s,skipTravel:true,fullPool:true});G.run.floor=3},[cls,seed]);
await run('carto');
await p.evaluate(()=>{G.run$.combatRewards('elite',{});W.S.rows.splice(1,0,{k:'cards',cards:['bearing','tent','landslide'].filter(i=>G.CARDS[i])});G.render()});await shot('reward-tiles');
await p.evaluate(()=>{const S=W.S;S.cardsOpen=S.rows.findIndex(r=>r.k==='cards');G.render()});await shot('reward-cards');
await p.evaluate(()=>{G.run$.openChest();G.render()});await shot('chest-closed');await p.evaluate(()=>{openChestLid()});await shot('chest-open');
await p.evaluate(()=>{W.S={screen:'rest'};G.render()});await shot('camp');
await p.evaluate(()=>{G.giveRelic('pumice');G.run.relics.length;W.S={screen:'rest'};G.render()});await shot('camp-4');
for(const id of ['tidalwheel','cartomancer','sailor','tidepool']){await p.evaluate(id=>{W.S={screen:'event',ev:G.EVENTS.find(e=>e.id===id),t:Date.now()};G.render()},id);await shot('event-'+id)}
await p.evaluate(()=>{G.run$.pickPotions(3,'Pick potions');});await shot('potpick');
await p.evaluate(()=>{W.S={screen:'pick',mode:'upgrade',title:'Temper',then:G.run$.goMap,cancel:null};G.render()});await shot('pick-upgrade');
// combat choices
await p.evaluate(()=>{G.run.relics=[];G.giveRelic('sextant');G.startCombat('fight',['crab'])});await p.waitForTimeout(500);await shot('choice-sextant');
await p.evaluate(()=>{modeAct('choice',0)});await p.waitForTimeout(600);
await p.evaluate(()=>{G.combat$.chart(3);G.render()});await shot('chart-3');
await p.evaluate(()=>{W.cb.mode=null;G.combat$.chart(6);G.render()});await shot('chart-6');
await p.evaluate(()=>{W.cb.mode=null;G.combat$.pickSlot('Slots full: replace which Waypoint?',()=>{});G.render()});await shot('slot-pick');
await run('tide');await p.evaluate(()=>{G.run.relics=[];G.giveRelic('moonshell');G.startCombat('fight',['crab'])});await p.waitForTimeout(500);await shot('choice-moonshell');
await p.evaluate(()=>{G.run.potions=['moondraught',null,null];W.cb.mode=null;G.render();G.usePotion&&0});
console.log('errors',JSON.stringify(errs));await b.close();process.exit(0)})()
