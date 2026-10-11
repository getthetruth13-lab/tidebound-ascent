// Compare the saved pre-optimization renderer with today's UI and motion frozen.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{start}=require('./util');
const out=path.resolve('tests/task14-results/visual');fs.mkdirSync(out,{recursive:true});
const sources=Object.fromEntries(['render','anim','fx','env','vfx'].map(n=>[`/src/ui/${n}.js`,fs.readFileSync(path.join(__dirname,'task14-results/snapshots/before/src/ui',n+'.js'),'utf8')]));
// Keep subsequent lore/status/UI edits identical on both sides of the comparison.
const current=fs.readFileSync('src/ui/render.js','utf8'),old=sources['/src/ui/render.js'];
sources['/src/ui/render.js']=current.slice(0,current.indexOf('// Keep a pristine HTML tree'))+
 old.slice(old.indexOf('// ---------------- render ----------------'),old.indexOf('// ===== long-press')).replace("rl.textContent='Tap to read';",'')+
 current.slice(current.indexOf('// ===== long-press'));
(async()=>{const srv=await start(0),browser=await chromium.launch();try{
 for(const version of ['before','after'])for(const [device,width,height] of [['s24',832,384],['s24large',1012,473],['desktop',1280,800]]){
  const pg=await browser.newPage({viewport:{width,height},serviceWorkers:'block'});
  await pg.route('**/src/ui/*.js',async route=>{const file=new URL(route.request().url()).pathname;let s=version==='before'?sources[file]:undefined;if(file==='/src/ui/env.js'){if(s===undefined)s=await (await route.fetch()).text();s=s.replace('if(frames>120)','if(false)')}if(s!==undefined)await route.fulfill({body:s,contentType:'text/javascript'});else await route.continue()});
  await pg.goto(srv.url);await pg.waitForFunction(()=>window.G);await pg.evaluate(()=>document.fonts.ready);
  await pg.addStyleTag({content:'canvas{visibility:hidden!important}*,*::before,*::after{animation:none!important;transition:none!important}'});
  for(const cls of ['tide','echo','carto','duel'])for(const env of ['a1_shore','a1_cloister','a1_bellcourt']){
   await pg.evaluate(({cls,env})=>{window.FAST=1;G.settings.reduceMotion=true;G.newRun(cls,{seed:21,skipTravel:true});G.startCombat('fight',['crab','knight']);let n=0;while(G.cb.mode&&n++<8){modeAct(G.cb.mode.k==='chart'?'done':'choice',0)}G.S.ov=null;G.cb.banner=null;G.cb.vfx=[];G.cb.callouts=[];G.toasts=[];G.run.relics.forEach(r=>r.flashT=0);G.debugEnv(env);G.render()}, {cls,env});
   await pg.waitForLoadState('networkidle');await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(500);
   await pg.evaluate(()=>{G.render();document.getAnimations().forEach(a=>a.cancel())});
   await pg.screenshot({path:path.join(out,`${version}-${device}-${cls}-${env}.png`)});
  }await pg.close();
 }
 console.log('Task 14: 36 before/after visual pairs saved in '+out);
}finally{await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
