// Fun metrics: per player turn of the strong AI, how many distinct first plays exist, how far the best is ahead of the
// runner-up (end-of-turn evaluation units; 2 units ~ 1 HP), whether the novice rule would pick the same card, and damage per round.
const {load}=require('./loader');const vm=require('vm');const cls=process.argv[2],N=+process.argv[3]||40;const g=load(__dirname+'/game-snapshot.html');
vm.runInContext('DECLOG=[]',g);const runs=[];
for(let s=1;s<=N;s++){const r=g.playRun(cls,5000+s);runs.push({won:r.won,deck:r.deck})}
const D=vm.runInContext('DECLOG',g);
// damage per round = dmg counter delta between consecutive logged turns of the same fight
for(let i=0;i<D.length;i++){const n=D[i+1];D[i].round=(n&&n.enc===D[i].enc&&n.turn===D[i].turn+1)?n.dmg0-D[i].dmg0:null}
require('fs').writeFileSync(__dirname+'/results/decisions_'+cls+'.json',JSON.stringify({runs,D}));
console.log(cls,'turns',D.length);
