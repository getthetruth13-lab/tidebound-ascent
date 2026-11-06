// ui/eventscene.js: full-screen event scenes (Task 40). The event painting fills the whole screen; title, text and the engraved
// choices sit on the empty side of the painting. Choices are illustrated plates (Task 56: emblem + name + summary), keywords coloured,
// a "Risky" mark when the outcome is rolled, and a hover / hold tooltip (data-info, handled by ui/kwtip.js).
import {RELICS,POTIONS} from '../core/registry.js';
import {TILES,esc,emblemHTML,splitLabel,optIconId} from './tiles.js';
import {U} from '../core/timing.js';
import {a2EventEnv,a3EventEnv} from './env.js';
// Per-event setting, chosen by looking at each painting: side = which side of the screen holds the words (the empty side);
// fx 0..1 slides the (slightly oversized) painting so its subject moves away from the words (1 = push painting left);
// fy 0..1 = vertical focal point of the cover crop.
export const SCENES={
 anvil:{side:'right',fx:1,fy:.62},cartomancer:{side:'left',fx:0,fy:.5},changeling:{side:'left',fx:0,fy:.5},crabmarket:{side:'left',fx:0,fy:.42},
 gullnest:{side:'right',fx:1,fy:.72},inkgrotto:{side:'left',fx:0,fy:.66},loom:{side:'left',fx:0,fy:.55},mirror:{side:'right',fx:1,fy:.5},
 offering:{side:'right',fx:1,fy:.62},sailor:{side:'right',fx:1,fy:.6},spring:{side:'left',fx:0,fy:.55},stranger:{side:'left',fx:1,fy:.55,z:1.18},
 sunkenchest:{side:'right',fx:1,fy:.66},tidalwheel:{side:'right',fx:1,fy:.5},tidepool:{side:'right',fx:1,fy:.62},wishing:{side:'right',fx:1,fy:.55}};
