// Mechanics + UI interaction tests. Exit code 1 on any failure. Run: node mech.js
const { chromium } = require('playwright');const {start,DEVICES,cardPoint,tapCardUI,dragCardUI}=require('./tests/util.js');
let pass=0,fail=0;const fails=[];
function check(name,cond,detail){if(cond){pass++;console.log('  ✔',name)}else{fail++;fails.push(name);console.log('  ✘',name,detail!==undefined?JSON.stringify(detail):'')}}
(async()=>{const srv=await start(0);const b=await chromium.launch();
const ctx=await b.newContext({...DEVICES.s24Landscape,serviceWorkers:'block'});const pg=await ctx.newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);await pg.evaluate(()=>window.FAST=1);
// ---------- pure mechanics (driven through game functions) ----------
await pg.addScriptTag({path:__dirname+'/tests/p1/checks.js'});
// v2.1 numbers (design/data-v2.json v21.sim.core): Crest 14, Undertow 12 Guard + draw 1, Parry reflects 50%,
// Duel Focus +1, Flourish x(1+0.5/Momentum), Mark +1 per card after it, Warden mirror 15/12/15, Bell cracks at 80 HP.
// Each fresh run drops the starter relic (P1.fr) so Moon Shell / Sextant choices don't interfere.
const R=await pg.evaluate(()=>{const R={};const {mkc,fr,hand,res}=P1;
 const setHand=ids=>{hand(ids)};const play=(i,o)=>G.playCard(i,o||{});
 // Tide: Lash x2 -> Surge 3 twice -> Crest (14 to ALL) -> back to 5
 fr('tide',['bell']);setHand(['lash','lash','splash']);let hp0=G.cb.ens[0].hp;play(0);const t1=G.cb.tide;play(0);R.tide={after1:t1,afterCrest:G.cb.tide,dmg:hp0-G.cb.ens[0].hp};
 // Echo Mage: Mark Feedback, play Arc after it -> the Echo is Feedback's Resound (10) +1
 fr('echo',['bell']);setHand(['feedback','arc']);const e0=G.cb.ens[0].hp;play(0,{mark:true});play(0);const mid=G.cb.ens[0].hp;P1.idle();endTurn();R.echo={playDmg:e0-mid,echoDmg:mid-G.cb.ens[0].hp};
 // Echo fallback: nothing Marked -> the last non-Faint card Echoes at the v2.2 fallback (¼)
 fr('echo',['bell']);setHand(['arc']);const f0=G.cb.ens[0].hp;play(0);const f1=G.cb.ens[0].hp;P1.idle();endTurn();R.echoHalf={play:f0-f1,echo:f1-G.cb.ens[0].hp};
 // Cartographer: starting Waypoint, draw 4, Trailblaze 7 + 2 per Waypoint
 fr('carto',['bell']);R.carto={slots0:G.cb.slots.length,hand:G.cb.hand.length};setHand(['camp','trail']);play(0);res();const h1=G.cb.ens[0].hp;play(0);R.carto.trailDmg=h1-G.cb.ens[0].hp;R.carto.slots=G.cb.slots.length;
 // Duelist: Momentum starts 1, +1 per card; Flourish x(1+0.5m) with Duel Focus +1
 fr('duel',['bell']);setHand(['thrust','thrust','thrust','lunge']);R.duelStart=G.cb.mom;play(0);play(0);play(0);const m3=G.cb.mom;const d1=G.cb.ens[0].hp;play(0,{flourish:true});R.duel={mom3:m3,flourishDmg:d1-G.cb.ens[0].hp,momAfter:G.cb.mom};
 // Boss: the Bell cracks at 80 HP: phase 2, +2 Might, next intent Crack
 fr('tide',['bell'],[],{kind:'boss'});const bell=G.cb.ens[0];dmgEnemy(bell,bell.hp-79);R.boss={ph:bell.ph,next:bell.next.lbl,str:bell.st.str,hp:bell.hp};
 // Low Note discount (regression: module refactor)
 fr('echo',['bell']);G.cb.hand=[mkc('lownote'),mkc('prism')];G.cb.energy=3;play(0);R.lownote={cost:cost(G.cb.hand[0]),energy:G.cb.energy};play(0);R.lownote.after=G.cb.energy;
 // FIX 1: Whirlpool surges once per hit (3 hits -> 3 Surges), not per enemy; no Surge for hits with nothing left
 fr('tide',['bell']);G.cb.tide=2;setHand(['whirl']);play(0);R.whirl1=G.cb.tide;
 fr('tide',['knight','knight']);G.cb.ens.forEach(e=>e.block=0);/* v2.2 opening Guard off: this measures Whirlpool */G.cb.tide=2;setHand(['whirl']);const kh=G.cb.ens.map(e=>e.hp);play(0);R.whirl2={tide:G.cb.tide,dmg:G.cb.ens.map((e,i)=>kh[i]-e.hp)};
 fr('tide',['slug']);G.cb.ens[0].hp=3;G.cb.ens[0].block=0;G.cb.tide=2;setHand(['whirl']);const kc=G.cb;play(0);R.whirlKill={tide:kc.tide,screen:G.S.screen};
 fr('tide',['bell']);G.cb.tide=8;setHand(['whirl']);play(0);R.whirlCrest={tide:G.cb.tide,log:G.cb.log.join('|')};
 // FIX 2: Moonpull -> 9 then Surge reaches 10 => Crest; Moonpull -> 1 then Recede reaches 0 => Undertow
 fr('tide',['bell']);setHand(['moonpull','splash']);let b0=G.cb.ens[0].hp;play(0);R.moonMode=G.cb.mode&&G.cb.mode.k;modeAct('choice',0);R.moon9={tide:G.cb.tide,high:F(mkc('splash'),{}).high};play(0);R.moon9.after=G.cb.tide;R.moon9.dmg=b0-G.cb.ens[0].hp;R.moon9.log=G.cb.log.join('|');
 fr('tide',['bell']);setHand(['moonpull','brace']);play(0);modeAct('choice',1);R.moon1={tide:G.cb.tide,low:F(mkc('brace'),{}).low};const hs=G.cb.hand.length;play(0);R.moon1.after=G.cb.tide;R.moon1.block=G.cb.p.block;R.moon1.drew=G.cb.hand.length-(hs-1);R.moon1.log=G.cb.log.join('|');
 fr('tide',['bell']);G.cb.hand=[mkc('moonpull',true)];G.cb.energy=3;play(0);modeAct('choice',0);R.moonUp={energy:G.cb.energy,exh:G.cb.exh.map(c=>c.id)};
 // FIX 3: Parry triggers once per turn (two attackers / one multi-hit attacker) and reflects 50%
 fr('duel',['knight','knight']);G.cb.ens.forEach(e=>e.next={a:9});const ph=G.cb.ens.map(e=>e.hp);G.cb.hand=[mkc('parry')];play(0);endTurn();
 R.parry2={back:G.cb.ens.map((e,i)=>ph[i]-e.hp),log:G.cb.log.join('|')};
 fr('duel',['bell'],[],{kind:'boss'});G.cb.ens[0].next={a:5,h:3,lbl:'Reverberate'};const bh=G.cb.ens[0].hp;G.cb.hand=[mkc('counter')];play(0);endTurn();R.parryMulti=bh-G.cb.ens[0].hp;
 G.cb.ens[0].next={a:5,h:3};const bh2=G.cb.ens[0].hp;G.cb.hand=[mkc('parry')];G.cb.energy=3;play(0);endTurn();R.parryNext=bh2-G.cb.ens[0].hp;
 // FIX 4 (v2.1): Mirror Warden mirrors the last card type you played this turn; nothing played -> it punishes idleness (15)
 fr('tide',['warden'],[],{kind:'elite'});const w=G.cb.ens[0];R.warden0=intentOf(w);const php=G.run.hp;G.cb.p.block=0;G.cb.hand=[];endTurn();R.wardenFallbackDmg=php-G.run.hp;
 setHand(['brace']);play(0);R.wardenSkill=intentOf(w);setHand(['splash']);play(0);R.wardenAtk=intentOf(w);
 R.wardenText=intentText(w);
 // FIX 5: player's Soaked/Exposed tick at the START of the enemy turn
 fr('tide',['slug']);G.cb.ens[0].t=0;G.cb.ens[0].next={a:6};G.cb.p.st={weak:2,vuln:1};G.cb.p.block=0;const hp5=G.run.hp;G.cb.hand=[];endTurn();
 R.tick={st:{...G.cb.p.st},dmg:hp5-G.run.hp};
 fr('tide',['wisp']);G.cb.ens[0].next={w:2,lbl:'Dazzle'};G.cb.hand=[];endTurn();R.tickNew={...G.cb.p.st};G.cb.hand=[];G.cb.ens[0].next={none:1};endTurn();R.tickNew2={...G.cb.p.st};
 return R});
console.log('Mechanics (v2.2 numbers):');
check('Tidal Lash x2: Surge 3 twice reaches 10 -> Crest 14 to ALL (Task 9), Tide back to 5 (12+12+14)',R.tide.after1===8&&R.tide.afterCrest===5&&R.tide.dmg===38,R.tide);
check('Echo Mage: Marked Feedback (v2.2: 7, Resound 9) Echoes with Resound +1 for the card after it',R.echo.playDmg===14&&R.echo.echoDmg===10,R.echo);
check('Echo Mage: with nothing Marked the last card Echoes at ¼ (v2.2; Arc 7 -> 1)',R.echoHalf.play===7&&R.echoHalf.echo===1,R.echoHalf);
check('Cartographer: starts with 1 Waypoint, draws 4, Trailblaze 7 + 2 per Waypoint (2 -> 11)',R.carto.slots0===1&&R.carto.hand===4&&R.carto.trailDmg===11&&R.carto.slots===2,R.carto);
check('Duelist: Momentum starts at 1, +1 per card; Flourish at 4 = x3 (Lunge 10 + Focus 1 -> 33) and spends it',R.duelStart===1&&R.duel.mom3===4&&R.duel.flourishDmg===33&&R.duel.momAfter<=1,R);
check('Boss: the Bell cracks at 80 HP -> phase 2, +2 Might, next intent Crack',R.boss.ph===2&&R.boss.next==='Crack'&&R.boss.str===2,R.boss);
check('Low Note: next card costs 1 less (Prism 2 -> 1)',R.lownote.cost===1&&R.lownote.after===1,R.lownote);
console.log('Fix 1: Whirlpool');
check('Whirlpool vs 1 enemy: 3 hits -> Surge 3 (2->5)',R.whirl1===5,R.whirl1);
check('Whirlpool vs 2 enemies: still Surge once per hit (2->5), 9 dmg each',R.whirl2.tide===5&&R.whirl2.dmg.every(d=>d===9),R.whirl2);
check('Whirlpool: no Surge for hits after all enemies are dead (2->3)',R.whirlKill.tide===3,R.whirlKill);
check('Whirlpool at Tide 8 Crests mid-card, then keeps surging (ends at 6)',R.whirlCrest.tide===6&&/CREST/.test(R.whirlCrest.log),R.whirlCrest);
console.log('Fix 2: Moonpull');
check('Moonpull opens the 9/1 choice',R.moonMode==='choice');
check('Moonpull -> 9 counts as High Tide',R.moon9.tide===9&&R.moon9.high===true,R.moon9);
check('Moonpull 9 + Surge 1 triggers Crest (6 + 14 dmg, Tide back to 5)',R.moon9.after===5&&R.moon9.dmg===20&&/CREST/.test(R.moon9.log),R.moon9);
check('Moonpull -> 1 counts as Low Tide',R.moon1.tide===1&&R.moon1.low===true,R.moon1);
check('Moonpull 1 + Recede 1 triggers Undertow (5 + 12 Guard, draw 1, Tide 5)',R.moon1.after===5&&R.moon1.block===17&&R.moon1.drew===1&&/UNDERTOW/.test(R.moon1.log),R.moon1);
check('Moonpull+ costs 0 and Sinks',R.moonUp.energy===3&&R.moonUp.exh.includes('moonpull'),R.moonUp);
console.log('Fix 3: Parry');
check('Parry 5 vs two attacking enemies triggers once (reflects 2 total)',R.parry2.back.reduce((a,b)=>a+b,0)===2,R.parry2);
check('Counterstance (Parry 8) vs a 3-hit attack triggers once (reflects 4)',R.parryMulti===4,R.parryMulti);
check('Parry is available again on the next turn',R.parryNext===2,R.parryNext);
console.log('Fix 4: Mirror Warden (v2.1 mirror)');
check('Warden with nothing played threatens "punish idleness" 15',R.warden0.a===15&&R.warden0.mirror===1,R.warden0);
check('Warden punish: 15 damage if no card was played',R.wardenFallbackDmg===15,R.wardenFallbackDmg);
check('Warden copies Skill -> 12 Guard, Attack -> attack 15',R.wardenSkill.b===12&&R.wardenAtk.a===15,{s:R.wardenSkill,a:R.wardenAtk});
console.log('Fix 5: player Soaked/Exposed tick at start of enemy turn');
check('Soaked 2 -> 1, Exposed 1 -> gone after enemy turn',R.tick.st.weak===1&&!R.tick.st.vuln,R.tick);
check('Exposed wore off BEFORE the enemy attacked (took 6, not 9)',R.tick.dmg===6,R.tick);
check('Soaked applied during the enemy turn is still full on your next turn (2)',R.tickNew.weak===2,R.tickNew);
check('...and ticks to 1 at the start of the following enemy turn',R.tickNew2.weak===1,R.tickNew2);

// ---------- Phase 1: one check per P1 relic + every potion ----------
console.log('Phase 1 relics (one behaviour check each):');
const RC=await pg.evaluate(()=>{const o={};for(const k in RELIC_CHECKS){try{o[k]=RELIC_CHECKS[k]()}catch(e){o[k]=[false,'ERR '+e.message]}}o.__p1=Object.values(G.RELICS).filter(r=>r.phase==='P1').map(r=>r.id);return o});
const p1ids=RC.__p1;delete RC.__p1;
check('there is a check for every P1 relic (59 + 4 pulled forward from P2 = 63)',p1ids.length===63&&p1ids.every(id=>RC[id]),p1ids.filter(id=>!RC[id]));
for(const id of p1ids)if(RC[id])check(`relic ${id}`,RC[id][0],RC[id][1]);
console.log('Potions (drinkable, leaves the slot, does its effect, not a card play):');
const PCk=await pg.evaluate(()=>{const o={};for(const k in POTION_CHECKS){try{o[k]=POTION_CHECKS[k]()}catch(e){o[k]=[false,'ERR '+e.message]}}return o});
check('24 potions registered',Object.keys(PCk).length===24,Object.keys(PCk));
for(const id in PCk)check(`potion ${id}`,PCk[id][0],PCk[id][1]);

// ---------- Fix 6: floating damage numbers animate once ----------
console.log('Fix 6: damage numbers do not replay on re-render');
await pg.evaluate(()=>{P1.fr('duel',['knight']);window.FAST=0;G.cb.banner=null;G.cb.vfx=[];G.cb.ens[0].shake=0;dmgEnemy(G.cb.ens[0],4);G.render()});
const d1=await pg.evaluate(()=>[...document.querySelectorAll('.fl')].map(e=>e.style.animationDelay));
await pg.waitForTimeout(350);await pg.evaluate(()=>G.render());
const d2=await pg.evaluate(()=>[...document.querySelectorAll('.fl')].map(e=>parseFloat(e.style.animationDelay)));
await pg.waitForTimeout(1100);await pg.evaluate(()=>G.render()); // damage numbers last T(950) ms (core/timing.js)
const d3=await pg.evaluate(()=>({fl:document.querySelectorAll('.fl').length,shake:document.querySelectorAll('.shake').length}));
check('number is shown right after the hit',d1.length===1,d1);
check('re-render 350ms later resumes it (negative delay ≤ -300ms), not restart',d2.length===1&&d2[0]<=-300,d2);
check('re-render after it finished does not show it again (and no shake replay)',d3.fl===0&&d3.shake===0,d3);

// ---------- UI interactions (real pointer / touch input) ----------
console.log('UI interactions:');
const fresh=async(cls,enc,hand)=>{await pg.evaluate(([cls,enc,hand])=>{P1.fr(cls,enc);G.cb.hand=hand.map((id,i)=>({id,uid:5000+i,up:false}));G.cb.energy=3;G.cb.banner=null;G.render()},[cls,enc,hand]);await pg.waitForTimeout(50)};
const center=async sel=>{const r=await pg.locator(sel).first().boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2}};
const cardPt=i=>cardPoint(pg,i);
// tap-to-target
await fresh('duel',['crab','slug'],['thrust','parry','thrust']);
let st=await pg.evaluate(()=>G.cb.ens.map(e=>e.hp+e.block));
await tapCardUI(pg,0);
const selected=await pg.evaluate(()=>G.cb.sel);
await pg.locator('.en[data-en="1"]').click();
let st2=await pg.evaluate(()=>({hp:G.cb.ens.map(e=>e.hp+e.block),hand:G.cb.hand.length,tgt:G.cb.tgt}));
check('tap card selects it',selected===0,selected);
check('tap enemy with an Attack selected never plays it',st2.hand===3&&st2.tgt===1&&st2.hp[1]===st[1]&&st2.hp[0]===st[0],{st,st2});
// drag attack onto enemy
await fresh('duel',['crab','slug'],['thrust','parry','thrust']);st=await pg.evaluate(()=>G.cb.ens.map(e=>e.hp+e.block));
let a=await cardPt(0),e=await center('.en[data-en="0"] .slot');
await pg.mouse.move(a.x,a.y);await pg.mouse.down();await pg.mouse.move(a.x+10,a.y-20,{steps:3});await pg.mouse.move(e.x,e.y,{steps:8});
const hot=await pg.evaluate(()=>!!document.querySelector('.en.hot'));await pg.mouse.up();
st2=await pg.evaluate(()=>({hp:G.cb.ens.map(e=>e.hp+e.block),hand:G.cb.hand.length}));
check('dragging an Attack highlights the enemy under it',hot);
check('drag Attack onto enemy plays it on that enemy',st2.hand===2&&st2.hp[0]<st[0]&&st2.hp[1]===st[1],{st,st2});
// drag skill up
a=await cardPt(0);await pg.mouse.move(a.x,a.y);await pg.mouse.down();await pg.mouse.move(a.x,a.y-170,{steps:10});await pg.mouse.up();
st2=await pg.evaluate(()=>({hand:G.cb.hand.length,block:G.cb.p.block,parry:G.cb.parry}));
check('drag a Skill up into the scene plays it (Parry 5)',st2.hand===1&&st2.parry===5,st2);
// drag released inside the hand: nothing played
a=await cardPt(0);await pg.mouse.move(a.x,a.y);await pg.mouse.down();await pg.mouse.move(a.x+30,a.y+5,{steps:5});await pg.mouse.up();
check('drag released back over the hand does not play',await pg.evaluate(()=>G.cb.hand.length===1));
// attack dragged to empty space with 2 enemies: not played
a=await cardPt(0);await pg.mouse.move(a.x,a.y);await pg.mouse.down();await pg.mouse.move(300,120,{steps:8});await pg.mouse.up();
check('Attack dropped on empty space (2 enemies) is not played',await pg.evaluate(()=>G.cb.hand.length===1));
// Repeated taps only inspect, and no tap-to-play button exists.
await fresh('tide',['slug'],['brace','brace','splash']);
await tapCardUI(pg,0);await tapCardUI(pg,0);
check('tap a Skill twice never plays it',await pg.evaluate(()=>G.cb.hand.length===3&&G.cb.p.block===0));
check('tap-to-play button removed',await pg.locator('#playbtn').count()===0);
await dragCardUI(pg,0,null);check('drag Skill onto hero plays it',await pg.evaluate(()=>G.cb.hand.length===2&&G.cb.p.block===5));
await pg.evaluate(()=>{G.cb.energy=0;G.render()});await dragCardUI(pg,0,null);
check('card without enough energy is not played by a drag',await pg.evaluate(()=>G.cb.hand.length===2));
await fresh('tide',['slug'],['brace','splash']);let t=await cardPt(0);await pg.touchscreen.tap(t.x,t.y);const tsel=await pg.evaluate(()=>G.cb.sel);
t=await cardPt(0);await pg.touchscreen.tap(t.x,t.y);
check('touch: repeated taps raise without playing',tsel===0&&await pg.evaluate(()=>G.cb.hand.length===2&&G.cb.p.block===0),tsel);
await dragCardUI(pg,0,null,{touch:true});check('touch: drag Skill onto hero plays',await pg.evaluate(()=>G.cb.hand.length===1&&G.cb.p.block===5));
// pile viewers + deck + map overlay
await fresh('duel',['slug'],['thrust','parry']);
for(const [id,key] of [['#drawpile','draw'],['#discpile','disc'],['#exhpile','exh'],['#deckbtn','deck']]){await pg.click(id);
 const v=await pg.evaluate(k=>{const ov=document.querySelector('#ovl');const n=k==='deck'?G.run.deck.length:G.cb[k].length;return {open:!!ov,title:ov&&ov.querySelector('h2').textContent,cards:ov?ov.querySelectorAll('.card').length:-1,n}},key);
 check(`${id} opens a viewer listing its cards`,v.open&&v.cards===v.n&&v.title.includes('('+v.n+')'),v);await pg.click('#ovl');check(`${id} viewer closes`,await pg.evaluate(()=>!document.querySelector('#ovl')))}
