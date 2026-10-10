// core/state.js
// Shared mutable game state. Modules read/write W.S (screen state), W.run (current run), W.cb (current combat).
export const W={S:{screen:'title'},run:null,cb:null,uid:1};
export function nextId(){return W.uid++}
// ---------- seeded RNG (design-v2 §1.9.1) ----------
// mulberry32 streams, one per system, so choices in one system never change outcomes in another.
// Stream states live in W.run.rngs (plain uint32s), so they save/restore with the run.
export const STREAMS=['map','cards','relics','potions','events','combat','shop','misc'];
export function hash32(s){let h=0x811c9dc5;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h>>>0} // FNV-1a
export function seedStreams(seed){const o={};for(const s of STREAMS)o[s]=hash32(seed+'|'+s);return o}
export function rnd(stream='combat'){const r=W.run&&W.run.rngs;if(!r)return Math.random();if(r[stream]==null)r[stream]=hash32((W.run.seed||0)+'|'+stream);
 let a=r[stream]=(r[stream]+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}
export const R=(n,s)=>Math.floor(rnd(s)*n), pick=(a,s)=>a[R(a.length,s)], rng=(a,b,s)=>a+R(b-a+1,s);
export function shuffle(a,s){for(let i=a.length-1;i>0;i--){const j=R(i+1,s);[a[i],a[j]]=[a[j],a[i]]}return a}
// weighted pick: list of [value, weight]
export function wpick(list,s){const tot=list.reduce((a,x)=>a+x[1],0);let x=rnd(s)*tot;for(const [v,w] of list){if((x-=w)<0)return v}return list[list.length-1][0]}
