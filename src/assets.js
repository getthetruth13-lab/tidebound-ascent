// assets.js
// =====================================================================
// ASSET MAP: the ONE place to swap art. Paths are relative to index.html.
// Groups and keys:
//   frames.<classId>     v2 card frame, 5:7 (1000x1400 @2x, 500x700 @1x). Rects: art/v2/frames/layout.json
//   portraits.<classId>  4:3 class portrait (title screen, top bar)
//   figures.<classId>    battle figure for the player: transparent cut-out sprite (falls back to portraits)
//   enemies.<enemyId>    enemy art. ids: slug gull knight pod wisp crab captain warden eel bell
//   cards.<cardId>       art for the frame's art window (4:3, e.g. 768x576)
//   relics.<relicId>, potions.<potionId>   1:1 icons (optional)
//   ui.<key>             interface art: intent icons, energy orb, End Turn plate, map node medallions
//   textures.<key>       tiling panel textures (also exposed as CSS vars --tex-<key> by applyTextures())
//   classIds: tide echo carto duel ('status' cards have no frame and use the CSS fallback frame)
// Each entry is one of:
//   'art/v2/cards/splash.webp'                     a single file (SVG/PNG/JPG/WebP/AVIF), or
//   ['art/x.png','art/x@2x.png','art/x@3x.png']    1x/2x/3x versions; the browser picks one by DPR
//                                                  (S24 Ultra = 3.75x at QHD+ or 2.8125x at FHD+), or
//   {src, srcset:'a.webp 256w, b.webp 768w', sizes:'120px', fit:'contain'|'cover', pos:'50% 30%', win:true}
//     win:true = a rectangular painting with its own background, shown as a feathered "portrait window"
//     (radial mask) instead of a cut-out standing on the ground.
// Defaults: cards/portraits use fit 'cover'; figures and enemies use 'contain', bottom-aligned.
// A missing entry, or an image that fails to load, falls back to a palette-coloured placeholder
// with the card/enemy emoji, so nothing ever breaks.
// Environment backgrounds are NOT listed here: files + rects come from design/environments.json (ui/env.js).
// =====================================================================
import {SPRITES,SPRITE_BASELINE} from './data/sprites.js';
import {ICONS} from './data/icons.js';
// game status key -> Artist icon key (art/v2/ui/icons.json 'status'); 'rooted' is the Kelp Matriarch's passive
const ST_ICON={block:'guard',str:'might',dex:'poise',weak:'soaked',vuln:'exposed',brittle:'brittle',bleed:'bleed',drench:'drenched',reson:'resonating',mightTmp:'temporary-might',shell:'shell',barbs:'barbs',ward:'rebuff',mending:'mending',rooted:'rooted',
 // clovis/status-icons: painted icons for every lasting effect (pending, armed, per-enemy and Vigil badges).
 parry:'parry',keepMom:'momentum-held',nextDraw:'draw-next',drawLess:'draw-less',nextEnergy:'energy-next',nextMom:'momentum-next',drained:'drained',moonlock:'moonlock',mimic:'mimic-ink',cairn:'cairn-rank',retort:'retort-ready',chartQ:'chart-next',banks:'banked-crest',power:'vigil',queued:'active',armed:'second-mark',guardHold:'guard-held',grudge:'grudge',breath:'held-breath',crestUp:'crest-bonus'};
