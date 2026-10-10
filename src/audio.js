// Act 1 audio. Add matching filenames to audio/music/index.json and the SW shell.
// Playlist order uses its own randomness, never the run's seeded RNG.
import {W} from './core/state.js';
import {settings,saveSettings} from './save.js';
import {observeEvents} from './core/bus.js';
let ctx,master,unlocked=false,manifest={},context=null,current=null,lastScreen=null,initialized=false;
const bags={},lastTrack={},voices=new Set(),recent={};
const level=k=>settings.audioMuted?0:Math.max(0,Math.min(1,Number(settings[k])||0));
const indexURL=new URL('../audio/music/index.json',import.meta.url);
fetch(indexURL).then(r=>{if(!r.ok)throw Error('Music index unavailable');return r.json()}).then(data=>{
 for(const k of ['map','fight','elite','boss'])manifest[k]=(data[k]||[]).filter(f=>new RegExp(`^${k}-act1-\\d+\\.mp3$`).test(f));
 manifest.intro=(data.intro||[]).filter(f=>/^intro-\d+\.mp3$/.test(f));
 manifest.menu=(data.menu||[]).filter(f=>/^menu-\d+\.mp3$/.test(f));
 if(unlocked)startTrack();
}).catch(e=>console.warn('Music unavailable:',e.message));
function ramp(voice,to,seconds,dispose=false){
 if(voice.frame)cancelAnimationFrame(voice.frame);
 const from=voice.el.volume,start=performance.now();
 const tick=now=>{const t=Math.min(1,(now-start)/(seconds*1000));voice.el.volume=Math.max(0,Math.min(1,from+(to-from)*t));
  if(t<1)voice.frame=requestAnimationFrame(tick);else{voice.frame=null;if(dispose){voice.el.pause();voice.el.removeAttribute('src');voice.el.load();voices.delete(voice)}}};
 voice.frame=requestAnimationFrame(tick);
}
function retire(){if(current){current.el.onended=null;current.el.onerror=null;current.el.ontimeupdate=null;ramp(current,0,2,true);current=null}}
function nextFile(){let bag=bags[context];if(!bag||!bag.length){bag=[...(manifest[context]||[])];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
 if(bag.length>1&&bag[bag.length-1]===lastTrack[context])[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];bags[context]=bag}
 return bag.pop();
}
function startTrack(){if(!unlocked||!context||current||document.hidden)return;const file=nextFile();if(!file)return;
 lastTrack[context]=file;const el=new Audio(new URL(file,indexURL).href),voice={el,frame:null};el.volume=0;el.preload='auto';voices.add(voice);current=voice;
 el.onended=()=>{if(current===voice){retire();startTrack()}};
 el.ontimeupdate=()=>{if(current===voice&&Number.isFinite(el.duration)&&el.duration-el.currentTime<=2&&el.currentTime>0){retire();startTrack()}};
 // A missing track must not spin through an unavailable playlist forever.
 el.onerror=()=>{if(current===voice)retire()};
 el.play().then(()=>{if(current===voice)ramp(voice,level('musicVolume'),1.5)}).catch(()=>{if(current===voice)retire()});
}
export function syncAudio(){syncUIState();const s=W.S.screen;
 const next=s==='title'&&W.S.view==='intro'?'intro':s==='title'?'menu':W.run&&W.run.act===1&&s!=='title'&&s!=='end'?(s==='combat'&&W.cb?W.cb.kind:'map'):null;
 if(next!==context){retire();context=next;startTrack()}
 if(s==='end'&&lastScreen!==s)playSound(W.run&&W.run.won?'victory':'defeat');lastScreen=s;
}
export function setAudioSetting(key,value){if(!['musicVolume','sfxVolume','audioMuted'].includes(key))return;
 settings[key]=key==='audioMuted'?!!value:Math.max(0,Math.min(1,Number(value)||0));saveSettings();applyVolumes();
}
function applyVolumes(){if(master)master.gain.setTargetAtTime(level('sfxVolume'),ctx.currentTime,.03);
 for(const voice of voices)if(voice!==current&&settings.audioMuted)ramp(voice,0,.08,true);
 if(current)ramp(current,level('musicVolume'),.15);
}
// Soft filtered noise under falling sine tones gives impacts and card movement a watery voice.
const tones={tap:[220,150,.07],lift:[270,410,.12],play:[340,170,.19],draw:[200,320,.09],shuffle:[130,250,.23],light:[150,65,.16],heavy:[95,38,.3],guard:[180,360,.26],debuff:[240,90,.24],death:[120,35,.45],hurt:[100,48,.23],reward:[330,495,.28],victory:[220,440,.7],defeat:[165,55,.75],endTurn:[220,110,.22]};
// UI voices: [pitch start, pitch end, seconds, peak, noise mix, cutoff].
Object.assign(tones,{
 uiTap:[190,130,.065,.045,.12,750],select:[285,210,.09,.05,.1,950],
 menuOpen:[170,280,.14,.045,.35,800],menuClose:[240,150,.1,.04,.3,750],
 tab:[260,320,.075,.04,.22,850],confirm:[280,420,.16,.05,.08,1000],cancel:[210,135,.1,.04,.12,750],
 mapHover:[410,290,.07,.025,.04,800],mapTap:[300,190,.11,.045,.08,900],
 travel:[140,220,.22,.045,.5,650],room:[165,247,.28,.045,.04,850],
 pile:[180,290,.16,.04,.65,900],tooltip:[350,280,.065,.025,.06,750],
 enlarge:[210,350,.15,.045,.3,900],pickup:[200,310,.1,.04,.4,850],drop:[250,160,.1,.045,.3,750],
 levelUp:[220,440,.42,.065,.035,1000],taskComplete:[330,495,.32,.055,.035,1000]
});
export function playSound(name){if(!ctx||ctx.state!=='running'||!level('sfxVolume'))return;const now=ctx.currentTime;
 if(now-(recent[name]??-10)<.055)return;recent[name]=now;
 const [from,to,duration,peak=.12,noiseMix=.22,cutoff=1100]=tones[name]||tones.tap;
 const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),osc=ctx.createOscillator();
 filter.type='lowpass';filter.frequency.value=cutoff;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(peak,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 osc.type='sine';osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(to,now+duration);
 const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),samples=buffer.getChannelData(0);
 for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*noiseMix;
 const noise=ctx.createBufferSource();noise.buffer=buffer;osc.connect(filter);noise.connect(filter);filter.connect(gain);gain.connect(master);
 osc.start(now);noise.start(now);osc.stop(now+duration);noise.stop(now+duration);osc.onended=()=>{osc.disconnect();noise.disconnect();filter.disconnect();gain.disconnect()};
 if(name==='victory'||name==='reward'||name==='room'||name==='levelUp'||name==='taskComplete'){const bell=ctx.createOscillator();bell.frequency.value=from*1.5;bell.connect(gain);bell.start(now+.08);bell.stop(now+duration);bell.onended=()=>bell.disconnect()}
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
 const next={screen:W.S.screen,view:W.S.view,ov:W.S.ov,tab:W.S.tab,potion:W.S.potion,relic:W.S.relicView};
 if(uiState){
  if(next.ov!==uiState.ov)playSound(next.ov?(['deck','draw','disc','exh'].includes(next.ov)?'pile':'menuOpen'):'menuClose');
  else if(next.view!==uiState.view&&next.screen==='title')playSound(next.view==='main'?'menuClose':'menuOpen');
  else if(next.tab!==uiState.tab&&next.screen===uiState.screen)playSound('tab');
  else if(next.potion!==uiState.potion||next.relic!==uiState.relic)playSound(next.potion!=null||next.relic?'menuOpen':'menuClose');
  if(next.screen==='travel'&&uiState.screen!=='travel')playSound('travel');
 }
 uiState=next;syncProgress();
}
function clickSound(el){
 if(el.dataset.sfx)return el.dataset.sfx;
 const action=el.getAttribute('onclick')||'',label=(el.getAttribute('aria-label')||el.textContent||'').trim();
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
 const unlock=()=>{unlocked=true;try{if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(AC){ctx=new AC();master=ctx.createGain();master.gain.value=level('sfxVolume');master.connect(ctx.destination)}}if(ctx)ctx.resume().catch(()=>{})}catch(_){}
 syncAudio();startTrack();};
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
 document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const node=e.target.closest?.('.node');if(node&&!node.contains(e.relatedTarget))playSound('mapHover')});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){retire();for(const voice of voices){if(voice.frame)cancelAnimationFrame(voice.frame);voice.el.pause();voice.el.removeAttribute('src');voice.el.load()}voices.clear();if(ctx)ctx.suspend().catch(()=>{})}else if(unlocked){if(ctx)ctx.resume().catch(()=>{});startTrack()}});
 observeEvents((event,c)=>{queueMicrotask(syncProgress);if(event==='enterRoom'){playSound('travel');setTimeout(()=>{if(!document.hidden)playSound('room')},100)}const sounds={cardPlayed:'play',draw:'draw',shuffle:'shuffle',guardGained:'guard',enemyKilled:'death',playerDamaged:'hurt',turnEnd:'endTurn',goldGained:'reward',gainCard:'reward',relicGained:'reward'};
 if(event==='damageDealt'&&c.amount>0)playSound(c.amount>=15?'heavy':'light');
 else if(event==='statusApplied'&&((c.n>0&&['weak','vuln','brittle','soaked','bleed','sink'].includes(c.key))||(c.n<0&&['str','dex'].includes(c.key))))playSound('debuff');
 else if(event==='combatEnd'&&!c.escaped)playSound(c.won?'victory':'defeat');else if(sounds[event])playSound(sounds[event]);
 });
 syncAudio();
}
