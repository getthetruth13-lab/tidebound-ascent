// data/act2/enemies.js: the Act 2 roster, The Brine Bastion (studio/design/ACT2-ENEMIES.md, rules ACT2-RULES.md, FROZEN numbers ACT2-ENEMY-NUMBERS.md, D-A2-02).
// Every enemy is `act:2` and sits in no Act 1 encounter table, so none can appear before Act 2 exists. New intent fields (engine: M3, ACT2-RULES):
//   aim:1 (no damage, marks the player), ignoreG:.5 (Gunnery: only half the Guard blocks), muffle:1, seize:1, pull:N, lob:1, vent:1, owe:1 (record the card type),
//   hymn:1, lure:1 (choice popup), cleanse:'ally', hold:1 (plate label), fire:1 / pack:1 (live-number tags).
// Beats: each enemy and move carries `anim:{wind,strike,impact,hits,tier,hold}` (ACT2-ENEMIES section 0); the telegraph/strike/impact timing itself is core/timing.js.
import {registerEnemies,EN} from '../../core/registry.js';
import {W} from '../../core/state.js';
import {pk,loop,open,AI,hurt,allies,half} from '../enemies.js';
import {addSt,alive,countAlive,log,callout,spawn,addCard,bossBeat,floatText} from '../../engine/combat.js';
import {ECON} from '../../engine/run.js';
// ---- frozen numbers (hp ranges; damage lives in each move below) ----
const HP={hgunner:[52,58],shellguard:[66,72],lice:[14,17],bellnun:[48,54],kettleman:[40,46],diver:[70,78],salthusk:[44,50],sluiceeng:[60,66],pumper:[56,62],lamplighter:[36,42],bosun:[62,68],mortar:[74,82],
 ghostcannon:[18,18],deckshade:[12,12],gateplate:[22,22],pylon:[40,40],hauler:[150,160],grell:[140,150],cantor:[46,46],chorister:[40,40],basso:[56,56],colossus:[300,300],wreckqueen:[280,280],battery:[320,320],dummy:[40,40]};
