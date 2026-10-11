// dev: screenshot a set of screens to /tmp/scr-*.png
const {chromium}=require('playwright');const {start,DEVICES}=require('../../tests/util.js');
const SC={
 map:`G.newRun('duel',{seed:5,skipTravel:true});`,
 travel:`G.newRun('echo',{seed:5});W.S.t=0;render();`,
 shop:`G.newRun('carto',{seed:7,skipTravel:true});G.run.gold=300;run$.openShop();`,
 event:`G.newRun('tide',{seed:3,skipTravel:true});const ev=G.EVENTS.find(e=>e.id==='tidepool')||G.EVENTS[0];W.S={screen:'event',ev,t:0};render();`,
 shrine:`G.newRun('tide',{seed:3,skipTravel:true});const ev=G.EVENTS.find(e=>e.pool==='shrine');W.S={screen:'event',ev,t:0};render();`,
 reward:`G.newRun('echo',{seed:9,skipTravel:true});G.startCombat('fight',['slug']);G.cb.ens[0].hp=1;combat$.dmgEnemy(G.cb.ens[0],5);combat$.after();`,
 rewardCards:`G.newRun('echo',{seed:9,skipTravel:true});G.startCombat('fight',['slug']);combat$.dmgEnemy(G.cb.ens[0],99);combat$.after();const i=W.S.rows.findIndex(r=>r.k==='cards');run$.claimRow(i);`,
 rest:`G.newRun('duel',{seed:5,skipTravel:true});W.S={screen:'rest'};render();`,
 chest:`G.newRun('duel',{seed:5,skipTravel:true});run$.openChest();`,
 matriarch:`G.newRun('duel',{seed:5,skipTravel:true});['whaletooth','coral'].forEach(G.giveRelic);G.run.potions=['sparkphial','temperoil','quickwater'];G.startCombat('boss',['matriarch']);`,
 bell:`G.newRun('echo',{seed:5,skipTravel:true});G.startCombat('boss',['bell']);`,
 carto:`G.newRun('carto',{seed:5,skipTravel:true});G.startCombat('elite',['captain']);if(G.cb.mode&&G.cb.mode.k==='chart')modeAct('done');`,
 potpop:`G.newRun('duel',{seed:5,skipTravel:true});G.run.potions=['sparkphial','temperoil','quickwater'];G.startCombat('fight',['crab','gull']);W.S.potion=0;render();`,
 title:`W.S={screen:'title'};render();`,
};
(async()=>{const only=process.argv.slice(2);const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({...DEVICES.s24Landscape,deviceScaleFactor:1.5,serviceWorkers:'block'});
for(const [k,js] of Object.entries(SC)){if(only.length&&!only.includes(k))continue;const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.evaluate(()=>{window.FAST=1;localStorage.clear()});
 const r=await pg.evaluate(js=>{try{const {run$,combat$}=G;closeInspect();eval(js);return G.S.screen}catch(e){return 'ERR '+e.message+' '+e.stack.split('\n')[1]}},js);
 await pg.waitForTimeout(900);await pg.screenshot({path:`/tmp/scr-${k}.png`});console.log(k,r,errs.join(' | '));await pg.close()}
await b.close();srv.close();process.exit(0)})();
