// ui/combatant.js: the combatant panel under every figure: bronze HP bar, Guard shield, status row.
// STATUS is the single icon map: each status has a name, kind (buff/debuff), rule text, duration rule and a placeholder SVG.
// Painted art replaces a placeholder with no code change: add the status to art/v2/ui/icons.json (assets.js ST_ICON) and it is used first.
import {KW,CARDS,RELICS} from '../core/registry.js';
import {intentOf,CORE,eAtk,phasePlan} from '../engine/combat.js';
import {W} from '../core/state.js';
import {assetSrc} from '../assets.js';
const S=(d,x='')=>`<svg class="sti" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor" stroke="#05070b" stroke-width="1" stroke-linejoin="round">${d}</g>${x}</svg>`;
const ICON={
 str:S('<path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.8 5.5 21l2-7.5L2 9h7z"/>'), // fist-star: Might
 dex:S('<path d="M3 20l5-10 4 5 3-7 6 12z"/>'), // stacked stone / cairn: Poise
 weak:S('<path d="M12 2C8 8 5 11 5 15a7 7 0 0014 0c0-4-3-7-7-13z"/>'), // water drop: Soaked
 vuln:S('<path d="M12 2l9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6z"/>','<path d="M12 5l-2 5 3 2-3 6" fill="none" stroke="#05070b" stroke-width="1.6"/>'), // cracked shield: Exposed
 brittle:S('<path d="M12 1l3 6 6 1-4 5 2 7-7-3-7 3 2-7-4-5 6-1z"/>'), // frost shard: Brittle
 bleed:S('<path d="M12 2c-3 5-6 8-6 12a6 6 0 0012 0c0-4-3-7-6-12z"/>','<path d="M10 14a2 2 0 002 2" fill="none" stroke="#fff6" stroke-width="1.4"/>'), // blood drop
 drench:S('<path d="M2 9c3-3 5 3 8 0s5 3 8 0 3 0 4 0v4c-1 0-1 0-4 0s-5 3-8 0-5 3-8 0z"/><path d="M2 17c3-3 5 3 8 0s5 3 8 0 3 0 4 0v3H2z"/>'), // waves: Drenched
 reson:S('<path d="M12 2a6 6 0 00-6 6c0 6-3 7-3 9h18c0-2-3-3-3-9a6 6 0 00-6-6z"/><circle cx="12" cy="20" r="2"/>'), // bell: Resonating
 shell:S('<path d="M12 3C6 3 2 8 2 14c0 3 2 6 10 7 8-1 10-4 10-7 0-6-4-11-10-11z"/>','<path d="M12 3v18M7 5l1 15M17 5l-1 15" fill="none" stroke="#05070b" stroke-width="1.2"/>'), // scallop: Shell
 barbs:S('<path d="M12 1l2.5 8 8-2.5-5.5 6.5 5.5 6.5-8-2.5L12 23l-2.5-8-8 2.5L7 11 1.5 4.5l8 2.5z"/>'), // thorn burst: Barbs
 ward:S('<circle cx="12" cy="12" r="9"/>','<circle cx="12" cy="12" r="5" fill="none" stroke="#05070b" stroke-width="1.6"/>'), // bubble ward: Rebuff
 mending:S('<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z"/>'), // cross: Mending
 parry:S('<path d="M4 20L18 6M15 3l6 6M3 17l4 4"/><path d="M20 20L6 6M9 3L3 9M21 17l-4 4"/>','<path d="M4 20L18 6M20 20L6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
 mightTmp:S('<path d="M12 22L3 10h6V2h6v8h6z"/>'), // down arrow: Might lost this turn
 keepMom:S('<path d="M6 11h12v10H6z"/>','<path d="M8.500 11V8a3.500 3.500 0 017 0v3" fill="none" stroke="currentColor" stroke-width="2"/>'), // padlock: Momentum Held
 nextDraw:S('<rect x="5" y="3" width="14" height="18" rx="2"/>','<path d="M12 8v8M8 12h8" stroke="#05070b" stroke-width="1.800"/>'), // card: Draw Next Turn
 nextEnergy:S('<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>'), // bolt: Energy Next Turn
 nextMom:S('<path d="M20 4l-9 9-2-2 9-9zM7 13l4 4-3 3-4-4z"/>'), // blade: Momentum Next Turn
 drained:S('<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>','<path d="M3 3l18 18" stroke="#05070b" stroke-width="2.400"/>'), // struck bolt: Drained
 moonlock:S('<path d="M16 3a9 9 0 100 18 7 7 0 010-18z"/>'), // crescent: Moonlock
 mimic:S('<rect x="3" y="3" width="12" height="12" rx="2"/><rect x="9" y="9" width="12" height="12" rx="2" opacity=".75"/>'), // twin cards: Mimic Ink
 cairn:S('<path d="M3 20l5-10 4 5 3-7 6 12z"/>'), // cairn: stored Rank
 retort:S('<path d="M3 4h18v12H11l-5 5v-5H3z"/>'), // speech: Retort Ready
 chartQ:S('<circle cx="12" cy="12" r="9"/>','<path d="M12 5l3 7-3 7-3-7z" fill="#05070b"/>'), // compass: Chart Next Turn
 banks:S('<path d="M12 2L2 8h20zM4 10h3v9H4zM10.500 10h3v9h-3zM17 10h3v9h-3zM2 21h20v2H2z"/>'), // vault: Banked Crest
 power:S('<path d="M12 2l2.400 7.400H22l-6.200 4.500 2.400 7.400L12 16.800 5.800 21.300l2.400-7.400L2 9.400h7.600z"/>'), // sigil star: Power in play
 armed:S('<path d="M12 2l9 10h-6v10H9V12H3z"/>'), // up-chevron: armed / ready
 queued:S('<path d="M6 2h12v5l-5 5 5 5v5H6v-5l5-5-5-5z"/>'), // hourglass: this-turn effect
 guardHold:S('<path d="M12 2L3 5v7c0 5 4 9 9 10 5-1 9-5 9-10V5z"/>','<path d="M3 12h18" stroke="#05070b" stroke-width="2.400"/>'), // barred shield: Guard Held
 drawLess:S('<rect x="5" y="3" width="14" height="18" rx="2"/>','<path d="M8 12h8" stroke="#05070b" stroke-width="1.800"/>'), // card minus: Draw Less Next Turn
 grudge:S('<path d="M6 3h9l3 6v9a3 3 0 01-3 3H8a3 3 0 01-3-3V9z"/>'), // glove: Grudge
 breath:S('<circle cx="12" cy="12" r="8"/>','<circle cx="9" cy="9" r="2" fill="#fff6"/>'), // bubble: Breath
 crestUp:S('<path d="M2 20c4-10 9-14 16-16-3 4-3 8 4 10v6z"/>'), // wave crest: Crest Bonus
 rooted:S('<path d="M12 2v10M12 12c-3 0-6 3-7 10M12 12c3 0 6 3 7 10M12 12v10"/>','<path d="M12 2v10M12 12c-3 0-6 3-7 10M12 12c3 0 6 3 7 10M12 12v10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>')
};
const T=(n,kind,kw,dur,rule)=>({n,kind,kw,dur,rule});
const STATUS={
 str:T('Might','buff','Might','Lasts all combat.'),
 dex:T('Poise','buff','Poise','Lasts all combat.'),
 weak:T('Soaked','debuff','Soaked','Drops 1 per turn.'),
 vuln:T('Exposed','debuff','Exposed','Drops 1 per turn.'),
 brittle:T('Brittle','debuff','Brittle','Drops 1 per turn.'),
 bleed:T('Bleed','debuff','Bleed X','Drops 1 per Attack hit.'),
 drench:T('Drenched','debuff','Drenched X','Drops 1 per turn.'),
 reson:T('Resonating','debuff','Resonating X','Drops 1 per turn.'),
 shell:T('Shell','buff','Shell X','Lasts all combat.'),
 barbs:T('Barbs','buff','Barbs X','Lasts all combat.'),
 ward:T('Rebuff','buff','Rebuff X','Drops 1 per debuff blocked.'),
 mending:T('Mending','buff','Mending X','Lasts all combat.'),
 parry:T('Parry','buff',null,'Its next hit loses X damage. Half is reflected.'),
 mightTmp:T('Temporary Might','buff',null,'Ends after its next turn.'),
 rooted:T('Rooted','buff',null,'Lasts all combat.'),
 // State that lives outside st (cb.*, queued effects, Powers, armed relics): badges built by playerStates().
 keepMom:T('Momentum Held','buff',null,'Until the end of this turn.','Momentum won\'t drop this turn.'),
 nextDraw:T('Draw Next Turn','buff',null,'Next turn.','Draw this many extra cards next turn.'),
 nextEnergy:T('Energy Next Turn','buff',null,'Next turn.','Gain this much Energy next turn.'),
 nextMom:T('Momentum Next Turn','buff',null,'Next turn.','Gain this much Momentum next turn.'),
 drained:T('Drained','debuff',null,'Next turn.','This much less Energy next turn.'),
 moonlock:T('Moonlock','buff',null,'Next turn.','The Tide won\'t drift next turn.'),
 mimic:T('Mimic Ink','buff',null,'Until you play a card.','Your next card is played twice.'),
 cairn:T('Cairn Rank','buff',null,'Until a Waypoint is placed.','The next Waypoint you place starts at this Rank.'),
 retort:T('Retort Ready','buff',null,'Until the end of this turn.','Retort bonuses are active this turn.'),
 chartQ:T('Chart Next Turn','buff',null,'Next turn.','Chart this many cards next turn.'),
 banks:T('Banked Crest','buff',null,'Until released.','Release: 1½× Crest damage to ALL enemies per stack.'),
 power:T('Vigil','buff',null,'Lasts all combat.',''),
 armed:T('Ready','buff',null,'Until used (once per combat).',''),
 queued:T('Active','buff',null,'Until it is used or the turn ends.',''),
 // clovis/status-icons: lasting effects that had no badge of their own.
 guardHold:T('Guard Held','buff',null,'Next turn.','Your Guard is not removed at the start of your next turn.'),
 drawLess:T('Fewer Cards Next Turn','debuff',null,'Next turn.','Draw this many fewer cards next turn.'),
 grudge:T('Grudge','debuff',null,'Lasts all combat.','Takes this much more damage from your Attacks.'),
 breath:T('Breath','buff',null,'Until your next Crest or Undertow.','Your next Crest or Undertow is stronger for each Breath.'),
 crestUp:T('Crest Bonus','buff',null,'Until your next Crest.','Your next Crest deals this much more damage to ALL.')
};
const ORDER=Object.keys(STATUS);
export const GUARD_SVG='<svg class="sti" viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1.5L2.5 5v8c0 6.5 4 11 9.5 13.5C17.500 24 21.500 19.500 21.500 13V5z" fill="currentColor" stroke="#05070b" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 4.5v19M5 9h14" fill="none" stroke="#05070b66" stroke-width="1"/></svg>';
export const STATUS_KEYS=ORDER;
export const statusInfo=k=>STATUS[k];
// Optional art slots use distinct ids: no reuse of another status's painting.
export function iconOf(k){const a=assetSrc('status',k);return `<span class="status-art">${ICON[k]}${a?`<img class="uic" src="${a}" alt="" draggable="false" onerror="this.remove()">`:''}</span>`}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const sentence=t=>{const s=(t||'').split(/(?<=[.!?])\s+/);return s.slice(0,2).join(' ')};
// ---- Task 33: status tooltip content. describe() -> {line, now, dur}: the rule, the live numbers, and how long it lasts.
// `who` is 'p' (the hero) or the enemy object that owns the status. Every number mirrors engine/combat.js.
const turns=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const atkVal=(e,a,vuln,pl)=>eAtk(e,a,{str:((pl||{})[e.uid]||{}).str||0,vuln});
// What the enemies' shown Attacks would deal to you, with and without your Exposed.
function incoming(){const cb=W.cb;let a=0,b=0;if(!cb)return null;const pl=phasePlan();
 for(const e of cb.ens){if(e.hp<=0||e.fled)continue;const m=intentOf(e);if(!m||!m.a)continue;const h=m.h||1;a+=atkVal(e,m.a,true,pl)*h;b+=atkVal(e,m.a,false,pl)*h}
 return a?{with:a,without:b}:null}
function enemyAtk(e,drop){const m=intentOf(e);if(!m||!m.a)return null;const h=m.h||1;
 const pe=phasePlan()[e.uid]||{},base=m.a+(e.st.str||0)+(e.st.mightTmp||0)+(pe.str||0),vu=pe.vuln;
 const f=(d,w)=>Math.max(0,Math.floor(w?Math.floor(d*.75):d)*(vu?1.5:1));
 const cur=Math.floor(f(base,!!e.st.weak)),alt=Math.floor(f(base,drop==='weak'?false:!!e.st.weak));return {cur:cur*h,alt:alt*h}}
function describe(k,v,who){const cb=W.cb,P=who==='p',e=P?null:who,n=Math.abs(v),more=v>0?'more':'less';
 const held=e&&e.hold&&e.hold[k]?1:0;
 const gone=P?`Wears off by 1 at the start of each enemy turn.`:`Fades by 1 after each of its turns: gone after ${turns(n+held,'turn')}.`;
 switch(k){
 case 'str':return P?{line:`Changes your Attack damage.`,now:`Your Attacks deal ${n} ${more} damage.`,dur:'Lasts all combat.'}
  :{line:'Changes its Attack damage.',now:`Its Attacks deal ${n} ${more} damage.`,dur:'Lasts all combat.'};
 case 'dex':return {line:'Changes Guard from your cards.',now:`Cards give ${n} ${v>0?'more':'less'} Guard.`,dur:'Lasts all combat.'};
 case 'weak':{if(P)return {line:'Your Attacks deal 25% less damage.',now:'',dur:`${turns(n,'turn')} left.`};
  const a=enemyAtk(e,'weak');return {line:'Its Attacks deal 25% less damage.',now:a&&a.cur!==a.alt?`Its next Attack deals ${a.cur} instead of ${a.alt}.`:'',dur:gone}}
 case 'vuln':{if(P){const i=incoming();return {line:'You take 50% more damage.',now:i&&i.with!==i.without?`Incoming Attacks deal ${i.with} instead of ${i.without}.`:'',dur:`${turns(n,'turn')} left.`}}
  return {line:'Takes 50% more damage.',now:'',dur:gone}}
 case 'brittle':return P?{line:'Gain 25% less Guard from cards.',now:'',dur:`${turns(n,'turn')} left.`}
  :{line:'Only affects your Guard.',now:'No effect on this enemy.',dur:gone};
 case 'bleed':{const b=Math.ceil(n);return {line:'Loses HP when your Attack hits it, ignoring Guard.',now:`Next hit: loses ${b} HP.`,dur:'Drops 1 per hit. Max 20.'}}
 case 'drench':return {line:'Loses HP when the Tide turns, Crests or Undertows.',now:`Loses ${n} HP each time.`,dur:`${turns(n+held,'turn')} left. Max 12.`};
 case 'reson':return {line:'Takes more damage from Echoed Attacks.',now:`+${n} damage.`,dur:`${turns(n+held,'turn')} left. Max 12.`};
 case 'shell':return {line:'Gains Guard every turn.',now:`Gains ${n} Guard at the end of its turn.`,dur:'Lasts all combat.'};
 case 'barbs':return {line:'Hurts you when you Attack it.',now:`You take ${n} damage per hit.`,dur:'Lasts all combat.'};
 case 'ward':return {line:'Blocks debuffs.',now:`Blocks its next ${turns(n,'debuff')}.`,dur:'Each debuff blocked uses up 1 stack.'};
 case 'mending':{const h=e?Math.min(n,Math.max(0,e.max-e.hp)):n;return {line:'Heals every turn.',now:`Heals ${n} HP at the end of its turn${e&&h<n?(h?` (${h} right now)`:' (already at full HP)'):''}.`,dur:'Lasts all combat.'}}
 case 'parry':{const back=Math.floor(n*(CORE.duel.parry_back_frac||.5));return {line:'Softens the first enemy hit.',now:`It loses ${n} damage; the attacker takes ${back}.`,dur:'Until hit, or your next turn.'}}
 case 'mightTmp':return {line:'Temporary change to its Attack damage.',now:`Its Attacks deal ${n} ${more} damage.`,dur:'Until the end of its next turn.'};
 case 'grudge':return {line:'Takes more damage from your Attacks.',now:`Your Attacks deal ${n} more to it.`,dur:'Lasts all combat (max 5).'};
 case 'rooted':{const t=W.cb?W.cb.ens.filter(x=>x.key==='tendril'&&x.hp>0&&!x.fled).length:0;return {line:'Gains 3 Guard per living Tendril each turn.',now:`${3*t} Guard (${t} alive).`,dur:'Lasts all combat.'}}
 }return null}
export function statusText(k,v,who,extraText){const d=STATUS[k];if(!d)return '';
 const x=describe(k,v,who||'p');
 const line=x?x.line:(extraText||d.rule||(d.kw&&(KW[d.kw]||KW[d.kw.replace(/ X$/,'')]))||''),now=x?x.now:(extraText?'':(v>1?`Stacked ${v} times.`:'')),dur=x?x.dur:d.dur;
 return `<span class="sx">${esc(sentence(line))}</span>${now?`<span class="sx now">${esc(now)}</span>`:''}<span class="sx dur">${esc(dur)}</span>`}
const plain=t=>String(t||'').replace(/<[^>]+>/g,'').replace(/\{([^|}]*)\|([^}]*)\}/g,'$1');
// Listener ids registered through thisTurn()/forCombat() (cards and potions) with the rule shown on their badge.
export const LISTENER_INFO={
 countedbreaths:['Counted Breaths','Your next Flourish this turn needs 1 less Momentum.'],
 coastward:['Coastal Ward','Whenever a Tideturn happens this turn, gain Guard.'],
 ovation:['Standing Ovation','Your next Attacks this turn are free Flourishes.'],
 bleededge:['Red Edge','Your next Attack this turn also applies Bleed.'],
 salute:['Salute','Your next Parry this turn is stronger.'],
 perfectread:['Perfect Read','If your Parry triggers this turn, draw 2 cards next turn.'],
 perfect:['Perfect Parry','If your Parry triggers this turn, gain 2 Momentum next turn.'],
 bladewaltz:['Blade Waltz','Your next Attacks this turn cost 0.'],
 keepersopening:["Keeper's Opening",'Your first Attack this turn is a free Flourish.'],
 fermata:['Fermata','Your Echo this turn also repeats the card played just before your Marked card.'],
 solo:['Solo','Your Echo happens one extra time this turn, and you can play only a few more cards.'],
 rubble:['Rubble','If one of your Waypoints is destroyed, Rubble returns from your discard pile to your hand.'],
 route:['Planned Route','The next card you draw this turn costs 0.'],
 lownote:['Low Note','The next card you play this turn costs 1 less.'],
 overtone:['Overtone','Your Echo happens twice this turn.'],
 amplify:['Magnify','Your next Echo this turn is doubled.'],
 orders:["Captain's Orders",'The next card you play this turn costs 0.'],
 treasuremap:["Smuggler's Chart",'At the end of this combat, gain gold.'],
 waystation:['Waystation','At the start of your next turn, Advance another random Waypoint.'],
 resvial:['Resonance Vial','Your Echo happens extra times this turn.'],
 abyssaloil:['Abyssal Oil','Gain 1 Energy at the start of each of your next turns.']};
