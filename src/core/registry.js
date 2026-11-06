// core/registry.js
// Content registries. All game content is data registered here by the modules in src/data/.
// Lookups are by id, so content can grow to hundreds of entries without touching engine code.
export const CARDS={};        // id -> card def  {id,cls,n,c,cu?,t,r,e,d, fx:[[op,...args]] | p:f=>{...} | wp:f=>{...}, sus?,moor?,fleet?,unplay?,faint?,x?,xu?, on:{event(...)}, mod:{name(...)}}
export const EN={};           // id -> enemy def {id,n,e,hp:[min,max],ai:e=>intent, elite?,boss?,b0?,passive?,onDamaged?,onDeath?}
export const CLASSES={};      // id -> class def {n,e,hp,col,theme,starter:[cardIds],rule,relic}
export const KW={};           // keyword -> glossary text (design-v2 §2.1)
export const EVENTS=[];       // event defs {id,n,e,pool:'act1'|'shrine',t,req?,o:[{l,ok?,f}]}
export const ENCOUNTERS={};   // table name -> list of {e:[enemy ids], w:weight}  (ACT 1's table; Acts 2 and 3 live in ENCOUNTERS_BY_ACT)
export const ENCOUNTERS_BY_ACT={1:ENCOUNTERS,2:{},3:{}};
export const RELICS={};       // id -> relic def (meta from data-v2.json + behaviour {on,mod,pickup})
export const POTIONS={};      // id -> potion def (meta from data-v2.json + {use(f,target), on?})
export const CHARMS={};       // id -> run-long charm (Saltwife's Loom)
export const ENV={bands:[],bossLair:{},screenScene:{},grades:{},envs:{},variant:{},layers:{},budget:{}}; // environment routing + lighting (design-v2 §W.7)
export const EFFECTS={};      // op id -> handler(f,args) used by card fx lists (see engine/effects.js)
// Type codes: A Attack, S Skill, P Power, W Waypoint, C Curse, T Status (design §2.7). Rarity: s starter/basic, c, u, r, x special.
export const TYPEN={A:'Attack',S:'Skill',P:'Power',W:'Waypoint',C:'Curse',T:'Status'};
export const RARN={s:'Starter',c:'Common',u:'Uncommon',r:'Rare',x:'Special'};
export function C(cls,id,o){if(CARDS[id])throw new Error('Duplicate card id '+id);o.id=id;o.cls=cls;CARDS[id]=o;return o}
export const registerCard=C;
export function registerEnemies(o){for(const k in o){o[k].id=k;EN[k]=o[k]}}
export function registerClasses(o){Object.assign(CLASSES,o)}
export function registerKeywords(o){Object.assign(KW,o)}
export function registerEvents(list){for(const e of list){e.id=e.id||e.n.toLowerCase().replace(/[^a-z0-9]+/g,'-');EVENTS.push(e)}}
export function registerEncounters(o,act=1){const T=ENCOUNTERS_BY_ACT[act]||(ENCOUNTERS_BY_ACT[act]={});for(const k in o)T[k]=(T[k]||[]).concat(o[k].map(x=>Array.isArray(x)?{e:x,w:1}:x))}
export const encountersFor=act=>ENCOUNTERS_BY_ACT[act]||ENCOUNTERS
export function registerRelic(id,o){o.id=id;RELICS[id]=o;return o}
export function registerPotion(id,o){o.id=id;POTIONS[id]=o;return o}
export function registerCharm(id,o){o.id=id;CHARMS[id]=o}
export function registerEffect(id,fn){EFFECTS[id]=fn}
export function registerEnvironments(o){Object.assign(ENV,o)}
