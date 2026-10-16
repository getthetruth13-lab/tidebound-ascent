// data/act3/enemies.js: the Act 3 roster, The Galecrown (studio/design/ACT3-ENEMIES.md, rules ACT3-RULES.md, FROZEN numbers ACT3-ENEMY-NUMBERS.md).
// Every enemy is `act:3`, none appears in Act 1 or Act 2, and none sits in an earlier act's encounter table.
// New intent fields (engine: engine/combat.js, ACT3-RULES): gust:N (cards blown back on your draw pile), numb:1 (cheapest card +1 cost), tide:1 (Storm Tide),
//   dive:1 / surface:1 (Cloud Dive), discharge:1 (spends the Charge, adds a Static), chg:N (Charge gained at its turn end, default 1), tail:N (Tailwind),
//   brittleLast:1 (Brittle on the last hit only), veil:'atk'|'def'|'mix' (hidden number), link:1 (Twin link +2 per hit), oc:N (Overclock: 12 + N per ring alive).
// Beats: each enemy and move carries `anim:{wind,strike,impact,hits,tier,hold}` (ACT3-ENEMIES section 0).
import {registerEnemies,EN} from '../../core/registry.js';
import {W} from '../../core/state.js';
import {mod,fire} from '../../core/bus.js';
import {pk,loop,open,AI,hurt,allies} from '../enemies.js';
import {addSt,alive,countAlive,log,callout,spawn,bossBeat,floatText,poolOf,setPool,pullPlayer,enemyHitPlayer} from '../../engine/combat.js';
import {ECON} from '../../engine/run.js';
const HP={jelly:[48,54],polyp:[84,92],voltray:[72,80],skua:[62,68],petrel:[40,46],automaton:[110,120],cloudshark:[96,104],cloudserpent:[118,128],galereader:[50,56],lenswright:[78,86],slinger:[58,64],anchorite:[100,108],
 ringpull:[40,40],ringcharge:[40,40],ringveil:[40,40],hailorb:[14,14],shardcarrier:[36,36],magus:[210,220],squallwest:[105,115],squalleast:[105,115],eyegale:[230,240],engine:[480,480],thalassa:[500,500],navigator:[420,420]};
// Act 3 elite numbers are final, so they opt out of the Act 1 elite damage scaling.
ECON.eliteDmgByKey=ECON.eliteDmgByKey||{};for(const k of ['magus','squallwest','squalleast','eyegale'])ECON.eliteDmgByKey[k]=1;
const A=(wind,strike,impact,o={})=>({wind,strike,impact,hits:1,tier:'normal',...o});
const AE=(wind,strike,impact,o={})=>A(wind,strike,impact,{tier:'elite',...o}),AB=(wind,strike,impact,o={})=>A(wind,strike,impact,{tier:'boss',...o});
const took=e=>e.base==null?0:Math.max(0,e.base-e.hp);
const STATIC={id:'static',n:1,pile:'draw'};
const rings=()=>alive().filter(x=>x.key==='ringpull'||x.key==='ringcharge'||x.key==='ringveil');
const ringOn=k=>alive().some(x=>x.key===k);
// ---- R1 Static Charge ----
// +1 Charge (or the move's `charge`) at the end of its own turn; a Discharge turn does not add. The Discharge itself is a normal move (discharge:1 resets the pool in act()).
const chargeTick=e=>{const m=e.lastAct||{};if(m.discharge||e.hp<=0)return;setPool(e,poolOf(e)+(m.chg||1))};
// Interrupt: lost >= N HP in one player turn -> Charge -1 once; the intent is recomputed so a queued Discharge slips a turn.
const interrupt=N=>e=>{if(e.intr||e.hp<=0||took(e)<N||poolOf(e)<=0)return;e.intr=true;const was=poolOf(e);setPool(e,was-1);log('⚡ '+e.n+' loses a Charge pip');floatText(e.uid,'-1 Charge','b');
 if(e.next&&e.next.discharge&&poolOf(e)<3)e.next=EN[e.key].ai(e)};
