// Focused regression checks for Claude Task 6 mechanics (Tide Spend / hold / Bank / Drenched, Echo second Mark / Resonating / preview,
// Cartographer map reveal / Cut a Path / pre-placed Waypoint, Duelist Standing Ovation). Run: node tests/task6.cjs
const {chromium}=require('playwright');
const {start}=require('./util.js');
(async()=>{const srv=await start(0);const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(srv.url+'index.html');await p.waitForFunction(()=>window.G);await p.evaluate(()=>window.FAST=1);await p.addScriptTag({path:__dirname+'/p1/checks.js'});
const out=await p.evaluate(async()=>{const C=G.combat$,R=G.run$;const {fr,hand,mkc,endT,idle}=P1;const o={};const e0=()=>G.cb.ens[0];
 // ---- Tidecaller: Spend ----
 fr('tide',['bell'],[]);hand(['drawtide']);G.cb.tide=8;const h=e0().hp;G.playCard(0);o.drawTide=h-e0().hp===24&&G.cb.tide===2;
 hand(['drawtide']);o.drawTideGate=!C.canPlay(G.cb.hand[0]);
 fr('tide',['bell'],[]);hand(['tithe']);G.cb.tide=3;G.cb.p.block=0;G.playCard(0);o.titheUndertow=G.cb.stat.undertows===1&&G.cb.p.block===28&&G.cb.tide===5;
 fr('tide',['bell'],[]);hand(['tithe']);G.cb.tide=2;o.titheGate=!C.canPlay(G.cb.hand[0]);
 // ---- Moonlock (hold) ----
 const hold=card=>{fr('tide',['bell'],[]);hand(card?['moonlock']:[]);G.cb.tide=6;G.cb.tideDir=1;if(card)G.playCard(0);const g=G.cb.p.block;endT();return {tide:G.cb.tide,g,en:G.cb.energy}};
 const a=hold(true),bb=hold(false);o.moonlock=a.tide===6&&bb.tide===7&&a.g===8&&a.en===4;
 fr('tide',['bell'],[]);hand(['moonlock']);G.cb.tide=5;G.cb.tideDir=1;G.playCard(0);o.moonlockMidNoBonus=G.cb.p.block===0;
 // ---- Bank the Crest ----
 fr('tide',['bell'],[]);hand(['bankcrest']);G.playCard(0);G.cb.tide=9;const hb=e0().hp;C.tideShift(2);o.bank1=G.cb.banks===1&&G.cb.tide===10&&e0().hp===hb;C.tideShift(1);o.bankNoDouble=G.cb.banks===1;
 C.tideShift(-2);C.tideShift(2);o.bank2=G.cb.banks===2&&G.cb.tide===10;
 o.bankDraw=G.mod('drawCount',{},5)===4;C.releaseBank();o.bankRelease=hb-e0().hp===42&&G.cb.banks===0&&G.cb.tide===5;
 fr('tide',['bell'],[]);hand(['bankcrest']);G.playCard(0);G.cb.banks=3;G.cb.tide=10;G.cb.capped=true;idle();G.cb.hand=[];const hf=e0().hp;C.endTurn();o.bankAuto=hf-e0().hp===63&&G.cb.banks===0;
 // ---- Rip Current ----
 const rip=card=>{fr('tide',['bell'],[]);hand(card?['ripcurrent']:[]);G.cb.tide=5;G.cb.tideDir=1;if(card)G.playCard(0);endT();return G.cb.tide};o.rip=rip(true)===7&&rip(false)===6;
 // ---- Drenched ----
 fr('tide',['bell'],[]);hand(['brinedrench']);G.cb.tideDir=1;G.cb.tide=5;const hd=e0().hp;G.playCard(0);const afterCard=e0().hp;o.drenchApplied=e0().st.drench===3&&hd-afterCard===6;
 C.tideShift(-1);o.drenchTurn=afterCard-e0().hp===3;
 G.cb.tide=9;C.tideShift(1);o.drenchCrest=e0().st.drench===3;G.cb.ens[0].next={none:1};G.cb.hand=[];C.endTurn();o.drenchDecay=G.cb.ens[0].st.drench===2;
 fr('tide',['bell'],[]);G.cb.ens[0].st.drench=3;G.render();o.drenchBadge=!!document.querySelector('[data-kw="Drenched"]');
 // ---- Resonating ----
 fr('echo',['bell'],[]);hand(['tuningstrike']);const hr=e0().hp;G.playCard(0,{mark:true});idle();G.cb.hand=[];C.endTurn();o.reson=hr-e0().hp===6+(6+2);
 fr('echo',['bell'],[]);G.cb.ens[0].st.reson=3;G.render();o.resonBadge=!!document.querySelector('[data-kw="Resonating"]');
 // ---- Second Mark ----
 fr('echo',['bell'],[]);hand(['secondverse','arc','arc']);G.playCard(0);G.playCard(0,{mark:true});G.playCard(0,{mark:true});const hm=e0().hp;
 o.twoMarks=!!G.cb.mark&&!!G.cb.mark2&&!C.canMark();const pv1=C.echoPreview(C.echoPlan(true,1)),pv2=C.echoPreview(C.echoPlan(true,2));o.preview=pv1.n===8&&pv2.n===7;
 idle();G.cb.hand=[];C.endTurn();o.secondMarkDamage=hm-e0().hp===8+7;
 fr('echo',['bell'],[]);hand(['arc','arc','arc']);G.playCard(0,{mark:true});o.oneMarkOnly=!C.canMark();G.playCard(0,{mark:true});o.noThird=!G.cb.mark2;
 fr('echo',['bell'],[]);G.cb.hand=[];G.run.potions=['duetdraught',null,null];C.drinkPotion(0);o.potionMark=G.cb.extraMarks===1&&e0().st.reson===3;
 fr('echo',['bell'],['duetbell']);hand(['arc','arc']);G.playCard(0,{mark:true});G.playCard(0,{mark:true});const hh=e0().hp;idle();G.cb.hand=[];C.endTurn();o.halfSecond=hh-e0().hp===8+Math.floor(7*.5);
 // ---- Cartographer: map reveal, Cut a Path, pre-placed Waypoint ----
 fr('carto',['bell'],[]);[0,1,2].forEach(r=>{G.run.map[r].forEach(n=>{n.t='unknown';delete n.pre})});hand(['scoutroad']);G.playCard(0);res0();
 function res0(){P1.res()}
 o.reveal1=G.run.map[0].every(n=>n.pre)&&G.run.map[1].every(n=>!n.pre);
 hand(['scoutroad']);G.cb.hand[0].up=true;G.playCard(0);P1.res();o.reveal2=G.run.map[1].every(n=>n.pre)&&G.run.map[2].every(n=>!n.pre);
 R.goMap();o.revealUI=!!document.querySelector('.node .revb');
 G.run.map[0][0].t='unknown';G.run.map[0][0].pre='treasure';R.goNode(0,0);o.revealUsed=G.S.screen==='chest';
 fr('carto',['bell'],[]);hand(['cutpath']);G.playCard(0);o.cut=G.run.cut===1;R.goMap();G.run.pos={r:0,i:0};const re=R.reachable();const far=G.run.map[1].map((_,i)=>i).find(i=>!re.includes(i));
 if(far==null)o.cutUse=true;else{R.goNode(1,far);o.cutUse=G.run.pos.r===1&&G.run.pos.i===far&&G.run.cut===0}
 fr('carto',['bell'],[]);G.cb.slots=[];const w=mkc('stake');w.rank=2;G.cb.slots.push(w);hand(['stakenext']);G.playCard(0);o.preWp=!!G.run.preWp&&G.run.preWp.rank===2;
 G.startCombat('fight',['slug']);o.preWpPlaced=G.cb.slots.some(x=>x.id==='stake'&&x.rank===2)&&!G.run.preWp;
 fr('carto',['bell'],[]);G.cb.slots=[];hand(['stakenext']);o.stakeGate=!C.canPlay(G.cb.hand[0]);
 fr('carto',['bell'],[]);hand(['forcedmarch']);G.playCard(0);o.march=G.mod('advances',{},1)===2;
 fr('carto',['bell'],[]);G.cb.slots=[mkc('stake'),mkc('stake')];G.run.potions=['cairndust',null,null];C.drinkPotion(0);o.cairnDust=G.cb.slots.every(x=>x.rank===1);
 // ---- Duelist: Standing Ovation ----
 fr('duel',['bell'],[]);hand(['ovation','thrust','thrust','thrust']);G.cb.mom=1;G.playCard(0);G.playCard(0);G.playCard(0);o.ovation2=G.cb.stat.flourishes===2&&G.cb.mom===1;const hv=e0().hp;G.playCard(0);o.ovationEnds=G.cb.stat.flourishes===2&&G.cb.mom===2;
 // ---- Keywords ----
 const kwl=id=>G.cards$.kwList({id,up:false}).join(',');o.kwTips=/Drenched/.test(kwl('brinedrench'))&&/Spend/.test(kwl('tithe'))&&/Resonating/.test(kwl('tuningstrike'))&&/Reveal/.test(kwl('scoutroad'))&&/Bank/.test(kwl('bankcrest'));
 return o});
console.log(JSON.stringify(out,null,1));const bad=Object.entries(out).filter(([,v])=>v===false).map(([k])=>k);if(errs.length)console.log('PAGE ERRORS',errs);
if(bad.length||errs.length){console.log('FAILED:',bad.join(', '));process.exitCode=1}else console.log('task6: all',Object.keys(out).length,'checks passed');await b.close();srv.close();})();
