// Single intent art map. Fill an empty ASSETS.ui slot to replace its bronze vector.
import {ASSETS,assetSrc} from '../assets.js';
export const INTENT_ICONS={
 attack:['intent-attack','M5 22L19 3l2-1-1 4L8 23z M3 15l8 6 M3 23l4-4'],
 guard:['intent-defend','M12 2L3 6v7c0 5 5 8 9 10 4-2 9-5 9-10V6z M12 5v15 M6 10h12'],
 buff:['intent-buff','M12 2l9 10h-6v10H9V12H3z'],
 debuff:['intent-debuff','M9 2h6v10h6L12 22 3 12h6z'],
 heal:['intent-heal','M12 21C-6 10 4-4 12 6c8-10 18 4 0 15z M9 12h6 M12 9v6'],
 summon:['intent-summon','M3 22V11a9 9 0 0118 0v11h-4V11a5 5 0 00-10 0v11z M9 17l3-4 3 4 M12 13v10'],
 unknown:['intent-unknown','M2 12s5-8 10-8 10 8 10 8-5 8-10 8S2 12 2 12z M12 8v8 M9 12h6'],
 status:['intent-status','M6 2h10l3 4v16H6z M16 2v5h3 M9 11h7 M9 15h7 M9 19h5'],
 steal:['intent-steal','M8 2h8l-2 5c13 14 7 16-2 16S-3 21 10 7z M8 7h8 M12 11v8 M9 13h5l-4 4h5'],
 ring:['intent-ring','M12 2C5 2 6 10 6 13l-3 5h18l-3-5c0-3 1-11-6-11z M9 21h6'],
 potion:['intent-potion','M9 2h6v7l5 8c4 8-20 8-16 0l5-8z M7 15h10 M8 3h8'],
 drain:['intent-drain','M13 2L4 14h7l-1 8 10-13h-7z'],
 // Act 2 (ACT2-RULES): crosshair, silenced bell, hook, hand, lantern, ledger, fuse
 aim:['intent-aim','M12 3a9 9 0 100 18 9 9 0 000-18z M12 1v6 M12 17v6 M1 12h6 M17 12h6 M12 10v4 M10 12h4'],
 muffle:['intent-muffle','M12 2c-5 0-6 6-6 9l-3 5h18l-3-5c0-3-1-9-6-9z M9 19h6 M4 4l16 16'],
 pull:['intent-pull','M12 2v12 M7 9l5 5 5-5 M5 18c0 4 14 4 14 0'],
 seize:['intent-seize','M6 21V9l2-1v6 M8 8V4l2-1v10 M10 4l2-1v10 M12 5l2-1v9l3-3 2 2-4 8z'],
 lure:['intent-lure','M9 2h6v3H9z M7 5h10l1 11H6z M5 16h14l-2 6H7z M12 8v5'],
 owe:['intent-owe','M5 2h12l2 3v17H5z M8 8h8 M8 12h8 M8 16h5 M17 14l3 3'],
 fuse:['intent-fuse','M8 22V10c0-5 8-5 8 0v12z M12 2c0 3-3 3-3 6 M12 2c0 3 3 3 3 6'],
 // Act 3 (ACT3-RULES): bolt, feather, frost gear, cloud dive, tide ledger, veil, streamer, chain link, shard
 charge:['intent-charge','M13 2L5 13h6l-2 9 9-12h-6z M2 6h3 M19 18h3'],
 gust:['intent-gust','M3 8h11a3 3 0 10-3-3 M3 13h16a3 3 0 11-3 3 M3 18h7'],
 numb:['intent-numb','M12 2v20 M3 7l18 10 M21 7L3 17 M9 4l3 3 3-3 M9 20l3-3 3 3'],
 dive:['intent-dive','M2 14c3-4 6 4 10 0s7 4 10 0 M12 3v10 M8 9l4 4 4-4'],
 tide:['intent-tide','M4 3h14a2 2 0 012 2v16H6a2 2 0 01-2-2z M8 9h8 M8 13c2-3 4 3 8 0'],
 veil:['intent-veil','M2 12s5-8 10-8 10 8 10 8-5 8-10 8S2 12 2 12z M4 6c4 3 12 3 16 0 M4 18c4-3 12-3 16 0'],
 tail:['intent-tail','M2 12h14 M11 6l6 6-6 6 M4 7h8 M4 17h8'],
 siphon:['intent-siphon','M7 4a4 4 0 100 8h4 M17 20a4 4 0 100-8h-4 M9 12h6'],
 pass:['intent-pass','M12 2l8 7-8 13L4 9z M4 9h16 M12 2v20'],
 orb:['intent-orb','M12 3a8 8 0 100 16 8 8 0 000-16z M9 8l-2 3 M15 14l2-3 M12 21v2'],
 link:['intent-link','M9 8a4 4 0 100 8h2 M15 16a4 4 0 100-8h-2 M9 12h6'],
 water:['intent-water','M12 2C6 10 5 13 5 16a7 7 0 0014 0c0-3-1-6-7-14z M9 16a3 3 0 003 3']
};
for(const [slot] of Object.values(INTENT_ICONS))if(!(slot in ASSETS.ui))ASSETS.ui[slot]=null;
export function intentIcon(k,img,tag){const [slot,path]=INTENT_ICONS[k]||INTENT_ICONS.unknown;
 const metal='intent-metal-'+k;const svg=`<svg class="intent-svg" viewBox="0 0 24 26" aria-hidden="true"><defs><linearGradient id="${metal}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff0bb"/><stop offset=".3" stop-color="#bd9855"/><stop offset=".55" stop-color="#63431f"/><stop offset=".8" stop-color="#bd9855"/><stop offset="1" stop-color="#48301a"/></linearGradient></defs><path d="${path}" fill="url(#${metal})" stroke="#edcc8d" stroke-width="1.25" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#392719" stroke-width=".35" transform="translate(.5 .5)"/></svg>`;
 const src=img||assetSrc('ui',slot);return `<i class="intent-art" data-icon="${tag||k}">${svg}${src?`<img class="uic" src="${src}" alt="" draggable="false" onerror="this.remove()">`:''}</i>`}
