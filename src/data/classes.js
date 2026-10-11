// data/classes.js — the 4 classes. HP and the core-rule numbers come from data-v2.json (v21.sim.core / v2.1 class HP).
import {registerClasses} from '../core/registry.js';
import {DATA} from './generated/data-v2.js';
const C=DATA.v21.sim.core,HP=DATA.v21.sim.hp;
registerClasses({
 tide:{n:'Tidecaller',e:'🌊',hp:HP.tide,col:'var(--tidecaller-primary)',theme:'tidecaller',relic:'moonshell',starter:['splash','splash','splash','splash','brace','brace','brace','brace','riptide','still'],
  tag:'Ride the drift',
  rule:`Steer the <b>Tide</b> (0–10). Cards <b>Surge</b> it up or <b>Recede</b> it down. From turn 2, after you draw, it <b>drifts</b> ${C.tide.drift} along its arrow. <b>High Tide</b> is ${C.tide.high}+ and <b>Low Tide</b> is ${C.tide.low} or less. Hit 10 to <b>Crest</b> (${C.tide.crest_dmg} to ALL); hit 0 for an <b>Undertow</b> (${C.tide.undertow_blk} Guard, draw ${C.tide.undertow_draw}). Both reset the Tide to 5 and reverse its arrow.`},
 echo:{n:'Echo Mage',e:'🔮',hp:HP.echo,col:'var(--echo-mage-primary)',theme:'echo-mage',relic:'tuningfork',starter:['arc','arc','arc','arc','shimmer','shimmer','shimmer','shimmer','reverb','hum'],
  tag:'Mark the note that sings again',
  rule:`Once per turn, <b>Mark</b> a non-Faint Attack or Skill as you play it (tap 🔔 first). At the end of your turn it <b>Echoes</b> for free at its original target (or a random enemy if that target is gone), +${C.echo.bonus_per_card_after} damage and Guard per card played after it (max +${C.echo.bonus_cap}). No Mark: your last non-Faint Attack or Skill Echoes at ${({.5:'half',.25:'quarter'})[C.echo.unmarked_fallback]||(Math.round(C.echo.unmarked_fallback*100)+'%')} strength. <b>Resound</b> bonuses happen only on the Echo. At most ${C.echo.cap} Echo repeats per turn.`},
 carto:{n:'Cartographer',e:'🧭',hp:HP.carto,col:'var(--cartographer-primary)',theme:'cartographer',relic:'sextant',starter:['cstrike','cstrike','cstrike','cstrike','bivouac','tent','tent','tent','survey','signal'],
  tag:'Build the road, then burn it',
  rule:`Your draw pile is <b>face up</b>. You draw 4 and build <b>Waypoints</b> in 3 slots. They trigger at the start of your turn (a <b>Fast</b> one also triggers when placed). Full slots: choose one to replace. Once per turn, <b>Advance</b> one (+1 Rank; damage bonus +${(C.carto.rank_dmg||[]).slice(1).join(' / +')||C.carto.per_rank} at Ranks ${(C.carto.rank_dmg||[0,1,2,3]).slice(1).map((_,i)=>i+1).join(' / ')}). Rank ${C.carto.rank_max} is a <b>Landmark</b> and counts as 2 for <b>Expedition</b>.`},
 duel:{n:'Duelist',e:'🤺',hp:HP.duel-6,col:'var(--duelist-primary)',theme:'duelist',relic:'glove',starter:['thrust','thrust','thrust','thrust','parry','parry','parry','parry','lunge','footwork'],
  tag:'Tempo, read, bleed',
  rule:`Attacks build <b>Momentum</b> (max ${C.duel.mom_max}; start with ${C.duel.start_mom}). It carries over and fades ${C.duel.decay} at the end of your turn. Damage that gets through Guard costs ${C.duel.lose_on_unblocked} Momentum. With ${C.duel.flourish_min}+ Momentum, tap ⚔️ to <b>Flourish</b>: spend it all for ×(1 + ½ per Momentum), up to ×3.5. <b>Parry</b> reduces the first enemy hit next enemy turn and reflects half the Parry (rounded down). Attacks deal +${C.duel.focus} to every enemy tied for the highest HP.`},
});
