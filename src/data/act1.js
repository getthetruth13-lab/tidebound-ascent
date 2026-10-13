// data/act1.js: the Act 1 card set (starters included). Act 1 card rewards and the merchant draw only from these ids.
// cards-act1: now derived from the NEW pool (src/data/generated/act1-pool.js, tools/act1/gen-act1-pool.py). The old
// tools/gen-act1.py output (design/act1-complete.md) is retired; cut cards stay registered (cut:true) but are not listed here.
import {ACT1_POOL} from './generated/act1-pool.js';
export const ACT1_CARDS=Object.fromEntries(['tide','echo','carto','duel'].map(k=>[k,ACT1_POOL[k].map(c=>c.id)]));
export const ACT1_SET=new Set(Object.values(ACT1_CARDS).flat());
export const ACT1_ARTIFACTS=ACT1_POOL.artifact.map(c=>c.id);
