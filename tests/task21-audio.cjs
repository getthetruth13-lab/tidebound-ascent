// Real media and Web Audio: instrument calls without replacing playback.
const {chromium}=require('playwright'),{start,DEVICES}=require('./util.js'),assert=require('assert'),fs=require('fs');
(async()=>{const srv=await start(0),b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--use-fake-ui-for-media-stream']});try{
 const page=await b.newPage({...DEVICES.s24Landscape,userAgent:'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'});
 await page.addInitScript(()=>{window.media=[];window.oscStarts=[];const RA=window.Audio;window.Audio=function(src){const a=new RA(src);media.push(a);return a};const start=OscillatorNode.prototype.start;OscillatorNode.prototype.start=function(...args){oscStarts.push({time:performance.now(),frequency:this.frequency.value,context:this.context.state});return start.apply(this,args)}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(srv.url);await page.waitForSelector('#startscr',{timeout:15000});
 await page.waitForFunction(()=>media.some(a=>a.src.includes('menu-')&&a.currentTime>.1));
 const opening=await page.evaluate(()=>{const a=media.find(a=>a.src.includes('menu-'));return {src:a.src,time:a.currentTime,paused:a.paused,muted:a.muted,volume:a.volume}});
 await page.locator('#startscr').tap();await page.waitForSelector('#options');await page.waitForTimeout(600);
 const menu=await page.evaluate(()=>{const a=media.find(a=>a.src.includes('menu-'));return {count:media.filter(a=>a.src.includes('menu-')).length,time:a.currentTime,paused:a.paused,muted:a.muted,volume:a.volume}});
 assert.equal(menu.count,1);assert(menu.time>opening.time&&!menu.paused&&!menu.muted&&menu.volume>0);
 const count=await page.evaluate(()=>oscStarts.length);await page.locator('#options').tap();await page.waitForSelector('#optionswin');await page.waitForTimeout(250);
 const sfx=await page.evaluate(n=>oscStarts.slice(n),count);assert(sfx.length>0&&sfx.every(x=>x.context==='running'));assert.deepEqual(errors,[]);
 const result={opening,menu,sfx,errors,note:'Real Chromium media decoding and Web Audio on S24 Android-like touch viewport. Fresh open begins muted; first touch enables audible music. No physical phone/speaker measurement.'};fs.writeFileSync('tests/task21-results/audio.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await b.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