await pg.click('#mapbtn');check('map button opens the map overlay mid-combat',await pg.evaluate(()=>!!document.querySelector('#ovl .parch .node')));
await pg.click('#ovl .btn.full');check('map overlay closes',await pg.evaluate(()=>!document.querySelector('#ovl')));
// End Turn button
const turn0=await pg.evaluate(()=>G.cb.turn);await pg.click('#endbtn');
check('End Turn runs the enemy turn and starts the next player turn',await pg.evaluate(t=>G.cb.turn===t+1&&!G.cb.busy&&G.cb.hand.length===5,turn0));
// End Turn with animations on (FAST=0): banner, busy, then back
await pg.evaluate(()=>{window.FAST=0});await pg.click('#endbtn');
const mid1=await pg.evaluate(()=>({busy:G.cb.busy,banner:document.querySelector('.banner')&&document.querySelector('.banner').textContent}));
await pg.waitForFunction(()=>G.cb&&!G.cb.busy,null,{timeout:5000});
check('animated End Turn shows "Enemy Turn" banner then returns to "Player Turn"',mid1.busy&&mid1.banner==='Enemy Turn'&&await pg.evaluate(()=>G.cb.banner.txt==='Player Turn'),mid1);
await pg.evaluate(()=>{window.FAST=1});
// map navigation
await pg.evaluate(()=>{P1.fr('tide')});
const nav=await pg.evaluate(()=>document.querySelectorAll('.node.av').length);
await pg.locator('.node.av').first().click();
check('map: floor-1 nodes are available and clicking one starts a fight',nav>=3&&await pg.evaluate(()=>G.S.screen==='combat'&&G.run.floor===1),nav);
await pg.evaluate(()=>{G.cb.ens.forEach(e=>dmgEnemy(e,999));after()});
check('winning a fight goes to the reward screen',await pg.evaluate(()=>G.S.screen==='reward'));
await pg.click('#proceed');
const av2=await pg.evaluate(()=>[...document.querySelectorAll('.node.av')].map(n=>+n.dataset.r));
check('back on the map, only floor-2 nodes linked from the visited node are available',av2.length>=1&&av2.every(r=>r===1),av2);
await pg.locator('.node.av').first().click();
check('clicking a floor-2 node advances to floor 2',await pg.evaluate(()=>G.run.floor===2&&G.S.screen!=='map'));
// asset map fallback
const fb=await pg.evaluate(async()=>{const keep=G.ASSETS.sprites.enemies.warden;delete G.ASSETS.sprites.enemies.warden;P1.fr('tide');G.startCombat('elite',['warden']);await new Promise(r=>setTimeout(r,100));
 const war=document.querySelector('.en .slot');const out={wardenPlaceholder:!war.classList.contains('has-img')&&!!war.querySelector('.ph .gi[data-g=mirror]')};
 G.ASSETS.sprites.enemies.warden=keep;const SP=(await import('/src/data/sprites.js')).SPRITES['mirror-warden'];const f0=SP.f;SP.f='art/does-not-exist.png';G.render();await new Promise(r=>setTimeout(r,300));const w2=document.querySelector('.en .slot');out.brokenFallsBack=!w2.classList.contains('has-img')&&!w2.querySelector('img');
 SP.f=f0;G.ASSETS.cards.splash={src:'art/enemies/inkmaw.svg',fit:'cover',pos:'50% 40%'};G.cb.hand=[{id:'splash',uid:1,up:false}];G.render();await new Promise(r=>setTimeout(r,300));
 const im=document.querySelector('.hand .card .art img');out.cardArt=!!im&&im.naturalWidth>0&&im.style.objectFit==='cover';delete G.ASSETS.cards.splash;
 out.frames=[...document.querySelectorAll('.hand .card .frame')].every(i=>i.naturalWidth>0);return out});
