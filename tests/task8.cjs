// Claude Task 8: card-based choice screens (Chart drag with real touch), card-mention previews, long-press enlarge,
// illustrated tiles everywhere, Lamplight UI. Run: node tests/task8.cjs
const {chromium}=require('playwright');const {start,DEVICES,cardPoint}=require('./util.js');
let pass=0,fail=0;const check=(n,c,d)=>{if(c){pass++;console.log('  ✔',n)}else{fail++;console.log('  ✘',n,d!==undefined?JSON.stringify(d):'')}};
(async()=>{const srv=await start(0);const b=await chromium.launch();
const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const cdp=await ctx.newCDPSession(p);
const T=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:4,radiusY:4,force:1}]});
const tap=async(x,y)=>{await T('touchStart',x,y);await p.waitForTimeout(60);await T('touchEnd')};
const dragTouch=async(a,c,steps=14)=>{await T('touchStart',a.x,a.y);await p.waitForTimeout(40);for(let i=1;i<=steps;i++){await T('touchMove',a.x+(c.x-a.x)*i/steps,a.y+(c.y-a.y)*i/steps);await p.waitForTimeout(16)}await p.waitForTimeout(80);await T('touchEnd')};
const center=sel=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}},sel);
await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.waitForLoadState('networkidle');await p.evaluate(()=>{window.FAST=1;localStorage.clear()});
const fresh=(cls,seed=5)=>p.evaluate(([c,s])=>{localStorage.clear();G.newRun(c,{seed:s,skipTravel:true,fullPool:true});G.run.floor=3;G.run.relics=[]},[cls,seed]);
const fits=sel=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)return 'missing '+s;const r=e.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1?true:`out ${s} ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`},sel);
// ============ 1. Chart: real cards, touch drag, bottom drop zone ============
console.log('# 1. Chart screen');
await fresh('carto');
const setup=()=>p.evaluate(()=>{G.startCombat('fight',['crab']);const mk=G.cards$.mk,id=n=>Object.values(G.CARDS).find(c=>c.n===n).id;const cb=G.cb;if(cb.mode)cb.mode=null;
 cb.draw=['Bearing Shot','Survey','Signal Fire','Field Tent','Bearing Shot'].map(n=>mk(id(n)));cb.chartIds=cb.draw.map(c=>c.id);G.combat$.chart(4);G.render()});
