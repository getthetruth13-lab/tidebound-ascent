// Writes art/v2/ui/glyphs.json: one art slot per themed glyph (src/ui/glyphs.js). Drop a transparent 128x128 webp at "path",
// run `node tools/make-glyphs-manifest.cjs` (sets ready:true), and the painted icon replaces the SVG glyph with no code change.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),src=fs.readFileSync(path.join(root,'src/ui/glyphs.js'),'utf8');
const body=src.slice(src.indexOf('export const GLYPHS={'),src.indexOf('};',src.indexOf('export const GLYPHS={')));
const keys=[...body.matchAll(/^ ([a-z]+):/gm)].map(m=>m[1]);
const glyphs={};for(const k of keys){const p='art/v2/ui/glyphs/'+k+'.webp';glyphs[k]={path:p,size:[128,128],desc:'Drowned bronze line icon: '+k+' (transparent, centred, ~10% margin)',ready:fs.existsSync(path.join(root,p))}}
fs.writeFileSync(path.join(root,'art/v2/ui/glyphs.json'),JSON.stringify({note:'Glyph art slots (replace SVG glyphs). Drop a webp at "path", run node tools/make-glyphs-manifest.cjs.',glyphs},null,1));
console.log(keys.length+' glyph slots');
