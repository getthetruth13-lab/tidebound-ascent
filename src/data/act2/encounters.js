// data/act2/encounters.js: Act 2 encounter pools (studio/design/ACT2-DESIGN.md section 4). 36 entries: easy 4, hard 26, elite 3, boss 3.
// `fl` = floors the fight may appear on. Rules: first 3 fights of the act use `easy`; no repeat within 2; Gate rows (5, 10) have no fight;
// never two [TAX] enemies (bellnun, bosun, grell) in one encounter; at most one mortar per encounter (tests/act2/encounter-tables.cjs).
import {registerEncounters} from '../../core/registry.js';
registerEncounters({
 easy:[{e:['lice','lice','lice'],w:2},{e:['hgunner'],w:2},{e:['pumper'],w:2},{e:['lamplighter','lice'],w:1}],
 hard:[{e:['shellguard'],w:2},{e:['kettleman'],w:2},{e:['diver'],w:2,fl:[3,14]},{e:['salthusk'],w:2,fl:[2,14]},{e:['sluiceeng'],w:2,fl:[3,14]},{e:['mortar'],w:2,fl:[6,14]},
  {e:['shellguard','hgunner'],w:2,fl:[3,14]},{e:['hgunner','hgunner'],w:1,fl:[3,14]},{e:['salthusk','lice','lice'],w:1,fl:[3,14]},
  {e:['diver','lamplighter'],w:1,fl:[6,14]},{e:['kettleman','salthusk'],w:1,fl:[6,14]},{e:['bellnun'],w:1,fl:[6,14]},{e:['bellnun','lice','lice'],w:1,fl:[6,14]},{e:['bellnun','hgunner'],w:1,fl:[6,14]},
  {e:['bosun'],w:1,fl:[4,14]},{e:['bosun','shellguard'],w:1,fl:[6,14]},{e:['bosun','lamplighter'],w:1,fl:[6,14]},
  {e:['pumper','diver'],w:1,fl:[6,14]},{e:['pumper','salthusk'],w:1,fl:[6,14]},{e:['sluiceeng','lamplighter'],w:1,fl:[6,14]},{e:['shellguard','shellguard'],w:1,fl:[6,14]},
  {e:['mortar','shellguard'],w:1,fl:[11,14]},{e:['mortar','lice','lice'],w:1,fl:[11,14]},{e:['diver','kettleman'],w:1,fl:[11,14]},{e:['lamplighter','kettleman','lice'],w:1,fl:[11,14]},{e:['sluiceeng','bosun'],w:1,fl:[11,14]}],
 elite:[{e:['hauler'],w:1,fl:[4,14]},{e:['grell'],w:1,fl:[6,14]},{e:['cantor','chorister','basso'],w:1,fl:[7,14]}],
 boss:[{e:['colossus'],w:1},{e:['wreckqueen'],w:1},{e:['battery'],w:1}]
},2);
