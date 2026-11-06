// ui/wordless.js: "wordless art" switches (LATE-WIRE). The painted title poster and End Turn seal are being repainted without lettering; the code then draws the words as live text.
// Flags live beside the art: art/v2/title/title.json and art/v2/ui/end-turn.json, each {"wordless":false}. false = today's art with baked words (default, also when the file is missing).
// Set true in the same commit that adds art/v2/title/title-poster-clean.jpg (+ optional "video") / art/v2/ui/end-turn-clean.webp. A 'wordless' window event fires once the flags are read; the start screen draws nothing but the dark stage until then (no baked-then-clean flicker, no wasted video fetch).
export const WL={ready:false,title:false,titleVideo:null,endTurn:false};
const get=u=>fetch(u).then(r=>r.ok?r.json():{},()=>({})).catch(()=>({}));
export const wordlessReady=Promise.all([get('art/v2/title/title.json'),get('art/v2/ui/end-turn.json')]).then(([t,e])=>{
 WL.title=t.wordless===true;WL.titleVideo=typeof t.video==='string'?t.video:null;WL.endTurn=e.wordless===true;
 WL.ready=true;window.dispatchEvent(new Event('wordless'))});
