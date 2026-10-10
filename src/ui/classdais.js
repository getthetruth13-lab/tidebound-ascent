// ui/classdais.js: the class mechanic display ("dais") that stands in the world beside the hero.
// One themed piece per class: Tidecaller = tide gauge, Echo Mage = bell rack, Cartographer = sea chart with pinned Waypoints,
// Duelist = rhythm blade (Momentum notches). Every part is a real element with a data-info popup (hover / tap / long-press).
// Painted backplates drop in via art/v2/ui/icons.json 'dais' (assets.js DAIS_ART); no code change needed.
import {CARDS} from '../core/registry.js';
import {W} from '../core/state.js';
import {cname,desc} from '../engine/cards.js';
import {echoPlan,echoPreview,canMark,markBonus,flourishMin,flourishMult,hasRelic,CORE} from '../engine/combat.js';
import {mod} from '../core/bus.js';
import {anim} from './fx.js';
import {DAIS_ART} from '../assets.js';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const plain=h=>String(h).replace(/<[^>]+>/g,'');
const BELL='<svg viewBox="0 0 32 36" class="dbell-svg" aria-hidden="true"><path d="M16 2a3 3 0 013 3c5 1.5 8 6 8 12 0 7 3 8 4 11H1c1-3 4-4 4-11 0-6 3-10.500 8-12a3 3 0 013-3z" style="fill:var(--bellc,#9a7a3c)" stroke="#05070b" stroke-width="1.2"/><circle cx="16" cy="31" r="3.2" fill="currentColor" stroke="#05070b"/><path d="M9 12c-1 3-1 7-3 11" fill="none" stroke="#fff5" stroke-width="1.4" stroke-linecap="round"/></svg>';
const frame=(cls,title,sub,body)=>{const art=DAIS_ART['dais-'+cls];
 return `<aside class="dais dais-${cls} classbar" id="dais" aria-label="${title}">${art?`<img class="dais-art" src="${art}" alt="" draggable="false" onerror="this.remove()">`:''}<div class="dais-hd"><b>${title}</b><span>${sub}</span></div><div class="dais-body">${body}</div></aside>`};
const btn=(id,cls,on,dis,click,info,label)=>`<button class="tbtn ${cls}${on?' on':''}" id="${id}" ${dis?'disabled':''} onclick="${click}" data-info="${esc(info)}">${label}</button>`;

function tide(cb){const T=CORE.tide;let cells='';
 for(let i=10;i>=0;i--)cells+=`<i class="${i<=cb.tide?'on':''} ${i>=T.high?'hi':i<=T.low?'lo':''} ${i===cb.tide?'cur':''}"></i>`;
 const st=cb.tide>=T.high?'HIGH':cb.tide<=T.low?'LOW':'MID';
 const cr=mod('crest',{preview:true},{dmg:T.crest_dmg,resetTo:5}),un=mod('undertow',{preview:true},{guard:T.undertow_blk,draw:T.undertow_draw,resetTo:5});
 const dir=cb.holdDrift?['🔒','Moonlock: the Tide will not drift at the start of your next turn.']:cb.tideDir>0?['▲','Drift: the Tide rises 1 at the start of your turn.']:cb.tideDir<0?['▼','Drift: the Tide falls 1 at the start of your turn.']:['•','No drift yet.'];
 let b='';
 if(hasRelic('tidetable')&&!cb.tideBtnUsed)b+=btn('tideup','','',0,"tideAct('up')",'Tide Table: Surge 1 (free, once per turn).','+1')+btn('tidedn','','',0,"tideAct('down')",'Tide Table: Recede 1 (free, once per turn).','−1');
 if(hasRelic('helmwheel')&&!cb.wheelUsed&&cb.tideDir)b+=btn('tideflip','','',0,"tideAct('flip')","Helmsman's Wheel: flip the drift arrow.",'☸');
 if(cb.banks&&!cb.busy)b+=btn('relbank','rel','',0,'releaseBank()',`Release the Bank: ${cb.banks} Banked Crest${cb.banks>1?'s':''}, each 1½ × Crest damage to ALL.`,`🏦 ×${cb.banks}`);else if(cb.banks)b+=`<span class="chip">🏦 ×${cb.banks}</span>`;
 const body=`<div class="tg-wrap"><div class="tg-lbl top" data-info="Crest: at 10 the Tide breaks: ${cr.dmg} damage to ALL enemies, then it settles to 5."><b>Crest</b><i>${cr.dmg} to ALL</i></div>
  <div class="tg-tube gauge${anim(cb.crestT,700)?' crest':''}${anim(cb.undertowT,700)?' under':''}" data-info="Tide ${cb.tide}/10: High ${T.high}+ and Low ${T.low}− change what your cards do. 10 = Crest, 0 = Undertow.">${cells}</div>
  <div class="tg-lbl bot" data-info="Undertow: at 0 the Tide drains: ${un.guard} Guard and draw ${un.draw}, then it settles to 5."><b>Undertow</b><i>${un.guard} Guard · draw ${un.draw}</i></div></div>
  <div class="tg-side"><span class="tg-read ${st.toLowerCase()}" data-info="${esc(dir[1])}"><b>${cb.tide}</b><i>${st}</i><u class="drift">${dir[0]}</u></span>${b}</div>`;
 return frame('tide','Tide','Rises and falls with your cards',body)}

