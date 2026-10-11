// DESIGN SIM loader: frozen v1 engine (../harness/game-snapshot.html) + v2.1 rules (rules.js, numbers from
// design/data-v2.json → v21.sim) + world.js (v2.2 Act 1 roster) + items.js (relics/potions) + adapted playtest AI (ai.js). Never touches src/ or the live game.
const fs=require('fs'),vm=require('vm'),path=require('path');
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const DATA=process.env.SIMDATA||path.join(__dirname,'../../design/data-v2.json');
function load(over){
  const html=fs.readFileSync(path.join(__dirname,'../harness/game-snapshot.html'),'utf8');
  const m=html.match(/<script>([\s\S]*?)<\/script>/);
  let sim=JSON.parse(fs.readFileSync(DATA,'utf8')).v21.sim;
  if(over)sim=deepMerge(sim,over);
  const rd=f=>fs.readFileSync(path.join(__dirname,f),'utf8');const rules=rd('rules.js')+'\n'+rd('world.js')+'\n'+rd('items.js'),ai=rd('ai.js');
  const el={innerHTML:'',querySelector:()=>null,scrollIntoView(){}};const rnd={f:mulberry32(1)};
  const MathX=Object.create(Math);MathX.random=()=>rnd.f();
  const ctx={console,structuredClone,Date,JSON,Object,Array,Number,String,Error,Set,Map,Math:MathX,
    document:{getElementById:()=>el,querySelectorAll:()=>[]},setTimeout:(f)=>f()};
  ctx.window=ctx;ctx.FAST=1;vm.createContext(ctx);
  vm.runInContext(m[1]+'\n;render=function(){};\nvar SIMD='+JSON.stringify(sim)+';\n'+rules+'\n;var SIMNOVX='+(process.env.NOVX||'null')+';\n'+ai,ctx,{filename:'game+rules+ai.js'});
  ctx.__seed=s=>{rnd.f=mulberry32(s)};return ctx}
function deepMerge(a,b){if(typeof b!=='object'||b===null||Array.isArray(b))return b;const o=Object.assign({},a);for(const k in b)o[k]=deepMerge(a?a[k]:undefined,b[k]);return o}
module.exports={load};
