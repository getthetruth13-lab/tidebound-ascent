// Real-UI smoke test: plays full runs ONLY by clicking DOM elements (cards, enemies, buttons, map nodes)
// in headless Chromium, using a simple sensible policy read from game state. Checks for page errors,
// stuck screens, and rendering invariants ("undefined"/"NaN" in the DOM, hp > max, negative energy).
const { chromium } = require('/workspace/game/node_modules/playwright');
const URL='file://'+__dirname+'/game-snapshot.html';
(async()=>{const b=await chromium.launch();const report=[];
for(const cls of ['tide','echo','carto','duel'])for(let n=0;n<2;n++){
 const pg=await b.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
 const errs=[],anom=new Set();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await pg.goto(URL);await pg.evaluate(()=>window.FAST=1);await pg.click(`[data-cls=${cls}]`);
 let steps=0,screens={};
 while(steps++<6000){await pg.waitForTimeout(1);
  const st=await pg.evaluate(()=>{const t=document.getElementById('app').innerText;return {s:G.S.screen,busy:G.cb&&G.cb.busy,mode:G.cb&&G.cb.mode&&G.cb.mode.k,hp:G.run.hp,max:G.run.max,en:G.cb&&G.cb.energy,
   bad:/undefined|NaN/.test(t)?t.match(/.{0,40}(undefined|NaN).{0,40}/)[0]:null}});
  screens[st.s]=(screens[st.s]||0)+1;
  if(st.bad)anom.add('text: '+st.bad);if(st.hp>st.max)anom.add('hp>max');if(st.en!=null&&st.en<0)anom.add('energy<0');
  if(st.s==='end')break;
  if(st.s==='map'){await pg.click('.node.av');continue}
  if(st.s==='combat'){
   if(st.busy){continue}
   if(st.mode==='choice'||st.mode==='slot'){await pg.locator('.ov .opt').first().click();continue}
   if(st.mode==='chart'){await pg.click('#chartdone');continue}
   const pl=await pg.evaluate(()=>{const cb=G.cb;const al=cb.ens.map((e,i)=>({e,i})).filter(x=>x.e.hp>0&&!x.e.fled);
     const inc=al.reduce((s,x)=>{const m=x.e.next&&x.e.next.mirror?{}:x.e.next;return s+(m&&m.a?m.a*(m.h||1):0)},0);
     const els=[...document.querySelectorAll('.hand .card')];const ok=cb.hand.map((c,i)=>({c,i,d:G.CARDS[c.id]})).filter(x=>els[x.i]&&!els[x.i].classList.contains('unp'));
     if(!ok.length)return null;const blk=['S'];let x=ok.find(x=>x.d.t==='P'||x.d.t==='W')||(cb.p.block<inc?ok.find(x=>x.d.t==='S'&&/Block|Parry/.test(x.d.d)):null)||ok.find(x=>x.d.t==='A')||ok.find(x=>x.d.t!=='X')||ok[0];
     const tg=al.sort((a,b)=>a.e.hp-b.e.hp)[0];return {i:x.i,t:tg?tg.i:null,multi:al.length>1}});
   if(!pl){await pg.click('#endbtn');continue}
   if(pl.multi&&pl.t!=null)await pg.click(`.en[data-en="${pl.t}"]`);
   const card=pg.locator('.hand .card').nth(pl.i);await card.click();await pg.click('#playbtn');continue}
  if(st.s==='reward'){await pg.locator('.grid .card').first().click();continue}
  if(st.s==='rest'){await pg.locator('.btn').filter({hasText:st.hp<st.max*0.5?'Rest':'Smith'}).click();continue}
  if(st.s==='event'){await pg.locator('.opt:not([disabled])').first().click();continue}
  if(st.s==='shop'){const c=pg.locator('.grid .card:not(.unp)');if(await c.count())await c.first().click();await pg.click('text=Leave shop');continue}
  if(st.s==='pick'){await pg.locator('.grid .card').first().click();continue}
  if(st.s==='msg'){await pg.click('text=Continue');continue}
  anom.add('unknown screen '+st.s);break}
 const fin=await pg.evaluate(()=>({won:G.run.won,floor:G.run.floor,hp:G.run.hp,deck:G.run.deck.length}));
 report.push({cls,run:n,...fin,steps,errors:errs.slice(0,5),anomalies:[...anom].slice(0,8),screens});await pg.close()}
console.log(JSON.stringify(report,null,1));await b.close()})();
