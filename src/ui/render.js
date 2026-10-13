import {showOutcome,clearOutcome} from './outcome.js';
import {intentIcon} from './intent-icons.js';
import {intentParts,intentSentence} from './intent-fx.js';
import {daisHTML} from './classdais.js';
import {placeDetail} from './place.js';
// ui/render.js — all screens as HTML strings. Inline handlers call the globals main.js exposes.
// Player-facing terminology follows design-v2 §0.3 (Guard, Might, Soaked, Exposed, Sink).
import {barHTML,statusRowHTML,playerStates} from './combatant.js';
import {CARD_ART,assetEntry,assetSrc,slotHTML,uiIcon,spriteFor,iconHTML,SPRITE_BASELINE} from '../assets.js';
import {syncAudio} from '../audio.js';
import {syncEnv,envFxSettingLabel} from './env.js';
import {FEET,figureScale,stageAtmosphereHTML,syncStage} from './stage.js';
import {deathLine} from '../data/places.js';
import {CARDS,CLASSES,TYPEN,RELICS,POTIONS,CHARMS,EN,KW,ENV} from '../core/registry.js';
import {loadRunData,settings,saveSettings,savedAction} from '../save.js';
import {loadProfile,saveProfile} from '../progress.js';
import {W} from '../core/state.js';
import {T,SPEEDS,SPEED_LABEL,setAnimSpeedValue,setEnemyPace,enemyPace} from '../core/timing.js';
import {heroPlateHTML} from './hero-plate.js';
import {heroHook} from './herohooks.js';
export {toggleHitLog} from './hero-plate.js';
import {cname,cost,desc,kwFor,kwList,needsTarget,isUp,baseCost,costSurcharge} from '../engine/cards.js';
import {alive,canPlay,curTgt,eAtk,intentOf,echoPlan,echoPreview,canMark,fbLabel,markBonus,releaseBank,flourishMin,flourishMult,hasRelic,CORE,canDrink,potionNeedsTarget,expCount} from '../engine/combat.js';
import {mod} from '../core/bus.js';
import {campOptions,scrubPrice,reachable,bootsLeft,cardOdds} from '../engine/run.js';
import {anim,syncCombatAnimations} from './fx.js';
import {screenChange,motionEnabled} from './anim.js';
import {drag} from './input.js';
import {mapHTML} from './map.js';
import './screens/frame.js';
import {titleScr} from './screens/title.js';
import {decorateKeywords,shortText} from './kwtip.js';
import {eventSceneHTML} from './eventscene.js';
import {decorateCardRefs} from './cardref.js';
import {tileHTML,tilesRow,relicTile,potionTile,optionHTML,emblemHTML,splitLabel,esc as tesc} from './tiles.js';
import {pkScreen,pkBtn} from './pk.js';
import {glyph,stripEmoji} from './glyphs.js';
import {lampSummaryHTML,tasksHTML,lampBtnLabel} from './screens/lamp.js';
import {relicFlavour,ferrymanLine,bellCount,wrenLine,WREN_SIDE,currentTier,ENEMY_FLAVOUR,BOSS_DEFEAT} from '../data/lore.js';
export const TH={tide:'tidecaller',echo:'echo-mage',carto:'cartographer',duel:'duelist',status:'',curse:'',colorless:''};
const RARN={s:'Starter',c:'Common',u:'Uncommon',r:'Rare',x:'Special'};
const esc=s=>String(s).replace(/"/g,'&quot;');
const lbl=o=>typeof o.l==='function'?o.l():o.l;
// ---------------- cards ----------------
// Card art window: per-card art when it exists, else the class card painting cropped 4:3 (never an emoji).
function cardArtHTML(id,d,full){if(assetEntry('cards',id))return slotHTML('cards',id,'art','');const P=CARD_ART[id];
 if(P)return `<div class="slot art has-img ph-art painted" data-asset="cardArt.${id}"><img src="${full?P.art:P.thumb}" alt="" draggable="false" decoding="async" onerror="this.remove()"></div>`;const k=d.curse?'curse':d.cls==='status'?'status':TH[d.cls]?d.cls:'colorless';
 const a=assetEntry('cardPH',k);return `<div class="slot art has-img ph-art" data-asset="cardPH.${k}"><img src="${a.src}" srcset="${a.srcset}" sizes="${a.sizes}" alt="" draggable="false" decoding="async" onerror="this.remove()"></div>`}
// Fixed card typography (StS style): one title size and one rules size on the 200x280 print, which scales as one unit.
// fitCards() only condenses long titles (letter-spacing, then a slight horizontal squeeze) and allows one step down for the longest rules.
export const CARD_TYPE={name:14,nameLsMin:-.03,nameSqMin:.85,text:13,textStep:11.6};
const nameFit=()=>CARD_TYPE.name/2;
export const textFit=()=>CARD_TYPE.text/2;
// Collector line: "DS 042/173" = set mark + stable number among all cards (registry order) / total.
const SETMARK={tide:'TC',echo:'EM',carto:'CA',duel:'DU'};let setIdx=null;
function setNo(id){if(!setIdx){setIdx={};Object.keys(CARDS).forEach((k,i)=>setIdx[k]=i+1);setIdx._n=Object.keys(CARDS).length}const p=n=>String(n).padStart(3,'0');return `DS ${p(setIdx[id]||0)}/${p(setIdx._n)}`}
export function isNewCard(id){try{return !loadProfile().seen.card[id]&&!(W.run&&W.run.deck.some(c=>c.id===id))}catch(_){return false}}
export function markCardsSeen(ids){try{const p=loadProfile();for(const id of ids)p.seen.card[id]=1;saveProfile(p)}catch(_){}}
export function cardBackHTML(){return `<div class="cardback"><svg class="cbem" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="#cfd8e6" stroke-width="1" opacity=".7"/><path d="M20 6v18M16 24h8M17 12h6M5 28c4-4 7-4 10 0s6 4 10 0 7-4 10 0" fill="none" stroke="#f2c14e" stroke-width="1.6" stroke-linecap="round"/><path d="M13 34h14" stroke="#cfd8e6" stroke-width="1.4" stroke-linecap="round"/></svg></div>`}
// Cost gem. A named surcharge (Barnacled) keeps the normal number and adds a painted "+1" badge that says why when held/hovered.
function costGem(ci,d,c,base){if(d.unplay)return '<span class="cost"></span>';if(d.c==='X')return '<span class="cost">X</span>';
 const sc=costSurcharge(ci),n=sc.reduce((a,x)=>a+x.n,0),shown=c-n,why=sc.map(x=>x.why).join(' ');
 return `<span class="cost${shown<base?' cheap':shown>base?' dear':''}${n?' surch':''}">${shown}</span>${n?`<i class="costplus" data-kw="Cost" data-sname="+${n} cost" data-sinfo="${esc(why)}" title="${esc(why)}" aria-label="${esc(why)}">+${n}</i>`:''}`}
export function cardHTML(ci,o={}){const d=CARDS[ci.id];const c=cost(ci);const base=baseCost(ci);
 const up=isUp(ci);
 const cls=['card','t'+d.t,'r-'+d.r,'theme-'+(TH[d.cls]||''),o.sel?'sel':'',o.can===false?'unp':'',d.curse?'curse':'',d.cls==='status'?'status':'',o.mark?'markable':'',o.flourish?'flourishable':'',ci.open?'opening':'',d.unplay?'nocost':''].filter(Boolean).join(' ');
 return `<div class="${cls}" ${o.click?`onclick="${o.click}"`:''} data-id="${ci.id}" data-uid="${ci.uid}" data-up="${up?1:0}"${o.i!=null?` data-i="${o.i}"`:''}>
 <i class="cfr"></i>${cardArtHTML(ci.id,d,!!(o.sel||o.full))}
 <div class="card-print">${costGem(ci,d,c,base)}<span class="name" style="--nf:${nameFit(d.n+(up?'+':'')).toFixed(2)}cqw"><span class="nmi">${d.n}${up?'<span class="up">+</span>':''}</span></span><span class="type"${d.unplay?' title="Unplayable"':''}>${d.unplay?'⛔ ':''}${TYPEN[d.t]}</span><span class="text" style="--tf:${textFit(desc(ci)).toFixed(2)}cqw"><span>${d.unplay?desc(ci).replace(/^(<[^>]+>)?Unplayable\.(<\/[^>]+>)?\s*/,''):desc(ci)}${ci.sus?` <b class="sus">(+${ci.sus})</b>`:''}</span></span>${d.r!=='x'?`<span class="rarity ${d.r==='s'?'c':d.r}"></span>`:''}${o.full?`<span class="setno">${setNo(ci.id)}</span>`:''}</div><i class="foil"></i>${o.isNew?'<span class="newseal">NEW</span>':''}${ci.open&&!d.open?'<span class="openpip" title="Opening">⚓</span>':''}${o.mark?'<span class="bell">🔔</span>':''}</div>`}
// ---------------- top bar: HP, gold, floor, potions, relics ----------------
// Etched bronze lantern (Lantern Tasks): vector so it stays crisp and glows amber.
const LANTERN_SVG='<svg class="uic lantern" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3.5h6M12 3.5v2" fill="none" stroke="#c9a05a" stroke-width="1.6" stroke-linecap="round"/><path d="M8 7h8l1.4 2v7.2L16 19H8l-1.4-2.8V9z" fill="#3a2a15" stroke="#c9a05a" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 9.2c1.8 1.7 2.2 3 .9 4.4-.5.5-1.3.5-1.8 0-1.2-1.3-.7-2.7.9-4.4z" fill="#ffc45a"/><path d="M7.5 19.8h9" stroke="#c9a05a" stroke-width="1.6" stroke-linecap="round"/></svg>';
export function topBar(){const K=CLASSES[W.run.cls];return `<div class="topbar sts theme-${TH[W.run.cls]}${K.n.length>9?' longname':''}"><span class="who">${slotHTML('portraits',W.run.cls,'pt',K.e)}<span class="nm">${K.n}<small>Act I</small></span></span>
 <span class="stat hp" style="color:var(--status-damage)">${iconHTML('hud','heart','❤️')} ${Math.max(0,W.run.hp)}/${W.run.max}</span><span class="stat gold" style="color:var(--rarity-rare)">${iconHTML('hud','gold','💰')} ${W.run.gold}</span><span class="stat floor">${iconHTML('hud','floor','🏔️')} ${W.run.floor}/15</span>${potionSlots()}${relicBar()}<span class="sp"></span>
 ${W.run.lamp?`<button class="mini" id="lampbtn" onclick="openOv('tasks')" title="Lantern Tasks">${LANTERN_SVG} ${lampBtnLabel()}</button>`:''}<button class="mini" id="deckbtn" onclick="openOv('deck')" title="Deck">${iconHTML('hud','deck','🂠')} <span class="deck-count">${W.run.deck.length}</span></button><button class="mini" id="mapbtn" onclick="openOv('map')" title="Map">${iconHTML('hud','map','🗺️')}</button><button class="mini" id="setbtn" onclick="openOv('settings')" title="Settings">${iconHTML('hud','settings','⚙️')}</button></div>${toastsHTML()}`}
export function potionSlots(){const ps=W.run.potions;return `<span class="potions" id="potions">${ps.map((id,i)=>{const p=id&&POTIONS[id];
 return `<button class="potion${p?'':' empty'}${W.S.potion===i?' on':''}" data-potion="${i}" ${p?`style="--pcol:${p.col}"`:''} title="${p?esc(p.n+': '+p.d):'Empty potion slot.'}" onclick="potionTap(${i})">${p?slotHTML('potions',id,'',p.e):''}</button>`}).join('')}</span>`}
export function relicBar(){const rs=W.run.relics;const now=Date.now();return `<div class="relics" id="relicbar">${rs.map(r=>{const d=RELICS[r.id];if(!d)return'';const fl=r.flashT&&now-r.flashT<900;
 const cnt=r.id==='starfish'||r.id==='boots'?r.n:'';return `<button class="relic${fl?' flash':''}${r.used?' used':''}" title="${esc(d.n+': '+d.d)}" data-relic="${r.id}" onclick="relicTap('${r.id}')">${slotHTML('relics',r.id,'',d.e)}${cnt!==''?`<i class="cnt">${cnt}</i>`:''}</button>`}).join('')}${(W.run.charms||[]).map(c=>`<button class="relic charm" title="${esc(CHARMS[c].n+': '+CHARMS[c].d)}" onclick="relicTap('charm:${c}')">${slotHTML('relics','charm:'+c,'',CHARMS[c].e)}</button>`).join('')}<button class="relic relic-more" hidden onclick="relicTap('__all')" aria-label="Show all relics" data-info="Hold to see all relics">+0</button></div>`}
export function relicCollectionHTML(){return [...W.run.relics.map(r=>({id:r.id,d:RELICS[r.id]})),...(W.run.charms||[]).map(id=>({id:'charm:'+id,d:CHARMS[id]}))].filter(x=>x.d).map(({id,d})=>`<div class="itemhead">${slotHTML('relics',id,'itemart',d.e)}<div><b>${d.n}</b><div>${d.d}</div></div></div>`).join('')}
let relicRail=null;
const relicResize=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>fitRelics()):null;
function fitRelics(){const bar=document.getElementById('relicbar');if(!bar||!bar.closest('.combat,.runhud'))return;if(relicRail!==bar){relicResize?.disconnect();relicRail=bar;relicResize?.observe(bar)}const more=bar.querySelector('.relic-more'),icons=[...bar.querySelectorAll('.relic:not(.relic-more)')];
 // One row; CSS owns the shared icon and gap scale.
 const style=getComputedStyle(bar),cell=(icons[0]?.getBoundingClientRect().width||20)+parseFloat(style.columnGap);
 const capacity=Math.max(1,Math.floor(bar.clientWidth/cell));
 const limit=icons.length>capacity?Math.max(0,capacity-1):capacity;
 icons.forEach((el,i)=>el.hidden=i>=limit);const n=Math.max(0,icons.length-limit);more.hidden=!n;more.textContent='+'+n;more.setAttribute('aria-label',`Show all ${icons.length} relics`)}
