// ui/classdais.js: the class mechanic display that stands in the world beside the hero (Task 30: drawn objects, no panel).
// Tidecaller = brass tide-gauge, Echo Mage = hanging verdigris hand-bell with ripple rings, Cartographer = chart strip with a rope and
// cairns, Duelist = rapier planted in the step with a wick flame (tap the flame to arm Flourish). Every part is a real element with a
// data-info popup (hover / tap / long-press). All motion is CSS; the objects are SVG / CSS stand-ins until painted pieces exist
// (art/v2/ui/icons.json 'dais' ids dais-tide / dais-echo / dais-carto / dais-duel draw over the stand-in with no code change).
// Drag previews: showMeterPreview(result) paints gold dashed "ghosts" of where the dragged card will leave the meter.
import {canDecamp,GUARD_PER_RANK} from '../engine/combat.js';
import {CARDS} from '../core/registry.js';
import {W} from '../core/state.js';
import {cname,desc} from '../engine/cards.js';
import {echoPlan,echoPreview,canMark,markBonus,flourishMin,flourishMult,hasRelic,CORE} from '../engine/combat.js';
import {mod} from '../core/bus.js';
import {anim} from './fx.js';
import {T} from '../core/timing.js';
import {DAIS_ART,slotHTML} from '../assets.js';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const tideInfo=cb=>{const t=CORE.tide,cr=mod('crest',{preview:true},{dmg:t.crest_dmg,resetTo:5}),un=mod('undertow',{preview:true},{guard:t.undertow_blk,draw:t.undertow_draw,resetTo:5});
 return `Tide ${cb.tide}/10. 10: Crest, ${cr.dmg} to ALL. 0: Undertow, ${un.guard} Guard, draw ${un.draw}. ${cb.holdDrift?'No drift next turn.':cb.tideDir?`Drifts ${mod('drift',{},t.drift)*mod('driftCount',{},1)} ${cb.tideDir>0?'up':'down'} next turn.`:'No drift yet.'}`};
const plain=h=>String(h).replace(/<[^>]+>/g,'');
// A PLAIN weathered verdigris bronze hand-bell: smooth flared body, one plain rim band, iron bracket and chain. No ridges, no jaw shapes.
export const BELL=`<svg viewBox="0 0 64 84" class="bell-svg" aria-hidden="true"><defs><linearGradient id="bz-b" x1="0" x2="1"><stop offset="0" stop-color="#4f8f80"/><stop offset=".28" stop-color="#8a7a45"/><stop offset=".55" stop-color="#b08a4a"/><stop offset=".85" stop-color="#6d6a3c"/><stop offset="1" stop-color="#3d7a6c"/></linearGradient>
 <radialGradient id="bz-p" cx=".3" cy=".25" r=".8"><stop offset="0" stop-color="#7fd0b8" stop-opacity=".5"/><stop offset="1" stop-color="#7fd0b8" stop-opacity="0"/></radialGradient></defs>
 <path d="M6 5h30c8 0 10 3 10 6" fill="none" stroke="#2a2d33" stroke-width="3.2" stroke-linecap="round"/><path d="M6 3v8" stroke="#2a2d33" stroke-width="3.2" stroke-linecap="round"/>
 <ellipse cx="32" cy="14" rx="2.6" ry="3.4" fill="none" stroke="#50555e" stroke-width="1.8"/><ellipse cx="32" cy="20" rx="2.4" ry="3.2" fill="none" stroke="#50555e" stroke-width="1.8"/>
 <path d="M32 23c-3 0-5 2-5 4.500C18 30 15 38 15 49c0 8-4 11-6 15h46c-2-4-6-7-6-15 0-11-3-19-12-21.500 0-2.500-2-4.500-5-4.500z" fill="url(#bz-b)" stroke="#16130c" stroke-width="1.4"/>
 <path d="M32 23c-3 0-5 2-5 4.500C18 30 15 38 15 49c0 8-4 11-6 15h46c-2-4-6-7-6-15 0-11-3-19-12-21.500 0-2.500-2-4.500-5-4.500z" fill="url(#bz-p)"/>
 <path d="M10 60.500c14 3 30 3 44 0" fill="none" stroke="#2b2412" stroke-opacity=".55" stroke-width="1.6"/><path d="M23 33c-4 5-5 12-5 19" fill="none" stroke="#f3e2b0" stroke-opacity=".38" stroke-width="2.2" stroke-linecap="round"/>
 <circle cx="32" cy="69" r="3.600" fill="#6b5a2c" stroke="#16130c" stroke-width="1.2"/></svg>`;
