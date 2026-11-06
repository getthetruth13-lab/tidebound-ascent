// ui/tiles.js: illustrated choice tiles. Every menu that offers a choice (rewards, camp, events, combat choices, potion picks,
// Lamplight unlocks) shows large tiles side by side: art slot + name plate + one-line summary; hover / long-press
// shows the full explanation. Art slots come from art/v2/ui/tiles.json (stable id -> file path). While a file is missing the
// slot draws a themed placeholder emblem, so real art drops in later without code changes (tools/make-tiles-manifest.cjs).
import {CARDS,RELICS,POTIONS} from '../core/registry.js';
import {slotHTML} from '../assets.js';
import {cardHTML} from './render.js';
import {CORE} from '../engine/combat.js';
export const TILES={};
export async function loadTiles(){try{const r=await fetch('art/v2/ui/tiles.json',{cache:'no-cache'});if(!r.ok)return 0;const j=await r.json();
 for(const k in TILES)delete TILES[k];for(const [id,v] of Object.entries(j.tiles||{}))if(v&&v.path)TILES[id]=v;return Object.keys(TILES).filter(k=>TILES[k].ready).length}catch(e){return 0}}
export const tileUrls=()=>Object.values(TILES).filter(t=>t.ready).map(t=>t.path);
export const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
// A framed emblem: the real file when ready, otherwise a themed placeholder (framed silhouette + emoji).
export function emblemHTML(id,emoji,cls=''){const t=id&&TILES[id];const img=t&&t.ready?`<img src="${t.path}" alt="" draggable="false" onerror="this.remove()">`:'';
 return `<span class="emb ${cls}${img?' has-img':''}" data-tile="${id||''}"><b class="ph">${emoji||'◈'}</b>${img}</span>`}
// Task 30 (A3 scene plates): every tile is a full-bleed scene plate. The art slot fills the tile; while no painting exists a category
// gradient + the big glyph stands in. Shared carved-stone frame, lantern glow and engraved name plate come from css/tiles.css.
const CAT=[[/gold|coin/,'gold'],[/blood|fight|curse|destroy|boss/,'blood'],[/heal|mend|cook|spring|potion/,'heal'],[/upgrade|temper|anvil|scour/,'forge'],
 [/card|annotate|transform|cartomancer|mirror|loom/,'card'],[/relic|offering|gift/,'relic'],[/tide|moon|surge|recede|wheel|trawl|undertow/,'tide'],[/leave|back|other|stranger|sailor/,'dusk']];
export const catOf=(id,cls)=>{const k=(id||'')+' '+(cls||'');for(const [re,c] of CAT)if(re.test(k))return c;return 'dusk'};
// Tiny live Tide gauge for Moon Shell / Moonpull / Moon Draught tiles (3 / 5 / 7 ...). Number drawn by code, never painted.
export const miniGauge=v=>`<span class="mg" aria-hidden="true"><i class="mg-tube"><i class="mg-w" style="height:${Math.max(0,Math.min(10,v))*10}%"></i><i class="mg-t" style="bottom:${CORE.tide.low*10}%"></i><i class="mg-t" style="bottom:${CORE.tide.high*10}%"></i></i><span class="mg-r"><b class="mg-n">${v}</b><em class="mg-l">${v>=CORE.tide.high?'High':v<=CORE.tide.low?'Low':'Mid'}</em></span></span>`;
// One illustrated tile. o: {id,emoji,art,name,sum,info,click,disabled,on,done,cls,tag,over}. art = ready-made inner HTML (relic / potion icons).
// o.over = extra overlay HTML (mini gauge, sigil). Relic / potion art sits on a painted ledge (cls k-relic / k-potion).
export function tileHTML(o){const info=o.info?esc(o.info):'';const cat=catOf(o.id,o.cls);
 const itemKind=o.art&&/\bk-(relic|potion)\b/.exec(o.cls||'');
 // Relic / potion tiles: the painted pedestal scene (reward-relic / reward-potion) fills the art area, and the item's own painted icon
 // stands on it, large and centred, as an in-flow block that takes all the room above the name plate (so it can never shrink to a
 // corner or leave a black void). The full 256px icon is used (the 64px HUD file is the fallback).
 const big=itemKind?o.art.replace(/src="([^"]+)-64\.webp"/,'src="$1.webp" data-sm="$1-64.webp"').replace(/onerror="assetFail\(this\)"/,`onerror="if(this.dataset.sm){this.src=this.dataset.sm;this.dataset.sm=''}else assetFail(this)"`):'';
 const art=itemKind?emblemHTML('reward-'+itemKind[1],''):o.art||emblemHTML(o.id,o.emoji);
 return `<button ${o.eid?`id="${o.eid}" `:''}class="tile sp cat-${cat} ${o.cls||''}${o.on?' on':''}${o.done?' done':''}" ${o.click&&!o.disabled?`onclick="${o.click}"`:''} ${o.disabled?'disabled':''} ${info?`data-info="${info}"`:''}${o.tid?` data-tid="${esc(o.tid)}"`:''}>
 <span class="tart">${art}</span><i class="tglow"></i>${o.over||''}${o.tag?`<i class="ttag">${o.tag}</i>`:''}${itemKind?`<span class="ticon">${big}</span>`:''}<span class="tname">${o.name}</span><span class="tsum">${o.sum||''}</span>${o.done?'<span class="tck">✔</span>':''}</button>`}
