// Loads the game's inline <script> from a snapshot of index.html into a Node vm context
// with a minimal DOM stub, then appends ai.js in the SAME context so the AI can read
// the game's script-scope state (S, run, cb) and call its functions directly.
const fs=require('fs'),vm=require('vm'),path=require('path');
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function load(gamePath,variant){
  const html=fs.readFileSync(gamePath,'utf8');
  const m=html.match(/<script>([\s\S]*?)<\/script>/);if(!m)throw new Error('no script');
  const ai=fs.readFileSync(path.join(__dirname,'ai.js'),'utf8');
  const el={innerHTML:'',querySelector:()=>null,scrollIntoView(){}};
  const rnd={f:mulberry32(1)};
  const MathX=Object.create(Math);MathX.random=()=>rnd.f();
  const ctx={console,structuredClone,Date,JSON,Object,Array,Number,String,Error,Set,Map,
    Math:MathX,document:{getElementById:()=>el,querySelectorAll:()=>[]},setTimeout:(f)=>f()};
  ctx.window=ctx;ctx.FAST=1;
  vm.createContext(ctx);
  vm.runInContext(m[1]+'\n;\n'+ai+(variant?'\n;\n'+fs.readFileSync(path.join(__dirname,'variants.js'),'utf8')+'\napplyVariant('+JSON.stringify(variant)+');':''),ctx,{filename:'game+ai.js'});
  ctx.__seed=s=>{rnd.f=mulberry32(s)};
  return ctx;
}
module.exports={load};
