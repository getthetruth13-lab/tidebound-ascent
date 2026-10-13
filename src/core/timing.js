// core/timing.js — ONE place to tune animation speed. Pure (no DOM/engine imports) so engine code can use it in node tests.
//   BATTLE_SCALE   every combat animation/timer is this much slower than the original tuning (task 34: +20 %; v0.6.2: +40 %).
//   SPEEDS         the Options "Animation speed" multiplier on top of that. Normal = 1.
//   T(ms)          a combat duration in ms.   U(ms)  a non-combat UI duration (screens, popups) — only the Options speed applies.
// CSS reads the same numbers through --ts / --us on <html> (see applyTiming()).
export const BATTLE_SCALE=1.4;   // v0.6.2 (Spencer: battles slower, every beat easy to follow): was 1.2. Enemy-turn beats on top come from task 67.
export const SPEEDS={slow:1.35,normal:1,fast:.7};
export const SPEED_LABEL={slow:'Slow',normal:'Normal',fast:'Fast'};
let speed='normal';
export const animSpeed=()=>speed;
export function setAnimSpeedValue(v){speed=SPEEDS[v]?v:'normal';applyTiming()}
export const T=ms=>ms*BATTLE_SCALE*SPEEDS[speed];
export const U=ms=>ms*SPEEDS[speed];
export function applyTiming(){if(typeof document==='undefined'||!document.documentElement)return;
 const s=document.documentElement.style;s.setProperty('--ts',String(+(BATTLE_SCALE*SPEEDS[speed]).toFixed(3)));s.setProperty('--us',String(SPEEDS[speed]))}