const CHARGE_PASSIVE={n:'Static Charge',text:'Charge builds each turn. At 3 it discharges and adds a Static.',charge:1,endTurn:chargeTick};
// ---- R7 helpers ----
const twins=()=>alive().filter(x=>x.key==='squallwest'||x.key==='squalleast');
// ---- R13 Shard ----
const bodies=()=>alive().filter(x=>x.key==='navigator'||x.key==='shardcarrier');
const holder=()=>bodies().find(x=>x.holds)||null;
const nav=()=>alive().find(x=>x.key==='navigator');
const holdHalf=(e,d)=>e.holds?Math.ceil(d/2):d; // takes 50% less damage (rounded up)
function dropShard(why){const cb=W.cb;if(!cb)return;bodies().forEach(x=>{x.holds=false});(W.cb.ens||[]).forEach(x=>{x.holds=false});cb.shardDropped=true;log('💎 The Deep Shard drops'+(why?' ('+why+')':''));callout('SHARD DROPPED','boss');
 const n=nav();if(n&&!n.keepNext){n.next=EN.navigator.ai(n)}}
registerEnemies({
 // ================= NORMALS =================
 // 1.1 Stormglass Jelly [CHARGE]: Drift (0) -> Sting (1) -> Sting (2) -> Discharge (3). Lose >= 12 HP in a turn and a pip drops.
 jelly:{n:'Stormglass Jelly',e:'🎐',act:3,role:'attacker',hp:HP.jelly,anim:A('spark','lunge','shock'),passive:CHARGE_PASSIVE,
  ai:AI(e=>{const c=poolOf(e);
   if(c>=3)return {a:11,discharge:1,status:STATIC,lbl:'Discharge',anim:A('spark','arc','shock')};
   return c===0?{b:5,lbl:'Drift',anim:A('spark','lunge','shock',{hits:0})}:{a:7,lbl:'Sting',anim:A('spark','lunge','shock')}}),
  onDamaged:interrupt(12)},
 // 1.2 Galecrown Polyp [CHARGE, shared pool]: all polyps add to ONE Charge counter; the first to act at 3 fires the Arc.
 polyp:{n:'Galecrown Polyp',e:'🍄',act:3,role:'attacker',hp:HP.polyp,anim:A('spark','shot','shock'),passive:{...CHARGE_PASSIVE,text:'All polyps share one Charge. At 3 the first polyp to act fires an Arc and adds a Static.'},
  ai:AI(e=>{const first=alive().find(x=>x.key==='polyp')===e;
   if(poolOf(e)>=3&&first)return {a:16,discharge:1,status:STATIC,lbl:'Arc',anim:A('spark','arc','shock')};
   const sp={a:5,h:2,lbl:'Spark Spit',anim:A('spark','shot','shock',{hits:2})},cl={b:10,lbl:'Clamp',anim:A('coil','lunge','shock',{hits:0})};
   if(!e.t)return open(e,[sp,cl]);
   return pk(e,[{w:50,m:sp,rep:2},{w:25,m:cl,rep:1}])}),
  intent:e=>{const m=e.next||{none:1};const first=alive().find(x=>x.key==='polyp')===e;
   if(poolOf(e)>=3&&first)return {a:16,discharge:1,status:STATIC,lbl:'Arc',anim:A('spark','arc','shock')};
   return m.discharge?{a:5,h:2,lbl:'Spark Spit',anim:A('spark','shot','shock',{hits:2})}:m},
  onDamaged:interrupt(14)},
 // 1.3 Voltaic Ray [CHARGE]: Skim (+1), Coil Charge (+2), Thunder Run at 3.
 voltray:{n:'Voltaic Ray',e:'🦈',act:3,role:'attacker',hp:HP.voltray,anim:A('lean','swoop','blunt'),passive:CHARGE_PASSIVE,
  ai:AI(e=>{const c=poolOf(e);
   if(c>=3)return {a:12,h:2,discharge:1,status:STATIC,lbl:'Thunder Run',anim:A('spark','arc','shock',{hits:2})};
   return c===1?{b:6,chg:2,lbl:'Coil Charge',anim:A('spark','lunge','shock',{hits:0})}:{a:5,h:2,lbl:'Skim',anim:A('lean','swoop','blunt',{hits:2})}}),
  onDamaged:interrupt(12)},
 // 1.4 Drift Skua [GUST]
 skua:{n:'Drift Skua',e:'🪶',act:3,role:'attacker',hp:HP.skua,anim:A('flare','swoop','gale'),
  ai:AI(e=>{const sw={a:9,gust:1,lbl:'Swoop',anim:A('flare','swoop','gale')},dv={a:15,lbl:'Dive',anim:A('tuck','swoop','blunt')},se={b:7,lbl:'Settle'};
   if(!e.t)return open(e,[sw,dv]);
   return pk(e,[{w:40,m:sw,rep:2},{w:40,m:dv,rep:2},{w:20,m:se,rep:1}])})},
 // 1.5 Storm Petrel [GUST]: at half HP Flap becomes Whirl (Gust 2).
 petrel:{n:'Storm Petrel',e:'🐦‍⬛',act:3,role:'attacker',hp:HP.petrel,anim:A('flare','swoop','blunt'),
  ai:AI(e=>{const half=e.hp<=e.max/2;const sk={a:4,h:3,lbl:'Skim',anim:A('flare','swoop','blunt',{hits:3})},fl={a:3,b:4,lbl:'Flap',anim:A('flare','cast','blunt')},wh={a:3,gust:2,lbl:'Whirl',anim:A('spin','cast','gale')};
   if(!e.t)return open(e,[sk,fl]);
   return pk(e,[{w:45,m:sk,rep:2},{w:half?0:35,m:fl,rep:1},{w:half?60:0,m:wh,rep:2}])})},
 // 1.6 Rime Automaton [NUMB]: Frost Gear, Pound, Grind, Stiff.
 automaton:{n:'Rime Automaton',e:'🤖',act:3,role:'bruiser',hp:HP.automaton,anim:A('spin','lunge','blunt'),
  ai:AI(e=>loop(e,[{numb:1,b:8,lbl:'Frost Gear',anim:A('spin','lunge','blunt',{hits:0})},{a:18,lbl:'Pound',anim:A('raise','drop','blunt')},{a:9,numb:1,lbl:'Grind',anim:A('spin','lunge','blunt')},{b:6,lbl:'Stiff'}]))},
 // 1.7 Cloudfin Shark [DIVE]: Bite, Fin Slash, Circle (dives next turn), Breach.
 cloudshark:{n:'Cloudfin Shark',e:'🦈',act:3,role:'bruiser',hp:HP.cloudshark,anim:A('lean','lunge','pierce'),
  passive:{n:'Cloud Dive',text:'When it dives, only area damage and Bleed can reach it.',dive:1},
  ai:AI(e=>loop(e,[{a:11,lbl:'Bite',anim:A('lean','lunge','pierce')},{a:6,h:2,lbl:'Fin Slash',anim:A('rear','lunge','blunt',{hits:2})},{dive:1,b:6,lbl:'Dives next turn',anim:A('tuck','lunge','blunt',{hits:0})},{a:20,surface:1,lbl:'Breach',anim:A('build','breach','pierce')}]))},
 // 1.8 Cloudfin Serpent [DIVE]
 cloudserpent:{n:'Cloudfin Serpent',e:'🦎',act:3,role:'bruiser',hp:HP.cloudserpent,anim:A('rear','lunge','blunt'),
  passive:{n:'Cloud Dive',text:'When it dives, only area damage and Bleed can reach it.',dive:1},
  ai:AI(e=>loop(e,[{a:12,lbl:'Lash',anim:A('rear','lunge','blunt')},{b:10,lbl:'Coil',anim:A('coil','lunge','blunt',{hits:0})},{dive:1,b:8,lbl:'Slips below',anim:A('tuck','lunge','blunt',{hits:0})},{a:14,v:1,surface:1,lbl:'Constrict',anim:A('build','breach','blunt')}]))},
 // 1.9 Gale Reader: Tailwind makes every ally's next attack hit 4 harder (itself if alone).
 galereader:{n:'Gale Reader',e:'📜',act:3,role:'support',hp:HP.galereader,anim:A('read','cast','gale'),
  ai:AI(e=>{const rd={tail:4,b:4,lbl:'Read the Wind',anim:A('read','cast','gale',{hits:0}),fx:q=>{const t=alive().filter(x=>x!==q);(t.length?t:[q]).forEach(x=>{x.tailwind=Math.max(0,Math.floor(mod('tailwind',{enemy:x},4)));x.blkT=Date.now();floatText(x.uid,'Tailwind','b')})}},
    gl={a:8,lbl:'Gale Lash',anim:A('lean','cast','gale')},ch={allyB:3,b:8,lbl:'Chalk the Margin',anim:A('read','cast','gale',{hits:0})};
   if(!e.t)return open(e,[rd,gl]);
   return pk(e,[{w:allies(e).length?40:20,m:rd,rep:1},{w:35,m:gl,rep:2},{w:25,m:ch,rep:1}])})},
 // 1.10 Lens-Wright [REFRACT]: your first Attack card each turn deals 3 back to you (engine: playCard).
 lenswright:{n:'Lens-Wright',e:'🔭',act:3,role:'debuffer',hp:HP.lenswright,anim:A('raise','beam','glass'),
  passive:{n:'Refract',text:'Your first Attack each turn deals 3 back to you.',refract:1},
  ai:AI(e=>{const ps={a:6,h:3,lbl:'Prism Sweep',anim:A('raise','beam','glass',{hits:3})},bm={a:9,brittle:1,lbl:'Beam',anim:A('aim','beam','glass')},fo={b:10,lbl:'Focus',anim:A('read','beam','glass',{hits:0})};
   if(!e.t)return open(e,[ps,bm]);
   return pk(e,[{w:35,m:ps,rep:2},{w:40,m:bm,rep:2},{w:25,m:fo,rep:1}])})},
 // 1.11 Hailstone Slinger: Pelt (Brittle on the last hit only).
 slinger:{n:'Hailstone Slinger',e:'🧊',act:3,role:'attacker',hp:HP.slinger,anim:A('raise','volley','hail'),
  ai:AI(e=>{const pe={a:4,h:4,brittleLast:1,lbl:'Pelt',anim:A('raise','volley','hail',{hits:4})},hp_={a:6,h:3,brittleLast:1,lbl:'Heavy Pelt',anim:A('raise','volley','hail',{hits:3})},rl={b:7,lbl:'Reload',anim:A('crouch','lunge','hail',{hits:0})};
   if(!e.t)return open(e,[pe,hp_]);
   return pk(e,[{w:45,m:pe,rep:2},{w:30,m:hp_,rep:2},{w:25,m:rl,rep:1}])})},
 // 1.12 Windbound Anchorite [SIPHON]: when you gain Guard from a card it gains half (engine: gainBlock).
 anchorite:{n:'Windbound Anchorite',e:'⚓',act:3,role:'bruiser',hp:HP.anchorite,anim:A('haul','drop','blunt'),
  passive:{n:'Siphon',text:'When you gain Guard from a card, it gains half (up to 8 a turn).',siphon:1},
  ai:AI(e=>{const wa={b:10,lbl:'Weigh Anchor',anim:A('haul','lunge','blunt',{hits:0})},dr={a:15,lbl:'Drag',anim:A('haul','drop','blunt')},cl={a:7,h:2,lbl:'Chain Lash',anim:A('rear','lunge','blunt',{hits:2})};
   if(!e.t)return open(e,[dr,cl]);
   return pk(e,[{w:25,m:wa,rep:1},{w:40,m:dr,rep:2},{w:35,m:cl,rep:2}])})},
 // ================= SUMMONS / ADD-ONS =================
 ringpull:{n:'Pull Ring',e:'🧲',act:3,role:'support',hp:HP.ringpull,summonOnly:1,anim:A('spin','lunge','blunt'),ai:e=>({none:1,lbl:'Pull'}),
  passive:{n:'Pull Ring',text:'While it spins the Engine pulls 3 at the end of its turn.'},onDeath:e=>ringDied(e)},
 ringcharge:{n:'Charge Ring',e:'⚡',act:3,role:'support',hp:HP.ringcharge,summonOnly:1,anim:A('spin','lunge','shock'),ai:e=>({none:1,lbl:'Charge'}),
  passive:{n:'Charge Ring',text:'While it spins the Engine gains Charge each turn.'},onDeath:e=>{const g=alive().find(x=>x.key==='engine');if(g)g.charge=0;ringDied(e)}},
 ringveil:{n:'Veil Ring',e:'🌁',act:3,role:'support',hp:HP.ringveil,summonOnly:1,anim:A('spin','lunge','glass'),ai:e=>({none:1,lbl:'Veil'}),
  passive:{n:'Veil Ring',text:'While it spins the Engine takes 25% less damage.'},onDeath:e=>ringDied(e)},
 hailorb:{n:'Hail Orb',e:'🧊',act:3,role:'attacker',hp:HP.hailorb,summonOnly:1,anim:A('raise','drop','hail'),ai:e=>({none:1,lbl:'Falls soon'}),onSpawn:e=>{e.age=0}},
 shardcarrier:{n:'Shard Carrier',e:'🧳',act:3,role:'attacker',hp:HP.shardcarrier,summonOnly:1,anim:A('lean','lunge','blunt'),dmgMod:holdHalf,
  ai:AI(e=>{const co={a:7,lbl:'Carry On'},br={b:6,lbl:'Brace'};return pk(e,[{w:60,m:co,rep:2},{w:40,m:br,rep:1}])}),
  onDeath:e=>{if(e.holds)dropShard('the holder falls')}},
 // ================= ELITES =================
 // 3.1 The Magus [TIDE]: Read the Tide puts Storm Tide on your next turn. Loop of 5; at half HP the Squall Strike drops out.
 magus:{n:'The Magus',e:'🧙',act:3,role:'debuffer',hp:HP.magus,elite:1,anim:AE('read','arc','shock'),
  passive:{n:'Storm Tide',text:'Storm Tide weakens your Surge, Recede, or first Guard card for a turn.',stormtide:1},
  ai:AI(e=>{const half=e.hp<=e.max/2;const seq=[{tide:1,b:12,lbl:'Read the Tide',anim:AE('read','arc','shock',{hits:0,hold:1.1})},{a:16,lbl:'Lightning Brand',anim:AE('raise','arc','shock')},{b:12,lbl:'Thunderhead next',anim:AE('build','arc','shock',{hits:0})},{a:26,lbl:'Thunderhead',anim:AE('build','arc','shock',{hold:1.3})}];
   if(!half)seq.push({a:9,h:2,lbl:'Squall Strike',anim:AE('raise','cast','gale',{hits:2})});return loop(e,seq)})},
 // 3.2 Twin Squalls [two bodies]: only the front twin is a single target; they trade places after every enemy round.
 squallwest:{n:'Squall (West)',e:'🌪️',act:3,role:'attacker',hp:HP.squallwest,elite:1,anim:AE('lean','lunge','gale'),passive:{n:'Twin Squalls',text:'Only the front twin can be hit. They swap each turn. AoE and Bleed reach both.',twin:1},
  ai:e=>twinAI(e),intent:e=>twinIntent(e),onSpawn:e=>{e.back=false},onDeath:e=>twinDied(e)},
 squalleast:{n:'Squall (East)',e:'🌬️',act:3,role:'attacker',hp:HP.squalleast,elite:1,anim:AE('raise','cast','gale'),passive:{n:'Twin Squalls',text:'Only the front twin can be hit. They swap each turn. AoE and Bleed reach both.',twin:1},
  ai:e=>twinAI(e),intent:e=>twinIntent(e),onSpawn:e=>{e.back=true},onDeath:e=>twinDied(e)},
 // 3.3 Eye of the Gale [VEIL]: a fixed loop of four, alternating clear and veiled turns. A Marked eye shows its number.
 eyegale:{n:'Eye of the Gale',e:'👁️',act:3,role:'attacker',hp:HP.eyegale,elite:1,anim:AE('lean','cast','gale'),
  passive:{n:'Squall Veil',text:'Veiled intent hides the number. It never exceeds 26.',veil:1},
  ai:AI(e=>loop(e,[{a:12,h:2,lbl:'Sidewind',anim:AE('lean','cast','gale',{hits:2})},{a:22,veil:'atk',lbl:'Stormfall',anim:AE('build','drop','blast',{hold:1.4})},{b:14,s:1,lbl:'Shelter',anim:AE('lean','cast','gale',{hits:0})},{b:18,a:10,veil:'mix',lbl:'Eyewall',anim:AE('open','cast','blast',{hold:1.2})}])),
  intent:e=>{const m=e.next||{none:1};if(!m.veil)return m;const cb=W.cb;const marked=!!cb&&((cb.mark&&cb.markTgt===e)||(cb.mark2&&cb.markTgt2===e));return {...m,veiled:!marked,fog:!marked}}},
 // ================= BOSSES =================
 // 4.1 The Maelstrom Engine [RINGS]: each living ring gives it a rule; Overclock / Redline scale with rings alive.
 engine:{n:'The Maelstrom Engine',e:'⚙️',act:3,role:'bruiser',hp:HP.engine,boss:1,anim:AB('spin','drop','blast'),
  passive:{n:'Overclock rings',text:'Each ring gives the Engine a rule. Break a ring to lose it. Fewer rings, weaker blasts.',rings:1,
   endTurn:e=>{if(ringOn('ringpull'))pullPlayer(3);if(ringOn('ringcharge')){const m=e.lastAct||{};if(!m.discharge)setPool(e,poolOf(e)+1)}}},
  dmgMod:(e,d)=>ringOn('ringveil')?Math.floor(d*(e.flare?.65:.75)):d,
  onSpawn:e=>{if(W.cb)for(const k of ['ringpull','ringcharge','ringveil'])spawn(k,{summoned:true})},
  ai:AI(e=>{if(e.stall){e.stall=false;return {none:1,lbl:'Stalled'}}
   if(e.flareT!=null&&e.t>=e.flareT+2){e.flare=false;e.flareT=null}
   const su={b:12,lbl:'Spin Up',anim:AB('spin','lunge','blast',{hits:0})};
   if(e.ph===1)return loop(e,[su,{a:14,lbl:'Piston',anim:AB('haul','lunge','blunt')},{a:6,h:3,lbl:'Flywheel',anim:AB('spin','cast','pierce',{hits:3})},{a:12,oc:6,lbl:'Overclock',anim:AB('spin','drop','blast',{hold:1.5})}]);
   return loop(e,[{a:14,lbl:'Piston',anim:AB('haul','lunge','blunt')},{a:7,h:3,lbl:'Flywheel',anim:AB('spin','cast','pierce',{hits:3})},{b:14,lbl:'Spin Up',anim:AB('spin','lunge','blast',{hits:0})},
    {a:12,oc:8,lbl:'Redline',anim:AB('spin','drop','blast',{hold:1.6}),fx:q=>{if(ringOn('ringpull'))pullPlayer(3);if(ringOn('ringcharge'))setPool(q,poolOf(q)+1);q.flare=true;q.flareT=q.t}}])}),
  intent:e=>{const m={...(e.next||{none:1})};if(m.oc)m.a=12+m.oc*rings().length;
   if(m.a&&ringOn('ringcharge')&&poolOf(e)>=3){m.a+=8;m.discharge=1;m.status=STATIC}return m},
  onDamaged:e=>{if(e.ph===1&&e.hp<=240){e.ph=2;e.ci=0;e.hist=[];e.next=EN.engine.ai(e);if(W.cb.acting===e)e.keepNext=true;log('⚙️ The Engine runs away: Redline');bossBeat('phase','Runaway','The rings spin faster. Redline.',e)}}},
 // 4.2 Thalassa the Undrowned [WATER]: hail, orbs, a verdict; in phase 2 your Guard drains you (engine: endTurn Water).
 thalassa:{n:'Thalassa the Undrowned',e:'🌩️',act:3,role:'support',hp:HP.thalassa,boss:1,anim:AB('raise','volley','hail'),
  passive:{n:'Undrowned',text:'Heals 3 at the end of her turn if you played no Attack. From half HP, Water drains 1 HP per 5 Guard you hold at turn end.',water:1,
   endTurn:e=>{const cb=W.cb;
    // Hail Orbs that have waited a full round fall now (6 + Brittle); the new ones age one round.
    alive().filter(x=>x.key==='hailorb').forEach(o=>{if(o.age>=1){log('🧊 A Hail Orb falls');enemyHitPlayer(o,6);if(W.run.hp>0)addSt(cb.p,'brittle',1);o.hp=0;o.fled=true}else o.age++});
    if(cb.stat.attacksTurn===0&&e.hp<e.max){const h=Math.min(3,e.max-e.hp);e.hp+=h;floatText(e.uid,'+'+h,'h');log('👑 Undrowned: Thalassa heals '+h)}}},
  ai:AI(e=>{const raise={summon:'hailorb',n:2,max:3,lbl:'Raise Hail',anim:AB('read','cast','hail',{hits:0})};
   if(e.ph===1)return loop(e,[{a:6,h:3,lbl:'Hail Volley',anim:AB('raise','volley','hail',{hits:3})},raise,{b:14,lbl:'Verdict next',anim:AB('open','cast','water',{hits:0})},{a:26,lbl:'Tidal Verdict',anim:AB('raise','drop','water',{hold:1.4})}]);
   return loop(e,[{a:6,h:4,lbl:'Hail Volley',anim:AB('raise','volley','hail',{hits:4})},raise,{b:16,lbl:'Falls in 2',anim:AB('open','cast','water',{hits:0})},{b:6,lbl:'Falls in 1',anim:AB('open','cast','water',{hits:0})},{a:40,lbl:'Undrowning',anim:AB('raise','drop','water',{hold:1.6})}])}),
  onDamaged:e=>{if(e.ph===1&&e.hp<=250){e.ph=2;['weak','vuln','bleed','brittle','drench','reson'].forEach(k=>delete e.st[k]);addSt(e,'str',1);e.ci=0;e.hist=[];e.queued=null;
   for(let i=0;i<2&&countAlive('hailorb')<3;i++){const o=spawn('hailorb',{summoned:true});o.age=1}
   e.next=EN.thalassa.ai(e);if(W.cb.acting===e)e.keepNext=true;log('👑 The sea comes down: Water begins');bossBeat('phase','The sea comes down','Water drains your Guard. Hit hard.',e)}}},
 // 4.3 The Drowned Navigator [SHARD]: one body holds the Deep Shard (half damage, +4 attacks); the pass fails if you hurt the holder or kill the next one.
 navigator:{n:'The Drowned Navigator',e:'🧭',act:3,role:'support',hp:HP.navigator,boss:1,anim:AB('read','drop','blast'),dmgMod:holdHalf,
  passive:{n:'The Deep Shard',text:'The holder takes half damage. Hurt it badly, or kill the next holder, and the pass fails.',shard:1,
   endTurn:e=>{const cb=W.cb;if(cb.shardDropped||e.hp<=0)return;if(e.ph<2&&e.t%2)return;const h=holder();if(!h)return;
    const order=cb.shardOrder.filter(x=>x.hp>0);const i=order.indexOf(h),nxt=order[(i+1)%order.length];const thr=e.ph===2?12:15;
    cb.shardOrder.forEach(x=>{if(x.hp<=0)x.dead=true});
    const nextDead=cb.shardOrder[(cb.shardOrder.indexOf(h)+1)%cb.shardOrder.length].hp<=0;
    if(took(h)>=thr||nextDead||!nxt||nxt===h)return dropShard(nextDead?'the next holder is down':'hurt too badly');
    h.holds=false;nxt.holds=true;nxt.blkT=Date.now();log('💎 The Shard passes to '+nxt.n);floatText(nxt.uid,'Shard','b');callout('SHARD PASSED','boss');fire('shardPass',{from:h,to:nxt}) /* Act 3 hook: onShardPass */}},
  onSpawn:e=>{const cb=W.cb;if(!cb)return;e.holds=true;cb.shardDropped=false;const a=spawn('shardcarrier',{summoned:true}),b=spawn('shardcarrier',{summoned:true});cb.shardOrder=[e,a,b]},
  ai:AI(e=>{const cb=W.cb;if(cb&&cb.shardDropped)return {b:10,retrieve:1,lbl:'Retrieve',anim:AB('lean','lunge','blunt',{hits:0}),fx:q=>{q.holds=true;W.cb.shardDropped=false;log('💎 The Navigator retrieves the Shard')}};
   const ch={b:14,lbl:'Chart a Course',anim:AB('read','cast','blunt',{hits:0})},ll={a:10,v:1,lbl:'Lead Line',anim:AB('haul','snatch','blunt')};
   return loop(e,[e.ph===2?ll:ch,{a:6,h:3,lbl:'Cast the Line',anim:AB('haul','lob','blunt',{hits:3})},{b:8,lbl:'Reckoning next',anim:AB('read','cast','blunt',{hits:0})},{a:34,lbl:'Dead Reckoning',anim:AB('raise','drop','blast',{hold:1.5})}])}),
  onDeath:e=>{},
  onDamaged:e=>{if(e.ph===1&&e.hp<=210){e.ph=2;e.ci=0;e.hist=[];const cb=W.cb;
   // All hands: a fresh pair of couriers rise into any empty slot (once)
   cb.shardOrder.forEach((x,i)=>{if(i>0&&x.hp<=0){const c=spawn('shardcarrier',{summoned:true});cb.shardOrder[i]=c}});
   e.next=EN.navigator.ai(e);if(W.cb.acting===e)e.keepNext=true;log('🧭 All hands: the Shard passes every turn');bossBeat('phase','All hands','The Shard passes every turn. Hurt it at 12.',e)}}}
});
// ---- Twin Squalls ----
// Both candidate moves are rolled once; the one shown follows the CURRENT rank, so after the swap the intents trade too.
function twinAI(e){const f=pk(e,[{w:65,m:{a:10,link:1,lbl:'Gale Cut',anim:AE('lean','lunge','gale')},rep:2},{w:35,m:{b:10,lbl:'Shelter',anim:AE('crouch','lunge','blunt',{hits:0})},rep:1}]);
 const b=pk(e,[{w:65,m:{a:4,h:2,link:1,lbl:'Crosswind',anim:AE('raise','cast','gale',{hits:2})},rep:2},{w:35,m:{b:8,lbl:'Cloud Bank',anim:AE('raise','cast','gale',{hits:0})},rep:1}]);
 e.nf=f;e.nb=b;return e.back?b:f}
