// Extra Task 8 screenshots: mid-drag Chart, long-press enlarge, card-mention preview, Moon Draught tiles, tile tooltip.
const {chromium}=require('playwright');const {start,DEVICES}=require('../tests/util.js');const OUT=__dirname+'/screens-claude8';
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const p=await ctx.newPage();const cdp=await ctx.newCDPSession(p);
const T=(t,x,y)=>cdp.send('Input.dispatchTouchEvent',{type:t,touchPoints:t==='touchEnd'?[]:[{x,y,id:1}]});
await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.waitForLoadState('networkidle');
const shot=async n=>{await p.waitForTimeout(350);await p.screenshot({path:`${OUT}/${n}.png`})};
const c=sel=>p.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}},sel);
await p.evaluate(()=>{window.FAST=1;localStorage.clear();G.newRun('carto',{seed:5,skipTravel:true,fullPool:true});G.run.relics=[];G.startCombat('fight',['crab']);const mk=G.cards$.mk,id=n=>Object.values(G.CARDS).find(c=>c.n===n).id;G.cb.mode=null;G.cb.draw=['Bearing Shot','Survey','Signal Fire','Field Tent','Bearing Shot'].map(n=>mk(id(n)));G.combat$.chart(4);G.render()});await p.waitForTimeout(500);
let a=await c('#chartcards .cslot[data-i="0"] .card'),d=await c('#chartcards .cslot[data-i="2"] .card');
await T('touchStart',a.x,a.y);for(let i=1;i<=8;i++){await T('touchMove',a.x+(d.x-a.x)*i/12,a.y+(d.y-a.y)*i/12-6);await p.waitForTimeout(20)}await shot('chart-dragging');
const z=await c('#chartbottom');await T('touchMove',z.x,z.y);await shot('chart-over-bottom');await T('touchEnd');
a=await c('#chartcards .cslot[data-i="1"] .card');await T('touchStart',a.x,a.y);await p.waitForTimeout(700);await shot('longpress-enlarge');await T('touchEnd');
await p.evaluate(()=>{G.cb.mode=null;G.combat$.choose('🌙 Moon Draught: set the Tide',[0,2,4,5,6,8,10].map(v=>({l:'🌙 Tide '+v,tile:'choice-tide-set',sum:v===10?'Crest':v===0?'Undertow':'',f:()=>{}})));G.render()});await shot('choice-moondraught');
await p.evaluate(()=>{G.cb.mode=null;W.S={screen:'msg',title:'Wandering Cartomancer',text:'She slides a Bearing Shot and a Signal Fire across the sand. Neither is quite what it was.',next:G.run$.goMap};G.render()});
const r=await c('.msgp .cref');await T('touchStart',r.x,r.y);await p.waitForTimeout(50);await T('touchEnd');await shot('cardref-preview');
await p.evaluate(()=>{W.S={screen:'rest'};G.render()});const ic=await c('.camptiles .tile:nth-child(2) .tipi');await T('touchStart',ic.x,ic.y);await p.waitForTimeout(50);await T('touchEnd');await shot('tile-tooltip');
await b.close();process.exit(0)})()
