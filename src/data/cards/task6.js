// data/cards/task6.js — Claude Task 6 mechanics: Tide Spend/hold/Bank, Echo second Mark + Resonating, Cartographer run-map cards, Duelist Encore.
// Rules live in engine/combat.js (spendTide, bankCrest, markLimit, Drenched / Resonating) and engine/run.js (revealRows, cut, preWp).
// Drenched: Tide turn / Crest / Undertow hurts the enemy. Resonating: each Echo hit deals extra. Art is placeholder (class fallback).
import {W} from '../../core/state.js';
import {card} from './loader.js';
import {isUp,cname} from '../../engine/cards.js';
import {alive,spendTide,releaseBank,gainEnergy,addSt,pickSlot} from '../../engine/combat.js';
import {revealRows} from '../../engine/run.js';
import {thisTurn,log,callout,stacks} from './kit.js';
const T=(id,o)=>card('tide',id,o),E=(id,o)=>card('echo',id,o),K=(id,o)=>card('carto',id,o),D=(id,o)=>card('duel',id,o);
// ---------------- Tidecaller ----------------
T('brinedrench',{e:'💦',d:'Deal {6|8}. Apply {3|4} Drenched. Surge 1.',p:f=>{f.dmg(f.v(6,8));const t=f.tg;if(t)addSt(t,'drench',f.v(3,4));f.surge(1)}});
T('drawtide',{e:'🌀',req:()=>W.cb.tide>2,d:'Spend all Tide above 2: deal {4|5} for each Tide spent. (Cannot be played at Tide 2 or below.)',p:f=>{const n=spendTide(W.cb.tide-2);if(n>0){log('🌀 Draw the Tide: spent '+n);f.dmg(f.v(4,5)*n)}}});
T('tithe',{e:'🐚',req:()=>W.cb.tide>=3,d:'Spend 3 Tide: gain {16|21} Guard and draw 1.',p:f=>{if(spendTide(3)<3)return;f.blk(f.v(16,21));f.draw(1)}});
T('moonlock',{e:'🔒',d:'The Tide won\'t drift at the start of your next turn. At High or Low Tide: also gain {8|11} Guard and, next turn, 1 Energy.',p:f=>{const cb=W.cb;cb.holdDrift=true;log('🔒 Moonlock: the Tide will hold');
 if(f.highNow()||f.lowNow()){f.blk(f.v(8,11));f.nextTurn(()=>{gainEnergy(1);log('🔒 Moonlock: +1 Energy')},{energy:1})}}});
// Bank the Crest: while in play, reaching 10 Banks a Crest (max 3). Release = Tide meter button; a full Bank (3) releases itself at turn start.
T('bankcrest',{e:'🏦',power:{mod:{bankCrest(){return true},drawCount(inst,ctx,v){return W.cb&&W.cb.banks?Math.max(1,v-1):v}},
 on:{turnStart(inst){if(W.cb&&W.cb.banks>=3)releaseBank()}}}});
T('ripcurrent',{e:'🌪️',power:{mod:{driftCount(inst,ctx,v){return v+stacks(inst)}}}});
// ---------------- Echo Mage ----------------
E('secondverse',{e:'🎶',p:f=>{W.cb.extraMarks=1;log('🔔 Second Verse: you may Mark a second card');callout('SECOND MARK','echo')}});
E('tuningstrike',{e:'🔔',p:f=>{f.dmg(f.v(7,8));const t=f.tg;if(t)addSt(t,'reson',f.v(2,3))}});
E('struckbell',{e:'🛎️',p:f=>{f.all(f.v(7,10));alive().forEach(e=>addSt(e,'reson',f.v(2,3)))}});
// ---------------- Cartographer ----------------
K('scoutroad',{e:'🔭',p:f=>{revealRows(f.v(1,2));f.chart(f.v(2,3))}});
K('cutpath',{e:'✂️',p:f=>{f.blk(6);W.run.cut=(W.run.cut||0)+1;log('✂️ Cut a Path: after this fight you may travel to any room on the next floor');f.chart(2)}});
K('stakenext',{e:'🚩',req:()=>W.cb.slots.length>0,p:f=>{const cb=W.cb;
 const set=i=>{const w=cb.slots[i];if(!w)return;W.run.preWp={id:w.id,up:isUp(w),rank:w.rank||0};log('🚩 Your next fight begins with a copy of '+cname(w)+(w.rank?' (Rank '+w.rank+')':''))};
 if(f.echo||cb.ending||cb.mode||cb.slots.length===1)return set(0);pickSlot('Stake the Shore: send which Waypoint ahead?',set)}});
K('forcedmarch',{e:'🥾',power:{mod:{advances(inst,ctx,v){return v+stacks(inst)}}}});
// ---------------- Duelist ----------------
D('ovation',{e:'🎭',p:f=>{const n=f.v(3,4);thisTurn({id:'ovation',mod:{flourishPlan(inst,ctx,v){if((inst.n||0)>=2)return v;inst.n=(inst.n||0)+1;return {mom:n,free:true}}}});log('🎭 Standing Ovation: your next 2 Attacks are free Flourishes at '+n)}});