export function toastsHTML(){const now=Date.now();const t=(W.toasts||[]).filter(x=>now-x.t<2600);if(!t.length)return'';return `<div class="toasts">${t.map(x=>`<div class="toast t-${x.cls||""}" style="animation-delay:-${now-x.t}ms">${x.txt}</div>`).join('')}</div>`}
export function potionTap(i){if(drag)return;const id=W.run.potions[i];if(!id){W.S.potion=null;return render()}W.S.potion=W.S.potion===i?null:i;W.S.relicView=null;render()}
export function relicTap(id){if(drag)return;W.S.relicView=W.S.relicView===id?null:id;W.S.potion=null;render()}
export function closePop(){W.S.potion=null;W.S.relicView=null;render()}
function popHTML(){const S=W.S;
 if(S.potion!=null&&W.run.potions[S.potion]){const id=W.run.potions[S.potion],p=POTIONS[id];const can=canDrink(id);const tg=potionNeedsTarget(id);
  const why=!W.cb&&!p.outside?'Use it in combat':p.passive?'Works automatically when you would die':W.cb&&(W.cb.busy||W.cb.mode)?'Wait for your turn':!can?'Can\'t use this here':'';
  return `<div class="pop potpop" id="potpop" onclick="event.stopPropagation()"><div class="itemhead">${slotHTML('potions',id,'itemart',p.e)}<div><b>${p.n}</b> <span class="muted">${RARN[p.rarity]}${p.cls?' · '+CLASSES[p.cls].n:''}</span><div>${p.d}</div></div></div>
  ${tg&&can&&W.cb?`<div class="muted">Targets: ${curTgt()?curTgt().n:'—'} (tap an enemy first to change)</div>`:''}<div class="row"><button class="btn pri" id="drinkbtn" ${can?'':'disabled'} onclick="drinkPotion(${S.potion});W.S.potion=null;render()">${can?'🧪 Drink':why}</button><button class="btn" id="discardpot" onclick="discardPotion(${S.potion})">🗑️ Discard</button><button class="btn" onclick="closePop()">✕</button></div></div>`}
 if(S.relicView==='__all')return `<div class="pop relpop relic-collection" id="relpop"><button class="relic-close" onclick="closePop()" aria-label="Close relics">×</button><h2>Relics</h2>${relicCollectionHTML()}</div>`;
 if(S.relicView){const ch=S.relicView.startsWith('charm:');const d=ch?CHARMS[S.relicView.slice(6)]:RELICS[S.relicView];const r=!ch&&W.run.relics.find(x=>x.id===S.relicView);
  if(d)return `<div class="pop relpop" id="relpop" onclick="closePop()"><div class="itemhead">${slotHTML('relics',S.relicView,'itemart',d.e)}<div><b>${d.n}</b> <span class="muted">${ch?'Charm':(d.tierName||'')+(d.cls?' · '+CLASSES[d.cls].n:'')}</span><div>${d.d}</div></div></div>${r&&(r.id==='starfish'||r.id==='boots')?`<div class="muted">Uses left: ${r.n}</div>`:''}${d.flavour?`<div class="flav">${relicFlavour(d.id||S.relicView,d.flavour)}</div>`:''}</div>`}
 return ''}
export function openOv(k){if(drag)return;W.S.ov=W.S.ov===k?null:k;W.S.potion=null;W.S.relicView=null;render()}
export function hpbar(h,m,blk,blkT,who){return barHTML(h,m,blk,blkT!=null&&anim(blkT,T(700)),who)}
export function badges(block,blkT,st,extra,who){const n=alive().length;const limit=who&&typeof who==='object'&&n>1?Math.max(1,Math.min(2,Math.floor((innerWidth*(.98-1720/2340)/(n-.5)+1)/23))):6;return statusRowHTML(st,extra,who,limit)}
// Floating numbers (R12): size scales with the amount (22-40 px), stacked numbers fan out, Guard uses its icon, and a number waits for the swing to connect (x.d).
const FLN=/^([+-]?)(\d+)/;
export function fxHTML(who){const now=Date.now();const list=W.cb.vfx.filter(x=>x.who===who&&now-x.t<T(x.cls==='curse'?1800:950)+(x.d||0));
 return list.map((x,i)=>{const m=FLN.exec(String(x.txt).replace(/^Parry /,'')),n=m?+m[2]:0,big=(x.cls===''||x.cls==='bleed'||x.cls==='drench')&&n>=15;
  const fs=Math.round(Math.max(22,Math.min(40,22+n*.7))),ox=((i%3)-1)*20,oy=-(i%2)*14;
  const txt=String(x.txt).replace('🛡',iconHTML('status','block','🛡️')).replace('❤','').replace('⚡','⚡');
  return `<div class="fl ${x.cls}${big?' big':''}" style="--fs:${fs}px;--ox:${ox}px;--oy:${oy}px;animation-delay:${x.d||0?(x.d-(now-x.t)):-(now-x.t)}ms">${txt}</div>`}).join('')}
// ---------------- intents ----------------
export function intentHTML(e){const m=intentOf(e),p=[];const tick=heroHook(W.run.cls).intentTick?.(W.cb,e)||'';const tickClass=['on','short'].includes(tick)?tick:'';
 // Every effect of the move gets its own icon (intent-fx.js); debuffs show the status's own art (Soaked drop, Exposed eye…), not a generic arrow.
 // Task 67 (FUN-REDESIGN 9.5/9.6): the attack shows the ONE-hit number (never a multi-hit total), a small hit count beside it, and a tick slot
 // (hidden until the Duelist step wires Clean Answer: it lights green at 9 / 9 and shows grey short of it).
 const add=(x)=>{const ic=x.st?intentIcon('debuff',assetSrc('status',x.st),x.st):intentIcon(x.icon);
  const num=x.k==='a'?`<b>${eAtk(e,m.a)}</b>${m.h>1?`<small class="ihits">×${m.h}</small>`:''}<i class="itick ${tickClass}" aria-hidden="true"></i>`:`<b>${x.n}</b>`;
  p.push(`<span class="intent-part ${x.cls}" data-fx="${x.k}">${ic}${num}</span>`)};
 for(const x of intentParts(e,m)){add(x);if(x.k==='warn')for(const y of x.extra)add({...y,k:'warn-'+y.k})}
 if(!p.length)p.push(`<span class="intent-part oth" data-fx="none">${intentIcon('unknown')}<b>…</b></span>`);
 return `<div class="intent${m.mirror?' mirror':''}${m.charge?' charge':''}" tabindex="0" role="button" aria-label="${esc(intentText(e))}" data-kw="Intent" data-sname="${esc(m.lbl||'Enemy intent')}" data-sinfo="${esc(m.lbl?intentText(e).replace(m.lbl+': ',''):intentText(e))}">${p.join('')}</div>`}
export function intentText(e){const m=intentOf(e);const p=[];if(m.lbl)p.push(m.lbl+':');
 if(m.mirror)p.push('(copies your last card type this turn: Attack → attack 18, Skill → 14 Guard, Vigil → +2 Might; none → attack 18)');
 p.push(intentSentence(e,m));
 if(e.passive)p.push(`· Passive ${e.passive.n}: ${e.passive.text}`);return p.join(' ')}
