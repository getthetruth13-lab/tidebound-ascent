// ui/screens/select.js: character select (Task 30, C1 "Four Lanterns on the Stair"). Four landings climb left to right, a hero on each with an unlit
// lantern above. Tap a hero: its lantern lights in the class colour, a one-line promise and a tiny looping meter demo appear. Begin lifts the lantern
// and starts the run. The (i) button or a long-press opens the full panel (lore, how it plays, relic). Locked heroes (progress.js HERO_LOCKS, behind a
// dev flag that keeps everyone open) show as a silhouette under an unlit lantern with the unlock hint. Painted slots: select-stair, select-lantern.
import {W} from '../../core/state.js';
import {U} from '../../core/timing.js';
import {CLASSES,RELICS} from '../../core/registry.js';
import {SPRITES} from '../../data/sprites.js';
import {newRun} from '../../engine/run.js';
import {render,TH} from '../render.js';
import {HEROES,ORDER,SPRITE_OF} from './heroes.js';
import {bgHTML,frameOpen,frameClose} from './frame.js';
import {lampChip} from './lamp.js';
import {loadProfile,heroUnlocked,HERO_LOCKS,lampLevel} from '../../progress.js';
import {emblemHTML} from '../tiles.js';
import {BELL,FLAME,CAIRN} from '../classdais.js';
export const spriteImg=(cls,c='')=>{const s=SPRITES[SPRITE_OF[cls]];return s?`<img class="${c}" src="${s.f}" alt="" draggable="false" style="aspect-ratio:${s.w}/${s.h}">`:''};
function panelHTML(cls){const K=CLASSES[cls],H=HEROES[cls],R=RELICS[K.relic];
 return `<div class="tb-ov" onclick="if(event.target===this)closeHero()"><div class="tb-hero theme-${TH[cls]}" data-cls="${cls}" role="dialog" aria-label="${K.n}">${frameOpen()}
 <div class="tb-hcol">${spriteImg(cls,'tb-hspr')}<div class="tb-hp" title="Starting HP">❤️ <b>${K.hp}</b> HP</div></div>
 <div class="tb-hbody"><h2>${K.n}</h2><div class="tb-epi">${H.epithet}</div><p class="tb-blurb">${H.blurb}</p>
 <div class="tb-two"><div class="tb-lore">${H.lore.map(l=>`<p>${l}</p>`).join('')}</div>
 <div class="tb-mech"><h3>How ${K.n} plays</h3><p>${H.plain}</p>${R?`<div class="tb-rel"><b>${R.n}</b>: ${R.d}</div>`:''}</div></div></div>
 <div class="tb-hfoot"><button class="tb-btn" id="heroback" onclick="closeHero()">Back</button><button class="tb-btn pri" id="beginrun" data-cls="${cls}" onclick="beginHero('${cls}')">Begin</button></div>${frameClose()}</div></div>`}
// Original metal scrollwork stays sharp at phone density; gems inherit the class hue.
const plateTrim=()=>`<svg class="tb-plate-trim" viewBox="0 0 220 100" preserveAspectRatio="none" aria-hidden="true"><path class="plate-rim" d="M16 3H204Q204 12 217 14V86Q204 88 204 97H16Q16 88 3 86V14Q16 12 16 3Z M21 8H199Q200 17 212 19V81Q200 83 199 92H21Q20 83 8 81V19Q20 17 21 8Z"/><g class="plate-scroll"><path d="M13 29Q12 12 35 15Q29 23 20 19Q24 29 16 35M30 12Q37 18 45 13M13 71Q12 88 35 85Q29 77 20 81Q24 71 16 65M30 88Q37 82 45 87"/><path d="M207 29Q208 12 185 15Q191 23 200 19Q196 29 204 35M190 12Q183 18 175 13M207 71Q208 88 185 85Q191 77 200 81Q196 71 204 65M190 88Q183 82 175 87"/></g><g class="plate-gem"><path d="M16 10L20 15L16 20L12 15Z M204 10L208 15L204 20L200 15Z M16 80L20 85L16 90L12 85Z M204 80L208 85L204 90L200 85Z M110 0L115 5L110 10L105 5Z M110 90L115 95L110 100L105 95Z"/></g></svg>`;
const PROMISE={duel:'Builds Momentum with every strike, then Flourishes.',echo:'Hears the Bell. Marks a card so it sounds again.',carto:'Reads the whole deck and lays Waypoints ahead.',tide:'Raises and lowers the sea, and lets it break.'};
// Tiny looping meter demos: the real meter objects (css/meters.css) with a 3-second CSS loop (css/select.css .dm-*).
const DEMO={
 tide:()=>`<div class="dm dm-tide"><div class="tg2-tube is-hi"><i class="tg2-hi"></i><i class="tg2-lo"></i><i class="tg2-w"></i></div></div>`,
 echo:()=>`<div class="dm dm-echo"><span class="bellbtn ring"><span class="rings"><i class="rg on" style="--k:1"></i><i class="rg on" style="--k:2"></i><i class="rg on" style="--k:3"></i></span>${BELL}</span></div>`,
 carto:()=>`<div class="dm dm-carto"><div class="chart"><svg class="rope" viewBox="0 0 20 100" preserveAspectRatio="none" aria-hidden="true"><path d="M10 2C2 14 18 22 10 34S2 54 10 66 18 86 10 98"/></svg>${[0,1,2].map(i=>`<div class="wp full" style="--d:${i}">${CAIRN(i+1)}</div>`).join('')}</div></div>`,
 duel:()=>`<div class="dm dm-duel"><div class="rap" style="--m:3;--mx:5"><span class="wick st-hot">${FLAME}</span><div class="rap-blade"><div class="notches">${[1,2,3,4,5].map(i=>`<i class="on" style="--d:${5-i}"></i>`).join('')}</div></div><div class="rap-guard"></div><div class="rap-grip"></div></div></div>`};