// Painted HUD pass (clovis/hud): repainted Bleed and Soaked icons.
const ST_HUD={bleed:'art/v2/hud/status-bleed.webp',weak:'art/v2/hud/status-soaked.webp'};
const stIcons=()=>{const o={block:null};for(const [k,v] of Object.entries(ST_ICON))o[k]=ST_HUD[k]||ICONS.status[v]||null;return o};
const slotIcons=m=>Object.fromEntries(Object.entries(m).map(([k,f])=>[k,{src:f,fit:'contain'}]));
const V='art/v2/';
const win=(f,pos)=>({src:V+'enemies/'+f+'.webp',srcset:`${V}enemies/${f}-256.webp 256w, ${V}enemies/${f}.webp 768w`,sizes:'(max-height:500px) 140px, 260px',fit:'cover',pos:pos||'50% 45%',win:true});
const ui=k=>V+'ui/'+k+'.webp';
// Painted HUD pass: repainted intent icons live in art/v2/hud/ (intent-ring keeps its old art).
const HUD_INTENTS=['attack','attack-debuff','buff','debuff','defend','drain','heal','potion','status','steal','summon','unknown'];
// Painted fallen-remains art, trimmed to its pixels: [w,h] by sprite id (ART staging 2026-10-12; twin-eels-b and tide-leech are the picked poses).
const FALLEN={"brine-slug":[1426,661],"coral-crab":[1141,650],"drowned-captain":[830,414],"glimmer-wisp":[860,311],"gull-thief":[1210,441],"heap":[1238,490],"kelp-lurker":[1210,483],"kelp-matriarch":[793,579],"kelp-tendril":[773,552],"knell-a":[1024,552],"knell-b":[1061,464],"leviathan-bell":[1021,570],"limpet":[1057,554],"mender":[857,397],"mirror-warden":[876,413],"novice":[717,420],"penitent":[750,579],"rust-knight":[943,503],"spore-pod":[805,641],"tenant":[976,673],"tide-leech":[1159,620],"twin-eels-a":[961,456],"twin-eels-b":[904,516]};
export const ASSETS={
 frames:{tide:[V+'frames/frame-tidecaller@1x.webp',V+'frames/frame-tidecaller.webp'],echo:[V+'frames/frame-echo-mage@1x.webp',V+'frames/frame-echo-mage.webp'],
  carto:[V+'frames/frame-cartographer@1x.webp',V+'frames/frame-cartographer.webp'],duel:[V+'frames/frame-duelist@1x.webp',V+'frames/frame-duelist.webp']},
 portraits:Object.fromEntries([['tide','tidecaller'],['echo','echo-mage'],['carto','cartographer'],['duel','duelist']].map(([k,f])=>[k,{src:V+'portraits/'+f+'.webp',srcset:`${V}portraits/${f}-256.webp 256w, ${V}portraits/${f}.webp 768w`,sizes:'(max-height:500px) 120px, 240px',pos:'50% 30%'}])),
 // Class battle figures: ALWAYS the transparent cut-out sprites (never portraits or card paintings).
 figures:{tide:V+'sprites/tidecaller.webp',echo:V+'sprites/echo-mage.webp',carto:V+'sprites/cartographer.webp',duel:V+'sprites/duelist.webp'},
 enemies:{slug:win('brine-slug'),gull:win('gull-thief','50% 35%'),knight:win('rust-knight','50% 35%'),pod:win('spore-pod'),wisp:win('glimmer-wisp','50% 40%'),
  crab:win('coral-crab','50% 55%'),captain:win('drowned-captain','50% 30%'),warden:win('mirror-warden','50% 35%'),eel:win('twin-eels'),
  // Bell (The Knell): map boss node always uses variant A (art/v2/sprites/knell-a.webp), contained in its window.
  bell:{src:'art/v2/sprites/knell-a.webp',fit:'contain',pos:'50% 60%'},
  // ART_TASK_63: map portraits for the 10 newer enemies (window art where it exists, else the battle sprite contained).
  leech:win('tide-leech'),lurker:win('kelp-lurker'),tendril:win('kelp-tendril'),matriarch:win('kelp-matriarch'),
  penitent:{src:'art/v2/sprites/penitent.webp',fit:'contain',pos:'50% 60%'},mender:{src:'art/v2/sprites/mender.webp',fit:'contain',pos:'50% 60%'},heap:{src:'art/v2/sprites/heap.webp',fit:'contain',pos:'50% 60%'},limpet:{src:'art/v2/sprites/limpet.webp',fit:'contain',pos:'50% 60%'},novice:{src:'art/v2/sprites/novice.webp',fit:'contain',pos:'50% 60%'},tenant:{src:'art/v2/sprites/tenant.webp',fit:'contain',pos:'50% 60%'}},
 cards:{},
 // Fallen-remains poses (art/v2/fallen/fallen-<spriteId>.webp, foot line = image bottom): every foe that dies leaves one. Dims in FALLEN below.
 fallen:Object.fromEntries(Object.keys(FALLEN).map(id=>[id,V+'fallen/fallen-'+id+'.webp'])),
 // Card-art placeholders until per-card art exists: the class card painting cropped 4:3 into the frame's art window.
 cardPH:Object.fromEntries([['tide','tidecaller'],['echo','echo-mage'],['carto','cartographer'],['duel','duelist'],['curse','curse'],['status','status'],['colorless','colorless'],['artifact','colorless']]
  .map(([k,f])=>[k,{src:V+`cards/ph-${f}.webp`,srcset:`${V}cards/ph-${f}-384.webp 384w, ${V}cards/ph-${f}.webp 768w`,sizes:'(max-height:500px) 160px, 240px',fit:'cover'}])),
 // Battle sprites (ids in data/sprites.js, generated from art/v2/sprites/sprites.json). Enemies without a sprite file use a placeholder.
 sprites:{figures:{tide:'tidecaller',echo:'echo-mage',carto:'cartographer',duel:'duelist'},
  enemies:{slug:'brine-slug',gull:'gull-thief',knight:'rust-knight',pod:'spore-pod',wisp:'glimmer-wisp',crab:'coral-crab',captain:'drowned-captain',
   warden:'mirror-warden',eel:['twin-eels-a','twin-eels-b'],bell:['knell-a','knell-b'],leech:'tide-leech',lurker:'kelp-lurker',tendril:'kelp-tendril',matriarch:'kelp-matriarch',
   // Task 21 delivery sprites: all six passed technical and game-fit art review.
   penitent:'penitent',mender:'mender',heap:'heap',limpet:'limpet',novice:'novice',tenant:'tenant',
   // Act 2 sprites that passed the independent 9.0 gate (art review enemies-round6): Riveted Diver, Shellback Guard, Kettleman, Lice.
   diver:'diver',shellguard:'shellguard',kettleman:'kettleman',lice:'lice'}},
 // HUD icons: art/v2/ui/icon-*-64.webp via data/icons.js (tools/gen-icons.py). A missing key falls back to its emoji.
 hud:{...ICONS.hud},
 // Painterly status icons (art/v2/ui/status-*-64.webp); null = emoji badge.
 status:stIcons(),
 // Relic / potion icons from icons.json; relics outside the Artist's set keep their emoji.
 relics:slotIcons(ICONS.relic),
 potions:slotIcons(ICONS.potion),
 ui:{'intent-attack':ui('intent-attack'),'intent-attack-debuff':ui('intent-attack-debuff'),'intent-buff':ui('intent-buff'),'intent-debuff':ui('intent-debuff'),
  'intent-defend':ui('intent-defend'),'intent-unknown':ui('intent-unknown'),'energy-orb-full':ui('energy-orb-full'),'energy-orb-empty':ui('energy-orb-empty'),
  'end-turn':ui('end-turn'),'end-turn-pressed':ui('end-turn-pressed'),
  'end-turn-c2':ui('end-turn-c2'),'end-turn-c2-burst':ui('end-turn-c2-burst'),
  'node-fight':ui('node-combat'),'node-elite':ui('node-elite'),'node-rest':ui('node-rest'),'node-shop':ui('node-shop'),'node-event':ui('node-unknown'),'node-unknown':ui('node-unknown'),'node-treasure':ui('node-treasure'),'node-boss':ui('node-boss')},
 textures:{parchment:V+'textures/parchment.webp','parchment-dark':V+'textures/parchment-dark.webp',stone:V+'textures/stone-panel.webp',leather:V+'textures/leather-panel.webp'}
};
const FIT_DEFAULT={cards:'cover',portraits:'cover',figures:'contain',enemies:'contain',ui:'contain'};
export function assetEntry(group,key){const g=ASSETS[group];let v=g&&g[key];if(!v&&group==='relics'&&g)v=g.generic; // any relic/charm without its own icon -> relic-generic
 if(!v)return null;
 if(typeof v==='string')v={src:v};else if(Array.isArray(v))v={src:v[0],srcset:v.map((s,i)=>`${s} ${i+1}x`).join(', ')};
 return {src:v.src,srcset:v.srcset||'',sizes:v.sizes||'',fit:v.fit||FIT_DEFAULT[group]||'cover',pos:v.pos,win:!!v.win}}
