// Task 40: event scene screenshots + overflow check at S24 (832x384 css, 2340x1080 px) and 1480x924. Usage: node tests/task40-shots.cjs [outdir]
const {chromium}=require('playwright');const fs=require('fs');const {start}=require('./util.js');
const OUT=process.argv[2]||'/tmp/ev-shots';fs.mkdirSync(OUT,{recursive:true});
const SIZES={s24:{viewport:{width:832,height:384},deviceScaleFactor:2.8125,isMobile:true,hasTouch:true},w1480:{viewport:{width:1480,height:924},deviceScaleFactor:1},w2340:{viewport:{width:2340,height:1080},deviceScaleFactor:1}};
(async()=>{const srv=await start(0);const b=await chromium.launch();let bad=0;
 for(const [k,dev] of Object.entries(SIZES)){const ctx=await b.newContext({...dev,serviceWorkers:'block'});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.waitForLoadState('networkidle');
  const ids=await pg.evaluate(()=>G.EVENTS.map(e=>e.id));
  for(const id of ids){await pg.evaluate(id=>{localStorage.clear();G.newRun('duel',{seed:7,skipTravel:true});G.run.gold=200;const e=G.EVENTS.find(e=>e.id===id);W.S={screen:'event',ev:e,t:0};G.render()},id);await pg.waitForTimeout(250);
   const m=await pg.evaluate(()=>{const t=document.querySelector('.evtext'),r=t.getBoundingClientRect(),tb=document.querySelector('.topbar').getBoundingClientRect();return {over:t.scrollHeight>t.clientHeight+1,top:r.top,tbBottom:tb.bottom,right:r.right,left:r.left,vw:innerWidth,vh:innerHeight,bottom:r.bottom,h:t.scrollHeight}});
   const ok=!m.over&&m.top>=m.tbBottom-1&&m.right<=m.vw+1&&m.left>=-1&&m.bottom<=m.vh+1;if(!ok){bad++;console.log('FAIL',k,id,JSON.stringify(m))}
   if(k!=='s24'||true)await pg.screenshot({path:`${OUT}/${k}-${id}.png`})}
  // outcome reveal
  await pg.evaluate(()=>{G.newRun('duel',{seed:7,skipTravel:true});W.S={screen:'event',ev:G.EVENTS.find(e=>e.id==='sailor'),t:0};G.render();evOpt(1)});await pg.waitForTimeout(1800);await pg.screenshot({path:`${OUT}/${k}-reveal.png`});
  if(errs.length){bad++;console.log('ERR',k,errs)}await ctx.close()}
 await b.close();srv.close&&srv.close();console.log(bad?'FAILED '+bad:'event scenes ok');process.exit(bad?1:0)})();
