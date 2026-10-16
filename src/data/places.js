// data/places.js: the one lookup table for act, band and lair display names (design/world-structure/FINAL.md; Act 2/3: studio/design/ACT2-DESIGN.md, ACT3-DESIGN.md).
// Display text only: ids (a1_shore, bell, a2_harbour, colossus, ...) never change.
export const ACT_NAMES={1:{n:'The Wrack Terraces',sub:'The foot of the Drowned Stair'},2:{n:'The Brine Bastion',sub:'The garrison that held'},3:{n:'The Galecrown',sub:'The sea held above'}};
export const A1_BANDS=[{floors:[1,5],n:'Shoreline Steps'},{floors:[6,10],n:'Kelp Colonnade'},{floors:[11,14],n:'Bellwater Court'}];
export const A1_LAIRS={bell:'Bell Gate Belfry',matriarch:'Matriarch\'s Cistern',tenant:'The Sunken Row'};
export const A2_BANDS=[{floors:[1,5],n:'The Drowned Quay'},{floors:[6,10],n:'The Gun Galleries'},{floors:[11,15],n:'The Sluice Ramparts'}];
export const A2_LAIRS={colossus:'The Sluice Gate',wreckqueen:'The Wreck Basin',battery:'The Gun Floor'};
export const A3_BANDS=[{floors:[1,5],n:'The Windward Cliffs'},{floors:[6,10],n:'The Glass Spires'},{floors:[11,15],n:'The Galecrown Terraces'}];
export const A3_LAIRS={engine:'The Engine Hall',thalassa:'The Upturned Sea',navigator:'The Navigator\'s Wake'};
export const BANDS={1:A1_BANDS,2:A2_BANDS,3:A3_BANDS},LAIRS={1:A1_LAIRS,2:A2_LAIRS,3:A3_LAIRS};
export const BOSS_FLOOR={1:15,2:16,3:16};
export const MAP_LINE='The great flight is broken. Every road up is a gamble.';
export const MAP_LINES={1:MAP_LINE,2:'Two gates still hold the road. Every ward has its price.',3:'No walls up here. Read the sky: the Eye is the only calm.'};
export const actName=act=>(ACT_NAMES[act]||ACT_NAMES[1]).n;
// Where a floor is. The boss floor (15 in Act 1, 16 in Acts 2 and 3) is the boss's lair. `act` defaults to 1 (old callers).
export function placeName(floor,boss,act=1){const bands=BANDS[act]||A1_BANDS,lairs=LAIRS[act]||A1_LAIRS;if(floor>=(BOSS_FLOOR[act]||15)&&lairs[boss])return lairs[boss];const b=bands.find(b=>floor>=b.floors[0]&&floor<=b.floors[1]);return b?b.n:bands[0].n}
export const deathLine=(floor,boss,act=1)=>`${act===3?'The storm':'The tide'} took you on the ${placeName(floor,boss,act).replace(/^The /,'')}.`;
