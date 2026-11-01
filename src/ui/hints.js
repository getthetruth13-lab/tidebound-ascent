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
const C=DATA.v21.sim.core,T=C.tide,D=C.duel;
export const HINT_MS=16000;
const plain=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/\{[^}]*\}/g,'').replace(/\s+/g,' ').trim();
const wpOf=cb=>cb.slots.filter(Boolean);
const slotLine=w=>`<b>${cname(w)}</b>: ${plain(desc(w)).replace(/\.$/,'')}`;
const STATUS_HINT=['vuln','weak','bleed','drench','reson'];
const stOn=cb=>{for(const k of STATUS_HINT)for(const e of cb.ens){if(e.hp>0&&e.st&&e.st[k]>0)return k}return null};
// {id, cls (null = every hero), when(cb) -> falsy | true | text-args, text(cb) -> html}. Order = priority (hero hints first).
export const HINTS=[
 // v0.6.96 (Spencer 10-31, D17 settled): every hint is at most ~15 words (tests/hint-cap.cjs). Same meaning, fewer words.
 // ---- Cartographer ----
 {id:'carto.start',cls:'carto',when:cb=>cb.turn===1&&wpOf(cb).some(w=>w.temp),text:cb=>`Your free Waypoint, <b>${cname(wpOf(cb).find(w=>w.temp))}</b>, acts every turn. Play Waypoint cards to fill other slots.`},
 {id:'carto.place',cls:'carto',when:cb=>wpOf(cb).some(w=>!w.temp),text:cb=>{const w=wpOf(cb).filter(x=>!x.temp).pop();return `<b>${cname(w)}</b> first acts at your <b>next turn</b>'s start, then every turn.`}},
 {id:'carto.advance',cls:'carto',when:cb=>cb.turn>=2&&!cb.busy&&cb.advUsed<1&&wpOf(cb).some(w=>(w.rank||0)<3),text:()=>`<b>Advance</b>: free once a turn. Tap a Waypoint for +1 Rank; damage Waypoints hit harder.`},
 {id:'carto.decamp',cls:'carto',when:cb=>cb.turn>=2&&!cb.busy&&canDecamp(),text:()=>`<b>Decamp</b> (tent), once a turn: a Waypoint fires its Decamp line and goes to discard.`},
 {id:'carto.landmark',cls:'carto',when:cb=>wpOf(cb).some(w=>(w.rank||0)>=3),text:()=>`<b>Landmark!</b> A Rank 3 Waypoint counts as 2 for Expedition and doubles its Decamp.`},
 {id:'carto.full',cls:'carto',when:cb=>cb.slots.length>=cb.nslots&&cb.hand.some(c=>CARDS[c.id].t==='W'),text:()=>`Slots full. Another Waypoint replaces one, and the replaced one <b>Decamps</b>.`},
 {id:'carto.chart',cls:'carto',when:cb=>cb.mode&&cb.mode.k==='chart',force:true,text:()=>`<b>Chart</b>: reorder your face-up top cards, or send one to the bottom.`},
 // ---- Tidecaller ----
 {id:'tide.drift',cls:'tide',when:cb=>cb.turn>=2&&!!cb.tideDir&&!cb.busy,text:cb=>`Tide <b>drifts</b> ${T.drift} per turn with the arrow (${cb.tideDir>0?'up':'down'}). At 9 rising, it Crests free.`},
 {id:'tide.near',cls:'tide',when:cb=>!cb.busy&&(cb.tide>=9||cb.tide<=1)&&cb.turn>=1&&!cb.mode,text:cb=>cb.tide>=9?`One more Surge hits 10: a <b>Crest</b>, ${T.crest_dmg} damage to ALL enemies.`:`One more Recede hits 0: an <b>Undertow</b>, ${T.undertow_blk} Guard and draw ${T.undertow_draw}.`},
 {id:'tide.crest',cls:'tide',when:cb=>cb.stat.crests>0,text:()=>`<b>Crest!</b> ${T.crest_dmg} to ALL; Tide resets to 5. A second break this turn is x1.5.`},
 {id:'tide.undertow',cls:'tide',when:cb=>cb.stat.undertows>0,text:()=>`<b>Undertow!</b> ${T.undertow_blk} Guard and a card; Tide resets to 5. Junk in hand Sinks too.`},
 {id:'tide.turn',cls:'tide',when:cb=>cb.stat.tideturnsCombat>0,text:()=>`A <b>Tideturn</b>: the Tide moved against its arrow. Crosscurrent and Turning Point reward it.`},
 // ---- Echo Mage ----
 {id:'echo.mark',cls:'echo',when:cb=>!cb.busy&&!!(cb.mark||cb.mark2),text:()=>`<b>Marked</b>: replays free at turn end (<b>Echo</b>), +1 if a card follows. Bell moves Marks.`},
 {id:'echo.resound',cls:'echo',when:cb=>!cb.busy&&cb.hand.some(c=>/Resound/.test(CARDS[c.id].d||'')),text:()=>`<b>Resound</b> lines only happen when that card <b>Echoes</b>. Mark it, then play another card.`},
 {id:'echo.echo',cls:'echo',when:cb=>cb.stat.echoesCombat>0,text:()=>`That was an <b>Echo</b>: a free replay of your Marked card. Max ${C.echo.cap} a turn.`},
 // ---- Duelist ----
 {id:'duel.flourish',cls:'duel',when:cb=>!cb.busy&&cb.mom>=D.flourish_min&&!cb.mode,text:cb=>`${cb.mom} Momentum: tap the blade, then Attack. <b>Flourish</b>: x2 up to x3.5, spends all.`},
 {id:'duel.parry',cls:'duel',when:cb=>!cb.busy&&Object.values(cb.parries||{}).some(v=>v>0),text:()=>`<b>Parry</b>: its next hit shrinks; half the Parry reflects. Stop all: <b>Clean Answer</b>, +1 Momentum.`},
 {id:'duel.bleed',cls:'duel',when:cb=>cb.ens.some(e=>e.hp>0&&e.st&&e.st.bleed>0),text:()=>`<b>Bleed</b>: each Attack hit costs it that much HP, ignoring Guard, then Bleed drops 1.`},
 // ---- every hero ----
 {id:'g.status',cls:null,when:cb=>!!stOn(cb),text:cb=>{const k=stOn(cb),i=statusInfo(k);const rule=(plain(KW[i.kw]||i.rule||'').match(/^[^.]*\./)||[''])[0];const long=`<b>${i.n}</b> on an enemy: ${rule} Tap its badge for more.`;return plain(long).split(' ').length<=15?long:`<b>${i.n}</b> is on an enemy. Tap its badge to read what it does.`}},
 {id:'g.vigil',cls:null,when:cb=>cb.powers&&cb.powers.length>0,text:cb=>`<b>${CARDS[cb.powers[cb.powers.length-1].id].n}</b> is a <b>Vigil</b>: it stays in play all fight and works alone.`},
 {id:'g.sink',cls:null,when:cb=>cb.exh&&cb.exh.length>0,text:()=>`<b>Sink</b> removes a card for this fight only. Tap the anchor pile to see it.`},
 {id:'g.flotsam',cls:null,when:cb=>cb.hand.some(isJunk),text:()=>`<b>Flotsam</b> and <b>Burdens</b> are hand-clogging junk. Some cards Sink them for a bonus.`},
 // ---- later acts (v0.6.54): one line the first time each new mechanic matters; they show once, and How to Play > Reset hints brings them back ----
 {id:'g.seize',cls:null,when:cb=>cb.ens.some(e=>e.seized&&e.hp>0),text:cb=>`<b>Impressed</b>: ${cb.ens.find(e=>e.seized&&e.hp>0).n} took your cheapest card. Defeat it to get it back.`},
 {id:'g.numbed',cls:null,when:cb=>!!cb.numbCard,text:()=>`<b>Numbed</b>: your cheapest card costs 1 more this turn only.`},
 {id:'g.charge',cls:null,when:cb=>cb.ens.some(e=>e.hp>0&&e.passive&&e.passive.charge),text:()=>`<b>Charge</b> builds each turn; at 3 it adds a <b>Static</b> card. Hard hits remove pips.`},
 {id:'g.tailwind',cls:null,when:cb=>cb.ens.some(e=>e.hp>0&&e.tailwind),text:()=>`<b>Tailwind</b>: that enemy's first hit each turn is stronger. Raise your Guard first.`},
 {id:'g.gust',cls:null,when:cb=>cb.ens.some(e=>{if(e.hp<=0)return false;try{const m=intentOf(e);return !!(m&&m.gust)}catch(_){return false}}),text:()=>`<b>Gust</b> blows your last drawn cards back onto your draw pile. Play them first.`},
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