// ---------------- class bars (v2.1 rules, all actions non-blocking) ----------------
export function classBar(){const c=W.run.cls,cb=W.cb;
 if(c==='tide'){const T=CORE.tide;let g='';for(let i=0;i<=10;i++)g+=`<i class="${i<=cb.tide?'on':''} ${i>=T.high?'hi':i<=T.low?'lo':''} ${i===cb.tide?'cur':''}"></i>`;
  const st=cb.tide>=T.high?'<b class="hi">HIGH</b>':cb.tide<=T.low?'<b class="lo">LOW</b>':'<b>Mid</b>';
  const cr=mod('crest',{preview:true},{dmg:T.crest_dmg,resetTo:5}),un=mod('undertow',{preview:true},{guard:T.undertow_blk,draw:T.undertow_draw,resetTo:5});
  const arrow=cb.holdDrift?'<span class="arrow" title="Moonlock: no drift next turn">🔒</span>':cb.tideDir>0?'<span class="arrow up" title="Drift: +1 next turn">⬆</span>':cb.tideDir<0?'<span class="arrow dn" title="Drift: −1 next turn">⬇</span>':'<span class="arrow" title="No drift yet">•</span>';
  let btn='';if(hasRelic('tidetable')&&!cb.tideBtnUsed)btn+=`<button class="tbtn" id="tideup" onclick="tideAct('up')" title="Surge 1. Free, once per turn.">+1</button><button class="tbtn" id="tidedn" onclick="tideAct('down')" title="Recede 1. Free, once per turn.">−1</button>`;
  if(hasRelic('helmwheel')&&!cb.wheelUsed&&cb.tideDir)btn+=`<button class="tbtn" id="tideflip" onclick="tideAct('flip')" title="Flip the drift.">☸️</button>`;
  if(cb.banks&&!cb.busy)btn+=`<button class="tbtn rel" id="relbank" onclick="releaseBank()" title="Release the Bank: ${cb.banks} Banked Crest${cb.banks>1?'s':''}, 1½× Crest damage to ALL each">🏦 Release ×${cb.banks}</button>`;else if(cb.banks)btn+=`<span class="chip">🏦 ×${cb.banks}</span>`;
  return `<span class="tst">${st} <b class="tnum">${cb.tide}</b>${arrow}</span><div class="gauge${anim(cb.crestT,T(700))?' crest':''}${anim(cb.undertowT,T(700))?' under':''}" title="10 = Crest (${cr.dmg} to ALL) · 0 = Undertow (${un.guard} Guard, draw ${un.draw}) · High ${T.high}+ · Low ${T.low}−">${g}</div>${btn}`}
 if(c==='echo'){const plan=echoPlan(true);let t;
  // Live Echo preview: each Marked card shows what its Echo would do right now (updates as you play cards after it).
  const mchip=(ci,k,after)=>{const pl=echoPlan(true,k);const pv=pl&&echoPreview(pl);const rep=pl&&pl.repeats>1?'×'+pl.repeats:'';
   return `<span class="chip marked" title="${esc(cname(ci)+' Echoes at end of turn'+(pv?': about '+pv.total+(pv.kind==='dmg'?' damage':' Guard'):'')+'. +1 per card played after, max +'+CORE.echo.bonus_cap+'.')}">🔔 ${CARDS[ci.id].e} ${cname(ci)} +${markBonus(after)}${pv?` <b class="pv">→ ${pv.n}${pv.kind==='dmg'?'⚔':'🛡'}${rep}${pl.mult>1?' ×2':''}</b>`:''}${pl&&pl.scale<1?' ½':''}</span>`};
  const second=cb.mark&&canMark();
  const mk=(cb.mark?mchip(cb.mark,1,cb.afterMark):'')+(cb.mark2?mchip(cb.mark2,2,cb.after2):'')+(canMark()?`<button class="tbtn mark${cb.armMark?' on':''}" id="markbtn" onclick="armMark()" title="Mark your next card. It Echoes at end of turn.">🔔 ${cb.armMark?'Marking…':second?'Mark 2nd':'Mark'}</button>`:'');
  if(!cb.mark&&plan){const d=CARDS[plan.card.id];t=`🔊 <span class="chip next">${d.e} ${cname(plan.card)}${plan.half?' '+fbLabel():''}</span>`}
  else if(!cb.mark)t='<span class="muted">No Echo yet</span>';else t='';
  return mk+' '+t}
 if(c==='carto'){let s='';const pk=cb.mode&&cb.mode.k==='slot';const lim=mod('advances',{},1);const canAdv=!pk&&cb.advUsed<lim&&!cb.busy&&!cb.mode;
  for(let i=0;i<cb.nslots;i++){const w=cb.slots[i];const r=w?(w.rank||0):0;const pips=w?`<span class="pips">${[0,1,2].map(k=>`<i class="${k<r?'on':''}"></i>`).join('')}</span>`:'';
   const adv=w&&canAdv&&r<CORE.carto.rank_max;
   s+=w?`<button class="wp full${pk?' pick':''}${adv?' adv':''}${r>=CORE.carto.rank_max?' land':''}${anim(w.trigT,T(600))?' trig':''}" data-slot="${i}" onclick="${pk?`modeAct('slot',${i})`:adv?`advance(${i})`:''}" title="${esc(cname(w)+': '+desc(w).replace(/<[^>]+>/g,'')+(adv?'. Tap for +1 Rank.':''))}">${CARDS[w.id].e}<span class="wpn">${cname(w)}</span>${pips}</button>`:`<div class="wp">·</div>`}
  const nd=mod('drawCount',{},4);const nx=cb.draw.slice(0,3).map((ci,i)=>`<span class="chip ${i<nd?'next':''}">${CARDS[ci.id].e} ${cname(ci)}</span>`).join('')||'<span class="muted">reshuffle</span>';
  return `<div class="wps">${s}</div><span class="advhint">${canAdv&&cb.slots.length?'⛰️ Tap a Waypoint to Advance':cb.advUsed?'⛰️ Advanced':''}</span><span class="nexts">🗺️ ${nx}</span>`}
 if(c==='duel'){const D=CORE.duel;const max=mod('momMax',{},D.mom_max);let p='';for(let i=0;i<max;i++)p+=`<i class="${i<cb.mom?'on':''}"></i>`;
  const can=cb.mom>=flourishMin();const mult=flourishMult(cb.mom);
  const fb=`<button class="tbtn flo${cb.armFlourish?' on':''}" id="flourishbtn" ${can?'':'disabled'} onclick="armFlourish()" title="Flourish: next Attack spends all Momentum for extra damage.">⚔️ ${can?(cb.armFlourish?'FLOURISH ×'+mult:'Flourish ×'+mult):'Flourish ('+flourishMin()+'+)'}</button>`;
  return `<span>Momentum</span><span class="pips mom">${p}</span>${fb}${cb.parry?`<span class="chip parry">🤺 Parry ${cb.parry}</span>`:''}${cb.keepMom?'<span class="chip">🏃 keeps</span>':''}`}}
// ---------------- combat ----------------
// ---------------- battle figures (Art Director spec) ----------------
// Fill the free battle area, keeping foot anchors above the resting hand.
export function sceneGeom(){const vw=innerWidth,vh=innerHeight;return {vw,vh,s:Math.min(vh/720,vw/1560),feet:Math.round(vh*FEET),top:vw>vh?56:40,heroTop:40}}
// One standing figure: sprite (or placeholder) with its foot anchor on the floor point, an ellipse shadow, intent above the head,
// name plate + HP bar (Guard at its left end) under the feet, then the bounded status rail.
// v0.6.2.1 (Spencer): every battle figure 15% taller; top = feet - H keeps the ground anchor fixed. Head-room and width clamps still apply.
export const FIG_SCALE=1.15;
function figureHTML({sp,role,ph,g,x,shake,intent,name,hp,badgesH,fx,cls,attrs}){const sc=figureScale(role==='boss')*FIG_SCALE;let H=Math.round(Math.min(sc*(role==='hero'?g.vh*.26:role==='boss'?g.vh*.44:role==='elite'?g.vh*.36:sp?.role==='summon'?g.vh*Math.min(.31,(sp.pct||24)/100):g.vh*280/1080),g.feet-(role==='hero'?g.heroTop:g.top+32)));
 if(role!=='hero'&&sp&&g.enemyMaxWidth)H=Math.min(H,Math.floor(g.enemyMaxWidth*FIG_SCALE*sp.h/sp.w)); // sprites may grow into the cell gap; HP bars/intents keep the cell width (--bw)
 const W=sp?Math.round(H*sp.w/sp.h):Math.round(H*.8);const ax=sp?sp.ax:.5;const hov=sp?Math.round(sp.hover/1440*g.vh):0;
 const top=g.feet-H-hov,L=Math.max(4,Math.min(g.vw-W-4,x-Math.round(W*(g.multi?.5:ax)))),fx0=Math.round(W*(g.multi?.5:ax));const it=Math.max(g.top,top-46)-top;const bw=Math.round(Math.min(g.vh*260/1080,g.multi?g.enemyMaxWidth:Infinity));
 const shW=Math.round(W*.7*(role==='boss'?1.3:1)*(hov?.55:1));const img=`<div class="slot spr-slot${sp?' has-img':''}" data-asset="sprites.${sp?sp.id:'none'}"><div class="ph" style="font-size:${Math.round(Math.min(W,H)*.7)}px">${ph}</div>${sp?`<img class="spr" src="${sp.f}" alt="" draggable="false" decoding="async" style="height:${H}px${role!=='hero'&&sp.facing==='right'?';scale:-1 1':''}" onerror="assetFail(this)">`:''}</div>`;
 return `<div class="${cls}" ${attrs} style="left:${L}px;top:${top}px;width:${W}px;height:${H+hov}px;--bw:${bw}px;--ax:${fx0}px">
 <i class="shadow${hov?' float':''}" style="left:${fx0}px;top:${H+hov}px;width:${shW}px;height:${Math.max(8,Math.round(shW*.17))}px"></i>
 <div class="fig ${shake?'shake':''}" style="width:${W}px;height:${H}px;left:0;top:0;${shake||''}">${img}</div>
 ${intent?`<div class="intentw" style="top:${it}px">${intent}</div>`:''}
 <div class="plate" style="top:${H+hov+2}px">${`<div class="nm">${name}</div>`}${hp}<div class="stw">${badgesH}</div></div>${fx}</div>`}
function enemyX(i,n,g){if(n===1)return Math.round(g.vw*1720/2340);const a=1720/2340,cell=g.vw*(.98-a)/(n-.5);return Math.round(g.vw*a+cell*i)}
export function enemyHTML(e,i,k,n,g){g=g||sceneGeom();g={...g,multi:(n||1)>1,enemyMaxWidth:(n||1)>1?g.vw*((.98-1720/2340)/((n||1)-.5)-.012):g.vw*.43};const many=alive().length>1;const sh=motionEnabled()?null:anim(e.shake,400);const act=W.cb.busy&&W.cb.tele===e;
 const role=e.boss?'boss':e.elite?'elite':'normal';const vi=W.cb.ens.slice(0,i).filter(x=>x.key===e.key).length;
 const flav=ENEMY_FLAVOUR[e.key],nm0=flav?`${e.n}<i class="nmfl">${esc(flav)}</i>`:e.n;
 const name=`${nm0}${e.elite?' <span class="star">★</span>':''}${e.boss&&e.key==='bell'?` <span class="ph">P${e.ph}</span>`:''}`;const pasH=e.passive?`<span class="pas" title="${esc(e.passive.n+': '+e.passive.text)}">${e.passive.n==='Rooted'?iconHTML('status','rooted','🌿'):'🌿'}${e.passive.n}</span>`:'';
 return figureHTML({sp:spriteFor('enemies',e.key,e.sv!=null?e.sv:vi),role,ph:e.e,g,x:enemyX(k==null?i:k,n||1,g),shake:sh,intent:intentHTML(e),name,hp:hpbar(e.hp,e.max,e.block,e.blkT,'e'+e.uid),
  badgesH:(e.passive?.n==='Rooted'?'':pasH)+badges(0,0,{...e.st,...(e.passive?.n==='Rooted'?{rooted:1}:{})},undefined,e),fx:fxHTML(e.uid),cls:`en ${e.boss?'boss':''} ${e.elite?'elite':''} ${many&&W.cb.tgt===i?'tg':''} ${act?'act':''}`,attrs:`onclick="tgt(${i})" data-en="${i}" data-key="${e.key}"`})}
export function heroHTML(g){g=g||sceneGeom();const K=CLASSES[W.run.cls];const sh=motionEnabled()?null:anim(W.cb.pshake,400);
 return figureHTML({sp:spriteFor('figures',W.run.cls),role:'hero',ph:K.e,g,x:Math.round(g.vw*570/2340),shake:sh,intent:'',name:`<span class="hn">${K.n}</span>`,hp:hpbar(W.run.hp,W.run.max,W.cb.p.block,W.cb.p.blkT,'p'),
  badgesH:badges(0,0,{...W.cb.p.st,...(W.cb.parry&&!W.cb.parryUsed?{parry:W.cb.parry}:{})},playerStates(),'p'),fx:fxHTML('p'),cls:`hero theme-${TH[W.run.cls]}`,attrs:'id="hero"'})}
