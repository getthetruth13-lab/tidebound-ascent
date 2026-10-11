// Run the Task 2 bot against a disposable snapshot of the current live engine; blank Lamplight profile.
// Usage: N=200 CLS=tide,echo node tests/task9-balance.cjs OUTPUT starting|full
// FROM selects the first seed; VARIANT optionally tunes a disposable snapshot (never the source tree).
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(__dirname,'results'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tidebound-task9-'));
fs.mkdirSync(out,{recursive:true});
for(const file of ['worker.mjs','ai21.mjs','env.mjs','package.json'])fs.copyFileSync(path.join(root,'playtests/task2',file),path.join(temp,file));
fs.cpSync(path.join(root,'src'),path.join(temp,'src'),{recursive:true});
if(process.env.VARIANT){
 const file=path.join(temp,'src/data/generated/data-v2.js');const src=fs.readFileSync(file,'utf8');const data=JSON.parse(src.match(/export const DATA=(.*);/s)[1]);
 const v=JSON.parse(process.env.VARIANT);for(const [cls,hp] of Object.entries(v.hp||{}))data.v21.sim.hp[cls]=hp;
 if(v.crest)data.v21.sim.core.tide.crest_dmg=v.crest;
 fs.writeFileSync(file,src.replace(/export const DATA=.*;/s,'export const DATA='+JSON.stringify(data)+';'));
 if(v.arc){const f=path.join(temp,'src/data/cards/echo-mage.js');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace("d:'Deal {6|9}.',fx:[['dmg',6,9]]","d:'Deal {7|10}.',fx:[['dmg',7,10]]"));}
 if(v.reverb){const f=path.join(temp,'src/data/cards/echo-mage.js');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('f.echo?f.v(7,10):f.v(4,6)','f.echo?f.v(10,13):f.v(5,7)'));}
}
const ai=path.join(temp,'ai21.mjs');if(process.argv[3]==='full')fs.writeFileSync(ai,fs.readFileSync(ai,'utf8').replace('seed,skipTravel:true','seed,skipTravel:true,fullPool:true'));
const render=path.join(temp,'src/ui/render.js');fs.writeFileSync(render,fs.readFileSync(render,'utf8').replace('export function render(){','export function render(){if(globalThis.NORENDER)return;'));
(async()=>{try{await Promise.all((process.env.CLS||'tide,echo,carto,duel').split(',').map(cls=>new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[path.join(temp,'worker.mjs'),cls,'exp','none',process.env.FROM||'1',process.env.N||'200',path.join(out,cls+'.jsonl')],{cwd:root,stdio:'inherit'});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(cls+' exited '+code)));
})));}catch(e){console.error(e);process.exitCode=1;}finally{fs.rmSync(temp,{recursive:true,force:true});}})();