check('missing enemy art shows a placeholder',fb.wardenPlaceholder,fb);
check('an asset entry that fails to load falls back to the placeholder',fb.brokenFallsBack,fb);
check('a card-art entry ({src,fit,pos}) renders in the art window',fb.cardArt,fb);
check('class card frames load',fb.frames,fb);

// ---------- content registries ----------
console.log('Data registries:');
const reg=await pg.evaluate(()=>{const cards=Object.values(G.CARDS);const bad=cards.filter(c=>!c.p&&!c.fx&&!c.wp&&!c.on&&!c.mod&&!c.unplay).map(c=>c.id);
 const starters=Object.values(G.CLASSES).flatMap(c=>c.starter).filter(id=>!G.CARDS[id]);
 const ai=Object.keys(G.EN).filter(k=>{try{P1.fr('tide');G.startCombat('fight',[k]);return !G.cb.ens[0].next}catch(e){return true}});
 return {cards:cards.length,dataOps:cards.filter(c=>c.fx).length,bad,starters,ai,relics:Object.keys(G.RELICS).length,potions:Object.keys(G.POTIONS).length,events:G.EVENTS.length,enemies:Object.keys(G.EN).length}});
check('every card has an effect (fx ops, p/wp handler, Power hooks, or is an Unplayable status/curse)',reg.bad.length===0,reg);
check('all class starter decks reference registered cards',reg.starters.length===0,reg);
check('every enemy spawns with an intent',reg.ai.length===0,reg);
check('registries loaded: 77 P1 class cards + 5 statuses + 10 curses, 20 enemies (12 normal, 3 elite, 3 bosses + Tendril, Limpet), 16 events (6 shrines + 10), 80 relics, 24 potions',reg.cards>=91&&reg.enemies===20&&reg.events===16&&reg.relics===80&&reg.potions===24,reg);

