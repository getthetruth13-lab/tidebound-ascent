// ui/hero-plate.js: the combined hero plate (Task 67, FUN-REDESIGN 9.1). One engraved piece per hero holding the three readings:
// HEALTH (a rim that empties as health falls, plus a dark notch for the damage the enemies will deal next turn if nothing changes),
// ABILITY (a small readout supplied by ui/herohooks.js) and ENERGY (the existing #orb sits in the middle of the plate; its id and
// animations are untouched). Digits only for health and Energy. Placeholder art: CSS/SVG rim; painted pieces drop in later.
import {W} from '../core/state.js';
import {heroHook} from './herohooks.js';
import {observeEvents} from '../core/bus.js';
import {statusInfo} from './combatant.js';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
// A rim arc on a pathLength=100 circle, starting at the top and running clockwise: segment [a,b] in percent.
const seg=(a,b,cls)=>b>a?`<circle class="${cls}" cx="50" cy="50" r="44" pathLength="100" stroke-dasharray="${(b-a).toFixed(2)} ${(100-(b-a)).toFixed(2)}" stroke-dashoffset="${(-a).toFixed(2)}"/>`:'';
export function heroPlateHTML({incoming=0}={}){const cb=W.cb,run=W.run;if(!cb||!run)return '';
 syncHitLog();
 const cls=run.cls,hp=Math.max(0,run.hp),max=Math.max(1,run.max);const pct=Math.min(100,hp/max*100);
 const hit=Math.max(0,Math.min(hp,incoming-(cb.p.block||0)));const after=Math.max(0,(hp-hit)/max*100);
 const ab=(heroHook(cls).ability||(()=>null))(cb)||{html:'',info:''};
 const extra=heroHook(cls).info?heroHook(cls).info(cb):'';
 const info=`Health ${hp}/${max}.${hit>0?` Next enemy turn: about ${hit} damage gets through if nothing changes.`:''} Energy ${cb.energy}/${cb.maxE}. ${ab.info||''} ${extra}`.replace(/\s+/g,' ').trim();
 return `<div class="hplate hp-${cls}${hit>=hp&&hp>0?' lethal':''}" id="hplate" data-info="${esc(info)}" data-sname="Hero plate" role="group" aria-label="Health, ability and Energy">
 <svg class="hp-rim" viewBox="0 0 100 100" aria-hidden="true"><circle class="hp-track" cx="50" cy="50" r="44" pathLength="100"/>${seg(0,pct,'hp-fill')}${seg(after,pct,'hp-notch')}</svg>
 <div class="orb ${cb.energy?'':'empty'}" id="orb" title="Energy. Cards cost the number in their corner. Refills each turn."><span>${cb.energy}</span></div>
 <div class="hp-ability" id="hpability" data-info="${esc(info)}">${ab.html||''}</div>
 <button class="hp-logbtn" id="hplogbtn" type="button" aria-label="Combat log" data-info="Combat log: every hit, block and status of this fight." onclick="toggleHitLog()"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h11a2 2 0 012 2v13a3 3 0 01-3 3H8a3 3 0 01-3-3V5a2 2 0 011-2zm3 5h7M9 12h7M9 16h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
 ${logOpen?hitLogHTML():''}</div>`}

// ---------- hit-by-hit combat log (FUN-REDESIGN 9.2): every hit, block and status tick this fight, newest first ----------
const LOGS=new WeakMap();let logOpen=false;
function record(){const cb=W.cb;if(!cb)return null;let r=LOGS.get(cb);if(!r){r={lines:[],seen:new WeakSet(),floatLines:new WeakMap(),status:new Map(),guard:new Map()};LOGS.set(cb,r)}return r}
export const hitLogLines=()=>{syncHitLog();return record()?.lines.slice()||[]};
const nameOf=e=>e&&e.n?e.n:'the foe';
// Float records capture individual hits, including Bleed, Drench and direct HP loss that do not emit damage events.
// Event boundaries and renders drain them without changing combat rules or retaining animation objects.
export function syncHitLog(){const cb=W.cb,r=record();if(!cb||!r||W.previewing)return;
 const push=(txt,cls='')=>r.lines.push({txt,cls,turn:cb.turn});
 for(const x of cb.vfx||[]){if(r.seen.has(x))continue;r.seen.add(x);
  if(x.cls==='drench')continue; // Drench emits a decorative float plus its actual HP-loss float.
  const target=x.who==='p'?'you':nameOf(cb.ens.find(e=>e.uid===x.who));
  const text=String(x.txt).replace('🛡',' Guard').replace('⚡',' Energy').replace('❤',' health');
  push(`${target}: ${text}`,x.cls||(/^-/ .test(x.txt)?'hurt':''));r.floatLines.set(x,r.lines[r.lines.length-1]);
 }
 for(const [key,e] of [['p',cb.p],...cb.ens.map(e=>[e.uid,e])]){
  const target=key==='p'?'you':nameOf(e),prev=r.status.get(key)||{};
  for(const k of new Set([...Object.keys(prev),...Object.keys(e.st||{})])){const n=e.st?.[k]||0,old=prev[k]||0;if(n!==old)push(`${target}: ${statusInfo(k)?.n||k} ${old} → ${n}`,'st')}
  r.status.set(key,{...e.st});
  const old=r.guard.get(key);if(key!=='p'&&old!==undefined&&e.block>old)push(`${target}: +${e.block-old} Guard`,'blk');r.guard.set(key,e.block||0);
 }
}
observeEvents((ev,c)=>{if(!W.cb||W.previewing)return;syncHitLog();const cb=W.cb,r=record();if(ev==='damageDealt'||ev==='playerHit'){const who=ev==='playerHit'?'p':c.target?.uid;const x=[...(cb.vfx||[])].reverse().find(x=>x.who===who);const line=x&&r.floatLines.get(x);const blocked=ev==='playerHit'?c.blocked:c.amount-(c.hpLoss||0);if(line&&blocked>0)line.txt+=` (${blocked} stopped by Guard)`}if(ev==='turnStart')record().lines.push({txt:`Turn ${c.turn}`,cls:'turn',turn:c.turn})});
export function toggleHitLog(){logOpen=!logOpen;if(window.G&&G.render)G.render()}
export function hitLogHTML(){const l=hitLogLines();
 return `<div class="hp-log" id="hplog" role="log" aria-label="Combat log"><b class="hp-log-h">Combat log</b>${l.length?l.slice().reverse().map(x=>`<div class="hl ${x.cls}">${esc(x.txt)}</div>`).join(''):'<div class="hl">Nothing has happened yet.</div>'}</div>`}
