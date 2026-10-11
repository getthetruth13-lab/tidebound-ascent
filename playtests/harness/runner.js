// Usage: node runner.js <experiment> [N]   -> writes results/<experiment>.jsonl
// experiments: baseline, novice, mechoff, cards, gauntlet
const {fork}=require('child_process');const fs=require('fs');const path=require('path');
const CL=process.env.CLS?process.env.CLS.split(','):['tide','echo','carto','duel'];
const POOLS={tide:['swell','ebb','breaker','shoal','spray','undercur','lash','sinking','moonpull','pressure','slack','whirl','spring','neap','tsunami'],
 echo:['ping','mirror','afterimg','lownote','crackle','prism','cascade','feedback','delay','overtone','recall','amplify','standing','silence','crescendo'],
 carto:['plot','trail','bivouac','cache','lookout','shortcut','landslide','watch','waystation','triang','camp','foreknow','grand','known','finaldest'],
 duel:['jab','feint','slash','sweep','counter','bind','flurry','riposte','press','secondwind','disarm','coup','engarde','perfect','cuts']};
const ENCS=[['fight',['slug']],['fight',['gull','gull']],['fight',['wisp']],['fight',['knight']],['fight',['crab','slug']],['fight',['pod','pod','pod']],['fight',['wisp','gull']],['fight',['crab','crab']],['elite',['captain']],['elite',['warden']],['elite',['eel','eel']],['boss',['bell']]];
function tasks(exp,N){const t=[];
 if(exp==='baseline'||exp==='novice'||exp==='mechoff'||exp==='novice_mechoff')for(const c of CL)for(let s=1;s<=N;s++)t.push({type:'run',cls:c,seed:s,opts:{mech:!exp.includes('mechoff'),novice:exp.startsWith('novice')}});
 if(exp==='cards'||exp==='cards_novice')for(const c of CL)for(const id of [null,...POOLS[c]])for(let s=1;s<=N;s++)t.push({type:'run',cls:c,seed:10000+s,card:id,opts:{extra:id?[id]:[],novice:exp==='cards_novice'}});
 if(exp==='gauntlet'||exp==='gauntlet_novice')for(const c of CL)for(const [k,e] of ENCS)for(let s=1;s<=N;s++)t.push({type:'g',cls:c,seed:20000+s,kind:k,enc:e,opts:{novice:exp==='gauntlet_novice'}});
 if(exp==='bossdeck'||exp==='bossdeck_novice'){const TOP={tide:['lash','breaker'],echo:['feedback','delay'],carto:['camp','landslide'],duel:['slash','counter']};
   for(const c of CL)for(const extra of [[],TOP[c]])for(let s=1;s<=N;s++)t.push({type:'g',cls:c,seed:30000+s,kind:'boss',enc:['bell'],deck:'starter+'+extra.join('+'),extra,opts:{novice:exp==='bossdeck_novice'}})}
 if(exp.startsWith('var:')){const [_,v,who]=exp.split(':');for(const c of CL)for(let s=1;s<=N;s++)t.push({type:'run',cls:c,seed:s,opts:{variant:v,novice:who==='novice'}})}
 return t}
if(process.argv[2]==='--worker'){const {load}=require('./loader');const GS={};const getG=v=>GS[v||'']||(GS[v||'']=load(path.join(__dirname,'game-snapshot.html'),v));
 process.on('message',m=>{if(m.done)process.exit(0);const out=[];for(const t of m.batch){let r;const g=getG(t.opts&&t.opts.variant);try{
   if(t.type==='run'){r=g.playRun(t.cls,t.seed,t.opts);r.card=t.card;delete r.offersRaw}
   else{const K=g.CLASSES?null:null;const deck=t.extra?g.G.CLASSES[t.cls].starter.concat(t.extra):null;r=g.playGauntlet(t.cls,t.seed,t.kind,t.enc,deck,t.opts);r.cls=t.cls;r.seed=t.seed;r.gkind=t.kind;r.deckName=t.deck}
   r.exp=t.opts}catch(e){r={error:String(e.stack||e),task:t}}out.push(JSON.stringify(r))}process.send({out})});return}
const exp=process.argv[2],N=+process.argv[3]||50;const all=tasks(exp,N);fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});
const f=fs.createWriteStream(path.join(__dirname,'results',exp.replace(/:/g,'_')+'.jsonl'));let i=0,done=0;const t0=Date.now();const W=8;
for(let w=0;w<W;w++){const p=fork(__filename,['--worker']);const next=()=>{if(i>=all.length){p.send({done:1});return}const b=all.slice(i,i+5);i+=5;p.send({batch:b})};
 p.on('message',m=>{m.out.forEach(l=>f.write(l+'\n'));done+=m.out.length;if(done%100<5)console.error(exp,done,'/',all.length,((Date.now()-t0)/1000|0)+'s');next()});
 p.on('exit',()=>{if(done>=all.length&&!f.closed){f.end();console.error('finished',exp,done,((Date.now()-t0)/1000|0)+'s')}});next()}
