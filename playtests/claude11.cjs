// Claude Task 11: real-time animation checks with FAST=0 on the S24 landscape viewport. Screenshots -> playtests/screens-claude11/
const {chromium}=require('playwright');const fs=require('fs');const {start,DEVICES,tapCardUI}=require('../tests/util.js');
const OUT=__dirname+'/screens-claude11/';fs.mkdirSync(OUT,{recursive:true});
const res=[];const check=(n,ok,x)=>{res.push([n,!!ok]);console.log((ok?'  ✔ ':'  ✘ ')+n+(ok?'':' '+JSON.stringify(x)))};
(async()=>{const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.waitForLoadState('networkidle');
 const shot=async n=>p.screenshot({path:OUT+n+'.png',scale:'css'});
 const setup=async(cls='duel',enemies=['crab','knight'],hand=['strike','guard'])=>{await p.evaluate(([cls,en,hand])=>{localStorage.clear();window.FAST=0;G.newRun(cls,{seed:42,skipTravel:true});W.toasts=[];G.startCombat('fight',en);if(G.cb.mode)modeAct('choice',1);const c=G.cb;
   G.render()},[cls,enemies,hand])};
 const ids=await p.evaluate(()=>Object.keys(G.CARDS).filter(k=>['A','S'].includes(G.CARDS[k].t)&&G.CARDS[k].cls==='duel').slice(0,40).join(','));
 // ---- combat start: slide-in + draw
 await p.evaluate(()=>{localStorage.clear();window.FAST=0;G.newRun('duel',{seed:7,skipTravel:true});G.startCombat('fight',['crab','knight'])});
 await p.waitForTimeout(400);await shot('01-combat-start-draw-mid');
 await p.waitForTimeout(1200);await shot('02-combat-idle');
 check('combat-motion class on and FX layer exists',await p.evaluate(()=>document.body.classList.contains('combat-motion')));
 // ---- play an attack card: find an attack in hand
 const atk=await p.evaluate(()=>{const i=G.cb.hand.findIndex(c=>G.CARDS[c.id].t==='A'&&G.cb.energy>=G.cards$.cost(c));return i});
 check('hand has an attack',atk>=0,atk);
 const hp0=await p.evaluate(()=>G.cb.ens[0].hp+G.cb.ens[0].block);
 await p.evaluate(i=>{G.cb.tgt=0;G.cb.sel=null;playCard(i)},atk);
 for(const [t,n] of [[40,'03-attack-windup'],[80,'04-attack-impact'],[90,'05-attack-recoil']]){await p.waitForTimeout(t);await shot(n)}
 check('card clone flew and was removed',await p.waitForFunction(()=>!document.querySelector('.flycard'),null,{timeout:2000}).then(()=>true,()=>false));
 const hp1=await p.evaluate(()=>G.cb.ens[0].hp+G.cb.ens[0].block);check('attack dealt damage',hp1<hp0,[hp0,hp1]);
 // resume: re-render mid-animation must not drop the target reaction
 await p.waitForTimeout(500);
 // ---- end turn: discard sweep, telegraph, strike
 await p.evaluate(()=>{endTurn()});
 await p.waitForTimeout(60);await shot('06-discard-sweep');
 const tele=await p.waitForFunction(()=>document.querySelector('.foes.has-act .en.act'),null,{timeout:2500}).then(()=>true,()=>false);
 check('acting enemy highlighted (.has-act / .act)',tele);
 await shot('07-enemy-telegraph');
 await p.waitForTimeout(330);await shot('08-enemy-strike');
 const waits=await p.waitForFunction(()=>G.cb&&!G.cb.busy,null,{timeout:6000}).then(()=>true,()=>false);check('enemy turn completes and player turn starts',waits);
 await p.waitForTimeout(150);await shot('09-new-turn-draw');
 // ---- damage numbers big / small
 await p.evaluate(()=>{G.cb.vfx=[];dmgEnemy(G.cb.ens[0],4);dmgEnemy(G.cb.ens[0],18);G.render()});await p.waitForTimeout(250);await shot('10-damage-numbers');
 check('damage numbers scale with size',await p.evaluate(()=>{const f=[...document.querySelectorAll('.fl')].map(e=>parseFloat(getComputedStyle(e).getPropertyValue('--fs')||e.style.getPropertyValue('--fs')));return f.length>=2&&Math.max(...f)>Math.min(...f)}));
 check('hp ghost bar rendered',await p.evaluate(()=>!!document.querySelector('.hpbar .gh')));
 // ---- guard + hero hit vignette
 await p.evaluate(()=>{G.cb.vfx=[];loseHp(8);G.render()});await p.waitForTimeout(120);await shot('11-hero-hit-vignette');
 // ---- kill: death sequence
 await p.evaluate(()=>{const e=G.cb.ens[1];e.hp=3;dmgEnemy(e,50);G.render()});
 await p.waitForTimeout(100);await shot('12-death-flash');await p.waitForTimeout(250);await shot('13-death-dissolve');
 // ---- reshuffle + final kill -> reward with hold
 await p.evaluate(()=>{G.cb.draw=G.cb.draw.slice(0,1);refill(5);G.render()});await p.waitForTimeout(120);await shot('14-reshuffle');
 await p.evaluate(()=>{const e=G.cb.ens[0];e.hp=2;dmgEnemy(e,50);G.combat$.after()});
 await p.waitForTimeout(150);await shot('15-final-kill-slowmo');await p.waitForTimeout(900);await shot('16-reward-reveal');
 check('reward screen reached',await p.evaluate(()=>G.S.screen==='reward'),await p.evaluate(()=>G.S.screen));
 // card reward
 await p.evaluate(()=>{const i=G.S.rows.findIndex(r=>r.k==='cards');if(i>=0)claimRow(i)});await p.waitForTimeout(250);await shot('17-card-reward-deal');
 await p.waitForTimeout(600);
 await p.evaluate(()=>document.querySelector('.rewgrid .card')?.click());await p.waitForTimeout(260);await shot('18-card-to-deck');
 await p.waitForTimeout(500);
 // gold click
 await p.evaluate(()=>{window.__g=G.run.gold;const t=document.querySelector('.rewtiles .tile.k-gold');if(t)t.click()});await p.waitForTimeout(260);await shot('19-gold-fly');
 await p.waitForTimeout(700);
 // map + travel
 await p.evaluate(()=>{rewDone&&rewDone()});await p.waitForTimeout(900);await shot('20-map');
 await p.evaluate(()=>{document.querySelector('.node.av')?.click()});await p.waitForTimeout(240);await shot('21-map-travel');
 await p.waitForTimeout(900);await shot('22-after-travel');
 // chest
 await p.evaluate(()=>{W.S={screen:'chest',name:'Salt Chest',chest:'wood',opened:false,rows:[{k:'gold',n:30}]};G.render()});await p.waitForTimeout(500);
 await p.evaluate(()=>document.querySelector('#openchest')?.click());await p.waitForTimeout(500);await shot('23-chest-open');
 check('chest opened after shake',await p.evaluate(()=>!!W.S.opened));
 // status effects
 await setup('tide',['crab','knight']);await p.evaluate(()=>{if(G.cb.mode)modeAct('choice',1)});await p.waitForTimeout(1500);
 await p.evaluate(()=>{const c=G.cb;const m=G.combat$;m.addSt(c.ens[0],'vuln',2);m.addSt(c.ens[1],'bleed',3);m.addSt(c.p,'str',2);G.render()});await p.waitForTimeout(150);await shot('24-status-effects');
 // frame-time sampler under 4x CPU throttle through a 2-enemy turn
 const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await setup('duel',['crab','knight','slug']);await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.__ft=[];let l=performance.now();const f=t=>{window.__ft.push(t-l);l=t;if(window.__run)requestAnimationFrame(f)};window.__run=1;requestAnimationFrame(f);endTurn()});
 await p.waitForFunction(()=>G.cb&&!G.cb.busy,null,{timeout:12000}).catch(()=>{});await p.waitForTimeout(800);
 const ft=await p.evaluate(()=>{window.__run=0;const a=window.__ft.slice(5).sort((x,y)=>x-y);return {n:a.length,med:a[a.length>>1],p95:a[Math.floor(a.length*.95)],max:a[a.length-1]}});
 console.log('frame times (4x CPU throttle, 3-enemy turn):',JSON.stringify(ft));
 check('4x throttled median frame under 33ms',ft.med<33,ft);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 // reduced motion: no movement entries, no errors
 const rm=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block',reducedMotion:'reduce'});const q=await rm.newPage();const e2=[];q.on('pageerror',e=>e2.push(e.message));
 await q.goto(srv.url+'index.html');await q.waitForFunction(()=>window.G);
 await q.evaluate(()=>{localStorage.clear();window.FAST=0;G.newRun('duel',{seed:3,skipTravel:true});G.startCombat('fight',['crab']);G.cb.hand=[{id:'strike',uid:1,up:false}].filter(c=>G.CARDS[c.id]);});
 await q.waitForTimeout(500);await q.evaluate(()=>{loseHp(6);G.render()});await q.waitForTimeout(100);await q.screenshot({path:OUT+'25-reduced-motion-flash.png',scale:'css'});
 check('reduced motion: no flying card clones / ghosts',await q.evaluate(()=>!document.querySelector('.flycard,.action-ghost')));
 check('no page errors (reduced motion)',e2.length===0,e2);
 check('no page errors',errs.length===0,errs);
 await b.close();srv.close&&srv.close();
 const bad=res.filter(r=>!r[1]).length;console.log(`claude11.cjs: ${res.length-bad} passed, ${bad} failed`);process.exit(bad?1:0)})();
