// data/lore.js: "The Second Dawn", the locked story (design/lore/LORE-BIBLE.md v3). Act 1 slice plus the shared systems.
// Pure data and tiny pure helpers (no DOM, no engine): usable from the UI, the engine and the tests.
// OVERRIDE (Spencer, 2026-10-10): the Bell is a plain, ancient, weathered bronze bell. It is NOT a jawbone. The dread comes from what it rings for.
// KNELL (Spencer, 2026-10-10): the Act 1 Bell boss is "The Knell" (id `bell` unchanged): a faceless drowned bell-ringer of the old Keeper order, chained to the Bell, swinging it as a weapon.
// Voice (bible §15): objects first, present tense, second person, about 12 words, never say "Undermoon" before Tier 3, the death line never changes.
import {climbLevel,loadProfile,deathsOf} from '../progress.js';
import {hash32} from '../core/state.js';

export const DEATH_LINE='Your lantern burns on.';
export const GHOST_CAP=40;
// Words that must never appear in player-facing text (bible §2). Checked by tests/lore22.js.
export const BANNED=['old ones','eldritch','tentacle','kraken','chosen one','prophecy','destiny','deity','mana','arcane','dragon','wizard'];
// Spoiler words: only Tier 3 text may use them.
export const SPOILERS=['undermoon','the lure','a lure'];

// ---------------------------------------------------------------- tiers (bible §14.1)
// Tier 0 always. Tier 1: Stair Climb >= 2. Tier 2: >= 4. Tier 3: >= 6 and twistSeen. Tier 4 (Ferryman only): Climb 8 and twistSeen.
export function tierFor(climb,twistSeen){return twistSeen&&climb>=8?4:twistSeen&&climb>=6?3:climb>=4?2:climb>=2?1:0}
export const loreTier=(p=loadProfile())=>tierFor(climbLevel(p),!!p.twistSeen);
// Reveal stage = how many Ledger pages / lit-window meanings the player has earned. Stages 1-4 need only the Climb level; 5-8 also need twistSeen.
export function stageFor(climb,twistSeen){let s=0;for(let n=1;n<=8;n++){if(climb>=n&&(n<=4||twistSeen))s=n;else break}return s}
export const loreStage=(p=loadProfile())=>stageFor(climbLevel(p),!!p.twistSeen);
// "Same event, deeper text": map is {0:'..',1:'..',...}; the deepest entry at or below the tier wins.
export function byTier(map,tier){let out='';for(let t=0;t<=tier;t++)if(map[t]!=null)out=map[t];return out}
// A small cache so tooltips and renders do not re-read the profile hundreds of times.
let memo={t:0,tier:0};
export function currentTier(){const now=Date.now();if(now-memo.t>400){memo={t:now,tier:loreTier()}}return memo.tier}
export const resetTierCache=()=>{memo={t:0,tier:0}};

// ---------------------------------------------------------------- the Bell and its count (bible §9.4, §16 items 7-8)
const WORD=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen'];
const ORD=['zeroth','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth'];
const cap=s=>s[0].toUpperCase()+s.slice(1);
// Seeded from the run seed alone (no RNG stream is touched, so existing seeds roll exactly as before): 8 to 14 lanterns lit today.
export const bellCount=seed=>8+hash32((seed>>>0)+'|bell')%7;
export const bellOpening=n=>`${cap(WORD[n])} today. You will hear ${WORD[n+1]}.`;
export const wrenLine=(n,tier=0)=>tier>=3?`"${cap(WORD[n])} came through today. You're the ${ORD[n+1]}. My tally runs longer than the Ledger's."`:`"${cap(WORD[n])} came through today. You're the ${ORD[n+1]}."`;
export const WREN_SIDE='Every lamp on her stall has turned to face the Stair.';
export const BELL_LINES={
 toll:'The Knell swings the Bell. It tolls once. It is counting.',
 // Phase 2 "Ringing": the Ringing curse is the Bell's note, still in your ears.
 crack:'The crack does not silence it. The note changes. It sounds like your name.',
 // The deferred Great Toll gets the "counts" reading (not built yet; text kept here so the move ships with the right voice).
 greatToll:'One toll for every lantern lit at the Foot. This one is for you.'};
export const bellLog=n=>`🔔 ${bellOpening(n)}`;

