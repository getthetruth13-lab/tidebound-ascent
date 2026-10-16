// ui/intent-fx.js — ONE list of what an enemy move will do, used by the intent icons above its head AND the hold/hover text,
// so nothing a move does can be left off its intent (Spencer 2026-10-12: "I got Soaked and nothing on the enemy said so").
// Each part: {k effect key, icon, n shown number, cls, txt plain sentence}. tests/intent-effects.cjs checks every enemy move's
// real effects (engine act()) against these keys; add a key here whenever act() learns a new intent field.
import {CARDS,EN} from '../core/registry.js';
import {alive,eAtk} from '../engine/combat.js';
import {W} from '../core/state.js';
const W_cls=()=>(W.run&&W.run.cls)||'';
const DEB={w:['weak','Soaked'],v:['vuln','Exposed'],brittle:['brittle','Brittle']};
const pile=p=>p==='disc'?'discard pile':p==='hand'?'hand':'draw pile';
const hits=(e,a,h)=>`${eAtk(e,a)}${h>1?' × '+h:''}`;
// Side effects shared by a move and by the wound-up move a "Charging" intent warns about.
function sideParts(e,m,p){
 for(const [f,[st,nm]] of Object.entries(DEB))if(m[f])p.push({k:f,st,icon:'debuff',n:m[f],cls:'deb',txt:`applies ${m[f]} ${nm} to you`});
 if(m.status){const c=CARDS[m.status.id];p.push({k:'status',icon:'status',n:m.status.n,cls:'deb',txt:`adds ${m.status.n} ${c?c.n:m.status.id} to your ${pile(m.status.pile)}`})}
 if(m.ring)p.push({k:'ring',icon:'ring',n:m.ring,cls:'deb',txt:`adds ${m.ring} Ringing to your discard pile`});
 if(m.drainE)p.push({k:'drainE',icon:'drain',n:'−'+m.drainE,cls:'deb',txt:`makes you lose ${m.drainE} Energy next turn`});
 if(m.stealPotion)p.push({k:'stealPotion',icon:'potion',n:'',cls:'deb',txt:'steals one of your potions'});
 if(m.steal)p.push({k:'steal',icon:'steal',n:m.steal,cls:'oth',txt:`steals ${m.steal} gold and flees`});
 return p}
