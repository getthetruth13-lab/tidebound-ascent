// node analyze.js <exp> -> summary stats as JSON-ish text
const fs=require('fs');const exp=process.argv[2];
const rows=fs.readFileSync(__dirname+'/results/'+exp+'.jsonl','utf8').trim().split('\n').map(JSON.parse);
const CL=['tide','echo','carto','duel'];const pct=x=>(100*x).toFixed(1)+'%';const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const med=a=>{const s=a.slice().sort((x,y)=>x-y);return s.length?s[s.length>>1]:NaN};const f1=x=>isNaN(x)?'-':x.toFixed(1);
const errs=rows.filter(r=>r.error);if(errs.length)console.log('ERRORS',errs.length,errs[0].error);
for(const c of CL){const rs=rows.filter(r=>r.cls===c&&!r.error);if(!rs.length)continue;const w=rs.filter(r=>r.won);
 const fl={};rs.filter(r=>!r.won).forEach(r=>{fl[r.floor]=(fl[r.floor]||0)+1});
 const deaths={};rs.filter(r=>!r.won).forEach(r=>{const f=r.fights[r.fights.length-1];const k=f?f.kind+':'+f.enc:'?';deaths[k]=(deaths[k]||0)+1});
 console.log(`\n== ${c}: runs ${rs.length} wins ${w.length} (${pct(w.length/rs.length)}) stalls ${rs.reduce((s,r)=>s+r.stall,0)} | winHP avg ${f1(avg(w.map(r=>r.hp)))} | deck size avg ${f1(avg(rs.map(r=>r.deck.length)))}`);
 console.log('  death floor dist:',JSON.stringify(fl));console.log('  death cause:',JSON.stringify(deaths));
 const all=rs.flatMap(r=>r.fights);
 for(const k of ['fight','elite','boss']){const fs_=all.filter(f=>f.kind===k);const won=fs_.filter(f=>f.won);
  console.log(`  ${k}: n=${fs_.length} lost=${fs_.length-won.length} turns avg ${f1(avg(fs_.map(f=>f.turns)))} med ${med(fs_.map(f=>f.turns))} | hpLost avg ${f1(avg(fs_.map(f=>f.hpLost)))} med ${med(fs_.map(f=>f.hpLost))}`)}
 const byEnc={};all.forEach(f=>{(byEnc[f.enc+(f.kind==='fight'&&f.floor<=3?' (f1-3)':'')]=byEnc[f.enc+(f.kind==='fight'&&f.floor<=3?' (f1-3)':'')]||[]).push(f)});
 for(const [e,fs_] of Object.entries(byEnc).sort()){console.log(`    ${e.padEnd(22)} n=${String(fs_.length).padStart(4)} deaths=${fs_.filter(f=>!f.won).length} turns ${f1(avg(fs_.map(f=>f.turns)))} hpLost avg ${f1(avg(fs_.map(f=>f.hpLost)))} p90 ${fs_.map(f=>f.hpLost).sort((a,b)=>a-b)[Math.floor(fs_.length*0.9)]}`)}
 // mechanic share
 const src={},blk={};let crest=0,und=0,tb=0,ech=0,wp=0,flo=0,par=0,foc=0;all.forEach(f=>{for(const k in f.dmg)src[k]=(src[k]||0)+f.dmg[k];for(const k in f.blk)blk[k]=(blk[k]||0)+f.blk[k];crest+=f.crest;und+=f.undertow;tb+=f.tideBonus;ech+=f.echoes;wp+=f.wpTrig;flo+=f.flourish;par+=f.parryTrig;foc+=f.focusBonus||0});
 const td=Object.values(src).reduce((s,x)=>s+x,0),tbk=Object.values(blk).reduce((s,x)=>s+x,0);
 console.log('  dmg share:',Object.entries(src).map(([k,v])=>k+' '+pct(v/td)).join(', '),'| blk share:',Object.entries(blk).map(([k,v])=>k+' '+pct(v/tbk)).join(', '));
 console.log(`  per fight: crest ${f1(crest/all.length)} undertow ${f1(und/all.length)} tideBonusPlays ${f1(tb/all.length)} echoes ${f1(ech/all.length)} wpTriggers ${f1(wp/all.length)} flourish ${f1(flo/all.length)} parryTrig ${f1(par/all.length)} focusBonusDmg ${f1(foc/all.length)} (focus share ${pct(foc/td)})`);
 // core-rule-decided fights: mechanic dmg+blk share >= 30% of the fight's total
 const mk={tide:['tide'],echo:['echo'],carto:['wp'],duel:['flourish','parry']}[c];
 const decided=r=>r.fights.filter(f=>{const d=Object.values(f.dmg).reduce((s,x)=>s+x,0)+Object.values(f.blk).reduce((s,x)=>s+x,0);let m=0;mk.forEach(k=>{m+=(f.dmg[k]||0)+(f.blk[k]||0)});if(c==='duel')m=m-(f.dmg.flourish||0)/2+(f.focusBonus||0);return d>0&&m/d>=0.3}).length;
 console.log(`  core-rule share>=30% fights per run: avg ${f1(avg(rs.map(decided)))}; winning runs with >=3 such fights: ${w.filter(r=>decided(r)>=3).length}/${w.length}`);
 // picks
 const offered={},picked={},pw={};rs.forEach(r=>r.offers.forEach(o=>{o.cards.forEach(id=>offered[id]=(offered[id]||0)+1);if(o.picked){picked[o.picked]=(picked[o.picked]||0)+1}}));
 const inDeck={};rs.forEach(r=>{new Set(r.deck.map(x=>x.replace('+',''))).forEach(id=>{(inDeck[id]=inDeck[id]||[0,0]);inDeck[id][0]++;if(r.won)inDeck[id][1]++})});
 console.log('  card: inDeck runs / winrate when in deck / plays per run:');
 const plays={};rs.forEach(r=>{for(const k in r.plays)plays[k]=(plays[k]||0)+r.plays[k]});
 console.log('   '+Object.entries(inDeck).sort((a,b)=>b[1][1]/b[1][0]-a[1][1]/a[1][0]).map(([id,[n,wn]])=>`${id} ${n}/${pct(wn/n)}/${f1((plays[id]||0)/rs.length)}`).join(' | '));
}
