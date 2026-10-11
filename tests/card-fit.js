// Exhaustive real card renderer audit, including upgrades and every UI size.
const {chromium}=require('playwright');
const {start,DEVICES}=require('./util');
const fs=require('fs'),path=require('path');
const OUT=path.resolve(__dirname,'../playtests/screens-codex12');
(async()=>{fs.mkdirSync(OUT,{recursive:true});const srv=await start(0),browser=await chromium.launch();
const report={checks:0,failures:[],sizes:[],sheets:[]};
try{for(const device of ['s24Landscape','desktop']){
 const ctx=await browser.newContext({...DEVICES[device],serviceWorkers:'block'}),pg=await ctx.newPage();
 pg.on('pageerror',e=>report.failures.push({device,error:e.message}));
 await pg.goto(srv.url);await pg.waitForFunction(()=>window.G);await pg.evaluate(()=>{window.FAST=1;G.newRun('duel',{skipTravel:true});G.startCombat('fight',['crab']);G.render()});
 await pg.evaluate(()=>document.fonts.ready);
 if(device==='s24Landscape'&&!process.argv.includes('--bounds-only')){
  await pg.evaluate(()=>{G.cb.mode=null;G.cb.hand=['parry','parry','footwork','thrust','thrust'].map((id,i)=>({id,uid:900+i,up:false}));G.cb.sel=2;G.render()});
  await pg.waitForLoadState('networkidle');await pg.screenshot({path:path.join(OUT,'s24Landscape-light-feet-combat.png')});
 }
 const sizes=await pg.evaluate(async()=>{const {cardHTML,fitCards}=await import('/src/ui/render.js');window.audit={cardHTML,fitCards};
 const hand=document.querySelector('.hand .card').offsetWidth;
 openShop();const shop=document.querySelector('.shopitem .card').offsetWidth;
 openInspect({id:Object.keys(G.CARDS)[0],uid:-1,up:false});const zoom=document.querySelector('.insp .card').offsetWidth;closeInspect();
 G.newRun('echo',{seed:9,skipTravel:true});G.startCombat('elite',['captain']);G.cb.ens.forEach(e=>dmgEnemy(e,999));after();claimRow(W.S.rows.findIndex(r=>r.k==='cards'));const reward=document.querySelector('.rewgrid .card').offsetWidth;
 const host=document.createElement('div');host.id='audit';document.body.append(host);
 return [{name:'hand',width:hand,context:'hand'},{name:'lifted-hand',width:hand,context:'hand',scale:1.7},
 {name:'zoom',width:zoom,context:'insp'},{name:'reward',width:reward,context:'rewgrid'},
 {name:'deck',width:150,context:'grid small'},{name:'shop',width:shop,context:'shopitem'},
 {name:'choice',width:Math.min(150,(innerHeight-150)*5/7),context:'tcard'},
 {name:'pick',width:132,context:'grid'},
 {name:'event',width:Math.max(96,Math.min(150,(innerHeight-200)*5/7)),context:'tcard'},
 ...[3,5].map(n=>({name:'chart-'+n,width:Math.min(150,(innerHeight-190)*5/7,(innerWidth-220)/n),context:'cslot'})),
 {name:'lantern-offer',width:Math.min(150,(innerHeight-200)*5/7),context:'lp-cardwrap'},
 {name:'lantern-final',width:Math.min(104,(innerHeight-200)*5/7),context:'lp-cardwrap'},
 {name:'collection',width:Math.max(88,Math.min(112,innerWidth*.125)),context:'lp-cardwrap'},
 {name:'grid',width:190,context:'grid'},{name:'preview',width:Math.min(176,(innerHeight-20)*5/7),context:''}];});
 const cards=await pg.evaluate(()=>Object.keys(G.CARDS).flatMap(id=>[{id,up:false},{id,up:true}]));
 for(const size of sizes){report.sizes.push({device,...size});
 for(let offset=0;offset<cards.length;offset+=24){if(process.argv.includes('--sheets-only')&&size.name!=='zoom'&&offset>0)continue;const batch=cards.slice(offset,offset+24);
 const failures=await pg.evaluate(({batch,size})=>{const host=document.getElementById('audit');
 host.style.cssText='position:fixed;inset:0;z-index:99999;background:#080e17;overflow:auto;padding:12px;display:grid;grid-template-columns:repeat(6,max-content);gap:12px;align-content:start';
 host.innerHTML=batch.map(ci=>`<div style="width:${size.width*(size.scale||1)}px;height:${size.width*1.4*(size.scale||1)+26}px"><div style="font:12px sans-serif;color:white">${ci.id}${ci.up?'+':''}</div><div class="${size.context}" style="position:relative;inset:auto;display:block;width:${size.width}px;height:auto;margin:0;--gw:${size.width}px">${audit.cardHTML({...ci,uid:-1},{full:true})}</div></div>`).join('');
 host.querySelectorAll('.card').forEach(c=>{c.style.cssText+=`;position:relative;left:auto;bottom:auto;margin:0;width:${size.width}px;transform:none`;});
 audit.fitCards(host);if(size.scale)host.querySelectorAll('.card').forEach(c=>{c.style.transform=`scale(${size.scale})`;c.style.transformOrigin='top left'});const out=[];
 host.querySelectorAll('.card').forEach((c,i)=>{for(const sel of ['.name','.cost','.type','.text']){const el=c.querySelector(sel),r=el.getBoundingClientRect(),st=getComputedStyle(el);const range=document.createRange();range.selectNodeContents(el);
 const scale=r.width/el.offsetWidth;const pad={l:parseFloat(st.paddingLeft)*scale,r:parseFloat(st.paddingRight)*scale,t:parseFloat(st.paddingTop)*scale,b:parseFloat(st.paddingBottom)*scale};
 for(const q of range.getClientRects())if(q.left<r.left+pad.l-.6||q.right>r.right-pad.r+.6||q.top<r.top+pad.t-.6||q.bottom>r.bottom-pad.b+.6)out.push({card:batch[i],sel,reason:'text outside area'});
 if(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1)out.push({card:batch[i],sel,reason:'scroll overflow'});
 const cr=c.getBoundingClientRect();if(sel==='.type'&&r.top<cr.top+cr.height*.6028-.6)out.push({card:batch[i],sel,reason:'banner enters art'});
 if(sel==='.text'&&r.top<cr.top+cr.height*.674-.6)out.push({card:batch[i],sel,reason:'rules enter art'});
 } });return out;},{batch,size});
 report.checks+=batch.length*4;report.failures.push(...failures.map(f=>({device,size:size.name,...f})));
 if((size.name==='zoom'||offset===0)&&!process.argv.includes('--bounds-only')){await pg.evaluate(()=>document.fonts.ready);await pg.evaluate(()=>Promise.all([...document.querySelectorAll('#audit img')].map(img=>img.complete?null:new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})}))));
 // Contact sheets retain inspector typography but use a tall viewport to include every face.
 await pg.setViewportSize({width:Math.ceil(6*(size.width*(size.scale||1)+12)+24),height:Math.ceil(4*(size.width*1.4*(size.scale||1)+26)+24)});
 await pg.evaluate(()=>{const h=document.getElementById('audit');h.style.overflow='hidden'});
 const file=`${device}-${size.name}-${String(offset/24).padStart(2,'0')}.png`;
 await pg.screenshot({path:path.join(OUT,file),scale:'css'});report.sheets.push(file);
 await pg.setViewportSize(DEVICES[device].viewport);
 }
 }
 }
 await ctx.close();}
 report.sheets=fs.readdirSync(OUT).filter(f=>f.endsWith('.png'));
 if(!process.argv.includes('--sheets-only'))fs.writeFileSync(path.join(OUT,'bounds-report.json'),JSON.stringify(report,null,2));console.log(`card-fit: ${report.checks} area checks; ${report.failures.length} failures; ${report.sheets.length} contact sheets`);
 if(report.failures.length)console.log(JSON.stringify(report.failures.slice(0,12),null,2));
 }finally{await browser.close();srv.close();}process.exitCode=report.failures.length?1:0;
})().catch(e=>{console.error(e);process.exit(1)});
