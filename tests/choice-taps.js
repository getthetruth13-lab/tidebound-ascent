// Touch regression for card choice screens: rewards card pick, upgrade / remove lists (scrolling, long-press, rapid taps).
const {chromium}=require('playwright');const {start,DEVICES}=require('./util');
const fs=require('fs'),path=require('path');const OUT=path.resolve(__dirname,'../playtests/screens-choicetaps');
(async()=>{fs.mkdirSync(OUT,{recursive:true});const srv=await start(0),browser=await chromium.launch();const fails=[];let shot=0;
const ok=(c,n,info)=>{console.log((c?'ok  ':'FAIL')+' '+n+(info!==undefined?' '+JSON.stringify(info):''));if(!c)fails.push(n)};
try{const ctx=await browser.newContext({...DEVICES.s24Landscape,hasTouch:true,isMobile:true,serviceWorkers:'block'}),pg=await ctx.newPage();
 pg.setDefaultTimeout(120000);pg.on('pageerror',e=>fails.push('pageerror '+e.message));
 await pg.goto(srv.url,{timeout:120000});await pg.waitForFunction(()=>window.G);
 const cdp=await ctx.newCDPSession(pg);const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y],id)=>({x,y,id}))});
 const snap=n=>pg.screenshot({scale:'css',path:path.join(OUT,`${String(++shot).padStart(2,'0')}-${n}.png`)});
 const pt=(sel,i)=>pg.evaluate(([sel,i])=>{const el=document.querySelectorAll(sel)[i];if(!el)return null;const c=el.getBoundingClientRect();
  for(let fy=.2;fy<.9;fy+=.1)for(const fx of [.5,.3,.7]){const x=c.left+c.width*fx,y=c.top+c.height*fy;if(y<0||y>innerHeight)continue;const h=document.elementFromPoint(x,y);if(h&&el.contains(h))return [x,y]}return null},[sel,i]);
 const vis=async(sel,skip=0)=>{for(let i=0;i<60;i++){const p=await pt(sel,i);if(p&&skip--<=0)return p}throw new Error('no visible '+sel)};
 const tapAt=async(p,hold=40)=>{await touch('touchStart',[p]);await pg.waitForTimeout(hold);await touch('touchEnd',[]);await pg.waitForTimeout(30)};
 const bigDeck=()=>pg.evaluate(()=>{window.FAST=1;G.newRun('duel',{seed:5,skipTravel:true});const ids=Object.keys(G.CARDS).filter(id=>G.CARDS[id].cls==='duel'||G.CARDS[id].cls==='col').slice(0,30);
  ids.forEach(id=>G.run.deck.push({id,uid:5000+G.run.deck.length,up:false}))});
 // ---- rewards: rapid taps only select; confirmation adds exactly one card
 for(const pattern of ['same','spread']){await pg.evaluate(()=>{window.FAST=1;G.newRun('duel',{seed:3,skipTravel:true});G.startCombat('fight',['crab']);G.cb.ens.forEach(e=>dmgEnemy(e,999));after()});
  await pg.waitForFunction(()=>W.S.screen==='reward',null,{timeout:20000});const ri=await pg.evaluate(()=>W.S.rows.findIndex(r=>r.k==='cards'));
  await pg.evaluate(ri=>claimRow(ri),ri);await pg.waitForTimeout(300);const n0=await pg.evaluate(()=>G.run.deck.length);
  for(let k=0;k<8;k++){const p=await pt('.rewgrid .card',pattern==='same'?0:k%3);if(p)await touch('touchStart',[p]),await pg.waitForTimeout(10),await touch('touchEnd',[])}
  await pg.waitForTimeout(500);const r=await pg.evaluate(()=>({n:G.run.deck.length,open:W.S.cardsOpen,s:W.S.screen}));await snap('reward-'+pattern);
  ok(r.n===n0,'reward rapid taps ('+pattern+') add nothing',{before:n0,...r});
  await pg.evaluate(()=>rewCard(0));await snap('reward-selected');await pg.evaluate(()=>{if(W.S.cardSelected==null)rewCard(0);rewConfirmCards();rewConfirmCards()});ok(await pg.evaluate(()=>G.run.deck.length)===n0+1,'repeated confirm adds exactly one')}
 // ---- reward: long-press to enlarge then release must not take the card
 await pg.evaluate(()=>{G.newRun('duel',{seed:4,skipTravel:true});G.startCombat('fight',['crab']);G.cb.ens.forEach(e=>dmgEnemy(e,999));after()});await pg.waitForFunction(()=>W.S.screen==='reward');
 await pg.evaluate(()=>claimRow(W.S.rows.findIndex(r=>r.k==='cards')));await pg.waitForTimeout(300);{const n0=await pg.evaluate(()=>G.run.deck.length);const p=await pt('.rewgrid .card',1);
  await touch('touchStart',[p]);await pg.waitForTimeout(900);ok(await pg.locator('#inspect .card').count()===1,'reward hold opens inspector');await snap('reward-longpress');await touch('touchEnd',[]);await pg.waitForTimeout(400);
  const r=await pg.evaluate(()=>({n:G.run.deck.length,insp:!!document.querySelector('#inspect .card,.insp .card')}));ok(r.n===n0&&r.insp,'reward long-press persists and takes nothing',r);await pg.tap('#inspect');ok(await pg.locator('#inspect').count()===0,'next reward tap dismisses')}
 // selection switching, skip dialog, persisted preference and Options restoration
 await pg.evaluate(()=>{rewCard(0);rewCard(1)});ok(await pg.evaluate(()=>W.S.cardSelected)===1,'tap switches selection');
 await pg.evaluate(()=>rewCard(1));ok(await pg.evaluate(()=>W.S.cardSelected)==null,'same tap deselects');
 await pg.evaluate(()=>rewConfirmCards());await snap('skip-confirmation');await pg.tap('#skipno');ok(await pg.evaluate(()=>W.S.cardsOpen)!=null,'No keeps reward open');
 await pg.tap('#skipcard');await pg.check('#skipdont');await snap('skip-dont-show');await pg.tap('#skipyes');
 ok(await pg.evaluate(()=>G.settings.confirmCardSkip)===false,'skip preference saved');
 await pg.evaluate(()=>{const row=W.S.rows.find(r=>r.k==='cards');row.done=false;row.skipped=false;claimRow(W.S.rows.indexOf(row));rewConfirmCards()});
 ok(await pg.evaluate(()=>W.S.cardsOpen==null&&!W.S.skipConfirm&&G.run.deck.length===10),'disabled prompt skips without adding');await snap('reward-skipped');await pg.reload();await pg.waitForFunction(()=>window.G);
 ok(await pg.evaluate(()=>G.settings.confirmCardSkip)===false,'skip preference survives reload');
 await pg.evaluate(()=>{W.S={screen:'title',view:'options'};render()});await snap('options-skip-disabled');await pg.check('#setcardskip');ok(await pg.evaluate(()=>G.settings.confirmCardSkip)===true,'Options restores skip confirmation');
 // Victory placement at requested sizes and S24 CSS viewport.
 for(const [width,height] of [[832,384],[2340,1080],[1480,924]]){await pg.setViewportSize({width,height});await pg.evaluate(()=>{G.newRun('duel',{seed:3,skipTravel:true});G.startCombat('fight',['crab']);G.cb.ens.forEach(e=>dmgEnemy(e,999));after()});await pg.waitForFunction(()=>W.S.screen==='reward');await pg.waitForTimeout(3000);
  const fit=await pg.evaluate(()=>{const b=document.querySelector('.reward-banner').getBoundingClientRect(),t=document.querySelector('.topbar').getBoundingClientRect(),r=document.querySelector('.rewtiles').getBoundingClientRect();return {center:Math.abs(b.x+b.width/2-innerWidth/2)<2,clear:b.top>=t.bottom&&b.bottom<=r.top,b:{x:b.x,y:b.y,w:b.width,bottom:b.bottom},topbar:t.bottom,tiles:r.top}});ok(fit.center&&fit.clear,'Victory fits '+width+'x'+height,fit);await snap('victory-'+width+'x'+height)}
 await pg.setViewportSize({width:832,height:384});
 // The Victory reveal uses Options speed and disappears under reduced motion.
 const animationContext=await browser.newContext({...DEVICES.desktop,serviceWorkers:'block'}),animationPage=await animationContext.newPage();
 await animationPage.goto(srv.url);await animationPage.waitForFunction(()=>window.G);
 for(const [speed,duration] of [['slow',567],['normal',420],['fast',294]]){
  const actual=await animationPage.evaluate(speed=>{window.FAST=1;G.newRun('duel',{seed:3,skipTravel:true});window.FAST=0;G.settings.reduceMotion=false;setAnimSpeed(speed);W.S={screen:'reward',kind:'fight',title:'VICTORY!',rows:[]};render();return document.querySelector('.reward-banner').getAnimations()[0]?.effect.getTiming().duration},speed);
  ok(actual===duration,'Victory reveal follows '+speed+' speed',{actual,duration});await animationPage.waitForTimeout(150);await animationPage.screenshot({scale:'css',path:path.join(OUT,'victory-reveal-'+speed+'.png')});
 }
 await animationPage.evaluate(()=>{G.settings.reduceMotion=true;W.S={...W.S};render()});ok(await animationPage.evaluate(()=>document.querySelector('.reward-banner').getAnimations().length===0),'Victory respects reduced motion');await animationContext.close();
 // Event card choices use the same inspector without committing the event.
 for(const id of ['changeling','offering']){
  await pg.evaluate(id=>{G.newRun('duel',{seed:5,skipTravel:true});const ev=G.EVENTS.find(e=>e.id===id);W.S={screen:'event',ev};ev.o[0].f()},id);await pg.waitForTimeout(300);
  const before=await pg.evaluate(()=>JSON.stringify({deck:G.run.deck,gold:G.run.gold,hp:G.run.hp}));const p=await vis('.grid .card');
  await touch('touchStart',[p]);await pg.waitForTimeout(650);ok(await pg.locator('#inspect .card').count()===1,id+': event hold opens');await snap(id+'-event-hold');await touch('touchEnd',[]);await pg.waitForTimeout(100);
  ok(await pg.evaluate(before=>W.S.screen==='pick'&&!!document.querySelector('#inspect')&&JSON.stringify({deck:G.run.deck,gold:G.run.gold,hp:G.run.hp})===before,before),id+': release persists without committing');await pg.tap('#inspect');
 }
 // Shop card holds, including mouse release, never purchase.
 await pg.evaluate(()=>{G.newRun('duel',{seed:5,skipTravel:true});G.run.gold=999;openShop()});await pg.waitForTimeout(300);
 ok(!(await pg.locator('#cardshelf').innerText()).includes('Phase 2'),'shop has player labels');
 const shopBefore=await pg.evaluate(()=>({n:G.run.deck.length,g:G.run.gold}));
 {const p=await vis('#cardshelf .card');await touch('touchStart',[p]);await pg.waitForTimeout(650);ok(await pg.locator('#inspect .card').count()===1,'shop touch hold opens');await snap('shop-hold');await touch('touchEnd',[]);await pg.waitForTimeout(100);await pg.tap('#inspect')}
 {const p=await vis('#cardshelf .card');await pg.mouse.move(...p);await pg.mouse.down();await pg.waitForTimeout(650);ok(await pg.locator('#inspect .card').count()===1,'shop mouse hold opens');await pg.mouse.up();await pg.waitForTimeout(100);await pg.tap('#inspect')}
 ok(await pg.evaluate(b=>G.run.deck.length===b.n&&G.run.gold===b.g&&!document.querySelector('#inspect'),shopBefore),'shop holds close without purchase');
 await pg.mouse.move(0,0);
 // ---- upgrade / remove lists
 for(const mode of ['upgrade','remove']){
  await bigDeck();await pg.evaluate(m=>{window.picks=0;openPick(m,'test '+m,()=>{window.picks++;openPick(m,'again',()=>{window.picks++;goMap()})})},mode);await pg.waitForTimeout(300);
  const st=()=>pg.evaluate(()=>({picks:window.picks,ups:G.run.deck.filter(c=>c.up).length,n:G.run.deck.length,s:W.S.screen,top:document.scrollingElement.scrollTop+[...document.querySelectorAll('.page,.grid,.screen,main,#app *')].reduce((a,e)=>a+e.scrollTop,0)}));
  const s0=await st();
  // swipe-scroll starting on a card: must scroll, must not pick
  {const p=await pt('.grid .card',4);await touch('touchStart',[p]);for(let k=1;k<=10;k++){await touch('touchMove',[[p[0],p[1]-k*22]]);await pg.waitForTimeout(16)}await touch('touchEnd',[]);await pg.waitForTimeout(500)}
  const s1=await st();await snap(mode+'-after-scroll');ok(s1.picks===0&&s1.n===s0.n&&s1.ups===s0.ups,mode+': swipe-scroll on a card picks nothing',{s0,s1});ok(s1.top>s0.top,mode+': list actually scrolled',{from:s0.top,to:s1.top});
  // long-press then release: no pick
  {const p=await vis('.grid .card',1);await touch('touchStart',[p]);await pg.waitForTimeout(900);ok(await pg.locator('#inspect .card').count()===1,mode+': hold opens inspector');await snap(mode+'-hold');await touch('touchEnd',[]);await pg.waitForTimeout(400)}const s2=await st();ok(s2.picks===0&&s2.n===s0.n&&s2.ups===s0.ups,mode+': long-press release picks nothing',s2);
  await pg.evaluate(()=>{const i=document.getElementById('inspect');if(i&&typeof closeInspect==='function')closeInspect()});
  // frantic double/triple tap on one card while the next pick screen opens: exactly one pick
  {const p=await vis('.grid .card',0);for(let k=0;k<4;k++){await touch('touchStart',[p]);await pg.waitForTimeout(8);await touch('touchEnd',[])}await pg.waitForTimeout(500)}
  const s3=await st();await snap(mode+'-after-rapid');ok(s3.picks===1,mode+': rapid taps make exactly 1 pick',s3);
  ok(mode==='upgrade'?s3.ups===s0.ups+1:s3.n===s0.n-1,mode+': deck changed by exactly one card',{s0,s3});
 }
 await ctx.close();
}finally{await browser.close();srv.close&&srv.close()}
if(fails.length){console.error('choice-taps FAILED:',fails.join(', '));process.exit(1)}console.log('choice-taps: all checks passed')})().catch(e=>{console.error(e);process.exit(1)});
