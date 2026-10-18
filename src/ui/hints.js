// ui/hints.js: first-time contextual hints. Each hint teaches one mechanic the first time it matters in a fight, shows once ever
// (settings.hintsSeen), can be dismissed with the X, and fades by itself. It extends the first-fight coach (render.js coachHTML) and the
// hero hint: it never shows while the coach pill is up, a pick mode is open, enemies are acting or a boss banner is showing, so it never
// covers the low battle hand or the hold-card ghost preview (the pill has pointer-events:none except its X).
// Reset: How to Play > Reset hints (resetHints) clears hintsSeen and brings the floor-1 coach back.
import {W} from '../core/state.js';
import {CARDS,KW} from '../core/registry.js';
import {settings,saveSettings} from '../save.js';
import {DATA} from '../data/generated/data-v2.js';
import {isJunk,canDecamp,intentOf} from '../engine/combat.js';
import {cname,desc} from '../engine/cards.js';
import {statusInfo} from './combatant.js';
import {loadProfile,saveProfile} from '../progress.js';
import {glyph,iconize} from './glyphs.js';
const C=DATA.v21.sim.core,T=C.tide,D=C.duel,RD=C.carto.rank_dmg.slice(1).map(n=>'+'+n).join(' / ');
export const HINT_MS=16000;
const plain=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/\{[^}]*\}/g,'').replace(/\s+/g,' ').trim();
const wpOf=cb=>cb.slots.filter(Boolean);
const slotLine=w=>`<b>${cname(w)}</b>: ${plain(desc(w)).replace(/\.$/,'')}`;
const STATUS_HINT=['vuln','weak','bleed','drench','reson'];
const stOn=cb=>{for(const k of STATUS_HINT)for(const e of cb.ens){if(e.hp>0&&e.st&&e.st[k]>0)return k}return null};
// {id, cls (null = every hero), when(cb) -> falsy | true | text-args, text(cb) -> html}. Order = priority (hero hints first).
export const HINTS=[
 // ---- Cartographer ----
 {id:'carto.start',cls:'carto',when:cb=>cb.turn===1&&wpOf(cb).some(w=>w.temp),text:cb=>`You start each fight with a free Waypoint, <b>${cname(wpOf(cb).find(w=>w.temp))}</b>. It acts by itself at the start of every turn. Play Waypoint cards to fill the other slots.`},
 {id:'carto.place',cls:'carto',when:cb=>wpOf(cb).some(w=>!w.temp),text:cb=>{const w=wpOf(cb).filter(x=>!x.temp).pop();return `${slotLine(w)}. It first acts at the start of your <b>next turn</b>, then every turn after.`}},
 {id:'carto.advance',cls:'carto',when:cb=>cb.turn>=2&&!cb.busy&&cb.advUsed<1&&wpOf(cb).some(w=>(w.rank||0)<3),text:()=>`<b>Advance</b> is free, once a turn: tap a Waypoint for +1 Rank. Damage Waypoints hit for ${RD} more at Ranks 1 / 2 / 3.`},
 {id:'carto.decamp',cls:'carto',when:cb=>cb.turn>=2&&!cb.busy&&canDecamp(),text:()=>`<b>Decamp</b> (the tent): once a turn, a Waypoint leaves and its Decamp line fires. It loses its Rank; the card goes to your discard pile.`},
 {id:'carto.landmark',cls:'carto',when:cb=>wpOf(cb).some(w=>(w.rank||0)>=3),text:()=>`<b>Landmark!</b> A Rank 3 Waypoint counts as 2 for Expedition and its Decamp is doubled.`},
 {id:'carto.full',cls:'carto',when:cb=>cb.slots.length>=cb.nslots&&cb.hand.some(c=>CARDS[c.id].t==='W'),text:()=>`Your slots are full. Playing another Waypoint replaces one, and the replaced one <b>Decamps</b> (its Decamp line fires).`},
 {id:'carto.chart',cls:'carto',when:cb=>cb.mode&&cb.mode.k==='chart',force:true,text:()=>`<b>Chart</b>: reorder the top cards of your draw pile, and send one to the bottom if you like. Your draw pile is face up, so you can plan your next hand.`},
 // ---- Tidecaller ----
 {id:'tide.drift',cls:'tide',when:cb=>cb.turn>=2&&!!cb.tideDir&&!cb.busy,text:cb=>`The Tide <b>drifts</b> ${T.drift} each turn the way the arrow points (${cb.tideDir>0?'up':'down'} now). At 9 pointing up, it Crests for free.`},
 {id:'tide.near',cls:'tide',when:cb=>!cb.busy&&(cb.tide>=9||cb.tide<=1)&&cb.turn>=1&&!cb.mode,text:cb=>cb.tide>=9?`One more Surge and the Tide hits 10: a <b>Crest</b>, ${T.crest_dmg} damage to ALL enemies.`:`One more Recede and the Tide hits 0: an <b>Undertow</b>, ${T.undertow_blk} Guard and draw ${T.undertow_draw}.`},
 {id:'tide.crest',cls:'tide',when:cb=>cb.stat.crests>0,text:()=>`<b>Crest!</b> ${T.crest_dmg} to ALL, and the Tide reset to 5. A second break in one turn is x1.5.`},
 {id:'tide.undertow',cls:'tide',when:cb=>cb.stat.undertows>0,text:()=>`<b>Undertow!</b> ${T.undertow_blk} Guard and a card, and the Tide reset to 5. It also Sinks junk in your hand.`},
 {id:'tide.turn',cls:'tide',when:cb=>cb.stat.tideturnsCombat>0,text:()=>`A <b>Tideturn</b>: the Tide moved against its arrow. Cards like Crosscurrent and Turning Point reward it.`},
 // ---- Echo Mage ----
 {id:'echo.mark',cls:'echo',when:cb=>!cb.busy&&!!(cb.mark||cb.mark2),text:()=>`That card is <b>Marked</b>. At the end of your turn it <b>Echoes</b>: it plays again for free, +1 if you played a card after it. Tap the bell to move a Mark.`},
 {id:'echo.resound',cls:'echo',when:cb=>!cb.busy&&cb.hand.some(c=>/Resound/.test(CARDS[c.id].d||'')),text:()=>`<b>Resound</b> lines only happen when that card <b>Echoes</b>. Mark it, then play another card after it.`},
 {id:'echo.echo',cls:'echo',when:cb=>cb.stat.echoesCombat>0,text:()=>`That was an <b>Echo</b>: a free replay of your Marked card. Max ${C.echo.cap} a turn.`},
 // ---- Duelist ----
 {id:'duel.flourish',cls:'duel',when:cb=>!cb.busy&&cb.mom>=D.flourish_min&&!cb.mode,text:cb=>`You have ${cb.mom} Momentum. Tap the blade, then play an Attack: a <b>Flourish</b> multiplies it (x2 at 2, up to x3.5 at 5) and spends all Momentum.`},
 {id:'duel.parry',cls:'duel',when:cb=>!cb.busy&&Object.values(cb.parries||{}).some(v=>v>0),text:()=>`A <b>Parry</b> is set on that enemy. Its first hit next turn is reduced, and half of the Parry is reflected. Stop the whole hit for a <b>Clean Answer</b> (+1 Momentum).`},
 {id:'duel.bleed',cls:'duel',when:cb=>cb.ens.some(e=>e.hp>0&&e.st&&e.st.bleed>0),text:()=>`<b>Bleed</b>: each time your Attack hits that enemy it loses that much HP, ignoring Guard. Then it drops by 1.`},
 // ---- every hero ----
 {id:'g.status',cls:null,when:cb=>!!stOn(cb),text:cb=>{const k=stOn(cb),i=statusInfo(k);return `<b>${i.n}</b> on an enemy: ${plain(KW[i.kw]||i.rule||'')} Tap its badge to read more.`}},
 {id:'g.vigil',cls:null,when:cb=>cb.powers&&cb.powers.length>0,text:cb=>`<b>${CARDS[cb.powers[cb.powers.length-1].id].n}</b> is a <b>Vigil</b>: it stays in play for the rest of the fight and works on its own.`},
 {id:'g.sink',cls:null,when:cb=>cb.exh&&cb.exh.length>0,text:()=>`<b>Sink</b> removes a card for this fight only. Tap the anchor pile to see it. It comes back next fight.`},
 {id:'g.flotsam',cls:null,when:cb=>cb.hand.some(isJunk),text:()=>`<b>Flotsam</b> and <b>Burdens</b> are junk that clog your hand. Some cards Sink them for a bonus.`},
 // ---- later acts (v0.6.54): one line the first time each new mechanic matters; they show once, and How to Play > Reset hints brings them back ----
 {id:'g.seize',cls:null,when:cb=>cb.ens.some(e=>e.seized&&e.hp>0),text:cb=>`<b>Seized</b>: ${cb.ens.find(e=>e.seized&&e.hp>0).n} took your cheapest card. Defeat it and the card comes back; it is never lost for good.`},
 {id:'g.numbed',cls:null,when:cb=>!!cb.numbCard,text:()=>`<b>Numbed</b>: your cheapest card costs 1 more this turn only.`},
 {id:'g.charge',cls:null,when:cb=>cb.ens.some(e=>e.hp>0&&e.passive&&e.passive.charge),text:()=>`<b>Charge</b> builds on that enemy each turn. At 3 it discharges and adds a <b>Static</b> to your draw pile. Hitting it hard knocks a pip off.`},
 {id:'g.tailwind',cls:null,when:cb=>cb.ens.some(e=>e.hp>0&&e.tailwind),text:()=>`<b>Tailwind</b>: that enemy's first hit each turn is stronger. Raise your Guard before it swings.`},
 {id:'g.gust',cls:null,when:cb=>cb.ens.some(e=>{if(e.hp<=0)return false;try{const m=intentOf(e);return !!(m&&m.gust)}catch(_){return false}}),text:()=>`<b>Gust</b>: when it lands, your last drawn cards are blown back on top of your draw pile. Play them first if you can.`},
 {id:'g.elite',cls:null,when:cb=>cb.kind==='elite'&&cb.turn===1,text:()=>`An <b>Elite</b>: tougher than a normal fight, but it drops a relic when it falls.`}
];
const seen=()=>settings.hintsSeen||(settings.hintsSeen={});
const byId=id=>HINTS.find(h=>h.id===id);
// Pick the next hint to show (null if none). Pure apart from reading settings/state.
export function pickHint(cb,cls){
 for(const h of HINTS){if(h.cls&&h.cls!==cls)continue;if(seen()[h.id])continue;let ok=false;try{ok=!!h.when(cb)}catch(_){}if(ok)return h}
 return null}
