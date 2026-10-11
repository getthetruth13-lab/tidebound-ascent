const run=require('./ts.cjs');
run([['shop',`(()=>{localStorage.clear();G.newRun('tide',{seed:7,skipTravel:true});G.run.gold=300;openShop()})()`]],process.argv.slice(2).length?process.argv.slice(2):['s24Landscape']);
