// Variety measurement: node tools/variety.js [runsPerClass=50]. Plays seeded Act 1 runs headless (no combat) and reports repetition.
const {chromium}=require('playwright');const {start}=require('../tests/util.js');
(async()=>{const N=+process.argv[2]||50;const srv=await start(0);const b=await chromium.launch();
const pg=await (await b.newContext({serviceWorkers:'block'})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto(srv.url+'index.html');await pg.waitForFunction(()=>window.G);
const out=await pg.evaluate(N=>{window.FAST=1;const G=window.G,RN=G.run$;const res={};
 const sh=a=>JSON.stringify(a);
 for(const cls of ['tide','echo','carto','duel']){const runs=[];
  for(let s=1;s<=N;s++){const seed=s*7919+["tide","echo","carto","duel"].indexOf(cls)*104729;RN.newRun(cls,{seed,skipTravel:1});const run=G.run;let pr=seed>>>0;const rr=()=>{pr=(pr+0x6D2B79F5)>>>0;let t=pr;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
   const o={seed,boss:run.boss,types:[],enc:[],events:[],cards:[],relics:[],shops:[],pots:[],chests:[],map:run.map.map(r=>r.map(n=>n.t[0]).join('')).join('|'),
    rows:{elite:[],rest:[],shop:[],treasure:[]},widths:run.map.map(r=>r.length)};
   run.map.forEach((r,i)=>r.forEach(n=>{if(o.rows[n.t])o.rows[n.t].push(i+1)}));
   let guard=0;while(G.run.pos.r<13&&guard++<40){const r=G.run.pos.r+1;const av=r===0?G.run.map[0].map((_,i)=>i):RN.reachable();const i=av[Math.floor(rr()*av.length)];
    RN.goNode(r,i);const n=run.map[r][i];o.types.push(n.t);
    for(let k=0;k<3&&G.cb;k++){}
    if(G.cb){o.enc.push(G.cb.ens.map(e=>e.key).join('+'));const t=n.t==='elite'?'elite':'fight';W.cb=null;try{RN.combatRewards(t,{cb:{ens:[]}})}catch(e){}
     const rw=G.S.rows||[];rw.forEach(x=>{if(x.k==='cards')o.cards.push(x.cards.join(','));if(x.k==='relic')o.relics.push(x.id);if(x.k==='potion')o.pots.push(x.id)})}
    else if(G.S.screen==='event')o.events.push(G.S.ev.id);
    else if(G.S.screen==='shop')o.shops.push([...G.S.cards,...G.S.colorless,...G.S.relics,...G.S.potions].map(x=>x.id).join(','));
    else if(G.S.screen==='chest')o.chests.push(G.S.rows.map(x=>x.id||x.n).join(','));
    W.S={screen:"map"};}
   runs.push(o)}
  res[cls]=runs}
 return res},N);
const uniq=a=>new Set(a).size;const sum=a=>a.reduce((x,y)=>x+y,0);const rep=[];
const P=(k,v)=>rep.push(k.padEnd(52)+v);
for(const cls of Object.keys(out)){const R=out[cls];rep.push('== '+cls+' ('+R.length+' runs)');
 P('unique map layouts',uniq(R.map(r=>r.map))+'/'+R.length);
 P('unique node-type paths walked',uniq(R.map(r=>r.types.join(''))) +'/'+R.length);
 P('unique encounter sequences',uniq(R.map(r=>r.enc.join('>')))+'/'+R.length);
 P('same-encounter repeats per run (avg)',(sum(R.map(r=>r.enc.length-uniq(r.enc)))/R.length).toFixed(2));
 P('bosses (bell/matriarch)',['bell','matriarch'].map(b=>R.filter(r=>r.boss===b).length).join('/'));
 P('first-fight encounter distribution',JSON.stringify(R.reduce((m,r)=>(m[r.enc[0]]=(m[r.enc[0]]||0)+1,m),{})));
 P('events per run (avg) / dup events per run',(sum(R.map(r=>r.events.length))/R.length).toFixed(2)+' / '+(sum(R.map(r=>r.events.length-uniq(r.events)))/R.length).toFixed(2));
 P('distinct events seen across all runs',uniq(R.flatMap(r=>r.events)));
 P('elite rows: avg count / distinct first-elite rows',(sum(R.map(r=>r.rows.elite.length))/R.length).toFixed(1)+' / '+uniq(R.map(r=>r.rows.elite[0])));
 P('rest rows: avg count / distinct first-rest rows',(sum(R.map(r=>r.rows.rest.length))/R.length).toFixed(1)+' / '+uniq(R.map(r=>r.rows.rest[0])));
 P('shop rows: avg count / maps with 0 shops',(sum(R.map(r=>r.rows.shop.length))/R.length).toFixed(1)+' / '+R.filter(r=>!r.rows.shop.length).length);
 P('maps with elite on row<=5 (walkable by path-agnostic)',R.filter(r=>r.rows.elite.some(x=>x<=5)).length);
 P('avg map width / identical-width-profile maps',(sum(R.map(r=>sum(r.widths)))/R.length/14).toFixed(2)+' / '+uniq(R.map(r=>r.widths.join('')))+' distinct');
 P('first card reward: dup card in consecutive rewards (runs)',R.filter(r=>r.cards.some((c,i)=>i&&c.split(',').some(x=>r.cards[i-1].split(',').includes(x)))).length);
 P('same card offered >=3 times in a run (runs)',R.filter(r=>{const m={};r.cards.forEach(c=>c.split(',').forEach(x=>m[x]=(m[x]||0)+1));return Object.values(m).some(v=>v>=3)}).length);
 P('relic dup within run',sum(R.map(r=>r.relics.length-uniq(r.relics))));
 P('shops: avg shared items between consecutive shops',(()=>{let t=0,c=0;R.forEach(r=>{for(let i=1;i<r.shops.length;i++){const a=r.shops[i-1].split(','),b=r.shops[i].split(',');t+=b.filter(x=>a.includes(x)).length;c++}});return c?(t/c).toFixed(2):'n/a'})());
 P('shop stock: runs whose card shelf duplicates a card in same shop',R.filter(r=>r.shops.some(s=>{const a=s.split(',');return a.length!==uniq(a)})).length);
 P('avg node mix per run',JSON.stringify(R.reduce((m,r)=>(r.types.forEach(t=>m[t]=(m[t]||0)+1/R.length),m),{}),(k,v)=>typeof v==='number'?+v.toFixed(1):v));
}
console.log(rep.join('\n'));if(errs.length)console.log('PAGE ERRORS',errs.slice(0,3));
await b.close();srv.close&&srv.close();process.exit(0)})();