export function hintsBlocked(cb,coachUp){return !!(coachUp||W.S.ov||W.previewing||cb.busy&&!cb.mode||(cb.beat&&Date.now()-cb.beat.t<3200))}
// Called from combatScr every render. Returns the pill HTML ('' if none). Marks a hint seen the moment it first shows.
export function ctxHintHTML(cb,cls,coachUp){
 if(settings.hints===false)return '';
 const now=Date.now();
 if(cb.ctxHint&&now-cb.ctxHint.t>=HINT_MS)cb.ctxHint=null;
 if(!cb.ctxHint){const h=pickHint(cb,cls);if(!h||(hintsBlocked(cb,coachUp)&&!h.force))return '';
  seen()[h.id]=1;try{saveSettings()}catch(_){}cb.ctxHint={id:h.id,t:now,html:h.text(cb)}}
 if(coachUp||W.S.ov)return '';
 const c=cb.ctxHint,age=now-c.t;
 return `<div class="coach ctx-hint" role="status" data-hint="${c.id}" style="animation-delay:-${age}ms"><span class="co-ico">${glyph('bolt')}</span><span>${iconize(c.html)}</span><button class="co-x" aria-label="Dismiss hint" title="Dismiss" onclick="event.stopPropagation();dismissHint()">${glyph('cross')}</button></div>`}
export function dismissHint(){if(W.cb)W.cb.ctxHint={id:'-',t:Date.now()-HINT_MS+1,html:''};document.querySelector('.ctx-hint')?.remove()}
// How to Play > Reset hints: every contextual hint and the first-fight coach come back.
export function resetHints(){settings.hintsSeen={};settings.coach=true;settings.hints=true;try{saveSettings()}catch(_){}
 try{const p=loadProfile();p.tutSeen={};saveProfile(p)}catch(_){}
 try{localStorage.removeItem('tidebound.tutprog.v1')}catch(_){}
 if(W.cb){W.cb.ctxHint=null;W.cb.tut=null}
 W.S={...W.S,hintsReset:true};if(typeof window!=='undefined'&&window.render)window.render()}
export const hintCount=()=>HINTS.length;
