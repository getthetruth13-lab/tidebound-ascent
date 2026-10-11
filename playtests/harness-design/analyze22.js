// v2.2 analysis: node analyze22.js <file.jsonl> [--json]. Per class: win, fights by kind (turns, HP lost), mechanic rates, items.
const fs=require('fs');const f=process.argv[2];const J=process.argv.includes('--json');
const rows=fs.readFileSync(f,'utf8').trim().split('\n').map(l=>JSON.parse(l)).filter(r=>!r.error);
const by={};for(const r of rows)(by[r.cls]=by[r.cls]||[]).push(r);
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0,r1=x=>Math.round(x*10)/10;
const out={};
for(const [c,rs] of Object.entries(by)){const o={n:rs.length,win:r1(100*rs.filter(r=>r.won).length/rs.length),stall:rs.reduce((s,r)=>s+r.stall,0)};
  const F=rs.flatMap(r=>r.fights);
  for(const k of ['fight','elite','boss']){const fs_=F.filter(x=>x.kind===k&&x.won!==undefined);const won=fs_.filter(x=>x.won);
    o[k]={n:fs_.length,turns:r1(avg(won.map(x=>x.turns))),hp:r1(avg(fs_.map(x=>x.hpLost)))}}
  const per=k=>r1(avg(F.map(x=>x[k]||0)));
  o.mech={crest:per('crest'),undertow:per('undertow'),echoes:per('echoes'),echoMarked:per('echoMarked'),wpTrig:per('wpTrig'),advance:per('advance'),landmark:per('landmark'),wayAdvance:per('wayAdvance'),flourish:per('flourish'),parryTrig:per('parryTrig')};
  o.items={relics:r1(avg(rs.map(r=>(r.relics||[]).length))),potFound:r1(avg(rs.map(r=>(r.potLog||[]).length))),potUsed:r1(avg(rs.map(r=>(r.potUsed||[]).length))),
    potUsedBoss:r1(avg(rs.map(r=>(r.potUsed||[]).filter(x=>x.endsWith('@boss')).length))),potUsedElite:r1(avg(rs.map(r=>(r.potUsed||[]).filter(x=>x.endsWith('@elite')).length))),
    potUsedFight:r1(avg(rs.map(r=>(r.potUsed||[]).filter(x=>x.endsWith('@fight')).length)))};
  o.boss={};for(const b of ['bell','matriarch']){const bf=F.filter(x=>x.kind==='boss'&&x.enc===b);o.boss[b]={n:bf.length,winPct:r1(100*bf.filter(x=>x.won).length/Math.max(1,bf.length)),turns:r1(avg(bf.filter(x=>x.won).map(x=>x.turns)))}}
  const enc={};for(const x of F.filter(x=>x.kind!=='boss')){const e=enc[x.enc]=enc[x.enc]||{n:0,t:0,hp:0};e.n++;e.t+=x.turns||0;e.hp+=x.hpLost}
  o.enc=Object.fromEntries(Object.entries(enc).map(([k,v])=>[k,{n:v.n,turns:r1(v.t/v.n),hp:r1(v.hp/v.n)}]));
  out[c]=o}
if(J){console.log(JSON.stringify(out));process.exit(0)}
for(const [c,o] of Object.entries(out)){console.log(`== ${c} n=${o.n} win ${o.win}% stall ${o.stall}`);
  for(const k of ['fight','elite','boss'])console.log(`  ${k}: n=${o[k].n} turns ${o[k].turns} hp ${o[k].hp}`);
  console.log('  mech',JSON.stringify(o.mech));console.log('  items',JSON.stringify(o.items));console.log('  boss',JSON.stringify(o.boss));
  console.log('  enc',Object.entries(o.enc).map(([k,v])=>`${k}:${v.turns}t/${v.hp}hp`).join(' '))}
