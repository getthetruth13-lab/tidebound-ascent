// dev: UI-click bot (same policy as playtests/v21/ui21.js) on Tide vs Kelp Matriarch; reports turns/steps and any loop.
const path=require('path');const {chromium}=require('playwright');const {start,DEVICES,tapCardUI}=require('../../tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const out=[];
for(const seed of [3,8]){const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const pg=await ctx.newPage();
await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.addScriptTag({path:path.join(__dirname,'../../tests/p1/checks.js')});
await pg.evaluate(s=>{window.FAST=1;G.newRun('tide',{seed:s,skipTravel:true});G.run.floor=15;G.run.hp=200;G.run.max=200;G.startCombat('boss',['matriarch']);G.render()},seed);
let steps=0,rep=0,lastSig='';const trail=[];
while(steps++<600){const st=await pg.evaluate(()=>({s:G.S.screen,busy:G.cb&&G.cb.busy,mode:G.cb&&G.cb.mode&&G.cb.mode.k,turn:G.cb&&G.cb.turn,sel:G.cb&&G.cb.sel,hand:G.cb&&G.cb.hand.map(c=>c.id).join(','),e:G.cb&&G.cb.energy,ens:G.cb&&G.cb.ens.map(e=>e.hp).join('/')}));
 if(st.s!=='combat')break;if(st.busy){await pg.waitForTimeout(20);continue}
 const sig=JSON.stringify(st);if(sig===lastSig)rep++;else rep=0;lastSig=sig;if(rep>25){trail.push('LOOP '+sig);break}
 if(st.mode){if(st.mode==='chart')await pg.click('#chartdone');else await pg.locator('.ov .opt').first().click();continue}
 const pick=await pg.evaluate(()=>{const cb=G.cb;const els=document.querySelectorAll('.hand .card');let best=-1,bs=-1;cb.hand.forEach((c,i)=>{const d=G.CARDS[c.id];if(!els[i]||els[i].classList.contains('unp'))return;let s=d.t==='P'?6:d.t==='A'?4:3;s+=Math.random();if(s>bs){bs=s;best=i}});
  const al=cb.ens.map((e,i)=>[e,i]).filter(([e])=>e.hp>0&&!e.fled).sort((a,b)=>a[0].hp-b[0].hp);return {best,t:al.length?al[0][1]:0}});
 if(pick.best>=0){await tapCardUI(pg,pick.best);await pg.waitForTimeout(60);const nt=await pg.evaluate(()=>G.cb&&G.cb.sel!=null&&G.needsTarget(G.cb.hand[G.cb.sel]));
  if(nt)await pg.click(`.en[data-en="${pick.t}"]`,{force:true});else if(await pg.evaluate(()=>G.cb&&G.cb.sel!=null))await pg.click('#playbtn').catch(e=>trail.push('noplaybtn '+st.hand.split(',')[pick.best]));await pg.waitForTimeout(40)}
 else{await pg.click('#endbtn');await pg.waitForTimeout(80)}}
out.push({seed,steps,trail,final:await pg.evaluate(()=>({s:G.S.screen,turn:G.cb&&G.cb.turn,ens:G.cb&&G.cb.ens.map(e=>e.key+':'+e.hp).join(' ')}))});await ctx.close()}
console.log(JSON.stringify(out,null,1));await b.close();srv.close()})();
