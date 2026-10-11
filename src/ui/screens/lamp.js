// ui/screens/lamp.js: Lamplight screens. Level-up pick (choose 1 of 3), the Keeper's Ledger (what is lit and what is still dark),
// the end-of-run Lamplight summary, the title lighthouse and the Lamp chips. All state is in W.S; the profile lives in progress.js.
import {W} from '../../core/state.js';
import {CARDS,CLASSES,RELICS,POTIONS} from '../../core/registry.js';
import {ACT1_CARDS} from '../../data/act1.js';
import {LAMP_XP,CLIMB_XP,LAMP_PLAN,CLIMB_PLAN,CLASS_ORDER,LOCK_CARDS,LOCK_CLASS_RELICS,LOCK_SHARED_RELICS,LOCK_POTIONS} from '../../data/lamplight.js';
import {loadProfile,saveProfile,lampLevel,climbLevel,lampPending,climbPending,totalPending,barOf,offerFor,claim,lockedFor,firstLevel} from '../../progress.js';
import {slotHTML} from '../../assets.js';
import {TASKS,taskProgress} from '../../engine/lamplight.js';
import {emblemHTML,relicTile,potionTile,TILES,esc as tesc} from '../tiles.js';
import {render,cardHTML,TH} from '../render.js';
import {bgHTML,frameOpen,frameClose} from './frame.js';
import {deathLine} from '../../data/places.js';
import {LEDGER_STAGES,stageUnlockedLine,loreStage,loreTier,lamplightMeaning,menuLore,ghostSpots,MENU_LAYERS,DEATH_LINE} from '../../data/lore.js';
const RARN={s:'Starter',c:'Common',u:'Uncommon',r:'Rare',x:'Special'};
const esc=s=>String(s).replace(/"/g,'&quot;');
const TRACK_NAME=t=>t==='climb'?'Stair Climb':CLASSES[t].n+' Lamp';
const TRACK_LEVELS=t=>t==='climb'?CLIMB_XP.length:LAMP_XP.length;
// ---------- small tiles ----------
const TYPE_N={A:'Attack',S:'Skill',P:'Power',W:'Waypoint'};
export function itemTile(kind,id,o={}){
 if(kind==='card'){const d=CARDS[id];return `<div class="lp-pick${o.on?' on':''}${o.click?' live':''}"><div class="lp-cardwrap${o.on?' on':''}">${cardHTML({id,uid:-500-(o.i||0),up:false},{click:o.click})}</div><span class="tcap r-${d.r}">${RARN[d.r]} · ${TYPE_N[d.t]||''}</span></div>`}
 const d=kind==='relic'?RELICS[id]:POTIONS[id];if(!d)return '';
 const tag=kind==='relic'?(d.tierName||'Relic')+(d.cls?' · '+CLASSES[d.cls].n:''):RARN[d.rarity]+' potion'+(d.cls?' · '+CLASSES[d.cls].n:'');
 return (kind==='relic'?relicTile:potionTile)(id,{click:o.click,cls:'lp-tile'+(o.click?'':' static'),tag,on:o.on})}
// A locked card is a dark card back with a lock seal; locked relics / potions are shrouded silhouettes. Names stay hidden unless on offer.
const lockTile=(rarity,type,hint,name)=>`<div class="lp-lock r-${rarity}"><span class="lp-seal">${emblemHTML('lamp-lock-card','🔒','seal')}</span><b>${name||'???'}</b><i>${RARN[rarity]||''}${type?' · '+type:''}</i><span class="lp-hint">${hint}</span></div>`;
const lockItem=(kind,id,hint,name)=>{const d=kind==='relic'?RELICS[id]:POTIONS[id];return `<div class="lp-lock lp-li k-${kind}"><span class="lp-seal">${emblemHTML('lamp-lock-'+kind,'🔒','seal')}</span><b>${name?d.n:'???'}</b><i>${kind==='relic'?(d.tierName||'Relic'):RARN[d.rarity]+' potion'}</i><span class="lp-hint">${hint}</span></div>`};
// ---------- lantern track: one lantern per level, lit = reached, with the kind of reward each level holds ----------
const KIND_ICON={card:'🂠',relic:'💠',potion:'🧪',mixed:'✨',all:'🏮'};
export function planAt(track,lv){
 if(track==='climb'){const k=CLIMB_PLAN[lv-1].k;return {k:{relics:'relic',potions:'potion',mixed:'mixed',all:'all'}[k],label:{relics:'a relic',potions:'a potion',mixed:'a relic or a potion',all:'every lantern still dark'}[k]}}
 const q=LAMP_PLAN[lv-1];if(q.k==='cards')return {k:'card',label:q.pref==='r'?'a Rare card':q.pref==='u'?'an Uncommon card':'a card'};
 if(q.k==='shop')return {k:'relic',label:'a class relic or cards'};if(q.k==='rare')return {k:'relic',label:'a Rare class relic or cards'};return {k:'all',label:'every lantern still dark'}}
export function trackHTML(track,lvl){const N=TRACK_LEVELS(track);let h='';
 for(let i=1;i<=N;i++){const pl=planAt(track,i),lit=i<=lvl;
  h+=`<div class="lp-node${lit?' lit':''}${i===lvl+1?' next':''}" data-lv="${i}" data-info="${tesc(`Level ${i}: ${lit?'lit. ':''}unlocks ${pl.label}.`)}"><span class="lp-lan">${emblemHTML(lit?'lamp-lantern-lit':'lamp-lantern-dark','🏮','lan')}<span class="lp-rw k-${pl.k}">${emblemHTML('lamp-track-'+pl.k,KIND_ICON[pl.k],'pip')}</span></span><i class="lp-lvn">${i}</i></div>`}
 return `<div class="lp-track" id="lptrack">${h}</div>`}
// ---------- level-up pick ----------
export function openLampPick(track,ret){const p=loadProfile();if(!offerFor(p,track,CARDS))return;
 W.S={screen:'title',view:'lamp',track,ret:ret||(W.S&&W.S.screen==='end'?W.S:null),page:0,hero:null};render()}
export function lampChoose(id){const S=W.S;if(S.view!=='lamp'||S.got)return;const p=loadProfile(),got=claim(p,S.track,id,CARDS);if(!got)return;saveProfile(p);W.S={...S,got};render()}
export function lampNext(){const S=W.S,p=loadProfile();if(offerFor(p,S.track,CARDS)){W.S={...S,got:null};return render()}lampLeave()}
export function lampLeave(){const S=W.S;if(S.ret&&S.ret.screen==='end'){W.S=S.ret;return render()}W.S={screen:'title',view:S.from==='ledger'?'ledger':'main',tab:S.tab,page:0,hero:null};render()}
export function lampPickScr(){const S=W.S,p=loadProfile(),track=S.track,name=TRACK_NAME(track);
 const head=`<h2><span class="lp-hl">${emblemHTML('lamp-lantern-lit','🏮','lan')}</span>${name}</h2>`;
 if(S.got){const left=track==='climb'?climbPending(p):lampPending(p,track);
  return framedLamp('lamppick',head+`<div class="lp-sub">Lit and inked in the Ledger.</div><div class="lp-offer got">${S.got.map(i=>itemTile(i.kind,i.id,{})).join('')}</div>
  <div class="tb-actions"><button class="tb-btn pri" id="lampnext" onclick="lampNext()">${left>0&&offerFor(p,track,CARDS)?`Next unlock (${left})`:'Done'}</button></div>`)}
 const o=offerFor(p,track,CARDS);if(!o)return framedLamp('lamppick',head+`<div class="tb-none">Nothing is waiting.</div><div class="tb-actions"><button class="tb-btn pri" onclick="lampLeave()">Back</button></div>`);
 const left=track==='climb'?climbPending(p):lampPending(p,track);
 const sub=o.final?`Level ${o.level}: the ${track==='climb'?'whole stair':'Lamp'} blazes. Every lantern still dark is lit at once.`:`Level ${o.level}${left>1?` (${left} waiting)`:''}: a lantern is lit. Choose one. The others wait for the next level.`;
 return framedLamp('lamppick',head+`<div class="lp-sub">${sub}</div><div class="lp-offer${o.final?' final':''}">${o.items.map((i,n)=>itemTile(i.kind,i.id,{click:o.final?null:`lampChoose('${i.id}')`,i:n})).join('')}</div>
  <div class="tb-actions">${o.final?`<button class="tb-btn pri" id="lampall" onclick="lampChoose('*')">Light them all</button>`:''}<button class="tb-btn" id="lamplater" onclick="lampLeave()">Later</button></div>`)}
function framedLamp(id,body){const S=W.S;return `<div class="tb-scr tb-title tb-lampscr${S.track&&S.track!=='climb'?' theme-'+TH[S.track]:''}">${bgHTML()}<div class="tb-ov"><div class="tb-frame tb-lamp" id="${id}">${frameOpen()}${body}${frameClose()}</div></div></div>`}
// ---------- Keeper's Ledger ----------
export function openLedger(tab){W.S={screen:'title',view:'ledger',tab:tab||(W.S&&W.S.tab)||'tide',page:0,hero:null};render()}
export function ledgerTab(t){W.S={...W.S,tab:t};render()}
function barHTML(xp,table,cls=''){const b=barOf(xp,table);return `<div class="lp-bar ${cls}"><i style="width:${b.pct}%"></i></div>`}
export function ledgerScr(){const S=W.S,tab=S.tab||'tide',p=loadProfile(),lock=lockedFor(p);
 const tabs=[...CLASS_ORDER,'climb','pages'].map(t=>{const pend=t==='pages'?0:t==='climb'?climbPending(p):lampPending(p,t);return `<button class="tb-btn sm lp-tab${t===tab?' on':''}" data-tab="${t}" onclick="ledgerTab('${t}')">${t==='climb'?'Stair Climb':t==='pages'?'Pages':CLASSES[t].n}${pend?`<em>${pend}</em>`:''}</button>`}).join('');
 if(tab==='pages')return pagesScr(tabs,p);
 const climb=tab==='climb',xp=climb?p.climb:(p.xp[tab]||0),table=climb?CLIMB_XP:LAMP_XP,b=barOf(xp,table),pend=climb?climbPending(p):lampPending(p,tab);
 const offer=pend?offerFor(p,tab,CARDS):null,on=new Set(offer&&!offer.final?offer.items.map(i=>i.id):[]);
 const nx=b.max?null:planAt(tab,b.lvl+1);
 const info=`<div class="lp-head"><div class="lp-id">${emblemHTML(climb?'lamp-climb':'lamp-class-'+tab,climb?'🗼':CLASSES[tab].e,'pip')}<div class="lp-lv"><b>${climb?'Stair':'Lamp'} ${b.lvl}</b><span>/ ${table.length}</span></div></div>
  <div class="lp-mid">${trackHTML(tab,b.lvl)}<div class="lp-prog">${barHTML(xp,table)}<span class="lp-nxt">${b.max?'Fully lit · '+xp+' Lamplight':`${b.into} / ${b.span} to level ${b.lvl+1}: <b>${nx.label}</b>`}</span></div></div>
  ${pend?`<button class="tb-btn pri sm lp-claim" id="ledgerclaim" onclick="openLampPick('${tab}',null);W.S.from='ledger';W.S.tab='${tab}'">Choose unlock${pend>1?' ('+pend+')':''}</button>`:''}</div>`;
 let tiles='';
 if(!climb){const ids=(ACT1_CARDS[tab]||[]).filter(id=>CARDS[id]).sort((a,c)=>'scur'.indexOf(CARDS[a].r)-'scur'.indexOf(CARDS[c].r)||CARDS[a].n.localeCompare(CARDS[c].n));
  tiles=ids.map((id,i)=>{const d=CARDS[id];if(!lock.cards[id])return `<div class="lp-cardwrap">${cardHTML({id,uid:-700-i,up:false},{})}</div>`;
   const lv=firstLevel(tab,'card',id,CARDS);return lockTile(d.r,TYPE_N[d.t],on.has(id)?'On offer: choose it now':`A lantern waits. Lamp ${lv}+`,on.has(id)?d.n:null)}).join('');
  const R=LOCK_CLASS_RELICS[tab];tiles+=[R.shop,R.rare].map(id=>lock.relics[id]?lockItem('relic',id,on.has(id)?'On offer: choose it now':`A lantern waits. Lamp ${firstLevel(tab,'relic',id,CARDS)}`,on.has(id)):itemTile('relic',id)).join('')}
 else{tiles=[...LOCK_SHARED_RELICS.map(id=>[ 'relic',id]),...LOCK_POTIONS.map(id=>['potion',id])].map(([k,id])=>(k==='relic'?lock.relics[id]:lock.potions[id])?lockItem(k,id,on.has(id)?'On offer: choose it now':`A lantern waits. Stair ${firstLevel('climb',k,id,CARDS)}+`,on.has(id)):itemTile(k,id)).join('')}
 return `<div class="tb-scr tb-ledger${climb?'':' theme-'+TH[tab]}">${bgHTML()}<div class="tb-top"><button class="tb-btn sm" id="ledgerback" onclick="titleGo('main')">‹ Back</button><h2>Keeper's Ledger</h2><span class="tb-sp"></span></div>
  <div class="lp-tabs">${tabs}</div>${info}<div class="lp-grid" id="ledgergrid">${tiles}</div></div>`}
// ---------- the Keeper's Ledger pages: eight reveal stages, one per lit window (design/lore/LORE-BIBLE.md §14.2) ----------
const pageHTML=(st,got)=>got
 ?`<article class="lp-page${st.cut?' cut':''}${st.twist?' deep':''}" data-stage="${st.n}">${st.cut?'<i class="lp-stub" aria-hidden="true"></i>':''}<span class="lp-pn">${st.n}</span><h3>${st.title}</h3>${st.lines.map(l=>`<p>${l}</p>`).join('')}</article>`
 :`<article class="lp-page sealed${st.twist?' deep':''}" data-stage="${st.n}"><span class="lp-pn">${st.n}</span><h3>${emblemHTML('lore-page-sealed','🕯️','pip')} ???</h3><p class="lp-hint">${stageUnlockedLine(st)} Stair Climb ${st.n}.</p></article>`;
function pagesScr(tabs,p){const stage=loreStage(p),tier=loreTier(p);
 return `<div class="tb-scr tb-ledger">${bgHTML()}<div class="tb-top"><button class="tb-btn sm" id="ledgerback" onclick="titleGo('main')">‹ Back</button><h2>Keeper's Ledger</h2><span class="tb-sp"></span></div>
  <div class="lp-tabs">${tabs}</div><div class="lp-pagehead"><i>${lamplightMeaning(tier)}</i><span>${stage} of ${LEDGER_STAGES.length} pages found</span></div>
  <div class="lp-pages" id="ledgerpages">${LEDGER_STAGES.map(st=>pageHTML(st,st.n<=stage)).join('')}</div></div>`}
// ---------- end-of-run summary ----------
export function lampSummaryHTML(sum){if(!sum)return '';const K=CLASSES[sum.cls],{lampBar:lb,climbBar:cb}=sum;
 const bar=(label,from,to,emb,emo)=>{const up=to.lvl>from.lvl;return `<div class="lp-row${up?' up':''}"><span class="lp-med">${emblemHTML(emb,emo,'pip')}<b>${to.lvl}</b></span><div class="lp-rb"><span class="lp-rl">${label}${up?` <em class="lvup">level up!</em>`:''}</span><div class="lp-bar anim" style="--from:${from.pct}%;--to:${up?100:to.pct}%"><i></i></div></div></div>`};
 let n=0;
 return `<div class="lp-sum"><div class="lp-banner">${emblemHTML(sum.won?'lamp-banner-win':'lamp-banner-lose',sum.won?'🏮':'🕯️','strip')}<div class="lp-bt"><h3>🏮 Lamplight</h3><div class="lp-story">${sum.won?'The lamp room answers.':`${deathLine(sum.floor,sum.boss)} ${DEATH_LINE}`}</div></div></div>
  <table class="lp-lines">${sum.lines.map(l=>`<tr style="--i:${n++}"><td>${l.label}</td><td>+${l.pts}</td></tr>`).join('')}${sum.mults.map(m=>`<tr class="mul" style="--i:${n++}"><td>${m.label}</td><td>×${+m.x.toFixed(2)}</td></tr>`).join('')}<tr class="tot" style="--i:${n++}"><td>Total</td><td class="lp-count" style="--v:${sum.total}">+<b>${sum.total}</b></td></tr></table>
  ${bar(K.n+' Lamp',lb.from,lb.to,'lamp-class-'+sum.cls,K.e)}${bar('Stair Climb',cb.from,cb.to,'lamp-climb','🗼')}
  <div class="lp-tasks">${sum.tasks.map(t=>`<span class="lp-tsk${t.done?' ok':''}">${emblemHTML(t.done?'lamp-task-lit':'lamp-task-dark',t.done?'🏮':'🕯️','pip')}${t.done?'✔':'○'} ${t.n}</span>`).join('')}</div>
  <div class="lp-btns">${sum.lampPending?`<button class="btn pri" id="lampclaim" onclick="openLampPick('${sum.cls}')">${K.n} Lamp: choose unlock${sum.lampPending>1?' ('+sum.lampPending+')':''}</button>`:''}${sum.climbPending?`<button class="btn pri" id="climbclaim" onclick="openLampPick('climb')">Stair Climb: choose unlock${sum.climbPending>1?' ('+sum.climbPending+')':''}</button>`:''}</div></div>`}
// ---------- Lantern Tasks overlay (opened from the 🏮 button): one illustrated card per task, with progress ----------
export function tasksHTML(){const L=W.run&&W.run.lamp;if(!L)return '';
 const card=t=>{const T=TASKS[t.id],pr=!t.done&&taskProgress(t.id),who=T.cls==='any'?'Any climb':CLASSES[T.cls].n;
  return `<div class="lp-task tile sp cat-dusk static${t.done?' done lit':''}" data-task="${t.id}"><span class="tart">${emblemHTML(t.done?'lamp-task-lit':'lamp-task-dark',t.done?'🏮':'🕯️')}</span><i class="tglow"></i><span class="tsig" data-info="${tesc(who)}">${emblemHTML('lamp-class-'+T.cls,T.cls==='any'?'🧭':CLASSES[T.cls].e,'sig')}</span><span class="tname">${who}</span><span class="tsum">${T.n}</span>
  ${pr?`<span class="lp-pg"><i style="width:${Math.round(pr[0]/pr[1]*100)}%"></i><em>${pr[0]} / ${pr[1]}</em></span>`:`<span class="lp-st">${t.done?'✔ Lit · +15':'Unlit'}</span>`}</div>`};
 return `<div class="ov" id="ovl" onclick="W.S.ov=null;render()"><div class="box tilebox lp-taskbox"><h2>🏮 Lantern Tasks</h2><div class="muted csub">Optional. Each lantern lit is +15 Lamplight when the run ends. Missing them costs nothing.</div>
 <div class="tiles lp-tasktiles" style="--n:${L.tasks.length}">${L.tasks.map(card).join('')}</div><button class="btn full">Close</button></div></div>`}
export const lampBtnLabel=()=>{const L=W.run&&W.run.lamp;return L?L.tasks.filter(t=>t.done).length+'/'+L.tasks.length:''};
// ---------- title lighthouse + layered menu scene (design/lore/LORE-BIBLE.md §17.4) ----------
// Everything here is a CSS / SVG placeholder over named art slots (MENU_LAYERS in data/lore.js, listed in tools/make-tiles-manifest.cjs):
// when a painted file for a slot exists it is drawn on top of its placeholder, with no code change.
const slotImg=id=>{const t=TILES[id];return t&&t.ready?`<img class="ml-art" src="${t.path}" alt="" draggable="false" onerror="this.remove()">`:''};
const layer=(id,cls='')=>`<div class="ml-layer ${cls}" data-slot="${id}">${slotImg(id)}</div>`;
export function lighthouseHTML(over){const p=loadProfile(),M=menuLore(p,over),n=M.windows,dark=M.ending==='lens';
 const ys=[250,226,202,178,154,130,106,82],xo=[-2,2,-2,2,-2,3.5,-4,5];
 // windows 1-5 are warm and ordinary; 6-8 drift off the grid and pale: by the last window the tower no longer reads as a lighthouse
 const win=ys.map((y,i)=>`<rect class="${i<n&&!dark?'lit':''}${i>=5?' odd':''}" x="${46+xo[i]}" y="${y}" width="8" height="12" rx="4"/>`).join('');
 const full=M.lamp&&!dark;
 return `<div class="lp-tower${full?' blaze':''}${dark?' dark':''}" id="lighthouse" title="Stair Climb ${n}/${CLIMB_XP.length}" aria-label="The Pale Lighthouse: ${n} of ${CLIMB_XP.length} windows lit" data-windows="${n}" data-ring="${M.ring?1:0}" data-line="${M.line?1:0}"><svg viewBox="0 0 100 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <defs><linearGradient id="lpbody" x1="0" x2="1"><stop offset="0" stop-color="#1b232d"/><stop offset=".55" stop-color="#2d3844"/><stop offset="1" stop-color="#141a22"/></linearGradient></defs>
  ${M.ring?'<ellipse class="ml-ring" cx="50" cy="296" rx="58" ry="9"/><ellipse class="ml-ring in" cx="50" cy="296" rx="38" ry="5.5"/>':''}
  ${full?'<polygon class="beam" points="50,46 -60,20 -60,70"/><polygon class="beam" points="50,46 160,20 160,70"/>':''}
  <path d="M28 296 L40 70 H60 L72 296 Z" fill="url(#lpbody)" stroke="#05070b" stroke-width="1.2"/><path d="M36 70 H64 L68 62 H32 Z" fill="#3a4654" stroke="#05070b"/>
  <rect class="lamproom${full?' lit':dark?'':' glint'}" x="39" y="42" width="22" height="20" rx="2"/><path d="M36 42 L50 26 L64 42 Z" fill="#232c37" stroke="#05070b"/><rect x="48.5" y="16" width="3" height="11" fill="#232c37"/>${win}
  ${M.line?'<line class="ml-pale" x1="50" y1="50" x2="50" y2="302"/>':''}</svg>${slotImg('menu-lighthouse')}${M.ring?`<div class="ml-layer ml-ringart" data-slot="menu-ring">${slotImg('menu-ring')}</div>`:''}${M.line?`<div class="ml-layer ml-lineart" data-slot="menu-line">${slotImg('menu-line')}</div>`:''}
  <span class="lp-cap">Stair ${n}/${CLIMB_XP.length}</span></div>`}
// The whole title backdrop above the sea: sky / ending layers, the tower, and the ghost lanterns on the foreground steps.
export function menuSceneHTML(over){const p=loadProfile(),M=menuLore(p,over),g=TILES['menu-ghost'];
 const ghosts=ghostSpots(M.ghosts).map(s=>`<i class="ml-gl r${s.row}" style="left:${s.x}%;--s:${s.s};--d:${s.d}s">${g&&g.ready?`<img class="ml-art" src="${g.path}" alt="" draggable="false" onerror="this.remove()">`:''}</i>`).join('');
 return `<div class="ml-scene ml-end-${M.ending||'none'}" id="menuscene" data-stage="${M.stage}" data-tier="${M.tier}" data-ghosts="${M.ghosts}" data-windows="${M.windows}" data-ring="${M.ring?1:0}" data-line="${M.line?1:0}" data-ending="${M.ending}" aria-hidden="true">
  ${layer('menu-sky','ml-sky')}${layer('menu-sea','ml-sea')}
  ${M.ending==='lens'?layer('menu-stars','ml-stars'):''}${M.ending==='light'?layer('menu-dawn-light','ml-dawn')+layer('menu-shape','ml-shape'):''}${M.ending==='cut'?layer('menu-dawn-cut','ml-dawn cut'):''}
  ${lighthouseHTML(over)}
  <div class="ml-steps">${layer('menu-steps','ml-stepart')}${ghosts}</div></div>`}
export const lampChip=cls=>{const p=loadProfile();const l=lampLevel(p,cls),pend=lampPending(p,cls);return `<span class="lp-chip" data-lamp="${cls}"><svg class="lp-lamp-icon" viewBox="0 0 32 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 24H24M17 20V24M8 10Q16 6 25 10L23 17Q18 23 11 17Z M9 11Q1 5 3 13Q4 17 11 16M24 11L30 7Q30 13 23 15M12 8L17 3L21 8M17 3V1"/><path d="M12 11Q17 8 22 11L20 16H14Z" fill="currentColor" opacity=".4"/></svg>Lamp ${l}${pend?'<em>●</em>':''}</span>`};
export {totalPending};
