// data/keywords.js — the KW glossary. Entries come from design-v2.md §2.1 (generated/glossary.js); the short
// sub-keyword entries below (Surge, Crest, Mark…) are split out of the Tide/Echo/Waypoint entries so that every
// keyword on a card has its own tap-to-read line. Numbers come from data-v2.json v21.sim.core.
import {registerKeywords} from '../core/registry.js';
import {GLOSSARY} from './generated/glossary.js';
import {DATA} from './generated/data-v2.js';
const T=DATA.v21.sim.core.tide,E=DATA.v21.sim.core.echo,K=DATA.v21.sim.core.carto;
const kw={...GLOSSARY};
kw['Bearing']=kw['Bearing (Attack / Skill)'];delete kw['Bearing (Attack / Skill)'];
const echoFrac=({.5:'half',.25:'quarter'})[E.unmarked_fallback]||(Math.round(E.unmarked_fallback*100)+'%');
const rankBonus=(K.rank_dmg||[0,K.per_rank,K.per_rank*2,K.per_rank*3]).slice(1);
Object.assign(kw,{
 'Tide':`Meter from 0 to 10, starts at 5. 10 Crests, 0 Undertows; both reset to 5.`,
 'Drift':`From turn 2, the Tide moves ${T.drift} more in its arrow's direction.`,
 'Echo':`Once per turn, tap the bell to Mark an Attack or Skill. It replays free at end of turn.`,
 'Advance':`Once per turn, tap a Waypoint for +1 Rank, free. Max ${K.rank_max}.`,
 'Surge':'Raise the Tide by that much.',
 'Recede':'Lower the Tide by that much.',
 'High Tide':`Tide at ${T.high} or more.`,
 'Low Tide':`Tide at ${T.low} or less.`,
 'Crest':`Tide hits 10: deal ${T.crest_dmg} damage to ALL enemies. Resets to 5.`,
 'Undertow':`Tide hits 0: gain ${T.undertow_blk} Guard, draw ${T.undertow_draw}. Resets to 5.`,
 'Mark':`Tap the bell, then play an Attack or Skill. It replays free at end of turn.`,
 'Rank':`Ranks 1 / 2 / 3 add +${rankBonus.join(' / +')} to a damage Waypoint's turn-start hit. At Rank 3 (Landmark) its Decamp is doubled. Resets when it leaves its slot.`,
 'Fast Waypoint':'Also triggers once when placed.',
 'Spend':'Lower the Tide by that much to play this. Can trigger Tideturn or Undertow.',
 'Drenched X':'Loses X HP when the Tide turns, Crests or Undertows. Drops 1 per turn. Max 12.',
 'Resonating X':'Your Echoed Attacks deal X more damage to it. Drops 1 per turn. Max 12.',
 'Bank':'Stores a Crest instead of firing it, up to 3. Release deals 1½× Crest damage each.',
 'Reveal':'Shows what a ? room holds.',
 'Vigil':'A card type. Once played, it stays in play for the rest of the fight, like a lamp left burning through the night.',
 'Flotsam':'Junk added during a fight. It clogs your hand.',
 'Burden':'A curse that stays in your deck.',
 'Full Flame':'Spends all your Energy. X is the amount spent.',
 'Artifact':'A rare card. A badge, not a card type.',
});
// cards-act1: the new Act 1 rule words (FULL-CARD-POOL 9.6 tooltips: fewest plain words, no worked numbers).
Object.assign(kw,{
 'Echo':'A Marked card repeats free at turn end.',
 'Mark':'Your first Attack and Skill each turn. Tap the bell to move one.',
 'Spend':'Lower the Tide as a cost.',
 'Decamp':'Happens when this Waypoint leaves. Tap once a turn to leave.',
 'Advance':'Raise a Waypoint\'s Rank. Tap once a turn, free.',
 'Landmark':'Rank 3 Waypoint. Counts 2 for Expedition; doubles its Decamp.',
 'Parry X':'Blunts and reflects that enemy\'s next hit.',
 'Clean Answer':'A Parry that stops the whole hit.',
 'Rolling Break':'The second break each turn hits harder.',
 'Break':'A Crest or an Undertow.',
 'Chart X':'Look at your top cards; reorder them.',
 'Bearing':'Bonus if your top card is that type.',
 'Momentum':'Attacks build it. Fades each turn and when hit.',
 'Flourish':'Spend all Momentum to multiply an Attack.',
 'Big Moment':'Your hero\'s signature event.',
});
// Act 2 rule words (ACT2-RULES tutorial lines): plain, one line each. They only appear once an Act 2 enemy or card names them.
Object.assign(kw,{
 'Gunnery':'Aiming: it fires next turn and only half your Guard blocks.',
 'Hold the Line':'While it has Guard, single-target attacks on its allies hit it instead. AoE and Bleed ignore the wall.',
 'Armoured':'The first Attack each turn bounces off. Hit twice.',
 'Muffled':'Your most expensive card is silenced this turn.',
 'Owed':'The first card of the type you played first costs 1 more next turn.',
 'Scald':'Unplayable. If it is in your hand at turn end, take 2 damage.',
 'Pull':'Drags your Tide down, or strips Guard.',
 'Pressure':'The dial fills each turn. At 4 it vents. Hit hard to bleed it.',
 'Chorus':'Each hymn is stronger for every other singer alive.',
 'Seize':'Takes your cheapest card until the seizer dies.',
 'Jam':'Enough damage in one turn jams it for an action.',
 'Swivel':'The gun turns every three turns. A big hit jams the turntable.',
});
// Act 3 rule words (ACT3-RULES tutorial lines).
Object.assign(kw,{
 'Charge':'Builds each turn. At 3 it discharges and adds a Static to your draw pile.',
 'Static':'Unplayable. When drawn, you lose 1 Energy this turn. Sinks at turn end.',
 'Gust':'Sends your last drawn cards back on top of your draw pile.',
 'Numbed':'Your cheapest card costs 1 more this turn.',
 'Cloud Dive':'Submerged: only area damage and Bleed reach it. It surfaces with a heavy hit.',
 'Storm Tide':'Your Surge and Recede are 1 weaker this turn, or your first Guard card gives 1 less.',
 'Veiled':'You see what it will do, not how much. It never exceeds 26.',
 'Link':'While both twins live, each hit is 2 stronger. Only the front twin can be hit.',
 'Overclock':'Its blast grows with every ring still spinning. Break a ring to lose its rule.',
 'Water':'At the end of your turn you lose 1 HP for every 5 Guard you hold.',
 'Tailwind':"An ally's next attack hits 4 harder on its first hit.",
 'Refract':'Your first Attack card each turn deals 3 damage back to you.',
 'Siphon':'When you gain Guard from a card, it gains half (up to 8 a turn).',
 'Shard':'The Shard holder takes half damage and hits 4 harder. Hurt it badly, or kill the next holder, and the pass fails.',
 'Pelt':'Many small hits. The last one makes you Brittle.',
});
registerKeywords(kw);