export function tipHTML(){const cb=W.cb;
 if(cb.insp!=null&&cb.ens[cb.insp]&&cb.ens[cb.insp].hp>0){const e=cb.ens[cb.insp];return `<div class="tip" id="detail"><b>${e.e} ${e.n}</b> <span class="muted">${e.hp}/${e.max}</span><br>${intentText(e)}</div>`}
 return ''}
// First-fight coach: one short line at a time, driven by what the player has done. Only on floor 1; closed with the X or Options > Hints.
function coachHTML(){const cb=W.cb;if(settings.coach===false||cb.kind!=='fight'||W.run.floor!==1||cb.mode||cb.turn>2)return '';
 const played=cb.energy<cb.maxE||cb.disc.length>0;let ico,t;
 if(cb.turn<2&&!played){ico='⚔️';t='Drag an <b>Attack</b> onto the enemy.'}
 else if(cb.turn<2&&cb.energy>0){ico='🛡️';t='<b>Guard</b> blocks the hit shown above the enemy. Spend your <b>Energy</b>.'}
 else if(cb.turn<2){ico='⏳';t='Out of Energy? Press <b>End Turn</b>.'}
 else{ico='✨';t='New turn: Energy and cards are back. Win the fight to earn a card.'}
 return `<div class="coach" role="status"><span class="co-ico">${ico}</span><span>${t}</span><button class="co-x" aria-label="Hide hints" onclick="setCoach(false)">${glyph('cross')}</button></div>`}
// v0.6.2 interim hero hint (Cartographer 4-card opening hand). Same pill as the coach; fades by itself.
const HINT_MS=5200;
function hintHTML(){const h=W.cb.hint;if(!h)return '';const age=Date.now()-h.t;if(age>=HINT_MS)return '';
 return `<div class="coach hero-hint" role="status" style="animation-delay:-${age}ms"><span class="co-ico">${h.ico}</span><span>${h.txt}</span></div>`}
const BEAT_MS={intro:3000,phase:2600};
function bossBeatHTML(){const b=W.cb.beat;if(!b)return '';const age=Date.now()-b.t;if(age>=(BEAT_MS[b.kind]||2600))return '';
 const epi=b.kind==='intro'?(ENEMY_FLAVOUR[W.cb.bossKey]||'').split('. ')[0].replace(/\.$/,'')+'.':'';
 return `<div class="bossbeat combat-bossbeat bb-${b.kind}" aria-live="polite" style="animation-delay:-${age}ms"><i class="bb-rule"></i><h2>${b.title}</h2>${epi.length>2?`<div class="bb-epi">${epi}</div>`:''}<p>${b.sub}</p><i class="bb-rule"></i></div>`}
// A curse that fires from your hand at end of turn (Dread) lifts out of the hand and glows, then fades (T(1600) at the current pace).
function cursePopsHTML(){const now=Date.now(),cb=W.cb;const c=(cb.cursePops||[]).filter(x=>now-x.t<T(1600));cb.cursePops=c;if(!c.length)return '';
 return `<div class="cursepops">${c.map((x,i)=>`<div class="cursepop" style="--i:${i};animation-delay:-${now-x.t}ms">${cardHTML({id:x.id,uid:-800-i,up:false})}</div>`).join('')}</div>`}
function calloutsHTML(){const now=Date.now();const c=(W.cb.callouts||[]).filter(x=>now-x.t<T(1300));return cursePopsHTML()+(c.length?`<div class="callouts">${c.slice(-2).map(x=>`<div class="co c-${x.cls}" style="animation-delay:-${now-x.t}ms">${x.txt}</div>`).join('')}</div>`:'')}
const titleHTML=t=>{const k=String(t).indexOf(': ');return k>0&&k<40?`<h2>${t.slice(0,k)}</h2><div class="muted csub">${t.slice(k+2)}</div>`:`<h2>${t}</h2>`};
export function combatScr(){const cb=W.cb;if((settings.enemyPace||'measured')!==enemyPace())setEnemyPace(settings.enemyPace);
 const incoming=cb.ens.filter(e=>e.hp>0&&!e.fled).reduce((a,e)=>{const m=intentOf(e);return a+(m.a?eAtk(e,m.a)*(m.h||1):0)},0);let h=`<div class="combat theme-${TH[W.run.cls]}${cb.kind==='boss'?' bossfight':''}${alive().length>3?' dense-foes':''}">`+topBar();
 h+=daisHTML();
 const g=sceneGeom();const pick=cb.mode&&['choice','slot','chart'].includes(cb.mode.k);const live=cb.ens.map((e,i)=>[e,i]).filter(([e])=>e.hp>0&&!e.fled);
 h+=`<div class="scene${pick?' pick-dim':''}" onclick="sceneTap(event)"><div class="ground"></div>${stageAtmosphereHTML(false)}${heroHTML(g)}<div class="foes${cb.busy&&cb.tele?' has-act':''}">${live.map(([e,i],k)=>enemyHTML(e,i,k,live.length,g)).join('')}</div>${stageAtmosphereHTML(true)}${tipHTML()}${calloutsHTML()}${bossBeatHTML()}${coachHTML()}${hintHTML()}`;
 h+=`<div class="log">${cb.log.slice(0,3).map((l,i)=>`<div style="opacity:${1-i*.25}">${l}</div>`).join('')}</div>`;
 if(cb.banner&&!['Enemy Turn','Player Turn'].includes(cb.banner.txt)){const a=anim(cb.banner.t,T(560));if(a)h+=`<div class="banner ${cb.banner.en?'en':''}" style="${a}">${cb.banner.txt}</div>`}
 const fl=W.run.cls==='duel'&&cb.armFlourish,mkA=W.run.cls==='echo'&&cb.armMark;
 h+=`</div><div class="bottom"><div class="hand${fl?' flourishing':''}${mkA?' marking':''}" id="hand">${cb.hand.map((ci,i)=>{const d=CARDS[ci.id];return cardHTML(ci,{sel:cb.sel===i,can:canPlay(ci),i,flourish:fl&&d.t==='A',mark:mkA&&d.t!=='P'&&(!d.faint||hasRelic('hollowreed'))&&!d.unplay})}).join('')}</div>
 <div class="ctl"><div>${heroPlateHTML({incoming})}<button class="pile" id="drawpile" onclick="openOv('draw')" title="Draw pile.">${iconHTML('hud','draw','📚')} <span class="pile-count">${cb.draw.length}</span></button></div>
 <div><div class="row2"><button class="pile" id="exhpile" onclick="openOv('exh')" title="Sunk: removed for this combat.">${iconHTML('hud','sunk','⚓')} <span class="pile-count">${cb.exh.length}</span></button><button class="pile" id="discpile" onclick="openOv('disc')" title="Discard pile. Reshuffled when the draw pile runs out.">${iconHTML('hud','discard','🗑️')} <span class="pile-count">${cb.disc.length}</span></button></div><button class="endbtn" id="endbtn" onclick="endTurn()" ${cb.busy||cb.mode?'disabled':''}>END</button></div></div></div>`;
 const m=cb.mode;
 if(m&&m.k==='choice')h+=`<div class="ov battle"><div class="box tilebox" id="choicebox">${titleHTML(m.title)}${tilesRow(m.opts.map((o,i)=>optionHTML(o,`modeAct('choice',${i})`,{i})),'chtiles')}</div></div>`;
 if(m&&m.k==='slot')h+=`<div class="ov battle"><div class="box tilebox" id="slotbox">${titleHTML(m.title)}<div class="tiles chtiles slottiles" style="--n:${cb.slots.length}">${cb.slots.map((w,i)=>`<div class="tcard opt slotpick">${cardHTML(w,{click:`modeAct('slot',${i})`})}<span class="tcap">${w.rank?'Rank '+w.rank:'Rank 0'}${w.temp?' · starting':''}</span></div>`).join('')}</div></div></div>`;
 if(m&&m.k==='chart'){const n=m.n;const cards=Array.from({length:n},(_,i)=>{const ci=cb.draw[i];return `<div class="cslot${i===0?' first':''}" data-i="${i}"><span class="cnum">${i===0?'<b>1</b> drawn first':'<b>'+(i+1)+'</b>'}</span>${cardHTML({...ci,uid:ci.uid},{})}<span class="cmv"><button class="cmvb" aria-label="Earlier" onclick="modeAct('up',${i})" ${i===0?'disabled':''}>◀</button><button class="cmvb" aria-label="Later" onclick="modeAct('dn',${i})" ${i===n-1?'disabled':''}>▶</button></span></div>`}).join('');
  h+=`<div class="ov battle"><div class="box chartbox" id="chartbox"><h2>🗺️ Chart: set the order of your next draws</h2><div class="muted csub">Drag cards left or right. The leftmost card is drawn first. Drop one in the Bottom slot to send it under the pile.</div>
  <div class="chartrow" style="--n:${n}"><div class="cards" id="chartcards">${cards}</div><div class="cright"><div class="cbottom${m.moved?' used':''}" id="chartbottom"><span class="cbi">⤓</span><b>Bottom</b><i>${m.moved?'Card sent down':'Drop 1 card here'}</i></div><button class="btn pri" id="chartdone" onclick="modeAct('done')">Done</button></div></div></div></div>`}
 return h+'</div>'}
function tgtImpl(i){const cb=W.cb;if(!cb||cb.busy||drag)return;if(cb.mode)return;const e=cb.ens[i];if(!e||e.hp<=0)return;cb.tgt=i;
 cb.insp=cb.insp===i?null:i;cb.sel=null;render()}