export function intentParts(e,m){const p=[];if(!m)return p;
 if(m.aim)p.push({k:'aim',icon:'aim',n:'',cls:'atk',txt:'takes aim and fires next turn, ignoring half your Guard'});
 if(m.pull)p.push({k:'pull',icon:'pull',n:m.pull,cls:'deb',txt:W_cls()==='tide'?`drags your Tide down by ${m.pull}`:`strips up to ${m.pull} Guard from you`});
 if(m.a&&m.fog)p.push({k:'a',icon:'attack',n:'?',cls:'atk',txt:'attacks for a number you cannot see (never more than 26)'});
 else if(m.a)p.push({k:'a',icon:'attack',n:`${eAtk(e,m.a)}${m.h>1?'×'+m.h:''}`,cls:'atk',txt:`attacks for ${hits(e,m.a,m.h||1)}`+(m.ignoreG?' (only half your Guard blocks)':'')+(m.boom?', then bursts and dies':'')});
 else if(m.boom)p.push({k:'boom',icon:'attack',n:'',cls:'atk',txt:'bursts and dies'});
 if(m.b)p.push({k:'b',icon:'guard',n:m.fog?'?':m.b,cls:'def',txt:m.fog?'gains Guard you cannot see':`gains ${m.b} Guard`});
 if(m.s)p.push({k:'s',icon:'buff',n:'+'+m.s,cls:'buf',txt:`gains ${m.s} Might`});
 if(m.grow)p.push({k:'grow',icon:'buff',n:'+'+m.grow,cls:'buf',txt:`gives every Tendril ${m.grow} Might and grows a new one if fewer than 2`});
 if(m.floodHeal)p.push({k:'heal',icon:'heal',n:'',cls:'buf',txt:'heals itself 3 for each Soaked on you (up to 9)'});
 if(m.queenB)p.push({k:'allyB',icon:'guard',n:'+'+m.queenB,cls:'buf',txt:`gives the Wreck Queen ${m.queenB} Guard`});
 if(m.allyB)p.push({k:'allyB',icon:'guard',n:'+'+m.allyB,cls:'buf',txt:`gives every ally ${m.allyB} Guard`});
 if(m.allyS)p.push({k:'allyS',icon:'buff',n:'+'+m.allyS,cls:'buf',txt:`gives every ally ${m.allyS} Might`});
 if(m.heal)p.push({k:'heal',icon:'heal',n:m.heal,cls:'buf',txt:`heals itself for ${m.heal}`});
 if(m.healAlly){const t=alive().find(x=>x.uid===m.tgt);p.push({k:'healAlly',icon:'heal',n:t?m.healAlly:5,cls:'buf',txt:t?`heals ${t.n} for ${m.healAlly}`:'heals itself for 5'})}
 if(m.summon){const n=m.n||1;p.push({k:'summon',icon:'summon',n:n>1?'×'+n:'',cls:'oth',txt:`summons ${n} ${EN[m.summon]?EN[m.summon].n:m.summon}${m.max?' (up to '+m.max+' alive)':''}`})}
 if(m.muffle)p.push({k:'muffle',icon:'muffle',n:'',cls:'deb',txt:'silences your most expensive card next turn'});
 if(m.seize)p.push({k:'seize',icon:'seize',n:'',cls:'deb',txt:'seizes your cheapest card until it dies'});
 // Act 3 (ACT3-RULES)
 if(m.discharge)p.push({k:'discharge',icon:'charge',n:'',cls:'atk',txt:'discharges its Charge'+(m.status?'':'')});
 if(m.gust)p.push({k:'gust',icon:'gust',n:m.gust,cls:'deb',txt:`blows ${m.gust} card${m.gust>1?'s':''} from your hand back onto your draw pile next turn`});
 if(m.numb)p.push({k:'numb',icon:'numb',n:'',cls:'deb',txt:'makes your cheapest card cost 1 more next turn'});
 if(m.tide)p.push({k:'tide',icon:'tide',n:'',cls:'deb',txt:'Storm Tide: your Surge, Recede or first Guard card is 1 weaker next turn'});
 if(m.dive)p.push({k:'dive',icon:'dive',n:'',cls:'oth',txt:'dives into the cloud: only area damage and Bleed reach it next turn'});
 if(m.surface)p.push({k:'surface',icon:'dive',n:'',cls:'atk',txt:'breaks the surface'});
 if(m.tail)p.push({k:'tail',icon:'tail',n:'+'+m.tail,cls:'buf',txt:`Tailwind: its allies' next attack hits ${m.tail} harder`});
 if(m.brittleLast)p.push({k:'brittleLast',icon:'debuff',n:'',cls:'deb',txt:'the last hit makes you Brittle'});
 if(m.link)p.push({k:'link',icon:'link',n:'+2',cls:'atk',txt:'linked with its twin: +2 per hit while both live'});
 if(m.retrieve)p.push({k:'retrieve',icon:'pass',n:'',cls:'buf',txt:'retrieves the dropped Deep Shard'});
 if(m.lure)p.push({k:'lure',icon:'lure',n:'',cls:'oth',txt:'offers a golden light: you choose next turn'});
 if(m.cleanse)p.push({k:'cleanse',icon:'heal',n:'',cls:'buf',txt:'snuffs the burning on an ally'});
 sideParts(e,m,p);
 if(m.charge&&m.warn){const w=m.warn,extra=sideParts(e,w,[]),words=[];if(w.a)words.push(`attacks for ${hits(e,w.a,w.h||1)}`);words.push(...extra.map(x=>x.txt));
  p.push({k:'warn',icon:'unknown',n:`⏳ ${w.a?eAtk(e,w.a)+((w.h||1)>1?'×'+w.h:''):''}`,cls:'atk',extra,txt:`next turn it ${words.join(' and ')}${w.lbl?' ('+w.lbl+')':''}`})}
 return p}
const DEB_ICON={weak:['status','weak','💧'],vuln:['status','vuln','🎯'],brittle:['status','brittle','🧊']};
export const debIcon=k=>DEB_ICON[k];
// "Attacks for 7 and applies 2 Soaked to you." — the plain sentence for the hold/hover tooltip.
export function intentSentence(e,m){const ps=intentParts(e,m).map(x=>x.txt);if(!ps.length)return m&&m.none?'Does nothing this turn.':'';
 let s=ps.length>1?ps.slice(0,-1).join(', ')+' and '+ps[ps.length-1]:ps[0];if(m.charge&&!m.a)s='Winds up: '+s;return s.charAt(0).toUpperCase()+s.slice(1)+'.'}
