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
export function selectScr(){const S=W.S;
 return `<div class="tb-scr tb-select">${bgHTML()}<div class="tb-top"><button class="tb-btn sm" id="selback" onclick="titleGo('main')">‹ Back</button><h2>Choose Your Climber</h2><span class="tb-sp"></span></div>
 <div class="tb-line">${ORDER.map(k=>{const K=CLASSES[k];return `<button class="tb-pick theme-${TH[k]}${S.hero===k?' on':''}" data-cls="${k}" onclick="selectHero('${k}')" aria-label="${K.n}">
  <span class="tb-glow"></span>${spriteImg(k,'tb-spr')}<span class="tb-plate"><b>${K.n}</b><i>${HEROES[k].epithet}</i>${lampChip(k)}</span></button>`}).join('')}</div>
 ${S.hero?panelHTML(S.hero):''}</div>`}
export function selectHero(cls){if(!CLASSES[cls])return;W.S={...W.S,screen:'title',view:'select',hero:cls};render()}
export function closeHero(){W.S={...W.S,hero:null};render()}
export function beginHero(cls){if(!CLASSES[cls])return;newRun(cls)}
