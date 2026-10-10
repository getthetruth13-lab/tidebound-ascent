// engine/effects.js
// Effect-op handlers. A card can describe its effect as data: fx:[['dmg',6,9],['surge',1]]
// meaning "deal 6 (9 upgraded), then Surge 1". Args: [base, upgraded?, hits?]. Cards needing custom
// logic use p:f=>{...} instead. Add new ops with registerEffect(id,(f,args)=>...).
import {EFFECTS,registerEffect} from '../core/registry.js';
const val=(f,a,b)=>f.v(a,b==null?a:b);
registerEffect('dmg',(f,[a,b,h])=>f.dmg(val(f,a,b),h||1));
registerEffect('all',(f,[a,b,h])=>f.all(val(f,a,b),h||1));
registerEffect('block',(f,[a,b])=>f.blk(val(f,a,b)));
registerEffect('parry',(f,[a,b])=>f.parry(val(f,a,b)));
registerEffect('draw',(f,[a,b])=>f.draw(val(f,a,b)));
registerEffect('surge',(f,[a,b])=>f.surge(val(f,a,b)));
registerEffect('recede',(f,[a,b])=>f.recede(val(f,a,b)));
registerEffect('weak',(f,[a,b])=>f.weak(val(f,a,b)));
registerEffect('vuln',(f,[a,b])=>f.vuln(val(f,a,b)));
registerEffect('mom',(f,[a,b])=>f.mom(val(f,a,b)));
export function runCard(d,f){if(d.p)return d.p(f);if(d.fx)for(const op of d.fx){const h=EFFECTS[op[0]];if(!h)throw new Error('Unknown effect op '+op[0]+' on '+d.id);h(f,op.slice(1))}}