export function sceneTap(ev){if(!W.cb||drag)return;if(ev.target.closest('.en,.tip,.hero'))return;if(W.cb.sel!=null||W.cb.insp!=null){W.cb.sel=null;W.cb.insp=null;render()}}
// Full framed cards at rest; one card rises above a scrubbing finger or cursor.
export const HAND_REST_TOP=(1080-238*1.4*.6)/1080;export const HAND_REST_W=238,HAND_LIFT_W=340,HAND_LIFT_TOP=550;
const handLayouts=new WeakMap();
export function layoutHand(animate=false){const hand=document.getElementById('hand');if(!hand)return;const cards=[...hand.querySelectorAll('.card:not(.drag)')];const n=cards.length;if(!n)return;
 const land=matchMedia('(orientation:landscape)').matches;const vh=innerHeight;
 const signature=[innerWidth,vh,hand.className,W.cb?.mode?.k,!!W.cb?.busy,
  cards.map(c=>c.dataset.uid+':'+c.className+':'+c.style.width+':'+c.style.height).join('|'),
  W.cb?.ens.filter(e=>e.hp>0&&!e.fled).map(e=>e.uid).join(',')].join('/');
 // Enemy telegraphs and HP changes do not change the resting fan.
 if(W.cb?.sel==null&&handLayouts.get(hand)===signature){if(land){clampPlates(hand);placeStatusRows()}return}
 if(!animate)hand.classList.add('instant');
 const Wd=hand.clientWidth,cw=cards[0].offsetWidth,ch=cards[0].offsetHeight;const hr=hand.getBoundingClientRect();const cx=hr.left+Wd/2;
 const step=n>1?Math.min(cw*.78,(Wd-cw)/(n-1)):0;const ang=land?1.6:n>6?2.5:4;
 const eL=Math.min(innerWidth,...[...document.querySelectorAll('.combat .en .fig')].map(f=>f.getBoundingClientRect().left));
 const zoom=land?0:(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom'))||1.4);
 // Read every bottom offset before writing transforms to avoid a layout flush per card.
 const bottoms=land?cards.map(el=>parseFloat(getComputedStyle(el).bottom)||0):[];
 cards.forEach((el,i)=>{const off=i-(n-1)/2;const x=off*step,y=(Math.abs(off)*Math.abs(off)-Math.pow((n-1)/2,2))*cw*(land?.012:.018);
  const zl=land?HAND_LIFT_W/HAND_REST_W:zoom;
  const ly=land?-(vh*(HAND_REST_TOP*1080-HAND_LIFT_TOP)/1080-ch*(zl-1)):-8;
  // a lifted card slides left of the enemy row when there is room, so it doesn't hide the target it's aimed at
  const zw=cw*zl;const lo=zw/2+4-cx;let hi=innerWidth-zw/2-4-cx;if(land&&eL<innerWidth&&eL-zw-10>0)hi=Math.min(hi,eL-zw/2-6-cx);const xs=Math.max(lo,Math.min(hi,x));
  el.style.setProperty('--x',x+'px');el.style.setProperty('--y',y+'px');el.style.setProperty('--r',off*ang+'deg');el.style.setProperty('--xs',xs+'px');
  el.style.setProperty('--zl',zl.toFixed(3));el.style.setProperty('--ly',ly+'px');el.dataset.x=x;el.dataset.y=y;el.dataset.zl=zl.toFixed(3);el.dataset.ly=ly});void hand.offsetWidth;hand.classList.remove('instant');handLayouts.set(hand,signature);if(land){clampPlates(hand);placeStatusRows()}}
// Name plates + HP bars (incl. extra lines such as the Matriarch's 'Rooted') always sit above the resting hand's top edge.
function clampPlates(hand){
 // The floor anchor is independent of every temporary hand pose.
 for(const p of document.querySelectorAll('.combat .plate'))p.style.top=p.dataset.top||(p.dataset.top=p.style.top);
}

// Keep readable status stacks near their own HP bar, clear of bottom controls.
function placeStatusRows(){
 const rows=[...document.querySelectorAll('.combat .en .stw')];
 const controls=[...document.querySelectorAll('.combat .ctl button')].map(e=>e.getBoundingClientRect());
 const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
 rows.forEach(e=>{e.style.top='0px';e.style.transform='none'});
 const placed=[];
 for(const e of rows){const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;
  const hp=e.parentNode.querySelector('.hpbar').getBoundingClientRect();
  const xs=[r.left,...controls.flatMap(c=>[c.left-r.width-4,c.right+4])];
  const ys=[r.top,...controls.map(c=>c.bottom+4)];let best=null;
  for(const x of xs)for(const y of ys){const a={left:x,top:y,right:x+r.width,bottom:y+r.height};
   if(x<4||a.right>innerWidth-4||y<hp.bottom+1||a.bottom>innerHeight-6||Math.abs(x-r.left)>Math.max(50,r.width*1.5))continue;
   if([...controls,...placed].some(c=>intersects(a,c)))continue;
   const score=Math.abs(x-r.left)*2+Math.abs(y-r.top);if(!best||score<best.score)best={...a,score};
  }
  if(best){e.style.top=(best.top-r.top)+'px';e.style.transform=`translateX(${best.left-r.left}px)`;placed.push(best)}else placed.push(r);
 }
}

// ---------------- title / travel ----------------
const sxSw=(id,label,on,fn,dis)=>`<label class="sx-row"><span class="sx-t">${label}</span><input class="sx-sw" id="${id}" type="checkbox" ${on?'checked':''} ${dis?'disabled':''} onchange="${fn}(this.checked)"></label>`;
const sxSeg=(id,label,vals,cur,fn)=>`<div class="sx-row"><span class="sx-t">${label}</span><span class="sx-seg" id="${id}" role="radiogroup" aria-label="${label}">${vals.map(([v,t])=>`<button type="button" role="radio" aria-checked="${v===cur}" class="${v===cur?'on':''}" data-v="${v}" onclick="${fn}('${v}');render()">${t}</button>`).join('')}</span></div>`;
const sxRange=(id,label,key,val)=>`<label class="sx-row"><span class="sx-t">${label}</span><input class="sx-rng" id="${id}" aria-label="${label} volume" type="range" min="0" max="1" step="0.01" value="${val}" style="--p:${Math.round(val*100)}%" oninput="this.style.setProperty('--p',this.value*100+'%');setAudioSetting('${key}',this.value)"></label>`;
export function settingsHTML(){return `<div class="settings sx">
 ${sxSeg('setanimspeed','Animation speed',Object.keys(SPEEDS).map(v=>[v,SPEED_LABEL[v]]),settings.animSpeed||'normal','setAnimSpeed')}
 ${sxSeg('setenemypace','Enemy turns',[['measured','Measured'],['classic','Fast']],settings.enemyPace||'measured','setEnemyPaceMode')}
 ${sxSeg('setenvfx','Effects',['full','reduced','off'].map(v=>[v,envFxSettingLabel(v)]),settings.envFx,'setEnvFx')}
 ${sxRange('setmusic','Music','musicVolume',settings.musicVolume)}${sxRange('setsfx','SFX','sfxVolume',settings.sfxVolume)}
 ${sxSw('setfast','Fast animations',settings.fastAnim,'setFast')}${sxSw('setmute','Mute audio',settings.audioMuted,'setMute')}
 ${sxSw('sethints','First-fight hints',settings.coach!==false,'setCoach')}${sxSw('setcardskip','Confirm skipping card rewards',settings.confirmCardSkip!==false,'setConfirmCardSkip')}
 ${sxSw('setshake','Screen shake',settings.screenShake!==false,'setScreenShake')}${sxSw('sethaptic','Hand vibration',settings.handHaptic!==false,'setHandHaptic')}
 ${sxSw('setcharselpar','Hero select motion',settings.charselParallax!==false&&!settings.reduceMotion,'setCharselParallax',settings.reduceMotion)}${sxSw('setreduce','Reduced motion',settings.reduceMotion,'setReduceMotion')}
 </div>`}
export function setMute(on){setAudioSetting('audioMuted',!!on)}
export function setConfirmCardSkip(on){settings.confirmCardSkip=!!on;saveSettings()}
export function setCoach(on){settings.coach=!!on;saveSettings();render()}
export function setScreenShake(on){settings.screenShake=!!on;saveSettings()}
export function setCharselParallax(on){settings.charselParallax=!!on;saveSettings()}
export function setHandHaptic(on){settings.handHaptic=!!on;saveSettings()}
export function setFast(on){settings.fastAnim=!!on;window.FAST=on?1:0;saveSettings()}
export function setEnemyPaceMode(v){settings.enemyPace=v==='classic'?'classic':'measured';setEnemyPace(settings.enemyPace);saveSettings()}
export function setAnimSpeed(v){settings.animSpeed=SPEEDS[v]?v:'normal';setAnimSpeedValue(settings.animSpeed);saveSettings()}
export function setEnvFx(v){settings.envFx=v;saveSettings();render()}
// Act I title card (design-v2 §W.5, art/v2/bg/_src/tc-a1-spec.json): the painted plate (frame + emblem, 60% of the screen width, centred) fades in
// at 0.8 s over the tr_start travel scene; title + subtitle are HTML text inside the plate's dark panel (text_panel rect). Text fallback if the file fails.
const TC_A1_DEFAULT={src:'art/v2/bg/tc-a1-plate@2x.webp',w:1870,h:761,panel:[1099-864,671-342,1401,260],title:'Act I: The Wrack Terraces',sub:'The foot of the Drowned Stair.'};
// Plate rect + text panel from the Artist's manifests (tc-a1-rects.json -> ENV.envs.tc_a1.art.mid, tc-a1-spec.json -> .spec), panel made plate-relative.
function tcA1(){const e=ENV.envs.tc_a1;const m=e&&e.art&&e.art.mid&&e.art.mid[0];const sp=e&&e.spec;if(!m||!sp||!sp.text_panel)return TC_A1_DEFAULT;const [x,y,w,h]=m.r,[px,py,pw,ph]=sp.text_panel.rect;
 return {src:m.f,w,h,panel:[px-x,py-y,pw,ph],title:sp.title||TC_A1_DEFAULT.title,sub:sp.subtitle||TC_A1_DEFAULT.sub}}
function travelScr(){const ok=Date.now()-(W.S.t||0)>1000;const T=tcA1(),[px,py,pw,ph]=T.panel,pc=(a,b)=>(a/b*100).toFixed(2)+'%';
 return `<div class="page travel" onclick="skipTravel()"><div class="tcard tcplate" style="aspect-ratio:${T.w}/${T.h}"><img class="tcimg" src="${T.src}" alt="" draggable="false" onerror="this.parentNode.classList.add('noimg');this.remove()">
 <div class="tcpanel" style="left:${pc(px,T.w)};top:${pc(py,T.h)};width:${pc(pw,T.w)};height:${pc(ph,T.h)}"><h1>${T.title}</h1><div class="sub">${T.sub}</div></div></div>
 <div class="boss muted tcboss">At the summit waits <b>${EN[W.run.boss].e} ${EN[W.run.boss].n}</b></div>
 <div class="ferry win" id="ferryman" data-info="${tesc('The Ferryman: He carries every Lampbearer to the Stair\'s foot, and never looks up.')}">${emblemHTML('lore-ferryman','⚓','fyp')}<q>${ferrymanLine(W.run.cls,currentTier())}</q></div><div class="skip muted">${ok?'Tap to begin':'…'}</div></div>`}
export function skipTravel(){if(W.S.screen!=='travel')return;if(Date.now()-(W.S.t||0)<1000&&!window.FAST)return;W.S={screen:'map'};
 if(W.run&&W.run.lamp&&!W.run.lamp.shown&&W.run.floor===0){W.run.lamp.shown=true;W.S.ov='tasks'} // Lantern Tasks are shown once, when the climb begins
 render()}
// ---------------- rewards / chests ----------------
function rowHTML(r,i,click){const done=!!r.done,c=done?'':`${click}(${i})`;
 if(r.k==='gold')return tileHTML({id:'reward-gold',emoji:'💰',name:`${r.n} gold`,sum:r.note||'Into your purse.',cls:'k-gold',click:c,done,disabled:done,tid:'row'+i,info:`${r.n} gold: spend it at the merchant.`});
 if(r.k==='relic')return relicTile(r.id,{click:c,done,disabled:done,sum:RELICS[r.id].d});
 if(r.k==='potion')return potionTile(r.id,{click:c,done,disabled:done});
 return tileHTML({id:'reward-cards',emoji:'🂠',name:r.took?`Took ${CARDS[r.took].n}`:r.skipped?'Skipped':'Choose a card',sum:r.took||r.skipped?'':`Add 1 of ${r.cards.length} to your deck.`,cls:'k-cards',click:c,done,disabled:done,tid:'row'+i,info:'Card reward: pick one card for your deck, or skip.'})}
function rewardScr(){const S=W.S,title=stripEmoji(S.title||'');
 const boss=S.kind==='boss'&&S.boss&&EN[S.boss]&&S.cardsOpen==null&&S.swap==null?`<div class="bossvic" style="${anim(S.t,2600)||''}"><i class="bv-rays"></i><b>${EN[S.boss].n}</b><q>${BOSS_DEFEAT[S.boss]||''}</q></div>`:'';
 if(S.cardsOpen!=null){const row=S.rows[S.cardsOpen];
  return topBar()+pkScreen({cls:'pk-cards',title:`<span class="reward-banner">${title||'Choose a card'}</span>`,sub:cardSelSub(S.cardSelected!=null?CARDS[row.cards[S.cardSelected]].n:null),
   body:`<div class="grid rewgrid">${row.cards.map((id,j)=>`<div class="rcw${S.cardSelected===j?' reward-selected':''}" aria-selected="${S.cardSelected===j}">${cardHTML({id,uid:-1-j,up:false},{click:`rewCard(${j})`,isNew:isNewCard(id)})}${cardBackHTML()}</div>`).join('')}</div>`,
   left:pkBtn('Back','rewCloseCards()',{icon:'undo'})+pkBtn('Skip card','rewSkipCards()',{id:'skipcard'}),right:pkBtn('Continue','rewConfirmCards()',{pri:1,id:'confirmcard'}),
   after:S.skipConfirm?`<div class="ov" role="dialog" aria-modal="true" aria-labelledby="skipquestion"><div class="box card-skip-box"><h2 id="skipquestion">No card has been selected. Do you wish to continue?</h2><label class="chk"><input type="checkbox" id="skipdont"><span>Don't show this again</span></label><div class="actions"><button class="btn pri" id="skipyes" onclick="rewSkipAnswer(true,document.getElementById('skipdont').checked)">Yes</button><button class="btn" id="skipno" onclick="rewSkipAnswer(false)">No</button></div></div></div>`:''})}
 if(S.swap!=null){const row=S.rows[S.swap],p=POTIONS[row.id];
  return topBar()+pkScreen({cls:'pk-swap',title:'Potion belt full',sub:`Swap <b>${p.n}</b> for a potion you hold, or leave it behind.`,
   body:tilesRow([...W.run.potions.map((id,s)=>potionTile(id,{click:`potionSwap(${s})`,tag:'Replace',cls:'swap'})),tileHTML({id:'opt-remove',emoji:'🗑️',name:`Discard ${p.n}`,sum:'Leave it behind.',click:'potionSwap(-1)',cls:'k-discard',tid:'discardnew'})],'swaptiles')})}
 return topBar()+boss+pkScreen({cls:'pk-rewards'+(boss?' hasboss':''),title:`<span class="reward-banner">${title}</span>`,sub:S.kind==='boss'?'':'Take what you want. Anything left behind is lost.',body:tilesRow(S.rows.map((r,i)=>rowHTML(r,i,'claimRow')),'rewtiles'),
  right:pkBtn(S.kind==='boss'?'Finish the act':'Proceed','rewDone()',{pri:1,id:'proceed',icon:'arrowright'}),after:S.leaveConfirm?leaveDialog():''})}
// v0.6.2.1: skipping every reward asks first (iron .ov .box panel, same as the card-skip question). B061 reuses this.
export const leaveDialog=()=>`<div class="ov" role="dialog" aria-modal="true" aria-labelledby="leavequestion"><div class="box card-skip-box leave-box"><h2 id="leavequestion">Leave without taking anything?</h2><div class="actions"><button class="btn pri" id="leaveyes" onclick="rewLeaveAnswer(true)">Yes</button><button class="btn" id="leaveno" onclick="rewLeaveAnswer(false)">Go back</button></div></div></div>`;
const cardSelSub=n=>n?`<b>${n}</b> selected. Press Continue to add it, or tap another.`:`Tap a card to select it, then press Continue. <span class="muted">Hold a card to read it.</span>`;
function chestScr(){const S=W.S,t=stripEmoji(S.name);
 if(!S.opened)return topBar()+pkScreen({cls:'pk-chest',title:t,sub:'Something glints inside.',body:`<div class="chestwrap"><button class="chest ${S.chest}" id="openchest" onclick="openChestLid()">${emblemHTML('chest-closed','🧰','big')}<span class="muted">Tap to open</span></button></div>`,right:pkBtn('Leave it','goMap()')});
 return topBar()+pkScreen({cls:'pk-chest open',title:t,sub:'Take what you want.',body:`<div class="chestwrap open ${S.chest}" style="${anim(S.openT,600)||''}">${emblemHTML('chest-open','✨','big')}</div>${tilesRow(S.rows.map((r,i)=>rowHTML(r,i,'claimRow')),'rewtiles')}`,right:pkBtn('Proceed','goMap()',{pri:1,id:'proceed',icon:'arrowright'})})}
// ---------------- merchant (4 shelves + Scrub; prices rolled on entry) ----------------
const SHOP_MIN_CARD=60; // px: shop cards never shrink below this width (row scrolls sideways, page scrolls down instead)
function shopScr(){const S=W.S;const g=W.run.gold;const sp=scrubPrice();const coin=glyph('coin');
 const card=(it,sh,i)=>`<div data-shop-card="${sh}:${i}" class="shopitem${it.sold?' sold':''}${it.sale?' sale':''}${anim(it.noT,400)?' no':''}">${it.sold?'<div class="soldcard">SOLD</div>':cardHTML({id:it.id,uid:-100-i-(sh==='colorless'?10:0),up:false},{click:`selectShopCard('${sh}',${i})`,can:g>=it.price})}<span class="price${g<it.price?' poor':''}">${it.sold?'SOLD':(it.sale?'<s>'+Math.round(it.base)+'</s> ':'')+coin+' '+it.price}</span>${it.sale&&!it.sold?'<span class="saletag">SALE</span>':''}</div>`;
 const icon=(it,sh,i,group,def)=>`<button class="shopicon${it.sold?' sold':''}${it.right?' right':''}${anim(it.noT,400)?' no':''}" ${it.sold?'disabled':`onclick="buy('${sh}',${i})"`} title="${esc(def.n+': '+def.d)}" data-shelf="${sh}" data-i="${i}">${slotHTML(group,it.id,'',def.e)}<span class="inm">${def.n}</span><span class="price${g<it.price?' poor':''}">${it.sold?'SOLD':coin+' '+it.price}</span></button>`;
 const grp=(lbl,items,cls)=>`<div class="shgrp ${cls}"><div class="shlbl">${lbl}</div><div class="shrow">${items}</div></div>`;
 return topBar()+`<div class="shop-wren" aria-hidden="true">${emblemHTML('shop-wren','','wren')}</div>`+pkScreen({cls:'pk-shop',title:"Wren's Driftwood Bazaar",sub:`<em class="wrenline" data-info="${tesc("Quartermaster Wren: "+WREN_SIDE)}">${wrenLine(bellCount(W.run.seed),currentTier())}</em>`,
  body:`<div class="shop-main"><div class="shelf cards" id="cardshelf" style="--gw:max(${SHOP_MIN_CARD}px,calc((100cqh - 34px - 100px - 22px)*5/7))">${grp('Cards',S.cards.map((it,i)=>card(it,'cards',i)).join(''),'g-cards')}${S.colorless.length?`<div class="shgrp g-cards g-more"><div class="shrow">${S.colorless.map((it,i)=>card(it,'colorless',i)).join('')}</div></div>`:''}</div>
   <div class="shelfrow"><div class="shelf relics">${grp('Relics',S.relics.map((it,i)=>icon(it,'relics',i,'relics',RELICS[it.id])).join(''),'g-icons')}</div><div class="shelf potions">${grp('Potions',S.potions.map((it,i)=>icon(it,'potions',i,'potions',POTIONS[it.id])).join(''),'g-icons')}</div></div></div>
   <div class="shop-side">${tileHTML({eid:'scrub',id:'opt-remove',emoji:'✂️',name:'Scrub a card',sum:`${coin} ${sp}${S.scrubbed?' (used)':''}`,info:'Scrub a card: pay to remove one card from your deck for good.',click:'shopRemove()',disabled:S.scrubbed||g<sp,cls:'svc-tile'})}</div>`,
  left:pkBtn('Select a card to buy','confirmShopCard()',{id:'buyselected',dis:1}),right:pkBtn('Leave','goMap()',{pri:1,id:'leaveshop',icon:'arrowright'})})}
// ---------------- camp / event / pick / misc ----------------
const CAMP_EMO={mend:'❤️',temper:'⬆️',cook:'🍲',scour:'🪨',trawl:'⚓',annotate:'📘'};
function restScr(){return topBar()+pkScreen({cls:'pk-rest',title:'Stairwell Camp',sub:'The fire crackles. Choose one.',body:tilesRow(campOptions().map(o=>{const sp=splitLabel(o.l);return tileHTML({id:'camp-'+o.k,emoji:CAMP_EMO[o.k]||sp.emoji||'🔥',name:sp.name,sum:o.d,click:`campDo('${o.k}')`,cls:'k-camp'+(o.k==='mend'?' pri':''),tid:'camp-'+o.k})}),'camptiles')})}
function eventScr(){return topBar()+eventSceneHTML(W.S.ev)}
function pickScr(){const S=W.S,list=window.pickable(S.mode,S.filter);const up=S.mode==='upgrade';
 return topBar()+pkScreen({cls:'pk-pick'+(up?' pk-up':''),title:stripEmoji(S.title),sub:cardSelSub(null),
  body:`<div class="grid pickgrid${up?' upgrade-grid':''}">${list.map(c=>`<div class="pick-option" data-pick="${c.uid}" aria-selected="false">${cardHTML(c,{click:`selectPickCard(${c.uid})`})}</div>`).join('')}</div><div id="upgradecompare" aria-live="polite"></div>`,
  left:pkBtn(S.cancel?'Cancel':'Skip','pickCancel()',{id:'pickcancel'}),right:pkBtn('Continue','pickConfirm()',{pri:1,id:'pickcontinue'}),after:S.skipConfirm?skipDialog('pickSkipAnswer'):''})}
function skipDialog(action){return `<div class="ov" role="dialog" aria-modal="true"><div class="box card-skip-box"><h2>No card has been selected. Do you wish to continue?</h2><label class="chk"><input type="checkbox" id="skipdont"><span>Don't show this again</span></label><div class="actions"><button class="btn pri" id="skipyes" onclick="${action}(true,document.getElementById('skipdont').checked)">Yes</button><button class="btn" id="skipno" onclick="${action}(false)">No</button></div></div></div>`}
function highlightUpgradeText(old,next){const a=(old.textContent||'').split(/(\s+)/),b=(next.textContent||'').split(/(\s+)/),dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?1+dp[i+1][j+1]:Math.max(dp[i+1][j],dp[i][j+1]);const same=new Set();let i=0,j=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){same.add(j);i++;j++}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++}const out=document.createElement('span');b.forEach((text,k)=>{if(same.has(k)||!text.trim())out.append(text);else{const mark=document.createElement('b');mark.className='upgrade-change';mark.textContent=text;out.append(mark)}});next.replaceChildren(out)}
export function updateCardSelection(){const S=W.S;
 if(S.screen==='reward'){document.querySelectorAll('.rewgrid .rcw').forEach((el,j)=>{el.classList.toggle('reward-selected',S.cardSelected===j);el.setAttribute('aria-selected',S.cardSelected===j)});const sb=document.getElementById('pksub');if(sb)sb.innerHTML=cardSelSub(S.cardSelected!=null?CARDS[S.rows[S.cardsOpen].cards[S.cardSelected]].n:null)}
 if(S.screen==='shop'){document.querySelectorAll('[data-shop-card]').forEach(el=>el.classList.toggle('reward-selected',el.dataset.shopCard===S.shopSelected));const btn=document.getElementById('buyselected');if(btn){btn.disabled=!S.shopSelected;const sp=btn.querySelector('span');if(sp)sp.textContent=S.shopSelected?'Buy selected card':'Select a card to buy'}}
 if(S.screen==='pick'){document.querySelectorAll('[data-pick]').forEach(el=>{const on=+el.dataset.pick===S.pickSelected;el.classList.toggle('reward-selected',on);el.setAttribute('aria-selected',on)});const box=document.getElementById('upgradecompare'),ci=W.run.deck.find(c=>c.uid===S.pickSelected);
 if(box){box.innerHTML=ci&&S.mode==='upgrade'?`<div><b>Current</b>${cardHTML(ci)}</div><div class="upgrade-after"><b>After Temper</b>${cardHTML({...ci,up:true})}</div>`:'';
 if(ci&&S.mode==='upgrade'){for(const q of ['.cost','.text']){const old=box.querySelector(q),next=box.querySelector('.upgrade-after '+q);if(old?.textContent!==next?.textContent&&next){if(q==='.cost')next.classList.add('upgrade-change');else highlightUpgradeText(old,next)}}decorateKeywords(box);fitCards(box)}}}
}
function potPickScr(){const S=W.S;const free=W.run.potions.filter(p=>!p).length;return topBar()+pkScreen({cls:'pk-potpick',title:stripEmoji(S.title),sub:`Pick up to ${Math.min(3,free)} (free slots: ${free}).`,body:tilesRow(S.ids.map((id,j)=>potionTile(id,{click:`potPickToggle(${j})`,on:S.chosen.includes(j)})),'pottiles'),right:pkBtn('Done','potPickDone()',{pri:1,id:'potpickdone'})})}
function endScr(){const run=W.run,K=CLASSES[run.cls],st=run.stats;const mins=Math.round(((st.endT||Date.now())-st.startT)/60000);const sum=run.lamp&&run.lamp.summary;
 const stat=(k,v,g)=>`<span class="es" title="${k}" aria-label="${k}: ${v}">${glyph(g)}<b>${v}</b></span>`;
 return `<div class="end${sum?' withlamp':''}"><div class="endl"><div class="big">${glyph(run.won?'crown':'skull')}</div><h1 class="etitle">${run.won?'Act 1 cleared!':'Defeated'}</h1><p class="sub">${run.won?`${K.n} silenced ${EN[run.boss].n}.`:`${K.n} fell on floor ${run.floor} of 15. ${deathLine(run.floor,run.boss)}`}</p>
 <div class="endstats">${stat('Enemies',run.kills,'sword')}${stat('Elites',st.elites.reduce((a,b)=>a+b,0),'skull')}${stat('Relics',run.relics.length,'gem')}${stat('Deck',run.deck.length,'book')}${stat('Gold',run.gold,'coin')}${stat('Biggest hit',st.maxHit,'bolt')}${stat('Time',mins+' min','moon')}${stat('Seed',run.seed,'dice')}</div>
 <button class="endlink" id="restart" onclick="W.S={screen:'title'};render()">${glyph('undo')}<span>Play again</span></button></div>${lampSummaryHTML(sum)}</div>`}
