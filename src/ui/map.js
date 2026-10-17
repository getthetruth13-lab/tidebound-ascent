// ui/map.js — the Act map (15 rows). ? = Event room (unknown). The boss node shows which boss waits this run.
// Tidewalker Boots: with charges left, every node on the next floor is selectable (non-linked ones show a 🥾 badge).
import {W} from '../core/state.js';
import {EN} from '../core/registry.js';
import {uiIcon} from '../assets.js';
import {reachable,reachableUp,bootsLeft} from '../engine/run.js';
import {actName,ACT_NAMES,MAP_LINES,BANDS} from '../data/places.js';
import {lanternHTML} from './lantern.js';
import {a2X,a2Edge,a2Rim,a2Path,a2Layers,a2NodeInner,isGateNode,A2_W} from './map-a2.js';
export const ICON={fight:'⚔️',elite:'💀',rest:'🔥',shop:'💰',unknown:'❓',event:'❓',treasure:'💎',boss:'🔔'};
const REV={fight:['⚔️','a Fight'],treasure:['💎','a Chest'],shop:['💰','a Merchant'],event:['📜','an Event'],rest:['🔥','a Camp']};
// ---- the climb on parchment: terrace contours, tide line, Bell Gate; flooded and collapsed spots are seeded so every run differs (cosmetic only) ----
const TOP=84,BOT=70;
const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const GATE='<svg class="gate" viewBox="0 0 220 96" aria-hidden="true"><g fill="none" stroke="#4a3417" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".85"><path d="M24 94V44Q24 14 70 14T116 44V94M36 94V46Q36 26 70 26T104 46V94M16 94h108M24 56h92M24 70h92" opacity=".7"/><path d="M70 14v-8M62 8h16"/><path d="M146 94L152 30M176 94L170 30M152 30h18M156 30l-1-12h12l-1 12M155 18l6-9 6 9M149 94h30M151 80h26M153 64h22M154 48h20" /><path d="M161 12v-6M150 10l-8-4M172 10l8-4M148 3l-9-1M174 3l9-1" opacity=".55"/><path d="M60 40h20v12Q70 58 60 52z" fill="#7b5a2a33"/></g></svg>';
const GATE_A1=GATE.replace(/<path d="M146 94[^>]*\/>/,'').replace(/<path d="M161 12[^>]*\/>/,''); // Act 1: the painted lighthouse (map-a1-top) replaces the drawn one
const BOAT='<svg class="boat" viewBox="0 0 70 34" aria-hidden="true"><g fill="none" stroke="#2f4a54" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h62Q60 30 46 30H24Q10 30 4 18z" fill="#6b5030aa"/><path d="M36 18V3L50 16z" fill="#efe3c6aa"/><path d="M36 3v15M18 12l22 14M54 8l12-4"/></g></svg>';
const rubble=r=>`<svg class="deco collapsed" viewBox="0 0 60 30" aria-hidden="true"><g fill="none" stroke="#4a3417" stroke-width="1.4" stroke-linecap="round"><path d="M2 8h14l3 4h9M2 14h10l3 4h7M2 20h8l3 4"/><path d="M26 22l4-5 5 2 3-4 6 3 5-1" fill="#8a6a3a55"/><path d="M33 26l3 2M42 25l2 3M20 6l5-3M28 9l6-2" opacity=".6"/></g></svg>`;
const flood=r=>`<svg class="deco flooded" viewBox="0 0 80 30" aria-hidden="true"><path d="M6 17Q4 7 22 6T58 7Q78 9 74 19T48 27Q14 29 6 17z" fill="#3f8fa0aa" stroke="#1f5560" stroke-width="1.5" opacity=".95"/><g fill="none" stroke="#2f6f7c" stroke-width="1.2" stroke-linecap="round" opacity=".8"><path d="M14 13q5-4 10 0t10 0t10 0M24 20q5-4 10 0t10 0t10 0"/></g></svg>`;
// ---- Acts 2 and 3: the map is a different object (D-A2-06/13). Act 2 = riveted iron plate with ward banners and Gate sigils; Act 3 = the Crown Terraces painting under a stormglass veil, with the Eye of the storm at each gate.
// Cosmetic only; the painted plate map_a3 replaces the Act 3 placeholder when the art lands (Act 2 uses map-a2.js).
function laterDeco(run,rows,X,Y,N,H){const act=run.act;let svg='',html='';
 const wards=BANDS[act]||[];
 wards.forEach((b,i)=>{const r=b.floors[0]-1;if(r<0||r>=N)return;html+=`<span class="ward ward${act}" style="top:${Y(r)-H/2+6}px">${b.n}</span>`});
 rows.forEach((row,r)=>{if(row.length===1&&r<N-1){const gate=act===2?'<i class="sigil"></i>':act===3?'<i class="eye"></i>':'';html+=`<span class="rowmark m${act}" style="top:${Y(r)}px">${gate}</span>`;
  svg+=`<path d="M60 ${Y(r)+20} H340" stroke="${act===2?'#b08a4a':'#8fa3c7'}" stroke-width="1.4" stroke-dasharray="${act===2?'':'3 6'}" opacity=".35" vector-effect="non-scaling-stroke" fill="none"/>`}});
 return {svg,html}}
