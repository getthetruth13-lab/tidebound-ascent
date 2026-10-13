// data/classes.js — the 4 classes. HP and the core-rule numbers come from data-v2.json (v21.sim.core / v2.1 class HP).
import {registerClasses} from '../core/registry.js';
import {DATA} from './generated/data-v2.js';
const C=DATA.v21.sim.core,HP=DATA.v21.sim.hp;
registerClasses({
 tide:{n:'Tidecaller',e:'🌊',hp:HP.tide,col:'var(--tidecaller-primary)',theme:'tidecaller',relic:'moonshell',starter:['splash','splash','splash','splash','brace','brace','brace','brace','riptide','still'],
  tag:'Ride the drift',
  rule:`Cards <b>Surge</b> or <b>Recede</b> the <b>Tide</b> (0–10); it <b>drifts</b> ${C.tide.drift} along its arrow each turn. <b>High Tide</b> ${C.tide.high}+, <b>Low Tide</b> ${C.tide.low}−. 10 <b>Crests</b> (${C.tide.crest_dmg} to ALL); 0 <b>Undertows</b> (${C.tide.undertow_blk} Guard, draw ${C.tide.undertow_draw}).`},
 echo:{n:'Echo Mage',e:'🔮',hp:HP.echo,col:'var(--echo-mage-primary)',theme:'echo-mage',relic:'tuningfork',starter:['arc','arc','arc','arc','shimmer','shimmer','shimmer','shimmer','reverb','hum'],
  tag:'Mark the note that sings again',
  rule:`Once per turn, <b>Mark</b> an Attack or Skill (tap 🔔). It <b>Echoes</b> free at end of turn, +${C.echo.bonus_per_card_after} per card played after (max +${C.echo.bonus_cap}). No Mark: last card Echoes at ${({.5:'half',.25:'quarter'})[C.echo.unmarked_fallback]||(Math.round(C.echo.unmarked_fallback*100)+'%')} strength. Max ${C.echo.cap} Echoes per turn.`},
 carto:{n:'Cartographer',e:'🧭',hp:HP.carto,col:'var(--cartographer-primary)',theme:'cartographer',relic:'sextant',starter:['cstrike','cstrike','cstrike','cstrike','bivouac','tent','tent','tent','survey','signal'],
  tag:'Build the road, then burn it',
  rule:`Your draw pile is <b>face up</b>. <b>Waypoints</b> fill 3 slots and trigger each turn. Once per turn, <b>Advance</b> one (+1 Rank: +${(C.carto.rank_dmg||[]).slice(1).join(' / +')||C.carto.per_rank} damage). Rank ${C.carto.rank_max} is a <b>Landmark</b>.`},
 duel:{n:'Duelist',e:'🤺',hp:HP.duel-6,col:'var(--duelist-primary)',theme:'duelist',relic:'glove',starter:['thrust','thrust','thrust','thrust','parry','parry','parry','parry','lunge','footwork'],
  tag:'Tempo, read, bleed',
  rule:`Attacks build <b>Momentum</b> (max ${C.duel.mom_max}). It drops ${C.duel.decay} per turn and when hit through Guard. At ${C.duel.flourish_min}+, <b>Flourish</b> to spend it all for up to ×3.5. <b>Parry</b> softens the next enemy hit. +${C.duel.focus} damage to the highest-HP enemy.`},
});
