// Full-run playthrough bot: 4 classes x 3 runs through the real UI (tap card -> tap enemy / tap again,
// Mark / Flourish / Advance / potions, reward rows, merchant shelves, camps, chests, events),
// on the S24 Ultra landscape viewport, served over HTTP. Exit 1 on page errors or a stuck run.
const { chromium } = require('playwright');
require('playwright').chromium; // default action timeout below
const {start,DEVICES,cardPoint,dragCardUI}=require('./tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const results={};let problems=0;
 const ONLY=process.env.ONLY;for(const cls of ['tide','echo','carto','duel']){if(ONLY&&ONLY!==cls)continue;
  for(let runN=0;runN<(+process.env.RUNS||3);runN++){
  const ctx=await b.newContext({...DEVICES.s24Landscape,viewport:{width:915,height:412},serviceWorkers:'block'});ctx.setDefaultTimeout(15000);const pg=await ctx.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
  await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);
  // Menu music now autoplays: audio streaming is independent of UI readiness.
  await pg.evaluate(()=>document.fonts.ready);
  await pg.waitForFunction(()=>[...document.querySelectorAll('#app img')].every(i=>i.complete));
  // Tap moving enemy art at its current position; continuous float animation cannot satisfy locator stability.
  const locatorTap=pg.tap.bind(pg);pg.tap=async selector=>{if(!selector.startsWith('.en['))return locatorTap(selector);const el=pg.locator(selector).first();await el.waitFor({state:'visible'});const r=await el.boundingBox();await pg.touchscreen.tap(r.x+r.width/2,r.y+r.height/2)};
  await pg.evaluate(()=>window.FAST=1);
  // The title now opens on a studio/start sequence; enter the menu through the real touch flow.
  await pg.locator('#startscr,#newgame').first().waitFor({state:'visible'});
  if(await pg.locator('#startscr').count())await pg.locator('#startscr').tap();
  await pg.locator('#newgame').tap();
  await pg.locator('#introskip').tap();
  await pg.locator(`.st-pick[data-cls=${cls}]`).tap();
  await pg.locator('#beginfocus').tap();
  await pg.waitForFunction(()=>G.run&&G.S.screen!=='select');
  let fights=0,turns=0,steps=0,last='';const log=[];pg.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url())});
  while(steps++<4000){try{
   const st=await pg.evaluate(()=>({s:G.S.screen,busy:G.cb&&G.cb.busy,mode:G.cb&&G.cb.mode&&G.cb.mode.k}));
   if(st.s==='end')break;
   if(await pg.$('#inspect')){await pg.locator('#inspect').tap();continue}
   if(await pg.$('#ovl')){await pg.evaluate(()=>{W.S.ov=null;G.render()});continue}
   if(st.s==='map'){const n=(await pg.$$('.node.av')).length;await pg.locator('.node.av').nth(Math.floor(Math.random()*n)).tap();continue}
   if(st.s==='travel'){await pg.tap('.page.travel');continue}
   if(st.s==='combat'){
    if(st.busy){await pg.waitForTimeout(5);continue}
    if(st.mode==='choice'||st.mode==='slot'){const option=pg.locator('.ov .opt').first();const card=option.locator('.card');await (await card.count()?card:option).tap();continue}
    if(st.mode==='chart'){await pg.tap('#chartdone');continue}
    // class actions + potions, sometimes
    if(Math.random()<.25){const XS='#markbtn:not([disabled]),#flourishbtn:not([disabled]),.wp.adv,#tideup';if(await pg.$(XS)){last='extra';await pg.locator(XS).first().tap();continue}}
    if(Math.random()<.08){if(await pg.$('.potion:not(.empty)')){last='potion';await pg.locator('.potion:not(.empty)').first().tap();last='drink';if(await pg.$('#drinkbtn:not([disabled])'))await pg.tap('#drinkbtn');else await pg.evaluate(()=>closePop());continue}}
    const pickI=await pg.evaluate(()=>{const h=G.cb.hand;let best=-1,bs=-1;const els=document.querySelectorAll('.hand .card');h.forEach((c,i)=>{const d=G.CARDS[c.id];if(!els[i]||els[i].classList.contains('unp'))return;const sc=(d.t==='P'?5:d.t==='W'?4:d.t==='A'?3:2)+Math.random();if(sc>bs){bs=sc;best=i}});return best});
    if(pickI>=0){last='drag '+pickI;const target=await pg.evaluate(i=>{if(!G.needsTarget(G.cb.hand[i]))return null;const ens=G.cb.ens.map((e,i)=>({e,i})).filter(x=>x.e.hp>0&&!x.e.fled);return ens[Math.floor(Math.random()*ens.length)].i},pickI);await dragCardUI(pg,pickI,target,{touch:true});}
    else{last='end';await pg.tap('#endbtn');turns++;}
    const s2=await pg.evaluate(()=>G.S.screen);if(s2!=='combat'&&s2!=='end')fights++;
    continue}
   if(st.s==='reward'||st.s==='chest'){
    if(await pg.$('#openchest')){await pg.tap('#openchest');continue}
    if(await pg.$('#skipyes')){await pg.tap('#skipyes');continue}
    if(await pg.$('.rewgrid')){if(Math.random()<.8){await pg.tap('.rewgrid .card');await pg.tap('#confirmcard')}else await pg.tap('#skipcard');continue}
    if(await pg.$('.swaptiles')){await pg.tap('.swaptiles .tile');continue}
    if(await pg.$('.rewtiles .tile:not(.done)')&&Math.random()<.9){await pg.locator('.rewtiles .tile:not(.done)').first().tap();continue}
    await pg.tap('#proceed');continue}
   if(st.s==='rest'){const n=(await pg.$$('.camptiles .tile')).length;await pg.locator('.camptiles .tile').nth(Math.random()<.6?0:Math.floor(Math.random()*n)).tap();continue}
   if(st.s==='potpick'){if(await pg.$('.pottiles .tile'))await pg.locator('.pottiles .tile').first().tap();await pg.tap('#potpickdone');continue}
   if(st.s==='event'){const opts=pg.locator('.evopts .evo:not([aria-disabled="true"]):not(.off),.evo:not(.off)');await opts.nth(Math.floor(Math.random()*await opts.count())).tap();continue}
   if(st.s==='shop'){for(let k=0;k<3;k++){const SI='.shopitem .card:not(.unp),.shopicon:not(.sold):not([disabled])';const n=(await pg.$$(SI)).length;if(!n||Math.random()<.4)break;await pg.locator(SI).nth(Math.floor(Math.random()*n)).tap();if(await pg.evaluate(()=>G.S.screen!=='shop'))break}
    if(await pg.evaluate(()=>G.S.screen==='shop'))await pg.tap('#leaveshop');continue}
   if(st.s==='pick'){if(await pg.$('.grid .card'))await pg.locator('.grid .card').first().tap();else await pg.tap('#pickskip,#pickcancel');continue}
   if(st.s==='msg'){await pg.tap('#msgok');continue}
   log.push('stuck '+st.s);break
   }catch(e){log.push('error on '+(await pg.evaluate(()=>G.S.screen+' '+(G.cb&&G.cb.mode&&G.cb.mode.k)).catch(()=>'?'))+' after '+last+': '+e.message.split('\n').slice(0,9).join(' | '));break}}
  const fin=await pg.evaluate(()=>({screen:G.S.screen,won:G.run.won,floor:G.run.floor,deck:G.run.deck.length,kills:G.run.kills}));
  if(fin.screen!=='end'||errs.length||log.length)problems++;
  console.log(cls+' run '+runN+': '+fin.screen+', floor '+fin.floor+', errors '+errs.length+', problems '+log.length);
  (results[cls]=results[cls]||[]).push({...fin,fights,turns,errs:errs.slice(0,5),log});
  await ctx.close();}
 }
 console.log(JSON.stringify(results));
 const all=Object.values(results).flat();
 console.log(`\ntest.js: ${all.length-problems}/${all.length} runs completed cleanly (reached the end screen, no page errors, never stuck). Wins: ${all.filter(r=>r.won).length}/${all.length}. Avg floor reached: ${(all.reduce((a,r)=>a+r.floor,0)/all.length).toFixed(1)}`);
 await b.close();srv.close();process.exit(problems?1:0)})();
