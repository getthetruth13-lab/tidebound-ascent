// node trace.js cls seed [novice] [encFilter]  -> prints the full combat log of real (non-simulated) play
const {load}=require('./loader');const g=load(__dirname+'/game-snapshot.html');
const [cls,seed,nov,filt]=[process.argv[2],+process.argv[3],process.argv[4]==='1',process.argv[5]];
require('vm').runInContext(`(function(){const _log=log;log=function(s){if(REAL&&ST&&ST.fight&&(!${JSON.stringify(filt||'')}||ST.fight.enc.includes(${JSON.stringify(filt||'')})))console.log('   ['+ST.fight.enc+' T'+cb.turn+' hp'+run.hp+' blk'+cb.p.block+'] '+s);return _log(s)};
const _pc=playCard;playCard=function(i){const c=cb.hand[i];if(REAL&&ST&&ST.fight&&c&&(!${JSON.stringify(filt||'')}||ST.fight.enc.includes(${JSON.stringify(filt||'')})))console.log('   ['+ST.fight.enc+' T'+cb.turn+' E'+cb.energy+' mom'+cb.mom+' tide'+cb.tide+'] PLAY '+cname(c)+' -> '+(cb.ens[cb.tgt]||{}).n+' | hand: '+cb.hand.map(cname).join(', ')+' | foes: '+alive().map(e=>e.n+' '+e.hp+'hp/'+e.block+'b intent '+JSON.stringify(intentOf(e))).join('; '));return _pc(i)}})()`,g);
const r=g.playRun(cls,seed,{novice:nov});console.log(r.won,r.floor,r.deck.join(','));
