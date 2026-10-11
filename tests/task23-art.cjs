// Task 23: verify dual-review gating, final dimensions and real S24 event rendering.
const {chromium}=require('playwright'),{start,DEVICES}=require('./util.js');
const fs=require('fs'),assert=require('assert');
const names='tidalwheel spring changeling offering wishing cartomancer stranger crabmarket gullnest inkgrotto sailor mirror loom'.split(' ');
(async()=>{const manifest=JSON.parse(fs.readFileSync('art/v2/ui/tiles.json')).tiles;
 const srv=await start(0),b=await chromium.launch();try{const p=await b.newPage({...DEVICES.s24Landscape,serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(srv.url);await p.waitForFunction(()=>window.G);fs.mkdirSync('screenshots/task23',{recursive:true});
 for(const id of names){const report=fs.readFileSync(`art-reviews/event-${id}.md`,'utf8');const verdicts=[...report.replaceAll('*','').matchAll(/VERDICT:\s*(PASS|FIX|REJECT)/g)].map(m=>m[1]);assert.equal(verdicts.length,2,`${id}: both reviews required`);const pass=verdicts.every(v=>v==='PASS');assert.equal(manifest[`event-${id}`].ready,pass,`${id}: gate`);assert.equal(fs.existsSync(manifest[`event-${id}`].path),pass,`${id}: live file gate`);
 await p.evaluate(id=>{G.newRun('tide',{seed:3,skipTravel:true});W.S={screen:'event',ev:G.EVENTS.find(e=>e.id===id),t:0};G.render()},id);
 await p.waitForFunction(({id,pass})=>{const el=document.querySelector(`[data-tile="event-${id}"]`);if(!el)return false;const im=el.querySelector('img');return pass?im&&im.complete&&im.naturalWidth===512&&im.naturalHeight===384:!im},{id,pass});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.waitForTimeout(700);await p.screenshot({path:`screenshots/task23/event-${id}.png`});console.log(`${id}: ${pass?'live painting':'held; placeholder'} PASS`);
 }assert.deepEqual(errors,[]);console.log('Task 23 art gating and S24 rendering PASS');}finally{await b.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
