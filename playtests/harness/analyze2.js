const fs=require('fs');const R=e=>{try{return fs.readFileSync(__dirname+'/results/'+e+'.jsonl','utf8').trim().split('\n').map(JSON.parse).filter(r=>!r.error)}catch(x){return[]}};
const CL=['tide','echo','carto','duel'];const pct=x=>(100*x).toFixed(1)+'%';const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;const f1=x=>isNaN(x)?'-':x.toFixed(1);
const which=process.argv[2];
if(which==='cards'){for(const ex of ['cards','cards_novice']){const rows=R(ex);if(!rows.length)continue;console.log('\n### '+ex);
 for(const c of CL){const rs=rows.filter(r=>r.cls===c);const base=rs.filter(r=>!r.card);const bw=avg(base.map(r=>+r.won));const bh=avg(base.map(r=>r.won?r.hp:0));
  const ids=[...new Set(rs.map(r=>r.card).filter(Boolean))];
  const lines=ids.map(id=>{const x=rs.filter(r=>r.card===id);const w=avg(x.map(r=>+r.won));const se=Math.sqrt(w*(1-w)/x.length+bw*(1-bw)/base.length);return {id,n:x.length,w,d:w-bw,se,hp:avg(x.map(r=>r.won?r.hp:0)),fl:avg(x.map(r=>r.floor))}}).sort((a,b)=>b.d-a.d);
  console.log(`${c}: baseline(no extra) n=${base.length} win ${pct(bw)} avgEndHP ${f1(bh)}`);
  lines.forEach(l=>console.log(`   +${l.id.padEnd(11)} win ${pct(l.w)} delta ${(l.d>=0?'+':'')+(100*l.d).toFixed(1)}pp (±${(196*l.se).toFixed(1)}) endHP ${f1(l.hp)}`))}}}
if(which==='gauntlet'){for(const ex of ['gauntlet','gauntlet_novice']){const rows=R(ex);if(!rows.length)continue;console.log('\n### '+ex+' (starter deck, full HP)');
 const encs=[...new Set(rows.map(r=>r.enc))];console.log('enc'.padEnd(16)+CL.map(c=>c.padEnd(26)).join(''));
 for(const e of encs){let line=e.padEnd(16);for(const c of CL){const x=rows.filter(r=>r.cls===c&&r.enc===e);line+=`${pct(avg(x.map(r=>+r.won))).padStart(6)} ${f1(avg(x.map(r=>r.turns))).padStart(4)}t -${f1(avg(x.map(r=>r.hpLost))).padStart(4)}hp`.padEnd(26)}console.log(line)}}}
if(which==='boss'){for(const ex of ['bossdeck','bossdeck_novice']){const rows=R(ex);if(!rows.length)continue;console.log('\n### '+ex+' (full HP vs Leviathan Bell)');
 for(const c of CL){for(const d of [...new Set(rows.filter(r=>r.cls===c).map(r=>r.deckName))]){const x=rows.filter(r=>r.cls===c&&r.deckName===d);const w=x.filter(r=>r.won);
  console.log(`${c.padEnd(6)} ${d.padEnd(26)} n=${x.length} win ${pct(w.length/x.length)} turns ${f1(avg(x.map(r=>r.turns)))} hpLost(wins) ${f1(avg(w.map(r=>r.hpLost)))}`)}}}}
