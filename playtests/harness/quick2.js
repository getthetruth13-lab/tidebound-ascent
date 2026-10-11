const {load}=require('./loader');const g=load(__dirname+'/game-snapshot.html');
for(const cls of ['tide','echo','carto','duel'])for(let s=1;s<=3;s++){const r=g.playRun(cls,s,{novice:true});
console.log(cls,s,r.won?'WIN':'lose',r.floor,r.hp,'\n  ',r.fights.map(f=>`${f.enc}:${f.turns}t/-${f.hpLost}`).join(' '))}