export const FLAME=`<svg viewBox="0 0 24 32" class="wick-svg" aria-hidden="true"><defs><linearGradient id="fl-g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--fl0,#c8501c)"/><stop offset=".55" stop-color="var(--fl1,#ffb347)"/><stop offset="1" stop-color="var(--fl2,#fff1b8)"/></linearGradient></defs>
 <path class="fl-out" d="M12 1c2 6 9 10 9 18a9 9 0 0 1-18 0c0-5 3-7 5-11 1 2 2 3 3 3 0-3 0-6 1-10z" fill="url(#fl-g)"/><path d="M12 15c1 3 4 5 4 9a4 4 0 0 1-8 0c0-3 2-4 4-9z" fill="#fffbe0" opacity=".85"/></svg>`;
const mini=(ci)=>`<span class="chm">${slotHTML('cards',ci.id,'',CARDS[ci.id].e)}</span>`;
const btn=(id,cls,on,dis,click,info,label)=>`<button class="tbtn ${cls}${on?' on':''}" id="${id}" ${dis?'disabled':''} onclick="${click}" data-info="${esc(info)}">${label}</button>`;
const frame=(cls,title,body)=>{const art=DAIS_ART['dais-'+cls];
 return `<aside class="dais dais-${cls} classbar obj${art?' has-art':''}" id="dais" data-cls="${cls}" aria-label="${title}">${art?`<img class="dais-art" src="${art}" alt="" draggable="false" onerror="this.parentNode.classList.remove('has-art');this.remove()">`:''}<div class="dais-body">${body}</div></aside>`};

// ---------- Tidecaller: brass tide-gauge ----------
let tgPrev=null,tgCb=null;
function tide(cb){if(DAIS_ART['dais-tide'])return tideArt(cb);const T=CORE.tide,lvl=cb.tide;
 const cr=mod('crest',{preview:true},{dmg:T.crest_dmg,resetTo:5}),un=mod('undertow',{preview:true},{guard:T.undertow_blk,draw:T.undertow_draw,resetTo:5});
 const dir=cb.holdDrift?['lock','Moonlock: the Tide will not drift at the start of your next turn.']:cb.tideDir>0?['up','Drift: the Tide rises 1 at the start of your turn.']:cb.tideDir<0?['dn','Drift: the Tide falls 1 at the start of your turn.']:['none','No drift yet.'];
 let b='';
 if(hasRelic('tidetable')&&!cb.tideBtnUsed)b+=btn('tideup','','',0,"tideAct('up')",'Surge 1. Free, once per turn.','+1')+btn('tidedn','','',0,"tideAct('down')",'Recede 1. Free, once per turn.','−1');
 if(hasRelic('helmwheel')&&!cb.wheelUsed&&cb.tideDir)b+=btn('tideflip','','',0,"tideAct('flip')","Helmsman's Wheel: flip the drift arrow.",'☸');
 if(cb.banks&&!cb.busy)b+=btn('relbank','rel','',0,'releaseBank()',`Release the Bank: ${cb.banks} Banked Crest${cb.banks>1?'s':''}, each 1½ × Crest damage to ALL.`,`×${cb.banks}`);else if(cb.banks)b+=`<span class="chip">×${cb.banks}</span>`;
 const hi=lvl>=T.high,lo=lvl<=T.low;
 return frame('tide','Tide',`<div class="tg2" data-lvl="${lvl}" data-info="${esc(tideInfo(cb))}">
  <div class="tg2-main"><div class="tg2-tube${anim(cb.crestT,700)?' crest':''}${anim(cb.undertowT,700)?' under':''} d-${dir[0]}${hi?' is-hi':''}${lo?' is-lo':''}" data-info="${esc(tideInfo(cb))}">
    <i class="tg2-hi"></i><i class="tg2-lo"></i><i class="tg2-w" style="height:${lvl*10}%"></i><i class="tg2-pv"></i><s></s><s></s><s></s></div>
   <div class="tg3-plate" data-info="${esc(tideInfo(cb))}"><b class="tg2-n">${lvl}</b><span class="tg3-st">${hi?'High':lo?'Low':'Calm'}</span><em class="tg2-pvn pvt"></em></div></div>
  ${b?`<div class="tg2-btns">${b}</div>`:''}</div>`)}

