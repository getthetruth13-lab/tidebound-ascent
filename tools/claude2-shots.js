// Screenshots of every intro scene + font audit (computed families across screens) -> playtests/screens-claude2/
const {chromium}=require('playwright');const {start,DEVICES}=require('../tests/util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const pg=await ctx.newPage();const errs=[];
 pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await pg.goto(srv.url||('http://localhost:'+srv.port+'/'));await pg.waitForTimeout(1500);
 const out='playtests/screens-claude2/';
 await pg.click('#newgame');await pg.waitForTimeout(500);
 const waits=[7000,6500,6500,7500,11000];
 for(let i=1;i<=5;i++){await pg.waitForTimeout(waits[i-1]);await pg.screenshot({path:out+`intro-scene-${i}.png`});console.log('scene',i,await pg.evaluate(()=>W.S.scene));if(i<5)await pg.click('#intro',{position:{x:300,y:200}})}
 console.log('audio',await pg.evaluate(()=>[...document.querySelectorAll('audio')].length));
 await pg.click('#intro',{position:{x:300,y:200}});await pg.waitForTimeout(800);console.log('after',await pg.evaluate(()=>W.S.view+' seen='+G.settings.introSeen));await pg.screenshot({path:out+'after-intro-select.png'});
 // second New Game skips the cinematic; Learn replays it
 await pg.evaluate(()=>titleGo('main'));await pg.click('#newgame');await pg.waitForTimeout(300);console.log('2nd newgame ->',await pg.evaluate(()=>W.S.view));
 await pg.evaluate(()=>titleGo('learn'));await pg.waitForTimeout(300);await pg.screenshot({path:out+'learn-replay-button.png'});await pg.click('#replayintro');await pg.waitForTimeout(300);console.log('replay ->',await pg.evaluate(()=>W.S.view));
 await pg.click('#introskip');await pg.waitForTimeout(300);console.log('skip ->',await pg.evaluate(()=>W.S.view));
 await pg.evaluate(()=>{G.settings.introSeen=false;setSkipIntro(true);titleGo('main')});await pg.click('#newgame');console.log('skipIntro setting ->',await pg.evaluate(()=>W.S.view));
 await pg.evaluate(()=>{setSkipIntro(false);titleGo('options')});await pg.waitForTimeout(300);await pg.screenshot({path:out+'options-skip-intro.png'});
 // font audit
 const fonts=[];
 for(const [name,fn] of [['title',()=>titleGo('main')],['select',()=>titleGo('select')],['learn',()=>titleGo('learn')],['options',()=>titleGo('options')],
  ['map',()=>{G.newRun('tide',{seed:5,skipTravel:true});W.S={screen:'map'};G.render()}],['combat',()=>{G.newRun('echo',{seed:5,skipTravel:true});G.startCombat('fight',['knight','slug'])}],['shop',()=>{G.newRun('duel',{seed:5,skipTravel:true});G.run$.openShop()}]]){
  await pg.evaluate(fn);await pg.waitForTimeout(700);
  const r=await pg.evaluate(()=>{const m={};for(const e of document.querySelectorAll('body *')){if(!e.childNodes.length||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;const cs=getComputedStyle(e);const f=cs.fontFamily,sz=parseFloat(cs.fontSize);const k=f;m[k]=m[k]||{n:0,min:99};m[k].n++;m[k].min=Math.min(m[k].min,sz)}return m});
  fonts.push([name,r]);await pg.screenshot({path:out+`font-audit-${name}.png`});
 }
 console.log(JSON.stringify(fonts,null,1));console.log('errors',errs);await b.close();srv.close&&srv.close();process.exit(0)})();
