// Task 30 checks: scene-plate tiles, class meter objects + drag previews, character select C1 + hero locking. node tests/t30/task30.cjs
const {chromium}=require('playwright');const {start,DEVICES,cardPoint}=require('../util.js');
let pass=0,fail=0;const check=(n,ok,x)=>{if(ok){pass++;console.log('  ok',n)}else{fail++;console.log('  FAIL',n,x===undefined?'':JSON.stringify(x))}};
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.waitForLoadState('networkidle');
 const sel=()=>p.evaluate(()=>{localStorage.clear();W.S={screen:'title',view:'select',hero:null};G.render()});
 // tiles
 await p.evaluate(()=>{localStorage.clear();G.newRun('tide',{seed:7,skipTravel:true});G.run$.combatRewards('elite',{});G.render()});
 check('reward tiles are scene plates with glow, no inner box',await p.evaluate(()=>{const t=[...document.querySelectorAll('.rewtiles .tile')];return t.length>=3&&t.every(x=>x.classList.contains('sp')&&x.querySelector('.tglow')&&x.querySelector('.tart')&&!x.querySelector('.emb:not(.ph)>.emb'))}));
 check('tile (i) has no circle background',await p.evaluate(()=>{const i=document.querySelector('.tile .tipi');return i&&getComputedStyle(i).backgroundImage==='none'}));
 await p.evaluate(()=>{localStorage.clear();G.newRun('tide',{seed:7,skipTravel:true});G.giveRelic('moonshell');G.startCombat('fight',['crab']);G.render()});await p.waitForTimeout(500);
 check('Moon Shell tiles carry a live mini gauge at 3 / 5 / 7',await p.evaluate(()=>[...document.querySelectorAll('#choicebox .tile .mg-n')].map(e=>e.textContent).join()==='3,5,7'));
 await p.evaluate(()=>{W.S.ov=null;G.cb.mode=null;G.cb.startQ=[];G.render()});
 // meters
 for(const cls of ['tide','echo','carto','duel']){await p.evaluate(c=>{localStorage.clear();G.newRun(c,{seed:5,skipTravel:true});G.startCombat('fight',['crab','slug']);if(G.cb.mode&&G.cb.mode.k==='chart')modeAct('done');G.cb.mode=null;G.render()},cls);await p.waitForTimeout(400);
  check(cls+' meter is a drawn object (no panel, no title bar)',await p.evaluate(()=>{const d=document.querySelector('.dais.obj');if(!d)return false;const s=getComputedStyle(d);return s.backgroundImage==='none'&&s.borderTopWidth==='0px'&&!d.querySelector('.dais-hd')}));
  check(cls+' meter does not overlap hero, enemies or the energy orb',await p.evaluate(()=>{const d=document.querySelector('.dais.obj').getBoundingClientRect(),hit=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
   let r=[...document.querySelectorAll('.hero .fig,.en .fig,#orb,.hand .card')].map(e=>e.getBoundingClientRect());const dd=[...document.querySelectorAll('.dais.obj [data-info]')].map(e=>e.getBoundingClientRect()).filter(x=>x.width>2);
   return !r.some(x=>dd.some(y=>hit(x,y)))&&d.bottom<=innerHeight}))}
 // echo bell is plain (no jaw ridges) and tappable to Mark
 await p.evaluate(()=>{localStorage.clear();G.newRun('echo',{seed:5,skipTravel:true});G.startCombat('fight',['crab']);G.cb.mode=null;G.render()});
 check('Echo bell: one plain smooth bell body, tap to Mark',await p.evaluate(()=>{const s=document.querySelector('.bell-svg');return !!s&&s.querySelectorAll('path[fill^="url(#bz-b)"]').length===1&&!!document.querySelector('#markbtn')}));
 // duel: tap the flame arms Flourish
 await p.evaluate(()=>{localStorage.clear();G.newRun('duel',{seed:5,skipTravel:true});G.startCombat('fight',['crab']);G.cb.mode=null;G.cb.mom=3;G.render()});
 await p.click('#flourishbtn');await p.waitForTimeout(200);check('Duelist: tapping the flame arms Flourish',await p.evaluate(()=>G.cb.armFlourish===true&&document.querySelector('#flourishbtn').classList.contains('on')));
 // live drag preview
 await p.evaluate(()=>{localStorage.clear();G.newRun('tide',{seed:5,skipTravel:true});G.startCombat('fight',['crab']);const c=G.cb;c.mode=null;c.tide=4;c.hand=[{id:'splash',uid:9002,up:false},{id:'lash',uid:9003,up:false}];G.render()});await p.waitForTimeout(500);
 {const a=await cardPoint(p,0),t=await p.evaluate(()=>{const r=document.querySelector('.en .fig').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*.55}});
  await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(t.x,t.y,{steps:10});await p.waitForTimeout(250);
  check('dragging a Surge card shows a dashed preview on the Tide gauge',await p.evaluate(()=>!!document.querySelector('#dais.pv .tg2-tube.pvon')&&/→/.test(document.querySelector('.tg2-pvn').textContent)));
  await p.mouse.up();await p.waitForTimeout(300)}
 // select
 await sel();await p.waitForTimeout(300);
 check('select: four landings, four lanterns, one lit',await p.evaluate(()=>document.querySelectorAll('.st-pick').length===4&&document.querySelectorAll('.st-lan').length===4&&document.querySelectorAll('.st-lan.lit').length===1));
 check('select: meter demo loop for the focused hero',await p.evaluate(()=>document.querySelectorAll('.st-pick.on .dm').length===1));
 await p.evaluate(()=>selectHero('echo'));await p.waitForTimeout(200);check('select: tapping a hero lights its lantern and shows the promise',await p.evaluate(()=>document.querySelector('.st-pick[data-cls=echo] .st-lan.lit')&&/Bell/.test(document.querySelector('.st-pick.on .st-slab i').textContent)));
 await p.click('#heroinfo');await p.waitForTimeout(250);check('select: (i) opens the full panel',await p.evaluate(()=>!!document.querySelector('.tb-hero')));
 await p.click('#heroback');await p.waitForTimeout(200);check('select: Back closes the panel only',await p.evaluate(()=>!document.querySelector('.tb-hero')&&W.S.view==='select'));
 // hero locking: default off keeps everyone open; flag on locks Tidecaller and Cartographer
 check('hero locking default: all four open',await p.evaluate(()=>!document.querySelector('.st-pick.locked')&&!document.querySelector('#beginfocus').disabled));
 await p.evaluate(()=>{localStorage.setItem('tidebound.herolock','1');W.S={screen:'title',view:'select',hero:'carto'};G.render()});await p.waitForTimeout(200);
 check('hero locking on: Tidecaller + Cartographer locked, Begin disabled, hint shown',await p.evaluate(()=>[...document.querySelectorAll('.st-pick.locked')].map(e=>e.dataset.cls).sort().join()==='carto,tide'&&document.querySelector('#beginfocus').disabled&&/Locked:/.test(document.querySelector('.st-pick[data-cls=carto] .st-slab i').textContent)));
 check('hero locking on: a locked hero cannot start a run',await p.evaluate(()=>{W.run=null;beginHero('carto');return !W.run}));
 await p.evaluate(()=>{const q=G.progress.loadProfile();q.climb=9999;G.progress.saveProfile(q);W.S={screen:'title',view:'select',hero:'carto'};G.render()});await p.waitForTimeout(200);
 check('hero locking on: Stair progress unlocks the Cartographer',await p.evaluate(()=>![...document.querySelectorAll('.st-pick.locked')].some(e=>e.dataset.cls==='carto')));
 await p.evaluate(()=>localStorage.removeItem('tidebound.herolock'));
 check('no page errors',errs.length===0,errs);
 console.log(`\ntask30: ${pass} passed, ${fail} failed`);await b.close();process.exit(fail?1:0)})();