// ---------------------------------------------------------------- the Ferryman (F03, bible §14.4)
export const FERRYMAN={
 name:'The Ferryman',
 t0:'Mind the thwart. It is a short crossing and a long climb.',
 t1:{tide:'The sea is calm for you. It was calm for the last one.',
  echo:'You can hear it from here, can\'t you. So could she.',
  carto:'Mind the roll of paper, love. The last one kept hers dry as bone.',
  duel:'I carried the last one across too. Same lantern. Same smile. You\'d have liked her.'},
 t2:'“I carried the last one across too,” he says, without looking up. “Nine times, I counted. I stopped counting.”',
 t3:'You know what\'s up there. So did she. I\'ve never once asked a one of you to turn back. That\'s the thing I\'m not allowed.',
 t4:'I lit it first. By accident. I\'d give it all back.'};
export function ferrymanLine(cls,tier=0){
 const raw=tier>=4?FERRYMAN.t4:tier>=3?FERRYMAN.t3:tier>=2?FERRYMAN.t2:tier>=1?(FERRYMAN.t1[cls]||FERRYMAN.t0):FERRYMAN.t0;
 return raw.includes('“')?raw:`“${raw}”`}

// ---------------------------------------------------------------- the Keeper's Ledger / Logbook: 8 pages, one per window (bible §14.2)
// Clerical, euphemistic register. cut = the page shows a cut stub. Stages 5-8 are written now and stay dormant until twistSeen.
export const LEDGER_STAGES=[
 {n:1,title:'The Keepers\' Account',cut:true,lines:[
  'The sun sank. The Keepers tended the lamp that could call it home.',
  'Relight the lamp and the sun will rise. So it was written. So it was taught.',
  'The pages before this one have been cut out with a very sharp edge. The stubs remain.']},
 {n:2,title:'The Roll of Lanterns',lines:[
  'Twelve lanterns are lit at the Foot each day. The Bell counts them.',
  'Chosen for courage, and for not being missed.',
  'Today\'s entry is made in no hand you know. Your lantern is on the roll.']},
 {n:3,title:'The Gilding',lines:[
  'A lit lamp buys an age of light. The Keepers called it the Gilding.',
  'First Gilder: ascended. Second Gilder: ascended. Third through Eighth: ascended.',
  'Ninth Gilder: ascended. The age is entered.',
  'In the margin, in another hand: nobody has written what "ascended" means.']},
 {n:4,title:'A Cut Page',lines:[
  'A page, folded small inside the binding. The hand slopes left. It is signed O. Voss, Last Keeper.',
  '"It rose to meet me."',
  'The rest of the sentence has been scraped away.']},
 {n:5,twist:true,title:'The Gilt',lines:[
  'The Gilt are the Gilders. Eight stand on the spiral, in pale stone.',
  'The ages they bought: 220, 200, 180, 160, 140, 120, 100, 80.',
  'Every age is shorter than the last. Look at the sums.']},
 {n:6,twist:true,title:'The Undermoon',lines:[
  'Under the Pale Sea lies the Undermoon. Nobody built the Stair. It grew.',
  'The lamp is not a beacon. It is a lure, and the Stair is its stalk.',
  'The Keepers lit it nine times. The Ledger is a tally of what it took.']},
 {n:7,twist:true,title:'The Line',lines:[
  'A pale thread runs from the lamp, through the black disc, down into the sea.',
  'Voss\'s sentence, completed: Light it, then cut the line.',
  'It takes an edge made for wicks. Something sharp enough to cut the first pages out of a book.']},
 {n:8,twist:true,title:'The First Page',lines:[
  'The first page, restored. It is in the Ferryman\'s hand.',
  'The Ferryman is Aurel, First Gilder. The sea would not take him. It kept him.',
  'I lit it first. By accident. I\'d give it all back.']}];
export const stageUnlockedLine=s=>s.twist?'A page that cannot be read yet.':'A page waits to be found.';

// ---------------------------------------------------------------- Lamplight: two readings, both true (bible §9.1)
export const LAMPLIGHT_WARM='Every fallen lantern leaves a glow. The dead are lighting your way, and the Stair remembers.';
export const LAMPLIGHT_COLD='Every fallen lantern is a glint on the lure, a bright thing the sea watches. The Stair is generous because generosity is the hook.';
export const lamplightMeaning=tier=>tier>=3?LAMPLIGHT_COLD:LAMPLIGHT_WARM;

