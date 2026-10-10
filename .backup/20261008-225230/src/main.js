// Entry point. Loads content, wires globals used by inline handlers and tests, boots the UI,
// registers the offline service worker.
import './data/index.js';
import './engine/effects.js';
import {W} from './core/state.js';
import * as registry from './core/registry.js';
import * as assets from './assets.js';
import * as cards from './engine/cards.js';
import * as combat from './engine/combat.js';
import * as runMod from './engine/run.js';
import * as render from './ui/render.js';
import * as input from './ui/input.js';
import * as fx from './ui/fx.js';
import * as save from './save.js';
import * as bus from './core/bus.js';
import * as env from './ui/env.js';

// Inline onclick="..." handlers in rendered HTML (and the test scripts) call these by name.
for(const m of [assets,cards,combat,runMod,render,fx,save,bus,env])for(const [k,v] of Object.entries(m))if(typeof v==='function')window[k]=v;
window.W=W;
window.G={get S(){return W.S},get run(){return W.run},get cb(){return W.cb},CARDS:registry.CARDS,EN:registry.EN,CLASSES:registry.CLASSES,
 RELICS:registry.RELICS,POTIONS:registry.POTIONS,EVENTS:registry.EVENTS,ENV:registry.ENV,ASSETS:assets.ASSETS,settings:save.settings,
 newRun:runMod.newRun,fire:bus.fire,mod:bus.mod,thisTurn:bus.thisTurn,forCombat:bus.forCombat,registerRelic:registry.registerRelic,registerPotion:registry.registerPotion,
 startCombat:combat.startCombat,needsTarget:cards.needsTarget,render:render.render,saveRun:save.saveRun,continueRun:save.continueRun,clearRun:save.clearRun,
 // Phase 1 test / debug surface
 giveRelic:runMod.giveRelic,loseRelic:runMod.loseRelic,addPotion:runMod.addPotion,usePotion:combat.usePotion,drinkPotion:combat.drinkPotion,
 playCard:combat.playCard,tapCard:combat.tapCard,endTurn:combat.endTurn,advance:combat.advance,tideAct:combat.tideAct,modeAct:combat.modeAct,
 run$:runMod,combat$:combat,cards$:cards,debugEnv:env.debugEnv,envState:env.envState,quality:env.quality};
if(save.settings.fastAnim&&window.FAST==null)window.FAST=1;
assets.applyTextures();env.initEnv();
render.render();

// Landscape lock where the platform allows it (installed PWA / fullscreen / Capacitor); harmless elsewhere.
addEventListener('pointerdown',()=>{try{const o=screen.orientation;if(o&&o.lock&&(matchMedia('(display-mode: standalone)').matches||document.fullscreenElement))o.lock('landscape').catch(()=>{})}catch(_){}},{once:true});

// Offline support: register the service worker and ask it to cache everything this page loaded + all art in the asset map.
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){
 navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(reg=>{
  const urls=performance.getEntriesByType('resource').map(e=>e.name).filter(u=>u.startsWith(location.origin)).concat([...assets.assetURLs(),...env.envURLs(1)].map(u=>new URL(u,location.href).href));
  (reg.active||navigator.serviceWorker.controller)&&reg.active.postMessage({type:'precache',urls});
 }).catch(e=>console.warn('SW registration failed',e));
}
