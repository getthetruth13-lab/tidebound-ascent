// data/encounters.js — Act 1 encounter pools with weights (design-v2 §1.7). The first 3 fights each act use the easy pool;
// the same encounter can't repeat within 2 fights. Boss pool: one of the two is chosen per run (shown on the map).
import {registerEncounters} from '../core/registry.js';
registerEncounters({
 easy:[{e:['slug'],w:2},{e:['gull','gull'],w:2},{e:['wisp'],w:2},{e:['leech'],w:1}],
 hard:[{e:['knight'],w:2},{e:['crab','slug'],w:2},{e:['pod','pod','pod'],w:1},{e:['wisp','gull'],w:2},{e:['crab','crab'],w:1},{e:['lurker'],w:2},{e:['lurker','leech'],w:1},{e:['leech','slug','slug'],w:1}],
 elite:[{e:['captain'],w:1},{e:['warden'],w:1},{e:['eel','eel'],w:1}],
 boss:[{e:['bell'],w:1},{e:['matriarch'],w:1}]
});
