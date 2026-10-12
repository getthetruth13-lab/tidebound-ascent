// Act 1 audio. Add matching filenames to audio/music/index.json and the SW shell.
// Playlist order uses its own randomness, never the run's seeded RNG.
import {W} from './core/state.js';
import {settings,saveSettings} from './save.js';
import {observeEvents} from './core/bus.js';
import {fxOn,cue,impactBase} from './ui/vfx.js';
import {T} from './core/timing.js';
import {deathSoundOf} from './ui/deathstyles.js';
let ctx,master,unlocked=false,manifest={},context=null,current=null,lastScreen=null,initialized=false;
const bags={},lastTrack={},voices=new Set(),recent={};
const level=k=>settings.audioMuted?0:Math.max(0,Math.min(1,Number(settings[k])||0));
const indexURL=new URL('../audio/music/index.json',import.meta.url);
fetch(indexURL).then(r=>{if(!r.ok)throw Error('Music index unavailable');return r.json()}).then(data=>{
 for(const k of ['map','fight','elite','boss','shop','rest','event'])manifest[k]=(data[k]||[]).filter(f=>new RegExp(`^${k}-act1-\\d+\\.mp3$`).test(f));
 manifest.intro=(data.intro||[]).filter(f=>/^intro-\d+\.mp3$/.test(f));
 manifest.menu=(data.menu||[]).filter(f=>/^menu-\d+\.mp3$/.test(f));
 startTrack();
}).catch(e=>console.warn('Music unavailable:',e.message));
function ramp(voice,to,seconds,dispose=false){
 if(voice.frame)cancelAnimationFrame(voice.frame);
 const from=voice.el.volume,start=performance.now();
 const tick=now=>{const t=Math.min(1,(now-start)/(seconds*1000));voice.el.volume=Math.max(0,Math.min(1,from+(to-from)*t));
  if(t<1)voice.frame=requestAnimationFrame(tick);else{voice.frame=null;if(dispose){voice.el.pause();voice.el.removeAttribute('src');voice.el.load();voices.delete(voice)}}};
 voice.frame=requestAnimationFrame(tick);
}
// Crossfade: a retired track keeps playing until its successor is audible, then both fade over XFADE seconds (no gap, short overlap).
const XFADE=.8,outgoing=new Set();let handoffTimer=0;
function retire(){if(current){current.el.onended=null;current.el.onerror=null;current.el.ontimeupdate=null;outgoing.add(current);current=null;clearTimeout(handoffTimer);handoffTimer=setTimeout(releaseOutgoing,4000)}}
function releaseOutgoing(sec=XFADE){clearTimeout(handoffTimer);for(const voice of outgoing)ramp(voice,0,sec,true);outgoing.clear()}
function nextFile(){let bag=bags[context];if(!bag||!bag.length){bag=[...(manifest[context]||[])];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
 if(bag.length>1&&bag[bag.length-1]===lastTrack[context])[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];bags[context]=bag}
 return bag.pop();
}
function startTrack(){if((!unlocked&&context!=='menu')||!context||current||document.hidden)return;const file=nextFile();if(!file)return;
 lastTrack[context]=file;const el=new Audio(new URL(file,indexURL).href),voice={el,frame:null};el.volume=0;el.muted=!unlocked;el.loop=context==='menu';el.preload='auto';voices.add(voice);current=voice;
 el.onended=()=>{if(current===voice){retire();startTrack()}};
 el.ontimeupdate=()=>{if(!el.loop&&current===voice&&Number.isFinite(el.duration)&&el.duration-el.currentTime<=2&&el.currentTime>0){retire();startTrack()}};
 // A missing track must not spin through an unavailable playlist forever.
 el.onerror=()=>{if(current===voice){retire();releaseOutgoing()}};
 el.play().then(()=>{if(current===voice&&unlocked){ramp(voice,level('musicVolume'),outgoing.size?XFADE:2);releaseOutgoing()}}).catch(()=>{voice.blocked=true;if(current===voice)releaseOutgoing()});
}
const bossPhases=new WeakMap(),phaseHeard=new WeakSet();
function syncBossPhases(){for(const e of W.cb?.ens||[]){if(!e.boss)continue;const phase=e.bloomed?2:e.ph||1,previous=bossPhases.get(e);bossPhases.set(e,phase);
 if(previous!==undefined&&phase>previous&&!phaseHeard.has(e)){phaseHeard.add(e);if(!document.hidden)playSound('bossPhase')}
}}
export function syncAudio(){syncUIState();syncBossPhases();const s=W.S.screen;
 const next=s==='title'&&W.S.view==='intro'?'intro':s==='title'?(W.S.view==='studio'?null:'menu'):W.run&&W.run.act===1&&s!=='title'&&s!=='end'?(s==='combat'&&W.cb?W.cb.kind:s==='shop'||s==='rest'||s==='event'?(manifest[s]?.length?s:'map'):'map'):null;
 if(next!==context){retire();context=next;startTrack();if(!current)releaseOutgoing()}
 if(s==='end'&&lastScreen!==s)playSound(W.run&&W.run.won?'victory':'defeat');lastScreen=s;
}
// Battle-won beat: the music dips for a moment, then recovers (the map track takes over right after).
export function duckMusic(ms){const voice=current;if(!voice||document.hidden)return;ramp(voice,level('musicVolume')*.25,.12);
 setTimeout(()=>{if(current===voice)ramp(voice,level('musicVolume'),.6)},ms)}
