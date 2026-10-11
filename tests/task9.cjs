// Current content registry completeness and core balance mechanics, using the live browser engine.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');const {start}=require('./util.js');
(async()=>{const srv=await start(0),browser=await chromium.launch();try{
const page=await browser.newPage();await page.goto(srv.url);await page.waitForFunction(()=>window.G);await page.addScriptTag({path:__dirname+'/p1/checks.js'});
const result=await page.evaluate(async()=>{window.FAST=1;const {DATA}=await import('./src/data/generated/data-v2.js');
const G=window.G,out={};for(const [cls,cards] of Object.entries(DATA.cards))out[cls]=cards.filter(c=>!G.CARDS[c.id]).map(c=>c.id);
out.relics=DATA.relics.filter(r=>!G.RELICS[r.id]).map(r=>r.id);out.potions=DATA.potions.filter(p=>!G.POTIONS[p.id]).map(p=>p.id);
out.counts=[Object.keys(G.CARDS).length,Object.keys(G.RELICS).length,Object.keys(G.POTIONS).length];
out.damage=[];
for(const up of [false,true]){P1.fr('echo',['bell']);P1.hand([P1.mkc('reverb',up)]);const foe=G.cb.ens[0],hp=foe.hp;G.playCard(0,{mark:true});const played=hp-foe.hp;P1.endT();out.damage.push([played,hp-foe.hp-played]);}
P1.fr('tide',['bell']);G.cb.tide=9;const hp=G.cb.ens[0].hp;G.combat$.tideShift(1);out.crest=hp-G.cb.ens[0].hp;out.reset=G.cb.tide;
out.hp=[G.CLASSES.tide.hp,G.CLASSES.echo.hp,G.CLASSES.carto.hp,G.CLASSES.duel.hp];
return out;});
for(const cls of ['tide','echo','carto','duel','relics','potions'])assert.deepEqual(result[cls],[],cls+' missing registrations');
assert.deepEqual(result.counts,[351,80,24]);assert.deepEqual(result.damage,[[5,10],[7,13]]);assert.equal(result.crest,14);assert.equal(result.reset,5);assert.deepEqual(result.hp,[54,40,68,82]);console.log('Task 9: live registry completeness and tuned mechanics PASS (351 cards, 80 relics, 24 potions).');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1});
