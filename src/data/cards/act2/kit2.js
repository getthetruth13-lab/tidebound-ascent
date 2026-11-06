// cards/act2/kit2.js: registration helper for the later-act (Act 2 + Act 3) card behaviour files.
// N2(cls)(id,{e,d,p,...}) registers the NEW behaviour for an id of the later-act pool (replacing any older held card with that id) and marks it done,
// so finalize.js does not stub it. Same options as cards/act1/*.js (d = {base|upgraded} template, p = play function, rk, on, mod, power ...).
import {redef2} from '../loader.js';
import {done} from './done.js';
export const N2=cls=>(id,o)=>{done(id);return redef2(cls,id,o)};
