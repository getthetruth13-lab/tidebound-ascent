// ui/glyphs.js: the ONE icon map. No emoji are shown to the player: every pictograph in data, engine strings and templates is
// swapped for a themed drowned-bronze line glyph. Two layers:
//   GLYPHS   key -> inline SVG (24x24, stroke = currentColor, bronze via css/glyphs.css)
//   EMOJI    source character -> glyph key (data files may keep their emoji as stable ids / fallbacks)
// Art slots: art/v2/ui/glyphs/<key>.webp (tools/make-glyphs-manifest.cjs lists them in art/v2/ui/glyphs.json). When a painted
// file is ready it is drawn over the SVG with no code change. installGlyphs() converts every emoji that reaches the DOM
// (text nodes, innerHTML, toasts, tooltips) and strips them from title / aria-label attributes.
const P=d=>`<path d="${d}"/>`,C=(x,y,r,f)=>`<circle cx="${x}" cy="${y}" r="${r}"${f?' fill="currentColor"':''}/>`;
export const GLYPHS={
 coin:C(12,12,8)+C(12,12,4.5)+P('M12 9.5v5'),
 purse:P('M9 4h6l-1.5 3h-3z')+P('M10.5 7C5 10 4 15 6 19c3 2 9 2 12 0 2-4 1-9-4.500-12')+P('M12 11v6M10 13h3M10 16h3'),
 drop:P('M12 3S5.500 10 5.500 14.500a6.500 6.500 0 0 0 13 0C18.500 10 12 3 12 3z')+P('M9 15a3 3 0 0 0 3 3'),
 blood:P('M12 3S5.500 10 5.500 14.500a6.500 6.500 0 0 0 13 0C18.500 10 12 3 12 3z')+P('M9.500 13.500a2.500 2.500 0 0 0 2.500 2.500" fill="currentColor'),
 flame:P('M12 3c1 4 5 5.500 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.500 1 2 1.500 2C10 8 11 5.500 12 3z'),
 lantern:P('M8 7h8v11H8z')+P('M10 4h4v3M7 18h10M12 20v-2')+P('M12 10c1 1.500 2 2 0 4-2-2-1-2.500 0-4z'),
 candle:P('M10 10h4v10h-4z')+P('M8 20h8')+P('M12 3.500c1.500 1.500 1.800 3 0 4.500-1.800-1.500-1.500-3 0-4.500z'),
 bell:P('M12 3.500V5')+P('M6 17c1.500-1.500 2-4 2-6a4 4 0 0 1 8 0c0 2 .5 4.500 2 6z')+P('M10 19.500h4'),
 bolt:P('M13 3L6 13h5l-1 8 8-11h-5z'),
 wave:P('M3 10c3-4 6 2 9-1s6 2 9-1')+P('M3 15c3-4 6 2 9-1s6 2 9-1')+P('M3 20c3-4 6 2 9-1s6 2 9-1'),
 spiral:P('M12 12a1.500 1.500 0 0 1 3 0 4.500 4.500 0 0 1-9 0 7.500 7.500 0 0 1 15 0'),
 boot:P('M8 4h6v8l5 3v4H5v-3l3-2z')+P('M8 8h6'),
 walker:C(13,5,1.800)+P('M13 8l-1 6 3 3 1 4M12 14l-3 2-1 4M13 9l-4 2M13 9l3 3'),
 stone:P('M5 17l2-7 5-4 6 3 1 8z')+P('M7 10l5 2 6-3M12 12v5'),
 mountain:P('M2 20L9 7l4 7 3-4 6 10z')+P('M9 7l-2 4 2 1 1.500-1.500'),
 map:P('M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z')+P('M9 4v14M15 6v14'),
 pin:P('M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z')+C(12,10,2),
 compass:C(12,12,8.500)+P('M15.500 8.500l-2 5-5 2 2-5z'),
 shell:P('M12 20C6 20 3 15 4 10c3-3 13-3 16 0 1 5-2 10-8 10z')+P('M12 20V8M8.500 19L7 9.500M15.500 19L17 9.500'),
 lock:P('M6 11h12v9H6z')+P('M8 11V8a4 4 0 0 1 8 0v3')+C(12,15.500,1.200,1),
 note:P('M9 18V6l9-2v12')+C(7,18,2)+C(16,16,2),
 arrowup:P('M12 20V5M6 11l6-6 6 6'),
 arrowdown:P('M12 4v15M6 13l6 6 6-6'),
 arrowright:P('M4 12h15M13 6l6 6-6 6'),
 undo:P('M9 8L4 12l5 4M4 12h11a4 4 0 0 1 0 8h-3'),
 cycle:P('M20 12a8 8 0 0 0-14-5M4 4v4h4M4 12a8 8 0 0 0 14 5M20 20v-4h-4'),
 sword:P('M19 5l-9 9M10 14l-4 4M7 11l6 6M4 20l2-2M19 5V4h-1'),
 hammer:P('M14 4l6 6-3 3-6-6z')+P('M13 11L5 19'),
 trident:P('M12 21V8M6 4v5a6 6 0 0 0 12 0V4M12 3v5'),
 shield:P('M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z')+P('M12 7v10'),
 skull:P('M6 11a6 6 0 0 1 12 0c0 2-1 3-2 4v3H8v-3c-1-1-2-2-2-4z')+C(9.500,11,1.300,1)+C(14.500,11,1.300,1)+P('M11 15v2M13 15v2'),
 heart:P('M12 20S4 15 4 9.500A4.500 4.500 0 0 1 12 7a4.500 4.500 0 0 1 8 2.500C20 15 12 20 12 20z'),
 eye:P('M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z')+C(12,12,3),
 moon:P('M18 15A8 8 0 1 1 9 4a6.500 6.500 0 0 0 9 11z'),
 star:P('M12 3l2.500 6 6.500.5-5 4.200 1.700 6.300L12 16.500 6.300 20l1.700-6.300-5-4.200 6.500-.5z'),
 spark:P('M12 3l1.800 6.200L20 11l-6.200 1.800L12 19l-1.800-6.200L4 11l6.200-1.800z'),
 sun:C(12,12,4)+P('M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2 2M16.400 16.400l2 2M18.400 5.600l-2 2M7.600 16.400l-2 2'),
 gem:P('M7 4h10l4 5-9 11L3 9z')+P('M3 9h18M9 4L7 9l5 11 5-11-2-5'),
 flask:P('M10 3h4M11 3v6L5 19a1.500 1.500 0 0 0 1.300 2h11.400A1.500 1.500 0 0 0 19 19l-6-10V3')+P('M8 15h8'),
 pot:P('M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z')+P('M3 11h18M9 5c0 1.500 1.500 1.500 0 3M14 5c0 1.500 1.500 1.500 0 3'),
 scroll:P('M6 4h12v14a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2z')+P('M9 8h6M9 12h6'),
 book:P('M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z')+P('M5 17a3 3 0 0 1 3-3h11'),
 feather:P('M20 4C10 4 5 10 5 19M5 19L16 8M9 15h5'),
 anchor:C(12,5,2)+P('M12 7v13M7 11h10M5 15c0 3 3 5 7 5s7-2 7-5'),
 scissors:C(6,7,2.500)+C(6,17,2.500)+P('M8 8.500L20 18M8 15.500L20 6'),
 dice:P('M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z')+C(9,9,1,1)+C(15,15,1,1)+C(12,12,1,1),
 tower:P('M8 21V9L7 8V4h3v2h4V4h3v4l-1 1v12z')+P('M12 21v-4'),
 house:P('M4 20V10l8-6 8 6v10z')+P('M10 20v-6h4v6'),
 tent:P('M3 20L12 4l9 16z')+P('M12 20v-6'),
 door:P('M6 21V4h12v17M4 21h16')+C(15,13,.9,1),
 crab:P('M6 14a6 4 0 0 1 12 0 6 4 0 0 1-12 0z')+P('M6 14l-3 2M7 17l-3 3M18 14l3 2M17 17l3 3M7 11L5 6M17 11l2-5'),
 fish:P('M3 12c4-6 11-6 15 0-4 6-11 6-15 0z')+P('M18 12l4-4v8z')+C(8,11,1,1),
 bird:P('M3 10c3 0 5 2 6 4 1-3 4-6 9-6-1 3-3 5-5 5l3 5-4-1-3 3-1-4C6 15 4 13 3 10z'),
 paw:C(8,8,1.600)+C(16,8,1.600)+C(5,13,1.400)+C(19,13,1.400)+P('M12 12c-4 0-6 4-4 6 1.500 1.500 2.500 0 4 0s2.500 1.500 4 0c2-2 0-6-4-6z'),
 leaf:P('M5 19C5 10 11 5 20 4c0 9-5 15-14 15z')+P('M5 19L14 10'),
 ghost:P('M6 20V11a6 6 0 0 1 12 0v9l-3-2-3 2-3-2z')+C(10,11,1,1)+C(14,11,1,1),
 mask:P('M4 6c5-2 11-2 16 0 0 8-3 13-8 13S4 14 4 6z')+P('M7.500 10h3M13.500 10h3M10 15c1 .8 3 .8 4 0'),
 figure:C(12,6,3)+P('M6 21v-4a6 6 0 0 1 12 0v4'),
 hand:P('M8 12V6a1.300 1.300 0 0 1 2.600 0v5M10.600 11V4.500a1.300 1.300 0 0 1 2.600 0V11M13.200 11V5.500a1.300 1.300 0 0 1 2.600 0V12M15.800 12V8.500a1.300 1.300 0 0 1 2.600 0V15c0 4-2 6-6 6-3 0-4.500-1.500-6-4l-2-3a1.300 1.300 0 0 1 2-1.600L8 14'),
 crown:P('M4 18l-1-10 5 4 4-7 4 7 5-4-1 10z')+P('M4 21h16'),
 chest:P('M4 10V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2')+P('M4 10h16v10H4z')+P('M4 14h16M11 12.500h2v3h-2z'),
 flag:P('M6 21V4M6 5h12l-3 4 3 4H6'),
 check:P('M5 12l5 5 9-10'),
 cross:P('M6 6l12 12M18 6L6 18'),
 question:P('M9 9a3 3 0 1 1 4.500 2.600C12.500 12.300 12 13 12 14.500')+C(12,18.500,.7,1),
 wind:P('M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 11.500h7'),
 cloud:P('M7 18a4 4 0 0 1-.5-8 5.500 5.500 0 0 1 10.500 1.500A3.300 3.300 0 0 1 17 18z'),
 hourglass:P('M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9'),
 gear:C(12,12,4)+P('M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M18.400 5.600l-2.100 2.100M7.700 16.300l-2.100 2.100'),
 knot:P('M4 12c0-5 8-5 8 0s8 5 8 0c0-5-8-5-8 0s-8 5-8 0z'),
 ruler:P('M3 17L17 3l4 4L7 21z')+P('M7 13l2 2M10 10l2 2M13 7l2 2'),
 mirror:P('M12 3c4 0 6 3 6 8s-2 8-6 8-6-3-6-8 2-8 6-8z')+P('M12 19v3M8 22h8M9 8c1-1 2-1.500 3-1.500'),
 card:P('M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z')+P('M12 8l3 4-3 4-3-4z'),
 play:P('M8 5l11 7-11 7z'),
 rewind:P('M16 5L5 12l11 7z'),
 pause:P('M8 5v14M16 5v14'),
 fast:P('M4 5l8 7-8 7zM12 5l8 7-8 7z'),
 sigil:P('M12 3l8 9-8 9-8-9z')+P('M12 8l4 4-4 4-4-4z')
};
// source character -> glyph key. Every pictograph found in src/ is listed; anything else falls back to 'sigil'.
const SETS={
 coin:'🪙🏦🏧',purse:'💰👛👝🎒🛍',drop:'💧💦🫧🌡⛲🧂',blood:'🩸💉',flame:'🔥♨🧨',lantern:'🏮🔆🎐',candle:'🕯',bell:'🔔🛎📯📢📣🔊🔇',bolt:'⚡⛈🌩',
 wave:'🌊🏄🏖🏝🌧〰',spiral:'🌀🌪🌌🕳',boot:'🥾👢👟👣🦵🎽🛤',walker:'🚶🏃🧗🧍',stone:'🪨🧱🗿',mountain:'⛰🏔🌋🗾',map:'🗺🌍🌐🌉',pin:'📍📌',compass:'🧭🎯',
 shell:'🐚🦪🪸',lock:'🔒🔓',note:'🎶🎵🎼🎹🎻🎤🎺🎸🎷🎛🎚♯♭',arrowup:'⬆⤴',arrowdown:'⬇⤵',arrowright:'➡➜',undo:'↩🔙⬅',cycle:'🔄🔃🔁🔂🔀',
 sword:'⚔🗡🔪🏹🪚',hammer:'🔨🪓⚒⛏🔧🪜🧲',trident:'🔱',shield:'🛡',skull:'💀☠⚰🪦🦴🦷',heart:'❤💚🩹🫀💢',eye:'👁🔭🥽🤿🧿',moon:'🌙🌑🌒🌓🌗🌘🌕💤',
 star:'⭐★🌠☄🌟',spark:'✨✦✳💥🎆🎇💫',sun:'☀🌞🌅',gem:'💎💠🔷🔹🔺🔮📿',flask:'🧪⚗🫙🍺🏺🧴',pot:'🍲🥣🥫🍞🍪🥚',scroll:'📜📨📅📈📉📃📄💬🗣',
 book:'📘📕📓📒📚',feather:'🪶🖋✍',anchor:'⚓🛶🚤⛵🚢🪝',scissors:'✂🗑',dice:'🎲',tower:'🗼🏰🏯',house:'🏛🏚⛩🚉🚚🏠',tent:'⛺🏕',door:'🚪🥅',mirror:'🪞',card:'🃏🂠',play:'▶',rewind:'◀',pause:'⏸',fast:'⏩',
 crab:'🦀🦞',fish:'🐟🐠🐋🦈🦑🐙🦠',bird:'🐦🐤🐥🦅🪺',paw:'🐾🐂🦔🦘🐝🐍🪱🐌🫏',leaf:'🌿🌱🍃🍄🌹🌸🪷🪵🎋',ghost:'👻',
 mask:'🎭😨😢😵🤢😤🤫🤖👿😈',figure:'🧜🧔👥🤺♟🧑💃',hand:'🫳✊👊🤏🥊💪✋🤚🫡👏🧤',crown:'👑🏆',chest:'🎁📦🧰🛢🪣🧳',flag:'🚩🏁🎌🎗🪧🎬🎀🎽',
 check:'✔✅',cross:'✕✖❌⛔',question:'❓❔',wind:'💨🌬',cloud:'🌫☁⛅',hourglass:'⏱⏳⌛',gear:'⚙☸⚖🎛',knot:'🪢🔗⛓🧵🧶♾🕸',ruler:'📏📐'
};
export const EMOJI={};
for(const [k,s] of Object.entries(SETS))for(const ch of Array.from(s))EMOJI[ch]=k;
// one pictograph (with optional variation selector / joiner sequence / skin tone)
const RE=/(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/gu;
const HAS=/\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const base=e=>Array.from(e)[0];
export const glyphKey=e=>{const b=base(e);if(EMOJI[b])return EMOJI[b];const cp=b.codePointAt(0);return cp<0x2190||(cp>=0x2190&&cp<=0x21FF)?null:'sigil'};
// Optional painted art: key -> path, filled from art/v2/ui/glyphs.json (only entries whose file exists).
export const GLYPH_ART={};
export async function loadGlyphArt(){try{const r=await fetch('art/v2/ui/glyphs.json',{cache:'no-cache'});if(!r.ok)return 0;const j=await r.json();
 for(const k in GLYPH_ART)delete GLYPH_ART[k];for(const [id,v] of Object.entries(j.glyphs||{}))if(v&&v.ready)GLYPH_ART[id]=v.path;return Object.keys(GLYPH_ART).length}catch(e){return 0}}
const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[k]||GLYPHS.sigil}</svg>`;
export function glyph(k,cls=''){if(!GLYPHS[k])k='sigil';const a=GLYPH_ART[k];
 return `<i class="gi ${cls}" data-g="${k}">${svg(k)}${a?`<img src="${a}" alt="" draggable="false" onerror="this.remove()">`:''}</i>`}
// Text/HTML string with emoji -> same string with glyph elements. Characters inside tag brackets (attributes) are left alone.
export function iconize(s){s=String(s==null?'':s);if(!HAS.test(s))return s;
 return s.split(/(<[^>]*>)/).map(p=>p[0]==='<'?p:p.replace(RE,m=>{const k=glyphKey(m);return k?glyph(k):m})).join('')}
export const stripEmoji=s=>String(s).replace(RE,m=>glyphKey(m)?'':m).replace(/\s{2,}/g,' ').trim();
// ---- DOM safety net -------------------------------------------------------------------------------------------------
const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','SVG','NOSCRIPT']);
const ATTRS=['title','aria-label','placeholder','alt'];
function fixText(t){const v=t.nodeValue;if(!HAS.test(v))return;const p=t.parentNode;if(!p||SKIP.has(p.nodeName.toUpperCase()))return;
 const h=iconize(v.replace(/&/g,'&amp;').replace(/</g,'&lt;'));if(h===v)return;
 const tpl=document.createElement('template');tpl.innerHTML=h;p.replaceChild(tpl.content,t)}
function fixNode(n){
 if(n.nodeType===3){fixText(n);return}
 if(n.nodeType!==1||SKIP.has(n.nodeName.toUpperCase()))return;
 const w=document.createTreeWalker(n,5);const texts=[],els=[n];let c;
 while((c=w.nextNode())){if(c.nodeType===3)texts.push(c);else if(!SKIP.has(c.nodeName.toUpperCase()))els.push(c)}
 for(const e of els)for(const a of ATTRS){const v=e.getAttribute&&e.getAttribute(a);if(v&&HAS.test(v)){const s=stripEmoji(v);if(s!==v)e.setAttribute(a,s)}}
 for(const t of texts)fixText(t)}
export function installGlyphs(root=document.body){
 if(installGlyphs.on)return;installGlyphs.on=true;
 fixNode(root);document.title=stripEmoji(document.title);
 const q=new Set();let busy=false;
 const flush=()=>{busy=false;for(const n of q){if(n.isConnected!==false)fixNode(n)}q.clear()};
 new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')q.add(m.target);else if(m.type==='attributes')q.add(m.target);else for(const n of m.addedNodes)q.add(n)}
  if(!busy){busy=true;queueMicrotask(flush)}}).observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
 loadGlyphArt()}
