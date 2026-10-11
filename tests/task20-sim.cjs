// Task 20 fight sim: isolated fights (fresh starter deck, expert beam bot) for existing vs new Act 1 encounters.
// Usage: N=10 CLS=tide,echo,carto,duel ENCS="slug;knight+mender" node tests/task20-sim.cjs [out.json]
// Runs against a disposable copy of src/ (render no-op), never edits the source tree.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'tidebound-task20-'));
for(const f of ['ai21.mjs','env.mjs','package.json'])fs.copyFileSync(path.join(root,'playtests/task2',f),path.join(temp,f));
fs.cpSync(path.join(root,'src'),path.join(temp,'src'),{recursive:true});
const render=path.join(temp,'src/ui/render.js');fs.writeFileSync(render,fs.readFileSync(render,'utf8').replace('export function render(){','export function render(){if(globalThis.NORENDER)return;'));
fs.writeFileSync(path.join(temp,'drive.mjs'),`import {playGauntlet} from './ai21.mjs';
const [cls,encs,N]=process.argv.slice(2);const out={};
for(const e of encs.split(';')){const key=e.split('+');const kind=['bell','matriarch','tenant'].includes(key[0])?'boss':['captain','warden','eel'].includes(key[0])?'elite':'fight';const r=[];
 for(let s=1;s<=+N;s++){try{const f=playGauntlet(cls,s,kind,key);r.push({won:f.won,hpLost:f.hpLost,turns:f.turns})}catch(x){r.push({err:String(x).slice(0,100)})}}
 out[e]=r}
process.stdout.write(JSON.stringify(out)+'\\n',()=>process.exit(0));`);
const encs=process.env.ENCS,N=process.env.N||'10',res={};
for(const cls of (process.env.CLS||'tide,echo,carto,duel').split(',')){
 const p=spawnSync(process.execPath,[path.join(temp,'drive.mjs'),cls,encs,N],{cwd:temp,encoding:'utf8',maxBuffer:1<<26,timeout:3000000});
 try{res[cls]=JSON.parse(p.stdout.trim().split('\n').pop())}catch(e){console.error(cls,'failed',p.stderr.slice(0,500))}}
fs.rmSync(temp,{recursive:true,force:true});
const rows={};for(const cls in res)for(const e in res[cls])(rows[e]=rows[e]||[]).push(...res[cls][e]);
const lines=[];for(const e in rows){const r=rows[e].filter(x=>!x.err),n=r.length,w=r.filter(x=>x.won).length;
 lines.push(e.padEnd(26)+` n=${n} win=${(100*w/Math.max(1,n)).toFixed(0)}% hpLost=${(r.reduce((a,x)=>a+x.hpLost,0)/Math.max(1,n)).toFixed(1)} turns=${(r.reduce((a,x)=>a+x.turns,0)/Math.max(1,n)).toFixed(1)} errs=${rows[e].length-n}`)}
console.log(lines.join('\n'));if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(res));
