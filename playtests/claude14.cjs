// Claude Task 14: card screenshots. Usage: node playtests/claude14.cjs before|after
const {chromium}=require('playwright');const fs=require('fs');const {start}=require('../tests/util.js');
const tag=process.argv[2]||'after';const OUT=__dirname+'/screens-claude14/';fs.mkdirSync(OUT,{recursive:true});
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:832,height:384},deviceScaleFactor:2,hasTouch:true,isMobile:true,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.waitForLoadState('networkidle');
 const shot=async(n,w=700)=>{await p.waitForTimeout(w);await p.screenshot({path:OUT+tag+'-'+n+'.png',scale:'css'})};
 await p.evaluate(()=>{localStorage.clear();window.FAST=1});
 await p.evaluate(()=>{G.newRun('echo',{seed:42,skipTravel:true});G.startCombat('fight',['crab','knight']);G.render()});await shot('hand');
 await p.evaluate(()=>{document.querySelectorAll('.hand .card')[2].click()});await shot('hand-selected');
 await p.evaluate(()=>{G.newRun('duel',{seed:7,skipTravel:true});G.render();W.S.ov='deck';G.render()});await shot('deck');
 // gallery of edge cases
 await p.evaluate(()=>{const C=G.CARDS||window.CARDS;const ids=Object.keys(C);const pick=f=>ids.filter(i=>f(C[i]));
  const rares=pick(d=>d.r==='r').slice(0,3),unc=pick(d=>d.r==='u').slice(0,2),curse=pick(d=>d.curse).slice(0,2),xc=pick(d=>d.c==='X').slice(0,2),z=pick(d=>d.c===0&&!d.unplay).slice(0,2),un=pick(d=>d.unplay&&!d.curse).slice(0,1);
  const long=ids.filter(i=>!C[i].curse).sort((a,b)=>(C[b].n.length+String(C[b].d||'').length)-(C[a].n.length+String(C[a].d||'').length)).slice(0,2);
  window.__gal=[...rares,...unc,...curse,...xc,...z,...un,...long].slice(0,12)});
 await p.evaluate(()=>{G.newRun('tide',{seed:3,skipTravel:true});W.S={screen:'reward',title:'Gallery',kind:'fight',rows:[{k:'cards',cards:window.__gal.slice(0,4)}],cardsOpen:0};G.render()});await shot('reward');
 for(let k=0;k<3;k++){await p.evaluate(k=>{W.S.rows[0].cards=window.__gal.slice(k*4,k*4+4);W.S.cardsOpen=0;G.render()},k);await shot('gallery'+k,1500)}
 await p.evaluate(()=>{G.render();const c=document.querySelector('.card');c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))});
 console.log('errors',errs);await b.close();srv.close&&srv.close();process.exit(0)})();
