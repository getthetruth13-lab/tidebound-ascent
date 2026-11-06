// cards/act2/done.js: the ids that have NEW Act 2/3 behaviour. Each hero file calls done(id) through its N()/R() helpers (see loader redef2 users).
// finalize.js stubs every later-act id that is not in this set.
export const NEW_ACT23=new Set();
export const done=id=>{NEW_ACT23.add(id);return id};
