// data/encounters.js — Act 1 encounter pools with weights (design-v2 §1.7). The first 3 fights each act use the easy pool;
// the same encounter can't repeat within 2 fights. Boss pool: one of the three is chosen per run (shown on the map).
import {registerEncounters} from '../core/registry.js';
// Lore F06: gulls will not fly above Bellwater Court, so every gull fight is capped at floor 10 (fl:[1,10]); tests/gull-bellcourt.cjs guards it.
registerEncounters({
 easy:[{e:['slug'],w:2},{e:['gull','gull'],w:2,fl:[1,10]},{e:['wisp'],w:2},{e:['leech'],w:1}],
 hard:[{e:['knight'],w:2},{e:['crab','slug'],w:2},{e:['pod','pod','pod'],w:1},{e:['wisp','gull'],w:2,fl:[1,10]},{e:['crab','crab'],w:1},{e:['lurker'],w:2},{e:['lurker','leech'],w:1},{e:['leech','slug'],w:1,fl:[4,14]},{e:['slug','wisp'],w:1},{e:['crab','leech'],w:1},
  // Task 20 additions; fl:[min,max] = floors the fight may appear on. Allies come first so the Mender's Stitch can lock a target on spawn.
  {e:['penitent'],w:2,fl:[3,14]},{e:['penitent','slug'],w:1,fl:[3,10]},{e:['heap'],w:2,fl:[2,10]},{e:['slug','heap'],w:1,fl:[4,10]},
  {e:['knight','mender'],w:1,fl:[6,14]},{e:['lurker','mender'],w:1,fl:[6,14]},{e:['wisp','mender'],w:1,fl:[6,14]},
  {e:['novice'],w:1,fl:[11,14]},{e:['crab','novice'],w:1,fl:[11,14]},{e:['leech','novice'],w:1,fl:[11,14]}],
 elite:[{e:['captain'],w:1},{e:['warden'],w:1},{e:['eel','eel'],w:1}],
 boss:[{e:['bell'],w:1},{e:['matriarch'],w:1},{e:['tenant'],w:1}]
});
