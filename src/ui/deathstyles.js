// ui/deathstyles.js — how each Act 1 foe dies (Task 41). Pure data, no DOM, so node tests can check coverage.
//   dissolve  drowned / undead: collapse and dissolve into dark water, brine mist and salt flakes
//   sink      creatures: topple over and sink with bubbles and a splash
//   gutter    wisps / spirits: a flare, then embers and smoke, like a snuffed lantern
//   boss      long death: slow-motion, shake, flash, big disintegrate (variant sets the tint and the sound)
// ms are design ms (animation code scales them with T()), kept inside 0.8-1.4 s at Normal speed (x1.2 battle scale).
export const DEATH_STYLES={
 dissolve:{ms:880,sound:'deathDissolve'},
 sink:{ms:920,sound:'deathSink'},
 gutter:{ms:800,sound:'deathGutter'},
 boss:{ms:2100,sound:'deathBoss'}};
export const ENEMY_DEATH={
 knight:'dissolve',penitent:'dissolve',mender:'dissolve',novice:'dissolve',captain:'dissolve',
 slug:'sink',gull:'sink',pod:'sink',crab:'sink',leech:'sink',lurker:'sink',tendril:'sink',heap:'sink',limpet:'sink',eel:'sink',
 wisp:'gutter',warden:'gutter',
 bell:'boss',matriarch:'boss',tenant:'boss'};
// boss flavour: bell drops and tolls, the Matriarch withers into kelp spores, the Tenant dissolves into black water
export const BOSS_VARIANT={bell:'bell',matriarch:'kelp',tenant:'water'};
export const BOSS_SOUND={bell:'deathBell',kelp:'deathBoss',water:'deathBoss'};
export function deathStyleOf(e){const k=e&&e.key;const s=ENEMY_DEATH[k];if(s)return s;return e&&e.boss?'boss':e&&e.elite?'dissolve':'sink'}
export function deathSoundOf(e){const s=deathStyleOf(e);if(s==='boss')return BOSS_SOUND[BOSS_VARIANT[e.key]]||'deathBoss';return DEATH_STYLES[s].sound}
// the finale after the last foe: a beat, a light sweep, the lantern moment, then the banner (design ms)
export const FINALE={beat:90,sweep:520,total:620,bossTotal:520};