const INTERNAL_LISTENERS=new Set(['afterPlay','chartClamp']); // plumbing that finishes a card's own text, not a separate effect
// Everything the player has pending or armed that is NOT in cb.p.st: [{k,v,n?,t?}] (k = STATUS key; n / t override name / rule text).
// Lasting effects on an enemy that live outside e.st (your Powers' per-enemy marks): merged into its status row.
export function enemyExtraSt(e){const o={};for(const p of (W.cb&&W.cb.powers)||[])if(p.id==='grudge'&&p.g&&p.g[e.uid])o.grudge=(o.grudge||0)+p.g[e.uid];return o}
export function playerStates(){const cb=W.cb,out=[];if(!cb||!W.run)return out;
 const add=(k,v,n,t,ico)=>{if(v)out.push({k,v,n,t,ico})};
 if(cb.keepMom)add('keepMom',1);
 if((cb.nextDraw||0)>0)add('nextDraw',cb.nextDraw);else if(cb.nextDraw<0)add('drawLess',-cb.nextDraw);
 let ne=cb.pendingE||0,nm=0;for(const q of cb.nextTurnQ||[]){const m=q&&q.meta;if(m){ne+=m.energy||0;nm+=m.mom||0}}
 for(const r of W.run.relics)if(r.carry>0)ne+=r.carry;
 add('nextEnergy',ne);add('nextMom',nm);add('drained',cb.drainE||0);
 if(cb.holdDrift)add('moonlock',1);
 if(cb.mimic)add('mimic',1);
 add('cairn',cb.cairn||0);
 if(cb.retortOk)add('retort',1);
 add('chartQ',cb.chartQ||0);add('banks',cb.banks||0);
 if(W.run.cls==='echo'&&cb.extraMarks)add('armed',cb.extraMarks,'Second Mark','You may Mark a second card this turn.');
 for(const p of cb.powers||[]){const d=CARDS[p.id];if(d)add('power',p.n||1,d.n,plain(d.d))}
 for(const p of cb.powers||[]){if(p.id==='heldbreath'&&p.breath)add('breath',p.breath,null,`Your next Crest deals +${(p.up?6:5)*p.breath} or Undertow gives +${(p.up?6:5)*p.breath} Guard.`);if(p.id==='wreckerstide'&&p.wb)add('crestUp',p.wb,null,`Your next Crest deals ${p.wb} more damage to ALL.`)}
 for(const l of cb.fx||[]){if(l.dead||!l.id||INTERNAL_LISTENERS.has(l.id))continue;if(l.id==='bastionbar'){if(l.want==null||cb.turn<l.want)add('guardHold',1);continue}const i=LISTENER_INFO[l.id];add('queued',1,i?i[0]:l.id,i?i[1]:'A card or potion effect is waiting to happen.')}
 for(const r of W.run.relics){const d=RELICS[r.id];if(d&&d.ready&&d.ready(r))add('armed',1,d.n,d.d?plain(d.d):'Ready.',assetSrc('relics',r.id))} // clovis/hud: the relic's own painted icon, not the vector up-arrow
 return out}