// Keep a pristine HTML tree separate from the decorated, animated live DOM. Comparing
// sources preserves fitted text, sprite animations and stage styles on unchanged nodes.
let renderTree=null,renderedCombat=null;
// Per-screen cleanup registry: transient layers (trails, toasts, overlays) register a remover and it runs once when the screen changes.
const screenCleanups=new Set();export function onScreenLeave(fn){screenCleanups.add(fn)}
function runScreenCleanups(){for(const fn of [...screenCleanups]){screenCleanups.delete(fn);try{fn()}catch(_){}}}
const liveNodes=new WeakMap();
const nodeKey=n=>n.nodeType===1?`${n.tagName}:${n.id|| (n.hasAttribute('data-uid')?'card:'+n.dataset.uid+':'+n.dataset.id:n.hasAttribute('data-en')?'enemy:'+n.dataset.en+':'+n.dataset.key:n.classList[0]||'')}`:'#text';
function bindTree(source,live){liveNodes.set(source,live);source.childNodes.forEach((n,i)=>bindTree(n,live.childNodes[i]))}
function transferTree(old,next){liveNodes.set(next,liveNodes.get(old));next.childNodes.forEach((n,i)=>transferTree(old.childNodes[i],n))}
function patchNode(old,next){const live=liveNodes.get(old);
 if(!live||!live.isConnected)return null;
 if(old.isEqualNode(next)){transferTree(old,next);return live}
 liveNodes.set(next,live);
 if(next.nodeType!==1){live.nodeValue=next.nodeValue;return live}
 const attrs=new Set([...old.attributes,...next.attributes].map(a=>a.name));
 for(const name of attrs){const before=old.getAttribute(name),after=next.getAttribute(name);if(before===after)continue;
  if(name==='style'){const props=new Set([...old.style,...next.style]);for(const prop of props){if(old.style.getPropertyValue(prop)===next.style.getPropertyValue(prop)&&old.style.getPropertyPriority(prop)===next.style.getPropertyPriority(prop))continue;
    if(next.style.getPropertyValue(prop))live.style.setProperty(prop,next.style.getPropertyValue(prop),next.style.getPropertyPriority(prop));else live.style.removeProperty(prop);if(prop==='top'&&live.classList.contains('plate'))delete live.dataset.top}}
  else if(name==='class'){for(const c of old.classList)if(!next.classList.contains(c))live.classList.remove(c);for(const c of next.classList)if(!old.classList.contains(c))live.classList.add(c)}
  else if(after===null)live.removeAttribute(name);else live.setAttribute(name,after);
 }
 patchChildren(old,next,live);return live;
}
function patchChildren(old,next,live){
 // A decorator may have replaced a text node with keyword/card-reference spans.
 // Rebuild only that changed text container, leaving all other branches intact.
 if([...old.childNodes].some(n=>liveNodes.get(n)?.parentNode!==live)){
  live.replaceChildren(...[...next.childNodes].map(n=>n.cloneNode(true)));next.childNodes.forEach((n,i)=>bindTree(n,live.childNodes[i]));return;
 }
 const pools=new Map();for(const n of old.childNodes){const k=nodeKey(n);if(!pools.has(k))pools.set(k,[]);pools.get(k).push(n)}
 let cursor=live.firstChild;
 for(const n of next.childNodes){const prev=pools.get(nodeKey(n))?.shift();let el=prev?patchNode(prev,n):null;
  if(!el){el=n.cloneNode(true);bindTree(n,el)}
  if(el!==cursor)live.insertBefore(el,cursor);cursor=el.nextSibling;
 }
 for(const pool of pools.values())for(const n of pool)liveNodes.get(n)?.remove();
}
// The pristine tree is parsed inside <template> (an inert document): a detached <div> with <img srcset> keeps every parsed tree alive in Chrome (~340 nodes per render).
function updateHTML(app,html,reset){const tpl=document.createElement('template');tpl.innerHTML=html;const next=tpl.content;
 if(reset||!renderTree){app.replaceChildren(...[...next.childNodes].map(n=>n.cloneNode(true)));bindTree(next,app)}
 else{liveNodes.set(next,app);patchChildren(renderTree,next,app)}renderTree=next;
}

