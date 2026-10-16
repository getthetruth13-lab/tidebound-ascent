// data/cards/loader.js — registers a card by merging its BEHAVIOUR (written here, in code) with its DATA
// (name, cost, type, rarity, flavour, archetypes, upgrade cost) imported from design/data-v2.json (see tools/gen-data-v2.py).
// Card text: class cards carry a {base|upgraded} template `d` whose base form must equal data-v2's effect text
// (checked by tests/phase1.js); curses and statuses use the data text as-is.
import {C,CARDS} from '../../core/registry.js';
import {DATA} from '../generated/data-v2.js';
import {ACT1_POOL} from '../generated/act1-pool.js';
import {ACT23_POOL} from '../generated/act2-pool.js';
export const META={};
for(const [cls,list] of Object.entries(DATA.cards))for(const c of list)META[c.id]={...c,cls};
for(const c of DATA.colorless)META[c.id]={...c,cls:'colorless'};
for(const c of DATA.curses)META[c.id]={...c,cls:'curse',type:'C',rarity:'S',cost:'-'};
for(const c of DATA.statuses)META[c.id]={...c,cls:'status',type:'T',rarity:'S'};
// cards-act1: the NEW Act 1 pool (FULL-CARD-POOL.md) overrides the old data-v2 meta for its 145 hero cards and adds the 16 Artifacts.
// Old flavour/arch are kept when the doc has none. ACT1_IDS = every id in the new Act 1 pool (hero cards + Artifacts).
export const ACT1_IDS=new Set();
for(const [cls,list] of Object.entries(ACT1_POOL))for(const c of list){const o=META[c.id]||{};META[c.id]={...o,...c,flavour:c.flavour||o.flavour,arch:o.arch||[],cls,act1:true};ACT1_IDS.add(c.id)}
// Act 2 / Act 3 (task ACT2_BUILD): the later-act pool (155 hero cards + 22 Artifacts) overrides any older meta for the same id.
// ACT23_IDS = every later-act id; card() sets o.act (1 for Act 1 cards). Behaviour lives in cards/act2/<hero>.js; finalize.js stubs the rest.
export const ACT23_IDS=new Set();
for(const [cls,list] of Object.entries(ACT23_POOL))for(const c of list){const o=META[c.id]||{};META[c.id]={...o,...c,flavour:c.flavour||o.flavour,arch:o.arch||[],cls,act1:false};ACT23_IDS.add(c.id)}
export const RAR={B:'s',C:'c',U:'u',R:'r',S:'x'};
export function card(cls,id,b){const m=META[id];if(!m)throw new Error('No data-v2 entry for card '+id);
 const o=Object.assign({n:m.name,t:m.type,r:RAR[m.rarity]||'c',flavour:m.flavour,arch:m.arch||[],text:m.effect,upText:m.upgrade},b);
 o.c=m.cost==='X'?'X':m.cost==='-'?0:+m.cost;
 if(o.cu==null){const k=/\bcost (\d)\b/i.exec(m.upgrade||'');if(k)o.cu=+k[1]}
 if(o.power){o.on=Object.assign({},o.on,o.power.on);o.mod=Object.assign({},o.mod,o.power.mod);delete o.power}
 if(!o.d)o.d=m.effect;if(/\bFaint\./.test(m.effect))o.faint=1;
 if(/\bUnplayable\b/.test(m.effect))o.unplay=1;if(/\bFleeting\b/.test(m.effect))o.fleet=1;if(/^Sink\.|\bSink\.$|\. Sink\./.test(m.effect)&&o.x==null)o.x=1;
 o.act1=!!m.act1;o.act=m.act||1;if(ACT23_IDS.has(id))o.lg=m.lampGate;return C(cls,id,o)}
// redef: REPLACE an old registration with the new Act 1 version (same id, so saves keep loading). Use only for ids in ACT1_IDS.
export function redef(cls,id,b){if(!ACT1_IDS.has(id))throw new Error('redef: '+id+' is not in the new Act 1 pool');delete CARDS[id];return card(cls,id,b)}
// redef2: like redef but for ids in the later-act pool (the same id may exist as an older held card; replace it, saves keep loading).
export function redef2(cls,id,b){if(!ACT23_IDS.has(id))throw new Error('redef2: '+id+' is not in the Act 2/3 pool');delete CARDS[id];return card(cls,id,b)}
