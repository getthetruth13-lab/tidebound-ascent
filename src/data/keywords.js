// data/keywords.js — the KW glossary. Entries come from design-v2.md §2.1 (generated/glossary.js); the short
// sub-keyword entries below (Surge, Crest, Mark…) are split out of the Tide/Echo/Waypoint entries so that every
// keyword on a card has its own tap-to-read line. Numbers come from data-v2.json v21.sim.core.
import {registerKeywords} from '../core/registry.js';
import {GLOSSARY} from './generated/glossary.js';
import {DATA} from './generated/data-v2.js';
const T=DATA.v21.sim.core.tide,E=DATA.v21.sim.core.echo,K=DATA.v21.sim.core.carto;
const kw={...GLOSSARY};
kw['Bearing']=kw['Bearing (Attack / Skill)'];delete kw['Bearing (Attack / Skill)'];
Object.assign(kw,{
 'Surge':'Raise the Tide by X. Its arrow then points up.',
 'Recede':'Lower the Tide by X. Its arrow then points down.',
 'High Tide':`The Tide is ${T.high} or more (checked when the card is played).`,
 'Low Tide':`The Tide is ${T.low} or less (checked when the card is played).`,
 'Crest':`The Tide reaches 10: deal ${T.crest_dmg} to ALL enemies, then the Tide resets to 5 with its arrow pointing down.`,
 'Undertow':`The Tide reaches 0: gain ${T.undertow_blk} Guard and draw ${T.undertow_draw}, then the Tide resets to 5 with its arrow pointing up.`,
 'Mark':`Once per turn, tap the bell before playing a card to Mark it. It Echoes at the end of your turn, +${E.bonus_per_card_after} per card played after it (max +${E.bonus_cap}).`,
 'Rank':`Each Waypoint has a Rank from 0 to ${K.rank_max}. Damage bonuses at Ranks 1–${K.rank_max}: +${(K.rank_dmg||[0,K.per_rank,K.per_rank*2,K.per_rank*3]).slice(1).join(" / +")}. Lost when it leaves its slot.`,
 'Fast Waypoint':'Triggers once as soon as it is placed, including when replacing a Waypoint, then again at the start of each turn.',
 'Spend':'Spend N Tide: lower the Tide by N as part of the card. The card cannot be played if the Tide is too low. Spending can cause a Tideturn or an Undertow.',
 'Drenched X':'Enemy status. Whenever the Tide turns, Crests or Undertows, the enemy loses X HP (Guard cannot stop it). Falls by 1 at the end of its turn. Max 12.',
 'Resonating X':'Enemy status. Each hit of your Echo deals X more damage to it. Falls by 1 at the end of its turn. Max 12.',
 'Bank':'A Banked Crest does not fire. The Tide stays at 10 (max 3 Banked). Tap Release on the Tide meter: 1½ x Crest damage to ALL per Banked Crest. A full Bank of 3 releases itself at the start of your turn.',
 'Reveal':'Shows what a ? room holds (Fight, Chest, Merchant or Event) with a small icon on the map.',
 'Power':'Stays in play for the rest of the combat.',
});
registerKeywords(kw);
