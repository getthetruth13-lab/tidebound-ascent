// data/classes.js — the 4 classes. HP and the core-rule numbers come from data-v2.json (v21.sim.core / v2.1 class HP).
import {registerClasses} from '../core/registry.js';
import {DATA} from './generated/data-v2.js';
const C=DATA.v21.sim.core,HP=DATA.v21.sim.hp;
registerClasses({
 tide:{n:'Tidecaller',e:'🌊',hp:HP.tide,col:'var(--tidecaller-primary)',theme:'tidecaller',relic:'moonshell',starter:['splash','splash','splash','splash','brace','brace','brace','brace','riptide','still'],
  tag:'Ride the drift',
  rule:`Steer the <b>Tide</b> (0–10). Cards <b>Surge</b> it up or <b>Recede</b> it down, and each turn it <b>drifts</b> ${C.tide.drift} along its arrow. <b>High Tide</b> ${C.tide.high}+ and <b>Low Tide</b> ${C.tide.low}− unlock bonuses. Hit 10 to <b>Crest</b> (${C.tide.crest_dmg} to ALL); hit 0 for <b>Undertow</b> (${C.tide.undertow_blk} Guard, draw ${C.tide.undertow_draw}).`},
 echo:{n:'Echo Mage',e:'🔮',hp:HP.echo,col:'var(--echo-mage-primary)',theme:'echo-mage',relic:'tuningfork',starter:['arc','arc','arc','arc','shimmer','shimmer','shimmer','shimmer','reverb','hum'],
  tag:'Mark the note that sings again',
  rule:`Once per turn, <b>Mark</b> a card as you play it (tap 🔔). At the end of your turn it <b>Echoes</b> for free at its original target, +${C.echo.bonus_per_card_after} per card played after it (max +${C.echo.bonus_cap}). No Mark: your last card Echoes at half strength. <b>Resound</b> bonuses happen only on the Echo.`},
 carto:{n:'Cartographer',e:'🧭',hp:HP.carto,col:'var(--cartographer-primary)',theme:'cartographer',relic:'sextant',starter:['cstrike','cstrike','cstrike','cstrike','tent','tent','tent','tent','survey','signal'],
  tag:'Build the road, then burn it',
  rule:`Your draw pile is <b>face up</b>. Draw 4, but build <b>Waypoints</b> (3 slots) that trigger every turn. Once per turn, tap a Waypoint to <b>Advance</b> it (+1 Rank, +${C.carto.per_rank} damage per Rank; Rank ${C.carto.rank_max} is a <b>Landmark</b>). <b>Expedition</b> cards scale with Waypoints.`},
 duel:{n:'Duelist',e:'🤺',hp:HP.duel,col:'var(--duelist-primary)',theme:'duelist',relic:'glove',starter:['thrust','thrust','thrust','thrust','parry','parry','parry','parry','lunge','footwork'],
  tag:'Tempo, read, bleed',
  rule:`Attacks build <b>Momentum</b> (max ${C.duel.mom_max}; start with ${C.duel.start_mom}). It carries over but fades ${C.duel.decay} per turn, and unblocked hits cost ${C.duel.lose_on_unblocked}. With ${C.duel.flourish_min}+ Momentum, tap ⚔️ to <b>Flourish</b>: spend it all for ×(1 + ½ per Momentum). <b>Parry</b> blunts the first hit and reflects half. Attacks deal +${C.duel.focus} to the highest-HP enemy.`},
});
