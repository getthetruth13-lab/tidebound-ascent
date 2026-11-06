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

// Enemy-turn beats (B-077, Task 67): ONE table, design ms (T() applies on top). 'classic' = the v0.6.0 values, 'measured' = about 2x.
// 'measured' was tuned at BATTLE_SCALE 1.2; on merge into v0.6.2 (BATTLE_SCALE 1.4) it is scaled by 1.2/1.4 so real-time beats stay the same.
// Only enemy beats and the gaps between them slow down; nothing the player does gets slower (FUN-REDESIGN 4.4).
export const ENEMY_BEATS={
 // v0.6.2.1: 'classic' gets the same 1.2/1.4 scale as 'measured', so Fast keeps v0.6.0 real-time speed and the 2x gap stays 2x.
 classic:{pause:240,tele:214,teleHold:51,strike:317,hit:304,gap:223},
 measured:{pause:480,tele:386,teleHold:86,strike:446,hit:446,gap:531}};
let pace='measured';
export const enemyPace=()=>pace;
export function setEnemyPace(v){pace=ENEMY_BEATS[v]?v:'measured'}   // 'classic' is the fast-mode toggle: restores the old speed
export const EB=()=>ENEMY_BEATS[pace];
// Player hits get a little weight: hit-stop on the foe is this much longer (does not delay input).
export const HIT_WEIGHT=1.25;
