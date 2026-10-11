// Focused regression checks for Task 5 card hooks.
const {chromium}=require('playwright');
const {start}=require('./util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const p=await b.newPage();await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.evaluate(()=>window.FAST=1);await p.addScriptTag({path:__dirname+'/p1/checks.js'});
const out=await p.evaluate(async()=>{const C=await import('/src/engine/combat.js'),R=await import('/src/core/registry.js');const {fr,hand}=P1;let out={};
const attack=(armed=false)=>{fr('duel',['bell'],[]);hand(['keepersopening','thrust','thrust']);G.cb.energy=10;G.cb.mom=4;G.cb.ens[0].next={a:10};const hp=G.cb.ens[0].hp;G.playCard(0);G.playCard(0,{flourish:armed});const d=hp-G.cb.ens[0].hp,m=G.cb.mom,n=G.cb.stat.flourishes;G.playCard(0,{flourish:false});return {d,m,n,d2:hp-G.cb.ens[0].hp-d,m2:G.cb.mom,n2:G.cb.stat.flourishes}};
out.free=attack();out.armed=attack(true);
fr('duel',['bell'],[]);hand(['keepersopening','thrust']);G.cb.mom=0;G.cb.ens[0].next={b:10};G.playCard(0);G.playCard(0);out.noAttack=G.cb.stat.flourishes===0&&G.cb.mom===1;
fr('duel',['bell'],[]);hand(['thrust','keepersopening','thrust']);G.cb.energy=10;G.cb.ens[0].next={a:10};G.playCard(0);G.playCard(0);G.playCard(0);out.late=G.cb.stat.flourishes===0;
fr('carto',['bell'],[]);G.cb.slots=[];hand(['shorepost']);G.playCard(0);out.fast=G.cb.p.block===3&&G.cb.slots.some(w=>w.id==='shorepost');
fr('carto',['bell'],[]);G.cb.slots=[];for(const id of ['signal','cache','stake'])C.placeWp({id,uid:Math.random(),up:false});hand(['shorepost']);G.playCard(0);G.modeAct('slot',1);out.replacement=G.cb.p.block===9&&G.cb.slots.some(w=>w.id==='shorepost');
fr('carto',['bell'],[]);G.cb.slots=[];hand(['shorepost']);G.cb.hand[0].up=true;G.playCard(0);out.upFast=G.cb.p.block===5;
fr('echo',['bell'],[]);hand(['ping']);G.playCard(0,{mark:true});out.choice=G.cb.mode?.opts.length===2;G.modeAct('choice',1);out.note=G.cb.hand.some(x=>x.id==='note');P1.idle();G.endTurn();out.echoNoMenu=!G.cb.mode;
return out});console.log(JSON.stringify(out,null,2));if(out.free.d!==12||out.free.m!==4||out.free.n!==1||out.free.d2!==6||out.free.n2!==1||out.armed.d!==12||out.armed.m!==4||Object.values(out).some(x=>x===false))process.exitCode=1;await b.close();srv.close();})();
