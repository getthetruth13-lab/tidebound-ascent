#!/usr/bin/env node
// tests/content/run.js — runs all content tests (plain Node, no deps).
//   node tests/content/run.js            data validation + design consistency + hook coverage
//   node tests/content/run.js --verbose  list every failure / warning
//   node tests/content/run.js --engine   also run behaviour specs against the live engine (Playwright adapter)
//   node tests/content/run.js --strict   exit 1 on warnings too
'use strict';
const args = process.argv.slice(2);
require('./validate-data.test.js');
require('./design-consistency.test.js');
require('./hook-coverage.test.js');
const { report } = require('./lib/t.js');
const r = report({ verbose: args.includes('--verbose') });
(async () => {
  let code = r.failures ? 1 : 0;
  if (args.includes('--strict') && r.warnings) code = 1;
  if (args.includes('--engine')) {
    const b = await require('./behaviour/run.js').runAll({ verbose: args.includes('--verbose') });
    if (b.failed) code = 1;
  } else {
    const specs = require('./behaviour/specs.js');
    console.log(`\nbehaviour specs: ${specs.SPECS.length} defined (run with --engine to execute against the game)`);
  }
  process.exit(code);
})();