// Painted gauge variant: water animates from the previous level, engraved plate beside the tube, plaques at the tube ends.
function tideArt(cb){const T=CORE.tide,lvl=cb.tide;
 const cr=mod('crest',{preview:true},{dmg:T.crest_dmg,resetTo:5}),un=mod('undertow',{preview:true},{guard:T.undertow_blk,draw:T.undertow_draw,resetTo:5});
 const dir=cb.holdDrift?['lock','Moonlock: the Tide will not drift at the start of your next turn.']:cb.tideDir>0?['up','Drift: the Tide rises 1 at the start of your turn.']:cb.tideDir<0?['dn','Drift: the Tide falls 1 at the start of your turn.']:['none','No drift yet.'];
 let b='';
 if(hasRelic('tidetable')&&!cb.tideBtnUsed)b+=btn('tideup','','',0,"tideAct('up')",'Surge 1. Free, once per turn.','+1')+btn('tidedn','','',0,"tideAct('down')",'Recede 1. Free, once per turn.','−1');
 if(hasRelic('helmwheel')&&!cb.wheelUsed&&cb.tideDir)b+=btn('tideflip','','',0,"tideAct('flip')","Helmsman's Wheel: flip the drift arrow.",'☸');
 if(cb.banks&&!cb.busy)b+=btn('relbank','rel','',0,'releaseBank()',`Release the Bank: ${cb.banks} Banked Crest${cb.banks>1?'s':''}, each 1½ × Crest damage to ALL.`,`×${cb.banks}`);else if(cb.banks)b+=`<span class="chip">×${cb.banks}</span>`;
 const hi=lvl>=T.high,lo=lvl<=T.low,crest=anim(cb.crestT,900),under=anim(cb.undertowT,900);
 const prev=(tgCb===cb&&tgPrev!=null)?tgPrev:lvl,moved=prev!==lvl;tgPrev=lvl;tgCb=cb;
 if(moved)setTimeout(()=>{const w=document.querySelector('#dais .tg2-w');if(w){void w.offsetHeight;w.style.height=lvl*10+'%'}},30);
 const st=hi?'High':lo?'Low':'Calm';
 return frame('tide','Tide',`<div class="tg3" data-lvl="${lvl}" data-info="${esc(tideInfo(cb))}">
  <div class="tg2-main"><div class="tg2-tube${crest?' crest':''}${under?' under':''}${moved?' moved':''} d-${dir[0]}${hi?' is-hi':''}${lo?' is-lo':''}" style="--lv:${lvl*10}%" data-info="${esc(tideInfo(cb))}">
    <i class="tg2-w" style="height:${prev*10}%"><i class="tg3-foam"></i><i class="tg3-splash"></i></i><i class="tg3-swirl"></i><i class="tg2-pv"></i><s></s><s></s><s></s><s></s><s></s><i class="tg3-burst"></i></div>
   <i class="tg3-mk hi${hi?' lit':''}" style="bottom:${T.high*10}%"></i><i class="tg3-mk lo${lo?' lit':''}" style="bottom:${T.low*10}%"></i></div>
  <div class="tg3-plate st-${st.toLowerCase()}" data-info="${esc(tideInfo(cb))}"><b class="tg2-n">${lvl}</b><span class="tg3-st">${st}<u class="drift d-${dir[0]}"></u></span><em class="tg2-pvn pvt"></em></div>
  ${b?`<div class="tg2-btns">${b}</div>`:''}</div>`)}

