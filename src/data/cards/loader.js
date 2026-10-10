// data/cards/loader.js — registers a card by merging its BEHAVIOUR (written here, in code) with its DATA
// (name, cost, type, rarity, flavour, archetypes, upgrade cost) imported from design/data-v2.json (see tools/gen-data-v2.py).
// Card text: class cards carry a {base|upgraded} template `d` whose base form must equal data-v2's effect text
// (checked by tests/phase1.js); curses and statuses use the data text as-is.
import {C} from '../../core/registry.js';
import {DATA} from '../generated/data-v2.js';
export const META={};
for(const [cls,list] of Object.entries(DATA.cards))for(const c of list)META[c.id]={...c,cls};
for(const c of DATA.colorless)META[c.id]={...c,cls:'colorless'};
for(const c of DATA.curses)META[c.id]={...c,cls:'curse',type:'C',rarity:'S',cost:'-'};
for(const c of DATA.statuses)META[c.id]={...c,cls:'status',type:'T',rarity:'S'};
export const RAR={B:'s',C:'c',U:'u',R:'r',S:'x'};
export function card(cls,id,b){const m=META[id];if(!m)throw new Error('No data-v2 entry for card '+id);
 const o=Object.assign({n:m.name,t:m.type,r:RAR[m.rarity]||'c',flavour:m.flavour,arch:m.arch||[],text:m.effect,upText:m.upgrade},b);
 o.c=m.cost==='X'?'X':m.cost==='-'?0:+m.cost;
 if(o.cu==null){const k=/\bcost (\d)\b/i.exec(m.upgrade||'');if(k)o.cu=+k[1]}
 if(o.power){o.on=Object.assign({},o.on,o.power.on);o.mod=Object.assign({},o.mod,o.power.mod);delete o.power}
 if(!o.d)o.d=m.effect;if(/\bFaint\./.test(m.effect))o.faint=1;
 if(/\bUnplayable\b/.test(m.effect))o.unplay=1;if(/\bFleeting\b/.test(m.effect))o.fleet=1;if(/^Sink\.|\bSink\.$|\. Sink\./.test(m.effect)&&o.x==null)o.x=1;
 return C(cls,id,o)}
