const run=require('./ts.cjs');
const go=(cls,extra='')=>`(()=>{localStorage.clear();${extra}W.S={screen:'title',view:'select',hero:${cls?`'${cls}'`:'null'}};G.render()})()`;
const shots=[['select-duel',go('duel')],['select-echo',go('echo')],['select-carto',go('carto')],['select-tide',go('tide')],
 ['select-panel',`(()=>{W.S={screen:'title',view:'select',hero:'echo',heroPanel:true};G.render()})()`],
 ['select-locked',`(()=>{localStorage.setItem('tidebound.herolock','1');W.S={screen:'title',view:'select',hero:'carto'};G.render()})()`]];
run(shots,process.argv.slice(2).length?process.argv.slice(2):['s24Landscape']);
