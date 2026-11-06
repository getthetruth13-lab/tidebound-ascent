// data/act2.js: the Act 2 + Act 3 card sets (mirror of act1.js; one file for both later acts, D-A2 plumbing). Pure data.
// A card with act N can roll only when run.act >= N (acts decide when an owned card may appear; they never lock anything).
import {ACT23_POOL} from './generated/act2-pool.js';
import {ACT1_SET} from './act1.js';
const HEROES=['tide','echo','carto','duel'];
const byAct=(act,keys)=>keys.flatMap(k=>ACT23_POOL[k].filter(c=>c.act===act).map(c=>c.id));
export const ACT2_CARDS=Object.fromEntries(HEROES.map(k=>[k,byAct(2,[k])]));
export const ACT3_CARDS=Object.fromEntries(HEROES.map(k=>[k,byAct(3,[k])]));
export const ACT2_ARTIFACTS=byAct(2,['artifact']),ACT3_ARTIFACTS=byAct(3,['artifact']);
export const ACT2_SET=new Set([...Object.values(ACT2_CARDS).flat(),...ACT2_ARTIFACTS]);
export const ACT3_SET=new Set([...Object.values(ACT3_CARDS).flat(),...ACT3_ARTIFACTS]);
export const ACT_SETS={1:ACT1_SET,2:ACT2_SET,3:ACT3_SET};
export const ACT23_IDS=new Set([...ACT2_SET,...ACT3_SET]);
// 0 = a card in no act set (colourless, curses, statuses: free in any act after Act 1 like before).
export const cardAct=id=>ACT1_SET.has(id)?1:ACT2_SET.has(id)?2:ACT3_SET.has(id)?3:0;
// lampGate per id: open | lamp | spoil (D-A2-12). spoilFrom: the boss/elite id whose reward offers the Spoil card.
export const GATE=Object.fromEntries(Object.entries(ACT23_POOL).flatMap(([k,l])=>l.map(c=>[c.id,{lampGate:c.lampGate||'open',spoilFrom:c.spoilFrom||null,hero:k==='artifact'?null:k}])));
