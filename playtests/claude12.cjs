// Claude Task 12: before/after screenshots (915x412 touch). Usage: node playtests/claude12.cjs before|after
const {chromium}=require('playwright');const fs=require('fs');const {start}=require('../tests/util.js');
const tag=process.argv[2]||'after';const OUT=__dirname+'/screens-claude12/';fs.mkdirSync(OUT,{recursive:true});
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:915,height:412},deviceScaleFactor:2,hasTouch:true,isMobile:true,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.waitForLoadState('networkidle');
 const shot=async n=>{await p.waitForTimeout(500);await p.screenshot({path:OUT+tag+'-'+n+'.png',scale:'css'})};
 await p.evaluate(()=>{localStorage.clear();window.FAST=1;W.S={screen:'title',view:'select',page:0,hero:null};G.render()});await shot('select');
 await p.evaluate(()=>{G.newRun('echo',{seed:42,skipTravel:true});G.startCombat('fight',['crab','knight']);G.render()});await shot('combat');
 await p.evaluate(()=>{G.newRun('duel',{seed:42,skipTravel:true});G.render()});await shot('map');
 await p.evaluate(()=>{const e=document.querySelector('.parch');e&&e.scrollIntoView();window.scrollTo(0,document.body.scrollHeight)});await shot('map-bottom');
 await p.evaluate(()=>{const sc=[...document.querySelectorAll('*')].find(e=>e.scrollHeight>e.clientHeight+200&&getComputedStyle(e).overflowY!=='visible');(sc||document.scrollingElement).scrollTop=0;window.scrollTo(0,0)});await shot('map-top');
 await p.evaluate(()=>{const sc=[...document.querySelectorAll('*')].find(e=>e.scrollHeight>e.clientHeight+200&&getComputedStyle(e).overflowY!=='visible');(sc||document.scrollingElement).scrollTop=520;window.scrollTo(0,520)});await shot('map-mid');
 await p.evaluate(()=>{G.newRun('echo',{seed:42,skipTravel:true});G.startCombat('fight',['crab']);G.render()});await p.waitForTimeout(300);
 await p.hover('#relicbar .relic');await shot('relic-hover');await p.mouse.move(5,300);
 await p.tap('#relicbar .relic');await shot('relic-tap');
 await p.evaluate(()=>{W.S.relicView=null;W.run.potions[0]=Object.keys(G.POTIONS||{})[0]||'';G.render()});await p.tap('#potions .potion');await shot('potion-tap');
 console.log('errors',errs);await b.close();srv.close&&srv.close();process.exit(0)})();