// ---------- Echo Mage: hanging hand-bell, ripple rings, the Marked card dangles beneath ----------
function echo(cb){const cap=CORE.echo.bonus_cap;
 const rings=(n)=>{let r='';for(let k=1;k<=cap;k++)r+=`<i class="rg k${k}${k<=n?' on':''}${k===cap&&n<cap?' cap':''}" style="--k:${k}"></i>`;return r+`<i class="rg pv" style="--k:${Math.min(cap,n+1)}"></i>`};
 const markable=canMark();
 const bell=(ci,k,after,idx)=>{const pl=ci&&echoPlan(true,k),pv=pl&&echoPreview(pl),rep=pl&&pl.repeats>1?'×'+pl.repeats:'';
  const tip=ci?`${cname(ci)} Echoes at end of turn${pv?': about '+pv.total+(pv.kind==='dmg'?' damage':' Guard'):''}. +1 per card played after, max +${cap}.`
   :idx===1?'Tap to Mark your next card. It Echoes at end of turn.':'Mark a second card.';
  const tag=markable&&idx===(cb.mark?2:1)?'button':'div';const first=idx===1;
  const a=`<${tag} class="bellbtn${ci?' ring':' empty'}${cb.armMark&&markable&&tag==='button'?' arm':''}" ${tag==='button'?`${first?'id="markbtn"':'id="markbtn2"'} onclick="armMark()"`:''} data-idx="${idx}" data-info="${esc(tip+`${cb.armMark?' Armed.':''} First Attack and Skill are Marked; tap to move one.`)}">
   <span class="rings">${rings(ci?markBonus(after):0)}</span>${BELL}</${tag}>`;
  const ch=ci?`<div class="charm" data-info="${esc(tip)}">${mini(ci)}<b>${cname(ci)}</b></div><div class="ptot">${pv?`${pv.kind==='dmg'?'⚔':'🛡'} ${pv.n}${rep}${pl.mult>1?' ×2':''}`:''}<em class="pvt"></em></div>`:'';
  return `<div class="bellcol${ci?' marked':''}">${a}<b class="echo-read">${ci&&pv?pv.total:0}</b><span class="meter-label">${ci?'End turn Echo':cb.armMark&&tag==='button'?'Armed: next card':tag==='button'?'Marks next card':'Echo'}</span>${ch}</div>`};
 const plan=echoPlan(true);
 let h=bell(cb.mark,1,cb.afterMark,1);
 if(cb.mark2||(cb.mark&&markable))h+=bell(cb.mark2,2,cb.after2,2);
 const ghost=!cb.mark&&plan?`<div class="charm ghost" data-info="No Mark: your last card Echoes at ${CORE.echo.unmarked_fallback*100}%.">${mini(plan.card)}<b>${cname(plan.card)}</b>${plan.half?`<i>${CORE.echo.unmarked_fallback*100}%</i>`:''}</div>`:'';
 return frame('echo','Echoes',`<div class="bells">${h}</div>${ghost}`)}