export function setAudioSetting(key,value){if(!['musicVolume','sfxVolume','audioMuted'].includes(key))return;
 settings[key]=key==='audioMuted'?!!value:Math.max(0,Math.min(1,Number(value)||0));saveSettings();applyVolumes();
}
function applyVolumes(){if(master)master.gain.setTargetAtTime(level('sfxVolume'),ctx.currentTime,.03);
 for(const voice of voices)if(voice!==current&&settings.audioMuted)ramp(voice,0,.08,true);
 if(current)ramp(current,level('musicVolume'),.15);
}
// Recorded Foley only; buffers are fetched once and decoded after a gesture.
const sfxURL=new URL('../audio/sfx/index.json',import.meta.url);
let sfxManifest={},sfxReady;
const sfxBuffers=new Map(),sfxLoads=new Map(),activeSfx=new Set();
sfxReady=fetch(sfxURL).then(r=>{if(!r.ok)throw Error('SFX index unavailable');return r.json()}).then(m=>{sfxManifest=m;return m}).catch(e=>{console.warn('SFX unavailable:',e.message);return {}});
function loadSfx(file){if(sfxBuffers.has(file))return Promise.resolve(sfxBuffers.get(file));if(sfxLoads.has(file))return sfxLoads.get(file);
 const request=fetch(new URL(file,sfxURL)).then(r=>{if(!r.ok)throw Error('Missing SFX '+file);return r.arrayBuffer()}).then(b=>ctx.decodeAudioData(b)).then(b=>{sfxBuffers.set(file,b);return b}).catch(e=>{console.warn(e.message);return null});
 sfxLoads.set(file,request);return request;
}
let warming=false;
function warmSfx(){if(!ctx||warming)return;warming=true;sfxReady.then(m=>Promise.all([...new Set(Object.values(m).map(v=>v.file))].map(loadSfx)))}
// Spencer silenced 2026-10-11, do not restore. (These cues all used cloth-open.ogg: title/menu/overlay/popup sound.)
const SILENT_CUES=new Set(['menuOpen','menuClose','enlarge','tooltip','pile']);
export function playSound(name,pitch=1){if(SILENT_CUES.has(name))return;if(W.replaying||document.hidden||!ctx||ctx.state!=='running'||!level('sfxVolume'))return;
 const now=ctx.currentTime;if(now-(recent[name]??-10)<.075)return;recent[name]=now;
 const config=sfxManifest[name];if(!config)return;
 const started=performance.now();loadSfx(config.file).then(buffer=>{
  // Drop stale first-load cues instead of playing them on an unrelated screen.
  if(!buffer||performance.now()-started>250||document.hidden||W.replaying||ctx.state!=='running'||!level('sfxVolume'))return;
  if(activeSfx.size>=16){const oldest=activeSfx.values().next().value;oldest.stop()}
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;
  source.playbackRate.value=Math.max(.5,Math.min(1.5,(Number(pitch)||1)*config.pitch*(.97+Math.random()*.06)));
  gain.gain.value=config.gain*(.92+Math.random()*.16);source.connect(gain);gain.connect(master);activeSfx.add(source);
  source.onended=()=>{activeSfx.delete(source);source.disconnect();gain.disconnect()};source.start();
 });
}
// Observe real state changes, so rerenders and rejected actions stay silent.
let uiState=null,seenSummary=null,taskRun=null,doneTasks=new Set();
function syncProgress(){
 const run=W.run,L=run&&run.lamp;
 if(run!==taskRun){taskRun=run;doneTasks=new Set((L?.tasks||[]).filter(t=>t.done).map(t=>t.id))}
 for(const task of L?.tasks||[])if(task.done&&!doneTasks.has(task.id)){doneTasks.add(task.id);playSound('taskComplete')}
 const sum=L?.summary;
 if(sum&&sum!==seenSummary){seenSummary=sum;if(sum.lampBar.to.lvl>sum.lampBar.from.lvl||sum.climbBar.to.lvl>sum.climbBar.from.lvl)playSound('levelUp')}
}
function syncUIState(){
 const next={screen:W.S.screen,view:W.S.view,ov:W.S.ov,tab:W.S.tab,potion:W.S.potion,relic:W.S.relicView,chest:W.S.opened,hp:W.run?.hp,disc:W.cb?.disc.length||0,combat:W.cb};
 if(uiState){
  if(next.ov!==uiState.ov)playSound(next.ov?(['deck','draw','disc','exh'].includes(next.ov)?'pile':'menuOpen'):'menuClose');
  else if(next.view!==uiState.view&&next.screen==='title')playSound(next.view==='main'?'menuClose':'menuOpen');
  /* tab-change click silenced by Spencer */
  else if(next.potion!==uiState.potion||next.relic!==uiState.relic)playSound(next.potion!=null||next.relic?'menuOpen':'menuClose');
  if(next.chest&&!uiState.chest&&next.screen==='chest')playSound('chest');
  if(next.hp>uiState.hp)playSound('heal');
  if(next.combat&&next.combat===uiState.combat&&next.disc>uiState.disc)playSound('discard');
  if(next.screen==='travel'&&uiState.screen!=='travel')playSound('travel');
 }
 uiState=next;syncProgress();syncMeters();
}
// Spencer silenced generic UI click/tap cues (2026-10-11). Do not restore.
const SILENT_UI=new Set(['uiTap','confirm','cancel','select','tab','mapTap']);
function clickSound(el){const s=pickClickSound(el);return s&&SILENT_UI.has(s)?null:s}
function pickClickSound(el){
 if(el.dataset.sfx)return el.dataset.sfx;
 const action=el.getAttribute('onclick')||'',label=(el.getAttribute('aria-label')||el.textContent||'').trim();
 if(/openChestLid/.test(action))return 'chest';
 if(/buy|shopBuy/i.test(action))return 'shop';
 if(/restHeal|restUpgrade|restDig|restTrain/.test(action))return 'camp';
 if(el.matches('.node'))return el.matches('.av')?'mapTap':null;
 if(el.matches('[data-tab],[role="tab"]')||/Tab\(/.test(action))return 'tab';
 if(/^(cancel|back|close|later|skip|✕|×)/i.test(label)||/close|Leave\(/.test(action))return 'cancel';
 if(/^(confirm|done|yes|sure|continue|buy|drink|take|light them)/i.test(label))return 'confirm';
 if(el.matches('.tile,.card,[role="option"]'))return 'select';
 return 'uiTap';
}
function observeUI(){
 let shown=new Map();
 // Tooltips and inspector are built by several UI modules; observe actual opening,
 // including delayed long presses, rather than guessing from the initial tap.
 new MutationObserver(()=>{
  const next=new Map();
  for(const el of document.querySelectorAll('#inspect,#kwtip.on,#cardtip.on')){
   const key=el.id,content=el.textContent;next.set(key,content);
   if(!shown.has(key)||shown.get(key)!==content)playSound(key==='inspect'?'enlarge':'tooltip');
  }
  if(shown.has('inspect')&&!next.has('inspect'))playSound('menuClose');
  shown=next;
 }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
}
export function initAudio(){
 if(initialized)return;initialized=true;observeUI();
 const unlock=()=>{unlocked=true;try{if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(AC){ctx=new AC();master=ctx.createGain();master.gain.value=level('sfxVolume');const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.003;limiter.release.value=.12;const ceiling=ctx.createWaveShaper(),curve=new Float32Array(2049);for(let i=0;i<curve.length;i++)curve[i]=.95*Math.tanh(i*2/(curve.length-1)-1);ceiling.curve=curve;ceiling.oversample='4x';master.connect(limiter);limiter.connect(ceiling);ceiling.connect(ctx.destination)}}if(ctx)ctx.resume().catch(()=>{})}catch(_){}
 warmSfx();syncAudio();startTrack();if(current&&(current.el.muted||current.blocked)){const voice=current;voice.el.muted=false;voice.blocked=false;voice.el.play().then(()=>{if(current===voice)ramp(voice,level('musicVolume'),.15)}).catch(()=>{voice.blocked=true})}};
 let pendingDrag=null;
 document.addEventListener('pointerdown',e=>{unlock();if(e.button>0)return;
  const card=e.target.closest?.('.hand .card,#chartcards .card');
  pendingDrag=card?{el:card,id:e.pointerId,moved:false}:null;
 },true);
 document.addEventListener('click',e=>{
  const el=e.target.closest?.('[data-sfx],button,.btn,[role="button"],[role="tab"],[role="option"],.card,[onclick]');
  if(!el||el.closest('[disabled],[aria-disabled="true"]')||e.defaultPrevented)return;
  const sound=clickSound(el);if(sound)playSound(sound);
 });
 document.addEventListener('pointermove',e=>{const d=pendingDrag;if(!d||d.id!==e.pointerId||d.moved)return;
  if(d.el.matches('.drag')||d.el.closest('.cslot.lift')){d.moved=true;playSound('pickup')}
 });
 const drop=e=>{const d=pendingDrag;if(!d||d.id!==e.pointerId)return;
  if(d.moved||d.el.matches('.drag')||d.el.closest('.cslot.lift'))playSound(e.type==='pointercancel'?'cancel':'drop');pendingDrag=null;
 };
 document.addEventListener('pointerup',drop,true);document.addEventListener('pointercancel',drop,true);
 document.addEventListener('keydown',unlock,{once:true});
 document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const node=e.target.closest?.('.node');if(node&&!node.contains(e.relatedTarget))playSound('mapHover');else {const el=e.target.closest?.('button,.btn,.tile,.hand .card');if(el&&!el.contains(e.relatedTarget)&&!el.matches('[disabled],[aria-disabled="true"]'))playSound('hover')}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){for(const source of activeSfx)source.stop();retire();for(const voice of voices){if(voice.frame)cancelAnimationFrame(voice.frame);voice.el.pause();voice.el.removeAttribute('src');voice.el.load()}voices.clear();outgoing.clear();clearTimeout(handoffTimer);if(ctx)ctx.suspend().catch(()=>{})}else if(unlocked){if(ctx)ctx.resume().catch(()=>{});startTrack()}});
 observeEvents((event,c)=>{if(event==='parry'&&fxOn())playSound('parry');queueMicrotask(syncProgress);if(event==='enterRoom'){playSound('travel');setTimeout(()=>{if(!document.hidden)playSound('room')},100)}const sounds={shuffle:'shuffle',guardGained:'guard',playerDamaged:'hurt',turnEnd:'endTurn',goldGained:'reward',gainCard:'reward',relicGained:'reward',potionUsed:'potion'};
 contextSound(event,c);
 if(event==='enemyKilled'&&!document.hidden){const e=c.enemy,sound=deathSoundOf(e);if(fxOn())setTimeout(()=>{if(!document.hidden)playSound(sound)},T(impactBase()));else playSound(sound)}
 if(event==='bossBeat'&&c.kind==='intro')playSound('bossIntro');
 if(event==='bossBeat'&&c.kind==='phase'){if(c.enemy)phaseHeard.add(c.enemy);if(!document.hidden)playSound('bossPhase')}
 if(!fxOn()&&!document.hidden){const combo={crest:'crest',undertow:'guard',echo:'echo',flourish:'flourish',parry:'parry',waypointPlaced:'rank',waypointTrigger:'rank',advance:(c.wp?.rank||0)>=3?'landmark':'rank'};if(combo[event])playSound(combo[event])}
 if(event==='playerHit'&&c.blocked>0&&!c.amount)playSound('guard');
 if(event==='damageDealt'&&c.amount>0)playSound(c.amount>=15?'heavy':'light');
 else if(event==='statusApplied'&&((c.n>0&&['weak','vuln','brittle','soaked','bleed','sink'].includes(c.key))||(c.n<0&&['str','dex'].includes(c.key))))playSound(({weak:'soaked',vuln:'exposed',brittle:'brittle',bleed:'bleed',sink:'sink'})[c.key]||'debuff');
 else if(event==='combatEnd'&&!c.escaped){if(c.won&&cue.victoryAt>performance.now()){const wait=cue.victoryAt-performance.now();cue.victoryAt=0;setTimeout(()=>playSound('victory'),wait)}else playSound(c.won?'victory':'defeat')}else if(sounds[event])playSound(sounds[event]);
 });
 syncAudio();
}

