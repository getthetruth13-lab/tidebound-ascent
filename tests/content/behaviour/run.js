// tests/content/behaviour/run.js — executes SPECS through an adapter. Specs whose ids/APIs aren't registered are skipped.
//   node tests/content/behaviour/run.js [--verbose] [--only=id1,id2]
'use strict';
const { SPECS } = require('./specs.js');

async function runAll({ verbose = false, only = null, adapter = null } = {}) {
  const A = adapter || await require('./adapter-playwright.js').open();
  const reg = await A.registry();
  const has = n => n.startsWith('relic:') ? reg.relics.includes(n.slice(6)) : n.startsWith('potion:') ? reg.potions.includes(n.slice(7)) : reg.cards.includes(n);
  const apiOk = n => n.startsWith('potion:') ? reg.api.usePotion && reg.potions.includes(n.slice(7)) : !!reg.api[n];
  let passed = 0, failed = 0, skipped = 0; const lines = [];
  for (const s of SPECS) {
    if (only && !only.includes(s.id)) continue;
    const miss = (s.needs || []).filter(n => !has(n)).concat((s.api || []).filter(n => !apiOk(n)).map(n => 'api:' + n));
    if (miss.length) { skipped++; lines.push(`  - skip ${s.id} [${s.pattern}] (not implemented: ${miss.join(', ')})`); continue; }
    try {
      const nErr = A.errors.length;
      await A.setup(s.setup);
      const before = await A.state();
      for (const st of s.steps) await A.step(st);
      const after = await A.state();
      const res = s.expect(before, after);
      const bad = res.filter(([x, y]) => JSON.stringify(x) !== JSON.stringify(y));
      if (A.errors.length > nErr) bad.push([A.errors.slice(nErr).join(' | '), 'no page errors', 'page error']);
      if (bad.length) { failed++; lines.push(`  ✘ ${s.id} [${s.pattern}; hooks ${s.hooks.join(',')}]`); bad.forEach(([x, y, l]) => lines.push(`      ${l}: got ${JSON.stringify(x)}, want ${JSON.stringify(y)}`)); }
      else { passed++; lines.push(`  ✔ ${s.id} [${s.pattern}]`); }
    } catch (e) { failed++; lines.push(`  ✘ ${s.id} threw: ${e.message.split('\n')[0]}`); }
  }
  console.log('\nbehaviour specs against the live engine:');
  lines.filter(l => verbose || !l.startsWith('  - skip')).forEach(l => console.log(l));
  console.log(`behaviour: ${passed} passed, ${failed} failed, ${skipped} skipped (not implemented yet)${verbose ? '' : ' — --verbose lists skips'}`);
  // Loop + runaway-multiplier guards (only when the whole suite runs and the engine exposes an eval hook)
  if (!only && A.eval) { console.log('\nloop / multiplier guards against the live engine:'); const g = await require('./guards.js').run(A, { verbose }); failed += g.fail; }
  if (!adapter) await A.close();
  return { passed, failed, skipped };
}
module.exports = { runAll };
if (require.main === module) {
  const args = process.argv.slice(2); const o = args.find(a => a.startsWith('--only='));
  runAll({ verbose: args.includes('--verbose'), only: o ? o.slice(7).split(',') : null }).then(r => process.exit(r.failed ? 1 : 0)).catch(e => { console.error(e); process.exit(2); });
}