function twinIntent(e){const lone=twins().length<2;const m=lone||!e.back?(e.nf||e.next):(e.nb||e.next);if(!m)return {none:1};
 if(m.link&&!lone)return {...m,a:m.a+2};return m}
function twinDied(e){const s=twins().find(x=>x!==e);if(s&&s.hp>0){s.back=false;s.block+=8;s.blkT=Date.now();log('🌪️ Lone Gale: the survivor takes the front, +8 Guard');W.cb.tgt=W.cb.ens.indexOf(s)}}
// ---- Maelstrom Engine: ring death ----
function ringDied(r){const g=alive().find(x=>x.key==='engine');if(!g)return;
 if(g.ph===2&&!rings().length){g.stall=true;g.next={none:1,lbl:'Stalled'};if(W.cb.acting===g)g.keepNext=true;log('⚙️ No rings left: the Engine stalls');callout('STALLED','boss')}}
// Tutorial lines (ACT3-RULES): shown once per run the first time the rule's enemy appears.
const TIPS={jelly:'At three Charge it discharges and clogs your deck with Static.',polyp:'Polyps share one Charge. At three, one of them fires.',voltray:'At three Charge it discharges and clogs your deck with Static.',
 skua:'Gust sends your last drawn card back on top of the draw pile.',petrel:'Gust sends your last drawn card back on top of the draw pile.',automaton:'Numbed: your cheapest card costs one more this turn.',
 cloudshark:'When it dives, only area damage and Bleed can reach it.',cloudserpent:'When it dives, only area damage and Bleed can reach it.',galereader:"Tailwind: its allies' next attack hits four harder.",
 lenswright:'Your first Attack each turn hurts you for 3. Lead with Skills.',slinger:'Pelt hits many times. The last hit makes you Brittle.',anchorite:'Gain Guard from a card and the Anchorite takes half.',
 magus:'Storm Tide weakens your Surge, Recede, or first Guard card.',squallwest:'Only the front twin can be hit. AoE and Bleed reach both.',eyegale:'Veiled intent hides the number. It never exceeds 26.',
 engine:'Break a ring to lose its rule. Fewer rings, weaker blasts.',thalassa:'Water drains 1 HP per 5 Guard you hold at turn end.',navigator:'Hurt the Shard holder hard or kill the next one.'};
for(const [k,v] of Object.entries(TIPS))if(EN[k])EN[k].tip=v;
export const A3_ENEMY_IDS=['jelly','polyp','voltray','skua','petrel','automaton','cloudshark','cloudserpent','galereader','lenswright','slinger','anchorite','ringpull','ringcharge','ringveil','hailorb','shardcarrier','magus','squallwest','squalleast','eyegale','engine','thalassa','navigator'];