// ---------- regression: enemies with many statuses must fit in the scene (test.js found Twin Eels under the sub-bar) ----------
const fit=await pg.evaluate(()=>{const o={};const hit=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
 for(const cls of ['tide','carto']){P1.fr(cls);G.startCombat('elite',['eel','eel','eel']);const c=G.cb;if(c.mode&&c.mode.k==='chart')modeAct('done');
 c.ens.forEach(e=>{e.st.weak=2;e.st.vuln=2;e.block=8;e.st.str=3});c.p.block=5;c.p.st.weak=1;c.p.st.vuln=1;c.pstr=2;G.render();
 const tb=document.querySelector('.topbar').getBoundingClientRect(),sb=document.querySelector('.dais').getBoundingClientRect();
 o[cls]=[...document.querySelectorAll('.en,.hero')].map(e=>{const r=e.getBoundingClientRect(),m=r.left+r.width/2,top=e.querySelector('.intent,.fig').getBoundingClientRect();
  const ok=top.top>=tb.bottom-1&&!hit(top,sb)&&!hit(r,sb);return (ok?'clear':'OVERLAP')+':'+(document.elementFromPoint(m,top.top+top.height/2)?.closest('.en,.hero')===e)})}return o});
check('S24: enemies/hero with 4 statuses clear the top bar and class strip, and their intents are tappable',Object.values(fit).flat().every(x=>x==='clear:true'),fit);