// ---------------- render ----------------
export function render(){if(W.previewing||W.replaying)return;if(drag||(W.chartDrag&&Date.now()-W.chartDrag<10000))return;clearOutcome();const a=document.getElementById('app');let h='';const s=W.S.screen;
 if(inspecting&&(inspectContext.screen!==s||inspectContext.run!==W.run||inspectContext.cb!==W.cb||inspectContext.ov!==W.S.ov))inspecting=null;
 if(s==='title')h=titleScr();
 else if(s==='travel')h=travelScr();
 else if(s==='map')h=`<div class="page mappage runhud">`+topBar()+mapHTML(true)+'</div>';
 else if(s==='combat'&&W.cb)h=combatScr();
 else{const fit=['reward','shop','pick','chest','rest','event','potpick','msg'].includes(s);const hud=!!W.run&&s!=='travel';h=`<div class="page ${fit?'fit fit-'+s:''}${hud?' runhud':''}">`;
  if(s==='reward')h+=rewardScr();else if(s==='chest')h+=chestScr();else if(s==='shop')h+=shopScr();else if(s==='rest')h+=restScr();else if(s==='event')h+=eventScr();
  else if(s==='pick')h+=pickScr();else if(s==='potpick')h+=potPickScr();
  else if(s==='msg')h+=topBar()+`<div class="panel msgp"><h2>${W.S.title}</h2><p>${W.S.text}</p></div><div class="actions"><button class="btn pri" id="msgok" onclick="continueMessage()">Continue</button></div>`;
  else if(s==='end')h+=(hud?topBar():'')+endScr();
  h+='</div>'}
 if(W.run&&s!=='title'&&s!=='end')h+=popHTML();
 if(W.S.ov==='map'&&W.run){h+=`<div class="ov" id="ovl" onclick="if(event.target===this){W.S.ov=null;render()}"><div class="box mapbox">${mapHTML(false)}<button class="btn full" onclick="W.S.ov=null;render()">Close map</button></div></div>`}
 else if(W.S.ov==='tasks'&&W.run){h+=tasksHTML()}
 else if(W.S.ov==='settings'){h+=`<div class="ov" id="ovl" onclick="if(event.target===this){W.S.ov=null;render()}"><div class="box plain"><h2>Settings</h2>${settingsHTML()}${W.run?`<div class="muted">Seed ${W.run.seed}</div>`:''}<button class="btn full" onclick="W.S.ov=null;render()">Close</button></div></div>`}
 else if(W.S.ov&&W.run){const cb=W.cb;const list=W.S.ov==='deck'?W.run.deck:cb?(W.S.ov==='draw'?(W.run.cls==='carto'?cb.draw:cb.draw.slice().sort((a,b)=>a.id<b.id?-1:1)):W.S.ov==='disc'?cb.disc:cb.exh):[];
  const t={deck:'Your deck',draw:W.run.cls==='carto'?'Draw pile (in order: face up)':'Draw pile (order hidden)',disc:'Discard pile',exh:'Sunk this combat'}[W.S.ov];
  h+=`<div class="ov" id="ovl" onclick="W.S.ov=null;render()"><div class="box plain deckbox"><h2>${t} (${list.length})</h2><div class="grid small">${list.map(c=>cardHTML(c)).join('')||'<span class="muted">Empty</span>'}</div><button class="btn full">Close</button></div></div>`}
 if(inspecting)h+=inspectHTML();
 const prev=a.dataset.screen;const changed=prev!==s;
 if(changed){a.dataset.screen=s;runScreenCleanups();screenChange(a,prev,s)}
 updateHTML(a,h,changed||(s==='combat'&&renderedCombat!==W.cb));renderedCombat=s==='combat'?W.cb:null;
 // Input used a full rebuild to clear temporary drag poses after drop/cancel.
 // Reused nodes need the same cleanup once the drag render gate is released.
 for(const el of a.querySelectorAll('.hand .card.drag,.cslot')){el.style.transform='';el.classList.remove('drag','armed','lift','over-zone')}
 for(const el of a.querySelectorAll('.en.hot,.foes.armed,.chartbox.dragging,.cbottom.hot'))el.classList.remove('hot','armed','dragging');
 fitRelics();decorateCardRefs(a);decorateKeywords(a);fitCards(a);if(inspecting)placeHeldInspect();if(s==='pick')updateCardSelection();
 if(s==='combat'){layoutHand();placeDetail()}
 syncEnv();syncStage();syncAudio();syncCombatAnimations();
 if(s==='map'&&!W.S.ov){const n=a.querySelector('.node.av');if(n)n.scrollIntoView({block:'center'})}}
