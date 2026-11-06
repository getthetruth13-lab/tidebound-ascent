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
 drain:['intent-drain','M13 2L4 14h7l-1 8 10-13h-7z']
};
for(const [slot] of Object.values(INTENT_ICONS))if(!(slot in ASSETS.ui))ASSETS.ui[slot]=null;
export function intentIcon(k,img,tag){const [slot,path]=INTENT_ICONS[k]||INTENT_ICONS.unknown;
 const metal='intent-metal-'+k;const svg=`<svg class="intent-svg" viewBox="0 0 24 26" aria-hidden="true"><defs><linearGradient id="${metal}" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#fff0bb"/><stop offset=".3" stop-color="#bd9855"/><stop offset=".55" stop-color="#63431f"/><stop offset=".8" stop-color="#bd9855"/><stop offset="1" stop-color="#48301a"/></linearGradient></defs><path d="${path}" fill="url(#${metal})" stroke="#edcc8d" stroke-width="1.25" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#392719" stroke-width=".35" transform="translate(.5 .5)"/></svg>`;
 const src=img||assetSrc('ui',slot);return `<i class="intent-art" data-icon="${tag||k}">${svg}${src?`<img class="uic" src="${src}" alt="" draggable="false" onerror="this.remove()">`:''}</i>`}
