// data/cards/colorless.js — shared colourless cards (16) and tokens (Note, Flotsam, Gull Feather, Spear Tip).
// Colourless cards come from the merchant, events and some potions; tokens are created by other cards (rarity Special).
import {W,pick,shuffle} from '../../core/state.js';
import {CARDS} from '../../core/registry.js';
import {card} from './loader.js';
import {cname} from '../../engine/cards.js';
import {alive,randAlive,hit,addCard,sinkCard,gainEnergy,gainBlock} from '../../engine/combat.js';
import {ask,thisTurn,forCombat,callout,log,floatText,stacks} from './kit.js';
const X=(id,o)=>card('colorless',id,o);
X('sealegs',{e:'🦵',d:'Gain {4|7} Guard. Draw 1.',fx:[['block',4,7],['draw',1]]});
X('plank',{e:'🪵',d:'Gain {10|14} Guard. Sink.',fx:[['block',10,14]]});
X('harpoon',{e:'🔱',moor:1,d:'Deal {10|14}. Moor.',fx:[['dmg',10,14]]});
X('driftmail',{e:'📨',d:'Choose 1 of 3 random cards from your class. Add it to your hand. It costs 0 this turn.{| The chosen card is upgraded.} Sink.',p:f=>{
 const pool=Object.values(CARDS).filter(d=>d.cls===W.run.cls&&(d.r==='c'||d.r==='u'||d.r==='r')&&!(W.run.lock&&W.run.lock.cards[d.id]));const three=shuffle(pool.slice(),'combat').slice(0,3);
 ask(f,'Driftwood Mail: choose a card (costs 0 this turn)',three.map(d=>({l:(d.e||'')+' '+d.n+(f.u?'+':''),f:()=>{addCard(d.id,'hand',{cost0Turn:true,up:f.u});log('📨 Driftwood Mail: '+d.n+(f.u?'+':''));floatText('p','📨 '+d.n,'')}})))}});
X('fishnet',{e:'🕸️',d:'Apply {1|2} Soaked and {1|2} Exposed to ALL. Sink.',p:f=>{const n=f.v(1,2);alive().forEach(e=>{f.weak(n,e);f.vuln(n,e)})}});
X('spyglass',{e:'🔭',d:'Draw {2|3}. Sink.',fx:[['draw',2,3]]});
X('saltrub',{e:'🧂',d:'Remove all your debuffs. Sink.',p:f=>{const s=W.cb.p.st;let n=0;for(const k of ['weak','vuln','brittle'])if(s[k]){delete s[k];n++}if((s.str||0)<0){delete s.str;n++}
 floatText('p',n?'🧂 cleansed':'🧂 no debuffs','b');log('🧂 Salt Rub: '+n+' debuff'+(n===1?'':'s')+' removed')}});
X('bilgepump',{e:'🪣',d:'Sink up to 2 cards in your hand. Draw {2|3}.',p:f=>{const cb=W.cb;let k=0;const draw=()=>f.draw(f.v(2,3));
 const step=()=>{if(k>=2||!cb.hand.length||f.echo)return draw();ask(f,'Bilge Pump: Sink a card ('+(2-k)+' left)?',[{l:'✔️ Done',f:draw},...cb.hand.map(ci=>({l:'🫧 Sink '+(CARDS[ci.id].e||'')+' '+cname(ci),f:()=>{const i=cb.hand.indexOf(ci);if(i>=0){cb.hand.splice(i,1);sinkCard(ci,'bilgepump');log('🪣 Sank '+cname(ci))}k++;step()}}))])};step()}});
X('gullsdue',{e:'🪙',d:'Deal {8|11}. If this kills, gain {12|15} gold.',p:f=>{f.dmg(f.v(8,11));if(f.killed){const g=f.v(12,15);W.run.gold+=g;floatText('p','+'+g+' gold','');callout('+'+g+' 🪙','potion')}}});
X('shanty',{e:'🎶',d:'Next turn, gain 1 Energy and draw 1.',p:f=>{W.cb.nextDraw++;f.nextTurn(()=>{gainEnergy(1);log('🎶 Sea Shanty: +1 Energy')},{energy:1});floatText('p','🎶 next turn: +1⚡ +1 card','e')}});
X('krakengrasp',{e:'🐙',tg:1,d:'The target loses {8|12} Might this turn. Sink.',p:f=>{const t=f.tg;if(!t)return;const n=f.v(8,12);t.st.mightTmp=(t.st.mightTmp||0)-n;floatText(t.uid,'−'+n+' Might','');callout('KRAKEN\'S GRASP −'+n,'potion')}});
X('tidalbore',{e:'🌊',d:'Deal {30|40} to ALL. Sink.',p:f=>{callout('TIDAL BORE','crest');f.all(f.v(30,40))}});
X('orders',{e:'📜',xu:0,d:'Draw 3. The next card you play this turn costs 0.{ Sink.|}',p:f=>{const src=f.ci;f.draw(3);
 thisTurn({id:'orders',mod:{cost(inst,ctx,v){return inst.dead||ctx.card===src?v:0}},on:{cardPlayed(inst,ctx){if(ctx.card!==src)inst.dead=true}}})}});
X('fairwinds',{e:'⛵',d:'At the start of your turn, gain {3|5} Guard.',power:{on:{turnStart(inst){gainBlock((inst.up?5:3)*stacks(inst),{fromCard:true})}}}});
X('treasuremap',{e:'🗺️',d:'At the end of this combat, gain {30|45} gold. Sink.',p:f=>{const g=f.v(30,45);floatText('p','🗺️ +'+g+' gold if you win','');
 forCombat({id:'treasuremap',on:{combatEnd(inst,ctx){if(inst.dead||!ctx.won)return;inst.dead=true;W.run.gold+=g;log('🗺️ Treasure Map: +'+g+' gold')}}})}});
X('squall',{e:'🌪️',d:'Deal {7|8} to ALL, X times.',p:f=>{if(!f.x){log('🌪️ Squall: no Energy spent');return}f.all(f.v(7,8),f.x);if(f.x>=3)callout('SQUALL ×'+f.x,'crest')}});
// ---------------- tokens ----------------
X('note',{e:'🎵',d:'Deal {2|3} to a random enemy. Sink. Faint.',p:f=>{const t=randAlive();if(t)hit(t,f.num(f.v(2,3)),f)}});
X('flotsam',{e:'🪵',d:'Gain {3|5} Guard. Sink.',fx:[['block',3,5]]});
X('gullfeather',{e:'🪶',d:'Draw {1|2}. Sink.',fx:[['draw',1,2]]});
X('speartip',{e:'🔱',d:'Deal {5|8}. Sink.',fx:[['dmg',5,8]]});
