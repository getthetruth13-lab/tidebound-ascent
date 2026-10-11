const {load}=require('./loader');const g=load(__dirname+'/game-snapshot.html');
const cls=process.argv[2]||'tide';const n=+process.argv[3]||3;
for(let s=1;s<=n;s++){const t=Date.now();const r=g.playRun(cls,s);
console.log(cls,s,r.won?'WIN':'lose',r.floor,r.hp,(Date.now()-t)+'ms',r.deck.join(','),'\n  ',r.fights.map(f=>`${f.enc}:${f.turns}t/-${f.hpLost}`).join(' '))}
