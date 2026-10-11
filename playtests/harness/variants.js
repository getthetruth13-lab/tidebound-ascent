// Proposed-balance variants, applied ONLY inside the harness's vm copy of the game (never to game files).
// Evaluated to sanity-check the numeric suggestions in the report.
function applyVariant(name){const parts=name.split('+');
 if(parts.includes('enemies')){ // normal enemies: HP x1.3, attacks x1.5; Spore Pod HP 16 / burst 14; elites: HP x1.25, attacks x1.3
  const sc=(k,hm,am)=>{const t=EN[k];t.hp=t.hp.map(x=>Math.round(x*hm));const ai=t.ai;t.ai=e=>{const m=ai(e);if(m&&m.a)return Object.assign({},m,{a:Math.round(m.a*am)});return m}};
  ['slug','gull','knight','wisp','crab'].forEach(k=>sc(k,1.3,1.5));
  EN.pod.hp=[16,16];{const ai=EN.pod.ai;EN.pod.ai=e=>{const m=ai(e);return m.boom?Object.assign({},m,{a:14}):m}}
  ['captain','eel'].forEach(k=>sc(k,1.25,1.3));EN.warden.hp=[70,70];}
 if(parts.includes('warden')){ // Warden punishes a turn with no cards played; Attack mirror 10 -> 13
  const st=startTurn;startTurn=function(){if(cb)cb.lastType=null;return st.apply(null,arguments)};
  const io=intentOf;intentOf=function(e){const m=io(e);if(e.next&&e.next.mirror){if(m.q&&cb.turn>=1)return{a:13,lbl:'Mirror: Punish idleness'};if(m.a===10)return{a:13,lbl:m.lbl}}return m}}
 if(parts.includes('duel')){ // Parry retaliation = half of Parry, once per turn total; Duel Focus +2 -> +1
  const eh=enemyHitPlayer;enemyHitPlayer=function(e,d){const sv=cb.parry;if(cb.parryUsed)cb.parry=0;else cb.parry=Math.floor(sv/2);const was=e.parried;const r=eh(e,d);if(cb){if(!was&&e.parried&&cb.parry>0)cb.parryUsed=true;cb.parry=sv}return r};
  const st=startTurn;startTurn=function(){if(cb)cb.parryUsed=false;return st.apply(null,arguments)};
  const h=hit;hit=function(e,base,f,raw){if(run.cls==='duel'&&!raw&&e&&e.hp>0&&!e.fled){const top=Math.max(...alive().map(x=>x.hp));if(e.hp===top)base-=1}return h(e,base,f,raw)}}
 if(parts.includes('echo')){ // Feedback Resound 16->12 (20->15), Delay Line Resound 14->11 (18->14)
  CARDS.feedback.p=f=>f.dmg(f.echo?f.v(12,15):f.v(8,10));CARDS.delay.p=f=>f.blk(f.echo?f.v(11,14):f.v(7,9))}
 if(parts.includes('tide')){ // Crest 8->12 dmg, Undertow 8->12 block; High Tide 6+, Low Tide 4-
  const F0=F;F=function(ci,o){const f=F0(ci,o);f.low=cb.tide<=4;f.high=cb.tide>=6;return f};
  const ct=checkTide;checkTide=function(){if(cb.tide>=10&&CFG.mech){const d=cb.pw.spring?16:12;const p=SRC;SRC='tide';if(REAL&&F_())F_().crest++;alive().forEach(e=>dmgEnemy(e,d));SRC=p;cb.tide=5;return}
   if(cb.tide<=0&&CFG.mech){const n=cb.pw.neap;const p=SRC;SRC='tide';if(REAL&&F_())F_().undertow++;gainBlock(n?16:12);drawCards(n?2:1);SRC=p;cb.tide=5;return}return ct()}}
 if(parts.includes('carto')){ // Cartographer starts each combat with 2 different random starting Waypoints (instead of 1)
  const sc=startCombat;startCombat=function(kind,enc){sc(kind,enc);if(cb&&run.cls==='carto'&&CFG.mech){const have=cb.slots.map(w=>w.id);const ids=['signal','cache','lookout'].filter(x=>!have.includes(x));const id=ids[Math.floor(Math.random()*ids.length)];cb.slots.push({id,uid:UID++,up:false,temp:true})}}}
 if(parts.includes('echohp')){ // Echo Mage max HP 66 -> 58, Reverb Resound 10 -> 8
  CLASSES.echo.hp=58;CARDS.reverb.p=f=>f.dmg(f.echo?f.v(8,12):f.v(4,6))}
}
