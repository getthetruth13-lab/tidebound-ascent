// ui/screens/select.js: character select. Four climbers stand side by side in one scene; tapping one opens an ornate panel.
import {W} from '../../core/state.js';
import {CLASSES,RELICS} from '../../core/registry.js';
import {SPRITES} from '../../data/sprites.js';
import {newRun} from '../../engine/run.js';
import {render,TH} from '../render.js';
import {HEROES,ORDER,SPRITE_OF} from './heroes.js';
import {bgHTML,frameOpen,frameClose} from './frame.js';
import {lampChip} from './lamp.js';
export const spriteImg=(cls,c='')=>{const s=SPRITES[SPRITE_OF[cls]];return s?`<img class="${c}" src="${s.f}" alt="" draggable="false" style="aspect-ratio:${s.w}/${s.h}">`:''};
function panelHTML(cls){const K=CLASSES[cls],H=HEROES[cls],R=RELICS[K.relic];
 return `<div class="tb-ov" onclick="if(event.target===this)closeHero()"><div class="tb-hero theme-${TH[cls]}" role="dialog" aria-label="${K.n}">${frameOpen()}
 <div class="tb-hcol">${spriteImg(cls,'tb-hspr')}<div class="tb-hp" title="Starting HP">❤️ <b>${K.hp}</b> HP</div></div>
 <div class="tb-hbody"><h2>${K.n}</h2><div class="tb-epi">${H.epithet}</div><p class="tb-blurb">${H.blurb}</p>
 <div class="tb-two"><div class="tb-lore">${H.lore.map(l=>`<p>${l}</p>`).join('')}</div>
 <div class="tb-mech"><h3>How ${K.n} plays</h3><p>${H.plain}</p>${R?`<div class="tb-rel"><b>${R.n}</b>: ${R.d}</div>`:''}</div></div></div>
 <div class="tb-hfoot"><button class="tb-btn" id="heroback" onclick="closeHero()">Back</button><button class="tb-btn pri" id="beginrun" data-cls="${cls}" onclick="beginHero('${cls}')">Begin</button></div>${frameClose()}</div></div>`}
// Original metal scrollwork stays sharp at phone density; gems inherit the class hue.
const plateTrim=()=>`<svg class="tb-plate-trim" viewBox="0 0 220 100" preserveAspectRatio="none" aria-hidden="true"><path class="plate-rim" d="M16 3H204Q204 12 217 14V86Q204 88 204 97H16Q16 88 3 86V14Q16 12 16 3Z M21 8H199Q200 17 212 19V81Q200 83 199 92H21Q20 83 8 81V19Q20 17 21 8Z"/><g class="plate-scroll"><path d="M13 29Q12 12 35 15Q29 23 20 19Q24 29 16 35M30 12Q37 18 45 13M13 71Q12 88 35 85Q29 77 20 81Q24 71 16 65M30 88Q37 82 45 87"/><path d="M207 29Q208 12 185 15Q191 23 200 19Q196 29 204 35M190 12Q183 18 175 13M207 71Q208 88 185 85Q191 77 200 81Q196 71 204 65M190 88Q183 82 175 87"/></g><g class="plate-gem"><path d="M16 10L20 15L16 20L12 15Z M204 10L208 15L204 20L200 15Z M16 80L20 85L16 90L12 85Z M204 80L208 85L204 90L200 85Z M110 0L115 5L110 10L105 5Z M110 90L115 95L110 100L105 95Z"/></g></svg>`;
export function selectScr(){const S=W.S;
 return `<div class="tb-scr tb-select">${bgHTML()}<div class="tb-top"><button class="tb-btn sm" id="selback" onclick="titleGo('main')">‹ Back</button><h2>Choose Your Climber</h2><span class="tb-sp"></span></div>
 <div class="tb-line">${ORDER.map(k=>{const K=CLASSES[k];return `<button class="tb-pick theme-${TH[k]}${S.hero===k?' on':''}" data-cls="${k}" onclick="selectHero('${k}')" aria-label="${K.n}">
  <span class="tb-glow"></span>${spriteImg(k,'tb-spr')}<span class="tb-plate">${plateTrim()}<b>${K.n}</b><i>${HEROES[k].epithet}</i>${lampChip(k)}</span></button>`}).join('')}</div>
 ${S.hero?panelHTML(S.hero):''}</div>`}
export function selectHero(cls){if(!CLASSES[cls])return;W.S={...W.S,screen:'title',view:'select',hero:cls};render()}
export function closeHero(){W.S={...W.S,hero:null};render()}
export function beginHero(cls){if(!CLASSES[cls])return;newRun(cls)}