// ---------- Cartographer: chart strip, dotted rope, cairns (stones = Rank, lantern flag = Landmark) ----------
export const CAIRN=(r)=>{const n=Math.min(4,r+1),w=[26,21,16,11];let s='';for(let i=0;i<n;i++)s+=`<i class="st" style="width:${w[i]}px;--i:${i}"></i>`;return `<span class="cairn">${s}${r>=CORE.carto.rank_max?'<em class="flag"></em>':''}</span>`};
function carto(cb){const pk=cb.mode&&cb.mode.k==='slot',lim=mod('advances',{},1),canAdv=!pk&&cb.advUsed<lim&&!cb.busy&&!cb.mode;let s='';
 for(let i=0;i<cb.nslots;i++){const w=cb.slots[i];
  if(!w){s+=`<div class="wp empty" style="--wi:${i}" data-i="${i}" data-info="Empty Waypoint slot."><i class="pinn"></i><span class="wpn">Unmarked</span></div>`;continue}
  const r=w.rank||0,adv=canAdv&&r<CORE.carto.rank_max,land=r>=CORE.carto.rank_max;
  const tip='Rank '+r+' / '+CORE.carto.rank_max+'. '+cname(w)+': '+plain(desc(w))+(adv?' — tap to Advance (+1 Rank; '+(CARDS[w.id]&&CARDS[w.id].wpGuard?'+'+GUARD_PER_RANK+' Guard per Rank; ':'')+'damage bonuses '+CORE.carto.rank_dmg.slice(1).map(n=>'+'+n).join(' / ')+')':'');
  s+=`<button class="wp full${pk?' pick':''}${adv?' adv':''}${land?' land':''}${anim(w.trigT,T(900))?' trig':''}" style="--wi:${i};${anim(w.trigT,T(900))||''}" data-i="${i}" data-slot="${i}" onclick="${pk?`modeAct('slot',${i})`:adv?`advance(${i})`:''}" data-info="${esc(tip)}">${CAIRN(r)}<span class="wpn cref" data-card="${w.id}">${cname(w)}</span><span class="map-rank">${r}</span><span class="map-act">${pk?'Replace':''}</span><span class="pips">${[0,1,2].map(k=>`<i class="${k<r?'on':''}"></i>`).join('')}</span></button>${!pk&&canDecamp()?`<button class="tbtn decamp" data-decamp="${i}" onclick="decampWp(${i})" data-info="${esc('Decamp '+cname(w)+': it leaves and fires its Decamp line. Once a turn.')}">⛺</button>`:''}`}
 const nd=mod('drawCount',{},4);const nx=cb.draw.slice(0,3).map((ci,i)=>`<span class="nx cref ${i<nd?'next':''}" data-card="${ci.id}">${cname(ci)}</span>`).join('')||'<span class="muted">reshuffle</span>';
 const left=Math.max(0,lim-cb.advUsed);const hint=`${left} Advance${left===1?'':'s'} left`;
 return frame('carto','Chart',`<div class="chart" data-slots="${cb.nslots}" data-info="${esc(`Advances left: ${left}. Tap a Waypoint for +1 Rank.`)}"><svg class="map-ink" viewBox="0 0 672 312" aria-hidden="true"><path pathLength="1" d="M217 138 Q275 145 332 141 T453 139"/></svg><i class="stub"></i><svg class="rope" viewBox="0 0 20 100" preserveAspectRatio="none" aria-hidden="true"><path d="M10 2C2 14 18 22 10 34S2 54 10 66 18 86 10 98"/></svg><div class="wps">${s}</div></div>
  <div class="nexts" data-info="Top of your draw pile. You draw the first ${nd} next turn."><b>Next</b>${nx}</div>${hint?`<div class="advhint">${hint}</div>`:''}`)}

// ---------- Duelist: rapier planted in the step, wick flame on the tip = Momentum ----------
function duel(cb){const D=CORE.duel,max=mod('momMax',{},D.mom_max),fmin=flourishMin();let n='';
 for(let i=max-1;i>=0;i--)n+=`<i class="${i<cb.mom?'on':''}${i+1===fmin?' mark':''}"></i>`;
 const can=cb.mom>=fmin&&!cb.busy,mult=flourishMult(cb.mom),fr=Math.max(0,cb.mom-D.decay);
 const st=cb.armFlourish?'armed':cb.mom>=fmin?'hot':cb.mom>0?'lit':'cold';
 const tip=`Momentum ${cb.mom}/${max}. Flourish at ${fmin}+ for ×${mult}${cb.armFlourish?' (armed)':''}. Parry ${cb.parry+Object.values(cb.parries||{}).reduce((a,b)=>a+b,0)}.`;
 return frame('duel','Rapier',`<div class="rap" style="--m:${cb.mom};--mx:${max};--fr:${fr}">
  <button class="wick st-${st}${cb.armFlourish?' on':''}" id="flourishbtn" ${can?'':'disabled'} onclick="armFlourish()" data-info="${esc(tip)}">${FLAME}</button><i class="wick-pv"></i>
  <b class="rap-x${can?' can':''}">${cb.armFlourish?'×'+mult:''}</b><em class="rap-pvn pvt"></em>
  <div class="rap-blade" data-info="Momentum ${cb.mom}/${max}. +1 per Attack. Drops ${D.decay} per turn${cb.keepMom?' (kept this turn)':''} and when hit through Guard. Flourish at ${fmin}+."><div class="notches">${n}</div><u class="fade"></u></div>
  <div class="rap-guard"></div><div class="rap-grip"></div>
  <span class="dag${cb.parry?' on':''}" data-info="Parry ${cb.parry}: the first enemy hit loses ${cb.parry} damage. Reflects ${Math.floor(cb.parry*mod('parryReflect',{},D.parry_back_frac))}."><i></i><b>${cb.parry||''}</b></span>
  <span class="mom-read"><b>${cb.mom}</b></span></div>`)}

