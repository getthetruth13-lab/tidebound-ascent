// data/index.js — loads every content module (each registers itself). Add new content files here.
import './cards/tidecaller.js';import './cards/echo-mage.js';import './cards/cartographer.js';import './cards/duelist.js';import './cards/status.js';
// Phase 2 pools (content-side; see design/content-impl-plan.md)
import './cards/tidecaller-pool.js';import './cards/echo-mage-pool.js';import './cards/cartographer-pool.js';import './cards/duelist-pool.js';import './cards/colorless.js';import './cards/task6.js';
// cards-act1: the NEW Act 1 pool, one file per worker, then finalize (stubs + cut flags) LAST among the card modules.
import './cards/act1/tide.js';import './cards/act1/echo.js';import './cards/act1/carto.js';import './cards/act1/duel.js';import './cards/act1/artifacts.js';import './cards/act2/tide.js';import './cards/act2/echo.js';import './cards/act2/carto.js';import './cards/act2/duel.js';import './cards/act2/artifacts.js';
import './cards/act1/finalize.js';
import './classes.js';import './keywords.js';import './enemies.js';import './act2/enemies.js';import './act3/enemies.js';import './encounters.js';import './act2/encounters.js';import './act3/encounters.js';import './events.js';import './act2/events.js';import './act3/events.js';import './relics.js';import './potions.js';import './environments.js';
