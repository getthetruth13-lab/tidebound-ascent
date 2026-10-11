// Task 20: new Act 1 enemies (Penitent, Mender, Heap + Limpets, Novice, Last Tenant) in the live browser engine.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');const {start}=require('./util.js');
(async()=>{const srv=await start(0),browser=await chromium.launch();try{
const page=await browser.newPage();await page.goto(srv.url);await page.waitForFunction(()=>window.G);await page.addScriptTag({path:__dirname+'/p1/checks.js'});
const o=await page.evaluate(async()=>{const G=window.G,C=G.combat$,P=window.P1,out={};
 const turn=()=>{G.cb.hand=[];C.endTurn()};const php=()=>G.run.hp;
 // Penitent: Kneel (+2 Might), then Scourge 4 grows 7,8,9
 P.fr('tide',['penitent']);let e=G.cb.ens[0];out.penOpen=[e.block,e.next.lbl];const seq=[];for(let i=0;i<4;i++){const h=php();G.run.hp=999;const h0=999;G.cb.p.block=0;turn();seq.push(h0-G.run.hp)}out.penSeq=seq;
 // Mender: Stitch heals the lowest-% ally (not herself); Needle 6
 P.fr('tide',['knight','mender']);const k=G.cb.ens[0],m=G.cb.ens[1];k.hp=10;out.mendLbl=m.next.lbl;out.mendTgt=m.next.tgt===k.uid;G.run.hp=999;turn();out.mendHeal=k.hp;
 out.mendNeedle=m.next.a;
 // dead target: heals herself 5
 P.fr('tide',['knight','mender']);const k2=G.cb.ens[0],m2=G.cb.ens[1];m2.hp=10;k2.next={none:1};k2.hp=0;m2.next={healAlly:10,tgt:k2.uid,lbl:'Stitch'};G.run.hp=999;C.act(m2);out.mendSelf=m2.hp;
 // alone: Guard
 P.fr('tide',['mender']);out.mendAlone=G.cb.ens[0].next.b;
 // Heap spall: 2 limpets once at <=50%, then only Slam
 P.fr('tide',['heap']);const hp0=G.cb.ens[0];hp0.block=0;C.dmgEnemy(hp0,hp0.hp-Math.floor(hp0.max/2));out.limpets=G.cb.ens.filter(x=>x.key==='limpet').length;out.heapNext=hp0.next.lbl;C.dmgEnemy(hp0,1);out.limpets2=G.cb.ens.filter(x=>x.key==='limpet').length;
 // Novice: Chime adds 1 Ringing
 P.fr('tide',['novice']);G.run.hp=999;const d0=G.cb.disc.length;turn();out.ring=[].concat(G.cb.disc,G.cb.hand,G.cb.draw).filter(c=>c.id==='ringing').length;out.novLbl=G.cb.ens[0].next.lbl;
 // Last Tenant: Guard persists; breach skips the action, exposes, regains 30
 P.fr('tide',['tenant'],[],{kind:'boss'});const t=G.cb.ens[0];out.tOpen=[t.hp,t.block,t.next.lbl];G.run.hp=999;t.block=5;C.dmgEnemy(t,5);out.breach=[t.next.lbl,t.st.vuln];G.cb.p.block=0;turn();out.afterBreach=[t.block,t.st.vuln||0,G.run.hp];
 P.fr('tide',['tenant'],[],{kind:'boss'});const t2=G.cb.ens[0];G.run.hp=9999;turn();out.keepGuard=t2.block;
 P.fr('tide',['tenant'],[],{kind:'boss'});const t3=G.cb.ens[0];t3.block=0;C.dmgEnemy(t3,t3.hp-80);out.ph2=[t3.ph,t3.passive,t3.st.str];
 return out});
assert.deepEqual(o.penOpen,[8,'Kneel']);assert.deepEqual(o.penSeq,[0,7,8,9]);
assert.ok(o.mendTgt&&o.mendLbl.startsWith('Stitch'));assert.equal(o.mendHeal,20);assert.equal(o.mendNeedle,6);assert.equal(o.mendSelf,15);assert.equal(o.mendAlone,8);
assert.equal(o.limpets,2);assert.equal(o.heapNext,'Slam');assert.equal(o.limpets2,2);
assert.equal(o.ring,1);assert.equal(o.novLbl,'Clapper');
assert.deepEqual(o.tOpen,[180,30,'Shoulder']);assert.deepEqual(o.breach,['Reeling',1]);assert.deepEqual(o.afterBreach.slice(0,2),[30,0]);assert.equal(o.keepGuard,30);assert.deepEqual(o.ph2,[2,null,2]);
console.log('Task 20: new Act 1 enemies OK');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1});
