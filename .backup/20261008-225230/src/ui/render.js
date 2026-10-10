// ui/render.js — all screens as HTML strings. Inline handlers call the globals main.js exposes.
// Player-facing terminology follows design-v2 §0.3 (Guard, Might, Soaked, Exposed, Sink).
import {assetEntry,slotHTML,uiIcon} from '../assets.js';
import {syncEnv,envFxSettingLabel} from './env.js';
import {CARDS,CLASSES,TYPEN,RELICS,POTIONS,CHARMS,EN,KW} from '../core/registry.js';
import {loadRunData,settings,saveSettings} from '../save.js';
import {W} from '../core/state.js';
import {cname,cost,desc,kwFor,needsTarget,isUp,baseCost} from '../engine/cards.js';
import {alive,canPlay,curTgt,eAtk,intentOf,echoPlan,markBonus,flourishMin,flourishMult,hasRelic,CORE,canDrink,potionNeedsTarget,expCount} from '../engine/combat.js';
import {mod} from '../core/bus.js';
import {campOptions,scrubPrice,reachable,bootsLeft,cardOdds} from '../engine/run.js';
import {anim} from './fx.js';
import {drag} from './input.js';
import {mapHTML} from './map.js';
export const TH={tide:'tidecaller',echo:'echo-mage',carto:'cartographer',duel:'duelist',status:'',curse:'',colorless:''};
const RARN={s:'Starter',c:'Common',u:'Uncommon',r:'Rare',x:'Special'};
const esc=s=>String(s).replace(/"/g,'&quot;');
const lbl=o=>typeof o.l==='function'?o.l():o.l;
// ---------------- cards ----------------
export function cardHTML(ci,o={}){const d=CARDS[ci.id];const c=cost(ci);const base=baseCost(ci);
 const fr=assetEntry('frames',d.cls);const up=isUp(ci);
 const cls=['card','t'+d.t,'theme-'+(TH[d.cls]||''),fr?'':'nofr',o.sel?'sel':'',o.can===false?'unp':'',d.curse?'curse':'',d.cls==='status'?'status':'',o.mark?'markable':'',o.flourish?'flourishable':'',ci.open?'opening':'',d.unplay?'nocost':''].filter(Boolean).join(' ');
 return `<div class="${cls}" ${o.click?`onclick="${o.click}"`:''} data-id="${ci.id}" data-uid="${ci.uid}" data-up="${up?1:0}"${o.i!=null?` data-i="${o.i}"`:''}>
 ${slotHTML('cards',ci.id,'art',d.e)}${fr?`<img class="frame" src="${fr.src}" alt="" draggable="false" onerror="this.parentNode.classList.add('nofr');this.remove()">`:''}
 <span class="cost${c<base?' cheap':c>base?' dear':''}">${d.unplay?'':(d.c==='X'?'X':c)}</span><span class="name">${d.n}${up?'<span class="up">+</span>':''}</span><span class="type"${d.unplay?' title="Unplayable"':''}>${d.unplay?'⛔ ':''}${TYPEN[d.t]}</span><span class="text"><span>${d.unplay?desc(ci).replace(/^(<[^>]+>)?Unplayable\.(<\/[^>]+>)?\s*/,''):desc(ci)}${ci.sus?` <b class="sus">(+${ci.sus})</b>`:''}</span></span>${d.r!=='s'&&d.r!=='x'?`<span class="rarity ${d.r}"></span>`:''}${ci.open&&!d.open?'<span class="openpip" title="Opening">⚓</span>':''}${o.mark?'<span class="bell">🔔</span>':''}</div>`}
// ---------------- top bar: HP, gold, floor, potions, relics ----------------
export function topBar(){const K=CLASSES[W.run.cls];return `<div class="topbar theme-${TH[W.run.cls]}"><span class="who">${slotHTML('portraits',W.run.cls,'pt',K.e)}<span class="nm">${K.n}</span></span>
 <span class="stat hp" style="color:var(--status-damage)">❤️ ${Math.max(0,W.run.hp)}/${W.run.max}</span><span class="stat gold" style="color:var(--rarity-rare)">💰 ${W.run.gold}</span><span class="stat floor">🏔️ ${W.run.floor}/15</span>${potionSlots()}${relicBar()}<span class="sp"></span>
 <button class="mini" id="deckbtn" onclick="openOv('deck')" title="Deck">🂠 ${W.run.deck.length}</button><button class="mini" id="mapbtn" onclick="openOv('map')" title="Map">🗺️</button><button class="mini" id="setbtn" onclick="openOv('settings')" title="Settings">⚙️</button></div>${toastsHTML()}`}
export function potionSlots(){const ps=W.run.potions;return `<span class="potions" id="potions">${ps.map((id,i)=>{const p=id&&POTIONS[id];
 return `<button class="potion${p?'':' empty'}${W.S.potion===i?' on':''}" data-potion="${i}" ${p?`style="--pcol:${p.col}"`:''} title="${p?esc(p.n+': '+p.d):'Empty potion slot'}" onclick="potionTap(${i})">${p?slotHTML('potions',id,'',p.e):''}</button>`}).join('')}</span>`}
export function relicBar(){const rs=W.run.relics;const now=Date.now();return `<div class="relics" id="relicbar">${rs.map(r=>{const d=RELICS[r.id];if(!d)return'';const fl=r.flashT&&now-r.flashT<900;
 const cnt=r.id==='starfish'||r.id==='boots'?r.n:'';return `<button class="relic${fl?' flash':''}${r.used?' used':''}" title="${esc(d.n+': '+d.d)}" data-relic="${r.id}" onclick="relicTap('${r.id}')">${slotHTML('relics',r.id,'',d.e)}${cnt!==''?`<i class="cnt">${cnt}</i>`:''}</button>`}).join('')}${(W.run.charms||[]).map(c=>`<button class="relic charm" title="${esc(CHARMS[c].n+': '+CHARMS[c].d)}" onclick="relicTap('charm:${c}')">${CHARMS[c].e}</button>`).join('')}</div>`}
export function toastsHTML(){const now=Date.now();const t=(W.toasts||[]).filter(x=>now-x.t<2600);if(!t.length)return'';return `<div class="toasts">${t.map(x=>`<div class="toast t-${x.cls||""}" style="animation-delay:-${now-x.t}ms">${x.txt}</div>`).join('')}</div>`}
export function potionTap(i){if(drag)return;const id=W.run.potions[i];if(!id){W.S.potion=null;return render()}W.S.potion=W.S.potion===i?null:i;W.S.relicView=null;render()}
export function relicTap(id){if(drag)return;W.S.relicView=W.S.relicView===id?null:id;W.S.potion=null;render()}
export function closePop(){W.S.potion=null;W.S.relicView=null;render()}
function popHTML(){const S=W.S;
 if(S.potion!=null&&W.run.potions[S.potion]){const id=W.run.potions[S.potion],p=POTIONS[id];const can=canDrink(id);const tg=potionNeedsTarget(id);
  const why=!W.cb&&!p.outside?'Use it in combat':p.passive?'Works automatically when you would die':W.cb&&(W.cb.busy||W.cb.mode)?'Wait for your turn':!can?'Can\'t use this here':'';
  return `<div class="pop potpop" id="potpop" onclick="event.stopPropagation()"><b>${p.e} ${p.n}</b> <span class="muted">${RARN[p.rarity]}${p.cls?' · '+CLASSES[p.cls].n:''}</span><div>${p.d}</div>
  ${tg&&can&&W.cb?`<div class="muted">Targets: ${curTgt()?curTgt().n:'—'} (tap an enemy first to change)</div>`:''}<div class="row"><button class="btn pri" id="drinkbtn" ${can?'':'disabled'} onclick="drinkPotion(${S.potion});W.S.potion=null;render()">${can?'🧪 Drink':why}</button><button class="btn" id="discardpot" onclick="discardPotion(${S.potion})">🗑️ Discard</button><button class="btn" onclick="closePop()">✕</button></div></div>`}
 if(S.relicView){const ch=S.relicView.startsWith('charm:');const d=ch?CHARMS[S.relicView.slice(6)]:RELICS[S.relicView];const r=!ch&&W.run.relics.find(x=>x.id===S.relicView);
  if(d)return `<div class="pop relpop" id="relpop" onclick="closePop()"><b>${d.e} ${d.n}</b> <span class="muted">${ch?'Charm':(d.tierName||'')+(d.cls?' · '+CLASSES[d.cls].n:'')}</span><div>${d.d}</div>${r&&(r.id==='starfish'||r.id==='boots')?`<div class="muted">Uses left: ${r.n}</div>`:''}${d.flavour?`<div class="flav">${d.flavour}</div>`:''}</div>`}
 return ''}
export function openOv(k){if(drag)return;W.S.ov=W.S.ov===k?null:k;W.S.potion=null;W.S.relicView=null;render()}
export function hpbar(h,m,blk){return `<div class="hpbar${blk?' blk':''}"><i style="transform:scaleX(${Math.max(0,h/m)})"></i><span>${Math.max(0,h)}/${m}</span></div>`}
// Status badges with glossary names (tap/hover shows the rule).
const ST={str:['💪','Might'],dex:['🪨','Poise'],weak:['💧','Soaked'],vuln:['💔','Exposed'],brittle:['🧊','Brittle'],bleed:['🩸','Bleed'],shell:['🐚','Shell'],barbs:['🌵','Barbs'],ward:['🛡️','Rebuff'],mending:['💚','Mending']};
export function badges(block,blkT,st){const p=[];const sh=anim(blkT,700);
 if(block)p.push(`<span class="bd block${sh?' shim':''}" ${sh?`style="${sh}"`:''} title="Guard: ${esc(KW.Guard||'')}">🛡️${block}</span>`);
 for(const k in st){const v=st[k];if(!v||!ST[k])continue;const [ic,nm]=ST[k];const deb=(k==='str'&&v<0)||['weak','vuln','brittle','bleed'].includes(k);
  const kw=KW[nm]||KW[nm+' X']||'';p.push(`<span class="bd ${deb?'debuff':'buff'}" title="${nm} ${v}: ${esc(kw)}">${ic}${v}</span>`)}
 return `<div class="badges">${p.join('')}</div>`}
export function fxHTML(who){const now=Date.now();return W.cb.vfx.filter(x=>x.who===who&&now-x.t<900).map(x=>`<div class="fl ${x.cls}" style="animation-delay:-${now-x.t}ms">${x.txt}</div>`).join('')}
// ---------------- intents ----------------
export function intentHTML(e){const m=intentOf(e);const p=[];const deb=m.w||m.v||m.brittle;
 if(m.a)p.push(`${uiIcon(deb?'intent-attack-debuff':'intent-attack','⚔️')}<span class="atk">${eAtk(e,m.a)}${m.h>1?'×'+m.h:''}</span>`);
 if(m.b)p.push(`${uiIcon('intent-defend','🛡️')}<span class="def">${m.b}</span>`);
 if(m.s||m.grow)p.push(`${uiIcon('intent-buff','⬆')}<span class="buf">+${m.s||m.grow}</span>`);
 if(deb&&!m.a)p.push(uiIcon('intent-debuff','⬇'));
 if(m.heal)p.push(`<span class="oth">💚${m.heal}</span>`);
 if(m.status)p.push(`<span class="oth">🌿${m.status.n}</span>`);
 if(m.summon)p.push(`<span class="oth">📯</span>`);if(m.steal)p.push(`<span class="oth">💰🏃</span>`);if(m.ring)p.push(`<span class="oth">🔔${m.ring}</span>`);
 if(m.stealPotion)p.push(`<span class="oth">🧪</span>`);if(m.drainE)p.push(`<span class="oth">⚡−${m.drainE}</span>`);
 if(m.none&&!p.length)p.push(`${uiIcon('intent-unknown','❔')}<span class="oth">…</span>`);
 return `<div class="intent${m.mirror?' mirror':''}" title="${esc(intentText(e))}">${p.join('')}</div>`}
export function intentText(e){const m=intentOf(e);const p=[];if(m.lbl)p.push(m.lbl+':');
 if(m.mirror)p.push('(copies the type of the last card you play this turn: Attack → attack 15, Skill → 12 Guard, Power → +2 Might; play nothing and it attacks for 15)');
 if(m.none)p.push('Does nothing');
 if(m.a)p.push(`Attack for ${eAtk(e,m.a)}${m.h>1?' × '+m.h:''}`+(m.boom?' then dies':''));if(m.b)p.push(`Gain ${m.b} Guard`);if(m.s)p.push(`Gain ${m.s} Might`);
 if(m.grow)p.push(`All Tendrils gain ${m.grow} Might; summons a Tendril if fewer than 2`);if(m.w)p.push(`Apply ${m.w} Soaked`);if(m.v)p.push(`Apply ${m.v} Exposed`);if(m.brittle)p.push(`Apply ${m.brittle} Brittle`);
 if(m.heal)p.push(`Heal ${m.heal}`);if(m.status)p.push(`Add ${m.status.n} ${CARDS[m.status.id].n} to your ${m.status.pile==='disc'?'discard pile':m.status.pile==='hand'?'hand':'draw pile'}`);
 if(m.summon)p.push(`Summon a ${EN[m.summon].n}`);if(m.steal)p.push(`Steal ${m.steal} gold and flee`);if(m.ring)p.push(`Add ${m.ring} Ringing to your discard pile`);
 if(m.stealPotion)p.push('Steal a potion');if(m.drainE)p.push(`You lose ${m.drainE} Energy next turn`);
 if(e.passive)p.push(`· Passive ${e.passive.n}: ${e.passive.text}`);return p.join(' ')}
// ---------------- class bars (v2.1 rules, all actions non-blocking) ----------------
export function classBar(){const c=W.run.cls,cb=W.cb;
 if(c==='tide'){const T=CORE.tide;let g='';for(let i=0;i<=10;i++)g+=`<i class="${i<=cb.tide?'on':''} ${i>=T.high?'hi':i<=T.low?'lo':''} ${i===cb.tide?'cur':''}"></i>`;
  const st=cb.tide>=T.high?'<b class="hi">HIGH</b>':cb.tide<=T.low?'<b class="lo">LOW</b>':'<b>Mid</b>';
  const cr=mod('crest',{preview:true},{dmg:T.crest_dmg,resetTo:5}),un=mod('undertow',{preview:true},{guard:T.undertow_blk,draw:T.undertow_draw,resetTo:5});
  const arrow=cb.tideDir>0?'<span class="arrow up" title="Drift: the Tide rises 1 at the start of your turn">⬆</span>':cb.tideDir<0?'<span class="arrow dn" title="Drift: the Tide falls 1 at the start of your turn">⬇</span>':'<span class="arrow" title="No drift yet">•</span>';
  let btn='';if(hasRelic('tidetable')&&!cb.tideBtnUsed)btn+=`<button class="tbtn" id="tideup" onclick="tideAct('up')" title="Tide Table: Surge 1 (free, once per turn)">+1</button><button class="tbtn" id="tidedn" onclick="tideAct('down')" title="Tide Table: Recede 1 (free, once per turn)">−1</button>`;
  if(hasRelic('helmwheel')&&!cb.wheelUsed&&cb.tideDir)btn+=`<button class="tbtn" id="tideflip" onclick="tideAct('flip')" title="Helmsman's Wheel: flip the drift arrow">☸️</button>`;
  return `<span class="tst">${st} <b class="tnum">${cb.tide}</b>${arrow}</span><div class="gauge${anim(cb.crestT,700)?' crest':''}${anim(cb.undertowT,700)?' under':''}" title="10 = Crest (${cr.dmg} to ALL) · 0 = Undertow (${un.guard} Guard, draw ${un.draw}) · High ${T.high}+ · Low ${T.low}−">${g}</div>${btn}`}
 if(c==='echo'){const plan=echoPlan(true);let t;
  const mk=cb.mark?`<span class="chip marked">🔔 ${cname(cb.mark)} +${markBonus()}</span>`:`<button class="tbtn mark${cb.armMark?' on':''}" id="markbtn" onclick="armMark()" title="Mark the next card you play: it Echoes at the end of your turn (+1 per card played after it, max +2)">🔔 ${cb.armMark?'Marking…':'Mark'}</button>`;
  if(plan){const d=CARDS[plan.card.id];t=`🔊 <span class="chip next">${d.e} ${cname(plan.card)}${plan.half?' ½':''}${plan.bonus?' +'+plan.bonus:''}</span>${plan.repeats>1?' ×'+plan.repeats:''}${plan.mult>1?' <b class="dbl">×2</b>':''}${plan.allTargets?' ALL':''}`}
  else t='<span class="muted">No Echo yet</span>';
  return mk+' '+t}
 if(c==='carto'){let s='';const pk=cb.mode&&cb.mode.k==='slot';const lim=mod('advances',{},1);const canAdv=!pk&&cb.advUsed<lim&&!cb.busy&&!cb.mode;
  for(let i=0;i<cb.nslots;i++){const w=cb.slots[i];const r=w?(w.rank||0):0;const pips=w?`<span class="pips">${[0,1,2].map(k=>`<i class="${k<r?'on':''}"></i>`).join('')}</span>`:'';
   const adv=w&&canAdv&&r<CORE.carto.rank_max;
   s+=w?`<button class="wp full${pk?' pick':''}${adv?' adv':''}${r>=CORE.carto.rank_max?' land':''}${anim(w.trigT,600)?' trig':''}" data-slot="${i}" onclick="${pk?`modeAct('slot',${i})`:adv?`advance(${i})`:''}" title="${esc(cname(w)+': '+desc(w).replace(/<[^>]+>/g,'')+(adv?' — tap to Advance (+1 Rank, +3 damage per Rank)':''))}">${CARDS[w.id].e}<span class="wpn">${cname(w)}</span>${pips}</button>`:`<div class="wp">·</div>`}
  const nd=mod('drawCount',{},4);const nx=cb.draw.slice(0,3).map((ci,i)=>`<span class="chip ${i<nd?'next':''}">${CARDS[ci.id].e} ${cname(ci)}</span>`).join('')||'<span class="muted">reshuffle</span>';
  return `<div class="wps">${s}</div><span class="advhint">${canAdv&&cb.slots.length?'⛰️ Tap a Waypoint to Advance':cb.advUsed?'⛰️ Advanced':''}</span><span class="nexts">🗺️ ${nx}</span>`}
 if(c==='duel'){const D=CORE.duel;const max=mod('momMax',{},D.mom_max);let p='';for(let i=0;i<max;i++)p+=`<i class="${i<cb.mom?'on':''}"></i>`;
  const can=cb.mom>=flourishMin();const mult=flourishMult(cb.mom);
  const fb=`<button class="tbtn flo${cb.armFlourish?' on':''}" id="flourishbtn" ${can?'':'disabled'} onclick="armFlourish()" title="Flourish: your next Attack spends all Momentum and deals ×(1 + ½ per Momentum)">⚔️ ${can?(cb.armFlourish?'FLOURISH ×'+mult:'Flourish ×'+mult):'Flourish ('+flourishMin()+'+)'}</button>`;
  return `<span>Momentum</span><span class="pips mom">${p}</span>${fb}${cb.parry?`<span class="chip parry">🤺 Parry ${cb.parry}</span>`:''}${cb.keepMom?'<span class="chip">🏃 keeps</span>':''}`}}
// ---------------- combat ----------------
export function enemyHTML(e,i){const many=alive().length>1;const sh=anim(e.shake,400);const at=anim(e.atkT,400);
 return `<div class="en ${e.boss?'boss':''} ${e.elite?'elite':''} ${many&&W.cb.tgt===i?'tg':''}" onclick="tgt(${i})" data-en="${i}" data-key="${e.key}">
 ${intentHTML(e)}<div class="fig ${sh?'shake':''} ${at?'lunge':''}" ${sh?`style="${sh}"`:''}>${slotHTML('enemies',e.key,'en-slot',e.e)}${badges(e.block,e.blkT,e.st)}</div>
 <div class="nm">${e.n}${e.elite?' <span class="star">★</span>':''}${e.boss&&e.key==='bell'?` <span class="ph">P${e.ph}</span>`:''}${e.passive?` <span class="pas" title="${esc(e.passive.n+': '+e.passive.text)}">🌿${e.passive.n}</span>`:''}</div>${hpbar(e.hp,e.max,e.block)}${fxHTML(e.uid)}</div>`}
export function heroHTML(){const K=CLASSES[W.run.cls];const sh=anim(W.cb.pshake,400);
 return `<div class="hero theme-${TH[W.run.cls]}" id="hero"><div class="fig ${sh?'shake':''}" ${sh?`style="${sh}"`:''}>${slotHTML('figures',W.run.cls,'',K.e)}${badges(W.cb.p.block,W.cb.p.blkT,W.cb.p.st)}</div>
 <div class="nm hn">${K.n}</div>${hpbar(W.run.hp,W.run.max,W.cb.p.block)}${fxHTML('p')}</div>`}
export function tipHTML(){const cb=W.cb;
 if(cb.sel!=null&&cb.hand[cb.sel]){const ci=cb.hand[cb.sel],d=CARDS[ci.id];const can=canPlay(ci),nt=needsTarget(ci);const t=nt?curTgt():null;
  const why=d.unplay?'Unplayable':cost(ci)>cb.energy?'Not enough Energy':'Can\'t play now';
  return `<div class="tip" id="detail"><div><b>${d.e} ${cname(ci)}</b> · ${cost(ci)}⚡ · ${TYPEN[d.t]}${RARN[d.r]&&d.r!=='s'?' · '+RARN[d.r]:''}</div><div class="desc">${desc(ci)}</div><div class="kws">${kwFor(ci)}</div>
  <button class="btn pri" id="playbtn" onclick="playSel()" ${can?'':'disabled'}>${can?'▶ Play'+(t?' on '+t.n:''):why}</button></div>`}
 if(cb.insp!=null&&cb.ens[cb.insp]&&cb.ens[cb.insp].hp>0){const e=cb.ens[cb.insp];return `<div class="tip" id="detail"><b>${e.e} ${e.n}</b> <span class="muted">${e.hp}/${e.max}</span><br>${intentText(e)}</div>`}
 return ''}
function calloutsHTML(){const now=Date.now();const c=(W.cb.callouts||[]).filter(x=>now-x.t<1300);return c.length?`<div class="callouts">${c.slice(-2).map(x=>`<div class="co c-${x.cls}" style="animation-delay:-${now-x.t}ms">${x.txt}</div>`).join('')}</div>`:''}
export function combatScr(){const cb=W.cb;let h=`<div class="combat theme-${TH[W.run.cls]}${cb.kind==='boss'?' bossfight':''}">`+topBar();
 h+=`<div class="subbar"><div class="classbar">${classBar()}</div></div>`;
 h+=`<div class="scene" onclick="sceneTap(event)"><div class="ground"></div>${heroHTML()}<div class="foes">${cb.ens.map((e,i)=>e.hp>0&&!e.fled?enemyHTML(e,i):'').join('')}</div>${tipHTML()}${calloutsHTML()}`;
 h+=`<div class="log">${cb.log.slice(0,3).map((l,i)=>`<div style="opacity:${1-i*.25}">${l}</div>`).join('')}</div>`;
 if(cb.banner){const a=anim(cb.banner.t,900);if(a)h+=`<div class="banner ${cb.banner.en?'en':''}" style="${a}">${cb.banner.txt}</div>`}
 const fl=W.run.cls==='duel'&&cb.armFlourish,mkA=W.run.cls==='echo'&&cb.armMark;
 h+=`</div><div class="bottom"><div class="hand${fl?' flourishing':''}${mkA?' marking':''}" id="hand">${cb.hand.map((ci,i)=>{const d=CARDS[ci.id];return cardHTML(ci,{sel:cb.sel===i,can:canPlay(ci),i,flourish:fl&&d.t==='A',mark:mkA&&d.t!=='P'&&(!d.faint||hasRelic('hollowreed'))&&!d.unplay})}).join('')}</div>
 <div class="ctl"><div><div class="orb ${cb.energy?'':'empty'}" id="orb" title="Energy"><span>${cb.energy}/${cb.maxE}</span></div><button class="pile" id="drawpile" onclick="openOv('draw')" title="Draw pile">📚 ${cb.draw.length}</button></div>
 <div><button class="endbtn" id="endbtn" onclick="endTurn()" ${cb.busy||cb.mode?'disabled':''}>${cb.busy?'Enemy…':'End Turn'}</button><div class="row2"><button class="pile" id="exhpile" onclick="openOv('exh')" title="Sunk (removed for this combat)">⚓ ${cb.exh.length}</button><button class="pile" id="discpile" onclick="openOv('disc')" title="Discard pile">🗑️ ${cb.disc.length}</button></div></div></div></div>`;
 const m=cb.mode;
 if(m&&m.k==='choice')h+=`<div class="ov"><div class="box"><h2>${m.title}</h2>${m.opts.map((o,i)=>`<button class="btn opt" onclick="modeAct('choice',${i})">${lbl(o)}</button>`).join('')}</div></div>`;
 if(m&&m.k==='slot')h+=`<div class="ov"><div class="box"><h2>${m.title}</h2>${cb.slots.map((w,i)=>`<button class="btn opt slotpick" onclick="modeAct('slot',${i})">${CARDS[w.id].e} ${cname(w)}${w.rank?' (Rank '+w.rank+')':''}${w.temp?' (starting)':''}</button>`).join('')}</div></div>`;
 if(m&&m.k==='chart'){let rows='';for(let i=0;i<m.n;i++){const ci=cb.draw[i];rows+=`<div class="row"><b>#${i+1}</b><span class="nm">${CARDS[ci.id].e} ${cname(ci)} <span class="muted">${cost(ci)}⚡ ${TYPEN[CARDS[ci.id].t]}</span></span><button class="mini" onclick="modeAct('up',${i})">▲</button><button class="mini" onclick="modeAct('dn',${i})">▼</button><button class="mini" ${m.moved?'disabled':''} onclick="modeAct('bot',${i})">⤓ Bottom</button></div>`}
  h+=`<div class="ov"><div class="box"><h2>🗺️ Chart: reorder the top of your draw pile</h2><div class="muted">#1 is drawn first. You may send one card to the bottom.</div>${rows}<button class="btn pri full" id="chartdone" onclick="modeAct('done')">Done</button></div></div>`}
 return h+'</div>'}
export function tgt(i){const cb=W.cb;if(!cb||cb.busy||drag)return;if(cb.mode)return;const e=cb.ens[i];if(!e||e.hp<=0)return;cb.tgt=i;
 if(cb.sel!=null&&cb.hand[cb.sel]&&needsTarget(cb.hand[cb.sel])){const s=cb.sel;return window.playCard(s)}
 cb.insp=cb.insp===i?null:i;cb.sel=null;render()}
export function sceneTap(ev){if(!W.cb||drag)return;if(ev.target.closest('.en,.tip,.hero'))return;if(W.cb.sel!=null||W.cb.insp!=null){W.cb.sel=null;W.cb.insp=null;render()}}
export function layoutHand(){const hand=document.getElementById('hand');if(!hand)return;const cards=[...hand.querySelectorAll('.card')];const n=cards.length;if(!n)return;hand.classList.add('instant');
 const short=matchMedia('(orientation:landscape) and (max-height:500px)').matches;
 const Wd=hand.clientWidth,cw=cards[0].offsetWidth,ch=cards[0].offsetHeight;const step=n>1?Math.min(cw*(short?1.04:.9),(Wd-cw*(short?1.02:1.2))/(n-1)):0;const hr=hand.getBoundingClientRect();const cx=hr.left+Wd/2;
 const zoom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--zoom'))||1.4;const ang=short?1.5:n>6?2.5:4;
 const fo=document.querySelector('.foes');const fr=fo&&fo.getBoundingClientRect();
 cards.forEach((el,i)=>{const off=i-(n-1)/2;const x=off*step,y=Math.abs(off)*Math.abs(off)*cw*(short?.006:.018);
  const sel=el.classList.contains('sel');const zw=cw*(sel?zoom:1.25);let hi=innerWidth-zw/2-4-cx;
  if(short&&sel&&fr&&fr.width&&hr.bottom-ch*zoom<fr.bottom)hi=Math.min(hi,fr.left-zw/2-6-cx);
  const xs=Math.max(zw/2+4-cx,Math.min(hi,x));
  el.style.setProperty('--x',x+'px');el.style.setProperty('--y',y+'px');el.style.setProperty('--r',off*ang+'deg');el.style.setProperty('--xs',xs+'px');el.dataset.x=x;el.dataset.y=y});void hand.offsetWidth;hand.classList.remove('instant')}
// ---------------- title / travel ----------------
export function titleScr(){const sv=loadRunData();return `<div class="page title"><h1>Tidebound Ascent</h1><div class="sub">Climb the Drowned Stair. Pick a class: each one plays by its own rule.</div>`+
 (sv?`<button class="btn pri full" id="continue" onclick="continueRun()" style="margin-bottom:10px">▶ Continue run: ${CLASSES[sv.run.cls].n}, floor ${sv.run.floor}/15, ❤️ ${sv.run.hp}/${sv.run.max}</button>`:'')+
 `<div class="clsgrid">`+Object.entries(CLASSES).map(([k,c])=>`<button class="cls theme-${TH[k]}" onclick="newRun('${k}')" data-cls="${k}">${slotHTML('portraits',k,'',c.e)}<span><b class="cname">${c.n}</b> <span class="muted">❤️ ${c.hp} · ${c.tag}</span><br><span class="rule">${c.rule}</span></span></button>`).join('')+
 `</div>${settingsHTML()}<div class="muted" style="text-align:center;margin-top:8px">Act 1: 15 floors · 8 enemies · 3 elites · 2 bosses · relics, potions, events · tap or drag to play</div></div>`}
export function settingsHTML(){return `<div class="settings"><label><input type="checkbox" id="setfast" ${settings.fastAnim?'checked':''} onchange="setFast(this.checked)"> Fast animations</label>
 <label>Effects <select id="setenvfx" onchange="setEnvFx(this.value)">${['full','reduced','off'].map(v=>`<option value="${v}" ${settings.envFx===v?'selected':''}>${envFxSettingLabel(v)}</option>`).join('')}</select></label></div>`}
export function setFast(on){settings.fastAnim=!!on;window.FAST=on?1:0;saveSettings()}
export function setEnvFx(v){settings.envFx=v;saveSettings();render()}
function travelScr(){const ok=Date.now()-(W.S.t||0)>1000;return `<div class="page travel" onclick="skipTravel()"><div class="tcard"><div class="act">Act I</div><h1>The Drowned Stair</h1><div class="sub">The sea took the old world. The stair still climbs.</div>
 <div class="boss muted">At the summit waits <b>${EN[W.run.boss].e} ${EN[W.run.boss].n}</b></div></div><div class="skip muted">${ok?'Tap to begin':'…'}</div></div>`}
export function skipTravel(){if(W.S.screen!=='travel')return;if(Date.now()-(W.S.t||0)<1000&&!window.FAST)return;W.S={screen:'map'};render()}
// ---------------- rewards / chests ----------------
function rowHTML(r,i,click){const done=r.done;let ic='',t='';
 if(r.k==='gold'){ic='💰';t=`${r.n} gold ${r.note||''}`}
 else if(r.k==='relic'){const d=RELICS[r.id];ic=slotHTML('relics',r.id,'ri',d.e);t=`<b>${d.n}</b> <span class="muted">${d.tierName}</span><br><span class="rd">${d.d}</span>`}
 else if(r.k==='potion'){const p=POTIONS[r.id];ic=slotHTML('potions',r.id,'ri',p.e);t=`<b>${p.n}</b> <span class="muted">potion</span><br><span class="rd">${p.d}</span>`}
 else if(r.k==='cards'){ic='🂠';t=r.took?`Took <b>${CARDS[r.took].n}</b>`:r.skipped?'Skipped card':`<b>Choose a card</b> <span class="muted">(${r.cards.length})</span>`}
 return `<button class="rrow ${r.k}${done?' done':''}" data-row="${i}" ${done?'disabled':`onclick="${click}(${i})"`}><span class="ric">${ic}</span><span class="rt">${t}</span>${done?'<span class="ck">✔</span>':''}</button>`}
function rewardScr(){const S=W.S;let h=topBar()+`<h2>${S.title}</h2>`;
 if(S.cardsOpen!=null){const row=S.rows[S.cardsOpen];const boss=S.kind==='boss';
  h+=`<div class="sub">Choose a card to add to your deck <span class="muted">(hold a card to enlarge)</span></div><div class="grid rewgrid">${row.cards.map((id,j)=>cardHTML({id,uid:-1-j,up:false},{click:`rewCard(${j})`})).join('')}</div>
  <div class="actions"><button class="btn" onclick="rewCloseCards()">↩ Back</button><button class="btn" id="skipcard" onclick="rewSkipCards()">Skip card</button></div>`;return h}
 if(S.swap!=null){const row=S.rows[S.swap],p=POTIONS[row.id];
  h+=`<div class="sub">Your potion slots are full. Swap <b>${p.e} ${p.n}</b> for one you hold, or discard it.</div><div class="swaps">${W.run.potions.map((id,s)=>`<button class="btn opt" onclick="potionSwap(${s})">Replace ${POTIONS[id].e} ${POTIONS[id].n}</button>`).join('')}<button class="btn opt" id="discardnew" onclick="potionSwap(-1)">🗑️ Discard ${p.n}</button></div>`;return h}
 h+=`<div class="rrows">${S.rows.map((r,i)=>rowHTML(r,i,'claimRow')).join('')}</div><div class="actions"><button class="btn pri" id="proceed" onclick="rewDone()">${S.kind==='boss'?'🏆 Finish the act':'Proceed ➜'}</button></div>`;return h}
function chestScr(){const S=W.S;let h=topBar()+`<h2>💎 ${S.name}</h2>`;
 if(!S.opened)return h+`<div class="chestwrap"><button class="chest ${S.chest}" id="openchest" onclick="openChestLid()"><span class="lid">🧰</span><span class="muted">Tap to open</span></button></div><div class="actions"><button class="btn" onclick="goMap()">Leave it</button></div>`;
 return h+`<div class="chestwrap open ${S.chest}" style="${anim(S.openT,600)||''}"><span class="lid">✨</span></div><div class="rrows">${S.rows.map((r,i)=>rowHTML(r,i,'claimRow')).join('')}</div><div class="actions"><button class="btn pri" id="proceed" onclick="goMap()">Proceed ➜</button></div>`}
// ---------------- merchant (4 shelves + Scrub; prices rolled on entry) ----------------
function shopScr(){const S=W.S;const g=W.run.gold;const sp=scrubPrice();
 const card=(it,sh,i)=>`<div class="shopitem${it.sold?' sold':''}${it.sale?' sale':''}${anim(it.noT,400)?' no':''}">${it.sold?'<div class="soldcard">SOLD</div>':cardHTML({id:it.id,uid:-100-i-(sh==='colorless'?10:0),up:false},{click:`buy('${sh}',${i})`,can:g>=it.price})}<span class="price${g<it.price?' poor':''}">${it.sold?'SOLD':(it.sale?'<s>'+Math.round(it.base)+'</s> ':'')+'💰 '+it.price}</span>${it.sale&&!it.sold?'<span class="saletag">SALE</span>':''}</div>`;
 const icon=(it,sh,i,group,def)=>`<button class="shopicon${it.sold?' sold':''}${it.right?' right':''}${anim(it.noT,400)?' no':''}" ${it.sold?'disabled':`onclick="buy('${sh}',${i})"`} title="${esc(def.n+': '+def.d)}" data-shelf="${sh}" data-i="${i}">${slotHTML(group,it.id,'',def.e)}<span class="inm">${def.n}</span><span class="price${g<it.price?' poor':''}">${it.sold?'SOLD':'💰 '+it.price}</span>${it.right?'<i class="shoptag">SHOP</i>':''}</button>`;
 return topBar()+`<div class="shophead"><h2>🏮 Wren's Driftwood Bazaar</h2><span class="muted">hold a card to enlarge · scroll the card shelf ➜</span></div>
 <div class="shelf cards" id="cardshelf"><div class="shlbl">Cards</div>${S.cards.map((it,i)=>card(it,'cards',i)).join('')}<div class="shlbl">Colourless<br><span class="muted">(extra class cards until Phase 2)</span></div>${S.colorless.map((it,i)=>card(it,'colorless',i)).join('')}</div>
 <div class="shelfrow"><div class="shelf relics"><div class="shlbl">Relics</div>${S.relics.map((it,i)=>icon(it,'relics',i,'relics',RELICS[it.id])).join('')}</div>
 <div class="shelf potions"><div class="shlbl">Potions</div>${S.potions.map((it,i)=>icon(it,'potions',i,'potions',POTIONS[it.id])).join('')}</div>
 <div class="shelf svc"><button class="btn" id="scrub" onclick="shopRemove()" ${S.scrubbed||g<sp?'disabled':''}>✂️ Scrub a card<br>💰 ${sp}${S.scrubbed?' (used)':''}</button><button class="btn pri" id="leaveshop" onclick="goMap()">Leave ➜</button></div></div>`}
// ---------------- camp / event / pick / misc ----------------
function restScr(){return topBar()+`<div class="roomhead"><h2>🔥 Stairwell Camp</h2><div class="sub">The fire crackles. Choose one.</div></div><div class="campopts">${campOptions().map(o=>`<button class="btn camp${o.k==='mend'?' pri':''}" data-camp="${o.k}" onclick="campDo('${o.k}')"><b>${o.l}</b><span>${o.d}</span></button>`).join('')}</div>`}
function eventScr(){const e=W.S.ev;return topBar()+`<div class="evpanel"><div class="evimg">${e.e}</div><div class="evtxt"><h2>${e.sub||e.n}</h2><p>${e.t}</p><div class="evopts">${e.o.map((o,i)=>`<button class="btn opt" onclick="evOpt(${i})" ${o.ok&&!o.ok()?'disabled':''}>${lbl(o)}</button>`).join('')}</div></div></div>`}
function pickScr(){const S=W.S;const list=window.pickable(S.mode,S.filter);return topBar()+`<h2>${S.title}</h2>${S.mode==='upgrade'?'<div class="sub">Cards are shown with their upgrade (green).</div>':''}<div class="grid">${list.map(c=>cardHTML(S.mode==='upgrade'?{...c,up:true}:c,{click:`pickCard(${c.uid})`})).join('')}</div><div class="actions">${S.cancel?'<button class="btn full" id="pickcancel" onclick="pickCancel()">Cancel</button>':'<button class="btn full" id="pickskip" onclick="pickCancel()">Skip</button>'}</div>`}
function potPickScr(){const S=W.S;const free=W.run.potions.filter(p=>!p).length;return topBar()+`<h2>${S.title}</h2><div class="sub">Pick up to ${Math.min(3,free)} (free slots: ${free}).</div><div class="swaps">${S.ids.map((id,j)=>`<button class="btn opt${S.chosen.includes(j)?' on':''}" onclick="potPickToggle(${j})">${POTIONS[id].e} <b>${POTIONS[id].n}</b>: ${POTIONS[id].d}</button>`).join('')}</div><div class="actions"><button class="btn pri" id="potpickdone" onclick="potPickDone()">Done</button></div>`}
function endScr(){const run=W.run,K=CLASSES[run.cls],st=run.stats;const mins=Math.round(((st.endT||Date.now())-st.startT)/60000);
 return `<div class="end"><div class="big">${run.won?'🏆':'🪦'}</div><h1>${run.won?'Act 1 cleared!':'Defeated'}</h1><p class="sub">${run.won?`${K.e} ${K.n} silenced ${EN[run.boss].n}.`:`${K.e} ${K.n} fell on floor ${run.floor} of 15.`}</p>
 <div class="panel">Seed ${run.seed} · ${mins} min · Enemies ${run.kills} · Elites ${st.elites.reduce((a,b)=>a+b,0)} · Relics ${run.relics.length} · Deck ${run.deck.length} · Gold ${run.gold} · Biggest hit ${st.maxHit}</div><button class="btn pri full" id="restart" onclick="W.S={screen:'title'};render()">🔄 Play again</button></div>`}
// ---------------- render ----------------
export function render(){if(drag)return;const a=document.getElementById('app');let h='';const s=W.S.screen;
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
 else if(W.S.ov==='settings'){h+=`<div class="ov" id="ovl" onclick="if(event.target===this){W.S.ov=null;render()}"><div class="box"><h2>⚙️ Settings</h2>${settingsHTML()}${W.run?`<div class="muted">Seed ${W.run.seed}</div>`:''}<button class="btn full" onclick="W.S.ov=null;render()">Close</button></div></div>`}
 else if(W.S.ov&&W.run){const cb=W.cb;const list=W.S.ov==='deck'?W.run.deck:cb?(W.S.ov==='draw'?(W.run.cls==='carto'?cb.draw:cb.draw.slice().sort((a,b)=>a.id<b.id?-1:1)):W.S.ov==='disc'?cb.disc:cb.exh):[];
  const t={deck:'Your deck',draw:W.run.cls==='carto'?'Draw pile (in order: face up)':'Draw pile (order hidden)',disc:'Discard pile',exh:'Sunk this combat'}[W.S.ov];
  h+=`<div class="ov" id="ovl" onclick="W.S.ov=null;render()"><div class="box"><h2>${t} (${list.length})</h2><div class="grid small">${list.map(c=>cardHTML(c)).join('')||'<span class="muted">Empty</span>'}</div><button class="btn full">Close</button></div></div>`}
 if(inspecting)h+=inspectHTML();
 a.innerHTML=h;
 if(s==='combat')layoutHand();
 syncEnv();
 if(s==='map'&&!W.S.ov){const n=a.querySelector('.node.av');if(n)n.scrollIntoView({block:'center'})}}
// ===== long-press (or right-click) to enlarge any card =====
export let inspecting=null;
export function openInspect(ci){inspecting=ci;render()}
export function closeInspect(){inspecting=null;render()}
export function inspectHTML(){const ci=inspecting,d=CARDS[ci.id];if(!d)return'';
 return `<div class="ov inspect" id="inspect" onclick="closeInspect()"><div class="insp">${cardHTML(ci)}<div class="ikw"><b>${cname(ci)}</b> <span class="muted">${TYPEN[d.t]} · ${RARN[d.r]||''}</span><div>${desc(ci)}</div><div class="kws">${kwFor(ci)}</div>${d.flavour?`<div class="flav">${d.flavour}</div>`:''}<div class="muted">Tap anywhere to close</div></div></div></div>`}
