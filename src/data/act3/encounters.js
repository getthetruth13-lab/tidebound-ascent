// data/act3/encounters.js: Act 3 encounter pools (studio/design/ACT3-DESIGN.md section 4). 38 entries: easy 4, hard 28, elite 3, boss 3.
// `fl` = floors the fight may appear on. Rules: first 3 fights of the act use `easy`; no repeat within 2; the Eye row (floor 8) has no fight;
// at most one tax family per encounter (Charge enemies may combine, cap 2; Gust may pair with Gust; Cloud Dive cap 1); never an automaton with the eyegale
// (tests/act3/encounter-tables.cjs).
import {registerEncounters} from '../../core/registry.js';
registerEncounters({
 easy:[{e:['jelly'],w:2},{e:['skua'],w:2},{e:['slinger'],w:2},{e:['galereader','petrel'],w:1}],
 hard:[{e:['polyp'],w:2,fl:[2,14]},{e:['voltray'],w:2,fl:[3,14]},{e:['skua','skua'],w:2,fl:[2,14]},{e:['petrel','petrel'],w:2,fl:[3,14]},{e:['automaton'],w:2,fl:[3,14]},
  {e:['cloudshark'],w:2,fl:[4,14]},{e:['anchorite'],w:2,fl:[3,14]},{e:['lenswright'],w:2,fl:[4,14]},{e:['slinger','slinger'],w:2,fl:[2,14]},{e:['jelly','jelly'],w:1,fl:[3,14]},
  {e:['skua','slinger'],w:1,fl:[3,14]},{e:['polyp','slinger'],w:1,fl:[4,14]},{e:['jelly','polyp'],w:1,fl:[6,14]},{e:['polyp','polyp'],w:1,fl:[6,14]},{e:['skua','petrel'],w:1,fl:[6,14]},
  {e:['automaton','slinger'],w:1,fl:[6,14]},{e:['automaton','galereader'],w:1,fl:[6,14]},{e:['cloudserpent'],w:2,fl:[6,14]},{e:['cloudserpent','slinger'],w:1,fl:[6,14]},
  {e:['anchorite','slinger'],w:1,fl:[6,14]},{e:['anchorite','galereader'],w:1,fl:[6,14]},{e:['lenswright','galereader'],w:1,fl:[6,14]},
  {e:['voltray','voltray'],w:1,fl:[11,14]},{e:['skua','petrel','galereader'],w:1,fl:[11,14]},{e:['slinger','slinger','galereader'],w:1,fl:[11,14]},
  {e:['anchorite','slinger','slinger'],w:1,fl:[11,14]},{e:['lenswright','slinger','galereader'],w:1,fl:[11,14]},{e:['cloudshark','galereader','slinger'],w:1,fl:[11,14]}],
 elite:[{e:['magus'],w:1,fl:[4,14]},{e:['squallwest','squalleast'],w:1,fl:[6,14]},{e:['eyegale'],w:1,fl:[7,14]}],
 boss:[{e:['engine'],w:1},{e:['thalassa'],w:1},{e:['navigator'],w:1}]
},3);