// ---------- event bus (design/content-impl-plan.md §4.2 core) ----------
console.log('Event bus / lifecycle:');
const bus=await pg.evaluate(()=>{const L=[];const record=x=>{if(!W.previewing)L.push(x)};G.registerRelic('test-relic',{n:'Test Relic',e:'🧿',text:'test',
  on:{combatStart:()=>record('combatStart'),turnStart:(r,c)=>record('turnStart'+c.turn),afterDraw:()=>record('afterDraw:'+G.cb.hand.length),beforeCardPlay:(r,c)=>record('before:'+c.card.id),
      cardPlayed:(r,c)=>record('played:'+c.card.id+'#'+c.nThisTurn),turnEnd:()=>record('turnEnd'),roundEnd:()=>record('roundEnd'),combatEnd:(r,c)=>record('combatEnd:'+c.won),draw:()=>{if(W.previewing)return;L.draws=(L.draws||0)+1}},
  mod:{cost:(r,c,v)=>c.card.id==='splash'?v-1:v,damage:(r,c,v)=>v+1,guard:(r,c,v)=>v+2}});
 P1.fr('tide');G.run.relics=[{id:'test-relic'}];G.startCombat('fight',['bell']);
 const c=G.cb;c.hand=[{id:'splash',uid:1,up:false},{id:'brace',uid:2,up:false},{id:'spring',uid:3,up:false}];c.energy=3;G.render();
 const out={costSplash:cost(c.hand[0]),relicShown:!!document.querySelector('#relicbar [data-relic="test-relic"]')};const hp=c.ens[0].hp;
 let tt=0;G.thisTurn({on:{cardPlayed:()=>{if(!W.previewing)tt++}}});
 playCard(0);out.dmg=hp-c.ens[0].hp;playCard(0);out.block=c.p.block;
 c.energy=3;playCard(0);c.hand=[{id:'spring',uid:4,up:false}];c.energy=3;playCard(0);out.powers=JSON.stringify(c.powers);
 out.tt=tt;endTurn();playCard(0);const tt2=tt;out.ttExpired=tt2===tt;
 G.cb.ens.forEach(e=>dmgEnemy(e,999));after();
 out.L=L.join(',');out.draws=L.draws;delete G.CARDS.__x;delete G.RELICS?.['test-relic'];return out});
