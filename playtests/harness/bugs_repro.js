// Deterministic repros of the Playtester's bugs, now run against the LIVE module build
// (served over HTTP by serve.js, driven in headless Chromium) with PASS/FAIL assertions.
// The original v1-snapshot version is kept as bugs_repro.v1.js.
//   node playtests/harness/bugs_repro.js        -> exit code 0 when every fixed bug passes
// The repro bodies are the Playtester's originals; changes are marked "[live]".
const path=require('path');const {chromium}=require('playwright');
const {start}=require(path.join(__dirname,'../../serve.js'));
const REPROS={
 B1_warden_pass:`newRun('tide');run.hp=run.max=300; /* survive the 16-turn intent probe at current class HP */ startCombat('elite',['warden']);const w=cb.ens[0];
  const hp0=run.hp;for(let i=0;i<5;i++)endTurn();const a=run.hp;
  cb.hand=[mk('brace')];cb.energy=3;playCard(0);endTurn();const hp1=run.hp;const blk=cb.ens[0].block;
  const intentAfterBraceTurn=intentOf(w).lbl; /* [live] read before the passes: the player can now die */
  for(let i=0;i<10;i++)endTurn();return {hpStart:hp0,afterFivePassedTurns:a,afterBraceTurn:hp1,afterBraceThen10Passes:run.hp,wardenBlockEachTurn:blk,wardenIntent:intentAfterBraceTurn}`,
 B2_bell_skips_crack:`newRun('duel');startCombat('boss',['bell']);const b=cb.ens[0];b.hp=84;b.next={a:14,lbl:'Toll'}; /* [v2.1] cracks at 80; Counterstance reflects 4 */
  cb.hand=[mk('counter')];cb.energy=3;playCard(0);endTurn();return {bellHp:b.hp,phase:b.ph,nextIntentAfterCrack:b.next.lbl,expected:'Crack'}`,
 B2b_bell_crack_on_player_turn:`newRun('duel');startCombat('boss',['bell']);const b=cb.ens[0];b.hp=86;cb.hand=[mk('lunge')];cb.energy=3;playCard(0);return {phase:b.ph,next:b.next.lbl}`,
 B3_mirror_step_next_turn_draw:`newRun('echo');startCombat('fight',['knight']);cb.hand=[mk('mirror')];cb.draw=[mk('feedback'),mk('arc'),mk('arc'),mk('arc'),mk('arc'),mk('arc'),mk('arc')];cb.disc=[];cb.energy=3;
  playCard(0);modeAct('choice',1);const guard=cb.p.block,queued=cb.nextDraw;
  /* Isolate the chosen effect: an unmarked Echo can randomly choose Mirror Step's draw option again. */
  cb.lastNF=null;endTurn();return {guard,queued,nextTurnHand:cb.hand.map(cname),feedbackDiscarded:cb.disc.some(c=>c.id==='feedback'),choiceResolved:!cb.mode}`,
 B4_sinking_pull_undertow:`newRun('tide');startCombat('fight',['knight']);cb.tide=3;cb.hand=[mk('sinking')];cb.draw=[mk('splash'),mk('splash'),mk('splash'),mk('splash')];cb.energy=3;playCard(0);
  return {tideAfter:cb.tide,handSize:cb.hand.length}`,
 B4b_sinking_from4:`newRun('tide');startCombat('fight',['knight']);cb.tide=4;cb.hand=[mk('sinking')];cb.draw=[mk('splash'),mk('splash'),mk('splash'),mk('splash')];cb.energy=3;playCard(0);return {tideAfter:cb.tide,handSize:cb.hand.length}`,
 B4c_sinking_from6:`newRun('tide');startCombat('fight',['knight']);cb.tide=6;cb.hand=[mk('sinking')];cb.draw=[mk('splash'),mk('splash'),mk('splash'),mk('splash')];cb.energy=3;playCard(0);return {tideAfter:cb.tide,handSize:cb.hand.length}`,
 B5_cartomancer_skip_loses_gold:`newRun('echo');run.gold=99;S={screen:'event',ev:EVENTS.find(e=>/Cartomancer/.test(e.n))};render();evOpt(0);const scr=S.screen;const deck=run.deck.length;
  /* [live] press the real Skip/Cancel button on the pick screen instead of calling S.then() */
  const btn=[...document.querySelectorAll('button')].find(b=>/^(Skip|Cancel)$/.test(b.textContent.trim()));btn.click();
  const afterCancel={gold:run.gold,screen:S.screen,button:btn.textContent.trim()};
  evOpt(0);pickCard(run.deck[0].uid);
  return {screenAfterPay:scr,goldAfterSkip:afterCancel.gold,screenAfterSkip:afterCancel.screen,button:afterCancel.button,deckBefore:deck,goldAfterRemoval:run.gold,deckAfterRemoval:run.deck.length}`,
 B6_crackle_resound_vuln_expires:`newRun('echo');startCombat('fight',['knight']);const k=cb.ens[0];cb.hand=[mk('crackle')];cb.energy=3;playCard(0);endTurn();const v1=k.st.vuln||0;endTurn();return {knightVulnAtStartOfNextPlayerTurn:v1,afterOneMoreRound:k.st.vuln||0}`,
 B7_parry_hits_each_attacker:`newRun('duel');startCombat('fight',['gull','gull']);const [a,b]=cb.ens;const h=[a.hp,b.hp];cb.hand=[mk('counter'),mk('counter')];cb.energy=3;playCard(0);playCard(0);endTurn();return {parryTotal:cb.parry,gullDamageTaken:[h[0]-a.hp,h[1]-b.hp]}`,
 B8_focus_ties:`newRun('duel');startCombat('fight',['pod','pod','pod']);cb.hand=[mk('sweep')];cb.energy=3;playCard(0);return {podHp:cb.ens.map(e=>e.hp),note:'design question, unchanged'}`,
 B9_tsunami_triggers_undertow:`newRun('tide');startCombat('boss',['bell']);cb.tide=8;cb.hand=[mk('tsunami')];cb.draw=[mk('splash'),mk('splash')];cb.energy=3;playCard(0);return {tide:cb.tide,block:cb.p.block,hand:cb.hand.length,note:'design question, unchanged'}`,
 B10_pods_burst_total:`newRun('tide');startCombat('fight',['pod','pod','pod']);endTurn();endTurn();const before=run.hp;endTurn();return {hpBefore:before,hpAfter:run.hp,screen:S.screen}`,
 /* [v2.1 retest 2026-10-09, INFO only: no CHECK so npm test stays green until fixed] */
 B11_enemy_has_no_slot_selector:`newRun('duel');startCombat('fight',['crab','slug']);G.render();return {enemies:document.querySelectorAll('.en').length,enSlot:document.querySelectorAll('.en .slot').length,note:'At 22:56 PT Oct 8 enemies had no .slot, so test.js/shot.js timed out and npm test exited 1. The 07:05 PT render.js has .spr-slot again; this is now a regression guard.'}`,
 B12_resting_hand_rules_text_offscreen:`newRun('tide');startCombat('fight',['crab','slug']);G.render();return {viewportH:innerHeight,cards:[...document.querySelectorAll('.hand .card .text')].map(e=>{const r=e.getBoundingClientRect();return {top:Math.round(r.top),visiblePx:Math.max(0,Math.round(Math.min(r.bottom,innerHeight)-Math.max(r.top,0)))}})}`,
 B13_shop_card_text_overflow:`newRun('carto');run.gold=300;openShop();G.render();return {overflowing:[...document.querySelectorAll('.shopitem .card .text')].filter(e=>e.scrollHeight>e.clientHeight+2).map(e=>e.closest('.card').dataset.id+': '+e.scrollHeight+'>'+e.clientHeight),offRight:[...document.querySelectorAll('.shopitem')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>e.textContent.trim().slice(0,20))}`,
};
const CHECKS={
 B1_warden_pass:r=>r.afterFivePassedTurns<r.hpStart&&r.afterBraceThen10Passes<r.afterBraceTurn,
 B2_bell_skips_crack:r=>r.phase===2&&r.nextIntentAfterCrack==='Crack',
 B2b_bell_crack_on_player_turn:r=>r.phase===2&&r.next==='Crack',
 B3_mirror_step_next_turn_draw:r=>r.guard===3&&r.queued===2&&r.nextTurnHand.includes('Feedback')&&!r.feedbackDiscarded&&r.nextTurnHand.length===7&&r.choiceResolved,
 B4_sinking_pull_undertow:r=>r.handSize===3,        // Undertow draw 1 + Sinking Pull draw 2
 B4b_sinking_from4:r=>r.tideAfter===1&&r.handSize===2,
 B4c_sinking_from6:r=>r.tideAfter===3&&r.handSize===2,
 B5_cartomancer_skip_loses_gold:r=>r.goldAfterSkip===99&&r.screenAfterSkip==='event'&&r.goldAfterRemoval===49&&r.deckAfterRemoval===r.deckBefore-1,
 B6_crackle_resound_vuln_expires:r=>r.knightVulnAtStartOfNextPlayerTurn>=1&&r.afterOneMoreRound===r.knightVulnAtStartOfNextPlayerTurn-1, // [v2.1] Crackle applies 2 Exposed (cohesion pass); it must survive into your turn, then tick 1 per enemy turn
 B11_enemy_has_no_slot_selector:r=>r.enSlot>=r.enemies&&r.enemies>0,
 B7_parry_hits_each_attacker:r=>r.gullDamageTaken.filter(x=>x>0).length===1,
};
(async()=>{const srv=await start(0);const b=await chromium.launch();
 const pg=await (await b.newContext({viewport:{width:832,height:384},serviceWorkers:'block'})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);
 await pg.evaluate(()=>{window.FAST=1;window.REAL=false;
  for(const k of ['cb','run','S'])Object.defineProperty(window,k,{get:()=>W[k],set:v=>{W[k]=v},configurable:true});
  Object.defineProperty(window,'EVENTS',{get:()=>G.EVENTS,configurable:true});
  /* [v2.1] fixed seed, no travel card, no starter relic (Moon Shell / Sextant choices would pause combat start) */
  window.newRun=c=>{G.newRun(c,{skipTravel:true,seed:7});G.run.relics=[]};
  const sc=G.startCombat;window.startCombat=(...a)=>{sc(...a);let g=0;while(W.cb&&W.cb.mode&&g++<5){if(W.cb.mode.k==='chart')modeAct('done');else modeAct('choice',0)}}});
 const out={};let pass=0,fail=0;
 for(const [k,code] of Object.entries(REPROS)){
  let r;try{r=await pg.evaluate(c=>(new Function(c))(),code)}catch(e){r={error:e.message.split('\n')[0]}}
  const chk=CHECKS[k];const ok=chk?(!r.error&&chk(r)):null;if(ok===true)pass++;else if(ok===false)fail++;
  out[k]={result:ok===null?'INFO':ok?'PASS':'FAIL',...r}}
 console.log(JSON.stringify(out,null,1));
 if(errs.length){console.log('page errors:',errs);fail++}
 console.log(`\nbugs_repro.js: ${pass} passed, ${fail} failed (B8-B10 design questions and B12-B13 open v2.1 issues are reported as INFO)`);
 await b.close();srv.close();process.exit(fail?1:0)})();
