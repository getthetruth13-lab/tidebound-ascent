// Renderer regression: persistent scene/cards, live values, fit caching and resize.
const assert=require('node:assert/strict');
const {chromium}=require('playwright'),{start}=require('./util.js');
(async()=>{const srv=await start(0),browser=await chromium.launch();try{
 const pg=await browser.newPage({viewport:{width:832,height:384}}),errors=[];
 pg.on('pageerror',e=>errors.push(e.message));await pg.goto(srv.url);await pg.waitForFunction(()=>window.G);
 const r=await pg.evaluate(async()=>{
  await document.fonts.ready;window.FAST=1;G.settings.reduceMotion=true;
  G.newRun('duel',{seed:14,skipTravel:true});G.startCombat('fight',['knight','crab']);G.cb.mode=null;G.S.ov=null;G.render();
  const hero=document.querySelector('#hero'),enemy=document.querySelector('.en'),air=document.querySelector('.stage-air'),hand=document.querySelector('#hand');
  const cards=[...hand.querySelectorAll('.card')];const first=G.cb.hand[0];
  G.cb.energy=0;G.run.gold+=17;G.render();
  const result={hero:hero===document.querySelector('#hero'),enemy:enemy===document.querySelector('.en'),air:air===document.querySelector('.stage-air'),cards:cards.every(c=>c===document.querySelector(`.hand .card[data-uid="${c.dataset.uid}"]`)),energy:document.querySelector('#orb span').textContent,gold:document.querySelector('.stat.gold').textContent,unplayable:cards.every(c=>c.classList.contains('unp'))};
  G.cb.hand.reverse();G.render();result.order=[...hand.querySelectorAll('.card')].map(c=>+c.dataset.uid).join(',')===G.cb.hand.map(c=>c.uid).join(',');result.reorderedIdentity=cards.every(c=>c===document.querySelector(`.hand .card[data-uid="${c.dataset.uid}"]`));
  first.tmp0=true;G.render();result.cost=document.querySelector(`.hand .card[data-uid="${first.uid}"] .cost`).textContent==='0';
  first.up=true;G.render();result.upgraded=document.querySelector(`.hand .card[data-uid="${first.uid}"]`).dataset.up==='1';
  openOv('deck');openOv('deck');result.overlay=!document.querySelector('#ovl')&&hero===document.querySelector('#hero');
  G.cb.ens[0].hp=0;G.render();result.removal=document.querySelectorAll('.en').length===1&&!enemy.isConnected&&hero===document.querySelector('#hero');
  result.stage=!!document.querySelector('.stage-air.front')&&document.querySelector('.scene').style.getPropertyValue('--stage-grade')!=='';
  const {cardHTML,fitCards}=await import('/src/ui/render.js');const host=document.createElement('div');host.className='grid';document.body.append(host);
  const put=()=>{host.innerHTML=cardHTML({id:'footwork',uid:-14,up:true});const c=host.firstElementChild;c.style.width='132px';c.style.height='184.8px';return c};
  const cold=put();fitCards(host);const sizes=c=>['.name','.cost','.type','.text'].map(q=>c.querySelector(q).getAttribute('style'));
  const a=sizes(cold),warm=put();fitCards(host);result.cachedFit=JSON.stringify(a)===JSON.stringify(sizes(warm));
  let reads=0;const original=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){reads++;return original.call(this)};
  fitCards(host);Element.prototype.getBoundingClientRect=original;result.cachedReads=reads;
  warm.style.width='88px';warm.style.height='123.2px';fitCards(host);result.resized=sizes(warm).some((s,i)=>s!==a[i]);host.remove();
  G.settings.reduceMotion=false;G.settings.envFx='full';window.FAST=0;G.cb.energy=10;G.cb.hand=[{id:'thrust',uid:914,up:false}];G.render();G.playCard(0);
  const fig=document.querySelector('#hero .fig'),phase=document.querySelector('#hero .spr-slot').style.getPropertyValue('--idle-phase');
  const count=()=>document.getAnimations().filter(a=>a.effect?.target===fig).length;
  const animations=count();for(let i=0;i<8;i++)G.render();result.animationReuse=count()<=animations;result.idlePhase=document.querySelector('#hero .spr-slot').style.getPropertyValue('--idle-phase')===phase;
  return result;
 });
 for(const [k,v] of Object.entries(r)){if(k==='energy')assert.equal(v,'0/3',k);else if(k==='gold')assert.match(v,/\d+/,k);else if(k==='cachedReads')assert.equal(v,0,k);else assert.equal(v,true,k)}assert.deepEqual(errors,[]);
 console.log('Task 14: DOM identity, reorder/removal, live HUD/upgrades, overlays, stage, cached fit and resize PASS');
}finally{await browser.close();srv.close()}})().catch(e=>{console.error(e);process.exitCode=1});
