// ui/kwmatch.js: the one keyword matcher. Every glossary (data/keywords.js) term, its plurals/verb forms and a few
// irregular forms (Sunk → Sink). Capitalised forms always match; lowercase forms match only for words that have no
// everyday meaning in game text (LOWER_OK), so narrative "the tide", "half-sunk" or "with a flourish" stay plain.
const IRREGULAR={Sunk:'Sink'};
const LOWER_OK=new Set(['Drift','Tideturn','Waypoint','Momentum']); // lowercase forms that only ever mean the mechanic
export const clean=k=>k.replace(/\s+X$/,'');
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function buildMatcher(KW,EXTRA={}){const names=new Map();
 for(const [k,v] of Object.entries(KW)){if(/[()]/.test(k)||typeof v!=='string')continue;const n=clean(k);if(n.length>=3)names.set(n,v)}
 for(const [k,v] of Object.entries(EXTRA))if(v)names.set(k,v);
 const lookup=new Map();
 for(const n of names.keys()){lookup.set(n,n);if(LOWER_OK.has(n))lookup.set(n.toLowerCase(),n)}
 for(const [f,n] of Object.entries(IRREGULAR))if(names.has(n)){lookup.set(f,n);if(LOWER_OK.has(n))lookup.set(f.toLowerCase(),n)}
 const list=[...lookup.keys()].sort((a,b)=>b.length-a.length).map(esc);
 const re=new RegExp('\\b('+list.join('|')+')(?:s|es|ed|d|ing)?\\b','g');
 // canon(m) maps a regex match back to its glossary term.
 const canon=m=>lookup.get(m[1]);
 return {names,re,canon,lowerOk:LOWER_OK}}
