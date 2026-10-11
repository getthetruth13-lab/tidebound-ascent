const {chromium}=require('playwright'),{start}=require('./util.js'),assert=require('assert');
(async()=>{const srv=await start(0),b=await chromium.launch();try{
for(const blocked of [false,true]){const page=await b.newPage();await page.addInitScript(blocked=>{
 const RealAudio=window.Audio;window.audioLog=[];let serial=0;window.Audio=function(src){const a=new RealAudio(src),id=++serial;audioLog.push({action:'new',id,src});let denied=blocked;
 a.play=function(){audioLog.push({action:'play',id,muted:a.muted});if(denied){denied=false;return Promise.reject(new DOMException('Gesture required','NotAllowedError'))}return Promise.resolve()};
 a.pause=function(){audioLog.push({action:'pause',id})};return a;
 }},blocked);
 await page.goto(srv.url);await page.waitForFunction(()=>window.G);await page.evaluate(()=>titleGo('start'));await page.waitForTimeout(250);
 const initial=await page.evaluate(()=>audioLog.filter(x=>x.action==='new'&&x.src.includes('menu-')));assert.equal(initial.length,1);
 await page.dispatchEvent('body','pointerdown',{pointerType:'touch',button:0});await page.waitForTimeout(200);
 const before=await page.evaluate(()=>audioLog);assert(before.some(x=>x.action==='play'&&x.id===initial[0].id&&!x.muted));
 await page.evaluate(()=>titleGo('main'));await page.waitForTimeout(250);
 const menu=await page.evaluate(()=>audioLog);assert.equal(menu.filter(x=>x.action==='new'&&x.src.includes('menu-')).length,1);assert(!menu.some(x=>x.action==='pause'&&x.id===initial[0].id));
 assert.equal(menu.filter(x=>x.action==='play').length,before.filter(x=>x.action==='play').length);
 await page.evaluate(()=>G.newRun('tide',{seed:15,skipTravel:true}));await page.waitForTimeout(200);assert((await page.evaluate(()=>audioLog)).some(x=>x.action==='new'&&x.src.includes('map-act1')));await page.close();
}
console.log('Task 15 audio: allowed muted autoplay, blocked retry on first pointerdown, continuous menu voice, run track switch PASS');
}finally{await b.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
