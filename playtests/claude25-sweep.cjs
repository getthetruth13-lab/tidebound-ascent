// Task 25 Part B sweep: every class x 2 viewports x (map, every enemy, bosses, events, shop, rest, chest, reward, card reward, end).
const {chromium}=require('playwright');const fs=require('fs');const {start}=require('../tests/util.js');
const OUT='screenshots/claude25/sweep';fs.mkdirSync(OUT,{recursive:true});
const VPS=[['phone',780,360,3],['tab',1480,924,1]];const CLASSES=['tide','echo','carto','duel'];
const REG=['slug','gull','knight','pod','wisp','crab','leech','lurker','penitent','mender','heap','novice','captain','warden','eel'];
const issues=[];const note=(vp,cls,scr,msg)=>{issues.push(`${vp}/${cls}/${scr}: ${msg}`)};
const CHECK=()=>{const W=innerWidth,H=innerHeight,out=[];
 if(document.documentElement.scrollWidth>W+1)out.push('page overflows horizontally');
 if(document.documentElement.scrollHeight>H+1)out.push('page overflows vertically ('+document.documentElement.scrollHeight+'>'+H+')');
 for(const el of document.querySelectorAll('#app *')){const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')continue;
  if((cs.overflowY==='auto'||cs.overflowY==='scroll')&&el.scrollHeight>el.clientHeight+2&&el.clientHeight>0){const c=(el.className&&el.className.baseVal===undefined?el.className:'')||el.tagName;out.push('scrolls: .'+String(c).split(' ').join('.')+' ('+el.scrollHeight+'>'+el.clientHeight+')')}}
 for(const s of ['.hero','.en','.hand','.endturn','#endturn']){const e=document.querySelector(s);if(!e)continue;const r=e.getBoundingClientRect();if(r.width&&(r.right<0||r.left>W||r.bottom<0||r.top>H))out.push(s+' off-screen')}
 const hero=document.querySelector('.hero .fig'),ens=[...document.querySelectorAll('.en .fig')];
 if(hero&&ens.length){const hr=hero.getBoundingClientRect();for(const e of ens){const r=e.getBoundingClientRect();if(r.width&&r.left+r.width/2<hr.left+hr.width/2)out.push('enemy left of hero')}}
 for(const e of document.querySelectorAll('.en .intent,button,.btn,.tile .name,.nameplate')){if(e.scrollWidth>e.clientWidth+3&&getComputedStyle(e).overflow!=='visible'&&e.clientWidth>0)out.push('text clipped: '+(e.className||e.tagName)+' "'+(e.textContent||'').trim().slice(0,30)+'"')}
 const ov=document.querySelector('.ov .pop,.ov>div');if(ov){const r=ov.getBoundingClientRect();if(r.left<-1||r.top<-1||r.right>W+1||r.bottom>H+1)out.push('popup exceeds viewport')}
 return out};
(async()=>{const srv=await start(0),b=await chromium.launch();
for(const [vn,w,h,dsf] of VPS){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,serviceWorkers:'block'});const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,160))});
 await pg.goto(srv.url);await pg.waitForFunction(()=>window.G);await pg.evaluate(()=>{FAST=1});
 const snap=async(cls,name,wait=700)=>{await pg.waitForTimeout(wait);await pg.screenshot({path:`${OUT}/${vn}-${cls}-${name}.png`});const r=await pg.evaluate(CHECK);r.forEach(m=>note(vn,cls,name,m))};
 const run=async(cls,fn,label)=>{try{await fn()}catch(e){note(vn,cls,label,'THREW '+e.message.slice(0,200))}};
 for(const cls of CLASSES){
  await run(cls,async()=>{await pg.evaluate(c=>{localStorage.clear();G.newRun(c,{seed:11,skipTravel:true});G.render()},cls);await snap(cls,'map')},'map');
  const fights=cls==='tide'?[...REG.map(x=>[[x],'fight']),[['crab','slug'],'fight'],[['wisp','gull'],'fight'],[['penitent','slug'],'fight'],[['mender','heap'],'fight'],[['captain'],'elite'],[['warden'],'elite'],[['eel'],'elite'],[['bell'],'boss'],[['matriarch'],'boss'],[['tenant'],'boss']]:[[['knight'],'fight'],[['mender','penitent'],'fight'],[['eel'],'elite'],[['bell'],'boss'],[['tenant'],'boss']];
  for(const [ids,kind] of fights){const lab='fight-'+ids.join('+');await run(cls,async()=>{await pg.evaluate(([c,i,k])=>{G.newRun(c,{seed:11,skipTravel:true});G.run.floor=k==='boss'?15:k==='elite'?9:7;G.startCombat(k,i);G.render()},[cls,ids,kind]);await snap(cls,lab,900)},lab)}
  await run(cls,async()=>{await pg.evaluate(c=>{G.newRun(c,{seed:12,skipTravel:true});G.startCombat('fight',['slug']);G.render()},cls);await pg.waitForTimeout(600);await pg.evaluate(()=>{G.combat$.win()});await snap(cls,'reward');
   await pg.evaluate(()=>{const rw=W.S.rows.find(r=>r.k==='cards');if(rw){W.S={...W.S,pickCards:1}}});},'reward');
  await run(cls,async()=>{await pg.evaluate(c=>{G.newRun(c,{seed:12,skipTravel:true});G.startCombat('boss',['bell']);G.render()},cls);await pg.waitForTimeout(500);await pg.evaluate(()=>{G.combat$.win()});await snap(cls,'reward-boss')},'rewardboss');
  const evs=await pg.evaluate(()=>G.EVENTS.map(e=>e.id));
  if(cls==='tide'||cls==='duel')for(const id of evs){await run(cls,async()=>{await pg.evaluate(([c,id])=>{G.newRun(c,{seed:3,skipTravel:true});W.S={screen:'event',ev:G.EVENTS.find(e=>e.id===id),t:0};G.render()},[cls,id]);await snap(cls,'event-'+id,350)},'event-'+id)}
  for(const sc of ['rest','shop','chest']){await run(cls,async()=>{await pg.evaluate(([c,sc])=>{G.newRun(c,{seed:4,skipTravel:true});G.run.gold=300;W.S={screen:sc};if(sc==='shop'){try{G.run$.openShop&&G.run$.openShop()}catch(e){}}G.render()},[cls,sc]);await snap(cls,sc)},sc)}
  await run(cls,async()=>{await pg.evaluate(c=>{G.newRun(c,{seed:5,skipTravel:true});G.run$.endRun(true)},cls);await snap(cls,'end-win',1200);
   await pg.evaluate(c=>{G.newRun(c,{seed:5,skipTravel:true});G.run$.endRun(false)},cls);await snap(cls,'end-lose',1200)},'end');
 }
 errs.forEach(e=>note(vn,'-','errors',e));await ctx.close()}
fs.writeFileSync(OUT+'/issues.txt',issues.join('\n'));console.log(issues.length+' issues');console.log([...new Set(issues)].slice(0,200).join('\n'));await b.close();srv.close&&srv.close();process.exit(0)})();
