// ui/map.js — the Act map (15 rows). ? = Unknown room. The boss node shows which boss waits this run.
// Tidewalker Boots: with charges left, every node on the next floor is selectable (non-linked ones show a 🥾 badge).
import {W} from '../core/state.js';
import {EN} from '../core/registry.js';
import {uiIcon,slotHTML} from '../assets.js';
import {reachable,bootsLeft} from '../engine/run.js';
export const ICON={fight:'⚔️',elite:'💀',rest:'🔥',shop:'💰',unknown:'❓',event:'❓',treasure:'💎',boss:'🔔'};
const REV={fight:['⚔️','a Fight'],treasure:['💎','a Chest'],shop:['💰','a Merchant'],event:['📜','an Event']};
const NAME={fight:'Fight',elite:'Elite',rest:'Camp',shop:'Merchant',unknown:'Unknown (?)',treasure:'Treasure',boss:'Boss'};
export function mapHTML(interactive){const run=W.run,rows=run.map,H=74,N=rows.length;const av=reachable();const cuts=run.cut||0,boots=interactive&&(bootsLeft()>0||cuts>0);
 const X=(n,r,i)=>n.t==='boss'?50:(n.c+.5)*22+6+(((r*7+i*13)%5)-2)*1.6, Y=r=>(N-1-r)*H+50;let svg='',nodes='';
 const bossE=EN[run.boss]||{};
 rows.forEach((row,r)=>row.forEach((n,i)=>{const x=X(n,r,i),y=Y(r);
  n.to.forEach(j=>{const m=rows[r+1][j];const x2=X(m,r+1,j),y2=Y(r+1);const on=run.vis[r+':'+i]&&run.vis[(r+1)+':'+j];const mx=(x+x2)/2+((r+i)%2?3:-3);
   svg+=`<path d="M${x*4} ${y} Q${mx*4} ${(y+y2)/2} ${x2*4} ${y2}" fill="none" stroke="${on?'#7c1f2c':'#4a3a22'}" stroke-width="${on?3.5:2}" stroke-dasharray="${on?'':'2 7'}" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity="${on?.9:.7}"/>`});
  const next=interactive&&r===run.pos.r+1;const isAv=next&&av.includes(i),bootsAv=next&&!isAv&&boots,vis=run.vis[r+':'+i];
  const ic=n.t==='boss'?slotHTML('enemies',run.boss,'bossart',bossE.e||'🔔'):uiIcon('node-'+(n.t==='unknown'?'event':n.t),ICON[n.t],'nodeic');
  nodes+=`<button class="node ${n.t} ${n.t==='boss'?'boss':''} ${isAv||bootsAv?'av':''} ${bootsAv?'boots':''} ${vis?'vis':''} ${run.pos.r===r&&run.pos.i===i?'cur':''} ${r<=run.pos.r&&!vis?'dim':''}" style="left:${x}%;top:${y}px" ${isAv||bootsAv?`onclick="goNode(${r},${i})"`:''} title="${n.t==='boss'?'Boss: '+(bossE.n||''):NAME[n.t]||n.t}" data-r="${r}" data-i="${i}" data-t="${n.t}">${ic}${bootsAv?`<i class="bootb">${cuts>0?'✂️':'🥾'}</i>`:''}${n.pre&&!vis?`<i class="revb" title="Revealed: ${REV[n.pre][1]}">${REV[n.pre][0]}</i>`:''}</button>`}));
 return `<div class="parch"><h2>${interactive?'Choose your path':'The Drowned Stair'}</h2><div class="muted seedtag">Seed ${run.seed}</div><div class="legend">${[['fight','Fight'],['elite','Elite'],['unknown','?'],['rest','Camp'],['shop','Merchant'],['treasure','Chest']].map(([k,l])=>`<span>${uiIcon('node-'+(k==='unknown'?'event':k),ICON[k],'legic')}${l}</span>`).join('')}<span class="bossleg">${bossE.e||''} ${bossE.n||''}</span>${boots?`<span>${cuts>0?`✂️×${cuts} `:''}${bootsLeft()>0?`🥾×${bootsLeft()}`:''}</span>`:''}${rows.some(r=>r.some(n=>n.pre&&!run.vis[rows.indexOf(r)+':'+r.indexOf(n)]))?'<span><i class="revleg">🔭</i>Revealed</span>':''}</div>
 <div class="mapwrap" style="height:${N*H+30}px;width:92%"><svg width="100%" height="${N*H+30}" viewBox="0 0 400 ${N*H+30}" preserveAspectRatio="none">${svg}</svg>${nodes}</div></div>`}
