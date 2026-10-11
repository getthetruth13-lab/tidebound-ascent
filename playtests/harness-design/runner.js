// DESIGN SIM runner.  node runner.js <strong|novice|boss|boss_novice|relics|pots> [N] [tag]
// ITEMS=off: no item rewards (v2.1-style runs). relics/pots: each item forced at the start (pots: 2 copies), seeds 1..N (pair with strong_<tag>).
// Optional OVER='{"core":{...}}' deep-merges over data-v2.json v21.sim (for tuning sweeps; final numbers live in tools/design/rules_v21.py).
const {fork}=require('child_process');const fs=require('fs');const path=require('path');
const CL=process.env.CLS?process.env.CLS.split(','):['tide','echo','carto','duel'];
const TOP={tide:['lash','breaker'],echo:['feedback','delay'],carto:['camp','landslide'],duel:['slash','counter']};
function tasks(exp,N){const t=[];const nov=exp.includes('novice');
 const base=()=>({novice:nov,...(process.env.ITEMS==='off'?{items:false}:{})});
 if(exp==='strong'||exp==='novice')for(const c of CL)for(let s=1;s<=N;s++)t.push({type:'run',cls:c,seed:s,opts:base()});
 // v2.2 item impact: every modelled relic (class relics for their own class) / potion forced at the start, paired seeds
 if(exp==='relics'||exp==='pots'){const sim=JSON.parse(fs.readFileSync(process.env.SIMDATA||path.join(__dirname,'../../design/data-v2.json'))).v21.sim.items;
   const only=process.env.ONLY?process.env.ONLY.split(','):null;
   for(const c of CL)for(const it of (exp==='relics'?sim.relics:sim.potions)){if(it.cls!=='any'&&it.cls!==c)continue;if(only&&!only.includes(it.id))continue;
     for(let s=1;s<=N;s++)t.push({type:'run',cls:c,seed:s,opts:exp==='relics'?{relics:[it.id],tag:it.id}:{pots:[it.id,it.id],tag:it.id}})}}
 if(exp.startsWith('boss'))for(const c of CL)for(const extra of [[],TOP[c]])for(let s=1;s<=N;s++)t.push({type:'g',cls:c,seed:30000+s,kind:'boss',enc:['bell'],deck:'starter+'+extra.join('+'),extra,opts:{novice:nov}});
 return t}
if(process.argv[2]==='--worker'){const {load}=require('./loader');const over=process.env.OVER?JSON.parse(process.env.OVER):null;const g=load(over);
 process.on('message',m=>{if(m.done)process.exit(0);const out=[];for(const t of m.batch){let r;try{
   if(t.type==='run'){r=g.playRun(t.cls,t.seed,t.opts);delete r.offersRaw}
   else{const deck=g.G?null:null;const st=g.SIMSTARTER(t.cls).concat(t.extra);r=g.playGauntlet(t.cls,t.seed,t.kind,t.enc,st,t.opts);r.cls=t.cls;r.seed=t.seed;r.gkind=t.kind;r.deckName=t.deck}
   r.exp=t.opts}catch(e){r={error:String(e.stack||e),task:t}}out.push(JSON.stringify(r))}process.send({out})});return}
const exp=process.argv[2],N=+process.argv[3]||50,tag=process.argv[4]||'';const all=tasks(exp,N);fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});
const fn=path.join(__dirname,'results',exp+(tag?'_'+tag:'')+'.jsonl');const f=fs.createWriteStream(fn);let i=0,done=0;const t0=Date.now();const W=+process.env.W||8;
for(let w=0;w<W;w++){const p=fork(__filename,['--worker']);const next=()=>{if(i>=all.length){p.send({done:1});return}const b=all.slice(i,i+4);i+=4;p.send({batch:b})};
 p.on('message',m=>{m.out.forEach(l=>f.write(l+'\n'));done+=m.out.length;next()});
 p.on('exit',()=>{if(done>=all.length&&!f.closed){f.end();console.error('finished',exp,tag,done,((Date.now()-t0)/1000|0)+'s')}});next()}
