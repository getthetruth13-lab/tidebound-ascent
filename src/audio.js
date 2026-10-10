// Act 1 audio. Add matching filenames to audio/music/index.json and the SW shell.
// Playlist order uses its own randomness, never the run's seeded RNG.
import {W} from './core/state.js';
import {settings,saveSettings} from './save.js';
import {observeEvents} from './core/bus.js';
let ctx,master,unlocked=false,manifest={},context=null,current=null,lastScreen=null;
const bags={},lastTrack={},voices=new Set(),recent={};
const level=k=>settings.audioMuted?0:Math.max(0,Math.min(1,Number(settings[k])||0));
const indexURL=new URL('../audio/music/index.json',import.meta.url);
fetch(indexURL).then(r=>{if(!r.ok)throw Error('Music index unavailable');return r.json()}).then(data=>{
 for(const k of ['map','fight','elite','boss'])manifest[k]=(data[k]||[]).filter(f=>new RegExp(`^${k}-act1-\\d+\\.mp3$`).test(f));
 manifest.intro=(data.intro||[]).filter(f=>/^intro-\d+\.mp3$/.test(f));
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
export function syncAudio(){const s=W.S.screen;
 const next=s==='title'&&W.S.view==='intro'?'intro':W.run&&W.run.act===1&&s!=='title'&&s!=='end'?(s==='combat'&&W.cb?W.cb.kind:'map'):null;
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
export function playSound(name){if(!ctx||ctx.state!=='running'||!level('sfxVolume'))return;const now=ctx.currentTime;
 if(now-(recent[name]??-10)<.055)return;recent[name]=now;
 const [from,to,duration]=tones[name]||tones.tap;
 const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),osc=ctx.createOscillator();
 filter.type='lowpass';filter.frequency.value=1100;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.12,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
 osc.type='sine';osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(to,now+duration);
 const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),samples=buffer.getChannelData(0);
 for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.22;
 const noise=ctx.createBufferSource();noise.buffer=buffer;osc.connect(filter);noise.connect(filter);filter.connect(gain);gain.connect(master);
 osc.start(now);noise.start(now);osc.stop(now+duration);noise.stop(now+duration);osc.onended=()=>{osc.disconnect();noise.disconnect();filter.disconnect();gain.disconnect()};
 if(name==='victory'||name==='reward'){const bell=ctx.createOscillator();bell.frequency.value=from*1.5;bell.connect(gain);bell.start(now+.08);bell.stop(now+duration);bell.onended=()=>bell.disconnect()}
}
export function initAudio(){
 const unlock=()=>{unlocked=true;try{if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(AC){ctx=new AC();master=ctx.createGain();master.gain.value=level('sfxVolume');master.connect(ctx.destination)}}if(ctx)ctx.resume().catch(()=>{})}catch(_){}
 syncAudio();startTrack();};
 document.addEventListener('pointerdown',e=>{unlock();if(e.target.closest?.('.card'))playSound('lift');else if(e.target.closest?.('button,.btn'))playSound('tap')},true);
 document.addEventListener('keydown',unlock,{once:true});
 document.addEventListener('pointerover',e=>{const card=e.target.closest?.('.card');if(card&&!card.contains(e.relatedTarget))playSound('lift')});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){retire();for(const voice of voices){if(voice.frame)cancelAnimationFrame(voice.frame);voice.el.pause();voice.el.removeAttribute('src');voice.el.load()}voices.clear();if(ctx)ctx.suspend().catch(()=>{})}else if(unlocked){if(ctx)ctx.resume().catch(()=>{});startTrack()}});
 observeEvents((event,c)=>{const sounds={cardPlayed:'play',draw:'draw',shuffle:'shuffle',guardGained:'guard',enemyKilled:'death',playerDamaged:'hurt',turnEnd:'endTurn',goldGained:'reward',gainCard:'reward',relicGained:'reward'};
 if(event==='damageDealt'&&c.amount>0)playSound(c.amount>=15?'heavy':'light');
 else if(event==='statusApplied'&&((c.n>0&&['weak','vuln','brittle','soaked','bleed','sink'].includes(c.key))||(c.n<0&&['str','dex'].includes(c.key))))playSound('debuff');
 else if(event==='combatEnd'&&!c.escaped)playSound(c.won?'victory':'defeat');else if(sounds[event])playSound(sounds[event]);
 });
 syncAudio();
}
