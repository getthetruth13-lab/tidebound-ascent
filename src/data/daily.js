// Daily Current (design-v2 §4.7): one seed per day, 3 modifiers, shared class, scored end screen.
// Modifiers live on run.mods and are walked by bus.sources (same shape as charms: {on, mod}).
import {W} from '../core/state.js';
import {CLASSES} from '../core/registry.js';
import {overallFloor,TOTAL_FLOORS} from './places.js';

export const DAILY_MODS={};
export function registerDaily(id,o){o.id=id;DAILY_MODS[id]=o}

const BAN=[['calmwaters','glasshull'],['calmwaters','roughseas'],['riches','glasshull']];
const banned=(a,b)=>BAN.some(([x,y])=>(a===x&&b===y)||(a===y&&b===x));

function h32(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function mulberry(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export const dailyHash=h32;

export const DAILY_CLASSES=['tide','echo','carto','duel'];
export function dailyClass(seed){return DAILY_CLASSES[(seed>>>0)%DAILY_CLASSES.length]}

export function pickDailyMods(seed,n=3){
 const ids=Object.keys(DAILY_MODS);const rnd=mulberry(h32('mods-'+(seed>>>0)));
 const shuffled=ids.slice();for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
 const out=[];for(const id of shuffled){if(out.length>=n)break;if(out.some(x=>banned(x,id)))continue;out.push(id)}
 while(out.length<n&&out.length<ids.length){const id=ids[Math.floor(rnd()*ids.length)];if(!out.includes(id))out.push(id)}
 return out.slice(0,n)}

export function dailyPreview(seed){
 const mods=pickDailyMods(seed).map(id=>{const d=DAILY_MODS[id];return {id,n:d.n,e:d.e,d:d.d}});
 return {seed,cls:dailyClass(seed),mods}}

export function attachDailyMods(run,modIds){
 run.mods=modIds.slice();
 run.dailyMods=modIds.map(id=>{const d=DAILY_MODS[id];return {id,n:d.n,e:d.e,d:d.d}})}

export function computeScore(run){
 const st=run.stats||{};const floors=Math.max(0,overallFloor(run.act||1,run.floor||0));
 const elites=(st.elites||[0,0,0]);const elitePts=elites[0]*10+elites[1]*20+elites[2]*30;
 const bosses=st.bosses||0;const bossPts=bosses>=3?300:bosses===2?150:bosses===1?50:0;
 const eliteN=elites.reduce((a,b)=>a+b,0);
 const kills=Math.max(0,(run.kills||0)-eliteN-bosses);
 let total=floors*5+kills*2+elitePts+bossPts;
 const bonus=[];
 if((st.maxHit||0)>=60){total+=25;bonus.push(['Hull Breaker',25])}
 if((st.maxEchoesTurn||0)>=4){total+=25;bonus.push(['Full Chorus',25])}
 if((st.goldEarned||0)>=1000){total+=25;bonus.push(['Long Voyage',25])}
 if(run.won&&(run.deck||[]).length<=15){total+=50;bonus.push(['Light Pack',50])}
 if((run.relics||[]).length>=20){total+=40;bonus.push(['Hoarder of the Deep',40])}
 const mins=Math.max(0,Math.round(((st.endT||Date.now())-(st.startT||Date.now()))/60000));
 if(run.won&&mins>0&&mins<45){total+=40;bonus.push(['Swift Current',40])}
 if(run.won&&(run.act||1)>=3){total+=200;bonus.push(['Lighthouse Lit',200])}
 const asc=(run.asc|0);const mult=1+0.05*asc;total=Math.round(total*mult);
 return {total,floors,kills,elitePts,bossPts,bonus,mins,mult,asc}}

export function dailyResultText(run,score){
 const K=CLASSES[run.cls]||{n:run.cls};const mods=(run.dailyMods||[]).map(m=>m.n).join(', ')||'none';
 const date=run.dailyDate||'';const outcome=run.won?((run.act||1)>=3?'Victory':'Act '+(run.act||1)+' clear'):('Fell floor '+overallFloor(run.act||1,Math.max(1,run.floor||0))+'/'+TOTAL_FLOORS);
 return [`Tidebound Ascent — Daily Current ${date}`,`Hero: ${K.n} · Seed ${run.seed}`,`Modifiers: ${mods}`,`Result: ${outcome} · ${score.mins} min`,`Score: ${score.total}`].join('\n')}

export const DAILY_CURSES=['barnacled','brinerot','seasick','anchorchain','dread','leakyhull','sirenwhisper','wreckghost','doubloon'];

// 12 modifiers (design-v2 §4.7). Side-effects that need engine helpers run from applyDailyEffects in run.js.
registerDaily('springbloom',{n:'Spring Bloom',e:'🌸',d:'Start with a random Rare relic.'});
registerDaily('shoaldraft',{n:'Shoal Draft',e:'🐟',d:'Your starting deck is 10 cards drafted from today\'s seed (basics and Commons).'});
registerDaily('roughseas',{n:'Rough Seas',e:'🌊',d:'Enemies start each fight with +3 Might. You start each fight with 2 Might.'});
registerDaily('lowvis',{n:'Low Visibility',e:'🌫️',d:'The map hides every non-boss node as ? until you stand next to it.'});
registerDaily('calmwaters',{n:'Calm Waters',e:'🕊️',d:'No elites on the map. Bosses have 20% more HP.',
 mod:{enemyHp(m,ctx,v){return ctx.boss?Math.round(v*1.2):v}}});
registerDaily('riches',{n:'Riches',e:'💰',d:'Double gold earned. Temper at camps is unavailable.',
 mod:{goldGain(m,ctx,v){return Math.round(v*2)},campOptions(m,ctx,o){return (o||[]).filter(x=>x.k!=='temper')}}});
registerDaily('deeppockets',{n:'Deep Pockets',e:'🎒',d:'4 potion slots. Potion drop chance starts 20% lower.'});
registerDaily('barnacledrun',{n:'Barnacled Run',e:'🦪',d:'A random curse at the start of each act. Start with 2 random Common relics.'});
registerDaily('crosscurrent',{n:'Crosscurrent',e:'🔀',d:'Card rewards may include another class\'s card in one of the three slots.'});
registerDaily('glasshull',{n:'Glass Hull',e:'🪞',d:'Max HP halved. Mend at camps heals to full.',
 mod:{mendFrac(m,ctx,v){return 1}}});
registerDaily('echotide',{n:'Echo Tide',e:'🔔',d:'Every class Echoes (repeats a marked/last card at end of turn, cap 1).',
 mod:{echoCap(m,ctx,v){return Math.min(v,1)},allEcho(){return true}}});
registerDaily('fairtrade',{n:'Fair Trade',e:'⚖️',d:'Merchants restock after every purchase. Card removal is free once per act.',
 mod:{scrubPrice(m,ctx,v){const a=(W.run&&W.run.act)||1;if(W.run&&W.run.fairFree&&!W.run.fairFree[a])return 0;return v}}});

export function hasDaily(id){return !!(W.run&&W.run.mods&&W.run.mods.includes(id))}
export function markFairRemoveUsed(){if(!W.run||!W.run.fairFree)return;W.run.fairFree[W.run.act||1]=1}
