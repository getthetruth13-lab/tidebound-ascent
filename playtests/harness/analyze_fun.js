const fs=require('fs');const pct=x=>(100*x).toFixed(0)+'%';const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
const STARTER={tide:['splash','brace','riptide','still'],echo:['arc','shimmer','reverb','hum'],carto:['cstrike','tent','survey','signal'],duel:['thrust','parry','lunge','footwork']};
for(const c of ['tide','echo','carto','duel']){const {runs,D}=JSON.parse(fs.readFileSync(`results/decisions_${c}.json`));
 const line=(lbl,T)=>{if(!T.length)return;const rounds=T.map(t=>t.round).filter(x=>x!=null);const sr=rounds.slice().sort((a,b)=>a-b);
  console.log(`${c.padEnd(6)}${lbl.padEnd(7)} turns=${String(T.length).padStart(4)} options=${avg(T.map(t=>t.nFirst)).toFixed(1)} mustChoose(handCost>energy)=${pct(avg(T.map(t=>+(t.handCost>t.energy))))} `+
  `obvious(gap>=5 or 1 option)=${pct(avg(T.map(t=>+(t.nFirst<2||t.gap>=5))))} nearTie(gap<1)=${pct(avg(T.map(t=>+(t.nFirst>1&&t.gap<1))))} noviceSameFirstCard=${pct(avg(T.map(t=>+(t.best===t.novice))))} `+
  `cardsPlayed=${avg(T.map(t=>t.seqLen)).toFixed(1)} dmg/round med=${sr[sr.length>>1]} p90=${sr[Math.floor(sr.length*.9)]} max=${sr[sr.length-1]} rounds>=30dmg=${pct(avg(rounds.map(x=>+(x>=30))))}`)};
 line('all',D);line('fight',D.filter(t=>t.kind==='fight'));line('elite',D.filter(t=>t.kind==='elite'));line('boss',D.filter(t=>t.kind==='boss'));
 const sets=runs.map(r=>new Set(r.deck.map(x=>x.replace('+','')).filter(x=>!STARTER[c].includes(x))));let J=[];
 for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++){const a=sets[i],b=sets[j];const inter=[...a].filter(x=>b.has(x)).length;const uni=new Set([...a,...b]).size;if(uni)J.push(inter/uni)}
 console.log(`${c.padEnd(6)} deck variety: distinct non-starter cards per deck ${avg(sets.map(s=>s.size)).toFixed(1)}, mean pairwise Jaccard ${avg(J).toFixed(2)}, win ${pct(avg(runs.map(r=>+r.won)))}`)}
