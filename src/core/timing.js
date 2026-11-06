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
 // classic has no strike lead: the move resolves right after the telegraph, like before (impact = the old 110 ms into the lunge).
 classic:{pause:240,tele:214,teleHold:51,strike:317,hit:304,gap:223,lead:0,hitstop:0,recover:317,hitGap:95,impact:94},
 // v0.6.13 enemy-attack beats (Spencer: "enemy turns happen too quickly, they need to feel more impactful"). Per enemy action:
 //   tele+teleHold  anticipation (wind-up)  ->  lead  lunge/cast up to the contact frame  ->  [state changes HERE: HP, block, buffs]
 //   hitstop  the contact frame is held  ->  recover  settle back  ->  gap  short pause before the next enemy.
 //   hitGap   spacing of the extra blows of a multi-hit move.   (design ms; T() adds 1.4x, Options speed on top)
 measured:{pause:480,tele:340,teleHold:86,strike:446,hit:446,gap:300,lead:150,hitstop:55,recover:280,hitGap:130,impact:0}};
// Weight classes: elites and bosses wind up longer, hit harder and shake the screen more. Non-damage moves (block, buff, debuff, summon...) get shorter beats.
export const BEAT_WEIGHT={
 normal:{tele:1,lead:1,hitstop:1,recover:1,gap:1,shake:1},
 elite:{tele:1.2,lead:1.25,hitstop:1.2,recover:1.2,gap:1.1,shake:1.3},
 boss:{tele:1.4,lead:1.5,hitstop:1.3,recover:1.35,gap:1.2,shake:1.6}};
const SOFT={tele:.6,lead:.6,hitstop:0,recover:.55,gap:.7};
export const weightOf=e=>e&&e.boss?'boss':e&&e.elite?'elite':'normal';
// Resolved beats for one enemy action (design ms). m = the intent (m.a = damaging). pace defaults to the current setting ('classic' when FAST).
export function beatsFor(e,m,paceName){const B=ENEMY_BEATS[paceName||pace]||ENEMY_BEATS.measured,w=weightOf(e),W=BEAT_WEIGHT[paceName==='classic'||B===ENEMY_BEATS.classic?'normal':w],dmg=!!(m&&m.a);
 const f=k=>B[k]*W[k]*(dmg?1:SOFT[k]??1);
 return {w:paceName==='classic'||B===ENEMY_BEATS.classic?'normal':w,dmg,hits:dmg?(m.h||1):0,tele:f('tele'),teleHold:B.teleHold*(dmg?1:.5),lead:f('lead'),hitstop:f('hitstop'),recover:f('recover'),gap:f('gap'),hitGap:B.hitGap,impact:B.impact,shake:W.shake,strike:B.strike,hit:B.hit}}
let pace='measured';
export const enemyPace=()=>pace;
export function setEnemyPace(v){pace=ENEMY_BEATS[v]?v:'measured'}   // 'classic' is the fast-mode toggle: restores the old speed
export const EB=()=>ENEMY_BEATS[pace];
// Player hits get a little weight: hit-stop on the foe is this much longer (does not delay input).
export const HIT_WEIGHT=1.25;