// Battle sprite for a class (group 'figures') or enemy key; idx picks between variants (Twin Eels a/b). null = no sprite file.
// Sprite variants: an array of ids = variants. Index comes from e.sv (random per encounter, set in spawn() for
// enemies with randomSprite:1, seeded 'sprites' RNG stream) or else the instance index (e.g. twin eels A/B).
export function spriteCount(group,key){const id=ASSETS.sprites[group]&&ASSETS.sprites[group][key];return Array.isArray(id)?id.length:1}
export function spriteFor(group,key,idx=0){let id=ASSETS.sprites[group]&&ASSETS.sprites[group][key];if(Array.isArray(id))id=id[idx%id.length];const m=id&&SPRITES[id];return m?{id,...m}:null}
export {SPRITE_BASELINE};
// Remains for a sprite (spriteFor result) or null: {id,src,w,h}. The Knell's second phase (e.ph 2) falls as the cracked Leviathan Bell.
export function fallenFor(sp,e){let id=sp&&sp.id;if(id&&e&&e.key==='bell'&&e.ph===2)id='leviathan-bell';const d=id&&FALLEN[id];return d?{id,src:ASSETS.fallen[id],w:d[0],h:d[1]}:null}
// An icon from a group (hud / status) with an emoji fallback when the slot is empty or the file fails.
export function iconHTML(group,key,fallback,cls){const s=assetSrc(group,key);return s?`<img class="uic ${cls||''}" src="${s}" alt="" draggable="false" onerror="this.outerHTML='${fallback}'">`:fallback}
export function assetSrc(group,key){const a=assetEntry(group,key);return a?a.src:''}
export function assetFail(img){const s=img.parentNode;if(s)s.classList.remove('has-img','win');img.remove()}
// Every URL in the map (used to pre-cache art for offline play). Backgrounds: current act only (ui/env.js envURLs()).
export function assetURLs(){const out=Object.values(SPRITES).map(m=>m.f);for(const [gn,g] of Object.entries(ASSETS))for(const k in g){if(gn==='sprites')continue;const a=assetEntry(gn,k);if(!a)continue;out.push(a.src);if(a.srcset)a.srcset.split(',').forEach(s=>out.push(s.trim().split(/\s+/)[0]))}return [...new Set(out)].filter(u=>!/^(data:|blob:)/.test(u))}
// Renders an image slot with fallback placeholder. ph = placeholder inner HTML (emoji)
export function slotHTML(group,key,cls,ph){const a=assetEntry(group,key);
 const img=a?`<img src="${a.src}"${a.srcset?` srcset="${a.srcset}"`:''}${a.sizes?` sizes="${a.sizes}"`:''} alt="" draggable="false" decoding="async" style="object-fit:${a.fit}${a.pos?';object-position:'+a.pos:''}" onerror="assetFail(this)">`:'';
 return `<div class="slot ${cls||''} ${a?'has-img':''}${a&&a.win?' win':''}" data-asset="${group}.${key}"><div class="ph">${ph||''}</div>${img}</div>`}