// Elite damage in Act 1 is scaled (ECON.eliteDmg .88); the Act 2 elite numbers are final, so they opt out.
for(const k of ['hauler','grell','cantor','chorister','basso']){ECON.eliteDmgByKey=ECON.eliteDmgByKey||{};ECON.eliteDmgByKey[k]=1}
const A=(wind,strike,impact,o={})=>({wind,strike,impact,hits:1,tier:'normal',...o});
const base=e=>{e.base=e.hp}; // hp at the start of the player's turn: damage this turn = base - hp (Flinch, Valve, Jam, Swivel)
const took=e=>e.base==null?0:Math.max(0,e.base-e.hp);
const isChoir=x=>x.key==='cantor'||x.key==='chorister'||x.key==='basso';
const choirN=e=>alive().filter(x=>isChoir(x)&&x!==e).length;
const plates=()=>alive().filter(x=>x.key==='gateplate').length;
const cannons=()=>alive().filter(x=>x.key==='ghostcannon');
registerEnemies({
 // ================= NORMALS =================
 // Harpoon Gunner: Aim -> Fire -> Reload. Fire ignores half your Guard; hurt >= 14 while it waits to fire makes it flinch (11).
 hgunner:{n:'Harpoon Gunner',e:'🎯',act:2,role:'attacker',hp:HP.hgunner,anim:A('aim','shot','pierce'),
  ai:AI(e=>{base(e);const aim={aim:1,none:1,lbl:'Aiming',anim:A('aim','shot','pierce')},fire={a:16,ignoreG:.5,fire:1,lbl:'Fire',anim:A('aim','shot','pierce')},rel={b:8,lbl:'Reload',anim:A('crouch','lunge','blunt')};
   return loop(e,[aim,fire,rel],(e.k||0)*2)}),
  intent:e=>{const m=e.next||{none:1};return m.fire&&took(e)>=14?{...m,a:11,flinch:1,lbl:'Fire (flinched)'}:m}},
 // Shellback Guard: Hold the Line (while it has Guard, single-target attacks on its allies hit its Guard instead).
 shellguard:{n:'Shellback Guard',e:'🛡️',act:2,role:'support',hp:HP.shellguard,b0:10,anim:A('build','lunge','blunt'),
  passive:{n:'Hold the Line',text:'While it has Guard, your single-target attacks on its allies hit its Guard instead.',hold:1},
  ai:AI(e=>{const brace={b:14,hold:1,lbl:'Brace Wall'},bash={a:11,v:1,lbl:'Shield Bash',anim:A('crouch','lunge','blunt')},steady={allyB:3,b:4,lbl:'Steady'};
   if(!e.t)return open(e,[brace,bash]);
   return pk(e,[{w:e.block>=14?0:45,m:brace,rep:1},{w:40,m:bash,rep:2},{w:allies(e).length?30:15,m:steady,rep:1}])})},
 // Grave-Lice (pack): Swarm Bite = 3 + one per OTHER louse alive (live number).
 lice:{n:'Grave-Lice',e:'🪲',act:2,role:'attacker',hp:HP.lice,anim:A('rear','lunge','blunt'),
  passive:{n:'Pack Tactics',text:'Each bite is stronger for every other louse alive.'},
  ai:AI(e=>{const bite={a:3,pack:1,lbl:'Swarm Bite'},skit={b:3,lbl:'Skitter'},cling={a:3,w:1,lbl:'Cling'};
   if(!e.t)return open(e,[bite,skit,cling]);
   return pk(e,[{w:50,m:bite,rep:2},{w:20,m:skit,rep:1},{w:30,m:cling,rep:1}])}),
  intent:e=>{const m=e.next||{none:1};return m.pack?{...m,a:3+alive().filter(x=>x!==e&&x.key==='lice').length}:m}},
 // Gagged Bell-Nun [TAX]: Muffle locks your highest-cost card for a turn.
 bellnun:{n:'Gagged Bell-Nun',e:'🔕',act:2,role:'debuffer',hp:HP.bellnun,b0:6,tax:1,anim:A('raise','drop','blunt'),
  ai:AI(e=>{const mu={muffle:1,lbl:'Muffle',anim:A('raise','cast','blunt')},ms={a:9,lbl:'Mute Strike'},hy={b:8,lbl:'Hymn Held'};
   if(!e.t)return open(e,[mu,ms]);
   return pk(e,[{w:40,m:mu,rep:1},{w:40,m:ms,rep:2},{w:20,m:hy,rep:1}])})},
 // Kettleman: Murk and Scald.
 kettleman:{n:'Kettleman',e:'🍲',act:2,role:'debuffer',hp:HP.kettleman,b0:6,anim:A('build','jet','scald'),
  ai:AI(e=>{const cu={status:{id:'murk',n:2,pile:'draw'},lbl:'Bilge Curse',anim:A('build','cast','scald')},sc={a:6,status:{id:'scald',n:1,pile:'draw'},lbl:'Scald Cast'},ca={heal:6,b:4,lbl:'Cauldron'};
   if(!e.t)return open(e,[cu,sc]);
   return pk(e,[{w:35,m:cu,rep:1},{w:40,m:sc,rep:2},{w:e.max-e.hp>=6?25:0,m:ca,rep:1}])})},
 // Riveted Diver: Armoured (the first Attack card each turn deals 0 to it).
 diver:{n:'Riveted Diver',e:'🤿',act:2,role:'bruiser',hp:HP.diver,anim:A('crouch','lunge','blunt'),
  passive:{n:'Armoured',text:'The first Attack card each turn deals 0 to it.',armour:1},
  ai:AI(e=>{const sl={a:14,lbl:'Plate Slam'},hf={a:7,h:2,lbl:'Hammer-Fist',anim:A('crouch','lunge','blunt',{hits:2})},rs={b:6,lbl:'Re-seal'};
   if(!e.t)return open(e,[sl,hf]);
   return pk(e,[{w:40,m:sl,rep:2},{w:40,m:hf,rep:2},{w:20,m:rs,rep:1}])})},
 // Salt-Husk: Salt Drain steals an Energy next turn (at most every other turn).
 salthusk:{n:'Salt-Husk',e:'🧂',act:2,role:'debuffer',hp:HP.salthusk,anim:A('lean','cast','salt'),
  ai:AI(e=>{const dr={a:4,drainE:1,v:1,lbl:'Salt Drain'},ch={a:8,w:2,lbl:'Chill Pass'},fa={b:8,lbl:'Fade'};const canDrain=e.t-(e.lastDrain==null?-9:e.lastDrain)>=2;
   if(!e.t)return open(e,[ch,fa]);
   const m=pk(e,[{w:canDrain?30:0,m:dr,rep:1},{w:40,m:ch,rep:2},{w:30,m:fa,rep:1}]);if(m.drainE)e.lastDrain=e.t+1;return m})},
 // Sluice Engine: Pressure +1 at the end of each of its turns; at 4 the next move is Vent 24 (resets). Hit it for 18+ in one turn to bleed the valve (-2).
 sluiceeng:{n:'Sluice Engine',e:'🚰',act:2,role:'bruiser',hp:HP.sluiceeng,anim:A('build','lunge','blunt'),
  passive:{n:'Pressure',text:'Pressure rises each turn. At 4 it vents for 24.',pressure:1,endTurn:e=>{e.press=Math.min(5,(e.press||0)+1)}},
  ai:AI(e=>{base(e);e.valved=false;const bu={b:6,lbl:'Build'},pi={a:10,lbl:'Piston'},ve={a:24,vent:1,lbl:'Vent',anim:A('build','jet','scald')};
   if((e.press||0)>=4)return loop(e,[ve]);
   return loop(e,[bu,pi],0)}),
  onDamaged:e=>{if(!e.valved&&took(e)>=18&&(e.press||0)>0){e.valved=true;e.press=Math.max(0,e.press-2);if(e.next&&e.next.vent&&e.press<4){e.next=EN.sluiceeng.ai(e)}log('⚙️ The valve bleeds: Pressure '+e.press)}}},
 // Bilge Pumper: Flood soaks you and heals it 3 per Soaked on you (cap 9).
 pumper:{n:'Bilge Pumper',e:'🚰',act:2,role:'support',hp:HP.pumper,anim:A('haul','jet','brine'),
  ai:AI(e=>{const fl={w:1,floodHeal:1,fx:q=>{const s=Math.min(9,3*((W.cb&&W.cb.p.st.weak)||0));const h=Math.min(s,q.max-q.hp);if(h>0){q.hp+=h;floatText(q.uid,'+'+h,'h')}},lbl:'Flood'},pc={a:9,lbl:'Pump Crank'},sh={b:10,lbl:'Seal Hatch'};
   if(!e.t)return open(e,[fl,pc]);
   return pk(e,[{w:40,m:fl,rep:1},{w:40,m:pc,rep:2},{w:20,m:sh,rep:1}])})},
 // Lamplighter: Kindle feeds an ally; its death spills a Scald into your discard.
 lamplighter:{n:'Lamplighter',e:'🕯️',act:2,role:'support',hp:HP.lamplighter,anim:A('raise','cast','blunt'),
  ai:AI(e=>{const al=allies(e).length,ki={allyS:2,status:{id:'scald',n:1,pile:'disc'},lbl:'Trim the Wick'},ot={a:9,lbl:'Oil Toss'},sn=al?{cleanse:'ally',lbl:'Snuff'}:{b:6,lbl:'Snuff'};
   if(!e.t)return open(e,[al?ki:ot,ot]);
   return pk(e,[{w:al?35:0,m:ki,rep:1},{w:40,m:ot,rep:2},{w:25,m:sn,rep:1}])}),
  onDeath:e=>{if(W.cb){addCard('scald','disc');log('🏮 The lamp spills: a Scald in your discard')}}},
 // Press-Gang Bosun [TAX]: Seize takes your lowest-cost card until he dies (or the fight ends).
 bosun:{n:'Press-Gang Bosun',e:'⚓',act:2,role:'support',hp:HP.bosun,tax:1,anim:A('drum','snatch','blunt'),
  ai:AI(e=>{const se={seize:1,lbl:'Seize',anim:A('drum','snatch','blunt')},cu={a:12,lbl:'Cudgel'},dr={allyB:2,b:4,lbl:'Drum'};
   if(!e.t)return open(e,[se,cu]);
   return pk(e,[{w:e.seized?0:40,m:se,rep:1},{w:45,m:cu,rep:2},{w:15,m:dr,rep:1}])}),
  onDeath:e=>{if(e.seized&&W.cb){W.cb.hand.length<10?W.cb.hand.push(e.seized):W.cb.disc.push(e.seized);log('⚓ The Bosun falls: your '+e.seized.id+' returns');e.seized=null}}},
 // Rampart Mortar: Load -> Lob 24 -> Spent. 16+ damage in one turn jams it for an action.
 mortar:{n:'Rampart Mortar',e:'💣',act:2,role:'attacker',hp:HP.mortar,anim:A('build','lob','blast'),
  passive:{n:'Siege',text:'Loads, then lobs for 24. Hit it for 16 in one turn to jam it.',jam:16},
  ai:AI(e=>{base(e);if(e.jamHold){const m=e.jamHold;e.jamHold=null;return m}const lo={b:8,lob:'in2',lbl:'Load',anim:A('build','lob','blast')},lb={a:24,lob:1,lbl:'Lob',anim:A('raise','lob','blast',{tier:'normal',hold:120})},sp={none:1,lbl:'Spent'};
   return loop(e,[lo,lb,sp])}),
  onDamaged:e=>{if(!e.jamHold&&took(e)>=16&&e.next&&!e.next.none){e.jamHold=e.next;e.next={none:1,jam:1,lbl:'Jammed'};log('💣 The mortar JAMS');callout('JAMMED!','boss')}}},
 // ================= SUMMONS / ADD-ONS =================
 ghostcannon:{n:'Ghost Cannon',e:'👻',act:2,role:'attacker',hp:HP.ghostcannon,summonOnly:1,anim:A('aim','shot','gold'),
  // fires in a fixed order shown on the intent: cannon slot s fires on turns where (turn-1)%3 === s
  ai:e=>({none:1}),
  onSpawn:e=>{const used=cannons().filter(x=>x!==e).map(x=>x.slot);e.slot=[0,1,2].find(s=>!used.includes(s));if(e.slot==null)e.slot=0},
  intent:e=>{const s=e.slot||0,t=(W.cb?W.cb.turn:1);return (t-1)%3===s?{a:7,lbl:'Cannon '+(s+1),anim:A('aim','shot','gold')}:{none:1,lbl:'Cannon '+(s+1)+' loading'}}},
 deckshade:{n:'Deckshade',e:'🌫️',act:2,role:'support',hp:HP.deckshade,summonOnly:1,anim:A('build','cast','gold'),
  ai:AI(e=>({queenB:5,fx:q=>{const qn=alive().find(x=>x.key==='wreckqueen');if(qn){qn.block+=5;qn.blkT=Date.now();log('🌫️ A Deckshade shields the Queen (+5 Guard)')}},lbl:'Shield the Queen'}))},
 gateplate:{n:'Gate Plate',e:'🔩',act:2,role:'support',hp:HP.gateplate,summonOnly:1,ai:e=>({none:1,lbl:'Bolted'}),
  onDeath:e=>{const c=alive().find(x=>x.key==='colossus');if(c){c.plateBroke=true;log('🔩 A gate plate breaks loose')}}},
 pylon:{n:'Signal Pylon',e:'🗼',act:2,role:'support',hp:HP.pylon,summonOnly:1,ai:e=>({none:1,lbl:'Signalling'}),
  passive:{n:'Signal',text:'While it stands the ghost cannons answer. Destroy it and they fall silent.'},
  onDeath:e=>{cannons().forEach(c=>{c.hp=0});log('🗼 The pylon falls: the ghost guns go quiet')}},
 // event-only training dummy (Gunnery Drill)
 dummy:{n:'Training Dummy',e:'🎯',act:2,role:'attacker',hp:HP.dummy,eventOnly:1,anim:A('aim','shot','pierce'),
  ai:AI(e=>{const aim={aim:1,none:1,lbl:'Aiming'},fire={a:8,ignoreG:.5,fire:1,lbl:'Fire'};return loop(e,[aim,fire])})},
 // ================= ELITES =================
 // Breach-Hauler: Pull 3, Spiked Mantlet (2 damage to the attacker once per Attack card while it has Guard, not on the hit that breaks it), Ram in 2.
 hauler:{n:'Breach-Hauler',e:'🏗️',act:2,role:'bruiser',hp:HP.hauler,elite:1,anim:A('haul','drop','blunt',{tier:'elite'}),
  passive:{n:'Spiked Mantlet',text:'While it has Guard, each Attack card you play costs you 2 HP once.',mantlet:2},
  ai:AI(e=>{base(e);const haul={a:6,pull:3,lbl:'Haul',anim:A('haul','lunge','blunt',{tier:'elite'})},lock={b:20,lbl:'Plate Lock'},t2={b:6,lbl:'Rams in 2',anim:A('haul','lunge','blunt',{tier:'elite'})},t1={b:6,lbl:'Rams in 1'},ram={a:22,lbl:'Ram',anim:A('haul','drop','blunt',{tier:'elite',hold:160})};
   if(hurt(e)>=30&&e.ci%5!==3&&e.ci%5!==4)e.ci++;
   return loop(e,[haul,lock,t2,t1,ram])})},
 // Harbormaster Grell [TAX]: the Ledger records the type of your first card each turn; next turn the first card of that type costs +1.
 grell:{n:'Harbormaster Grell',e:'📒',act:2,role:'debuffer',hp:HP.grell,elite:1,tax:1,anim:A('open','swing','paper',{tier:'elite'}),
  passive:{n:'The Ledger',text:'Owes: the first card of the type you play first each turn costs +1 next turn.',owe:1},
  ai:AI(e=>{const ce={a:14,owe:1,lbl:'Certify'},ink={b:10,s:1,lbl:'Ink the Book'},fc={a:20,lbl:'Foreclose',anim:A('open','swing','paper',{tier:'elite',hold:140})};
   if(!e.t)return pk(e,[{w:1,m:ce}]);
   return pk(e,[{w:e.t>=3&&!e.foreclosed?100:0,m:fc},{w:45,m:ce,rep:2},{w:e.block>=14?0:30,m:ink,rep:1}])}),
  onSpawn:e=>{e.foreclosed=false}},
 // The Chapel Choir (3 bodies). Hymn = 7 + 2 per OTHER singer alive; one Hymn a turn, rotating cantor -> chorister -> basso.
 cantor:{n:'Cantor',e:'🎼',act:2,role:'attacker',hp:HP.cantor,elite:1,anim:A('raise','cast','pierce',{tier:'elite'}),
  passive:{n:'Chorus',text:'Each hymn is stronger for every other singer alive.',chorus:1},
  ai:e=>choirMove(e,['hymn','descant','drone']),intent:e=>liveHymn(e)},
 chorister:{n:'Chorister',e:'🎶',act:2,role:'attacker',hp:HP.chorister,elite:1,anim:A('raise','cast','pierce',{tier:'elite'}),
  passive:{n:'Chorus',text:'Each hymn is stronger for every other singer alive.',chorus:1},
  ai:e=>choirMove(e,['descant','hymn','descant']),intent:e=>liveHymn(e)},
 basso:{n:'Basso',e:'🎺',act:2,role:'support',hp:HP.basso,elite:1,anim:A('raise','cast','pierce',{tier:'elite'}),
  passive:{n:'Chorus',text:'Each hymn is stronger for every other singer alive.',chorus:1},
  ai:e=>choirMove(e,['drone','drone','hymn']),intent:e=>liveHymn(e)},
 // ================= BOSSES =================
 // Tidewarden Colossus: Floodgates (+4 Guard per gate plate at his turn end); phase 2 Surge (+14 Guard unless a plate broke) and Sluice Release 34 once every plate is down.
 colossus:{n:'Tidewarden Colossus',e:'🚪',act:2,role:'bruiser',hp:HP.colossus,boss:1,anim:A('raise','drop','blast',{tier:'boss'}),
  passive:{n:'Floodgates',text:'Each gate plate feeds him Guard. Break them, but the gate will groan.',endTurn:e=>{const n=plates();if(n){e.block+=4*n;e.blkT=Date.now()}
   if(e.ph===2){if(!e.plateBroke){e.block+=14;e.blkT=Date.now();log('🚪 The gate Surges: +14 Guard')}e.plateBroke=false}}},
  onSpawn:e=>{if(W.cb){for(let i=0;i<3;i++)spawn('gateplate',{summoned:true})}},
  ai:AI(e=>{const bu={b:16,lbl:'Build',anim:A('build','lunge','blunt',{tier:'boss'})},ha={a:28,lbl:'Hammer'},gr={b:10,lbl:'The gate groans',anim:A('raise','lunge','blunt',{tier:'boss',hold:200})},rl={a:34,lbl:'Sluice Release',anim:A('raise','drop','blast',{tier:'boss',hold:260})};
   if(e.relNext){e.relNext=0;return pk(e,[{w:1,m:rl}])}
   if(e.ph===2){const i=e.ci++%3;if(i===0)return pk(e,[{w:1,m:bu}]);if(i===1)return pk(e,[{w:1,m:ha}]);if(!plates()){e.relNext=1;return pk(e,[{w:1,m:gr}])}return pk(e,[{w:1,m:ha}])}
   return loop(e,[bu,bu,ha])}),
  onDamaged:e=>{if(e.ph===1&&e.hp<=150){e.ph=2;['weak','vuln','bleed','brittle'].forEach(k=>delete e.st[k]);addSt(e,'str',1);e.ci=0;e.hist=[];e.queued=null;e.relNext=0;for(let i=0;i<3;i++)spawn('gateplate',{summoned:true});e.next=EN.colossus.ai(e);
   if(W.cb.acting===e)e.keepNext=true;log('🚪 The gate opens: three new plates slide in');bossBeat('phase','The gate opens','The Surge begins. Break the plates.',e)}}},
 // Maud Sallow, the Wreck Queen: pylon + ghost cannons (fixed order), Deckshades, Golden Lure choice, Broadside.
 wreckqueen:{n:'Maud Sallow, the Wreck Queen',e:'👑',act:2,role:'support',hp:HP.wreckqueen,boss:1,anim:A('raise','swing','gold',{tier:'boss'}),
  passive:{n:'Dead Fleet',text:'Ghost cannons fire in a fixed order. Destroy the pylon to silence them.'},
  onSpawn:e=>{if(W.cb){spawn('pylon',{summoned:true});spawn('ghostcannon',{summoned:true});spawn('ghostcannon',{summoned:true})}},
  ai:AI(e=>{const lure={lure:1,lbl:'Golden Light',anim:A('raise','cast','gold',{tier:'boss'})},axe={a:e.ph===2?22:20,lbl:'Boarding Axe'},broad={a:7,h:1,broad:1,lbl:'Broadside',anim:A('aim','shot','gold',{tier:'boss'})},fleet={summon:'ghostcannon',max:3,lbl:'Raise Fleet'};
   const nc=cannons().length,py=alive().some(x=>x.key==='pylon');
   if(!e.t)return pk(e,[{w:1,m:lure}]);
   return pk(e,[{w:30,m:lure,rep:1},{w:40,m:axe,rep:2},{w:nc>=2?30:0,m:broad,rep:1},{w:py&&nc<3?35:0,m:fleet,rep:1},{w:e.t===2&&countAlive('deckshade')<(e.ph===2?2:1)?100:0,m:{summon:'deckshade',max:e.ph===2?2:1,lbl:'Raise Deckshade'}}])}),
  intent:e=>{const m=e.next||{none:1};return m.broad?{...m,h:Math.max(1,cannons().length)}:m},
  onDamaged:e=>{if(e.ph===1&&e.hp<=140){e.ph=2;addSt(e,'str',2);e.hist=[];e.next=EN.wreckqueen.ai(e);if(W.cb.acting===e)e.keepNext=true;log('👑 The golden lights flare: +2 Might');bossBeat('phase','The lights flare','The Queen hits harder.',e)}}},
 // The Both-Ways Battery: Sea Face (Salvo, Aim -> Gunnery) and Lamp Face (Raise, Lamp Beam, Rally); swivels every 3 turns; 30+ damage in a turn jams the turntable for 2 turns.
 battery:{n:'The Both-Ways Battery',e:'🔫',act:2,role:'attacker',hp:HP.battery,boss:1,anim:A('aim','shot','pierce',{tier:'boss'}),
  passive:{n:'Swivel',text:'It swivels every three turns. Hit it for 30 in one turn to jam the turntable.',swivel:1},
  onSpawn:e=>{e.face='sea';e.fturn=0;e.lock=0},
  ai:AI(e=>{base(e);e.face=e.face||'sea';e.fturn=(e.fturn||0);e.lock=e.lock||0;
   const salvo={a:5,h:4,lbl:'Salvo',anim:A('aim','shot','pierce',{tier:'boss',hits:4})},aim={aim:1,none:1,lbl:'Aiming',anim:A('aim','shot','pierce',{tier:'boss'})},gun={a:30,ignoreG:.5,fire:1,lbl:'Gunnery',anim:A('aim','shot','pierce',{tier:'boss',hold:240})};
   const raise={b:18,lbl:'Raise Guard'},beam={a:14,brittle:1,lbl:'Lamp Beam',anim:A('aim','cast','pierce',{tier:'boss'})},rally={s:3,lbl:'Rally'};
   const gauge=e.hp<=160?2:3; // phase 2 (<= 160 HP): the swivel gauge shortens and both faces fire together every 4th turn
   if(e.hp<=160){e.xt=(e.xt||0)+1;if(e.xt%4===0)return {a:6,h:3,brittle:1,lbl:'Crossfire',anim:A('aim','shot','pierce',{tier:'boss',hits:3})}}
   if(e.fturn>=gauge&&e.lock<=0){e.face=e.face==='sea'?'lamp':'sea';e.fturn=0;return {b:8,swivel:1,lbl:'Traversing',anim:A('build','lunge','blunt',{tier:'boss'})}}
   if(e.fturn>=gauge&&e.lock>0){e.lock--;e.fturn=0}
   const i=e.fturn++;
   if(e.face==='sea')return [salvo,aim,gun][i%3];
   return [raise,beam,e.rallied===e.face+e.fturn?beam:rally][i%3]}),
  onDamaged:e=>{if(!e.jammedT&&took(e)>=30){e.jammedT=true;e.lock=2;log('🔫 The turntable JAMS for two turns');callout('SWIVEL JAMMED!','boss')}}}
});
function choirMove(e,plan){base(e);const k=plan[e.t%3];
 if(k==='hymn')return {a:7,hymn:1,lbl:'Hymn',anim:A('raise','cast','pierce',{tier:'elite'})};
 if(k==='descant')return {a:5,v:1,lbl:'Descant',anim:A('raise','cast','pierce',{tier:'elite'})};
 return {b:8,front:1,lbl:'Drone',fx:q=>{const f=alive().find(isChoir);if(f){f.block+=8;f.blkT=Date.now()}}}}