let meterCombat=null,meterMom=0;
function syncMeters(){const cb=W.cb;if(cb!==meterCombat){meterCombat=cb;meterMom=cb?.mom||0;return}if(cb&&cb.mom!==meterMom){meterMom=cb.mom;playSound('momentum')}}
function contextSound(event,c){
 if(event==='cardPlayed')playSound(({A:'attack',S:'skill',P:'power',W:'waypoint',C:'curse',T:'debuff'})[c.type]||'play');
 if(event==='turnEndInHand'&&W.cb?.hand.length)playSound('discard');
 if(event==='sink')playSound('sink');
 if(event==='mapEnter')playSound('mapEnter');
 if(event==='tideChange'&&c.delta)playSound(c.delta>0?'tideRise':'tideFall');
 const names={tideTurn:'tideTurn',mark:'mark',chart:'shuffle',chartDone:'confirm',decamp:'decamp',gainCurse:'curse',potionUsed:'potion'};
 if(names[event])playSound(names[event]);
 if(event==='enterRoom'){const room={shop:'shop',rest:'camp',chest:'chest',treasure:'chest'}[c.type];if(room)playSound(room)}
 if(event==='statusApplied'&&c.n>0){const sound={str:'might',dex:'poise',regen:'heal',drench:'drenched',reson:'resonating',shell:'shell',barbs:'barbs',ward:'rebuff',mending:'mending',mightTmp:'might',rooted:'entangle',parry:'guard'}[c.key];if(sound)playSound(sound)}
 if(event==='combatStart'&&c.kind==='boss')playSound('bossIntro');
 if(event==='enemyAct'){
  const e=c.enemy,m=c.intent||{};
  if(e.key==='bell'||e.key==='novice'||m.ring)playSound('knell');
  else if(m.a)playSound(ENEMY_VOICES[e.key]||'heavy');
  else if(m.heal||m.healAlly)playSound('heal');
  else if(m.b)playSound('guard');
  else if(m.s)playSound('might');
  else if(m.summon||m.status)playSound('entangle');
  else if(m.steal||m.stealPotion)playSound('shop');
  else playSound(ENEMY_VOICES[e.key]||'debuff');
 }
}
// Material voices apply to each foe's attacks and named special intents.
const ENEMY_VOICES={slug:'water',gull:'cloth-open',knight:'steel',pod:'bubble',wisp:'gutter',crab:'metal',leech:'bubble',lurker:'rope',tendril:'rope',penitent:'steel',mender:'steel',heap:'heavy',limpet:'light',novice:'bell',captain:'steel',eel:'water',warden:'gutter',bell:'bell',matriarch:'rope',tenant:'heavy'};
