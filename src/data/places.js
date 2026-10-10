// data/places.js: the one lookup table for act, band and lair display names (design/world-structure/FINAL.md).
// Display text only: ids (a1_shore, bell, ...) never change.
export const ACT_NAMES={1:{n:'The Wrack Terraces',sub:'The foot of the Drowned Stair'}};
export const A1_BANDS=[{floors:[1,5],n:'Shoreline Steps'},{floors:[6,10],n:'Kelp Colonnade'},{floors:[11,14],n:'Bellwater Court'}];
export const A1_LAIRS={bell:'Bell Gate Belfry',matriarch:'Matriarch\'s Cistern'};
export const MAP_LINE='The great flight is broken. Every road up is a gamble.';
export const actName=act=>(ACT_NAMES[act]||ACT_NAMES[1]).n;
// Where a floor is (Act 1 only for now). Floor 15 is the boss's lair.
export function placeName(floor,boss){if(floor>=15&&A1_LAIRS[boss])return A1_LAIRS[boss];const b=A1_BANDS.find(b=>floor>=b.floors[0]&&floor<=b.floors[1]);return b?b.n:A1_BANDS[0].n}
export const deathLine=(floor,boss)=>`The tide took you on the ${placeName(floor,boss)}.`;
