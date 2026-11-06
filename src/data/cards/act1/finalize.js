// data/cards/act1/finalize.js — runs after every card module (imported last by data/index.js).
// 1. Any id of the new Act 1 pool with no behaviour yet gets a visible STUB (does nothing, shows "not built yet"), so starters
//    and saves never crash while the heroes are being built. tests/cards-act1/foundation.cjs lists the stubs.
// 2. Every hero card NOT in the new pool is marked cut:true (rule 7: stays loadable for saves, never offered). Cut colourless too.
import {CARDS} from '../../../core/registry.js';
import {META,ACT1_IDS,card} from '../loader.js';
import {CUT_COLORLESS} from '../../generated/act1-pool.js';
for(const id of ACT1_IDS)if(!CARDS[id]){const m=META[id];card(m.cls,id,{e:'🚧',stub:1,p:f=>{}})}
export const CUT_IDS=new Set();
for(const [id,c] of Object.entries(CARDS)){if((['tide','echo','carto','duel'].includes(c.cls)&&!ACT1_IDS.has(id))||CUT_COLORLESS.includes(id)){c.cut=1;CUT_IDS.add(id)}}
// A card may be offered (reward / shop / random generators / Lamp) only if this is true.
export const offerable=c=>!!c&&!c.cut&&!c.stub;
