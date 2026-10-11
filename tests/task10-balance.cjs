// Run the Task 10 / Task 2 bot against a disposable snapshot of the current live engine; blank Lamplight profile.
// Usage: BASELINE=1 N=300 CLS=carto,echo node tests/task10-balance.cjs OUTPUT starting|full
// FROM selects the first seed; VARIANT optionally tunes a disposable snapshot (never the source tree).
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(__dirname,'results'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tidebound-task10-'));
fs.mkdirSync(out,{recursive:true});
for(const file of ['worker.mjs','ai21.mjs','env.mjs','package.json'])fs.copyFileSync(path.join(root,'playtests/task2',file),path.join(temp,file));
fs.cpSync(path.join(root,'src'),path.join(temp,'src'),{recursive:true});
// Restore the pre-Task-10 numbers only in the disposable snapshot for paired baselines/trials.
const file=path.join(temp,'src/data/generated/data-v2.js'),src=fs.readFileSync(file,'utf8');
const data=JSON.parse(src.match(/export const DATA=(.*);/s)[1]);
const v=JSON.parse(process.env.VARIANT||'{}');if(process.env.BASELINE==='1'){v.matAtk??=9;v.matCrush??=5;}
if(process.env.BASELINE==='1'){data.v21.sim.hp.carto=74;const m=data.v21.sim.world.enemies.matriarch;m.hp=[120,120];m.bloom_at=75;}
for(const [cls,hp] of Object.entries(v.hp||{}))data.v21.sim.hp[cls]=hp;
const en=path.join(temp,'src/data/enemies.js');let enemies=fs.readFileSync(en,'utf8');
const matHP=v.matriarchHP??(process.env.BASELINE==='1'?120:null),bloom=v.bloom??(process.env.BASELINE==='1'?75:null);
if(matHP!=null){enemies=enemies.replace(/(matriarch:\{[^\n]*hp:)\[\d+,\d+\]/,'$1['+matHP+','+matHP+']');data.v21.sim.world.enemies.matriarch.hp=[matHP,matHP];}
if(bloom!=null){enemies=enemies.replace(/(!e.bloomed&&e.hp<=)\d+/,'$1'+bloom);data.v21.sim.world.enemies.matriarch.bloom_at=bloom;}
if(v.rooted!=null){enemies=enemies.replace('gains 4 Guard','gains '+v.rooted+' Guard').replace('e.block+=4*n','e.block+='+v.rooted+'*n');data.v21.sim.world.enemies.matriarch.rooted=v.rooted;}
if(v.kelp!=null){enemies=enemies.replace("a:9,status:{id:'kelp',n:2,pile:'drawRandom'}","a:9,status:{id:'kelp',n:"+v.kelp+",pile:'drawRandom'}");data.v21.sim.world.enemies.matriarch.entangle[1]=v.kelp;}
if(v.matAtk!=null){enemies=enemies.replace(/a:\d+,status:\{id:'kelp',n:(\d+),pile:'drawRandom'\}/,(_,n)=>"a:"+v.matAtk+",status:{id:'kelp',n:"+n+",pile:'drawRandom'}");data.v21.sim.world.enemies.matriarch.entangle[0]=v.matAtk;}
if(v.matCrush!=null){enemies=enemies.replace(/a:\d+,h:2,lbl:'Crushing Embrace'/,"a:"+v.matCrush+",h:2,lbl:'Crushing Embrace'");data.v21.sim.world.enemies.matriarch.crush[0]=v.matCrush;}
fs.writeFileSync(file,src.replace(/export const DATA=.*;/s,'export const DATA='+JSON.stringify(data)+';'));
fs.writeFileSync(en,enemies);
const ai=path.join(temp,'ai21.mjs');if(process.argv[3]==='full')fs.writeFileSync(ai,fs.readFileSync(ai,'utf8').replace('seed,skipTravel:true','seed,skipTravel:true,fullPool:true'));
const render=path.join(temp,'src/ui/render.js');fs.writeFileSync(render,fs.readFileSync(render,'utf8').replace('export function render(){','export function render(){if(globalThis.NORENDER)return;'));
(async()=>{try{await Promise.all((process.env.CLS||'tide,echo,carto,duel').split(',').map(cls=>new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[path.join(temp,'worker.mjs'),cls,'exp','none',process.env.FROM||'1',String(Number(process.env.FROM||1)+Number(process.env.N||300)-1),path.join(out,cls+'.jsonl')],{cwd:root,stdio:'inherit'});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(cls+' exited '+code)));
})));}catch(e){console.error(e);process.exitCode=1;}finally{fs.rmSync(temp,{recursive:true,force:true});}})();
