// ui/screens/charsel-audio.js: world sounds for character select (CHARSEL-IDEAS idea 9). Spencer-approved world cues, NOT UI clicks:
// sea/wind/chain ambience bed, a buoy bell per hero (one chord, so moving across plays a melody), a tide swell, a wind breath on the
// lore window, and the Begin drone. All synthesised in WebAudio (no files), soft, and gated on settings.audioMuted / sfxVolume.
// Stand-in quality note: synthesis is a placeholder for recorded bells/sea; swap by replacing the voice functions below.
import {settings} from '../../save.js';
let ctx=null,out=null,bed=null;
const vol=()=>settings.audioMuted?0:Math.max(0,Math.min(1,Number(settings.sfxVolume)||0));
const ok=()=>vol()>0&&!document.hidden&&!window.FAST;
function ac(){if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();out=ctx.createGain();out.gain.value=.5;out.connect(ctx.destination)}
 if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx.state==='running'?ctx:null}
function noise(sec=2){const b=ctx.createBuffer(1,ctx.sampleRate*sec,ctx.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}return b}
// Bell pitches: D minor-add9 chord in order tide, echo, carto, duel.
const BELL={tide:293.66,echo:349.23,carto:440,duel:329.63};
export function bell(cls,g=.16){if(!ok()||!ac())return;const t=ctx.currentTime,f=BELL[cls]||330,v=g*vol();
 for(const [r,a,d] of [[1,1,3.2],[2.01,.45,2.2],[2.76,.28,1.6],[5.4,.12,.8],[.5,.25,3.8]]){const o=ctx.createOscillator(),e=ctx.createGain();o.type='sine';o.frequency.value=f*r;
  e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(v*a,t+.012);e.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(e);e.connect(out);o.start(t);o.stop(t+d+.05)}}
function swish(dur,peak,lo,hi,q=.7){if(!ok()||!ac())return;const t=ctx.currentTime,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),e=ctx.createGain();s.buffer=noise(dur+.2);
 f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(lo,t);f.frequency.exponentialRampToValueAtTime(hi,t+dur*.6);
 e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(peak*vol(),t+dur*.45);e.gain.linearRampToValueAtTime(0,t+dur);s.connect(f);f.connect(e);e.connect(out);s.start(t);s.stop(t+dur+.1)}
export const swell=()=>swish(1.8,.10,180,520,.5);
export const breath=()=>swish(.9,.05,900,1800,1.2);
export function drone(){if(!ok()||!ac())return;const t=ctx.currentTime,v=.14*vol();duckBed(.15,1.4);
 for(const [f,a] of [[73.4,1],[110,.5],[146.8,.35]]){const o=ctx.createOscillator(),e=ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(f*.94,t+.35);o.frequency.linearRampToValueAtTime(f,t+1.6);
  e.gain.setValueAtTime(0,t);e.gain.setValueAtTime(0,t+.35);e.gain.linearRampToValueAtTime(v*a,t+1.3);e.gain.linearRampToValueAtTime(0,t+1.9);o.connect(e);e.connect(out);o.start(t);o.stop(t+2)}}
// Ambience bed: low sea (lowpassed noise with slow swell LFO) + wind (band noise) + an occasional chain creak.
export function startBed(){if(bed||!ok()||!ac())return;const t=ctx.currentTime,g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09*vol(),t+2.5);g.connect(out);
 const mk=(type,freq,q,lv)=>{const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),e=ctx.createGain();s.buffer=noise(4);s.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=q;e.gain.value=lv;s.connect(f);f.connect(e);e.connect(g);s.start();return {s,e}};
 const sea=mk('lowpass',380,.4,1),wind=mk('bandpass',1100,.9,.25),lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=.11;lg.gain.value=.5;lfo.connect(lg);lg.connect(sea.e.gain);lfo.start();
 const creak=setInterval(()=>{if(!ok())return;if(Math.random()<.5)swish(.5,.025,260,190,8)},4200);
 bed={g,parts:[sea.s,wind.s,lfo],creak}}
export function duckBed(to,sec){if(!bed||!ctx)return;const t=ctx.currentTime;bed.g.gain.cancelScheduledValues(t);bed.g.gain.setValueAtTime(bed.g.gain.value,t);bed.g.gain.linearRampToValueAtTime(to*.09*vol(),t+sec)}
export function stopBed(sec=.6){if(!bed||!ctx)return;const b=bed;bed=null;clearInterval(b.creak);const t=ctx.currentTime;b.g.gain.cancelScheduledValues(t);b.g.gain.setValueAtTime(b.g.gain.value,t);b.g.gain.linearRampToValueAtTime(0,t+sec);setTimeout(()=>b.parts.forEach(p=>{try{p.stop()}catch{}}),sec*1000+100)}
