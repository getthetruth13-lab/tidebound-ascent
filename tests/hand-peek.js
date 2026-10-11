// Touch regression: at most one hand card is ever lifted (CDP touch -> real pointer events, S24 landscape).
const {chromium}=require('playwright');const {start,DEVICES}=require('./util');
const fs=require('fs'),path=require('path');const OUT=path.resolve(__dirname,'../playtests/screens-handpeek');
(async()=>{fs.mkdirSync(OUT,{recursive:true});const srv=await start(0),browser=await chromium.launch();const fails=[];let shot=0;
try{const ctx=await browser.newContext({...DEVICES.s24Landscape,hasTouch:true,isMobile:true,serviceWorkers:'block'}),pg=await ctx.newPage();
 pg.on('pageerror',e=>fails.push('pageerror '+e.message));
 pg.setDefaultTimeout(120000);await pg.goto(srv.url,{timeout:120000});await pg.waitForFunction(()=>window.G);
 const reset=()=>pg.evaluate(()=>{closeInspect();window.FAST=1;G.newRun('duel',{skipTravel:true});G.startCombat('fight',['crab']);G.cb.mode=null;
  G.cb.hand=['parry','footwork','thrust','parry','thrust'].map((id,i)=>({id,uid:900+i,up:false}));G.cb.sel=null;G.render()});
 await reset();await pg.waitForTimeout(300);
 const lines=await pg.evaluate(()=>[...document.querySelectorAll('.hand .rline')].every(e=>{const r=e.getBoundingClientRect();return r.height>=12&&r.bottom<innerHeight&&e.textContent.trim()}));if(!lines)fails.push('resting effect lines');
 for(const cls of ['tide','echo','carto','duel']){await pg.evaluate(cls=>{G.newRun(cls,{skipTravel:true});G.startCombat('fight',['crab']);while(G.cb.mode?.k==='choice')modeAct('choice',0);G.render()},cls);await pg.waitForTimeout(300);await pg.screenshot({scale:'css',path:path.join(OUT,'s24-meter-'+cls+'.png')});const t=await pg.locator('#dais').innerText();if(!(cls==='tide'?t.includes('Next turn:'):cls==='echo'?t.includes('Marks next card'):cls==='carto'?t.includes('Advance left'):t.includes('Momentum')))fails.push(cls+' plain label');
  if(cls==='echo'){await pg.evaluate(()=>armMark());if(!(await pg.locator('#dais').innerText()).includes('Armed: next card'))fails.push('Echo armed label');await pg.screenshot({scale:'css',path:path.join(OUT,'s24-meter-echo-armed.png')});await pg.evaluate(()=>{G.cb.mark=G.cb.hand[0];G.cb.armMark=false;G.render()});if(!(await pg.locator('#dais').innerText()).includes('End turn Echo'))fails.push('Echo timing label')}
  if(cls==='carto'){if(!(await pg.locator('#dais').innerText()).includes('Rank 1'))fails.push('waypoint rank label');await pg.evaluate(()=>advance(0));if(!(await pg.locator('#dais').innerText()).includes('0 Advances left'))fails.push('shared Advance count')}
 }
 await reset();
 for(const [hp,block,expected] of [[20,0,'HP → 14'],[3,0,'Lethal'],[20,10,'HP → 20']]){const label=await pg.evaluate(async({hp,block})=>{G.cb.ens[0].hp=hp;G.cb.ens[0].block=block;G.render();const ui=await import('/src/ui/outcome.js');ui.showOutcome(2,0);return document.querySelector('.en .outcome-label')?.textContent},{hp,block});if(label!==expected)fails.push('preview expected '+expected+' got '+label);await pg.screenshot({scale:'css',path:path.join(OUT,'s24-outcome-'+(hp===3?'lethal':block?'guard':'hp')+'.png')})}
 await reset();
 const cdp=await ctx.newCDPSession(pg);
 const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y],id)=>({x,y,id}))});
 const centre=i=>pg.evaluate(i=>{const el=document.querySelectorAll('.hand .card')[i],c=el.getBoundingClientRect();
  for(let fy=.15;fy<.95;fy+=.05)for(const fx of [.5,.4,.6,.3,.7]){const x=c.left+c.width*fx,y=Math.min(innerHeight-2,c.top+c.height*fy);const h=document.elementFromPoint(x,y);if(h&&h.closest('.card')===el)return [x,y]}
  throw new Error('card '+i+' not hittable')},i);
 const rest=await pg.evaluate(()=>Math.min(...[...document.querySelectorAll('.hand .card')].map(c=>c.getBoundingClientRect().top)));
 const tap=async i=>{const p=await centre(i);await touch('touchStart',[p]);await pg.waitForTimeout(40);await touch('touchEnd',[]);await pg.waitForTimeout(30)};
 const check=async(name,max=1)=>{await pg.waitForTimeout(320);
  const r=await pg.evaluate(rest=>{const cs=[...document.querySelectorAll('.hand .card')];return {cls:cs.filter(c=>c.matches('.sel,.peek')).length,
   geo:cs.filter(c=>c.getBoundingClientRect().top<rest-20).length,xs:cs.map(c=>Math.round(c.getBoundingClientRect().left))}},rest);
  await pg.screenshot({scale:'css',path:path.join(OUT,`${String(++shot).padStart(2,'0')}-${name}.png`)});
  const ok=r.cls<=max&&r.geo<=max&&new Set(r.xs).size===r.xs.length;console.log((ok?'ok  ':'FAIL')+` ${name}: lifted(class)=${r.cls} lifted(geom)=${r.geo}`);if(!ok)fails.push(name)};
 await tap(0);await check('tap-A');await tap(1);await check('tap-A-then-B');
 await reset();for(const i of [0,1,2]){const p=await centre(i);await touch('touchStart',[p]);await pg.waitForTimeout(15);await touch('touchEnd',[])}await check('rapid-A-B-C');
 // press B while A is selected: mid-press must already show only one lifted
 await reset();await tap(0);await pg.waitForTimeout(200);{const p=await centre(3);await touch('touchStart',[p]);await check('press-B-while-A-sel');await touch('touchEnd',[])}await check('after-press-B');
 // scrub across the hand, then release
 await reset();{const a=await centre(0),b=await centre(4);await touch('touchStart',[a]);for(let k=1;k<=10;k++){await touch('touchMove',[[a[0]+(b[0]-a[0])*k/10,a[1]]]);await pg.waitForTimeout(20);
  if(k===5)await check('mid-scrub')}await touch('touchEnd',[])}await check('after-scrub',1);
 // cancelled drag (touchCancel after lifting toward the enemies)
 await reset();await tap(1);{const p=await centre(2);await touch('touchStart',[p]);for(let k=1;k<=6;k++){await touch('touchMove',[[p[0],p[1]-k*30]]);await pg.waitForTimeout(20)}await touch('touchCancel',[])}await check('cancelled-drag',0);
 // multi-touch: second finger lands on another card
 await reset();{const a=await centre(0),b=await centre(3);await touch('touchStart',[a]);await pg.waitForTimeout(30);await touch('touchStart',[a,b]);await check('two-fingers');await touch('touchEnd',[])}await check('after-two-fingers');
 // Long press persists on release; the next tap dismisses without selecting/playing.
 await reset();{const p=await centre(1);await touch('touchStart',[p]);await pg.waitForTimeout(900);await touch('touchEnd',[])}await pg.waitForTimeout(200);if(await pg.locator('#inspect .card').count()!==1)fails.push('hand inspector did not persist');
 await pg.screenshot({scale:'css',path:path.join(OUT,'s24-persistent-inspector.png')});await pg.tap('#inspect');if(await pg.locator('#inspect').count())fails.push('inspector did not dismiss');await tap(3);await check('longpress-then-tap');
 // hand re-layout (draw) while one is selected, then tap another
 await reset();await tap(2);await pg.evaluate(()=>{G.cb.hand.push({id:'thrust',uid:990,up:false});G.render()});await tap(0);await check('relayout-then-tap');
 // drag-to-play still works
 await reset();{const n0=await pg.evaluate(()=>G.cb.hand.length);const p=await centre(2);await touch('touchStart',[p]);const e=await pg.evaluate(()=>{const r=document.querySelector('.en .fig,.en').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});for(let k=1;k<=12;k++){await touch('touchMove',[[p[0]+(e[0]-p[0])*k/12,p[1]+(e[1]-p[1])*k/12]]);await pg.waitForTimeout(25)}const label=await pg.locator('.en .outcome-label').innerText();if(!/^HP → \d+$|^Lethal$/.test(label))fails.push('enemy outcome '+label);await pg.screenshot({scale:'css',path:path.join(OUT,'s24-drag-preview.png')});await touch('touchEnd',[]);
  await pg.waitForTimeout(1500);console.log(await pg.evaluate(()=>JSON.stringify({e:G.cb.energy??G.cb.en,busy:G.cb.busy,h:G.cb.hand.map(c=>c.id),dc:G.cb.disc?.length})));const n1=await pg.evaluate(()=>G.cb.hand.length);console.log((n1<n0?'ok  ':'FAIL')+` drag-to-play: hand ${n0}->${n1}`);if(!(n1<n0))fails.push('drag-to-play')}
 await check('after-play',0);
 // invariant: no duplicate/invisible/mid-air cards, hand DOM matches state
 const inv=async(name)=>{const r=await pg.evaluate(()=>{const cs=[...document.querySelectorAll('.hand .card')];const bad=[];
  if(cs.length!==G.cb.hand.length)bad.push('dom '+cs.length+' vs hand '+G.cb.hand.length);
  if(document.querySelectorAll('.flycard').length>2)bad.push('flycards '+document.querySelectorAll('.flycard').length);
  cs.forEach((c,i)=>{const st=getComputedStyle(c);if(st.visibility==='hidden'||+st.opacity<.3)bad.push('invisible '+i);if(c.classList.contains('drag'))bad.push('stuck drag '+i);if(c.style.transform)bad.push('inline transform '+i)});
  if(document.querySelectorAll('.drop-over,.en.hot').length)bad.push('stale target highlight');return bad},);if(r.length){fails.push(name+': '+r.join(';'));console.log('FAIL '+name+' '+r.join(';'))}};
 // no energy: drag a card onto the enemy -> must not play, must return
 await reset();await pg.evaluate(()=>{G.cb.energy=0;G.render()});{const n0=await pg.evaluate(()=>G.cb.hand.length);const p=await centre(2);
  const e=await pg.evaluate(()=>{const r=document.querySelector('.en .fig,.en').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]});
  await touch('touchStart',[p]);for(let k=1;k<=10;k++){await touch('touchMove',[[p[0]+(e[0]-p[0])*k/10,p[1]+(e[1]-p[1])*k/10]]);await pg.waitForTimeout(20)}await touch('touchEnd',[]);
  await pg.waitForTimeout(500);const n1=await pg.evaluate(()=>G.cb.hand.length);if(n1!==n0){fails.push('no-energy played');console.log('FAIL no-energy played')}else console.log('ok   no-energy drop rejected')}
 await check('no-energy',1);await inv('no-energy');
 // drop on nothing (top bar) -> returns
 await reset();{const p=await centre(1);await touch('touchStart',[p]);for(let k=1;k<=8;k++){await touch('touchMove',[[p[0],p[1]-(p[1]-20)*k/8]]);await pg.waitForTimeout(20)}await touch('touchEnd',[])}
 await check('drop-on-nothing',1);await inv('drop-on-nothing');
 // End Turn mid-drag
 await reset();{const p=await centre(2);await touch('touchStart',[p]);for(let k=1;k<=5;k++){await touch('touchMove',[[p[0],p[1]-k*25]]);await pg.waitForTimeout(20)}
  await pg.evaluate(()=>endTurn());await pg.waitForTimeout(100);await touch('touchEnd',[]);await pg.waitForFunction(()=>!G.cb||!G.cb.busy,null,{timeout:20000})}
 await check('endturn-mid-drag',1);await inv('endturn-mid-drag');
 // fuzz: random taps/drags/scrubs/multi-touch, fixed seeds
 for(const seed of [1,7,42,1337]){await reset();let r=seed;const rnd=()=>{r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff};
  const box=await pg.evaluate(()=>{const h=document.getElementById('hand').getBoundingClientRect();return [h.left,h.right,innerHeight]});
  for(let step=0;step<40;step++){const n=await pg.evaluate(()=>G.cb&&G.cb.hand.length);if(!n||await pg.evaluate(()=>W.S.screen!=='combat'))break;
   await pg.evaluate(()=>{if(G.cb.energy<1)G.cb.energy=3});
   const k=rnd(),x=box[0]+(box[1]-box[0])*rnd(),y=box[2]-10-60*rnd();
   if(k<.5){await touch('touchStart',[[x,y]]);await pg.waitForTimeout(5+rnd()*40);await touch('touchEnd',[])}
   else if(k<.7){await touch('touchStart',[[x,y]]);for(let j=1;j<=5;j++){await touch('touchMove',[[x+(rnd()-.5)*200,y-rnd()*30]])}await touch('touchEnd',[])}
   else if(k<.85){await touch('touchStart',[[x,y]]);for(let j=1;j<=6;j++){await touch('touchMove',[[x,y-j*35*rnd()]])}await touch(rnd()<.5?'touchCancel':'touchEnd',[])}
   else{await touch('touchStart',[[x,y]]);await touch('touchStart',[[x,y],[box[0]+(box[1]-box[0])*rnd(),y]]);await pg.waitForTimeout(20);await touch('touchEnd',[])}
   if(step%10===9){await pg.waitForFunction(()=>!G.cb||!G.cb.busy,null,{timeout:20000}).catch(()=>{});await check('fuzz'+seed+'-'+step);await inv('fuzz'+seed+'-'+step)}}
  // tap empty space lowers everything
  await touch('touchStart',[[box[1]/2,60]]);await touch('touchEnd',[]);await check('fuzz'+seed+'-empty',0)}
 await ctx.close();
}finally{await browser.close();srv.close&&srv.close()}
if(fails.length){console.error('hand-peek FAILED:',fails.join(', '));process.exit(1)}console.log('hand-peek: all touch checks passed');})().catch(e=>{console.error(e);process.exit(1)});