const DEF={side:'right',fx:.5,fy:.5};
let names=null;
function relicNames(){if(names)return names;const m=new Map();for(const r of Object.values(RELICS))if(r.n&&r.n.length>3)m.set(r.n,['relic',r.n+': '+r.d]);
 for(const p of Object.values(POTIONS))if(p.n&&p.n.length>3)m.set(p.n,['potion',p.n+': '+p.d]);
 const list=[...m.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 names={m,re:list.length?new RegExp('\\b('+list.join('|')+')\\b','g'):null};return names}
const KW=[[/\b(?:lose|pay|take|suffer)\s+\d+\s+(?:Max HP|HP|gold)|\bcurse[sd]?\b|\bBrine Rot\b|\bDread\b|\bBarnacled\b|\bLeaky Hull\b|\bSeasick\b/gi,'neg'],
 [/\b(?:gain|heal|restore)\s+\d+\s+(?:Max HP|HP|gold)|\bheal to full\b|\bupgrade[sd]?\b|\bremove[sd]?\b|\brandom (?:Common|Uncommon|Rare)\b|\b(?:Common|Uncommon|Rare) (?:card|relic)s?\b/gi,'pos'],
 [/\bRisky\b/g,'risk']];
// Mark gain/loss phrases, then relic / potion names (hover tip). Card names are linked later by decorateCardRefs (TEXT selector `.evo .es`, `.evdesc`).
export function hl(text){let s=String(text==null?'':text).replace(/&(?!amp;|lt;|gt;|quot;|#)/g,'&amp;');if(/<[a-z]/i.test(s))return s; // already markup
 const out=[];const slots=[];
 const keep=h=>{slots.push(h);return `\u0001${slots.length-1}\u0002`};
 const N=relicNames();if(N.re)s=s.replace(N.re,(m)=>{const [k,i]=N.m.get(m);return keep(`<span class="rl rl-${k}" data-info="${esc(i)}">${m}</span>`)});
 for(const [re,cls] of KW)s=s.replace(re,m=>keep(`<span class="hl ${cls}">${m}</span>`));
 s=s.replace(/(^|[\s(])([+−-]?\d+%?)(?=[\s).,;]|$)/g,(m,a,n)=>`${a}<b class="hn">${n}</b>`);
 return s.replace(/\u0001(\d+)\u0002/g,(m,i)=>slots[+i])}
const val=v=>typeof v==='function'?v():v;
export function optName(o){return val(o.n)||String(val(o.l)||'').replace(/<[^>]+>/g,'').replace(/^(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*\s*/u,'')}
// One painted icon per event choice type (art/v2/ui/evicons/ev-<kind>.webp, see-through). o.kind wins; otherwise read from the option text.
export const EV_KINDS=['fight','gamble','leave','heal','gold','card','upgrade','remove','transform','relic','potion','curse','blood','charm'];
const EMO_KIND=[[/🚶|↩|🔙|⬅/,'leave'],[/🩸/,'blood'],[/💰|🪙|💎/,'gold'],[/🎲/,'gamble'],[/⬆|⚒|🔨/,'upgrade'],[/🔀|🫧/,'transform'],[/🃏|🂠/,'card'],[/⚔|🗡|💥|🦀/,'fight'],[/❤|💧|💚|🍲|🩹/,'heal'],[/💠|🔮|🧿/,'relic'],[/🧪|🫙|🍺/,'potion'],[/💀|☠|🕸|👿/,'curse'],[/✂|🗑/,'remove']];
export function evKind(o,name,sum){const k=val(o.kind);if(k&&EV_KINDS.includes(k))return k;
 const t=`${name||''} ${sum||''}`.toLowerCase(),em=splitLabel(val(o.l)).emoji||'';
 if(/^(leave|back|walk on)/.test(t))return 'leave';
 if(val(o.risk)!=null){// a risky row shows what it can win (the Risky mark says it is rolled); pure luck rolls keep the dice
  const m=/\d+%:\s*([^,;]+)/.exec(sum||'');if(!m)return 'gamble';const w=evKind({},m[1],'');return ['blood','curse'].includes(w)?'gamble':w}
 if(em)for(const [re,id] of EMO_KIND)if(re.test(em))return id;
 if(/\bfight\b/.test(t))return 'fight';if(/charm/.test(t))return 'charm';if(/relic|gain [A-Z]/.test(`${name} ${sum}`)&&!/card/.test(t))return 'relic';
 if(/upgrade|sharpen/.test(t))return 'upgrade';if(/remove|scrub/.test(t))return 'remove';if(/transform/.test(t))return 'transform';
 if(/card/.test(t))return 'card';if(/potion/.test(t))return 'potion';if(/heal|rest/.test(t))return 'heal';if(/gold/.test(t))return 'gold';
 if(/curse|dread/.test(t))return 'curse';if(/\bhp\b/.test(t))return 'blood';
 const r=N_RELIC();return r.has(name)?'relic':'gamble'}
const N_RELIC=()=>new Set(Object.values(RELICS).map(r=>r.n));
function optHTML(o,i,out){const dis=!!(o.ok&&!o.ok());let name,sum;
 if(o.n!=null){name=val(o.n);sum=val(o.s)||''}else{const l=optName(o);const k=l.indexOf(': ');name=k>0&&k<=40?l.slice(0,k):l;sum=k>0&&k<=40?l.slice(k+2):''}
 sum=String(sum).replace(/^(<[^>]+>)*[a-z]/,m=>m.slice(0,-1)+m.slice(-1).toUpperCase()); // sentence case: every option sub-line starts with a capital (B-071)
 const rk=val(o.risk);const risk=rk!=null?`<i class="evrisk">Risky <u>${typeof rk==='string'?rk:Math.round(rk*100)+'% good'}</u></i>`:'';
 const why=dis&&o.why?`<i class="evwhy">${val(o.why)}</i>`:'';
 const info=[val(o.d)||'',rk!=null?(typeof rk==='number'?`Risky: ${Math.round(rk*100)}% good outcome, ${100-Math.round(rk*100)}% bad. Rolled with the run seed.`:`Risky: ${rk}.`):'',dis&&o.why?`Locked: ${val(o.why)}`:''].filter(Boolean).join(' ');
 const cont=out&&o.cont;
 return `<li><button ${cont?'id="msgok" ':''}class="evo${dis?' off':''}${rk!=null?' risky':''}${cont?' cont':''}" ${dis?'aria-disabled="true" ':`onclick="evOpt(${i})" `}${info?`data-info="${esc((name?name+': ':'')+info)}"`:''}>`+
  `${cont?'':`<span class="evico"><img class="evi" src="art/v2/ui/evicons/ev-${evKind(o,name,sum)}.webp" alt="" draggable="false" onerror="this.remove()"></span>`}<span class="evlab"><b class="evname">${hl(name)}</b>${sum?`<span class="evdash"> — </span><span class="es">${hl(sum)}</span>`:''}${risk}${why}</span></button></li>`}
export function eventSceneHTML(e){const sc={...DEF,...(SCENES[e.id]||{})};const t=TILES['event-'+(e.id||'generic')]||TILES['event-generic'];
 const scenePath=SCENES[e.id]?`art/v2/ui/scenes/task36-event-${e.id}.webp`:t?.path;
 const img=t&&t.ready?`<img src="${scenePath}" alt="" draggable="false">`:'';const out=e.out;
 const fresh=out&&Date.now()-(e.rt||0)<2500;
 const a2e=!!(a2EventEnv()||a3EventEnv()); // v0.6.67: Act 3 event scenes (ev_a3_*) also replace the Act 1 painting
 return `<div class="evscene${a2e?' a2env':''} side-${sc.side}${out?' out out-'+out.tone:''}${fresh?' fresh':''}" data-ev="${e.id||''}" style="--sp:${U(1)};--fx:${sc.fx};--fy:${sc.fy*100}%;--z:${sc.z||1.2}">
 <div class="evbg">${img||`<b class="evph">${e.e||'◈'}</b>`}</div><div class="evfade"></div><div class="evflash"></div>
 <div class="evtext"><h2 class="evtitle">${out?out.title:(e.sub||e.n)}</h2><p class="evdesc">${hl(e.t||'')}</p><ol class="evopts">${e.o.map((o,i)=>optHTML(o,i,out)).join('')}</ol></div></div>`}