check('modifier pipeline: cost (Splash 1->0), damage (+1 => 7), guard (+2 => Brace 7 Block)',bus.costSplash===0&&bus.dmg===7&&bus.block===7,bus);
check('lifecycle order: combatStart, turnStart, afterDraw, beforeCardPlay, cardPlayed (#n), turnEnd, roundEnd, combatEnd',
 /^combatStart,turnStart1,afterDraw:5,before:splash,played:splash#1,before:brace,played:brace#2,before:spring,played:spring#3,before:spring,played:spring#4,turnEnd,roundEnd,turnStart2,afterDraw:5,before:[a-z]+,played:[a-z]+#1,combatEnd:true$/.test(bus.L),bus.L);
check('draw events fire per card drawn',bus.draws===10,bus.draws);
check('Powers in play are tracked and stack (cb.powers)',(p=>p.length===1&&p[0].id==='spring'&&p[0].n===2)(JSON.parse(bus.powers)),bus.powers);
check('turn-scoped listeners (thisTurn) fire, then expire at end of turn',bus.tt===4&&bus.ttExpired,bus);
check('owned relics render in the relic bar',bus.relicShown,bus);

// ---------- UI shell: relic bar, potion slots, touch targets ----------
console.log('UI shell (S24 Ultra landscape 832x384):');
await pg.evaluate(()=>{P1.fr('duel');G.startCombat('fight',['crab','slug']);G.render()});
const shell=await pg.evaluate(()=>{const small=[];for(const el of document.querySelectorAll('button,.hand .card,.en,.pile,.potion')){const r=el.getBoundingClientRect();const slop=el.classList.contains('tbtn')?18:0;if(r.width&&(r.width<48||r.height+slop<48)&&!el.classList.contains('relic'))small.push((el.id||el.className)+' '+Math.round(r.width)+'x'+Math.round(r.height))}
 return {relicbar:!!document.querySelector('#relicbar'),potions:document.querySelectorAll('.topbar .potion').length,small,vfc:document.querySelector('meta[name=viewport]').content.includes('viewport-fit=cover'),
  overflow:document.documentElement.scrollWidth>innerWidth||(()=>{const c=document.querySelector('.combat');c.scrollTop=40;const s=c.scrollTop>0;c.scrollTop=0;return s})()}}); // AD hand: resting cards sit partly below the screen edge by design, so 'no scrolling' = the combat screen can't scroll
check('relic bar is in the top bar',shell.relicbar,shell);
check('3 potion slots in the top bar',shell.potions===3,shell);
check('all touch targets are at least 48x48 CSS px (class-bar buttons via a 9px hit margin)',shell.small.length===0,shell.small);
check('viewport-fit=cover set (safe-area insets apply)',shell.vfc);
check('combat fits the 832x384 screen without scrolling',!shell.overflow,shell);

// ---------- S24 readability, layout fit, v2 art wiring (Playtester B.2) ----------
console.log('S24 readability / art wiring:');
const fontMin=(sel)=>pg.evaluate(sel=>{const o={name:99,text:99,nameOverflow:[],n:0};for(const c of document.querySelectorAll(sel)){o.n++;const nm=c.querySelector('.name'),tx=c.querySelector('.text');
  o.name=Math.min(o.name,parseFloat(getComputedStyle(nm).fontSize));o.text=Math.min(o.text,parseFloat(getComputedStyle(tx).fontSize));
  for(const area of [nm,tx,c.querySelector('.type'),c.querySelector('.cost')]){const pr=area.getBoundingClientRect(),sp=document.createRange();sp.selectNodeContents(area);const st=getComputedStyle(area),sx=pr.width/Math.max(1,area.offsetWidth),sy=pr.height/Math.max(1,area.offsetHeight);if([...sp.getClientRects()].some(tr=>tr.left<pr.left+parseFloat(st.paddingLeft)*sx-1||tr.right>pr.right-parseFloat(st.paddingRight)*sx+1||tr.top<pr.top+parseFloat(st.paddingTop)*sy-1||tr.bottom>pr.bottom-parseFloat(st.paddingBottom)*sy+1))o.nameOverflow.push(area.className+':'+c.dataset.id)}
  if(tx.scrollHeight>tx.clientHeight+1)o.nameOverflow.push('TEXT:'+c.dataset.id)}return o},sel);
// every card in every class, rendered in the hand 5 at a time
const allIds=await pg.evaluate(()=>Object.keys(G.CARDS));let worst={name:99,text:99,nameOverflow:[],n:0};
for(let i=0;i<allIds.length;i+=5){await pg.evaluate(ids=>{P1.fr('tide');G.startCombat('fight',['slug']);G.cb.hand=ids.map((id,k)=>({id,uid:900+k,up:k%2===1&&!G.CARDS[id].unplay}));G.cb.sel=null;G.render()},allIds.slice(i,i+5));
 const r=await fontMin('.hand .card');const lf=await pg.evaluate(()=>Math.min(...[...document.querySelectorAll('.hand .card')].map(c=>parseFloat(getComputedStyle(c.querySelector('.text')).fontSize)*(+c.dataset.zl||1))));worst={lifted:Math.min(worst.lifted??99,lf),name:Math.min(worst.name,r.name),text:Math.min(worst.text,r.text),nameOverflow:worst.nameOverflow.concat(r.nameOverflow),n:worst.n+r.n}}
check(`hand cards (AD spec): all text fits its frame without covering art (all ${allIds.length} cards, base + upgraded)`,worst.name>0&&worst.text>0&&worst.nameOverflow.length===0&&worst.n===allIds.length,worst);
const hand=await pg.evaluate(()=>{P1.fr('tide');G.startCombat('boss',['bell']);G.render();const cs=[...document.querySelectorAll('.hand .card')].map(c=>c.getBoundingClientRect());
 const en=[...document.querySelectorAll('.en')].map(e=>e.getBoundingClientRect());const nm=document.querySelector('.en .nm');const tb=document.querySelector('.topbar').getBoundingClientRect(),it=document.querySelector('.en .intent').getBoundingClientRect();
 return {ch:document.querySelector('.hand .card').offsetHeight,bottom:Math.max(...cs.map(r=>r.bottom)),vh:innerHeight,left:Math.min(...cs.map(r=>r.left)),right:Math.max(...cs.map(r=>r.right)),handTop:Math.min(...cs.map(r=>r.top)),enBottom:Math.max(...en.map(r=>r.bottom)),
  bossName:nm.textContent,bossNameFits:nm.scrollWidth<=nm.clientWidth+1&&nm.getBoundingClientRect().height<40,intentBelowTopbar:it.top>=tb.bottom-1}});
check('AD hand at rest (StS-style low fan): card height ~40% of the screen, ~38% of it below the bottom edge, fanned within the screen width',Math.abs(hand.ch/hand.vh-.40)<.04&&Math.abs((hand.bottom-hand.vh)/hand.ch-.38)<.08&&hand.left>=0&&hand.right<=832,hand);
check('boss name shown in full ("The Knell")',hand.bossName.startsWith('The Knell')&&hand.bossNameFits,hand);
check('boss intent badge sits below the top bar',hand.intentBelowTopbar,hand);
check('enemies (incl. HP bars) sit above the hand',hand.enBottom<=hand.handTop+1,hand);
// tap enlarges; long-press opens the inspector (hand + reward)
const zoom=await pg.evaluate(async()=>{const rw=document.querySelector('.hand .card').offsetWidth;tapCard(0);await new Promise(r=>setTimeout(r,400));const el=document.querySelector('.hand .card.sel'),c=el.getBoundingClientRect();return {rw,w:c.width,h:c.height,top:c.top,bottom:c.bottom,tx:parseFloat(getComputedStyle(el.querySelector('.text')).fontSize)*c.width/el.offsetWidth}});
check('tapping a hand card lifts and enlarges it (>= x1.4 of rest, rules >= 15px, fully on screen)',zoom.w>=zoom.rw*1.4&&zoom.tx>=15&&zoom.top>=0&&zoom.bottom<=384,zoom);
await pg.evaluate(()=>{G.cb.sel=null;G.render()});
{const pt=await cardPoint(pg,1);await pg.mouse.move(pt.x,pt.y);await pg.mouse.down();await pg.waitForTimeout(600);await pg.mouse.up();}
const insp=await pg.evaluate(()=>{const el=document.querySelector('#inspect .card');const r=el&&el.getBoundingClientRect();return {open:!!el,w:r&&r.width,h:r&&r.height,fits:r&&r.bottom<=innerHeight&&r.top>=0,played:G.cb.hand.length}});
check('long-press a hand card opens the enlarged inspector (and does not play it)',insp.open&&insp.w>=200&&insp.fits&&insp.played===5,insp);
await pg.click('#inspect',{position:{x:6,y:6}});check('tapping closes the inspector',await pg.evaluate(()=>!document.querySelector('#inspect')));
// reward: 3 cards + Skip on one screen; shop: one screen
const rew=await pg.evaluate(()=>{P1.fr('echo',['slug']);G.cb.ens.forEach(e=>dmgEnemy(e,999));after();const pr=document.querySelector('#proceed').getBoundingClientRect();
 const rows={rows:document.querySelectorAll('.rewtiles .tile').length,proceed:pr.bottom<=innerHeight,scroll:document.documentElement.scrollHeight>innerHeight+1};
 claimRow(W.S.rows.findIndex(r=>r.k==='cards'));const sk=document.querySelector('#skipcard').getBoundingClientRect();
 return {rows,skipVisible:sk.bottom<=innerHeight&&sk.top>=0,scroll:document.documentElement.scrollHeight>innerHeight+1,cards:[...document.querySelectorAll('.grid .card')].map(c=>Math.round(c.getBoundingClientRect().bottom))}});
const rewF=await fontMin('.grid .card');
check('reward screen: gold / card rows and Proceed fit on one screen',rew.rows.rows>=2&&rew.rows.proceed&&!rew.rows.scroll,rew.rows);
check('card reward: 3 cards and Skip fit on one 832x384 screen',rew.skipVisible&&!rew.scroll&&rew.cards.length===3&&rew.cards.every(b=>b<=384),rew);
check('card reward: names >= 13px, rules >= 11px',rewF.name>=13&&rewF.text>=11&&!rewF.nameOverflow.length,rewF);
{const pt=await pg.evaluate(()=>{const r=document.querySelector('.grid .card').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}});await pg.mouse.move(pt.x,pt.y);await pg.mouse.down();await pg.waitForTimeout(600);}
const rewI=await pg.evaluate(()=>({open:!!document.querySelector('#inspect'),deck:G.run.deck.length,screen:G.S.screen}));
check('long-press a reward card enlarges it without taking it',rewI.open&&rewI.deck===10&&rewI.screen==='reward',rewI);
await pg.mouse.up();check('releasing a reward hold persists without choosing',await pg.evaluate(()=>!!document.querySelector('#inspect')&&G.run.deck.length===10&&W.S.cardSelected==null));await pg.click('#inspect',{position:{x:6,y:6}});
const shop=await pg.evaluate(()=>{G.run.gold=999;openShop();const lv=document.querySelector('#leaveshop').getBoundingClientRect();const sh=document.querySelector('#cardshelf');
 return {scroll:document.documentElement.scrollHeight>innerHeight+1,leave:lv.bottom<=innerHeight,items:document.querySelectorAll('.shopitem').length,
 rows:new Set([...document.querySelectorAll('.shopitem')].map(e=>Math.round(e.getBoundingClientRect().top))).size,shelfScrolls:sh.scrollWidth>sh.clientWidth,
 icons:document.querySelectorAll('.shopicon').length,iconsVisible:[...document.querySelectorAll('.shopicon,#scrub')].every(e=>e.getBoundingClientRect().bottom<=innerHeight)}});