await setup();await p.waitForTimeout(400);
check('chart shows real rendered cards (4) with art frame',await p.evaluate(()=>document.querySelectorAll('#chartcards .cslot .card').length===4&&!!document.querySelector('#chartcards .card .frame,#chartcards .card .cfr')&&!document.querySelector('.ov .row')));
check('#1 clearly marked as drawn first',await p.evaluate(()=>/drawn first/i.test(document.querySelector('#chartcards .cslot.first .cnum').innerText)));
check('bottom drop zone present',!!await center('#chartbottom'));
check('chart fits 832x384',(await fits('#chartbox'))===true,await fits('#chartbox'));check('Done fits',(await fits('#chartdone'))===true,await fits('#chartdone'));
const order=()=>p.evaluate(()=>W.cb.draw.slice(0,5).map(c=>G.CARDS[c.id].n));
const before=await order();
let a=await center('#chartcards .cslot[data-i="0"] .card'),c=await center('#chartcards .cslot[data-i="2"] .card');
await dragTouch(a,c);await p.waitForTimeout(250);
let after=await order();check('touch-drag card 1 to position 3 reorders the pile',after[0]===before[1]&&after[1]===before[2]&&after[2]===before[0],{before,after});
check('chart still open after the drag, W.chartDrag cleared',await p.evaluate(()=>W.cb.mode&&W.cb.mode.k==='chart'&&!W.chartDrag));
// drag back the other way with the mouse
a=await center('#chartcards .cslot[data-i="3"] .card');c=await center('#chartcards .cslot[data-i="0"] .card');
await p.mouse.move(a.x,a.y);await p.mouse.down();for(let i=1;i<=12;i++){await p.mouse.move(a.x+(c.x-a.x)*i/12,a.y+(c.y-a.y)*i/12);await p.waitForTimeout(12)}await p.mouse.up();await p.waitForTimeout(250);
const o2=await order();check('mouse-drag card 4 to the front',o2[0]===after[3]&&o2[1]===after[0],{after,o2});
// drop on Bottom with touch
const nb=await p.evaluate(()=>W.cb.draw.length);const second=(await order())[1];
a=await center('#chartcards .cslot[data-i="1"] .card');c=await center('#chartbottom');await dragTouch(a,c);await p.waitForTimeout(250);
const o3=await order();check('drop on Bottom sends the card to the bottom (once)',await p.evaluate(()=>W.cb.mode.moved&&W.cb.mode.n===3)&&o3.slice(0,3).join()!==o2.slice(0,3).join()&&await p.evaluate(([n,s])=>W.cb.draw.length===n&&G.CARDS[W.cb.draw[W.cb.draw.length-1].id].n===s,[nb,second]),{o2,o3});
check('bottom zone used afterwards',await p.evaluate(()=>document.querySelector('#chartbottom').classList.contains('used')&&document.querySelectorAll('#chartcards .cslot').length===3));
// a short tap on a card does nothing / long-press opens the enlarged card, release closes it
a=await center('#chartcards .cslot[data-i="0"] .card');const o4=await order();await tap(a.x,a.y);await p.waitForTimeout(100);check('tap on a chart card changes nothing',(await order()).join()===o4.join());
await T('touchStart',a.x,a.y);await p.waitForTimeout(700);check('long-press (0.5s) on a chart card opens the large card',await p.evaluate(()=>!!document.querySelector('#inspect .card')));
await T('touchEnd');await p.waitForTimeout(250);check('releasing closes it, order unchanged',await p.evaluate(()=>!document.querySelector('#inspect'))&&(await order()).join()===o4.join());
await p.evaluate(()=>modeAct('done'));await p.waitForTimeout(200);check('Done closes the chart',await p.evaluate(()=>!W.cb.mode));
// ============ 2. choices as cards / tiles in combat ============
console.log('# 2. Combat choices');
await p.evaluate(()=>{G.cb.mode=null;G.giveRelic('sextant');W.cb.startQ=[];G.combat$.choose('Brass Sextant: choose your starting Waypoint (upgraded, Rank 1)',['lookout','watch','camp'].filter(i=>G.CARDS[i]).map(id=>({l:G.CARDS[id].n+'+',card:{id,up:true,rank:1},cap:'Rank 1',f:()=>{}})));G.render()});await p.waitForTimeout(300);
check('Sextant choice shows 3 real cards, not text rows',await p.evaluate(()=>document.querySelectorAll('#choicebox .tcard .card').length===3&&!document.querySelector('#choicebox .btn.opt')));
check('choice box fits',(await fits('#choicebox'))===true,await fits('#choicebox'));
await p.evaluate(()=>{W.cb.mode=null;W.cb.slots=[G.cards$.mk('lookout'),G.cards$.mk('watch')].filter(x=>x.id);G.combat$.pickSlot('Slots full: replace which Waypoint?',()=>{});G.render()});await p.waitForTimeout(200);
check('slot pick shows real Waypoint cards',await p.evaluate(()=>document.querySelectorAll('#slotbox .card').length>=1));
await fresh('tide');await p.evaluate(()=>{G.giveRelic('moonshell');G.startCombat('fight',['crab'])});await p.waitForTimeout(300);
check('Moon Shell choice = 3 illustrated tiles with art slots and summaries',await p.evaluate(()=>{const t=[...document.querySelectorAll('#choicebox .tile')];return t.length===3&&t.every(x=>x.querySelector('.tart [data-tile]')&&x.querySelector('.tname')&&x.querySelector('.tsum').textContent.length>3&&x.dataset.info)}));
// ============ 3. long-press enlarge everywhere; no accidental play ============
console.log('# 3. Long-press / right-click / hover-hold');
await p.evaluate(()=>{modeAct('choice',0)});await p.waitForTimeout(900);
const st0=await p.evaluate(()=>({hand:W.cb.hand.length,en:W.cb.energy,disc:W.cb.disc.length}));
const hp=await cardPoint(p,0);await T('touchStart',hp.x,hp.y);await p.waitForTimeout(250);check('before 0.5 s nothing is open',await p.evaluate(()=>!document.querySelector('#inspect')));await p.waitForTimeout(450);
check('hand card: hold 0.5 s opens the large window',await p.evaluate(()=>!!document.querySelector('#inspect .card')));await T('touchEnd');await p.waitForTimeout(300);
check('hand card: release closes it and nothing was played or dragged',await p.evaluate(s=>!document.querySelector('#inspect')&&W.cb.hand.length===s.hand&&W.cb.energy===s.en&&W.cb.disc.length===s.disc&&W.cb.sel==null,st0),await p.evaluate(()=>({sel:W.cb.sel,h:W.cb.hand.length})));
await T('touchStart',hp.x,hp.y);await p.waitForTimeout(150);await T('touchMove',hp.x+3,hp.y-60);await p.waitForTimeout(600);await T('touchEnd');await p.waitForTimeout(200);
check('a drag never opens the enlarge window',await p.evaluate(()=>!document.querySelector('#inspect')));
await p.evaluate(()=>{W.S.ov='draw';G.render()});await p.waitForTimeout(200);let pc=await center('#ovl .card');await T('touchStart',pc.x,pc.y);await p.waitForTimeout(650);
check('pile viewer: long-press enlarges',await p.evaluate(()=>!!document.querySelector('#inspect .card')));await T('touchEnd');await p.waitForTimeout(250);
await p.evaluate(()=>{W.S.ov=null;G.render()});
await fresh('duel');await p.evaluate(()=>{G.run$.combatRewards('fight',{});const S=W.S;S.rows.push({k:'cards',cards:Object.values(G.CARDS).filter(c=>c.cls==='duel'&&c.r==='c').slice(0,3).map(c=>c.id)});S.cardsOpen=S.rows.length-1;G.render()});await p.waitForTimeout(300);
pc=await center('.rewgrid .card');await T('touchStart',pc.x,pc.y);await p.waitForTimeout(650);check('card reward: long-press enlarges (no pick)',await p.evaluate(()=>!!document.querySelector('#inspect .card')&&W.S.cardsOpen!=null));await T('touchEnd');await p.waitForTimeout(250);
check('card reward: nothing picked after release',await p.evaluate(()=>W.S.screen==='reward'&&W.S.cardsOpen!=null&&!W.S.rows.some(r=>r.took)));
await p.evaluate(()=>{G.run$.openShop();G.render()});await p.waitForTimeout(300);pc=await center('#cardshelf .shopitem .card');const g0=await p.evaluate(()=>G.run.gold);await T('touchStart',pc.x,pc.y);await p.waitForTimeout(650);
check('shop: long-press enlarges',await p.evaluate(()=>!!document.querySelector('#inspect .card')));await T('touchEnd');await p.waitForTimeout(250);check('shop: nothing bought',await p.evaluate(g=>G.run.gold===g,g0));
await p.evaluate(()=>{W.S={screen:'pick',mode:'upgrade',title:'Temper',then:G.run$.goMap,cancel:null};G.render()});await p.waitForTimeout(250);pc=await center('.page .grid .card');await T('touchStart',pc.x,pc.y);await p.waitForTimeout(650);
check('pick screen (upgrade/remove): long-press enlarges',await p.evaluate(()=>!!document.querySelector('#inspect .card')&&W.S.screen==='pick'));await T('touchEnd');await p.waitForTimeout(250);
await p.evaluate(()=>{W.S={screen:'map'};W.S.ov='deck';G.render()});await p.waitForTimeout(250);pc=await center('#ovl .card');await T('touchStart',pc.x,pc.y);await p.waitForTimeout(650);check('deck view: long-press enlarges',await p.evaluate(()=>!!document.querySelector('#inspect .card')));await T('touchEnd');await p.waitForTimeout(250);
await p.evaluate(()=>{W.S={screen:'map'};G.render()});
// desktop: right-click and hover-hold
const dctx=await b.newContext({...DEVICES.desktop,serviceWorkers:'block'});const d=await dctx.newPage();await d.goto(srv.url+'index.html');await d.waitForFunction(()=>window.G);await d.evaluate(()=>{window.FAST=1;localStorage.clear();G.newRun('duel',{seed:5,skipTravel:true,fullPool:true});G.run.floor=3;W.S={screen:'map'};W.S.ov='deck';G.render()});await d.waitForTimeout(300);
let dc=await d.evaluate(()=>{const r=document.querySelector('#ovl .card').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
await d.mouse.click(dc.x,dc.y,{button:'right'});await d.waitForTimeout(250);check('desktop: right-click enlarges',await d.evaluate(()=>!!document.querySelector('#inspect .card')));await d.mouse.click(5,5);await d.waitForTimeout(250);
check('desktop: click closes it',await d.evaluate(()=>!document.querySelector('#inspect')));
await d.evaluate(()=>{W.S={screen:'map'};W.S.ov='deck';G.render()});await d.waitForTimeout(250);dc=await d.evaluate(()=>{const r=document.querySelector('#ovl .card').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});
await d.mouse.move(dc.x,dc.y);await d.waitForTimeout(1300);check('desktop: hover-hold enlarges',await d.evaluate(()=>!!document.querySelector('#inspect .card')));
// ============ 4. card mentions ============
console.log('# 4. Card mentions');
await d.mouse.click(5,5);await d.waitForTimeout(200);await d.evaluate(()=>{window.FAST=1;W.S={screen:'msg',title:'The Cartomancer',text:'You find a Bearing Shot and a Signal Fire in the sand. The Parry of the old duellist is gone.',next:G.run$.goMap};G.render()});await d.waitForTimeout(300);
const refs=await d.evaluate(()=>[...document.querySelectorAll('.msgp .cref')].map(e=>e.textContent+':'+e.dataset.card));check('card names are highlighted (.cref), keywords stay keywords',refs.length===2&&refs[0].startsWith('Bearing Shot')&&await d.evaluate(()=>!!document.querySelector('.msgp .kw')),refs);
const rc=await d.evaluate(()=>{const r=document.querySelector('.msgp .cref').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});await d.mouse.move(rc.x,rc.y);await d.waitForTimeout(300);
check('desktop hover pops up the full rendered card',await d.evaluate(()=>{const t=document.getElementById('cardtip');return !!t&&t.classList.contains('on')&&!!t.querySelector('.card .frame,.card .cfr')&&t.querySelector('.card').dataset.id===document.querySelector('.msgp .cref').dataset.card}));
await d.mouse.move(5,5);await d.waitForTimeout(300);check('moving away hides it',await d.evaluate(()=>!document.getElementById('cardtip').classList.contains('on')));
const tctx=ctx;await p.evaluate(()=>{W.S={screen:'msg',title:'The Cartomancer',text:'You find a Bearing Shot and a Signal Fire in the sand.',next:G.run$.goMap};G.render()});await p.waitForTimeout(300);
const tc=await center('.msgp .cref');await tap(tc.x,tc.y);await p.waitForTimeout(300);check('touch tap pops up the full card',await p.evaluate(()=>document.getElementById('cardtip').classList.contains('on')));
await tap(30,300);await p.waitForTimeout(250);check('tap elsewhere closes it',await p.evaluate(()=>!document.getElementById('cardtip').classList.contains('on')));
// ============ 5. illustrated tiles: no screen is a list of text buttons ============
console.log('# 5. UI audit');
const seenTiles=new Set();const audit=async(name,{min=1,noText=true}={})=>{const r=await p.evaluate(()=>{const t=[...document.querySelectorAll('.tile')],c=document.querySelectorAll('.tcard .card');const texty=[...document.querySelectorAll('.page .btn.opt,.ov .btn.opt,.rrow,.campopts .btn')].length;
  return {tiles:t.length,cards:c.length,texty,art:t.every(x=>x.querySelector('.tart')),ids:[...document.querySelectorAll('[data-tile]')].map(e=>e.dataset.tile).filter(Boolean)}});r.ids.forEach(i=>seenTiles.add(i));
 check(`${name}: illustrated (${r.tiles} tiles, ${r.cards} cards, art slots, no text rows)`,r.tiles+r.cards>=min&&r.texty===0&&r.art,r)};
await fresh('carto');
await p.evaluate(()=>{G.run$.combatRewards('elite',{});G.render()});await audit('reward',{min:2});
check('reward tiles + Proceed fit one screen',(await fits('#proceed'))===true,await fits('#proceed'));
await p.evaluate(()=>{G.run$.openChest();G.render()});await audit('chest (closed)',{min:0});await p.evaluate(()=>{openChestLid()});await p.waitForTimeout(700);await audit('chest (open)',{min:1});
await p.evaluate(()=>{G.giveRelic('pumice');W.S={screen:'rest'};G.render()});await audit('camp',{min:3});check('camp fits',(await fits('.camptiles'))===true,await fits('.camptiles'));
await p.evaluate(()=>{G.run$.pickPotions(3,'Pick');});await audit('potion pick',{min:2});
await p.evaluate(()=>{G.run.potions=['salttonic','salttonic','salttonic'];G.run$.combatRewards('elite',{});W.S.rows=[{k:'potion',id:'inkvial'}];W.S.swap=0;G.render()});await audit('potion swap',{min:2});
const evs=await p.evaluate(()=>G.EVENTS.map(e=>e.id));let evBad=[];
for(const id of evs){await p.evaluate(id=>{G.newRun('carto',{seed:9,skipTravel:true,fullPool:true});G.run.gold=300;W.S={screen:'event',ev:G.EVENTS.find(e=>e.id===id),t:Date.now()};G.render()},id);await p.waitForTimeout(60);
 const r=await p.evaluate(()=>({tiles:document.querySelectorAll('.evtiles .tile,.evtiles .tcard').length,texty:document.querySelectorAll('.btn.opt,.evopts').length,fit:(()=>{const r=document.querySelector('.evtiles').getBoundingClientRect();return r.bottom<=innerHeight+1&&r.right<=innerWidth+1})(),src:[...document.querySelectorAll('[data-tile]')].map(e=>e.dataset.tile)}));r.src.forEach(i=>seenTiles.add(i));if(!r.tiles||r.texty||!r.fit)evBad.push([id,r])}
check(`all ${evs.length} events: options are tiles/cards and fit the screen`,evBad.length===0,evBad.slice(0,3));
// event follow-up choice screens (relic / card options inside events)
await p.evaluate(()=>{G.newRun('carto',{seed:9,skipTravel:true,fullPool:true});const ev=G.EVENTS.find(e=>e.id==='wishing');W.S={screen:'event',ev,t:Date.now()};G.run.relics=[];G.giveRelic('anklet');G.giveRelic('biscuit');ev.o[0].f();});await p.waitForTimeout(200);await audit('event sub-choice (relics)',{min:2});
// (i) button: tap shows the full explanation without choosing; Moon Draught (7 options) fits
await fresh('tide');await p.evaluate(()=>{G.run.potions=['moondraught',null,null];G.startCombat('fight',['crab']);W.cb.mode=null;G.render();G.usePotion?0:0});
await p.evaluate(()=>{G.cb.mode=null;G.combat$.choose('🌙 Moon Draught: set the Tide',[0,2,4,5,6,8,10].map(v=>({l:'🌙 Tide '+v,tile:'choice-tide-set',sum:v===10?'Crest':v===0?'Undertow':'',f:()=>{}})));G.render()});await p.waitForTimeout(250);
check('Moon Draught: 7 tiles fit the screen',await p.evaluate(()=>document.querySelectorAll('#choicebox .tile').length===7)&&(await fits('#choicebox'))===true,await fits('#choicebox'));
await p.evaluate(()=>{G.cb.mode=null;W.S={screen:'rest'};G.render()});await p.waitForTimeout(200);
const ic=await center('.camptiles .tile:nth-child(1) .tipi');await tap(ic.x,ic.y);await p.waitForTimeout(300);
check('tapping a tile\'s (i) shows the full explanation and does not pick it',await p.evaluate(()=>document.getElementById('kwtip').classList.contains('on')&&W.S.screen==='rest'));
// Lamplight
console.log('# 6. Lamplight screens');
await p.evaluate(()=>{localStorage.clear();G.progress.resetProfile();const q=G.progress.loadProfile();q.climb=650;q.xp.tide=200;q.unlocked.cards=['seesaw'];G.progress.saveProfile(q);W.run=null;openLedger('tide')});await p.waitForTimeout(300);
check('Ledger: lantern track with one lantern per level and next reward label',await p.evaluate(()=>document.querySelectorAll('#lptrack .lp-node').length===10&&document.querySelectorAll('#lptrack .lp-node.lit').length===2&&/Uncommon card/.test(document.querySelector('.lp-nxt').innerText)));
check('Ledger: locked cards are dark silhouettes, unlocked are real cards',await p.evaluate(()=>document.querySelectorAll('#ledgergrid .lp-lock .lp-seal').length>=10&&document.querySelectorAll('#ledgergrid .card').length>=20));
check('Ledger header fits',(await fits('.lp-head'))===true,await fits('.lp-head'));
await p.evaluate(()=>openLedger('climb'));await p.waitForTimeout(200);check('Stair Climb view: 8-lantern track + shrouded relic/potion silhouettes',await p.evaluate(()=>document.querySelectorAll('#lptrack .lp-node').length===8&&document.querySelectorAll('#ledgergrid .lp-lock.lp-li').length>=6));
await p.click('#ledgerclaim');await p.waitForTimeout(300);
check('Stair pick: relic tiles with art slot, tag and (i)',await p.evaluate(()=>{const t=[...document.querySelectorAll('.lp-offer .tile')];return t.length===3&&t.every(x=>x.querySelector('.tart .slot')&&x.querySelector('.ttag')&&x.querySelector('.tipi'))}));
check('pick fits',(await fits('#lamppick'))===true,await fits('#lamppick'));
await p.evaluate(()=>{W.S={screen:'title',view:'ledger',tab:'tide'};G.render()});await p.click('#ledgerclaim');await p.waitForTimeout(300);
check('class pick: 3 real rendered cards, rarity caption',await p.evaluate(()=>document.querySelectorAll('.lp-offer .lp-pick .card').length===3&&document.querySelectorAll('.lp-offer .tcap').length===3));
await p.evaluate(()=>{localStorage.clear();G.progress.resetProfile();G.newRun('tide',{seed:55,skipTravel:true});G.run.lamp.fights=7;G.run.lamp.elites=2;G.run.floor=11;G.run.lamp.tasks[0].done=true;G.run$.endRun(false)});await p.waitForTimeout(800);
check('end summary: banner, itemised rows, animated total + two lantern bars, task chips',await p.evaluate(()=>!!document.querySelector('.lp-banner')&&document.querySelectorAll('.lp-lines tr').length>=4&&!!document.querySelector('.lp-count b')&&document.querySelectorAll('.lp-row .lp-bar.anim').length===2&&document.querySelectorAll('.lp-tsk').length===3));
check('end summary fits',(await fits('.lp-sum'))===true,await fits('.lp-sum'));
await p.evaluate(()=>{G.newRun('echo',{seed:56,skipTravel:true});W.S={screen:'map'};W.S.ov='tasks';G.render()});await p.waitForTimeout(200);
check('Lantern Tasks: 3 illustrated task cards',await p.evaluate(()=>document.querySelectorAll('.lp-taskbox .lp-task .tart [data-tile]').length===3));
check('tasks fit',(await fits('.lp-taskbox'))===true,await fits('.lp-taskbox'));
// ============ 7. art manifest ============
console.log('# 7. Art manifest');
const man=await p.evaluate(async()=>(await (await fetch('art/v2/ui/tiles.json')).json()).tiles);
const missing=[...seenTiles].filter(i=>!man[i]);check('every tile id the game rendered has a slot in art/v2/ui/tiles.json',missing.length===0,missing);
check('every slot has path + size + description',Object.values(man).every(t=>t.path&&t.size&&t.size.length===2&&t.desc),null);
check(`no page errors`,errs.length===0,errs.slice(0,3));
console.log(`\ntask8: ${pass} passed, ${fail} failed`);await b.close();process.exit(fail?1:0)})();
