// data/classes.js — the 4 classes. HP and the core-rule numbers come from data-v2.json (v21.sim.core / v2.1 class HP).
import {registerClasses} from '../core/registry.js';
import {DATA} from './generated/data-v2.js';
import {ACT1_STARTERS as ST,ACT1_HP as AH} from './generated/act1-pool.js';
const C=DATA.v21.sim.core,HP=DATA.v21.sim.hp;
registerClasses({
 tide:{n:'Tidecaller',e:'🌊',hp:AH.tide,col:'var(--tidecaller-primary)',theme:'tidecaller',relic:'moonshell',starter:ST.tide,
  tag:'Ride the drift',
  rule:`Cards <b>Surge</b> or <b>Recede</b> the <b>Tide</b> (0–10); it <b>drifts</b> ${C.tide.drift} along its arrow each turn. <b>High Tide</b> ${C.tide.high}+, <b>Low Tide</b> ${C.tide.low}−. 10 <b>Crests</b> (${C.tide.crest_dmg} to ALL); 0 <b>Undertows</b> (${C.tide.undertow_blk} Guard, draw ${C.tide.undertow_draw}, junk in hand Sinks). The second break each turn is ×1.5.`},
 echo:{n:'Echo Mage',e:'🔮',hp:AH.echo,col:'var(--echo-mage-primary)',theme:'echo-mage',relic:'tuningfork',starter:ST.echo,
  tag:'Mark the note that sings again',
  rule:`Your first <b>Attack</b> and first <b>Skill</b> each turn are <b>Marked</b>; tap 🔔 to move a Mark onto your next card. Marked cards <b>Echo</b> free at end of turn, +${C.echo.bonus_per_card_after} if a card follows. Max ${C.echo.cap} Echoes a turn.`},
 carto:{n:'Cartographer',e:'🧭',hp:AH.carto,col:'var(--cartographer-primary)',theme:'cartographer',relic:'sextant',starter:ST.carto,
  tag:'Build the road, then burn it',
  rule:`Your draw pile is <b>face up</b>. <b>Waypoints</b> fill 3 slots and trigger each turn. Once per turn, <b>Advance</b> one (+1 Rank: +${(C.carto.rank_dmg||[]).slice(1).join(' / +')} damage). Once per turn, <b>Decamp</b> one: it leaves and fires its Decamp line. Rank ${C.carto.rank_max} is a <b>Landmark</b>.`},
 duel:{n:'Duelist',e:'🤺',hp:AH.duel,col:'var(--duelist-primary)',theme:'duelist',relic:'glove',starter:ST.duel,
  tag:'Tempo, read, bleed',
  rule:`Attacks build <b>Momentum</b> (max ${C.duel.mom_max}). At ${C.duel.flourish_min}+, <b>Flourish</b> spends it all for up to ×3.5. <b>Parry</b> calls an enemy: its first hit next turn is reduced and half reflected. A full stop is a <b>Clean Answer</b> (+1 Momentum). +${C.duel.focus} damage to the highest-HP enemy.`},
});
