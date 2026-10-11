// Regenerates icons/*.png using the project's Playwright Chromium.
// Source: art/v2/ui/app-icon.png if it exists (any: full image; maskable: image inset to the 72% safe zone on near-black),
// otherwise icons/icon.svg. Usage: node tools/make-icons.js
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');
(async()=>{const root=path.join(__dirname,'..'),art=path.join(root,'art','v2','ui','app-icon.png'),hasArt=fs.existsSync(art);
const inner=hasArt?`<img src="data:image/png;base64,${fs.readFileSync(art).toString('base64')}" style="width:100%;height:100%;object-fit:cover;display:block">`
 :fs.readFileSync(path.join(root,'icons','icon.svg'),'utf8').replace('<svg ','<svg width="100%" height="100%" ');
const b=await chromium.launch();
for(const [name,size,mask] of [['icon-192.png',192,0],['icon-512.png',512,0],['icon-maskable-512.png',512,1]]){
 const pg=await b.newPage({viewport:{width:size,height:size}});
 // maskable: full-bleed background, artwork kept inside the central 72% safe zone
 await pg.setContent(`<html><body style="margin:0;background:#0b0e14"><div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${mask?(hasArt?'#0b0e14':'#0a2a3d'):'transparent'}">
  <div style="width:${mask?size*.72:size}px;height:${mask?size*.72:size}px">${inner}</div></div></body></html>`);
 await pg.screenshot({path:path.join(root,'icons',name),omitBackground:!mask});await pg.close()}
await b.close();console.log(hasArt?'icons written from app-icon.png':'icons written from icon.svg (app-icon.png not found)')})();
