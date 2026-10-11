// tests/content/lib/t.js — minimal zero-dependency test harness.
// check(cond, msg) = hard failure; warn(msg) = data issue worth reporting but not blocking.
'use strict';
const results = [];
let cur = null;
function suite(name, fn) {
  cur = { name, checks: 0, fails: [], warns: [] };
  try { fn(); } catch (e) { cur.fails.push('THREW: ' + (e && e.stack || e)); }
  results.push(cur); cur = null;
}
function check(cond, msg) { cur.checks++; if (!cond) cur.fails.push(msg); return !!cond; }
function warn(msg) { cur.warns.push(msg); }
function report({ verbose = false, maxList = 40 } = {}) {
  let tf = 0, tw = 0, tc = 0;
  for (const r of results) {
    tf += r.fails.length; tw += r.warns.length; tc += r.checks;
    console.log(`${r.fails.length ? '✘' : '✔'} ${r.name}  (${r.checks} checks, ${r.fails.length} failures, ${r.warns.length} warnings)`);
    r.fails.slice(0, verbose ? 1e9 : maxList).forEach(m => console.log('    FAIL ' + m));
    if (!verbose && r.fails.length > maxList) console.log(`    … ${r.fails.length - maxList} more failures (use --verbose)`);
    r.warns.slice(0, verbose ? 1e9 : maxList).forEach(m => console.log('    warn ' + m));
    if (!verbose && r.warns.length > maxList) console.log(`    … ${r.warns.length - maxList} more warnings (use --verbose)`);
  }
  console.log(`\n${results.length} suites, ${tc} checks, ${tf} failures, ${tw} warnings`);
  return { failures: tf, warnings: tw, checks: tc, results };
}
module.exports = { suite, check, warn, report, results };