export const tilesRow=(tiles,cls='')=>`<div class="tiles ${cls}${tiles.length>4?' many':''}" style="--n:${tiles.length}">${tiles.join('')}</div>`;
// ---- label parsing for text options ("🎲 Spin the wheel (roll 1d6)", "🌙 Moon Shell: Tide 5") ----
const EMO=/^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*/u;
export function splitLabel(l){l=String(l||'').replace(/<[^>]+>/g,'').trim();let emoji='';const m=EMO.exec(l);if(m){emoji=m[1];l=l.slice(m[0].length)}
 let name=l,sum='';let k=l.indexOf(': ');
 if(k>0&&k<=34){name=l.slice(0,k);sum=l.slice(k+2)}
 else{const p=/^(.*?)\s*\((.+)\)\s*$/.exec(l);if(p&&p[1]){name=p[1];sum=p[2]}else if(l.length>30){const c=l.search(/[,;] |\. /);if(c>6){name=l.slice(0,c);sum=l.slice(c+2)}}}
 return {emoji,name:name.replace(/[.:]$/,''),sum}}
const OPT_ICON=[[/🚶|↩|🔙|⬅/,'leave'],[/🩸/,'blood'],[/💰|🪙|💎/,'gold'],[/🎲/,'gamble'],[/⬆|⚒|🔨/,'upgrade'],[/🔀|🫧/,'transform'],[/🃏|🂠/,'card'],[/⚔|🗡|💥|🦀/,'fight'],[/❤|💧|💚|🍲|🩹/,'heal'],[/🎁|🌊/,'gift'],[/💠|🔮|🧿/,'relic'],[/🧪|🫙|🍺/,'potion'],[/💀|☠|🕸|👿/,'curse'],[/✂|🗑/,'remove']];
export const optIconId=emoji=>{for(const [re,id] of OPT_ICON)if(re.test(emoji))return 'opt-'+id;return 'opt-other'};
let byName=null;
function names(){if(byName)return byName;byName={card:new Map(),relic:new Map(),potion:new Map()};
 for(const c of Object.values(CARDS))if(!c.curse&&c.cls!=='status')byName.card.set(c.n,c.id);for(const r of Object.values(RELICS))byName.relic.set(r.n,r.id);for(const p of Object.values(POTIONS))byName.potion.set(p.n,p.id);return byName}
