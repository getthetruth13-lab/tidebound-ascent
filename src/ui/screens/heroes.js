// ui/screens/heroes.js: presentation text for the four Lampbearers (character select, Learn to Play).
// Voice and facts follow design-v2 "WORLD LORE & VOICE" (L.1 premise, L.2 why you climb). Mechanic numbers come from CLASSES[k].rule.
export const SPRITE_OF={tide:'tidecaller',echo:'echo-mage',carto:'cartographer',duel:'duelist'};
export const ORDER=['tide','echo','carto','duel'];
export const HEROES={
 tide:{epithet:'Moon-Sworn Keeper of the Tides',
  blurb:'A patient caster who bends the sea itself: raise it, lower it, and let it break over every foe.',
  lore:['The sea once answered every word the keepers spoke. Then the sun sank, and the water forgot its manners.',
   'You kept the moon-tables at Saltmere until the lowest tide in a generation bared the Ebb Stair, a mountain-city of landings.',
   'The moonshell at your belt still hums in time with the waves.',
   'You climb to make the sea answer to you again.'],
  plain:'A tide meter runs from 0 to 10. From your second turn it drifts after you draw. Surge and Recede cards push it. Reach 10 for a Crest that hits every enemy; reach 0 for an Undertow that gives Guard and a card.',
  tips:['Check the arrow: the Tide drifts that way next turn.','Many cards get bonuses at High or Low Tide. Pick a side.']},
 echo:{epithet:'Hearer of the Last Note',
  blurb:'A combo caster whose best card of the turn sings a second time, stronger when another card follows it.',
  lore:['Forty leagues inland, a single bronze note rolled across the barley and would not fade.',
   'Every other listener called it wind. You called it a summons.',
   'You have followed the echo ever since, and it grows louder with every step toward the sea.',
   'Strike a note and the world strikes it back, a little stronger.'],
  plain:'Once per turn, tap the bell to Mark a non-Faint Attack or Skill before playing it. At the end of your turn it repeats for free, with a damage and Guard bonus capped at +1 after another card. Resound text only happens on the Echo.',
  tips:['Mark a strong card early, then play another for +1.','No Mark? Your last card still Echoes at quarter strength.']},
 carto:{epithet:'Charter of the Unmapped Coast',
  blurb:'A planner who sees the whole deck, lays Waypoints that work every turn, and burns the road behind them.',
  lore:['Every chart of this coast ends at the same blank margin.',
   'You mean to ink what lies beyond it, and sell the only copy to the highest bidder.',
   'Your road is drawn in advance and walked in blood. If it burns behind you, so much the better.',
   'Maps do not forgive, but they do remember.'],
  plain:'Your draw pile is face up, so you always know what comes next. You draw four cards per turn. Waypoints sit in three slots and trigger at the start of your turn. Once per turn, Advance one to raise its Rank; Rank 3 is a Landmark.',
  tips:['Fill slots early. Waypoints first trigger next turn.','Expedition grows per Waypoint. Landmarks count twice.']},
 duel:{epithet:'Oathblade of the Last Keeper',
  blurb:'A tempo fighter who builds Momentum with every strike, cashes it in with a Flourish, and bleeds the survivors.',
  lore:['The Last Keeper\'s blade came down to your order with a single oath: Light it.',
   'She never finished the sentence. Her order never asked how it ended.',
   'You have not lost a duel since. You have lost much else.',
   'Every foe is a lesson in tempo, and every parry a promise kept.'],
  plain:'Attacks build Momentum, which carries between turns and fades by 1 at the end of your turn. With enough, tap the glowing blade to Flourish: spend it all for a much bigger hit. Parry reduces the first blow and reflects half the Parry.',
  tips:['Flourish: ×2 at 2 Momentum, up to ×3.5 at 5.','Bleed first. It ignores Guard and drops 1 per Attack.']}};
// Character select v2 lore window (CHARSEL-IDEAS idea 8). Spoiler-safe: S0/S1 only per design/lore/LORE-BIBLE.md (no later-act hints).
// tags: three "how it plays" icons, one word each. Icon ids map to inline SVGs in select.js (CS_ICON).
export const CHARSEL={
 tide:{lore:['The sea once answered every word the keepers spoke. Then the sun sank, and the water forgot its manners.','You climb to make the sea answer to you again.'],tags:[['wave','Tide'],['crest','Crest'],['shell','Undertow']]},
 echo:{lore:['Forty leagues inland, a single bronze note rolled across the barley and would not fade.','Strike a note and the world strikes it back, a little stronger.'],tags:[['bell','Mark'],['ring','Echo'],['chain','Combo']]},
 carto:{lore:['Every chart of this coast ends at the same blank margin.','Your road is drawn in advance and walked in blood.'],tags:[['eye','Foresight'],['cairn','Waypoints'],['road','Advance']]},
 duel:{lore:['The Last Keeper\'s blade came down to your order with a single oath: Light it.','Every foe is a lesson in tempo, and every parry a promise kept.'],tags:[['blade','Momentum'],['star','Flourish'],['drop','Bleed']]}};
