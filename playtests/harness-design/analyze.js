// DESIGN SIM analysis.  node analyze.js <file-stem> [--json]
const fs=require('fs');const stem=process.argv[2];
const rows=fs.readFileSync(__dirname+'/results/'+stem+'.jsonl','utf8').trim().split('\n').map(JSON.parse);
const errs=rows.filter(r=>r.error);if(errs.length){console.log('ERRORS',errs.length,errs[0].error);}
const CL=['tide','echo','carto','duel'];const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;const f1=x=>isNaN(x)?'-':x.toFixed(1);const pct=x=>(100*x).toFixed(1)+'%';
const OUT={};
for(const c of CL){const rs=rows.filter(r=>r.cls===c&&!r.error);if(!rs.length)continue;const w=rs.filter(r=>r.won);const all=rs.flatMap(r=>r.fights);
 const o=OUT[c]={n:rs.length,win:w.length/rs.length};
 const deaths={};rs.filter(r=>!r.won).forEach(r=>{const f=r.fights[r.fights.length-1];const k=f?f.enc:'?';deaths[k]=(deaths[k]||0)+1});o.deaths=deaths;
 for(const k of ['fight','elite','boss']){const x=all.filter(f=>f.kind===k);o[k]={n:x.length,turns:avg(x.map(f=>f.turns)),hp:avg(x.map(f=>f.hpLost))}}
 const sum=(fs_,k)=>fs_.reduce((s,f)=>s+(f[k]||0),0);const dsum=(fs_,src)=>fs_.reduce((s,f)=>s+(f.dmg[src]||0),0);const dtot=fs_=>fs_.reduce((s,f)=>s+Object.values(f.dmg).reduce((a,b)=>a+b,0),0);
 const btot=fs_=>fs_.reduce((s,f)=>s+Object.values(f.blk).reduce((a,b)=>a+b,0),0);const bsum=(fs_,src)=>fs_.reduce((s,f)=>s+(f.blk[src]||0),0);
 const boss=all.filter(f=>f.kind==='boss');const N=all.length;
 if(c==='duel'){o.flourishPerFight=sum(all,'flourish')/N;o.flourishPerBoss=sum(boss,'flourish')/Math.max(1,boss.length);o.avgFlourishMom=sum(all,'flourishMom')/Math.max(1,sum(all,'flourish'));
   o.fightsWith0Flourish=all.filter(f=>!f.flourish).length/N;o.flourishDmgShare=dsum(all,'flourish')/dtot(all);o.flourishDmgShareBoss=dsum(boss,'flourish')/Math.max(1,dtot(boss));
   o.parryShare=dsum(all,'parry')/dtot(all);o.parryTrig=sum(all,'parryTrig')/N;o.momLost=sum(all,'momLost')/N;
   // main damage source in boss fights: compare flourish-flagged card damage vs largest single card's damage is n/a; report share
 }
 if(c==='tide'){o.crest=sum(all,'crest')/N;o.undertow=sum(all,'undertow')/N;o.crestBoss=sum(boss,'crest')/Math.max(1,boss.length);o.undertowBoss=sum(boss,'undertow')/Math.max(1,boss.length);
   o.enterHigh=sum(all,'enterHigh')/N;o.enterLow=sum(all,'enterLow')/N;o.tideturn=sum(all,'tideturn')/N;o.bonusPlays=sum(all,'tideBonus')/N;
   o.tideDmgShare=dsum(all,'tide')/dtot(all);o.tideBlkShare=bsum(all,'tide')/btot(all)}
 if(c==='echo'){o.echoShare=dsum(all,'echo')/dtot(all);o.echoBlkShare=bsum(all,'echo')/btot(all);o.marked=sum(all,'echoMarked')/N;o.fallback=sum(all,'echoFallback')/N;
   o.markRate=sum(all,'echoMarked')/Math.max(1,sum(all,'echoMarked')+sum(all,'echoFallback'));o.avgBonus=sum(all,'echoBonus')/Math.max(1,sum(all,'echoMarked'))}
 if(c==='carto'){o.wpTrig=sum(all,'wpTrig')/N;o.wpDmgShare=dsum(all,'wp')/dtot(all);o.wpBlkShare=bsum(all,'wp')/btot(all);o.advance=sum(all,'advance')/N;o.landmarks=sum(all,'landmark')/N;o.avgRankAtTrig=sum(all,'wpRankTrig')/Math.max(1,sum(all,'wpTrig'));
   o.wpDmgShareBoss=dsum(boss,'wp')/Math.max(1,dtot(boss));o.wpBlkShareBoss=bsum(boss,'wp')/Math.max(1,btot(boss))}
 // core-rule decided fights (share >= 30% of dmg+block)
 const mk={tide:['tide'],echo:['echo'],carto:['wp'],duel:['flourish','parry']}[c];
 const dec=r=>r.fights.filter(f=>{const d=Object.values(f.dmg).reduce((s,x)=>s+x,0)+Object.values(f.blk).reduce((s,x)=>s+x,0);let m=0;mk.forEach(k=>{m+=(f.dmg[k]||0)+(f.blk[k]||0)});return d>0&&m/d>=0.3}).length;
 o.decidedPerRun=avg(rs.map(dec));o.winRunsPassing=w.filter(r=>dec(r)>=3).length/Math.max(1,w.length);
}
if(process.argv[3]==='--json'){console.log(JSON.stringify(OUT));return}
for(const [c,o] of Object.entries(OUT)){console.log(`== ${c} n=${o.n} WIN ${pct(o.win)} | fight ${f1(o.fight.turns)}t -${f1(o.fight.hp)} | elite ${f1(o.elite.turns)}t -${f1(o.elite.hp)} | boss ${f1(o.boss.turns)}t -${f1(o.boss.hp)} (n${o.boss.n})`);
 console.log('   deaths',JSON.stringify(o.deaths));const ex=Object.entries(o).filter(([k,v])=>typeof v==='number'&&!['n','win'].includes(k)).map(([k,v])=>k+'='+(v<1.5&&/Share|Rate|With0|Passing/.test(k)?pct(v):f1(v)));console.log('   ',ex.join(' '))}