function mapDeco(run,rows,X,Y,N,H,a1){if((run.act||1)>1)return laterDeco(run,rows,X,Y,N,H);const W=400,full=N*H+30+TOP+BOT,rnd=rng((run.seed|0)^0x5eed);let svg='',html='';
 // terrace contour lines every other row gap, wandering a little
 for(let r=0;r<N-1;r+=2){const y=Y(r)-H/2+(rnd()-.5)*12;let d=`M-10 ${y}`;for(let x=0;x<=W+20;x+=40)d+=` Q${x+14} ${y+(rnd()-.5)*14} ${x+40} ${y+(rnd()-.5)*8}`;
  svg+=`<path d="${d}" fill="none" stroke="#6e4a28" stroke-width="1.3" opacity=".26" vector-effect="non-scaling-stroke"/><path d="${d}" transform="translate(0 6)" fill="none" stroke="#6e4a28" stroke-width=".8" opacity=".16" vector-effect="non-scaling-stroke" stroke-dasharray="3 4"/>`}
 // tide line + water below it
 const ty=Y(0)+50;let d=`M0 ${ty}`;for(let x=0;x<W;x+=25)d+=` q6 -5 12.5 0 t12.5 0`;
 svg+=`${a1?'':`<rect x="0" y="${ty}" width="${W}" height="${full-ty}" fill="url(#tidegr)"/>`}<defs><linearGradient id="tidegr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f9aa6" stop-opacity=".42"/><stop offset="1" stop-color="#2f6f7c" stop-opacity=".12"/></linearGradient></defs><path d="${d}" fill="none" stroke="#2f6f7c" stroke-width="1.8" opacity=".75" vector-effect="non-scaling-stroke"/><path d="${d}" transform="translate(6 7)" fill="none" stroke="#2f6f7c" stroke-width="1" opacity=".4" vector-effect="non-scaling-stroke"/>`;
 html+=`${a1?`<i class="a1art bot" style="top:${ty}px"></i>`:`<span class="boat-w" style="left:16%;top:${ty-22}px">${BOAT}</span>`}<span class="tidecap" style="left:58%;top:${ty+10}px">the tide line</span>`;
 // flooded / collapsed patches in the gaps between routes
 const edges=[];rows.forEach((row,r)=>row.forEach((n,i)=>n.to.forEach(j=>{const m=rows[r+1][j];edges.push([X(n,r,i),Y(r),X(m,r+1,j),Y(r+1)])})));
 const nodes=[];rows.forEach((row,r)=>row.forEach((n,i)=>nodes.push([X(n,r,i),Y(r)])));
 let placed=0;for(let tries=0;tries<80&&placed<9;tries++){const cy=Y(N-2)+rnd()*(Y(0)-Y(N-2)),cx=8+rnd()*84;
  if(edges.some(([x1,y1,x2,y2])=>{const lo=Math.min(y1,y2),hi=Math.max(y1,y2);if(cy<lo-14||cy>hi+14)return false;const t=Math.max(0,Math.min(1,(cy-y1)/(y2-y1)));return Math.abs(cx-(x1+(x2-x1)*t))<13}))continue;
  if(nodes.some(([nx,ny])=>Math.abs(nx-cx)<14&&Math.abs(ny-cy)<38))continue;
  const fl=rnd()<.5;html+=`<span class="decow ${fl?'fl':'co'}" style="left:${cx.toFixed(1)}%;top:${cy.toFixed(0)}px" title="${fl?'Flooded stair':'Collapsed stair'}">${fl?flood():rubble()}</span>`;placed++}
 return {svg,html}}