export function illustratedDaisHTML(){const cb=W.cb,c=W.run.cls;return c==='tide'?tide(cb):c==='echo'?echo(cb):c==='carto'?carto(cb):c==='duel'?duel(cb):''}

// ---------- live drag previews ----------
export function clearMeterPreview(){const d=document.getElementById('dais');if(!d)return;d.classList.remove('pv');
 d.querySelectorAll('.wp-pv').forEach(e=>e.remove());
 const dagger=d.querySelector('.dag b');if(dagger&&W.cb)dagger.textContent=W.cb.parry||'';
 d.querySelectorAll('.pvon').forEach(e=>e.classList.remove('pvon'));d.querySelectorAll('.pvt').forEach(e=>{e.textContent=''});d.style.removeProperty('--pv')}
export function showMeterPreview(res){const d=document.getElementById('dais'),cb=W.cb;clearMeterPreview();if(!d||d.classList.contains('compact-meter')||!res||!res.meter||!cb)return;const m=res.meter,c=d.dataset.cls;let on=false;
 if(c==='tide'){const t=m.tide;if(t!==cb.tide||m.crest||m.undertow){const tube=d.querySelector('.tg2-tube');tube.style.setProperty('--pv',t*10+'%');tube.classList.add('pvon');
   d.querySelector('.tg2-pvn').textContent='→ '+t;d.querySelector('.tg2-pvn').style.bottom=`calc(${t*10}% - 0px)`;
   d.querySelector('.tg2-n').classList.toggle('pvon',Math.abs(t-cb.tide)*tube.clientHeight/10<22);
   if(m.crest||m.undertow)tube.classList.add('pvon');on=true}}
 else if(c==='echo'){const b1=d.querySelector('.bellcol:nth-child(1)');
  if(m.mark&&!cb.mark&&b1){b1.classList.add('pvon');const t=b1.querySelector('.bellbtn');if(t)t.classList.add('pvon');on=true}
  else if(m.mark2&&!cb.mark2){const b=d.querySelector('.bellcol:nth-child(2)');if(b){b.classList.add('pvon');on=true}}
  else{[[cb.mark,cb.afterMark,m.after,1],[cb.mark2,cb.after2,m.after2,2]].forEach(([has,a0,a1,i])=>{if(has&&a1>a0){const col=d.querySelector(`.bellcol:nth-child(${i})`);if(col){col.classList.add('pvon');col.querySelector('.ptot em').textContent=` → +${markBonus(a1)}`;on=true}}})}}
 else if(c==='carto'){for(const [i,w] of (m.waypoints||[]).entries()){const old=cb.slots[i],e=d.querySelector(`.wp[data-i="${i}"]`);if(!e||!w)continue;
   if(!old||old.uid!==w.uid||(old.rank||0)!==w.rank){e.classList.add('pvon');const ghost=document.createElement('span');ghost.className='wp-pv';ghost.innerHTML=d.classList.contains('has-art')?'→ Rank '+w.rank:CAIRN(w.rank);ghost.title='Rank '+w.rank;e.appendChild(ghost);on=true}}}
 else if(c==='duel'){const r=d.querySelector('.rap');if(m.mom!==cb.mom){r.style.setProperty('--pm',m.mom);r.classList.add('pvon');r.querySelector('.rap-pvn').textContent='→ '+m.mom;on=true}
  if(m.parry>cb.parry){const g=d.querySelector('.dag');g.classList.add('pvon');g.querySelector('b').textContent=m.parry;on=true}}
 if(on)d.classList.add('pv')}