function liveHymn(e){const m=e.next||{none:1};return m.hymn?{...m,a:7+2*choirN(e)}:m}
// Choir copies are spawned as three different ids; the encounter table lists them in sing order.
export const A2_ENEMY_IDS=['hgunner','shellguard','lice','bellnun','kettleman','diver','salthusk','sluiceeng','pumper','lamplighter','bosun','mortar','ghostcannon','deckshade','gateplate','pylon','hauler','grell','cantor','chorister','basso','colossus','wreckqueen','battery','dummy'];

// Tutorial lines (ACT2-RULES): shown once per run the first time the rule's enemy appears.
const TIPS={hgunner:'<b>Aiming</b> means it fires next turn and ignores half your Guard.',shellguard:'While it holds <b>Guard</b>, aim around it: AoE and Bleed ignore the wall.',
 diver:'<b>Armoured</b>: your first Attack each turn bounces off. Hit twice.',bellnun:'<b>Muffled</b>: your most expensive card is silenced this turn.',
 grell:"Grell's ledger: your first card of that type costs one more.",kettleman:'<b>Scald</b> burns you at turn end if it is in your hand.',hauler:'<b>Pull</b> drags your Tide down or strips your Guard.',
 lice:'Each louse bites harder per friend. Thin the pack.',sluiceeng:'The dial fills. At 4 it vents. Hit hard to bleed it.',cantor:'Singers sing in order. Each living voice makes the hymn stronger.',
 colossus:'Break the gate plates to stop the Surge, but the gate will groan.',wreckqueen:'Kill the pylon and the ghost guns go quiet.',bosun:'The Bosun steals your cheapest card. Kill him to get it back.',
 mortar:'Hit it for 16 in one turn to jam the mortar.',battery:'The gun turns every three turns. Hit it for 30 to jam the turntable.'};
for(const [k,v] of Object.entries(TIPS))if(EN[k])EN[k].tip=v;