const NAME={fight:'Fight',elite:'Elite',rest:'Camp',shop:'Merchant',unknown:'? Event',treasure:'Treasure',boss:'Boss'};
// Unknown/? rooms share the painted '?' medallion (also used for node-event).
const nodeKey=t=>t==='unknown'?'node-unknown':'node-'+t;
export function mapHTML(interactive){const run=W.run,rows=run.map,H=74,N=rows.length;const av=reachable();const cuts=run.cut||0,boots=interactive&&(bootsLeft()>0||cuts>0);
 const a2=(run.act||1)===2,X0=(n,r,i)=>n.t==='boss'?50:(n.c+.5)*22+6+(((r*7+i*13)%5)-2)*1.6,X=a2?(n,r,i)=>a2X(n,r,X0(n,r,i)):X0, Y=r=>(N-1-r)*H+50+TOP;let svg='',nodes='',land='';const a1=(run.act||1)===1;const deco=a2?{svg:'',html:a2Layers(Y,N,run.boss)}:mapDeco(run,rows,X,Y,N,H,a1);
 const bossE=EN[run.boss]||{};const html_up=[];
 // the lantern sits at the current node, or on the shore below the first row before the first step
 const cn=run.pos.r>=0&&rows[run.pos.r]&&rows[run.pos.r][run.pos.i],lx=cn?X(cn,run.pos.r,run.pos.i):50,ly=cn?Y(run.pos.r):Y(0)+46;
 rows.forEach((row,r)=>row.forEach((n,i)=>{const x=X(n,r,i),y=Y(r);
  n.to.forEach(j=>{const m=rows[r+1][j];const x2=X(m,r+1,j),y2=Y(r+1);const ek=(((run.seed|0)+r*31+i*17+j*7)>>>0)%3;const on=run.vis[r+':'+i]&&run.vis[(r+1)+':'+j];const mx=(x+x2)/2+((r+i)%2?3:-3);
   const dd=`M${x*4} ${y} Q${mx*4} ${(y+y2)/2} ${x2*4} ${y2}`;
   if(a2){const mid=(x+x2)/2+((r+i)%2?3:-3);const ra=a2Rim(n,r),rb=a2Rim(m,r+1);svg+=a2Path(a2Edge([x*A2_W/100,y],[x2*A2_W/100,y2],ra,rb,mid),!!on,r===run.pos.r&&i===run.pos.i&&interactive);return}
   svg+=ek===0?`<path d="${dd}" fill="none" stroke="#8a6a3a" stroke-width="8" stroke-dasharray="2 3" opacity=".32" vector-effect="non-scaling-stroke"/>`:ek===1?`<path d="${dd}" fill="none" stroke="#5a4325" stroke-width="8" opacity=".3" vector-effect="non-scaling-stroke"/><path d="${dd}" fill="none" stroke="#d6bd8a" stroke-width="5" opacity=".55" vector-effect="non-scaling-stroke"/>`:`<path d="${dd}" fill="none" stroke="#5a4325" stroke-width="9" opacity=".28" vector-effect="non-scaling-stroke"/><path d="${dd}" fill="none" stroke="#e7d4a4" stroke-width="3.500" opacity=".6" vector-effect="non-scaling-stroke"/><path d="${dd}" fill="none" stroke="#5a4325" stroke-width="9" stroke-dasharray="1 9" opacity=".3" vector-effect="non-scaling-stroke"/>`;
   svg+=`<path d="M${x*4} ${y} Q${mx*4} ${(y+y2)/2} ${x2*4} ${y2}" fill="none" stroke="${on?'#7c1f2c':'#4a3a22'}" stroke-width="${on?3.5:2}" stroke-dasharray="${on?'':'2 7'}" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity="${on?.9:.7}"/>`});
  // Act 3 Updrafts: a dashed white-gold wind-arrow that skips one row (ACT3-DESIGN s3)
  (n.up||[]).forEach(j=>{const m=rows[r+2][j];const x2=X(m,r+2,j),y2=Y(r+2);const on=run.vis[r+':'+i]&&run.vis[(r+2)+':'+j];const mx=(x+x2)/2+(x2>=x?16:-16);
   svg+=`<path d="M${x*4} ${y} Q${mx*4} ${(y+y2)/2} ${x2*4} ${y2}" fill="none" stroke="${on?'#f2dc9b':'#e8e1c4'}" stroke-width="${on?3:2.4}" stroke-dasharray="7 6" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity="${on?.95:.8}"/>`;
   html_up.push(`<i class="updraft" style="left:${mx}%;top:${(y+y2)/2}px" title="Updraft: skips a floor"></i>`)});
  if(!a2)land+=`<i class="ldg${n.t==='boss'?' boss':''}" style="left:${x}%;top:${y+(n.t==='boss'?22:15)}px"></i>`;
  const next=interactive&&r===run.pos.r+1;const upAv=interactive&&r===run.pos.r+2&&reachableUp().includes(i);const isAv=(next&&av.includes(i))||upAv,bootsAv=next&&!isAv&&boots,vis=run.vis[r+':'+i];
  // The boss node uses the painted medallion (node-boss). The battle sprite is a dark full-body cut-out and reads as an empty navy disc at this size.
  const ic=a2?a2NodeInner(n,r,vis?'vis':(r<=run.pos.r&&!vis?'ghost':''),''):uiIcon(nodeKey(n.t),ICON[n.t]||ICON.boss,'nodeic');
  nodes+=`<button class="node ${n.t} ${n.t==='boss'?'boss':''} ${a2&&isGateNode(n,r)?'gate':''} ${isAv||bootsAv?'av':''} ${bootsAv?'boots':''} ${vis?'vis':''} ${run.pos.r===r&&run.pos.i===i?'cur':''} ${r<=run.pos.r&&!vis?'dim':''}" style="left:${x}%;top:${y}px" ${isAv||bootsAv?`onclick="goNode(${r},${i})"`:''} title="${n.t==='boss'?'Boss: '+(bossE.n||''):NAME[n.t]||n.t}" data-r="${r}" data-i="${i}" data-t="${n.t}">${ic}${bootsAv?`<i class="bootb">${cuts>0?'✂️':'🥾'}</i>`:''}${n.pre&&!vis?`<i class="revb" title="Revealed: ${REV[n.pre][1]}">${REV[n.pre][0]}</i>`:''}</button>`}));
 return `<div class="parch"><h2>${interactive?'Choose your path':actName(run.act||1)}</h2><div class="mapact">${ACT_NAMES[run.act||1]?(interactive||actName(run.act||1)!==ACT_NAMES[run.act||1].n?ACT_NAMES[run.act||1].n+' · ':'')+ACT_NAMES[run.act||1].sub:''}</div><div class="maplore">${MAP_LINES[run.act||1]||MAP_LINES[1]}</div><div class="legend">${[['fight','Fight'],['elite','Elite'],['unknown','?'],['rest','Camp'],['shop','Merchant'],['treasure','Chest']].map(([k,l])=>`<span>${uiIcon(nodeKey(k),ICON[k],'legic')}${l}</span>`).join('')}<span class="bossleg">${bossE.e||''} ${bossE.n||''}</span>${boots?`<span>${cuts>0?`✂️×${cuts} `:''}${bootsLeft()>0?`🥾×${bootsLeft()}`:''}</span>`:''}${rows.some(r=>r.some(n=>n.pre&&!run.vis[rows.indexOf(r)+':'+r.indexOf(n)]))?'<span><i class="revleg">🔭</i>Revealed</span>':''}</div>
 <div class="mapwrap${a1?' a1':' a'+(run.act||1)}" style="height:${N*H+30+TOP+BOT}px;width:92%">${a1?`<i class="a1art top" style="top:${Y(N-1)-32}px"></i>`:''}${(run.act||1)>1?'':`<span class="gate-w" style="top:${Y(N-1)-52}px">${a1?GATE_A1:GATE}</span>`}${deco.html}${land}${html_up.join('')}<svg width="100%" height="${N*H+30+TOP+BOT}" viewBox="0 0 ${a2?A2_W:400} ${N*H+30+TOP+BOT}" preserveAspectRatio="none">${deco.svg}${svg}</svg>${nodes}${lanternHTML(lx,ly,run.act||1)}</div></div>`}
