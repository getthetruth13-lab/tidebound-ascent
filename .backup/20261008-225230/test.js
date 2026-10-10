// Full-run playthrough bot: 4 classes x 3 runs through the real UI (tap card -> tap enemy / tap again,
// Mark / Flourish / Advance / potions, reward rows, merchant shelves, camps, chests, events),
// on the S24 Ultra landscape viewport, served over HTTP. Exit 1 on page errors or a stuck run.
const { chromium } = require('playwright');
require('playwright').chromium; // default action timeout below
const {start,DEVICES,tapCardUI}=require('./tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const results={};let problems=0;
 const ONLY=process.env.ONLY;for(const cls of ['tide','echo','carto','duel']){if(ONLY&&ONLY!==cls)continue;
  for(let runN=0;runN<(+process.env.RUNS||3);runN++){
  const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});ctx.setDefaultTimeout(4000);const pg=await ctx.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
  await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);
  await pg.evaluate(()=>window.FAST=1);
  await pg.click(`[data-cls=${cls}]`);
  let fights=0,turns=0,steps=0,last='';const log=[];pg.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url())});
  while(steps++<4000){try{
   const st=await pg.evaluate(()=>({s:G.S.screen,busy:G.cb&&G.cb.busy,mode:G.cb&&G.cb.mode&&G.cb.mode.k}));
   if(st.s==='end')break;
   if(st.s==='map'){const n=(await pg.$$('.node.av')).length;await pg.locator('.node.av').nth(Math.floor(Math.random()*n)).click();continue}
   if(st.s==='travel'){await pg.click('.page.travel');continue}
   if(st.s==='combat'){
    if(st.busy){await pg.waitForTimeout(5);continue}
    if(st.mode==='choice'||st.mode==='slot'){await pg.click('.ov .opt');continue}
    if(st.mode==='chart'){await pg.click('#chartdone');continue}
    // class actions + potions, sometimes
    if(Math.random()<.25){const XS='#markbtn:not([disabled]),#flourishbtn:not([disabled]),.wp.adv,#tideup';if(await pg.$(XS)){last='extra';await pg.locator(XS).first().click();continue}}
    if(Math.random()<.08){if(await pg.$('.potion:not(.empty)')){last='potion';await pg.locator('.potion:not(.empty)').first().click();last='drink';if(await pg.$('#drinkbtn:not([disabled])'))await pg.click('#drinkbtn');else await pg.evaluate(()=>closePop());continue}}
    const pickI=await pg.evaluate(()=>{const h=G.cb.hand;let best=-1,bs=-1;const els=document.querySelectorAll('.hand .card');h.forEach((c,i)=>{const d=G.CARDS[c.id];if(!els[i]||els[i].classList.contains('unp'))return;const sc=(d.t==='P'?5:d.t==='W'?4:d.t==='A'?3:2)+Math.random();if(sc>bs){bs=sc;best=i}});return best});
    if(pickI>=0){last='card '+pickI;const n0=await pg.evaluate(()=>G.cb.hand.length);await tapCardUI(pg,pickI);
     const nt=await pg.evaluate(()=>G.cb&&G.cb.sel!=null&&G.needsTarget(G.cb.hand[G.cb.sel]));
     if(nt){last='target';const en=await pg.evaluate(()=>{const a=[...document.querySelectorAll('.en')];return a[Math.floor(Math.random()*a.length)].dataset.en});await pg.click(`.en[data-en="${en}"] .slot`)}
     else if(await pg.evaluate(()=>G.cb&&G.cb.sel!=null)){if(Math.random()<.5)await pg.click('.hand .card.sel');else await pg.click('#playbtn')}
    }
    else{last='end';await pg.click('#endbtn');turns++;}
    const s2=await pg.evaluate(()=>G.S.screen);if(s2!=='combat'&&s2!=='end')fights++;
    continue}
   if(st.s==='reward'||st.s==='chest'){
    if(await pg.$('#openchest')){await pg.click('#openchest');continue}
    if(await pg.$('.rewgrid')){if(Math.random()<.8)await pg.click('.rewgrid .card');else await pg.click('#skipcard');continue}
    if(await pg.$('.swaps')){await pg.click('.swaps .opt');continue}
    if(await pg.$('.rrow:not(.done)')&&Math.random()<.9){await pg.locator('.rrow:not(.done)').first().click();continue}
    await pg.click('#proceed');continue}
   if(st.s==='rest'){const n=(await pg.$$('.btn.camp')).length;await pg.locator('.btn.camp').nth(Math.random()<.6?0:Math.floor(Math.random()*n)).click();continue}
   if(st.s==='potpick'){if(await pg.$('.swaps .opt'))await pg.locator('.swaps .opt').first().click();await pg.click('#potpickdone');continue}
   if(st.s==='event'){await pg.click('.opt:not([disabled])');continue}
   if(st.s==='shop'){for(let k=0;k<3;k++){const SI='.shopitem .card:not(.unp),.shopicon:not(.sold):not([disabled])';const n=(await pg.$$(SI)).length;if(!n||Math.random()<.4)break;await pg.locator(SI).nth(Math.floor(Math.random()*n)).click();if(await pg.evaluate(()=>G.S.screen!=='shop'))break}
    if(await pg.evaluate(()=>G.S.screen==='shop'))await pg.click('#leaveshop');continue}
   if(st.s==='pick'){if(await pg.$('.grid .card'))await pg.locator('.grid .card').first().click();else await pg.click('#pickskip,#pickcancel');continue}
   if(st.s==='msg'){await pg.click('#msgok');continue}
   log.push('stuck '+st.s);break
   }catch(e){log.push('error on '+(await pg.evaluate(()=>G.S.screen+' '+(G.cb&&G.cb.mode&&G.cb.mode.k)).catch(()=>'?'))+' after '+last+': '+e.message.split('\n').slice(0,9).join(' | '));break}}
  const fin=await pg.evaluate(()=>({screen:G.S.screen,won:G.run.won,floor:G.run.floor,deck:G.run.deck.length,kills:G.run.kills}));
  if(fin.screen!=='end'||errs.length||log.length)problems++;
  (results[cls]=results[cls]||[]).push({...fin,fights,turns,errs:errs.slice(0,5),log});
  await ctx.close();}
 }
 console.log(JSON.stringify(results));
 const all=Object.values(results).flat();
 console.log(`\ntest.js: ${all.length-problems}/${all.length} runs completed cleanly (reached the end screen, no page errors, never stuck). Wins: ${all.filter(r=>r.won).length}/${all.length}. Avg floor reached: ${(all.reduce((a,r)=>a+r.floor,0)/all.length).toFixed(1)}`);
 await b.close();srv.close();process.exit(problems?1:0)})();