// ---------------------------------------------------------------- Act 1 enemy flavour (bible §16 item 10); the Bell and the Matriarch open their fights with a line
export const ENEMY_FLAVOUR={
 captain:'His crew followed golden lights down in the last years. Their drills go on at thirty fathoms.',
 wisp:'A drowned lantern-carrier. Its flame leans toward the summit, whichever way it faces.',
 warden:'A mirror-guardian on a landing the Keepers never finished. Its glass is a flake of something else.',
 gull:'Gulls will not fly above Bellwater Court. They keep to the sea side of the mountain.',
 knight:'Calcified keel-blade, barnacled plate. It still holds the landing it was told to hold.',
 pod:'A brine cyst, swollen with scalding mineral water. It only wants to be somewhere else.',
 bell:'The last ringer of the old Keepers, faceless, chained to a plain bronze Bell. He swings it like a maul. It counts.',
 penitent:'Rope-bound and barnacled, it climbs the Stair on its knees. It is very patient.',
 mender:'She mends whatever is nearest. It does not have to be alive.',
 heap:'It holds together by habit.',
 novice:'It rings twice a day. Nobody told it to stop.',
 tenant:'A tenant who refused to leave. As the terrace sank he lifted his house onto his back. He is not cruel. He is home.',
 matriarch:'Edda, last gardener of the terraces. She roots into the stone to hold it together, and faces the green moon in the cistern.'};
export const TENANT_LINES={phase2:'The door splinters. He does not seem to notice.',defeat:'He sits down on what is left of the step, and does not get up.'};
// Shown on the boss reward screen: what is left when the fight is over (Act 1 bosses only).
export const BOSS_DEFEAT={
 tenant:TENANT_LINES.defeat+' The house settles around him. Something is left on the step for you.',
 bell:'The Bell goes quiet. For the first time in a long while, nothing is counting.',
 matriarch:'The kelp lets go of the stone. The green moon in the water goes dark, and the beds are empty.',
 // Acts 2 and 3 (ACT2/ACT3-ENEMIES, CROSS-ACT-BIBLE voice rules)
 colossus:'The gate sighs open. Behind it, the stair keeps climbing.',
 wreckqueen:'The golden lights gutter, one by one. The fleet goes down a second time.',
 battery:'The turntable stops. Both faces point at the sky.',
 engine:'The rings spin down and stop. The count, at last, is read.',
 thalassa:'The hanging sea sags, and holds. "They held," she says. "I buried. Neither was enough."',
 navigator:'The Shard slips out of the brass. It lands without a sound, and waits.'};
export const BOSS_OPEN={
 bell:n=>bellOpening(n),
 tenant:()=>'"This is my house. You are standing in my doorway."',
 matriarch:()=>'"You are late. The beds are ready for you."',
 colossus:()=>'"The gate was shut. That is all I was told. Stand back from the hinge."',
 wreckqueen:()=>'"Come aboard. The lamps are lit for you."',
 battery:()=>'"Which way are you facing? It does not matter. Both of mine are loaded."',
 engine:()=>'The rings begin to turn. Somewhere inside, a count that nobody reads.',
 thalassa:()=>'"They held. I buried. You will not be the one who lights it."',
 navigator:()=>'"Keep the line taut. The courier has not arrived yet." The brass chimes, once.'};
// Gull Nest and the Court share the gull clue at Tier 1 (F06).

// ---------------------------------------------------------------- event clue text by tier (bible §14.3). Tier 0 is the shipped text, unchanged.
export const EVENT_TEXT={
 tidalwheel:{0:'A barnacled ship\'s wheel spins on its own.',3:'A barnacled ship\'s wheel spins on its own, then slows, and stops with its spokes facing up the Stair.'},
 anvil:{0:'An anvil crusted with shells, still warm.',1:'An anvil crusted with shells, still warm. Four sets of initials are scratched in the horn. One looks fresh.',2:'An anvil crusted with shells, still warm. Four sets of initials are scratched in the horn. One looks fresh. Shear-marks run along its edge.'},
 spring:{0:'Fresh water bubbling up through salt.',1:'Fresh water bubbling up through salt. One spot of the basin is warm, as if something breathes.',3:'Fresh water bubbling up through salt. One spot of the basin is warm. It breathes in time with the Bell.'},
 offering:{0:'The tide pulls at your pack.',2:'The tide pulls at your pack. It takes the shiniest thing first.'},
 tidepool:{0:'A shrine half-sunk in a glowing tidepool. The water asks for blood.',1:'A shrine half-sunk in a glowing tidepool. The water asks for blood. A green disc is carved above it, and it is not the moon\'s phase.'},
 cartomancer:{0:'A cloaked figure shuffles a deck that seems to shuffle back.',1:'A cloaked figure shuffles a deck that seems to shuffle back. Her map ends in a blank ring. "The Lip," she says.'},
 sunkenchest:{0:'A barnacled chest rests between the rocks. Something with claws is guarding it.',1:'A barnacled chest rests between the rocks. Something with claws is guarding it. Inside the lid, a dead lantern, still warm.'},
 stranger:{0:'On a dry landing, a stranger by a small fire waves you over. "Sit. Rest. Or let me sharpen something."',2:'On a dry landing, a stranger by a small fire waves you over. "Sit. Rest. Or let me sharpen something." His skin is going pale to the knee. His gear is old Gilder\'s kit.'},
 gullnest:{0:'On a broken parapet sits a huge nest of driftwood and stolen trinkets. Something golden glints inside.',1:'On a broken parapet sits a huge nest of driftwood and stolen trinkets. Something golden glints inside. The gulls nest low here. None will fly over the Court.'},
 inkgrotto:{0:'Black ink pools in a cave. It moves when you look away.',2:'Black ink pools in a cave. When you look away, it gathers itself into a ring.'},
 sailor:{0:'A sailor clings to a broken mast, a fine whetstone and a fat purse beside him. He counts under his breath: "Nine to climb and nine to shine..."',2:'A sailor clings to a broken mast, a fine whetstone and a fat purse beside him. He counts under his breath: "Nine to climb and nine to shine, nine to the dark where the dawn goes down."'},
 mirror:{0:'In a flooded chamber, a mirror of sea-glass stands in the surf. Your reflection blinks first.',2:'In a flooded chamber, a mirror of sea-glass stands in the surf. Your reflection blinks first. It holds the lantern in its left hand.'},
 loom:{0:'In a keeper\'s recess, an old woman weaves nets from salt and moonlight. "I can unpick a rule from you, or weave you a charm."',1:'In a keeper\'s recess, an old woman weaves nets from salt and moonlight. The thread is pale, came from the sea and has no end. "I can unpick a rule from you, or weave you a charm."',3:'In a keeper\'s recess, an old woman weaves a pale thread that came from the sea and has no end. "I can unpick a rule from you, or weave you a charm." Ask what she is weaving.'}};
