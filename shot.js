// Screenshots (served over HTTP) + layout checks. Exit 1 on page errors or layout problems.
//  screenshots/s24-landscape-title.png         title + settings (Effects: Full / Reduced / Off)
//  screenshots/s24-landscape-travel.png        Act I title card / travel screen (shows the boss chosen for this run)
//  screenshots/s24-a1-shore-battle.png       official a1_shore background in a battle (3120x1440)
//  screenshots/s24-landscape-combat.png        S24 Ultra 832x384 @3.75x: Tidecaller with 5 relics + 3 potions
//  screenshots/s24-landscape-potion.png        potion popup (Drink / Discard)
//  screenshots/s24-landscape-map.png           Act map, floor 1 (scrolled to the available nodes)
//  screenshots/s24-landscape-map-boss.png      top of the map: legend + the boss chosen for this run
//  screenshots/s24-landscape-merchant.png      merchant: 5 class + 2 colourless cards (1 on sale), 3 relics, 3 potions, Scrub
//  screenshots/s24-landscape-event.png         an Act 1 event
//  screenshots/s24-landscape-shrine.png        a shrine
//  screenshots/s24-landscape-matriarch.png     Kelp Matriarch boss fight in the a1_lair_kelp lair, Duelist, attack lifted with the target ring shown
//  screenshots/s24-landscape-boss.png          The Knell (boss lair fallback backdrop), Duelist
//  screenshots/s24-landscape-reward.png        reward rows (gold / potion / cards)
//  screenshots/s24-landscape-card-reward.png   card reward (3 cards + Skip on one screen)
//  screenshots/s24-landscape-inspect.png       long-press card inspector
//  screenshots/s24-landscape-camp.png, -chest.png, -echo.png, -carto.png
//  screenshots/s24-portrait-rotate.png         S24 Ultra 384x832 @3.75x (rotate prompt)
//  screenshots/desktop-1280x800-combat.png
const { chromium } = require('playwright');const fs=require('fs');const {start,DEVICES,tapCardUI}=require('./tests/util.js');
const OUT=process.env.SHOT_OUT||__dirname+'/screenshots';fs.mkdirSync(OUT,{recursive:true});
(async()=>{const srv=await start(0);const b=await chromium.launch();const bad=[];const files=[];
 const open=async dev=>{const ctx=await b.newContext({...DEVICES[dev],serviceWorkers:'block'});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.waitForLoadState('networkidle');await pg.evaluate(()=>{window.run$=G.run$});return {ctx,pg,errs}};
 const combat=async(pg)=>{await pg.evaluate(()=>{localStorage.clear();window.FAST=0;G.newRun('tide',{seed:42,skipTravel:true});['barnaclecharm','whaletooth','coral','foghorn'].forEach(id=>G.giveRelic(id));
   G.run.potions=['salttonic','moondraught','sparkphial'];W.toasts=[];G.startCombat('fight',['crab','knight','slug']);modeAct('choice',2);const c=G.cb;
   Object.assign(c.p.st,{str:2,dex:1,shell:1,mending:2});Object.assign(c.ens[0].st,{vuln:2,bleed:3});Object.assign(c.ens[1].st,{weak:1,brittle:2,barbs:2});c.hand=[{id:'splash',uid:9001,up:false},{id:'lash',uid:9002,up:false},{id:'brace',uid:9003,up:true},{id:'whirl',uid:9004,up:false},{id:'moonpull',uid:9005,up:false}];G.render()});
  await pg.waitForTimeout(1300);await tapCardUI(pg,0);await pg.click('.en[data-en="1"] .intent');await pg.waitForTimeout(150);await tapCardUI(pg,1);await pg.waitForTimeout(300)};
 const layout=pg=>pg.evaluate(()=>{const W=innerWidth,H=innerHeight,out=[];const r=s=>{const e=document.querySelector(s);return e&&e.getBoundingClientRect()};
  if(document.documentElement.scrollWidth>W+1)out.push('horizontal overflow');
  for(const s of ['#endbtn','#orb','#drawpile','#discpile','#mapbtn','#deckbtn','.hero','.en','#relicbar','.potion']){const q=r(s);if(!q)out.push('missing '+s);else if(q.left<-1||q.top<-1||q.right>W+1||q.bottom>H+1)out.push(s+' off-screen')}
  document.querySelectorAll('.hand .card:not(.sel)').forEach((c,i)=>{const q=c.getBoundingClientRect();if(q.left<-6||q.right>W+6||q.top+q.height*.3>H)out.push('card '+i+' off-screen');/* AD spec: resting cards may run off the bottom edge; cost+name band (top 30%) must be on screen */});
  document.querySelectorAll('.hand .card.sel').forEach(c=>{const q=c.getBoundingClientRect();if(q.left<0||q.right>W||q.top<0||q.bottom>H)out.push('raised card clipped');if(!document.querySelector('.hero,.en'))out.push('raised card has no drag targets')});
  const broken=[...document.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).length;if(broken)out.push(broken+' broken images');return out});
 const EMO=pg=>pg.evaluate(()=>{const re=/\p{Extended_Pictographic}/u,out=[];const w=document.createTreeWalker(document.body,5);let n;
   while((n=w.nextNode())){if(n.nodeType===3){if(re.test(n.nodeValue)&&!/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName))out.push(n.nodeValue.trim().slice(0,30))}
    else for(const a of ['title','aria-label']){const v=n.getAttribute(a);if(v&&re.test(v))out.push(a+': '+v.slice(0,30))}}return out});
 const shot=async(pg,name)=>{if(!name.endsWith('-inspect'))await pg.evaluate(()=>closeInspect());const expected=name.endsWith('-map')||name.endsWith('-map-boss')?'map':name.endsWith('-event')||name.endsWith('-shrine')?'event':null;if(expected)await pg.waitForFunction(s=>W.S.screen===s&&!document.querySelector('#inspect'),expected);const f=`${OUT}/${name}.png`;await pg.screenshot({path:f});files.push(f);const e=await EMO(pg);if(e.length)bad.push(name+': emoji visible '+JSON.stringify(e.slice(0,4)))};
 // S24 Ultra landscape
 {const {ctx,pg,errs}=await open('s24Landscape');await pg.waitForTimeout(800);await shot(pg,'s24-landscape-title');
  await pg.evaluate(()=>{window.FAST=0;G.newRun('echo',{seed:3})});await pg.waitForTimeout(2400);await shot(pg,'s24-landscape-travel');
  await combat(pg);await shot(pg,'s24-landscape-combat');const l=await layout(pg);
  await pg.evaluate(()=>{G.cb.sel=null;W.S.potion=1;G.render()});await pg.waitForTimeout(200);await shot(pg,'s24-landscape-potion');await pg.evaluate(()=>closePop());
  await pg.evaluate(()=>{window.FAST=1;G.newRun('duel',{seed:8,skipTravel:true});G.run.floor=0});await pg.waitForTimeout(900);await shot(pg,'s24-landscape-map');
  await pg.evaluate(()=>scrollTo(0,0));await pg.waitForTimeout(200);await shot(pg,'s24-landscape-map-boss');
  await pg.evaluate(()=>{G.newRun('carto',{seed:7,skipTravel:true});G.run.gold=260;openShop()});await pg.waitForTimeout(900);await shot(pg,'s24-landscape-merchant');
  l.push(...await pg.evaluate(()=>document.documentElement.scrollHeight>innerHeight+1?['merchant scrolls']:[]));
  await pg.evaluate(()=>{G.newRun('tide',{seed:3,skipTravel:true});W.S={screen:'event',ev:G.EVENTS.find(e=>e.id==='sunkenchest')||G.EVENTS.find(e=>e.pool!=='shrine'),t:0};G.render()});await pg.waitForTimeout(900);await shot(pg,'s24-landscape-event');
  await pg.evaluate(()=>{W.S={screen:'event',ev:G.EVENTS.find(e=>e.id==='wishing')||G.EVENTS.find(e=>e.pool==='shrine'),t:0};G.render()});await pg.waitForTimeout(600);await shot(pg,'s24-landscape-shrine');
  await pg.evaluate(()=>{window.FAST=0;G.newRun('duel',{seed:5,skipTravel:true});['whaletooth','coralspur','griptape'].forEach(G.giveRelic);G.run.potions=['adrenalsalt','temperoil','kelpbroth'];W.toasts=[];G.startCombat('boss',['matriarch']);G.cb.mom=3;G.render()});
  await pg.waitForFunction(()=>{const s=G.envState();return s.id==='a1_lair_kelp'&&s.files>=6},null,{timeout:15000}).catch(()=>{});
  await pg.evaluate(()=>{const i=G.cb.hand.findIndex(c=>G.CARDS[c.id].t==='A');if(i>=0){tapCard(i)}});await pg.waitForTimeout(1600);await shot(pg,'s24-landscape-matriarch');l.push(...await layout(pg));
  await pg.evaluate(()=>{window.FAST=1;G.newRun('duel',{skipTravel:true});G.run.relics=[];G.startCombat('boss',['bell']);G.cb.p.block=6;G.cb.parry=5;G.cb.mom=2;G.render()});await pg.waitForTimeout(1400);await shot(pg,'s24-landscape-boss');l.push(...await layout(pg));
  await pg.evaluate(()=>{G.newRun('echo',{seed:9,skipTravel:true});G.run.relics=[];G.run.potionChance=100;G.startCombat('elite',['captain']);G.cb.ens.forEach(e=>dmgEnemy(e,999));after()});await pg.waitForTimeout(900);await shot(pg,'s24-landscape-reward');
  await pg.evaluate(()=>claimRow(W.S.rows.findIndex(r=>r.k==='cards')));await pg.waitForTimeout(600);await shot(pg,'s24-landscape-card-reward');
  await pg.evaluate(()=>openInspect({id:W.S.rows[W.S.cardsOpen].cards[1],uid:-2,up:false}));await pg.waitForTimeout(300);await shot(pg,'s24-landscape-inspect');await pg.evaluate(()=>closeInspect());
  await pg.evaluate(()=>{G.newRun('tide',{seed:4,skipTravel:true});G.giveRelic('galleypot');W.S={screen:'rest'};G.render()});await pg.waitForTimeout(700);await shot(pg,'s24-landscape-camp');
  await pg.evaluate(()=>{run$.openChest();openChestLid()});await pg.waitForTimeout(800);await shot(pg,'s24-landscape-chest');
  await pg.evaluate(()=>{window.FAST=1;G.newRun('echo',{seed:2,skipTravel:true});G.startCombat('fight',['gull','wisp']);G.cb.hand.length=4;G.playCard(0,{mark:true});G.render()});await pg.waitForTimeout(900);await shot(pg,'s24-landscape-echo');l.push(...await layout(pg));
  await pg.evaluate(()=>{G.newRun('carto',{seed:2,skipTravel:true});G.giveRelic('staratlas');G.startCombat('elite',['eel','eel']);let g=0;while(G.cb.mode&&g++<4){if(G.cb.mode.k==='chart')modeAct('done');else modeAct('choice',0)}G.render()});await pg.waitForTimeout(900);await shot(pg,'s24-landscape-carto');l.push(...await layout(pg));
  // official a1_shore (Act 1 Entrance) battle, art fully loaded: 832x384 @3.75 = 3120x1440
  await pg.evaluate(()=>{window.FAST=1;G.newRun('duel',{seed:21,skipTravel:true});G.run.floor=1;G.run.pos={r:0,i:0};G.startCombat('fight',['crab','knight']);let g=0;while(G.cb.mode&&g++<4)modeAct('choice',0);G.render()});
  await pg.waitForFunction(()=>{const s=G.envState();return s.id==='a1_shore'&&s.files>=6},null,{timeout:15000}).catch(()=>{});await pg.waitForTimeout(1600);await shot(pg,'s24-a1-shore-battle');l.push(...await layout(pg));
  if(l.length||errs.length)bad.push({dev:'s24Landscape',l,errs});await ctx.close()}
 // S24 Ultra portrait: rotate prompt
 {const {ctx,pg,errs}=await open('s24Portrait');await pg.waitForTimeout(700);await shot(pg,'s24-portrait-rotate');
  const vis=await pg.evaluate(()=>getComputedStyle(document.getElementById('rotate')).display);if(vis!=='flex'||errs.length)bad.push({dev:'s24Portrait',vis,errs});await ctx.close()}
 // Desktop
 {const {ctx,pg,errs}=await open('desktop');await combat(pg);await shot(pg,'desktop-1280x800-combat');const l=await layout(pg);if(l.length||errs.length)bad.push({dev:'desktop',l,errs});await ctx.close()}
 fs.copyFileSync(`${OUT}/s24-landscape-combat.png`,__dirname+'/screenshot.png');
 console.log(files.join('\n'));
 console.log(bad.length?'shot.js: PROBLEMS '+JSON.stringify(bad):'shot.js: layout checks PASS (no overflow, controls on-screen, no broken images, no page errors)');
 await b.close();srv.close();process.exit(bad.length?1:0)})();
