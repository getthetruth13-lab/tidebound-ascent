// Offline service worker. App shell is pre-cached on install; every other same-origin file
// (modules, art) is cached the first time it loads, and main.js also asks us to cache all
// loaded resources plus every URL in the asset map. Strategy: stale-while-revalidate.
// Bump VERSION to force clients onto a fresh cache after a release.
const VERSION='tidebound-deploy-20261010-064338';
const SHELL=['./','./index.html','./manifest.webmanifest','./css/style.css','./css/ui-theme.css','./css/tiles.css','./css/window.css','./art/v2/ui/window-frame.svg','./src/ui/tiles.js','./src/ui/cardref.js','./src/ui/chartdrag.js','./fonts/cinzel.woff','./fonts/crimson-pro.woff','./fonts/crimson-pro-italic.woff','./src/ui/kwtip.js','./src/ui/screens/title.js','./src/ui/screens/select.js','./src/ui/screens/learn.js','./src/ui/screens/intro.js','./audio/music/intro-1.mp3','./audio/music/menu-1.mp3','./art/v2/intro/intro-1.webp','./art/v2/intro/intro-2.webp','./art/v2/intro/intro-3.webp','./art/v2/intro/intro-4.webp','./src/ui/screens/heroes.js','./src/ui/screens/frame.js','./src/ui/screens/lamp.js','./src/progress.js','./src/engine/lamplight.js','./src/data/lamplight.js','./css/anim.css','./src/ui/anim.js','./src/ui/vfx.js','./src/main.js','./src/audio.js','./audio/music/index.json','./audio/music/map-act1-1.mp3','./audio/music/fight-act1-1.mp3','./audio/music/elite-act1-1.mp3','./audio/music/boss-act1-1.mp3','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{const d=e.data||{};if(d.type==='precache'&&Array.isArray(d.urls)){
 e.waitUntil(caches.open(VERSION).then(c=>Promise.all(d.urls.filter(u=>u.startsWith(self.location.origin)).map(u=>c.match(u).then(hit=>hit||c.add(u).catch(()=>{}))))))}});
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET'||!req.url.startsWith(self.location.origin))return;
 e.respondWith(caches.open(VERSION).then(async c=>{
  const key=req.mode==='navigate'?'./index.html':req;const hit=await c.match(key,{ignoreSearch:true});
  const net=fetch(req).then(r=>{if(r&&r.ok&&r.type==='basic')c.put(req.mode==='navigate'?'./index.html':req,r.clone());return r}).catch(()=>hit);
  return hit||net}))});
