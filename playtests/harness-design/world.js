// DESIGN SIM v2.2 world layer: the Act 1 roster from design-v2 §1.7 that the frozen v1 engine lacks
// (Tide Leech, Kelp Lurker, Kelp Matriarch + Tendrils), the Kelp status, Brittle, weighted encounter
// tables, and the v2.2 enemy behaviour changes. Every number comes from SIMD.world (data-v2.json → v21.sim.world).
(function(){
const WD=SIMD.world;if(!WD)return;
const N=WD.enemies||{};
// ---------- statuses ----------
CARDS.kelp={id:'kelp',cls:'status',n:'Kelp',c:1,t:'X',r:'s',e:'🌿',x:1,d:'Sink. Draw 1.',p:f=>drawCards(1)};
// Brittle (player): gains 25% less Guard from cards; ticks at the end of the player's turn (with Soaked/Exposed).
const _gb=gainBlock;gainBlock=function(n){if(cb&&cb.p.st.brittle&&cb.__cardBlk)n=Math.floor(n*0.75);return _gb(n)};
const _tick=tick;tick=function(st){_tick(st);if(st.brittle){st.brittle--;if(!st.brittle)delete st.brittle}};
// ---------- new enemies ----------
const L=N.leech,K=N.lurker,M=N.matriarch,T=N.tendril;
if(L)EN.leech={n:'Tide Leech',e:'🪱',hp:L.hp.slice(),ai:e=>e.t%2?{a:L.latch[0],brit:L.latch[1],lbl:'Latch'}:{a:L.drink[0],heal:L.drink[1],lbl:'Drink'}};
if(K)EN.lurker={n:'Kelp Lurker',e:'🌿',hp:K.hp.slice(),ai:e=>{if(e.t===0)return{a:K.open[0],kelp:K.open[1],pile:'disc',lbl:'Entangle'};
  const k=(e.t-1)%3;return k===0?{a:K.big}:k===1?{a:K.small,h:2}:{a:K.big,kelp:1,pile:'disc',lbl:'Entangle'}}};
if(T)EN.tendril={n:'Kelp Tendril',e:'🌱',hp:T.hp.slice(),summon:1,ai:e=>({a:T.atk})};
if(M)EN.matriarch={n:'The Kelp Matriarch',e:'🌺',hp:M.hp.slice(),boss:1,ai:e=>{const P=[{a:M.entangle[0],kelp:M.entangle[1],pile:'draw',lbl:'Entangle'},{grow:M.grow,lbl:'Grow'},{a:M.crush[0],h:M.crush[1],lbl:'Crushing Embrace'}];return P[(e.ci++)%3]}};
// v2.2 behaviour patches for existing enemies (all optional, data-driven)
const B=WD.behaviour||{};
for(const [k,o] of Object.entries(B)){const t=EN[k];if(!t)continue;
  if(o.b0!=null)t.b0=o.b0;
  if(o.script){const sc=o.script;t.ai=e=>Object.assign({},sc[e.t%sc.length])}}  // fixed intent cycle (numbers already final)
const _spawn=spawn;spawn=function(key){const e=_spawn(key);
  if(key==='matriarch'&&M){for(let i=0;i<M.open_tendrils;i++)_spawn('tendril')}
  if(EN[key]&&EN[key].summon)e.isSummon=1;return e};
const _dmg=dmgEnemy;dmgEnemy=function(e,d){const was=e.hp;_dmg(e,d);
  if(e.key==='matriarch'&&M&&!e.bloomed&&e.hp>0&&e.hp<=M.bloom_at){e.bloomed=1;for(let i=0;i<M.bloom_tendrils;i++)spawn('tendril');e.st.str=(e.st.str||0)+M.bloom_might;log('🌺 The Matriarch BLOOMS')}};
const _act=act;act=function(e){const m=intentOf(e);_act(e);if(!cb)return;
  if(m.heal&&e.hp>0){e.hp=Math.min(e.max,e.hp+m.heal)}
  if(m.brit)addSt(cb.p,'brittle',m.brit);
  if(m.kelp){for(let i=0;i<m.kelp;i++){const c=mk('kelp');if(m.pile==='draw')cb.draw.splice(Math.floor(Math.random()*(cb.draw.length+1)),0,c);else cb.disc.push(c)}}
  if(m.grow){alive().filter(x=>x.key==='tendril').forEach(x=>{x.st.str=(x.st.str||0)+m.grow});if(alive().filter(x=>x.key==='tendril').length<2)spawn('tendril')}
  if(e.key==='matriarch'&&M&&e.hp>0){const n=alive().filter(x=>x.key==='tendril').length;if(n)e.block+=M.rooted*n}};
// ---------- encounter tables (design §1.7) ----------
const ENCW=WD.encounters;
if(ENCW){
  const wp=list=>{const tot=list.reduce((s,x)=>s+x[1],0);let r=Math.random()*tot;for(const x of list){if((r-=x[1])<0)return x[0]}return list[list.length-1][0]};
  const _en=enterNode;enterNode=function(t){
    if(t==='fight'||t==='elite'||t==='boss'){run.encHist=run.encHist||[];run.nFights=run.nFights||0;
      if(t==='boss'){run.bossKey=run.bossKey||wp(ENCW.boss);return startCombat('boss',[run.bossKey])}
      const pool=t==='elite'?ENCW.elite:(run.nFights<ENCW.easy_first?ENCW.easy:ENCW.hard);
      let enc,g=0;do{enc=wp(pool)}while(run.encHist.slice(-2).includes(enc.join('+'))&&g++<20);
      run.encHist.push(enc.join('+'));if(t==='fight')run.nFights++;return startCombat(t,enc.slice())}
    return _en(t)};
}
})();
