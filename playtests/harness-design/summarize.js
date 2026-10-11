// DESIGN SIM: writes results/summary-v2.1.json (before = Playtester's v1 runs and top-5 package; after = this sim).
// node summarize.js <strongStem> <noviceStem> [echoStrongStem echoNoviceStem]
const {execFileSync}=require('child_process');const fs=require('fs');const path=require('path');
const A=(dir,stem)=>{if(dir==='v1'){const out=execFileSync('node',[path.join(__dirname,'../harness/analyze.js'),stem]).toString();return parseV1(out)}
  return JSON.parse(execFileSync('node',[path.join(__dirname,'analyze.js'),stem,'--json']).toString())};
function parseV1(t){const o={};let c=null;for(const l of t.split('\n')){let m=l.match(/^== (\w+): runs (\d+) wins \d+ \(([\d.]+)%/);if(m){c=m[1];o[c]={win:+m[3]/100};continue}
  if(!c)continue;m=l.match(/^  (fight|elite|boss): n=\d+ lost=\d+ turns avg ([\d.]+) .*hpLost avg ([\d.]+)/);if(m)o[c][m[1]]={turns:+m[2],hp:+m[3]};
  m=l.match(/per fight: crest ([\d.]+) undertow ([\d.]+) tideBonusPlays [\d.]+ echoes ([\d.]+) wpTriggers ([\d.]+) flourish ([\d.]+)/);if(m)Object.assign(o[c],{crest:+m[1],undertow:+m[2],echoes:+m[3],wpTrig:+m[4],flourish:+m[5]});
  m=l.match(/dmg share: (.*) \| blk share: (.*)/);if(m)o[c].dmgShare=m[1],o[c].blkShare=m[2];
  m=l.match(/core-rule share>=30% fights per run: avg ([\d.]+); winning runs with >=3 such fights: (\d+)\/(\d+)/);if(m)o[c].decided=+m[1],o[c].passing=+m[2]/+m[3]}return o}
const [s,n,es,en]=process.argv.slice(2);
const after={strong:A('d',s),novice:A('d',n)};if(es){after.strong.echo=A('d',es).echo;after.novice.echo=A('d',en).echo}
const sum={generated:new Date().toISOString(),note:'DESIGN SIM (playtests/harness-design): v1 engine + v2.1 rules from data-v2.json v21.sim. Act 1 only, v1 15-card pools per class, starter relics modelled, no other relics/potions.',
 before:{v1_strong:A('v1','baseline'),v1_novice:A('v1','novice'),package_strong:A('v1','var_enemies+warden+duel+echo+tide_strong'),package_novice:A('v1','var_enemies+warden+duel+echo+tide_novice')},after,
 runs:{strong:150,novice:300}};
fs.writeFileSync(path.join(__dirname,'results','summary-v2.1.json'),JSON.stringify(sum,null,1));console.log('wrote summary',Object.keys(sum.after.strong))