check('merchant: 7 cards on one shelf + 3 relics + 3 potions + Scrub, no page scroll',!shop.scroll&&shop.leave&&shop.items===7&&shop.rows===1&&shop.icons===6&&shop.iconsVisible,shop);
const shopF=await fontMin('.shopitem .card');
check('merchant: text fits its frame (7 cards share the width)',shopF.name>0&&shopF.text>0&&!shopF.nameOverflow.length,shopF);
const shopEdge=await pg.evaluate(()=>{const sh=document.querySelector('#cardshelf');return {right:Math.max(...[...document.querySelectorAll('.shopitem')].map(e=>e.getBoundingClientRect().right)),vw:innerWidth,scrolls:sh.scrollWidth>sh.clientWidth+1,typ:Math.min(...[...document.querySelectorAll('.shopitem .card .type')].filter(t=>t.offsetWidth).map(t=>parseFloat(getComputedStyle(t).fontSize)))}});
check('merchant (B13): every shelf card fully on screen, no sideways scroll; type labels fit their banners',shopEdge.right<=shopEdge.vw&&!shopEdge.scrolls&&shopEdge.typ>0,shopEdge);
await pg.evaluate(()=>{P1.fr('tide');for(let i=0;i<8;i++)G.run.deck.push(mk('splash'));openPick('remove','Remove a card',()=>goMap(),()=>goMap())});
await pg.locator('.grid .card').first().click({timeout:5000});const pk1=await pg.evaluate(()=>G.S.screen==='map'&&G.run.deck.length===17);
await pg.evaluate(()=>openPick('remove','Remove a card',()=>goMap()));await pg.locator('.grid .card').last().click({timeout:5000});const pk2=await pg.evaluate(()=>G.S.screen==='map'&&G.run.deck.length===16);
check('pick screen (18-card deck): first and last cards reachable and clickable (grid scrolls, header never covers it)',pk1&&pk2,{pk1,pk2});
// art wiring: every enemy and class figure uses painted art; intents/map nodes use painted icons
const NOART=[]; // every enemy now has a transparent sprite (Leech/Lurker/Tendril/Matriarch/Bell landed Oct 9)
const art=await pg.evaluate(async(NOART)=>{const o={missing:[],emojiIntents:0,placeholders:[]};for(const k of Object.keys(G.EN)){P1.fr('tide');G.startCombat('fight',[k]);G.render();
  const sl=document.querySelector('.en .slot');if(!sl.classList.contains('has-img')){if(NOART.includes(k)&&sl.querySelector('.ph').textContent.trim())o.placeholders.push(k);else o.missing.push('enemy:'+k)}}
 o.notSprite=[];for(const c of ['tide','echo','carto','duel']){P1.fr(c);G.startCombat('fight',['slug']);G.render();const hs=document.querySelector('.hero .slot');if(!hs.classList.contains('has-img'))o.missing.push('hero:'+c);const im=hs.querySelector('img');if(!im||!/\/art\/v2\/sprites\//.test(im.src))o.notSprite.push(c)}
 await new Promise(r=>setTimeout(r,800));o.broken=[...document.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src);
 o.intentImgs=document.querySelectorAll('.intent img.uic').length;o.orbArt=getComputedStyle(document.querySelector('.orb')).backgroundImage.includes('energy-orb');
 o.endArt=getComputedStyle(document.querySelector('.endbtn')).backgroundImage.includes('end-turn');o.frames=[...document.querySelectorAll('.hand .card .frame')].every(f=>f.src.includes('/art/v2/frames/'));
 goMap();o.nodeImgs=document.querySelectorAll('.node img.nodeic').length===document.querySelectorAll('.node:not(.boss)').length&&!!document.querySelector('.node.boss .slot');return o},NOART);
check('every enemy with a delivered sprite and every class figure renders its transparent sprites/ cut-out; the Kelp Matriarch shows a placeholder',art.missing.length===0&&art.placeholders.length===NOART.length&&art.notSprite.length===0,art);
check('intents, energy orb, End Turn, frames and map nodes use the v2 UI art',art.intentImgs>0&&art.orbArt&&art.endArt&&art.frames&&art.nodeImgs,art);
check('no broken images',art.broken.length===0,art.broken);
// environment background (design-v2 §W.7)
const env=await pg.evaluate(async()=>{P1.fr('tide');G.startCombat('fight',['slug']);G.render();await new Promise(r=>setTimeout(r,1500));const st=envState();
 const stack=document.querySelector('#env .envstack').getBoundingClientRect();const fs=document.querySelector('#env-front .envstack').getBoundingClientRect();
 const a={st,groundAt:Math.round(stack.top+stack.height*.69),floor:Math.round(innerHeight-stack.height*.31),backgroundBottom:stack.bottom,frontHidden:getComputedStyle(document.querySelector('#env-front')).display==='none',aspect:+(stack.width/stack.height).toFixed(3),frontSame:fs.top===stack.top&&fs.width===stack.width,
  frontZ:getComputedStyle(document.querySelector('#env-front')).zIndex,fgInFront:!!document.querySelector('#env-front .envL[data-l="fg"] .envI'),
  hitUI:[[40,350],[770,330]].every(([x,y])=>{const h=document.elementFromPoint(x,y);return h&&!h.closest('#env-front')})};G.run.floor=7;W.cb=null;W.S={screen:'map'};G.render();a.band2=envState().id;a.band2b=envState().band;
 G.startCombat('boss',['bell']);G.render();a.boss=envState().id;openShop();a.shop=envState().id;return a});
check('combat floors 1-5 show the painted a1_shore layers; background bottom anchored with the painted floor line shifted down; aspect kept',env.st.id==='a1_shore'&&env.st.layers.length===5&&Math.abs(env.groundAt-env.floor)<=1&&env.aspect===2.5&&Math.abs(env.backgroundBottom-384)<=1,env);
check('foreground corner blotches hidden during combat, never block input',env.fgInFront&&env.frontHidden&&env.frontZ==='2'&&env.hitUI,env);
check('env routing: map at floor 7 -> map_a1 sheet over the a1_cloister band backdrop, Bell -> a1_lair_bell, shop -> shop_a1',env.band2==='map_a1'&&env.band2b==='a1_cloister'&&env.boss==='a1_lair_bell'&&env.shop==='shop_a1',env);

// ---------- saves ----------
console.log('Save / settings (localStorage):');
const sv=await pg.evaluate(async()=>{localStorage.clear();P1.fr('carto');const saved=!!localStorage.getItem('tidebound.run.v2');const deck=G.run.deck.length;
 G.run.gold=123;G.saveRun();location.hash='';return {saved,deck}});
await pg.reload();await pg.waitForFunction(()=>window.G);await pg.evaluate(()=>window.FAST=1);
await pg.locator('#startscr,#continue').first().waitFor({state:'visible',timeout:10000});
if(await pg.locator('#startscr').count())await pg.locator('#startscr').tap();
const cont=await pg.evaluate(()=>({btn:!!document.querySelector('#continue')}));
await pg.click('#continue');
const after=await pg.evaluate(()=>({screen:G.S.screen,cls:G.run.cls,gold:G.run.gold}));
check('a new run is saved immediately',sv.saved,sv);
check('after reload the title screen offers Continue',cont.btn,cont);
check('Continue restores the run on the map',after.screen==='map'&&after.cls==='carto'&&after.gold===123,after);
await pg.evaluate(()=>{G.run.hp=0;window.lose()});
check('losing the run clears the save',await pg.evaluate(()=>!localStorage.getItem('tidebound.run.v2')));
await pg.evaluate(()=>{W.S={screen:'title',view:'options'};G.render()});await pg.click('#setfast');
check('settings persist (fast animations)',await pg.evaluate(()=>JSON.parse(localStorage.getItem('tidebound.settings.v1')).fastAnim===true));
await pg.click('#setfast');
check('no page errors',errs.length===0,errs);
await ctx.close();

// ---------- portrait: rotate prompt ----------
console.log('Portrait / PWA:');
{const c2=await b.newContext({...DEVICES.s24Portrait,serviceWorkers:'block'});const p2=await c2.newPage();await p2.goto(srv.url+'index.html');await p2.waitForFunction(()=>window.G);
 const r=await p2.evaluate(()=>({rotate:getComputedStyle(document.getElementById('rotate')).display,app:getComputedStyle(document.getElementById('app')).visibility}));
 check('S24 portrait 384x832 shows the rotate-your-phone prompt instead of the game',r.rotate==='flex'&&r.app==='hidden',r);
 await p2.setViewportSize({width:832,height:384});await p2.waitForTimeout(100);
 const r2=await p2.evaluate(()=>getComputedStyle(document.getElementById('rotate')).display);
 check('rotating to landscape hides the prompt',r2==='none',r2);await c2.close()}
// ---------- PWA: manifest, icons, service worker, offline ----------
{const c3=await b.newContext({...DEVICES.s24Landscape});const p3=await c3.newPage();const e3=[];p3.on('pageerror',e=>e3.push(e.message));
 await p3.goto(srv.url+'index.html');await p3.waitForFunction(()=>window.G);
 const man=await p3.evaluate(async()=>{const href=document.querySelector('link[rel=manifest]').href;const m=await (await fetch(href)).json();
  const icons=await Promise.all(m.icons.map(async i=>{const img=new Image();img.src=new URL(i.src,href).href;await img.decode().catch(()=>{});return {sizes:i.sizes,purpose:i.purpose||'any',w:img.naturalWidth}}));return {m,icons}});
 check('manifest: fullscreen, landscape, relative start_url',man.m.display==='fullscreen'&&man.m.orientation==='landscape'&&man.m.start_url.startsWith('./'),man.m);
 check('icons 192, 512 and maskable 512 exist at the right sizes',man.icons.some(i=>i.w===192)&&man.icons.some(i=>i.w===512&&i.purpose==='any')&&man.icons.some(i=>i.w===512&&i.purpose==='maskable'),man.icons);
 const swOk=await p3.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return !!r.active});
 check('service worker installs and activates',swOk);
 await p3.reload();await p3.waitForFunction(()=>navigator.serviceWorker.controller);await p3.waitForTimeout(800);
 await p3.evaluate(()=>{G.newRun('tide',{skipTravel:true});G.run.relics=[];G.startCombat('fight',['crab','knight','slug'])});await p3.waitForTimeout(800);
 await c3.setOffline(true);await p3.reload();await p3.waitForFunction(()=>window.G,null,{timeout:8000}).catch(()=>{});
 const off=await p3.evaluate(async()=>{if(!window.G)return {ok:false};G.newRun('tide',{skipTravel:true});G.run.relics=[];G.startCombat('fight',['crab','knight']);G.render();await new Promise(r=>setTimeout(r,400));
  const imgs=[...document.querySelectorAll('img')];return {ok:true,screen:G.S.screen,imgs:imgs.length,loaded:imgs.filter(i=>i.naturalWidth>0).length}});
 check('works offline after first visit (app shell + art from cache)',off.ok&&off.screen==='combat'&&off.imgs>0&&off.loaded===off.imgs,off);
 check('no page errors (PWA context)',e3.length===0,e3);await c3.close()}
console.log(`\nmech.js: ${pass} passed, ${fail} failed`+(fail?'\nFAILED: '+fails.join('; '):''));
await b.close();srv.close();process.exit(fail?1:0)})();