export const eventText=(id,base,tier=currentTier())=>{const m=EVENT_TEXT[id];return m?(byTier(m,tier)||base):base};

// ---------------------------------------------------------------- relic flavour by tier (F20-F25); base text lives in data-v2.json
export const RELIC_TIER_FLAVOUR={lens:{3:'Not warm from the sun.'}};
export const relicFlavour=(id,base,tier=currentTier())=>{const m=RELIC_TIER_FLAVOUR[id];return m?(byTier(m,tier)||base):base};

// ---------------------------------------------------------------- Learn to Play wording (bible §16 item 17)
export const LEARN_HEDGE='The lamp above can call the Drowned Sun back, or so the old keepers swore.';
export const LEARN_LAMPLIGHT=['Lamplight','Every lantern that falls leaves a glow behind. Lamplight is that glow: it unlocks cards, relics and potions for the next climber. The Ledger keeps the count. Your lantern burns on.'];
// Act 3 no-shard epilogue (dormant until Act 3 exists).
export const CROWN_HOLDS='The Crown Holds. The lamp stays dark. The Ferryman puts his oar in the water, and says nothing.';

// ---------------------------------------------------------------- main menu: what the title screen shows (bible §17.4)
// Eight windows by Stair Climb level; a green ring from stage 6; a pale line from stage 7; one ghost lantern per lifetime death (cap 40);
// ending variants after the first win. `over` lets tests and screenshots force any state.
export function menuLore(p=loadProfile(),over={}){
 const climb=over.climb!=null?over.climb:climbLevel(p),twist=over.twistSeen!=null?over.twistSeen:!!p.twistSeen;
 const stage=over.stage!=null?over.stage:stageFor(climb,twist);
 const deaths=over.deaths!=null?over.deaths:deathsOf(p);
 const ending=over.ending!=null?over.ending:(p.lastEnding||'');
 const cut=ending==='cut';
 return {climb,stage,tier:tierFor(climb,twist),windows:Math.min(8,climb),lamp:climb>=8,
  ring:stage>=6&&!cut,line:stage>=7&&!cut,ghosts:Math.min(GHOST_CAP,Math.max(0,deaths)),ending}}
// Ghost lantern placement: a low-discrepancy walk so the first few are few and far apart and the steps fill in evenly by run thirty.
export function ghostSpots(n){const out=[];for(let i=0;i<n;i++){const f=(x=>x-Math.floor(x));
 out.push({x:+(3+f((i+1)*0.6180339887)*94).toFixed(1),row:i%3,s:+(0.8+f((i+1)*0.7548776662)*0.5).toFixed(2),d:+(f((i+1)*0.5698402910)*6).toFixed(1)})}
 return out}
// Art slots for the layered menu (tools/make-tiles-manifest.cjs lists the same ids; real art drops in with no code change).
export const MENU_LAYERS=['menu-sky','menu-sea','menu-lighthouse','menu-ring','menu-line','menu-steps','menu-ghost','menu-dawn-light','menu-stars','menu-dawn-cut','menu-shape'];
export const ENDING_NAMES={light:'Light It',lens:'Break the Lens',cut:'Cut the Line'};