export function relicTile(id,o={}){const d=RELICS[id];return tileHTML({art:slotHTML('relics',id,'tslot',d.e),name:d.n,sum:o.sum||d.d,info:`${d.n}: ${d.d}`,tag:o.tag||d.tierName||'Relic',cls:'k-relic '+(o.cls||''),click:o.click,disabled:o.disabled,on:o.on,done:o.done})}
export function potionTile(id,o={}){const d=POTIONS[id];return tileHTML({art:slotHTML('potions',id,'tslot',d.e),name:d.n,sum:o.sum||d.d,info:`${d.n}: ${d.d}`,tag:o.tag||'Potion',cls:'k-potion '+(o.cls||''),click:o.click,disabled:o.disabled,on:o.on,done:o.done})}
// A choice option -> HTML. A real card (o.card, or a label that is exactly a card / relic / potion name) is rendered as itself;
// anything else becomes an illustrated tile with art id o.tile (or one picked from the emoji), name plate and summary.
export function optionHTML(o,click,extra={}){const label=typeof o.l==='function'?o.l():o.l;const dis=extra.disabled;
 if(o.card&&CARDS[o.card.id])return `<div class="tcard opt${dis?' off':''}">${cardHTML({uid:-300-(extra.i||0),up:false,...o.card},{click:dis?null:click})}${o.cap?`<span class="tcap">${o.cap}</span>`:''}</div>`;
 const sp=splitLabel(label),nm=sp.name.replace(/\+$/,''),N=names();
 if(!o.tile&&sp.emoji!==undefined){const cid=N.card.get(nm);if(cid&&!sp.sum)return `<div class="tcard opt${dis?' off':''}">${cardHTML({id:cid,uid:-300-(extra.i||0),up:/\+$/.test(sp.name)},{click:dis?null:click})}</div>`;
  const rid=N.relic.get(nm);if(rid)return relicTile(rid,{click:dis?null:click,disabled:dis,sum:sp.sum||undefined});
  const pid=N.potion.get(nm);if(pid)return potionTile(pid,{click:dis?null:click,disabled:dis,sum:sp.sum||undefined})}
 const tv=/^choice-(tide|moonpull)/.test(o.tile||'')?/Tide (\d+)/.exec(label):null;
 return tileHTML({over:tv?miniGauge(+tv[1]):'',id:o.tile||optIconId(sp.emoji),emoji:sp.emoji||'◈',name:sp.name||label,sum:o.sum||sp.sum||(/^(leave|back|skip)/i.test(sp.name)?'Walk on.':''),info:o.info||((o.sum||sp.sum)?`${sp.name}: ${o.sum||sp.sum}`:''),click,disabled:dis,cls:'opt '+(o.cls||''),tag:o.tag})}
// ---- fit long tile titles inside the frame (v0.6.5): wrap at word breaks, then shrink until the longest word fits ----
export function fitTileNames(root=document){for(const el of root.querySelectorAll('.tile .tname')){if(!el.isConnected||!el.offsetWidth)continue;el.style.fontSize='';el.classList.remove('fit');
 const tile=el.closest('.tile');const max=()=>Math.min(el.parentElement.clientWidth,tile?tile.clientWidth:1e9);
 let fs=parseFloat(getComputedStyle(el).fontSize),n=0;const over=()=>el.scrollWidth>el.clientWidth+1||el.offsetWidth>max()+1||el.scrollHeight>fs*2.6;
 if(!over())continue;el.classList.add('fit');while(over()&&fs>7&&n++<20){fs-=0.5;el.style.fontSize=fs+'px'}}
 fitTileSums(root)}
// Tile summaries never end in a clipped line: when the text needs more lines than the tile allows, shrink it until it all shows.
export function fitTileSums(root=document){for(const el of root.querySelectorAll('.tile.sp .tsum')){if(!el.isConnected||!el.offsetWidth||!el.textContent)continue;el.style.fontSize='';
 let fs=parseFloat(getComputedStyle(el).fontSize),n=0;const over=()=>el.scrollHeight>el.clientHeight+1;while(over()&&fs>8&&n++<24){fs-=0.5;el.style.fontSize=fs+'px'}}}
if(typeof window!=='undefined'&&typeof MutationObserver!=='undefined'){let q=0;const run=()=>{q=0;try{fitTileNames()}catch{}};
 const go=()=>new MutationObserver(()=>{if(!q)q=requestAnimationFrame(run)}).observe(document.body,{childList:true,subtree:true});
 if(document.body)go();else addEventListener('DOMContentLoaded',go);addEventListener('resize',()=>{if(!q)q=requestAnimationFrame(run)})}