// A UI icon <img> (intent icons etc.) with a text/emoji fallback if the file is missing.
export function uiIcon(key,fallback,cls){const s=assetSrc('ui',key);return s?`<img class="uic ${cls||''}" src="${s}" alt="" draggable="false" onerror="this.outerHTML='${fallback}'">`:fallback}
// Exposes textures as CSS custom properties (--tex-parchment, --tex-stone, ...) so CSS can use them.
// (URLs are made absolute: a relative url() inside a custom property resolves against the stylesheet that uses it.)
export function applyTextures(){const r=document.documentElement.style,abs=u=>`url("${new URL(u,document.baseURI).href}")`;
 for(const [k,v] of Object.entries(ASSETS.textures))r.setProperty('--tex-'+k,abs(v));
 for(const k of ['energy-orb-full','energy-orb-empty','end-turn','end-turn-pressed'])r.setProperty('--ui-'+k,abs(assetSrc('ui',k)))}

// ---------------------------------------------------------------------
// ENVIRONMENT BACKGROUNDS (design-v2.md §W.7): paths by convention, no per-file entries:
//   art/v2/bg/<id-kebab>-<layer>@2x.webp   (+ @3x for mid/ground/fg)   layers: sky far mid ground fg
// Data ids keep underscores (a1_shore); file names use the kebab form (a1-shore).
// Environment layer files + rects now come from design/environments.json (export.layers) via src/data/environments.js;
// see ui/env.js envFiles()/envURLs().

// Per-card paintings: art/v2/cards/cards.json ({id:{art,thumb,size}}), read at runtime so new deliveries need no code change.
// Thumbs (<id>-256.webp) in the hand / shop / grids; the full painting when a card is lifted or inspected. Missing ids -> class placeholder.
export const CARD_ART={};
export async function loadCardArt(){await loadCombatIconArt();try{const r=await fetch('art/v2/cards/cards.json',{cache:'no-cache'});if(!r.ok)return 0;const j=await r.json();
 for(const k in CARD_ART)delete CARD_ART[k];for(const [id,v] of Object.entries(j))if(v&&v.art)CARD_ART[id]={art:v.art,thumb:v.thumb||v.art};return Object.keys(CARD_ART).length}catch(e){return 0}}

// Class mechanic display (the 'dais' beside the hero): painted backplate per class, art/v2/ui/icons.json 'dais'. Null -> CSS placeholder.
export const DAIS_ART={};
// Runtime manifest allows painted replacements without rebuilding the generated icon module.
async function loadCombatIconArt(){try{const r=await fetch('art/v2/ui/icons.json',{cache:'no-cache'});if(!r.ok)return;const j=await r.json();
 for(const [k,id] of Object.entries(ST_ICON))if(j.status?.[id])ASSETS.status[k]=j.status[id];
 for(const [id,path] of Object.entries(j.intent||{}))if(path)ASSETS.ui[id]=path;
 for(const [id,path] of Object.entries(j.dais||{}))if(path)DAIS_ART[id]=path;
 }catch(e){/* Keep the existing art and bronze vector placeholders offline. */}
 applyHudArt()}
function applyHudArt(){for(const k of HUD_INTENTS)ASSETS.ui['intent-'+k]='art/v2/hud/intent-'+k+'.webp';Object.assign(ASSETS.status,ST_HUD)}
applyHudArt();