export function statusRowHTML(st,extra,who='p',limit=6){const p=[],all=[];
 const entry=(k,v,name,kind,txt,x,ico)=>{const nm=name+(v<0?' (negative)':'');
  all.push({nm:name+(Math.abs(v)>1||x==null?' '+Math.abs(v):''),kind,html:txt});
  p.push(`<span class="bd st-${k} ${kind}" tabindex="0" role="button" aria-label="${esc(name)} ${v}" data-kw="${esc(name)}" data-skind="${kind}" data-sinfo="${esc(txt)}" data-sname="${esc(nm)}">${ico?`<span class="status-art relic-ready"><img class="uic" src="${ico}" alt="" draggable="false"></span>`:iconOf(k)}<b>${x==null?Math.abs(v):(v>1?v:'')}</b></span>`)};
 for(const k of ORDER){let v=st&&st[k];if(!v||!STATUS[k])continue;const d=STATUS[k];
  const bad=d.kind==='debuff'||((k==='str'||k==='dex'||k==='mightTmp')&&v<0);
  entry(k,v,d.n,bad?'debuff':'buff',statusText(k,v,who))}
 for(const x of extra||[]){const d=STATUS[x.k];if(!d)continue;
  entry(x.k,x.v,x.n||d.n,d.kind==='debuff'?'debuff':'buff',statusText(x.k,x.v,'p',x.t),1,x.ico)}
 // One row: beyond MAXB icons the rest fold into a "+N" chip whose tooltip lists every hidden status with its numbers and duration.
 const MAXB=Math.max(1,limit);if(p.length>MAXB){const hid=all.slice(MAXB-1);
  const list=hid.map(h=>`<span class="sx lst"><b class="${h.kind}">${esc(h.nm)}</b> ${h.html.replace(/<span class="sx">[^]*?<\/span>/,'').replace(/<span class="sx[^"]*">/g,'<span class="li">')}</span>`).join('');
  p.splice(MAXB-1,p.length,`<span class="bd st-more" tabindex="0" role="button" aria-label="${hid.length} more statuses" data-kw="More" data-skind="more" data-sname="${hid.length} more statuses" data-sinfo="${esc(list)}"><span class="status-art more-chip">+${hid.length}</span></span>`)}
 return `<div class="badges">${p.join('')}</div>`}
