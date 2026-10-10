// ui/screens/intro.js: the opening cinematic (design/intro-cinematic.md). Plays on New Game the first time, replayable from Learn to Play.
// Scene state lives in W.S ({view:'intro',scene,prev}); each render restarts that scene's CSS Ken Burns, crossfade and letter reveal.
// Scenes 1-4 use art/v2/intro/intro-N.webp; scene 5 is built from intro-3 (push in to the stair base, mist, hero silhouettes).
import {W} from '../../core/state.js';
import {settings,saveSettings} from '../../save.js';
import {render} from '../render.js';
import {spriteImg} from './select.js';
import {ORDER} from './heroes.js';
const IMG=n=>`art/v2/intro/intro-${n===5?3:n}.webp`;
export const INTRO_URLS=[1,2,3,4].map(IMG);
// [narration lines, seconds before auto-advance]
const SCENES=[
 [['It did not set. It sank.','Down beneath the Pale Sea, dragging the world’s light into the deep.'],12],
 [['Each year, the water rose higher, devouring the shores.'],9],
 [['But now, the ocean draws back.','The ancient stair has risen.'],10],
 [['At the summit lies the lamp that can call the Drowned Sun back.','But the climb is a vertical grave.'],12],
 [['Four souls stand upon the salt-slick stone, ready to brave the ascent.','Choose your climber.'],14]];
export const INTRO_SCENES=SCENES.length;
let timer=0;
const calm=()=>!!settings.reduceMotion;
function words(t,base){let d=base;return t.split(' ').map(w=>{const s=`<span style="animation-delay:${d.toFixed(2)}s">${w}</span>`;d+=calm()?0:.13;return s}).join(' ')}
function textHTML(n){let at=.9;return SCENES[n-1][0].map((l,i)=>{const h=`<p class="${i?'l2':'l1'}">${words(l,at)}</p>`;at+=l.split(' ').length*.13+.5;return h}).join('')}
function arm(){clearTimeout(timer);if(W.S.screen!=='title'||W.S.view!=='intro')return;const n=W.S.scene;
 timer=setTimeout(()=>{if(W.S.screen==='title'&&W.S.view==='intro'&&W.S.scene===n)introNext()},SCENES[n-1][1]*1000*(window.FAST?.05:1))}
export function introScr(){const n=Math.max(1,Math.min(SCENES.length,W.S.scene|0||1)),p=W.S.prev;
 queueMicrotask(arm);
 return `<div class="tb-scr tb-intro${calm()?' calm':''}" id="intro" onclick="introNext()">
 ${p?`<div class="in-img out s${p}" style="background-image:url(${IMG(p)})"></div>`:''}
 <div class="in-img in s${n}" style="background-image:url(${IMG(n)})"></div>
 ${n===5?`<div class="in-mist m1"></div><div class="in-mist m2"></div><div class="in-heroes">${ORDER.map((k,i)=>spriteImg(k,'in-hero h'+i)).join('')}</div>`:''}
 <div class="in-vig"></div>
 <div class="in-text" id="introtext" key="${n}">${textHTML(n)}</div>
 <div class="in-dots">${SCENES.map((_,i)=>`<i class="${i+1===n?'on':''}"></i>`).join('')}</div>
 <button class="tb-btn sm in-skip" id="introskip" onclick="event.stopPropagation();introSkip()">Skip ›</button>
 <div class="in-tap">${n===SCENES.length?'Tap to choose your climber':'Tap to continue'}</div></div>`}
export function introStart(replay){W.S={screen:'title',view:'intro',scene:1,prev:0,replay:!!replay};render()}
export function introNext(){if(W.S.screen!=='title'||W.S.view!=='intro')return;const n=W.S.scene;
 if(n>=SCENES.length)return introDone();W.S={...W.S,scene:n+1,prev:n};render()}
function introDone(){clearTimeout(timer);const replay=W.S.replay;settings.introSeen=true;saveSettings();
 W.S=replay?{screen:'title',view:'learn',page:0}:{screen:'title',view:'select',page:0,hero:null};render()}
export function introSkip(){introDone()}
// New Game: cinematic the first time (and every time until seen) unless "Always skip intro" is on.
export function newGame(){if(settings.skipIntro||settings.introSeen){W.S={screen:'title',view:'select',page:0,hero:null};render()}else introStart(false)}
export function setSkipIntro(on){settings.skipIntro=!!on;saveSettings()}