const lantern=(k,lit,locked)=>`<span class="st-lan${lit?' lit':''}${locked?' locked':''}" style="--lv:${Math.min(10,lampLevel(loadProfile(),k))}"><i class="st-line"></i><span class="st-lamp">${emblemHTML('select-lantern','','plain')}<b class="st-cap"></b><b class="st-glass"></b><b class="st-base"></b></span></span>`;
export function selectScr(){const S=W.S,P=loadProfile(),open=k=>heroUnlocked(P,k),foc=S.hero||ORDER.find(open)||ORDER[0],fl=!open(foc);
 return `<div class="tb-scr tb-select tb-stair${S.lifting?' lifting':''}" data-focus="${foc}">${bgHTML()}<div class="stair-bg">${emblemHTML('select-stair','','plain')}</div><div class="tb-top"><button class="tb-btn sm" id="selback" onclick="titleGo('main')">‹ Back</button><h2>Choose Your Lampbearer</h2><span class="tb-sp"></span></div>
 <div class="stair">${ORDER.map((k,i)=>{const K=CLASSES[k],lk=!open(k),on=foc===k;
  return `<button class="st-pick theme-${TH[k]}${on?' on':''}${lk?' locked':''}" data-cls="${k}" data-step="${i}" style="--step:${i}" onclick="selectHero('${k}')" aria-label="${K.n}${lk?' (locked)':''}">
  ${lantern(k,on&&!lk,lk)}<span class="st-fig">${spriteImg(k,'st-spr')}${on&&!lk?DEMO[k]():''}</span>
  <span class="st-slab"><b>${K.n}</b><i>${lk?'Locked: '+HERO_LOCKS[k].hint:on?PROMISE[k]:HEROES[k].epithet}</i>${lk?'':lampChip(k)}</span></button>`}).join('')}</div>
 <div class="st-foot"><button class="st-info" id="heroinfo" onclick="openHero('${foc}')" aria-label="About ${CLASSES[foc].n}" ${fl?'disabled':''}>i</button><button class="tb-btn pri" id="beginfocus" onclick="beginFocused()" ${fl?'disabled':''}>${fl?'Locked':'Begin'}</button></div>
 ${S.heroPanel&&!fl?panelHTML(foc):''}</div>`}
export function selectHero(cls){if(!CLASSES[cls]||pressed)return;W.S={...W.S,screen:'title',view:'select',hero:cls,heroPanel:false};render()}
export function openHero(cls){if(!CLASSES[cls]||!heroUnlocked(loadProfile(),cls))return;W.S={...W.S,screen:'title',view:'select',hero:cls,heroPanel:true};render()}
export function closeHero(){W.S={...W.S,heroPanel:false};render()}
export function beginHero(cls){if(!CLASSES[cls]||!heroUnlocked(loadProfile(),cls))return;newRun(cls)}
// Begin: the lantern is lifted off its hook (CSS .lifting), then the run starts.
export function beginFocused(){const S=W.S,cls=S.hero||ORDER.find(k=>heroUnlocked(loadProfile(),k));if(!cls||!heroUnlocked(loadProfile(),cls))return;
 if(S.lifting)return;if(document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion:reduce)').matches)return beginHero(cls);
 W.S={...S,hero:cls,heroPanel:false,lifting:true};render();setTimeout(()=>{if(W.S.lifting)beginHero(cls)},U(700))}
// Long-press (0.5 s) on a hero opens the full panel; the click that follows the press is swallowed.
let pressed=false,hold=null;
const cancelHold=()=>{if(hold)clearTimeout(hold.t);hold=null};
document.addEventListener('pointerdown',e=>{pressed=false;cancelHold();const b=e.target.closest&&e.target.closest('.st-pick:not(.locked)');if(!b||e.button>0)return;
 hold={id:e.pointerId,x:e.clientX,y:e.clientY,t:setTimeout(()=>{hold=null;pressed=true;openHero(b.dataset.cls)},500)}},true);
document.addEventListener('pointermove',e=>{if(hold&&e.pointerId===hold.id&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>10)cancelHold()},true);
document.addEventListener('pointerup',cancelHold,true);
document.addEventListener('pointercancel',()=>{cancelHold();pressed=false},true);
// Suppress the release click regardless of how long the finger remains down.
document.addEventListener('click',e=>{if(pressed){pressed=false;e.stopImmediatePropagation();e.preventDefault()}},true);
