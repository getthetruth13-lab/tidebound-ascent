// Screenshots of the CURRENT live (src/) game at Samsung S24 Ultra landscape: 915x412 CSS px, DPR 3.5, touch.
// Real clicks are used for the main flow (title -> class -> map node -> play cards); state helpers only to reach rare screens.
const { chromium } = require('/workspace/game/node_modules/playwright');
const {start}=require('/workspace/game/serve.js');const fs=require('fs');
const OUT='/workspace/game/playtests/screens-v1/';
(async()=>{const srv=await start(0);const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:915,height:412},deviceScaleFactor:3.5,isMobile:true,hasTouch:true});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push('pageerror: '+e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
 pg.on('requestfailed',r=>errs.push('reqfail: '+r.url()));pg.on('response',r=>{if(r.status()>=400)errs.push(r.status()+' '+r.url())});
 const shot=async(n,wait=900)=>{await pg.waitForTimeout(wait);await pg.screenshot({path:OUT+n+'.png'});console.log('shot',n)};
 const ev=(f,a)=>pg.evaluate(f,a);
 await pg.goto(srv.url);await pg.waitForTimeout(2500);await shot('01-title',500);
 // real click: pick Tidecaller from the title screen
 const clsBtn=await pg.$('[data-cls=tide]');if(clsBtn){await clsBtn.click();}else{console.log('no data-cls button; using newRun');await ev(()=>G.newRun('tide'))}
 await pg.waitForTimeout(1500);await shot('02-map-start');
 // real click on an available map node -> floor 1 fight
 const nd=await pg.$('.node.av');if(nd){await nd.click();await pg.waitForTimeout(1800)}
 await shot('03-combat-tide-f1',300);
 // tap a card once to inspect it
 const c0=await pg.$('.hand .card');if(c0){await c0.click();await shot('04-combat-tide-card-selected',500)}
 const classes={tide:['knight'],echo:['crab','slug'],carto:['pod','pod','pod'],duel:['wisp','gull']};
 for(const [cls,enc] of Object.entries(classes)){
  await ev(([c,e])=>{window.FAST=0;G.newRun(c);G.startCombat('fight',e)},[cls,enc]);await pg.waitForTimeout(1600);
  // play two cards with real taps so state panels (tide, echo, waypoints, momentum) show something
  for(let k=0;k<2;k++){const cs=await pg.$$('.hand .card');for(const el of cs){const ok=await el.evaluate(x=>!x.classList.contains('unp'));if(ok){const bx=await el.boundingBox();if(bx){await pg.mouse.click(bx.x+bx.width/2,bx.y+bx.height*0.55);await pg.waitForTimeout(250);await pg.mouse.click(bx.x+bx.width/2,bx.y+bx.height*0.55);}break}}await pg.waitForTimeout(900);
   const md=await ev(()=>G.cb&&G.cb.mode&&G.cb.mode.k);if(md){await shot('05-combat-'+cls+'-modal-'+md,300);await ev(()=>{const m=G.cb.mode;if(m.k==='chart')modeAct('done');else modeAct(m.k==='slot'?'slot':'choice',0)})}}
  await shot('05-combat-'+cls,800)}
 await ev(()=>{G.newRun('duel');G.startCombat('elite',['captain'])});await shot('06-elite-captain',1500);
 await ev(()=>{G.newRun('echo');G.startCombat('elite',['eel','eel'])});await shot('06-elite-eels',1500);
 await ev(()=>{G.newRun('carto');G.startCombat('elite',['warden'])});await shot('06-elite-warden',1500);
 await ev(()=>{G.newRun('tide');G.startCombat('boss',['bell'])});await shot('07-boss-bell',1600);
 await ev(()=>{const b=G.cb.ens[0];dmgEnemy(b,85);render()});await shot('07-boss-bell-phase2',1200);
 // reward
 await ev(()=>{G.newRun('echo');G.startCombat('fight',['slug']);G.cb.ens[0].hp=1;win()});await shot('08-card-reward',1200);
 await ev(()=>{G.newRun('duel');G.startCombat('elite',['warden']);win()});await shot('08-card-reward-elite',1200);
 // shop, rest, treasure, events
 await ev(()=>{G.newRun('carto');G.run.gold=300;openShop()});await shot('09-shop',1200);
 await ev(()=>{G.newRun('tide');G.run.hp=30;enterNode('rest')});await shot('10-rest',1200);
 await ev(()=>{G.newRun('tide');G.run.floor=8;enterNode('treasure')});await shot('11-treasure-upgrade-pick',1200);
 const nEv=await ev(()=>G.EVENTS?G.EVENTS.length:0);console.log('events',nEv);
 for(let i=0;i<nEv;i++){await ev(i=>{G.newRun('echo');W.S={screen:'event',ev:G.EVENTS[i]};render()},i);await shot('12-event-'+(i+1),1200)}
 // deck overlay, map mid-run
 await ev(()=>{G.newRun('duel');for(let r=0;r<6;r++){const p=G.run.pos;const opts=p.r<0?G.run.map[0].map((_,i)=>i):G.run.map[p.r][p.i].to;G.run.pos={r,i:opts[0]};G.run.vis[r+':'+opts[0]]=1;G.run.floor=r+1}W.S={screen:'map'};render()});await shot('13-map-midrun',1200);
 await ev(()=>{W.S.ov='deck';render()});await shot('14-deck-overlay',800);
 // game over + victory
 await ev(()=>{G.newRun('carto');G.run.floor=11;G.startCombat('fight',['knight']);G.run.hp=0;lose()});await shot('15-game-over',1500);
 await ev(()=>{G.newRun('duel');G.startCombat('boss',['bell']);G.cb.ens[0].hp=1;win()});await shot('16-victory',1500);
 // portrait check (rotate prompt)
 await pg.setViewportSize({width:412,height:915});await shot('17-portrait-rotate-prompt',800);
 fs.writeFileSync(OUT+'errors.json',JSON.stringify([...new Set(errs)],null,1));console.log('errors',[...new Set(errs)].slice(0,20));
 await b.close();srv.close()})().catch(e=>{console.error(e);process.exit(1)});
