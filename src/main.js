// Entry point. Loads content, wires globals used by inline handlers and tests, boots the UI,
// registers the offline service worker.
import './data/index.js';
import {setAnimSpeedValue} from './core/timing.js';
import {initAudio,setAudioSetting} from './audio.js';
import './engine/effects.js';
import {W} from './core/state.js';
import * as registry from './core/registry.js';
import * as assets from './assets.js';
import * as cards from './engine/cards.js';
import * as combat from './engine/combat.js';
import * as runMod from './engine/run.js';
import * as render from './ui/render.js';
import * as input from './ui/input.js';
import './ui/chartdrag.js';
import './ui/foil.js';
import {loadTiles,tileUrls} from './ui/tiles.js';
import {installGlyphs} from './ui/glyphs.js';
import * as fx from './ui/fx.js';
import * as save from './save.js';
import * as bus from './core/bus.js';
import * as env from './ui/env.js';
import * as title from './ui/screens/title.js';
import * as select from './ui/screens/select.js';
import * as learn from './ui/screens/learn.js';
import * as hints from './ui/hints.js';
import * as intro from './ui/screens/intro.js';
import * as loading from './ui/screens/loading.js';
import * as lamp from './ui/screens/lamp.js';
import * as lampEngine from './engine/lamplight.js';
import * as progress from './progress.js';
import * as lampData from './data/lamplight.js';

installGlyphs();

// Inline onclick="..." handlers in rendered HTML (and the test scripts) call these by name.
for(const m of [assets,cards,combat,runMod,render,fx,save,bus,env,title,select,learn,hints,intro,loading,lamp])for(const [k,v] of Object.entries(m))if(typeof v==='function')window[k]=v;
window.setAudioSetting=setAudioSetting;
window.W=W;
window.G={get S(){return W.S},get run(){return W.run},get cb(){return W.cb},CARDS:registry.CARDS,EN:registry.EN,CLASSES:registry.CLASSES,
 RELICS:registry.RELICS,POTIONS:registry.POTIONS,EVENTS:registry.EVENTS,ENV:registry.ENV,ASSETS:assets.ASSETS,settings:save.settings,
 newRun:runMod.newRun,fire:bus.fire,mod:bus.mod,thisTurn:bus.thisTurn,forCombat:bus.forCombat,registerRelic:registry.registerRelic,registerPotion:registry.registerPotion,
 startCombat:combat.startCombat,needsTarget:cards.needsTarget,render:render.render,saveRun:save.saveRun,continueRun:save.continueRun,clearRun:save.clearRun,
 // Phase 1 test / debug surface
 giveRelic:runMod.giveRelic,loseRelic:runMod.loseRelic,addPotion:runMod.addPotion,usePotion:combat.usePotion,drinkPotion:combat.drinkPotion,
 playCard:combat.playCard,tapCard:combat.tapCard,endTurn:combat.endTurn,advance:combat.advance,tideAct:combat.tideAct,modeAct:combat.modeAct,
 TASKS:lampEngine.TASKS,progress,lampEngine,lampData,
 run$:runMod,combat$:combat,cards$:cards,debugEnv:env.debugEnv,envState:env.envState,quality:env.quality};
save.registerSaveActions(runMod);save.registerSaveActions(combat);save.registerSaveActions({tgt:render.tgt});
if(save.settings.fastAnim&&window.FAST==null)window.FAST=1;
setAnimSpeedValue(save.settings.animSpeed);
W.S={screen:'title',view:title.bootView()};
assets.applyTextures();title.applyMotion();env.initEnv();
initAudio();
render.render();
assets.loadCardArt().then(n=>{if(n)render.render()});
loadTiles().then(n=>{if(n)render.render()});

// Landscape lock where the platform allows it (installed PWA / fullscreen / Capacitor); harmless elsewhere.
addEventListener('pointerdown',()=>{try{const o=screen.orientation;if(o&&o.lock&&(matchMedia('(display-mode: standalone)').matches||document.fullscreenElement))o.lock('landscape').catch(()=>{})}catch(_){}},{once:true});

// Offline support: register the service worker and ask it to cache everything this page loaded + all art in the asset map.
loading.loadingInit();
// Registered after the page's own load (slow links: the game's code and start screen get the bandwidth first, the install does not fight them for it).
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))(document.readyState==='complete'?Promise.resolve():new Promise(r=>addEventListener('load',r,{once:true}))).then(()=>{
 navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(reg=>{
  const urls=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>u.startsWith(location.origin)).concat([...assets.assetURLs(),...env.envURLs(1),...tileUrls()].map(u=>new URL(u,location.href).href));
  (reg.active||navigator.serviceWorker.controller)&&reg.active.postMessage({type:'precache',urls});
  // Act 2/3 art is not installed up front: fetch it only when a later act is requested (?act=N) or a saved run is already in one.
  assets.warmActPack(Math.max(+new URLSearchParams(location.search).get('act')||1,(W.run&&W.run.act)||1));
 }).catch(e=>{console.warn('SW registration failed',e);loading.loadingFail()});
});
