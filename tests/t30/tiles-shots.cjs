const run=require('./ts.cjs');
const fresh=c=>`localStorage.clear();G.progress&&G.progress.resetProfile&&G.progress.resetProfile();G.newRun('${c}',{seed:7,skipTravel:true});`;
const shots=[
['reward',`(()=>{${fresh('tide')}G.run$.combatRewards('elite',{});G.render()})()`],
['camp',`(()=>{${fresh('tide')}G.giveRelic('pumice');W.S={screen:'rest'};G.render()})()`],
['chest',`(()=>{${fresh('tide')}G.run$.openChest();G.render();openChestLid()})()`],
['event',`(()=>{${fresh('tide')}const e=G.EVENTS.find(x=>x.id==='wishing')||G.EVENTS[0];G.run.relics.length||G.giveRelic('whaletooth');W.S={screen:'event',ev:e};G.render()})()`],
['moonshell',`(()=>{${fresh('tide')}G.giveRelic('moonshell');G.startCombat('fight',['crab']);G.render()})()`],
['tasks',`(()=>{${fresh('echo')}W.S={screen:'map'};W.S.ov='tasks';G.run.lamp.tasks[0].done=true;G.render()})()`],
];
run(shots,process.argv.slice(2).length?process.argv.slice(2):['s24Landscape']);
