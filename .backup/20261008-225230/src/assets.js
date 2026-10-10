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
const V='art/v2/';
const win=(f,pos)=>({src:V+'enemies/'+f+'.webp',srcset:`${V}enemies/${f}-256.webp 256w, ${V}enemies/${f}.webp 768w`,sizes:'(max-height:500px) 140px, 260px',fit:'cover',pos:pos||'50% 45%',win:true});
const ui=k=>V+'ui/'+k+'.webp';
export const ASSETS={
 frames:{tide:[V+'frames/frame-tidecaller@1x.webp',V+'frames/frame-tidecaller.webp'],echo:[V+'frames/frame-echo-mage@1x.webp',V+'frames/frame-echo-mage.webp'],
  carto:[V+'frames/frame-cartographer@1x.webp',V+'frames/frame-cartographer.webp'],duel:[V+'frames/frame-duelist@1x.webp',V+'frames/frame-duelist.webp']},
 portraits:Object.fromEntries([['tide','tidecaller'],['echo','echo-mage'],['carto','cartographer'],['duel','duelist']].map(([k,f])=>[k,{src:V+'portraits/'+f+'.webp',srcset:`${V}portraits/${f}-256.webp 256w, ${V}portraits/${f}.webp 768w`,sizes:'(max-height:500px) 120px, 240px',pos:'50% 30%'}])),
 // Cut-out sprites exist for three classes; the Duelist has no cut-out yet, so it uses its painted portrait as a window.
 figures:{tide:V+'sprites/tidecaller.webp',echo:V+'sprites/echo-mage.webp',carto:V+'sprites/cartographer.webp',
  duel:{src:V+'portraits/duelist.webp',srcset:`${V}portraits/duelist-256.webp 256w, ${V}portraits/duelist.webp 768w`,sizes:'(max-height:500px) 140px, 260px',fit:'cover',pos:'50% 35%',win:true}},
 enemies:{slug:win('brine-slug'),gull:win('gull-thief','50% 35%'),knight:win('rust-knight','50% 35%'),pod:win('spore-pod'),wisp:win('glimmer-wisp','50% 40%'),
  crab:win('coral-crab','50% 55%'),captain:win('drowned-captain','50% 30%'),warden:win('mirror-warden','50% 35%'),eel:win('twin-eels'),
  // No final v2 export for the Bell yet: uses the Artist's v2 source painting (art/v2/_src). Swap when exported.
  bell:{src:V+'_src/leviathan-bell_s11.png',fit:'cover',pos:'50% 45%',win:true}},
 cards:{},
 relics:{},
 potions:{},
 ui:{'intent-attack':ui('intent-attack'),'intent-attack-debuff':ui('intent-attack-debuff'),'intent-buff':ui('intent-buff'),'intent-debuff':ui('intent-debuff'),
  'intent-defend':ui('intent-defend'),'intent-unknown':ui('intent-unknown'),'energy-orb-full':ui('energy-orb-full'),'energy-orb-empty':ui('energy-orb-empty'),
  'end-turn':ui('end-turn'),'end-turn-pressed':ui('end-turn-pressed'),
  'node-fight':ui('node-combat'),'node-elite':ui('node-elite'),'node-rest':ui('node-rest'),'node-shop':ui('node-shop'),'node-event':ui('node-event'),'node-treasure':ui('node-treasure'),'node-boss':ui('node-boss')},
 textures:{parchment:V+'textures/parchment.webp','parchment-dark':V+'textures/parchment-dark.webp',stone:V+'textures/stone-panel.webp',leather:V+'textures/leather-panel.webp'}
};
const FIT_DEFAULT={cards:'cover',portraits:'cover',figures:'contain',enemies:'contain',ui:'contain'};
export function assetEntry(group,key){const g=ASSETS[group];let v=g&&g[key];if(!v&&group==='figures')return assetEntry('portraits',key);if(!v)return null;
 if(typeof v==='string')v={src:v};else if(Array.isArray(v))v={src:v[0],srcset:v.map((s,i)=>`${s} ${i+1}x`).join(', ')};
 return {src:v.src,srcset:v.srcset||'',sizes:v.sizes||'',fit:v.fit||FIT_DEFAULT[group]||'cover',pos:v.pos,win:!!v.win}}
export function assetSrc(group,key){const a=assetEntry(group,key);return a?a.src:''}
export function assetFail(img){const s=img.parentNode;if(s)s.classList.remove('has-img','win');img.remove()}
// Every URL in the map (used to pre-cache art for offline play). Backgrounds: current act only (ui/env.js envURLs()).
export function assetURLs(){const out=[];for(const [gn,g] of Object.entries(ASSETS))for(const k in g){const a=assetEntry(gn,k);if(!a)continue;out.push(a.src);if(a.srcset)a.srcset.split(',').forEach(s=>out.push(s.trim().split(/\s+/)[0]))}return [...new Set(out)].filter(u=>!/^(data:|blob:)/.test(u))}
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