// HP bar: bronze frame, blood fill, a ghost chunk for damage, a pale steel overlay while Guard is up, and the Guard shield on its left end.
// Painted bar tier (clovis/hud): the hero's class, or normal / elite / boss for enemies (art/v2/hud/<tier>-rail etc.).
export function barTier(who){if(who==='p')return W.run?.cls||'normal';const e=typeof who==='string'&&W.cb?W.cb.ens.find(x=>'e'+x.uid===who):null;return e?(e.boss?'boss':e.elite?'elite':'normal'):'normal'}
const HUD='art/v2/hud/';
const barDeco=(t,blk,nm)=>{const hero=!/^(normal|elite|boss)$/.test(t);
 return `<span class="pb-rail" aria-hidden="true"></span>${hero?`<img class="pb-cap" src="${HUD}${t}-cap.webp" alt="" draggable="false" aria-hidden="true">`:''}${t==='boss'&&nm?`<span class="pb-plate" aria-hidden="true"><b>${esc(nm)}</b></span>`:''}${t==='elite'?`<img class="pb-horn l" src="${HUD}elite-horn.webp" alt="" aria-hidden="true"><img class="pb-horn r" src="${HUD}elite-horn.webp" alt="" aria-hidden="true"><img class="pb-skull" src="${HUD}elite-skull.webp" alt="" aria-hidden="true">`:''}${blk?'':`<img class="pb-circ" src="${HUD}${t}-endcap-circle.png" alt="" aria-hidden="true">`}`};
