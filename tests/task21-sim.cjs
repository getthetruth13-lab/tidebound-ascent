// Task 21 fight sim: actual floor-deck snapshots replayed into real encounter groupings.
// Usage: N=12 ENCS="bell@15;matriarch@15;tenant@15" node tests/task21-sim.cjs [out.json]
// HEALTH=entry preserves run damage; TUNE=hp,open,rebuild,board,phase changes only the disposable Tenant template.
// Runs against a disposable copy of src/ (render no-op), never edits the source tree.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'tidebound-task21-'));
for(const f of ['ai21.mjs','env.mjs','package.json'])fs.copyFileSync(path.join(root,'playtests/task2',f),path.join(temp,f));
fs.cpSync(path.join(root,'src'),path.join(temp,'src'),{recursive:true});
if(process.env.TUNE){const file=path.join(temp,'src/data/enemies.js');let source=fs.readFileSync(file,'utf8');const [hp,opening,rebuild,board,phase]=process.env.TUNE.split(',').map(Number);source=source.replace("hp:[180,180],b0:30,boss:1",`hp:[${hp},${hp}],b0:${opening},boss:1`).replace("{b:14,lbl:'Board Up'}",`{b:${board},lbl:'Board Up'}`).replace("{none:1,b:30,lbl:'Reeling'}",`{none:1,b:${rebuild},lbl:'Reeling'}`).replace("e.ph===1&&e.hp<=80",`e.ph===1&&e.hp<=${phase}`);fs.writeFileSync(file,source)}
const render=path.join(temp,'src/ui/render.js');fs.writeFileSync(render,fs.readFileSync(render,'utf8').replace('export function render(){','export function render(){if(globalThis.NORENDER)return;'));
let ai=fs.readFileSync(path.join(temp,'ai21.mjs'),'utf8');
ai=ai.replace("if(s==='map')chooseMap();", "if(s==='map'&&opts.stopFloor&&W.run.floor>=opts.stopFloor-1)return structuredClone(W.run);if(s==='map')chooseMap();");
ai=ai.replace("W.run.floor=kind==='boss'?15:kind==='elite'?8:3;", "if(opts.fixture)W.run=structuredClone(opts.fixture);W.run.floor=opts.floor||15;if(opts.fullHealth)W.run.hp=W.run.max;");
fs.writeFileSync(path.join(temp,'ai21.mjs'),ai);
fs.writeFileSync(path.join(temp,'drive.mjs'),`import {playGauntlet,playRun} from './ai21.mjs';
const [cls,encs,N]=process.argv.slice(2);const out={},fixtures={};
for(const e of encs.split(';')){const [spec,fl]=e.split('@'),floor=+fl||15,key=spec.split('+');const kind=['bell','matriarch','tenant'].includes(key[0])?'boss':'fight';const r=[];
 for(let s=1;s<=+N;s++){try{const fk=floor+':'+s;let f=fixtures[fk];if(!f){f=playRun(cls,s,{stopFloor:floor});fixtures[fk]=f}if(!f.deck||f.floor<floor-1||typeof f.deck[0]==='string'){r.push({unreached:true});continue}
 const result=playGauntlet(cls,s,kind,key,{fixture:f,floor,fullHealth:process.argv[5]!=='entry'});r.push({won:result.won,hpLost:result.hpLost,turns:result.turns,entryHP:f.hp,max:f.max,deck:f.deck.map(c=>c.id+(c.up?'+':'')),relics:f.relics.map(r=>r.id)})}catch(x){r.push({err:String(x).slice(0,200)})}}
 out[e]=r}
process.stdout.write(JSON.stringify(out)+'\\n',()=>process.exit(0));`);
const encs=process.env.ENCS,N=process.env.N||'10',res={};
for(const cls of (process.env.CLS||'tide,echo,carto,duel').split(',')){
 const p=spawnSync(process.execPath,[path.join(temp,'drive.mjs'),cls,encs,N,process.env.HEALTH||'full'],{cwd:temp,encoding:'utf8',maxBuffer:1<<26,timeout:3000000});
 try{res[cls]=JSON.parse(p.stdout.trim().split('\n').pop())}catch(e){console.error(cls,'failed',p.stderr.slice(0,500))}}
fs.rmSync(temp,{recursive:true,force:true});
const rows={};for(const cls in res)for(const e in res[cls])(rows[e]=rows[e]||[]).push(...res[cls][e]);
const lines=[];for(const e in rows){const r=rows[e].filter(x=>!x.err&&!x.unreached),n=r.length,w=r.filter(x=>x.won).length;
 lines.push(e.padEnd(26)+` n=${n} win=${(100*w/Math.max(1,n)).toFixed(0)}% hpLost=${(r.reduce((a,x)=>a+x.hpLost,0)/Math.max(1,n)).toFixed(1)} turns=${(r.reduce((a,x)=>a+x.turns,0)/Math.max(1,n)).toFixed(1)} unreached=${rows[e].filter(x=>x.unreached).length} errs=${rows[e].filter(x=>x.err).length}`)}
console.log(lines.join('\n'));if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(res));