// Fit text within the printed frame areas; never grow a panel into the illustration.
const fittedCards=new WeakMap(),fitCache=new Map();let fitEpoch=0;
function fitSignature(c){return [fitEpoch,innerWidth,innerHeight,devicePixelRatio,c.dataset.id,c.dataset.up,
 ...['.name','.cost','.type','.text'].map(q=>{const el=c.querySelector(q);return el?.innerHTML+'@'+el?.getAttribute('style')})].join('|')}
function measureCardBox(box){const style=getComputedStyle(box);
    const width=box.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
    const height=box.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
 return ()=>{const range=document.createRange();range.selectNodeContents(box);
      const rects=[...range.getClientRects()],r=box.getBoundingClientRect();
      const sx=r.width/box.offsetWidth,sy=r.height/box.offsetHeight;
      return box.scrollWidth<=box.clientWidth+1&&box.scrollHeight<=box.clientHeight+1&&
        rects.every(q=>q.width<=width*sx+.5&&q.height<=height*sy+.5&&q.top>=r.top+parseFloat(style.paddingTop)*sy-.5&&q.bottom<=r.bottom-parseFloat(style.paddingBottom)*sy+.5);
 };
}
export function fitCards(root=document){const work=[];
 for(const c of root.querySelectorAll('.card')){
  const content=[c.dataset.id,c.dataset.up,...['.name','.cost','.type','.text'].map(q=>c.querySelector(q)?.innerHTML)].join('|');
  const context=[];for(let p=c.parentElement;p&&p!==root;p=p.parentElement)context.push(p.className+'@'+(p.getAttribute('style')||''));
  const stamp=`${fitEpoch}|${innerWidth}|${innerHeight}|${devicePixelRatio}|${c.style.width}|${c.style.height}|${context.join('/')}|${content}`;
  if(fittedCards.get(c)===stamp||!c.offsetWidth||!c.offsetHeight)continue;
  work.push({c,context,stamp,transform:c.style.transform,transition:c.style.transition});
 }
 // Prepare the whole batch before measuring. Applying one cached card at a time
 // otherwise forces a new layout for every card in a freshly drawn hand.
 for(const {c} of work){c.style.transition='none';c.style.transform='none';const print=c.querySelector('.card-print');if(print)print.style.transform='none'}
 for(const w of work){const rect=w.c.getBoundingClientRect();
  w.key=[fitSignature(w.c),rect.width,rect.height,w.context.map(p=>p.split('@')[0]).join('/')].join('|');w.cached=fitCache.get(w.key);
 }
 for(const {c,cached} of work)if(cached){
  for(const [q,style] of cached.panels){const box=c.querySelector(q);if(box){if(style===null)box.removeAttribute('style');else box.setAttribute('style',style)}}

 }
 for(const w of work)if(w.cached){
  // Validate inherited typography and fractional glyph rounding on every hit.
  w.valid=['.name','.cost','.type','.text'].every(q=>{const box=w.c.querySelector(q);return !box||!box.clientHeight||measureCardBox(box)()});
 }
 for(const {c,key,valid} of work){if(valid)continue;
  c.classList.remove('grown');c.style.removeProperty('--tt');
  for(const selector of ['.name','.cost','.type','.text']){
    const box=c.querySelector(selector);if(!box||!box.clientHeight)continue;
    box.style.removeProperty('font-size');box.style.removeProperty('line-height');
    box.style.removeProperty('letter-spacing');box.style.top='';box.style.height='';
    box.classList.remove('tight');
    const child=box.firstElementChild;
    if(selector==='.name'&&child)child.style.transform='';
    const fits=measureCardBox(box);
    if(selector==='.name'){
      // Title size never changes: condense by letter-spacing, then squeeze up to 15%.
      box.style.setProperty('font-size',CARD_TYPE.name+'px','important');if(fits()||!child)continue;
      for(const ls of [-.01,-.02,-.03]){box.style.setProperty('letter-spacing',ls+'em');if(fits())break}
      if(!fits()){const avail=box.clientWidth-parseFloat(getComputedStyle(box).paddingLeft)-parseFloat(getComputedStyle(box).paddingRight);
        const sq=Math.max(CARD_TYPE.nameSqMin,Math.min(1,avail/child.offsetWidth-.005));child.style.transform=`scaleX(${sq.toFixed(3)})`;
        if(child.offsetWidth*sq>avail+.5){box.dataset.nofit='1';child.style.transform=`scaleX(${(avail/child.offsetWidth-.005).toFixed(3)})`}else delete box.dataset.nofit} // nofit = rename candidate (see design/CARD-TEXT-AUDIT.md)
      continue}
    if(selector==='.text'){
      box.style.setProperty('font-size',CARD_TYPE.text+'px','important');if(fits())continue;
      box.classList.add('tight');box.style.setProperty('font-size',CARD_TYPE.textStep+'px','important');if(fits())continue;
      // Last resort only (audit reports these): shrink until it fits so text never overflows.
      let lo=6,hi=CARD_TYPE.textStep;for(let i=0;i<8;i++){const mid=(lo+hi)/2;box.style.setProperty('font-size',mid+'px','important');if(fits())lo=mid;else hi=mid}
      box.style.setProperty('font-size',lo+'px','important');continue}
    const px=parseFloat(getComputedStyle(box).fontSize);let lo=.5,hi=px;
    if(!fits()){for(let i=0;i<8;i++){const mid=(lo+hi)/2;box.style.setProperty('font-size',mid+'px','important');if(fits())lo=mid;else hi=mid}
      box.style.setProperty('font-size',lo+'px','important');}
  }
  fitCache.set(key,{panels:['.name','.cost','.type','.text'].map(q=>[q,c.querySelector(q)?.getAttribute('style')??null])});
  if(fitCache.size>2048)fitCache.delete(fitCache.keys().next().value);
 }
 for(const {c,transform,transition,stamp} of work){c.style.transform=transform;c.style.transition=transition;const print=c.querySelector('.card-print');if(print)print.style.transform='';fittedCards.set(c,stamp)}
}
if(typeof document!=='undefined'&&document.fonts){
 const fontsChanged=()=>{fitEpoch++;fitCache.clear();fitCards(document);if(document.getElementById('hand'))layoutHand()};
 document.fonts.ready.then(fontsChanged);document.fonts.addEventListener('loadingdone',fontsChanged);
}
if(typeof window!=='undefined'){let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{fitRelics();fitCards(document);layoutHand()})})}
// ===== long-press (or right-click) to enlarge any card =====
export let inspecting=null;
let inspectContext=null;
export function openInspect(ci,point=null,side=null){
 if(inspecting&&inspectContext?.side&&!side&&document.querySelector('#inspect.held-hand'))return; // a held preview keeps its side for the whole hold
 inspecting=ci;inspectContext={screen:W.S.screen,run:W.run,cb:W.cb,ov:W.S.ov,point,side};render()
}
function placeHeldInspect(){
 const point=inspectContext?.point,panel=document.querySelector('#inspect .insp');if(!panel)return;
 panel.classList.add('held-preview');const r=panel.getBoundingClientRect(),gap=60;
 const side=inspectContext?.side;panel.closest('#inspect')?.classList.toggle('held-hand',!!side);
 if(side){const rail=panel.querySelector('.inspect-keywords');const kw=rail?rail.getBoundingClientRect().width+6:0;const m=Math.max(12,innerWidth*.04);
  panel.style.left=(side==='left'?m:innerWidth-r.width-m)+'px';panel.style.top=Math.max(8,Math.min(innerHeight-r.height-8,(innerHeight-r.height)/2-innerHeight*.06))+'px';
  if(rail){rail.style.left=side==='left'?'calc(100% + 3px)':(-kw)+'px';const top=Math.max(panel.getBoundingClientRect().top,topBarBottom());rail.style.maxHeight=Math.max(60,innerHeight-8-top)+'px';rail.style.top=(top-panel.getBoundingClientRect().top)+'px'}return}
 if(!point){panel.style.left=(innerWidth-r.width)/2+'px';panel.style.top=(innerHeight-r.height)/2+'px';placeInspectKeywords(panel);return}
 let x=point.x-r.width/2,y=point.y-r.height-gap;
 if(y<8){x=point.x+gap+r.width<=innerWidth-8?point.x+gap:point.x-r.width-gap;y=(innerHeight-r.height)/2}
 panel.style.left=Math.max(8,Math.min(innerWidth-r.width-8,x))+'px';
 panel.style.top=Math.max(8,Math.min(innerHeight-r.height-8,y))+'px';placeInspectKeywords(panel)
}
// v0.6.2: keyword windows never sit over the shared top bar; returns the y they must stay below (8px if no bar is visible).
export function topBarBottom(){let b=8;for(const t of document.querySelectorAll('.topbar')){const r=t.getBoundingClientRect();if(r.height>0&&r.bottom>0&&r.top<innerHeight*.4&&getComputedStyle(t).visibility!=='hidden')b=Math.max(b,r.bottom+4)}return b}
export function placeInspectKeywords(panel){const rail=panel.querySelector('.inspect-keywords');if(!rail)return;const r=panel.getBoundingClientRect(),w=rail.getBoundingClientRect().width;
 // Glossary rail sits beside the card (right if it fits, else left) and is clamped fully on screen; it scrolls inside its own max height.
 const right=r.right+w+4<=innerWidth||r.left-w-3<0;let x=right?r.width+3:-w-3;const abs=r.left+x;if(abs<4)x+=4-abs;else if(abs+w>innerWidth-4)x-=abs+w-(innerWidth-4);
 const tb=topBarBottom(),room=Math.max(60,innerHeight-8-tb);rail.style.left=x+'px';rail.style.maxHeight=room+'px';rail.style.overflowY='auto';rail.style.touchAction='pan-y';
 const h=Math.min(rail.scrollHeight,room);rail.style.top=Math.max(tb-r.top,Math.min(0,innerHeight-8-h-r.top))+'px'}
export function closeInspect(){inspecting=null;render()}
export function inspectKeywordsHTML(ci){const sc=W.cb&&W.cb.hand.includes(ci)?costSurcharge(ci):[];
 return sc.map(x=>`<div class="keyword-window surch"><span>${x.why}</span></div>`).join('')+kwList(ci).map(k=>`<div class="keyword-window"><b>${k.replace(/ X$/,'')}</b><span>${shortText(k.replace(/ X$/,''))||KW[k]}</span></div>`).join('')}
export function inspectHTML(){const ci=inspecting,d=CARDS[ci.id];if(!d)return'';
 return `<div class="ov inspect" id="inspect" onclick="closeInspect()"><div class="insp">${cardHTML(ci,{full:true})}<div class="inspect-keywords">${inspectKeywordsHTML(ci)}</div><div class="ikw"><b>${cname(ci)}</b> <span class="muted">${TYPEN[d.t]} · ${RARN[d.r]||''}</span><div>${desc(ci)}</div><div class="kws">${kwFor(ci)}</div>${d.flavour?`<div class="flav">${d.flavour}</div>`:''}<div class="muted">Tap anywhere to close</div></div></div></div>`}

export function tgt(...args){return savedAction('tgt',args,()=>tgtImpl(...args))}