// Task 41: preserve illustrated paths, render only the live mechanic readout.
export function daisHTML(){const cb=W.cb,c=W.run.cls;let value=0,tip='',actions='';
 if(c==='tide'){
  value=`${cb.tide} ${cb.tide>=CORE.tide.high?'High':cb.tide<=CORE.tide.low?'Low':'Calm'}`;tip=tideInfo(cb);
  if(hasRelic('tidetable')&&!cb.tideBtnUsed)actions+=btn('tideup','','',0,"tideAct('up')",'Surge 1. Free, once per turn.','+1')+btn('tidedn','','',0,"tideAct('down')",'Recede 1. Free, once per turn.','−1');
  if(hasRelic('helmwheel')&&!cb.wheelUsed&&cb.tideDir)actions+=btn('tideflip','','',0,"tideAct('flip')",'Flip the drift.','↕');
  if(cb.banks)actions+=btn('relbank','','',cb.busy,'releaseBank()',`Release ${cb.banks} Banked Crests.`,`×${cb.banks}`);
 }else if(c==='echo'){
  const plan=echoPlan(true),pv=plan&&echoPreview(plan);value=pv?.total||0;
  tip=`Echo: ${value} at end of turn. First Attack and Skill are Marked; tap to move one.${cb.armMark?' Armed.':''}`;
  if(canMark())actions+=btn(cb.mark?'markbtn2':'markbtn','',cb.armMark,false,'armMark()',tip,cb.armMark?'✓':'+');
 }else if(c==='duel'){
  value=cb.mom;const D=CORE.duel,max=mod('momMax',{},D.mom_max),mult=flourishMult(cb.mom);
  tip=`Momentum ${cb.mom}/${max}. Flourish at ${flourishMin()}+ for ×${mult}${cb.armFlourish?' (armed)':''}. Parry ${cb.parry+Object.values(cb.parries||{}).reduce((a,b)=>a+b,0)}.`;
  actions+=btn('flourishbtn','',cb.armFlourish,cb.mom<flourishMin()||cb.busy,'armFlourish()',tip,cb.armFlourish?'×'+mult:'×');
 }else if(c==='carto'){
  const pk=cb.mode?.k==='slot',lim=mod('advances',{},1),canAdv=!pk&&cb.advUsed<lim&&!cb.busy&&!cb.mode;
  value=cb.slots.reduce((n,w)=>n+(w?.rank||0),0);
  tip=`Advances left: ${Math.max(0,lim-cb.advUsed)}. Tap a Waypoint for +1 Rank.`;
  actions=cb.slots.map((w,i)=>w?`<button class="tbtn" data-slot="${i}" data-info="${esc(cname(w)+': '+plain(desc(w))+'. Rank '+(w.rank||0))}" onclick="${pk?`modeAct('slot',${i})`:canAdv&&(w.rank||0)<CORE.carto.rank_max?`advance(${i})`:''}">${w.rank||0}</button>`:'').join('');
  if(canDecamp())actions+=cb.slots.map((w,i)=>w?`<button class="tbtn decamp" data-decamp="${i}" onclick="decampWp(${i})" data-info="${esc('Decamp '+cname(w)+': it leaves and fires its Decamp line. Once a turn.')}">⛺</button>`:'').join('');
 }
 return `<aside class="dais compact-meter dais-${c}" id="dais" data-cls="${c}" aria-label="${c} mechanic"><span data-info="${esc(tip)}" tabindex="0">${value}</span>${actions}</aside>`;
}