export function barHTML(h,m,blk,sh,who,tier){const pc=Math.max(0,Math.min(1,h/m)),low=pc<=.3;const t=tier||(who!=null?barTier(who):'normal');
 return `<div class="hpbar pb pb-${t}${blk?' blk':''}${low?' low':''}"${who!=null?` data-who="${who}" data-hp="${Math.max(0,h)}" data-max="${m}" data-blk="${blk||0}"`:''}><span class="hpin"><i class="gh" style="transform:scaleX(${pc})"></i><i style="transform:scaleX(${pc})"></i><em class="steel"></em></span><span class="hpnum">${Math.max(0,h)}<small>/${m}</small></span>${blk?`<span class="hpblk${sh?' shim':''}" ${sh?`style="${sh}"`:''} tabindex="0" role="button" aria-label="Guard ${blk}" data-kw="Guard" data-skind="buff" data-sinfo="${esc(`<span class="sx">Guard soaks up damage before your HP.</span><span class="sx now">Absorbs the next ${blk} damage.</span><span class="sx dur">Cleared at the start of its owner's next turn, unless an effect keeps it.</span>`)}"><span class="guard-art">${GUARD_SVG}<img class="uic pb-shield" src="${HUD}${t}-shield@2x.png" alt="" draggable="false" onerror="this.remove()"></span><b>${blk}</b></span>`:''}${barDeco(t,blk,t==='boss'?W.cb?.ens.find(x=>'e'+x.uid===who)?.n:'')}</div>`}