function echo(cb){const mk=(ci,k,after)=>{const pl=echoPlan(true,k),pv=pl&&echoPreview(pl),rep=pl&&pl.repeats>1?'×'+pl.repeats:'';
  const tip=`${cname(ci)} will Echo at the end of your turn${pv?': about '+pv.total+(pv.kind==='dmg'?' damage':' Guard')+' in total':''}. +1 per card played after it (max +${CORE.echo.bonus_cap}).`;
  return `<div class="dbell ring" data-info="${esc(tip)}">${BELL}<span class="dcard">${CARDS[ci.id].e} ${cname(ci)}</span><span class="dpv">+${markBonus(after)}${pv?` → <b>${pv.n}${pv.kind==='dmg'?'⚔':'🛡'}${rep}${pl.mult>1?' ×2':''}</b>`:''}</span></div>`};
 const plan=echoPlan(true);
 const slot=(ci,k,after,idx)=>ci?mk(ci,k,after):`<div class="dbell empty" data-info="${idx===1?'Mark a card and it Echoes at the end of your turn.':'A second bell: you can Mark a second card.'}">${BELL}<span class="dcard">${idx===1?'No Echo yet':'Second bell'}</span></div>`;
 let h=slot(cb.mark,1,cb.afterMark,1);
 if(cb.mark2||(cb.mark&&canMark()))h+=slot(cb.mark2,2,cb.after2,2);
 const ghost=!cb.mark&&plan?`<div class="dghost" data-info="No card is Marked: the last card you played will Echo at half strength."><span>👻 ${CARDS[plan.card.id].e} ${cname(plan.card)}</span><i>${plan.half?'half':''}</i></div>`:'';
 const mb=canMark()?btn('markbtn','mark',cb.armMark,0,'armMark()',`Mark the next card you play: it Echoes at the end of your turn (+1 per card played after it, max +${CORE.echo.bonus_cap}).`,`🔔 ${cb.armMark?'Marking…':cb.mark?'Mark 2nd':'Mark'}`):'';
 return frame('echo','Echoes','Marked cards ring again',`<div class="rack">${h}</div>${ghost}${mb}`)}

function carto(cb){const pk=cb.mode&&cb.mode.k==='slot',lim=mod('advances',{},1),canAdv=!pk&&cb.advUsed<lim&&!cb.busy&&!cb.mode;let s='';
 for(let i=0;i<cb.nslots;i++){const w=cb.slots[i];
  if(!w){s+=`<div class="wp empty" data-info="Waypoint ${i+1}: empty. Cards with Waypoint place one here; each Waypoint triggers its effect for you."><i class="pin"></i><span class="wpn">Unmarked</span></div>`;continue}
  const r=w.rank||0,adv=canAdv&&r<CORE.carto.rank_max,land=r>=CORE.carto.rank_max;
  const tip=cname(w)+': '+plain(desc(w))+(adv?' — tap to Advance (+1 Rank; damage bonuses '+CORE.carto.rank_dmg.slice(1).map(n=>'+'+n).join(' / ')+')':'');
  s+=`<button class="wp full${pk?' pick':''}${adv?' adv':''}${land?' land':''}${anim(w.trigT,600)?' trig':''}" data-slot="${i}" onclick="${pk?`modeAct('slot',${i})`:adv?`advance(${i})`:''}" data-info="${esc(tip)}"><i class="pin">${CARDS[w.id].e}</i><span class="wpn">${cname(w)}</span><span class="pips">${[0,1,2].map(k=>`<i class="${k<r?'on':''}"></i>`).join('')}</span></button>`}
 const nd=mod('drawCount',{},4);const nx=cb.draw.slice(0,3).map((ci,i)=>`<span class="nx ${i<nd?'next':''}">${cname(ci)}</span>`).join('')||'<span class="muted">reshuffle</span>';
 const hint=canAdv&&cb.slots.length?'Tap a Waypoint to Advance':cb.advUsed?'Advanced':'';
 return frame('carto','Sea Chart','Waypoints you have pinned',`<div class="wps route">${s}</div><div class="nexts" data-info="Next cards in your draw pile (the first ${nd} are drawn next turn).">🧭 <b>Next draws</b>${nx}</div>${hint?`<div class="advhint">⛰ ${hint}</div>`:''}`)}

function duel(cb){const D=CORE.duel,max=mod('momMax',{},D.mom_max),fmin=flourishMin();let n='';
 for(let i=max-1;i>=0;i--)n+=`<i class="${i<cb.mom?'on':''}${i+1===fmin?' mark':''}"></i>`;
 const can=cb.mom>=fmin,mult=flourishMult(cb.mom);
 const fb=btn('flourishbtn','flo',cb.armFlourish,!can,'armFlourish()','Flourish: your next Attack spends all Momentum and deals ×(1 + ½ per Momentum).',`⚔ ${can?(cb.armFlourish?'FLOURISH ×'+mult:'Flourish ×'+mult):'Flourish '+fmin+'+'}`);
 const ex=(cb.parry?`<span class="chip parry" data-info="Parry ${cb.parry}: the next hit(s) you take are turned aside.">🤺 Parry ${cb.parry}</span>`:'')+(cb.keepMom?'<span class="chip" data-info="Momentum is kept at the end of your turn.">🏃 keeps</span>':'');
 return frame('duel','Rhythm','Build, then Flourish',`<div class="blade" data-info="Momentum ${cb.mom}/${max}: each Attack builds it. At ${fmin}+ you can Flourish."><div class="hilt"></div><div class="notches">${n}</div><div class="tip-b"></div></div><div class="blade-side"><span class="mom-read"><b>${cb.mom}</b><i>/${max}</i></span>${fb}${ex}</div>`)}

export function daisHTML(){const cb=W.cb,c=W.run.cls;return c==='tide'?tide(cb):c==='echo'?echo(cb):c==='carto'?carto(cb):c==='duel'?duel(cb):''}
