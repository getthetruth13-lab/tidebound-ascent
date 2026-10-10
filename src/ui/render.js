import {showOutcome} from './outcome.js';
import {intentIcon} from './intent-icons.js';
import {daisHTML} from './classdais.js';
import {placeDetail} from './place.js';
// ui/render.js — all screens as HTML strings. Inline handlers call the globals main.js exposes.
// Player-facing terminology follows design-v2 §0.3 (Guard, Might, Soaked, Exposed, Sink).
import {barHTML,statusRowHTML,playerStates} from './combatant.js';
import {CARD_ART,assetEntry,slotHTML,uiIcon,spriteFor,iconHTML,SPRITE_BASELINE} from '../assets.js';
import {syncAudio} from '../audio.js';
import {syncEnv,envFxSettingLabel} from './env.js';
import {groundY,stageAtmosphereHTML,syncStage} from './stage.js';
import {deathLine} from '../data/places.js';
import {CARDS,CLASSES,TYPEN,RELICS,POTIONS,CHARMS,EN,KW,ENV} from '../core/registry.js';
import {loadRunData,settings,saveSettings} from '../save.js';
import {loadProfile,saveProfile} from '../progress.js';
import {W} from '../core/state.js';
import {cname,cost,desc,kwFor,needsTarget,isUp,baseCost} from '../engine/cards.js';
import {alive,canPlay,curTgt,eAtk,intentOf,echoPlan,echoPreview,canMark,fbLabel,markBonus,releaseBank,flourishMin,flourishMult,hasRelic,CORE,canDrink,potionNeedsTarget,expCount} from '../engine/combat.js';
import {mod} from '../core/bus.js';
import {campOptions,scrubPrice,reachable,bootsLeft,cardOdds} from '../engine/run.js';
import {anim,syncCombatAnimations} from './fx.js';
import {screenChange,motionEnabled} from './anim.js';
import {drag} from './input.js';
import {mapHTML} from './map.js';
import {titleScr} from './screens/title.js';
import {decorateKeywords} from './kwtip.js';
import {decorateCardRefs} from './cardref.js';
import {tileHTML,tilesRow,relicTile,potionTile,optionHTML,emblemHTML,splitLabel,esc as tesc} from './tiles.js';
import {lampSummaryHTML,tasksHTML,lampBtnLabel} from './screens/lamp.js';
import {relicFlavour,ferrymanLine,bellCount,wrenLine,WREN_SIDE,currentTier,ENEMY_FLAVOUR} from '../data/lore.js';
export const TH={tide:'tidecaller',echo:'echo-mage',carto:'cartographer',duel:'duelist',status:'',curse:'',colorless:''};
const RARN={s:'Starter',c:'Common',u:'Uncommon',r:'Rare',x:'Special'};
const esc=s=>String(s).replace(/"/g,'&quot;');
const lbl=o=>typeof o.l==='function'?o.l():o.l;
// ---------------- cards ----------------
// Card art window: per-card art when it exists, else the class card painting cropped 4:3 (never an emoji).
function cardArtHTML(id,d,full){if(assetEntry('cards',id))return slotHTML('cards',id,'art','');const P=CARD_ART[id];
 if(P)return `<div class="slot art has-img ph-art painted" data-asset="cardArt.${id}"><img src="${full?P.art:P.thumb}" alt="" draggable="false" decoding="async" onerror="this.remove()"></div>`;const k=d.curse?'curse':d.cls==='status'?'status':TH[d.cls]?d.cls:'colorless';
 const a=assetEntry('cardPH',k);return `<div class="slot art has-img ph-art" data-asset="cardPH.${k}"><img src="${a.src}" srcset="${a.srcset}" sizes="${a.sizes}" alt="" draggable="false" decoding="async" onerror="this.remove()"></div>`}
// B12: one short rules line on resting landscape hand cards (the dark panel sits below the fold). Full text if it fits on one
// 10px line, else the first sentence, else a gold "Tap to read" chip. A tap lifts the card with no transition.
const plain=h=>String(h).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
function restLineHTML(ci,d){const t=plain(d.unplay?desc(ci).replace(/^(<[^>]+>)?Unplayable\.(<\/[^>]+>)?\s*/,''):desc(ci));if(!t)return'';const first=(t.match(/^[^.]*\.?/)||[t])[0];
 return `<span class="rline" data-full="${esc(t)}" data-first="${esc(first)}">${esc(t)}</span>`}
// Preferred title size; the measured fitter handles the final frame dimensions.
const nameFit=n=>Math.max(11,Math.min(12.5,74/(Math.max(6,n.length)*.53))); // fitCards() shrinks longer names within the plate
// Preferred rules size; fitCards() keeps the complete text inside the rules panel.
export const textFit=t=>{const len=String(t).replace(/<[^>]+>/g,'').length;return Math.max(5.8,Math.min(9.6,60/Math.sqrt(Math.max(20,len))))};
// Collector line: "DS 042/173" = set mark + stable number among all cards (registry order) / total.
const SETMARK={tide:'TC',echo:'EM',carto:'CA',duel:'DU'};let setIdx=null;
function setNo(id){if(!setIdx){setIdx={};Object.keys(CARDS).forEach((k,i)=>setIdx[k]=i+1);setIdx._n=Object.keys(CARDS).length}const p=n=>String(n).padStart(3,'0');return `DS ${p(setIdx[id]||0)}/${p(setIdx._n)}`}
export function isNewCard(id){try{return !loadProfile().seen.card[id]&&!(W.run&&W.run.deck.some(c=>c.id===id))}catch(_){return false}}
export function markCardsSeen(ids){try{const p=loadProfile();for(const id of ids)p.seen.card[id]=1;saveProfile(p)}catch(_){}}
export function cardBackHTML(){return `<div class="cardback"><svg class="cbem" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="#cfd8e6" stroke-width="1" opacity=".7"/><path d="M20 6v18M16 24h8M17 12h6M5 28c4-4 7-4 10 0s6 4 10 0 7-4 10 0" fill="none" stroke="#f2c14e" stroke-width="1.6" stroke-linecap="round"/><path d="M13 34h14" stroke="#cfd8e6" stroke-width="1.4" stroke-linecap="round"/></svg></div>`}
export function cardHTML(ci,o={}){const d=CARDS[ci.id];const c=cost(ci);const base=baseCost(ci);
 const up=isUp(ci);
 const cls=['card','t'+d.t,'r-'+d.r,'theme-'+(TH[d.cls]||''),o.sel?'sel':'',o.can===false?'unp':'',d.curse?'curse':'',d.cls==='status'?'status':'',o.mark?'markable':'',o.flourish?'flourishable':'',ci.open?'opening':'',d.unplay?'nocost':''].filter(Boolean).join(' ');
 return `<div class="${cls}" ${o.click?`onclick="${o.click}"`:''} data-id="${ci.id}" data-uid="${ci.uid}" data-up="${up?1:0}"${o.i!=null?` data-i="${o.i}"`:''}>
 <i class="cfr"></i>${cardArtHTML(ci.id,d,!!(o.sel||o.full))}
 <span class="cost${c<base?' cheap':c>base?' dear':''}">${d.unplay?'':(d.c==='X'?'X':c)}</span><span class="name" style="--nf:${nameFit(d.n+(up?'+':'')).toFixed(2)}cqw"><span class="nmi">${d.n}${up?'<span class="up">+</span>':''}</span></span><span class="type"${d.unplay?' title="Unplayable"':''}>${d.unplay?'⛔ ':''}${TYPEN[d.t]}</span>${restLineHTML(ci,d)}<span class="text" style="--tf:${textFit(desc(ci)).toFixed(2)}cqw"><span>${d.unplay?desc(ci).replace(/^(<[^>]+>)?Unplayable\.(<\/[^>]+>)?\s*/,''):desc(ci)}${ci.sus?` <b class="sus">(+${ci.sus})</b>`:''}</span></span>${d.r!=='s'&&d.r!=='x'?`<span class="rarity ${d.r}"></span>`:''}${o.full?`<span class="setno">${setNo(ci.id)}</span>`:''}<i class="foil"></i>${o.isNew?'<span class="newseal">NEW</span>':''}${ci.open&&!d.open?'<span class="openpip" title="Opening">⚓</span>':''}${o.mark?'<span class="bell">🔔</span>':''}</div>`}
// ---------------- top bar: HP, gold, floor, potions, relics ----------------
// Etched bronze lantern (Lantern Tasks): vector so it stays crisp and glows amber.
const LANTERN_SVG='<svg class="uic lantern" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3.5h6M12 3.5v2" fill="none" stroke="#c9a05a" stroke-width="1.6" stroke-linecap="round"/><path d="M8 7h8l1.4 2v7.2L16 19H8l-1.4-2.8V9z" fill="#3a2a15" stroke="#c9a05a" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 9.2c1.8 1.7 2.2 3 .9 4.4-.5.5-1.3.5-1.8 0-1.2-1.3-.7-2.7.9-4.4z" fill="#ffc45a"/><path d="M7.5 19.8h9" stroke="#c9a05a" stroke-width="1.6" stroke-linecap="round"/></svg>';
export function topBar(){const K=CLASSES[W.run.cls];return `<div class="topbar theme-${TH[W.run.cls]}"><span class="who">${slotHTML('portraits',W.run.cls,'pt',K.e)}<span class="nm">${K.n}</span></span>
 <span class="stat hp" style="color:var(--status-damage)">${iconHTML('hud','heart','❤️')} ${Math.max(0,W.run.hp)}/${W.run.max}</span><span class="stat gold" style="color:var(--rarity-rare)">${iconHTML('hud','gold','💰')} ${W.run.gold}</span><span class="stat floor">${iconHTML('hud','floor','🏔️')} ${W.run.floor}/15</span>${potionSlots()}${relicBar()}<span class="sp"></span>
 ${W.run.lamp?`<button class="mini" id="lampbtn" onclick="openOv('tasks')" title="Lantern Tasks">${LANTERN_SVG} ${lampBtnLabel()}</button>`:''}<button class="mini" id="deckbtn" onclick="openOv('deck')" title="Deck">${iconHTML('hud','deck','🂠')} ${W.run.deck.length}</button><button class="mini" id="mapbtn" onclick="openOv('map')" title="Map">${iconHTML('hud','map','🗺️')}</button><button class="mini" id="setbtn" onclick="openOv('settings')" title="Settings">${iconHTML('hud','settings','⚙️')}</button></div>${toastsHTML()}`}
export function potionSlots(){const ps=W.run.potions;return `<span class="potions" id="potions">${ps.map((id,i)=>{const p=id&&POTIONS[id];
 return `<button class="potion${p?'':' empty'}${W.S.potion===i?' on':''}" data-potion="${i}" ${p?`style="--pcol:${p.col}"`:''} title="${p?esc(p.n+': '+p.d):'Empty potion slot: potions you find wait here.'}" onclick="potionTap(${i})">${p?slotHTML('potions',id,'',p.e):''}</button>`}).join('')}</span>`}
export function relicBar(){const rs=W.run.relics;const now=Date.now();return `<div class="relics" id="relicbar">${rs.map(r=>{const d=RELICS[r.id];if(!d)return'';const fl=r.flashT&&now-r.flashT<900;
 const cnt=r.id==='starfish'||r.id==='boots'?r.n:'';return `<button class="relic${fl?' flash':''}${r.used?' used':''}" title="${esc(d.n+': '+d.d)}" data-relic="${r.id}" onclick="relicTap('${r.id}')">${slotHTML('relics',r.id,'',d.e)}${cnt!==''?`<i class="cnt">${cnt}</i>`:''}</button>`}).join('')}${(W.run.charms||[]).map(c=>`<button class="relic charm" title="${esc(CHARMS[c].n+': '+CHARMS[c].d)}" onclick="relicTap('charm:${c}')">${slotHTML('relics','charm:'+c,'',CHARMS[c].e)}</button>`).join('')}</div>`}
export function toastsHTML(){const now=Date.now();const t=(W.toasts||[]).filter(x=>now-x.t<2600);if(!t.length)return'';return `<div class="toasts">${t.map(x=>`<div class="toast t-${x.cls||""}" style="animation-delay:-${now-x.t}ms">${x.txt}</div>`).join('')}</div>`}
export function potionTap(i){if(drag)return;const id=W.run.potions[i];if(!id){W.S.potion=null;return render()}W.S.potion=W.S.potion===i?null:i;W.S.relicView=null;render()}
export function relicTap(id){if(drag)return;W.S.relicView=W.S.relicView===id?null:id;W.S.potion=null;render()}
export function closePop(){W.S.potion=null;W.S.relicView=null;render()}
function popHTML(){const S=W.S;
 if(S.potion!=null&&W.run.potions[S.potion]){const id=W.run.potions[S.potion],p=POTIONS[id];const can=canDrink(id);const tg=potionNeedsTarget(id);
  const why=!W.cb&&!p.outside?'Use it in combat':p.passive?'Works automatically when you would die':W.cb&&(W.cb.busy||W.cb.mode)?'Wait for your turn':!can?'Can\'t use this here':'';
  return `<div class="pop potpop" id="potpop" onclick="event.stopPropagation()"><div class="itemhead">${slotHTML('potions',id,'itemart',p.e)}<div><b>${p.n}</b> <span class="muted">${RARN[p.rarity]}${p.cls?' · '+CLASSES[p.cls].n:''}</span><div>${p.d}</div></div></div>
  ${tg&&can&&W.cb?`<div class="muted">Targets: ${curTgt()?curTgt().n:'—'} (tap an enemy first to change)</div>`:''}<div class="row"><button class="btn pri" id="drinkbtn" ${can?'':'disabled'} onclick="drinkPotion(${S.potion});W.S.potion=null;render()">${can?'🧪 Drink':why}</button><button class="btn" id="discardpot" onclick="discardPotion(${S.potion})">🗑️ Discard</button><button class="btn" onclick="closePop()">✕</button></div></div>`}
 if(S.relicView){const ch=S.relicView.startsWith('charm:');const d=ch?CHARMS[S.relicView.slice(6)]:RELICS[S.relicView];const r=!ch&&W.run.relics.find(x=>x.id===S.relicView);
  if(d)return `<div class="pop relpop" id="relpop" onclick="closePop()"><div class="itemhead">${slotHTML('relics',S.relicView,'itemart',d.e)}<div><b>${d.n}</b> <span class="muted">${ch?'Charm':(d.tierName||'')+(d.cls?' · '+CLASSES[d.cls].n:'')}</span><div>${d.d}</div></div></div>${r&&(r.id==='starfish'||r.id==='boots')?`<div class="muted">Uses left: ${r.n}</div>`:''}${d.flavour?`<div class="flav">${relicFlavour(d.id||S.relicView,d.flavour)}</div>`:''}</div>`}
 return ''}
export function openOv(k){if(drag)return;W.S.ov=W.S.ov===k?null:k;W.S.potion=null;W.S.relicView=null;render()}
export function hpbar(h,m,blk,blkT,who){return barHTML(h,m,blk,blkT!=null&&anim(blkT,700),who)}
export function badges(block,blkT,st,extra){return statusRowHTML(st,extra)}
// Floating numbers (R12): size scales with the amount (22-40 px), stacked numbers fan out, Guard uses its icon, and a number waits for the swing to connect (x.d).
const FLN=/^([+-]?)(\d+)/;
export function fxHTML(who){const now=Date.now();const list=W.cb.vfx.filter(x=>x.who===who&&now-x.t<900+(x.d||0));
 return list.map((x,i)=>{const m=FLN.exec(String(x.txt).replace(/^Parry /,'')),n=m?+m[2]:0,big=(x.cls===''||x.cls==='bleed'||x.cls==='drench')&&n>=15;
  const fs=Math.round(Math.max(22,Math.min(40,22+n*.7))),ox=((i%3)-1)*20,oy=-(i%2)*14;
  const txt=String(x.txt).replace('🛡',iconHTML('status','block','🛡️')).replace('❤','').replace('⚡','⚡');
  return `<div class="fl ${x.cls}${big?' big':''}" style="--fs:${fs}px;--ox:${ox}px;--oy:${oy}px;animation-delay:${x.d||0?(x.d-(now-x.t)):-(now-x.t)}ms">${txt}</div>`}).join('')}
// ---------------- intents ----------------
export function intentHTML(e){const m=intentOf(e),p=[];
 const add=(k,n,cl='oth')=>p.push(`<span class="intent-part ${cl}">${intentIcon(k)}<b>${n}</b></span>`);
 if(m.a)add('attack',`${eAtk(e,m.a)}${m.h>1?'×'+m.h:''}`,'atk');
 if(m.b)add('guard',m.b,'def');
 if(m.s||m.grow)add('buff','+'+(m.s||m.grow),'buf');
 for(const [k,nm] of [['w','Soaked'],['v','Exposed'],['brittle','Brittle']])if(m[k])add('debuff',m[k],'deb');
 if(m.heal)add('heal',m.heal,'buf');
 if(m.status)add('status',m.status.n,'deb');
 if(m.summon)add('summon',m.n>1?'×'+m.n:'');
 if(m.steal)add('steal',m.steal);
 if(m.ring)add('ring',m.ring);
 if(m.stealPotion)add('potion','');
 if(m.drainE)add('drain','−'+m.drainE);
 if(!p.length)add('unknown','…');
 return `<div class="intent${m.mirror?' mirror':''}" tabindex="0" role="button" aria-label="${esc(intentText(e))}" data-kw="Intent" data-sname="${esc(m.lbl||'Enemy intent')}" data-sinfo="${esc(intentText(e))}">${p.join('')}</div>`}
export function intentText(e){const m=intentOf(e);const p=[];if(m.lbl)p.push(m.lbl+':');
 if(m.mirror)p.push('(copies the type of the last card you play this turn: Attack → attack 15, Skill → 12 Guard, Power → +2 Might; play nothing and it attacks for 15)');
 if(m.none)p.push('Does nothing');
 if(m.a)p.push(`Attack for ${eAtk(e,m.a)}${m.h>1?' × '+m.h:''}`+(m.boom?' then dies':''));if(m.b)p.push(`Gain ${m.b} Guard`);if(m.s)p.push(`Gain ${m.s} Might`);
 if(m.grow)p.push(`All Tendrils gain ${m.grow} Might; summons a Tendril if fewer than 2`);if(m.w)p.push(`Apply ${m.w} Soaked`);if(m.v)p.push(`Apply ${m.v} Exposed`);if(m.brittle)p.push(`Apply ${m.brittle} Brittle`);
 if(m.heal)p.push(`Heal ${m.heal}`);if(m.status)p.push(`Add ${m.status.n} ${CARDS[m.status.id].n} to your ${m.status.pile==='disc'?'discard pile':m.status.pile==='hand'?'hand':'draw pile'}`);
 if(m.summon)p.push(`Summon ${m.n||1} ${EN[m.summon].n}${m.max?' (up to '+m.max+' alive)':''}`);if(m.steal)p.push(`Steal ${m.steal} gold and flee`);if(m.ring)p.push(`Add ${m.ring} Ringing to your discard pile`);
 if(m.stealPotion)p.push('Steal a potion');if(m.drainE)p.push(`You lose ${m.drainE} Energy next turn`);
 if(e.passive)p.push(`· Passive ${e.passive.n}: ${e.passive.text}`);return p.join(' ')}
// ---------------- class bars (v2.1 rules, all actions non-blocking) ----------------
export function classBar(){const c=W.run.cls,cb=W.cb;
 if(c==='tide'){const T=CORE.tide;let g='';for(let i=0;i<=10;i++)g+=`<i class="${i<=cb.tide?'on':''} ${i>=T.high?'hi':i<=T.low?'lo':''} ${i===cb.tide?'cur':''}"></i>`;
  const st=cb.tide>=T.high?'<b class="hi">HIGH</b>':cb.tide<=T.low?'<b class="lo">LOW</b>':'<b>Mid</b>';
  const cr=mod('crest',{preview:true},{dmg:T.crest_dmg,resetTo:5}),un=mod('undertow',{preview:true},{guard:T.undertow_blk,draw:T.undertow_draw,resetTo:5});
  const arrow=cb.holdDrift?'<span class="arrow" title="Moonlock: the Tide will not drift at the start of your next turn">🔒</span>':cb.tideDir>0?'<span class="arrow up" title="Drift: the Tide rises 1 at the start of your turn">⬆</span>':cb.tideDir<0?'<span class="arrow dn" title="Drift: the Tide falls 1 at the start of your turn">⬇</span>':'<span class="arrow" title="No drift yet">•</span>';
  let btn='';if(hasRelic('tidetable')&&!cb.tideBtnUsed)btn+=`<button class="tbtn" id="tideup" onclick="tideAct('up')" title="Tide Table: Surge 1 (free, once per turn)">+1</button><button class="tbtn" id="tidedn" onclick="tideAct('down')" title="Tide Table: Recede 1 (free, once per turn)">−1</button>`;
  if(hasRelic('helmwheel')&&!cb.wheelUsed&&cb.tideDir)btn+=`<button class="tbtn" id="tideflip" onclick="tideAct('flip')" title="Helmsman's Wheel: flip the drift arrow">☸️</button>`;
  if(cb.banks&&!cb.busy)btn+=`<button class="tbtn rel" id="relbank" onclick="releaseBank()" title="Release the Bank: ${cb.banks} Banked Crest${cb.banks>1?'s':''}, 1½ x Crest damage to ALL each">🏦 Release ×${cb.banks}</button>`;else if(cb.banks)btn+=`<span class="chip">🏦 ×${cb.banks}</span>`;
  return `<span class="tst">${st} <b class="tnum">${cb.tide}</b>${arrow}</span><div class="gauge${anim(cb.crestT,700)?' crest':''}${anim(cb.undertowT,700)?' under':''}" title="10 = Crest (${cr.dmg} to ALL) · 0 = Undertow (${un.guard} Guard, draw ${un.draw}) · High ${T.high}+ · Low ${T.low}−">${g}</div>${btn}`}
 if(c==='echo'){const plan=echoPlan(true);let t;
  // Live Echo preview: each Marked card shows what its Echo would do right now (updates as you play cards after it).
  const mchip=(ci,k,after)=>{const pl=echoPlan(true,k);const pv=pl&&echoPreview(pl);const rep=pl&&pl.repeats>1?'×'+pl.repeats:'';
   return `<span class="chip marked" title="${esc(cname(ci)+' will Echo at the end of your turn'+(pv?': about '+pv.total+(pv.kind==='dmg'?' damage':' Guard')+' in total':'')+'. +1 per card played after it (max +'+CORE.echo.bonus_cap+').')}">🔔 ${CARDS[ci.id].e} ${cname(ci)} +${markBonus(after)}${pv?` <b class="pv">→ ${pv.n}${pv.kind==='dmg'?'⚔':'🛡'}${rep}${pl.mult>1?' ×2':''}</b>`:''}${pl&&pl.scale<1?' ½':''}</span>`};
  const second=cb.mark&&canMark();
  const mk=(cb.mark?mchip(cb.mark,1,cb.afterMark):'')+(cb.mark2?mchip(cb.mark2,2,cb.after2):'')+(canMark()?`<button class="tbtn mark${cb.armMark?' on':''}" id="markbtn" onclick="armMark()" title="Mark the next card you play: it Echoes at the end of your turn (+1 per card played after it, max +${CORE.echo.bonus_cap})">🔔 ${cb.armMark?'Marking…':second?'Mark 2nd':'Mark'}</button>`:'');
  if(!cb.mark&&plan){const d=CARDS[plan.card.id];t=`🔊 <span class="chip next">${d.e} ${cname(plan.card)}${plan.half?' '+fbLabel():''}</span>`}
  else if(!cb.mark)t='<span class="muted">No Echo yet</span>';else t='';
  return mk+' '+t}
 if(c==='carto'){let s='';const pk=cb.mode&&cb.mode.k==='slot';const lim=mod('advances',{},1);const canAdv=!pk&&cb.advUsed<lim&&!cb.busy&&!cb.mode;
  for(let i=0;i<cb.nslots;i++){const w=cb.slots[i];const r=w?(w.rank||0):0;const pips=w?`<span class="pips">${[0,1,2].map(k=>`<i class="${k<r?'on':''}"></i>`).join('')}</span>`:'';
   const adv=w&&canAdv&&r<CORE.carto.rank_max;
   s+=w?`<button class="wp full${pk?' pick':''}${adv?' adv':''}${r>=CORE.carto.rank_max?' land':''}${anim(w.trigT,600)?' trig':''}" data-slot="${i}" onclick="${pk?`modeAct('slot',${i})`:adv?`advance(${i})`:''}" title="${esc(cname(w)+': '+desc(w).replace(/<[^>]+>/g,'')+(adv?' — tap to Advance (+1 Rank; damage bonuses '+CORE.carto.rank_dmg.slice(1).map(n=>'+'+n).join(' / ')+')':''))}">${CARDS[w.id].e}<span class="wpn">${cname(w)}</span>${pips}</button>`:`<div class="wp">·</div>`}
  const nd=mod('drawCount',{},4);const nx=cb.draw.slice(0,3).map((ci,i)=>`<span class="chip ${i<nd?'next':''}">${CARDS[ci.id].e} ${cname(ci)}</span>`).join('')||'<span class="muted">reshuffle</span>';
  return `<div class="wps">${s}</div><span class="advhint">${canAdv&&cb.slots.length?'⛰️ Tap a Waypoint to Advance':cb.advUsed?'⛰️ Advanced':''}</span><span class="nexts">🗺️ ${nx}</span>`}
 if(c==='duel'){const D=CORE.duel;const max=mod('momMax',{},D.mom_max);let p='';for(let i=0;i<max;i++)p+=`<i class="${i<cb.mom?'on':''}"></i>`;
  const can=cb.mom>=flourishMin();const mult=flourishMult(cb.mom);
  const fb=`<button class="tbtn flo${cb.armFlourish?' on':''}" id="flourishbtn" ${can?'':'disabled'} onclick="armFlourish()" title="Flourish: your next Attack spends all Momentum and deals ×(1 + ½ per Momentum)">⚔️ ${can?(cb.armFlourish?'FLOURISH ×'+mult:'Flourish ×'+mult):'Flourish ('+flourishMin()+'+)'}</button>`;
  return `<span>Momentum</span><span class="pips mom">${p}</span>${fb}${cb.parry?`<span class="chip parry">🤺 Parry ${cb.parry}</span>`:''}${cb.keepMom?'<span class="chip">🏃 keeps</span>':''}`}}
// ---------------- combat ----------------
// ---------------- battle figures (Art Director spec) ----------------
// Fill the free battle area, keeping foot anchors above the resting hand.
export function sceneGeom(){const vw=innerWidth,vh=innerHeight;return {vw,vh,s:Math.min(vh/720,vw/1560),feet:Math.round(vh*groundY()),top:52,heroTop:72}}
// One standing figure: sprite (or placeholder) with its foot anchor on the floor point, an ellipse shadow, intent above the head,
// name plate + HP bar (Guard at its left end) under the feet, then the bounded status rail.
function figureHTML({sp,role,ph,g,x,shake,intent,name,hp,badgesH,fx,cls,attrs}){let H=Math.round(Math.min((role==='hero'?g.vh*.40:role==='boss'?g.vh*.43:role==='elite'?g.vh*.38:g.vh*.34),g.feet-(role==='hero'?g.heroTop:g.top+32)));
 if(role!=='hero'&&sp&&g.enemyMaxWidth)H=Math.min(H,Math.floor(g.enemyMaxWidth*sp.h/sp.w));
 const W=sp?Math.round(H*sp.w/sp.h):Math.round(H*.8);const ax=sp?sp.ax:.5;const hov=sp?Math.round(sp.hover/1440*g.vh):0;
 const top=g.feet-H-hov,L=x-Math.round(W*ax),fx0=Math.round(W*ax);const it=Math.max(g.top,top-46)-top;const bw=Math.round(Math.max(96,Math.min(150,H*.62)));
 const img=`<div class="slot spr-slot${sp?' has-img':''}" data-asset="sprites.${sp?sp.id:'none'}"><div class="ph" style="font-size:${Math.round(Math.min(W,H)*.7)}px">${ph}</div>${sp?`<img class="spr" src="${sp.f}" alt="" draggable="false" decoding="async" style="height:${H}px" onerror="assetFail(this)">`:''}</div>`;
 return `<div class="${cls}" ${attrs} style="left:${L}px;top:${top}px;width:${W}px;height:${H+hov}px;--bw:${bw}px;--ax:${fx0}px">
 <i class="shadow" style="left:${fx0}px;top:${H+hov}px;width:${Math.round(Math.min(W,H*.9)*.8)}px"></i>
 <div class="fig ${shake?'shake':''}" style="width:${W}px;height:${H}px;left:0;top:0;${shake||''}">${img}</div>
 ${intent?`<div class="intentw" style="top:${it}px">${intent}</div>`:''}
 <div class="plate" style="top:${H+hov+2}px">${`<div class="nm">${name}</div>`}${hp}<div class="stw">${badgesH}</div></div>${fx}</div>`}
function enemyX(i,n,g){const a=n>=3?.53:.60,b=n>=3?.87:.80;return Math.round(g.vw*(n===1?.70:a+(b-a)*i/(n-1)))}
export function enemyHTML(e,i,k,n,g){g=g||sceneGeom();g={...g,enemyMaxWidth:(n||1)>=3?g.vw*.165:0};const many=alive().length>1;const sh=motionEnabled()?null:anim(e.shake,400);const act=W.cb.busy&&W.cb.tele===e;
 const role=e.boss?'boss':e.elite?'elite':'normal';const vi=W.cb.ens.slice(0,i).filter(x=>x.key===e.key).length;
 const flav=ENEMY_FLAVOUR[e.key],nm0=flav?`<span class="nmf" data-info="${tesc(e.n+': '+flav)}">${e.n}</span>`:e.n;
 const name=`${nm0}${e.elite?' <span class="star">★</span>':''}${e.boss&&e.key==='bell'?` <span class="ph">P${e.ph}</span>`:''}${e.passive?` <span class="pas" title="${esc(e.passive.n+': '+e.passive.text)}">${e.passive.n==='Rooted'?iconHTML('status','rooted','🌿'):'🌿'}${e.passive.n}</span>`:''}`;
 return figureHTML({sp:spriteFor('enemies',e.key,vi),role,ph:e.e,g,x:enemyX(k==null?i:k,n||1,g),shake:sh,intent:intentHTML(e),name,hp:hpbar(e.hp,e.max,e.block,e.blkT,'e'+e.uid),
  badgesH:badges(0,0,{...e.st,...(e.passive?.n==='Rooted'?{rooted:1}:{})}),fx:fxHTML(e.uid),cls:`en ${e.boss?'boss':''} ${e.elite?'elite':''} ${many&&W.cb.tgt===i?'tg':''} ${act?'act':''}`,attrs:`onclick="tgt(${i})" data-en="${i}" data-key="${e.key}"`})}
export function heroHTML(g){g=g||sceneGeom();const K=CLASSES[W.run.cls];const sh=motionEnabled()?null:anim(W.cb.pshake,400);
 return figureHTML({sp:spriteFor('figures',W.run.cls),role:'hero',ph:K.e,g,x:Math.round(g.vw*.30),shake:sh,intent:'',name:`<span class="hn">${K.n}</span>`,hp:hpbar(W.run.hp,W.run.max,W.cb.p.block,W.cb.p.blkT,'p'),
  badgesH:badges(0,0,{...W.cb.p.st,...(W.cb.parry&&!W.cb.parryUsed?{parry:W.cb.parry}:{})},playerStates()),fx:fxHTML('p'),cls:`hero theme-${TH[W.run.cls]}`,attrs:'id="hero"'})}
export function tipHTML(){const cb=W.cb;
 if(cb.sel!=null&&cb.hand[cb.sel]){const ci=cb.hand[cb.sel],d=CARDS[ci.id];const can=canPlay(ci),nt=needsTarget(ci);const t=nt?curTgt():null;
  const why=d.unplay?'Unplayable':cost(ci)>cb.energy?'Not enough Energy':'Can\'t play now';
  return `<div class="tip" id="detail"><div><b>${d.e} ${cname(ci)}</b> · ${cost(ci)}⚡ · ${TYPEN[d.t]}${RARN[d.r]&&d.r!=='s'?' · '+RARN[d.r]:''}</div><div class="desc">${desc(ci)}</div><div class="kws">${kwFor(ci)}</div>
  <button class="btn pri" id="playbtn" onclick="playSel()" ${can?'':'disabled'}>${can?'▶ Play'+(t?' on '+t.n:''):why}</button></div>`}
 if(cb.insp!=null&&cb.ens[cb.insp]&&cb.ens[cb.insp].hp>0){const e=cb.ens[cb.insp];return `<div class="tip" id="detail"><b>${e.e} ${e.n}</b> <span class="muted">${e.hp}/${e.max}</span><br>${intentText(e)}</div>`}
 return ''}
function calloutsHTML(){const now=Date.now();const c=(W.cb.callouts||[]).filter(x=>now-x.t<1300);return c.length?`<div class="callouts">${c.slice(-2).map(x=>`<div class="co c-${x.cls}" style="animation-delay:-${now-x.t}ms">${x.txt}</div>`).join('')}</div>`:''}
const titleHTML=t=>{const k=String(t).indexOf(': ');return k>0&&k<40?`<h2>${t.slice(0,k)}</h2><div class="muted csub">${t.slice(k+2)}</div>`:`<h2>${t}</h2>`};
export function combatScr(){const cb=W.cb;let h=`<div class="combat theme-${TH[W.run.cls]}${cb.kind==='boss'?' bossfight':''}">`+topBar();
 h+=daisHTML();
 const g=sceneGeom();const live=cb.ens.map((e,i)=>[e,i]).filter(([e])=>e.hp>0&&!e.fled);
 h+=`<div class="scene" onclick="sceneTap(event)"><div class="ground"></div>${stageAtmosphereHTML(false)}${heroHTML(g)}<div class="foes${cb.busy&&cb.tele?' has-act':''}">${live.map(([e,i],k)=>enemyHTML(e,i,k,live.length,g)).join('')}</div>${stageAtmosphereHTML(true)}${tipHTML()}${calloutsHTML()}`;
 h+=`<div class="log">${cb.log.slice(0,3).map((l,i)=>`<div style="opacity:${1-i*.25}">${l}</div>`).join('')}</div>`;
 if(cb.banner){const a=anim(cb.banner.t,560);if(a)h+=`<div class="banner ${cb.banner.en?'en':''}" style="${a}">${cb.banner.txt}</div>`}
 const fl=W.run.cls==='duel'&&cb.armFlourish,mkA=W.run.cls==='echo'&&cb.armMark;
 h+=`</div><div class="bottom"><div class="hand${fl?' flourishing':''}${mkA?' marking':''}" id="hand">${cb.hand.map((ci,i)=>{const d=CARDS[ci.id];return cardHTML(ci,{sel:cb.sel===i,can:canPlay(ci),i,flourish:fl&&d.t==='A',mark:mkA&&d.t!=='P'&&(!d.faint||hasRelic('hollowreed'))&&!d.unplay})}).join('')}</div>
 <div class="ctl"><div><div class="orb ${cb.energy?'':'empty'}" id="orb" title="Energy"><span>${cb.energy}/${cb.maxE}</span></div><button class="pile" id="drawpile" onclick="openOv('draw')" title="Draw pile">${iconHTML('hud','draw','📚')} ${cb.draw.length}</button></div>
 <div><div class="row2"><button class="pile" id="exhpile" onclick="openOv('exh')" title="Sunk (removed for this combat)">${iconHTML('hud','sunk','⚓')} ${cb.exh.length}</button><button class="pile" id="discpile" onclick="openOv('disc')" title="Discard pile">${iconHTML('hud','discard','🗑️')} ${cb.disc.length}</button></div><button class="endbtn" id="endbtn" onclick="endTurn()" ${cb.busy||cb.mode?'disabled':''}>${cb.busy?'Enemy…':'End Turn'}</button></div></div></div>`;
 const m=cb.mode;
 if(m&&m.k==='choice')h+=`<div class="ov battle"><div class="box tilebox" id="choicebox">${titleHTML(m.title)}${tilesRow(m.opts.map((o,i)=>optionHTML(o,`modeAct('choice',${i})`,{i})),'chtiles')}</div></div>`;
 if(m&&m.k==='slot')h+=`<div class="ov battle"><div class="box tilebox" id="slotbox">${titleHTML(m.title)}<div class="tiles chtiles slottiles" style="--n:${cb.slots.length}">${cb.slots.map((w,i)=>`<div class="tcard opt slotpick">${cardHTML(w,{click:`modeAct('slot',${i})`})}<span class="tcap">${w.rank?'Rank '+w.rank:'Rank 0'}${w.temp?' · starting':''}</span></div>`).join('')}</div></div></div>`;
 if(m&&m.k==='chart'){const n=m.n;const cards=Array.from({length:n},(_,i)=>{const ci=cb.draw[i];return `<div class="cslot${i===0?' first':''}" data-i="${i}"><span class="cnum">${i===0?'<b>1</b> drawn first':'<b>'+(i+1)+'</b>'}</span>${cardHTML({...ci,uid:ci.uid},{})}<span class="cmv"><button class="cmvb" aria-label="Earlier" onclick="modeAct('up',${i})" ${i===0?'disabled':''}>◀</button><button class="cmvb" aria-label="Later" onclick="modeAct('dn',${i})" ${i===n-1?'disabled':''}>▶</button></span></div>`}).join('');
  h+=`<div class="ov battle"><div class="box chartbox" id="chartbox"><h2>🗺️ Chart: set the order of your next draws</h2><div class="muted csub">Drag cards left or right. The leftmost card is drawn first. Drop one in the Bottom slot to send it under the pile.</div>
  <div class="chartrow" style="--n:${n}"><div class="cards" id="chartcards">${cards}</div><div class="cright"><div class="cbottom${m.moved?' used':''}" id="chartbottom"><span class="cbi">⤓</span><b>Bottom</b><i>${m.moved?'Card sent down':'Drop 1 card here'}</i></div><button class="btn pri" id="chartdone" onclick="modeAct('done')">Done</button></div></div></div></div>`}
 return h+'</div>'}
export function tgt(i){const cb=W.cb;if(!cb||cb.busy||drag)return;if(cb.mode)return;const e=cb.ens[i];if(!e||e.hp<=0)return;cb.tgt=i;
 if(cb.sel!=null&&cb.hand[cb.sel]&&needsTarget(cb.hand[cb.sel])){const s=cb.sel;return window.playCard(s)}
 cb.insp=cb.insp===i?null:i;cb.sel=null;render()}
export function sceneTap(ev){if(!W.cb||drag)return;if(ev.target.closest('.en,.tip,.hero'))return;if(W.cb.sel!=null||W.cb.insp!=null){W.cb.sel=null;W.cb.insp=null;render()}}
// Full framed cards at rest; one card rises above a scrubbing finger or cursor.
export const HAND_REST_TOP=.67;
export function layoutHand(){const hand=document.getElementById('hand');if(!hand)return;const cards=[...hand.querySelectorAll('.card')];const n=cards.length;if(!n)return;hand.classList.add('instant');
 const land=matchMedia('(orientation:landscape)').matches;const vh=innerHeight;
 const Wd=hand.clientWidth,cw=cards[0].offsetWidth,ch=cards[0].offsetHeight;const hr=hand.getBoundingClientRect();const cx=hr.left+Wd/2;
 const step=n>1?Math.min(cw*.92,(Wd-cw)/(n-1)):0;const ang=land?1.6:n>6?2.5:4;
 const eL=Math.min(innerWidth,...[...document.querySelectorAll('.combat .en .fig')].map(f=>f.getBoundingClientRect().left));
 const zoom=land?0:(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom'))||1.4);
 cards.forEach((el,i)=>{const off=i-(n-1)/2;const x=off*step,y=(Math.abs(off)*Math.abs(off)-Math.pow((n-1)/2,2))*cw*(land?.012:.018);
  const zl=land?1.55:zoom;
  const ly=land?-Math.min(68,vh*.15):-8;
  // a lifted card slides left of the enemy row when there is room, so it doesn't hide the target it's aimed at
  const zw=cw*zl;const lo=zw/2+4-cx;let hi=innerWidth-zw/2-4-cx;if(land&&eL<innerWidth&&eL-zw-10>0)hi=Math.min(hi,eL-zw/2-6-cx);const xs=Math.max(lo,Math.min(hi,x));
  el.style.setProperty('--x',x+'px');el.style.setProperty('--y',y+'px');el.style.setProperty('--r',off*ang+'deg');el.style.setProperty('--xs',xs+'px');
  el.style.setProperty('--zl',zl.toFixed(3));el.style.setProperty('--ly',ly+'px');el.dataset.x=x;el.dataset.y=y;el.dataset.zl=zl.toFixed(3);el.dataset.ly=ly});void hand.offsetWidth;hand.classList.remove('instant');if(land)clampPlates(hand)}
// Name plates + HP bars (incl. extra lines such as the Matriarch's 'Rooted') always sit above the resting hand's top edge.
function clampPlates(hand){const rest=[...hand.querySelectorAll('.card:not(.sel)')].map(c=>c.getBoundingClientRect().top);const lim=(rest.length?Math.min(...rest):innerHeight*HAND_REST_TOP)-3;
 const left=hand.getBoundingClientRect().left;
 const plates=[...document.querySelectorAll('.combat .en .plate,.combat .hero .plate')].filter(p=>p.parentNode.getBoundingClientRect().right>=left);
 for(const p of plates)p.style.top=p.dataset.top||(p.dataset.top=p.style.top);
 const offsets=plates.map(p=>p.getBoundingClientRect().bottom-lim);
 plates.forEach((p,i)=>{if(offsets[i]>0)p.style.top=(parseFloat(p.style.top)-offsets[i])+'px'})}

// ---------------- title / travel ----------------
export function settingsHTML(){return `<div class="settings"><label><input type="checkbox" id="setfast" ${settings.fastAnim?'checked':''} onchange="setFast(this.checked)"> Fast animations</label>
 <label>Effects <select id="setenvfx" onchange="setEnvFx(this.value)">${['full','reduced','off'].map(v=>`<option value="${v}" ${settings.envFx===v?'selected':''}>${envFxSettingLabel(v)}</option>`).join('')}</select></label>
 <label>Music <input id="setmusic" aria-label="Music volume" type="range" min="0" max="1" step="0.01" value="${settings.musicVolume}" oninput="setAudioSetting('musicVolume',this.value)"></label>
 <label>SFX <input id="setsfx" aria-label="SFX volume" type="range" min="0" max="1" step="0.01" value="${settings.sfxVolume}" oninput="setAudioSetting('sfxVolume',this.value)"></label>
 <label><input id="setmute" type="checkbox" ${settings.audioMuted?'checked':''} onchange="setAudioSetting('audioMuted',this.checked)"> Mute audio</label>
 <label><input id="setreduce" type="checkbox" ${settings.reduceMotion?'checked':''} onchange="setReduceMotion(this.checked)"> Reduced motion</label>
 </div>`}
export function setFast(on){settings.fastAnim=!!on;window.FAST=on?1:0;saveSettings()}
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
 <div class="ferry" id="ferryman" data-info="${tesc('The Ferryman: He carries every Lampbearer to the Stair\'s foot, and never looks up.')}">${emblemHTML('lore-ferryman','⚓','fyp')}<q>${ferrymanLine(W.run.cls,currentTier())}</q></div><div class="skip muted">${ok?'Tap to begin':'…'}</div></div>`}
export function skipTravel(){if(W.S.screen!=='travel')return;if(Date.now()-(W.S.t||0)<1000&&!window.FAST)return;W.S={screen:'map'};
 if(W.run&&W.run.lamp&&!W.run.lamp.shown&&W.run.floor===0){W.run.lamp.shown=true;W.S.ov='tasks'} // Lantern Tasks are shown once, when the climb begins
 render()}
// ---------------- rewards / chests ----------------
function rowHTML(r,i,click){const done=!!r.done,c=done?'':`${click}(${i})`;
 if(r.k==='gold')return tileHTML({id:'reward-gold',emoji:'💰',name:`${r.n} gold`,sum:r.note||'Into your purse.',cls:'k-gold',click:c,done,disabled:done,tid:'row'+i,info:`${r.n} gold: spend it at the merchant.`});
 if(r.k==='relic')return relicTile(r.id,{click:c,done,disabled:done,sum:RELICS[r.id].d});
 if(r.k==='potion')return potionTile(r.id,{click:c,done,disabled:done});
 return tileHTML({id:'reward-cards',emoji:'🂠',name:r.took?`Took ${CARDS[r.took].n}`:r.skipped?'Skipped':'Choose a card',sum:r.took||r.skipped?'':`Add 1 of ${r.cards.length} to your deck.`,cls:'k-cards',click:c,done,disabled:done,tid:'row'+i,info:'Card reward: pick one card for your deck, or skip.'})}
function rewardScr(){const S=W.S;let h=topBar()+`<h2>${S.title}</h2>`;
 if(S.cardsOpen!=null){const row=S.rows[S.cardsOpen];const boss=S.kind==='boss';
  h+=`<div class="sub">Choose a card to add to your deck <span class="muted">(hold a card to enlarge)</span></div><div class="grid rewgrid">${row.cards.map((id,j)=>`<div class="rcw">${cardHTML({id,uid:-1-j,up:false},{click:`rewCard(${j})`,isNew:isNewCard(id)})}${cardBackHTML()}</div>`).join('')}</div>
  <div class="actions"><button class="btn" onclick="rewCloseCards()">↩ Back</button><button class="btn" id="skipcard" onclick="rewSkipCards()">Skip card</button></div>`;return h}
 if(S.swap!=null){const row=S.rows[S.swap],p=POTIONS[row.id];
  h+=`<div class="sub">Your potion slots are full. Swap <b>${p.e} ${p.n}</b> for one you hold, or discard it.</div>${tilesRow([...W.run.potions.map((id,s)=>potionTile(id,{click:`potionSwap(${s})`,tag:'Replace',cls:'swap'})),tileHTML({id:'opt-remove',emoji:'🗑️',name:`Discard ${p.n}`,sum:'Leave it behind.',click:'potionSwap(-1)',cls:'k-discard',tid:'discardnew'})],'swaptiles')}`;return h}
 h+=`${tilesRow(S.rows.map((r,i)=>rowHTML(r,i,'claimRow')),'rewtiles')}<div class="actions"><button class="btn pri" id="proceed" onclick="rewDone()">${S.kind==='boss'?'🏆 Finish the act':'Proceed ➜'}</button></div>`;return h}
function chestScr(){const S=W.S;let h=topBar()+`<h2>💎 ${S.name}</h2>`;
 if(!S.opened)return h+`<div class="chestwrap"><button class="chest ${S.chest}" id="openchest" onclick="openChestLid()">${emblemHTML('chest-closed','🧰','big')}<span class="muted">Tap to open</span></button></div><div class="actions"><button class="btn" onclick="goMap()">Leave it</button></div>`;
 return h+`<div class="chestwrap open ${S.chest}" style="${anim(S.openT,600)||''}">${emblemHTML('chest-open','✨','big')}</div>${tilesRow(S.rows.map((r,i)=>rowHTML(r,i,'claimRow')),'rewtiles')}<div class="actions"><button class="btn pri" id="proceed" onclick="goMap()">Proceed ➜</button></div>`}
// ---------------- merchant (4 shelves + Scrub; prices rolled on entry) ----------------
function shopScr(){const S=W.S;const g=W.run.gold;const sp=scrubPrice();
 const card=(it,sh,i)=>`<div class="shopitem${it.sold?' sold':''}${it.sale?' sale':''}${anim(it.noT,400)?' no':''}">${it.sold?'<div class="soldcard">SOLD</div>':cardHTML({id:it.id,uid:-100-i-(sh==='colorless'?10:0),up:false},{click:`buy('${sh}',${i})`,can:g>=it.price})}<span class="price${g<it.price?' poor':''}">${it.sold?'SOLD':(it.sale?'<s>'+Math.round(it.base)+'</s> ':'')+'💰 '+it.price}</span>${it.sale&&!it.sold?'<span class="saletag">SALE</span>':''}</div>`;
 const icon=(it,sh,i,group,def)=>`<button class="shopicon${it.sold?' sold':''}${it.right?' right':''}${anim(it.noT,400)?' no':''}" ${it.sold?'disabled':`onclick="buy('${sh}',${i})"`} title="${esc(def.n+': '+def.d)}" data-shelf="${sh}" data-i="${i}">${slotHTML(group,it.id,'',def.e)}<span class="inm">${def.n}</span><span class="price${g<it.price?' poor':''}">${it.sold?'SOLD':'💰 '+it.price}</span>${it.right?'<i class="shoptag">SHOP</i>':''}</button>`;
 return topBar()+`<div class="shophead"><h2>🏮 Wren's Driftwood Bazaar</h2><span class="muted">hold a card to enlarge · scroll the card shelf ➜</span><em class="wrenline" data-info="${tesc("Quartermaster Wren: "+WREN_SIDE)}">${wrenLine(bellCount(W.run.seed),currentTier())}</em></div>
 <div class="shelf cards" id="cardshelf"><div class="shlbl">Cards</div>${S.cards.map((it,i)=>card(it,'cards',i)).join('')}<div class="shlbl">Colourless<br><span class="muted">(extra class cards until Phase 2)</span></div>${S.colorless.map((it,i)=>card(it,'colorless',i)).join('')}</div>
 <div class="shelfrow"><div class="shelf relics"><div class="shlbl">Relics</div>${S.relics.map((it,i)=>icon(it,'relics',i,'relics',RELICS[it.id])).join('')}</div>
 <div class="shelf potions"><div class="shlbl">Potions</div>${S.potions.map((it,i)=>icon(it,'potions',i,'potions',POTIONS[it.id])).join('')}</div>
 <div class="shelf svc"><button class="btn" id="scrub" onclick="shopRemove()" ${S.scrubbed||g<sp?'disabled':''}>✂️ Scrub a card<br>💰 ${sp}${S.scrubbed?' (used)':''}</button><button class="btn pri" id="leaveshop" onclick="goMap()">Leave ➜</button></div></div>`}
// ---------------- camp / event / pick / misc ----------------
const CAMP_EMO={mend:'❤️',temper:'⬆️',cook:'🍲',scour:'🪨',trawl:'⚓',annotate:'📘'};
function restScr(){return topBar()+`<div class="roomhead"><h2>🔥 Stairwell Camp</h2><div class="sub">The fire crackles. Choose one.</div></div>${tilesRow(campOptions().map(o=>{const sp=splitLabel(o.l);return tileHTML({id:'camp-'+o.k,emoji:CAMP_EMO[o.k]||sp.emoji||'🔥',name:sp.name,sum:o.d,info:`${sp.name}: ${o.d}`,click:`campDo('${o.k}')`,cls:'k-camp'+(o.k==='mend'?' pri':''),tid:'camp-'+o.k})}),'camptiles')}`}
function eventScr(){const e=W.S.ev;const opts=e.o.map((o,i)=>optionHTML(o,`evOpt(${i})`,{disabled:!!(o.ok&&!o.ok()),i}));
 return topBar()+`<div class="evpanel"><div class="evimg">${emblemHTML('event-'+(e.id||'generic'),e.e,'scene')}</div><div class="evtxt"><h2>${e.sub||e.n}</h2><p>${e.t}</p></div></div>${tilesRow(opts,'evtiles')}`}
function pickScr(){const S=W.S;const list=window.pickable(S.mode,S.filter);return topBar()+`<h2>${S.title}</h2>${S.mode==='upgrade'?'<div class="sub">Cards are shown with their upgrade (green).</div>':''}<div class="grid">${list.map(c=>cardHTML(S.mode==='upgrade'?{...c,up:true}:c,{click:`pickCard(${c.uid})`})).join('')}</div><div class="actions">${S.cancel?'<button class="btn full" id="pickcancel" onclick="pickCancel()">Cancel</button>':'<button class="btn full" id="pickskip" onclick="pickCancel()">Skip</button>'}</div>`}
function potPickScr(){const S=W.S;const free=W.run.potions.filter(p=>!p).length;return topBar()+`<h2>${S.title}</h2><div class="sub">Pick up to ${Math.min(3,free)} (free slots: ${free}).</div>${tilesRow(S.ids.map((id,j)=>potionTile(id,{click:`potPickToggle(${j})`,on:S.chosen.includes(j)})),'pottiles')}<div class="actions"><button class="btn pri" id="potpickdone" onclick="potPickDone()">Done</button></div>`}
function endScr(){const run=W.run,K=CLASSES[run.cls],st=run.stats;const mins=Math.round(((st.endT||Date.now())-st.startT)/60000);const sum=run.lamp&&run.lamp.summary;
 return `<div class="end${sum?' withlamp':''}"><div class="endl"><div class="big">${run.won?'🏆':'🪦'}</div><h1>${run.won?'Act 1 cleared!':'Defeated'}</h1><p class="sub">${run.won?`${K.e} ${K.n} silenced ${EN[run.boss].n}.`:`${K.e} ${K.n} fell on floor ${run.floor} of 15. ${deathLine(run.floor,run.boss)}`}</p>
 <div class="panel">Seed ${run.seed} · ${mins} min · Enemies ${run.kills} · Elites ${st.elites.reduce((a,b)=>a+b,0)} · Relics ${run.relics.length} · Deck ${run.deck.length} · Gold ${run.gold} · Biggest hit ${st.maxHit}</div><button class="btn pri full" id="restart" onclick="W.S={screen:'title'};render()">🔄 Play again</button></div>${lampSummaryHTML(sum)}</div>`}
// Keep a pristine HTML tree separate from the decorated, animated live DOM. Comparing
// sources preserves fitted text, sprite animations and stage styles on unchanged nodes.
let renderTree=null,renderedCombat=null;
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
function updateHTML(app,html,reset){const next=document.createElement('div');next.innerHTML=html;
 if(reset||!renderTree){app.replaceChildren(...[...next.childNodes].map(n=>n.cloneNode(true)));bindTree(next,app)}
 else{liveNodes.set(next,app);patchChildren(renderTree,next,app)}renderTree=next;
}

// ---------------- render ----------------
export function render(){if(W.previewing)return;if(drag||(W.chartDrag&&Date.now()-W.chartDrag<10000))return;const a=document.getElementById('app');let h='';const s=W.S.screen;
 if(s==='title')h=titleScr();
 else if(s==='travel')h=travelScr();
 else if(s==='map')h=`<div class="page mappage">`+topBar()+mapHTML(true)+'</div>';
 else if(s==='combat'&&W.cb)h=combatScr();
 else{const fit=['reward','shop','pick','chest','rest','event','potpick','msg'].includes(s);h=`<div class="page ${fit?'fit fit-'+s:''}">`;
  if(s==='reward')h+=rewardScr();else if(s==='chest')h+=chestScr();else if(s==='shop')h+=shopScr();else if(s==='rest')h+=restScr();else if(s==='event')h+=eventScr();
  else if(s==='pick')h+=pickScr();else if(s==='potpick')h+=potPickScr();
  else if(s==='msg')h+=topBar()+`<div class="panel msgp"><h2>${W.S.title}</h2><p>${W.S.text}</p></div><div class="actions"><button class="btn pri" id="msgok" onclick="W.S.next()">Continue</button></div>`;
  else if(s==='end')h+=endScr();
  h+='</div>'}
 if(W.run&&s!=='title'&&s!=='end')h+=popHTML();
 if(W.S.ov==='map'&&W.run){h+=`<div class="ov" id="ovl" onclick="if(event.target===this){W.S.ov=null;render()}"><div class="box mapbox">${mapHTML(false)}<button class="btn full" onclick="W.S.ov=null;render()">Close map</button></div></div>`}
 else if(W.S.ov==='tasks'&&W.run){h+=tasksHTML()}
 else if(W.S.ov==='settings'){h+=`<div class="ov" id="ovl" onclick="if(event.target===this){W.S.ov=null;render()}"><div class="box"><h2>⚙️ Settings</h2>${settingsHTML()}${W.run?`<div class="muted">Seed ${W.run.seed}</div>`:''}<button class="btn full" onclick="W.S.ov=null;render()">Close</button></div></div>`}
 else if(W.S.ov&&W.run){const cb=W.cb;const list=W.S.ov==='deck'?W.run.deck:cb?(W.S.ov==='draw'?(W.run.cls==='carto'?cb.draw:cb.draw.slice().sort((a,b)=>a.id<b.id?-1:1)):W.S.ov==='disc'?cb.disc:cb.exh):[];
  const t={deck:'Your deck',draw:W.run.cls==='carto'?'Draw pile (in order: face up)':'Draw pile (order hidden)',disc:'Discard pile',exh:'Sunk this combat'}[W.S.ov];
  h+=`<div class="ov" id="ovl" onclick="W.S.ov=null;render()"><div class="box"><h2>${t} (${list.length})</h2><div class="grid small">${list.map(c=>cardHTML(c)).join('')||'<span class="muted">Empty</span>'}</div><button class="btn full">Close</button></div></div>`}
 if(inspecting)h+=inspectHTML();
 const prev=a.dataset.screen;const changed=prev!==s;
 if(changed){a.dataset.screen=s;screenChange(a,prev,s)}
 updateHTML(a,h,changed||(s==='combat'&&renderedCombat!==W.cb));renderedCombat=s==='combat'?W.cb:null;
 // Input used a full rebuild to clear temporary drag poses after drop/cancel.
 // Reused nodes need the same cleanup once the drag render gate is released.
 for(const el of a.querySelectorAll('.hand .card.drag,.cslot')){el.style.transform='';el.classList.remove('drag','armed','lift','over-zone')}
 for(const el of a.querySelectorAll('.en.hot,.foes.armed,.chartbox.dragging,.cbottom.hot'))el.classList.remove('hot','armed','dragging');
 decorateCardRefs(a);decorateKeywords(a);fitCards(a);
 if(s==='combat'){layoutHand();placeDetail();if(W.cb.sel!=null)showOutcome(W.cb.sel)}
 syncEnv();syncStage();syncAudio();syncCombatAnimations();
 if(s==='map'&&!W.S.ov){const n=a.querySelector('.node.av');if(n)n.scrollIntoView({block:'center'})}}
// Fit text within the printed frame areas; never grow a panel into the illustration.
const fittedCards=new WeakMap(),fitCache=new Map();let fitEpoch=0;
function fitSignature(c){return [fitEpoch,innerWidth,innerHeight,devicePixelRatio,c.dataset.id,c.dataset.up,
 ...['.name','.cost','.type','.text'].map(q=>{const el=c.querySelector(q);return el?.innerHTML+'@'+el?.getAttribute('style')}),
 c.querySelector('.rline')?.dataset.full].join('|')}
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
export function fitCards(root=document){for(const c of root.querySelectorAll('.card')){
  // A retained card needs no measurements if its content and viewport are unchanged.
  const content=[c.dataset.id,c.dataset.up,...['.name','.cost','.type','.text'].map(q=>c.querySelector(q)?.innerHTML),c.querySelector('.rline')?.dataset.full].join('|');
  const context=[];for(let p=c.parentElement;p&&p!==root;p=p.parentElement)context.push(p.className+'@'+(p.getAttribute('style')||''));
  const stamp=`${fitEpoch}|${innerWidth}|${innerHeight}|${devicePixelRatio}|${c.style.width}|${c.style.height}|${context.join('/')}|${content}`;
  if(fittedCards.get(c)===stamp)continue;
  if(!c.offsetWidth||!c.offsetHeight)continue;
  const transform=c.style.transform,transition=c.style.transition;c.style.transition='none';c.style.transform='none';
  const rect=c.getBoundingClientRect();
  // Fractional placement affects browser glyph rounding at the fitter's boundary.
  const key=[fitSignature(c),rect.width,rect.height,rect.left%1,rect.top%1,context.join('/')].join('|');
  const cached=fitCache.get(key);
  if(cached){for(const [q,style] of cached.panels){const box=c.querySelector(q);if(box){if(style===null)box.removeAttribute('style');else box.setAttribute('style',style)}}
   const rl=c.querySelector('.rline');if(rl&&cached.line){rl.textContent=cached.line.text;rl.classList.toggle('nofit',cached.line.nofit)}
   // Verify the cached answer once: inherited typography and browser rounding
   // can differ even when a card has the same dimensions and source text.
   const valid=['.name','.cost','.type','.text'].every(q=>{const box=c.querySelector(q);return !box||!box.clientHeight||measureCardBox(box)()});
   if(valid){c.style.transform=transform;c.style.transition=transition;fittedCards.set(c,stamp);continue}
  }
  c.classList.remove('grown');c.style.removeProperty('--tt');
  for(const selector of ['.name','.cost','.type','.text']){
    const box=c.querySelector(selector);if(!box||!box.clientHeight)continue;
    box.style.removeProperty('font-size');box.style.removeProperty('line-height');
    box.style.removeProperty('letter-spacing');box.style.top='';box.style.height='';
    box.classList.remove('tight');
    const child=box.firstElementChild;
    if(selector==='.name'&&child)child.style.transform='';
    const style=getComputedStyle(box),px=parseFloat(style.fontSize);
    const fits=measureCardBox(box);
    let lo=.5,hi=px;
    if(!fits()){for(let i=0;i<14;i++){const mid=(lo+hi)/2;box.style.setProperty('font-size',mid+'px','important');if(fits())lo=mid;else hi=mid}
      box.style.setProperty('font-size',lo+'px','important');}
  }
  c.style.transform=transform;c.style.transition=transition;
  const rl=c.querySelector('.rline');if(rl&&rl.offsetWidth){rl.classList.remove('nofit','covered');rl.textContent=rl.dataset.full||'';
    if(rl.scrollWidth>rl.clientWidth+1){rl.textContent=rl.dataset.first||'';if(rl.scrollWidth>rl.clientWidth+1){rl.classList.add('nofit')}}}
  fitCache.set(key,{panels:['.name','.cost','.type','.text'].map(q=>[q,c.querySelector(q)?.getAttribute('style')??null]),line:rl?{text:rl.textContent,nofit:rl.classList.contains('nofit')}:null});
  if(fitCache.size>2048)fitCache.delete(fitCache.keys().next().value);
  fittedCards.set(c,stamp);
}}
if(typeof document!=='undefined'&&document.fonts){
 const fontsChanged=()=>{fitEpoch++;fitCache.clear();fitCards(document);if(document.getElementById('hand'))layoutHand()};
 document.fonts.ready.then(fontsChanged);document.fonts.addEventListener('loadingdone',fontsChanged);
}
if(typeof window!=='undefined'){let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{fitCards(document);layoutHand()})})}
// ===== long-press (or right-click) to enlarge any card =====
export let inspecting=null;
export function openInspect(ci){inspecting=ci;render()}
export function closeInspect(){inspecting=null;render()}
export function inspectHTML(){const ci=inspecting,d=CARDS[ci.id];if(!d)return'';
 return `<div class="ov inspect" id="inspect" onclick="closeInspect()"><div class="insp">${cardHTML(ci,{full:true})}<div class="ikw"><b>${cname(ci)}</b> <span class="muted">${TYPEN[d.t]} · ${RARN[d.r]||''}</span><div>${desc(ci)}</div><div class="kws">${kwFor(ci)}</div>${d.flavour?`<div class="flav">${d.flavour}</div>`:''}<div class="muted">Tap anywhere to close</div></div></div></div>`}
