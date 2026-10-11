// Manual play driver for the LIVE game through the real UI (clicks/taps only for actions).
// node play.js <class> <seed> "<moves...>"  ; moves: n<i> map node, c<i> play hand card i (tap+tap), e<i> target enemy, end, r<i> reward, skip, o<i> option
const { chromium } = require('/workspace/game/node_modules/playwright');const {start}=require('/workspace/game/serve.js');const {cardPoint}=require('/workspace/game/tests/util.js');
(async()=>{const [cls,seed,movesS,shotName]=process.argv.slice(2);const moves=(movesS||'').split(/\s+/).filter(Boolean);
const srv=await start(0);const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:915,height:412},deviceScaleFactor:3.5,isMobile:true,hasTouch:true});
await ctx.addInitScript(s=>{let a=+s;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};localStorage.clear();window.FAST=1},seed);
const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto(srv.url);await pg.waitForTimeout(800);
await pg.click(`[data-cls=${cls}]`);await pg.waitForTimeout(300);
for(const m of moves){const k=m[0],i=+m.slice(1);
 if(m==='end'){await pg.click('#endbtn');}
 else if(m==='skip'){await pg.locator('button').filter({hasText:/Skip/}).first().click();}
 else if(k==='n'){await pg.locator('.node.av').nth(i).click();}
 else if(k==='c'){const p=await cardPoint(pg,i);await pg.mouse.click(p.x,p.y);await pg.waitForTimeout(80);const p2=await cardPoint(pg,i)||p;await pg.mouse.click(p2.x,p2.y);}
 else if(k==='e'){await pg.click(`.en[data-en="${i}"]`);}
 else if(k==='r'){await pg.locator('.grid .card').nth(i).click();}
 else if(k==='o'){await pg.locator('button:visible:not(.node):not(.potion):not(.mini)').nth(i).click();}
 await pg.waitForTimeout(250);}
const st=await pg.evaluate(()=>{const S=G.S,r=G.run,cb=G.cb;const o={screen:S.screen,hp:r.hp+'/'+r.max,floor:r.floor,gold:r.gold};
 if(cb){o.turn=cb.turn;o.energy=cb.energy;o.block=cb.p.block;o.pstat=JSON.stringify(cb.p.st);o.tide=cb.tide;o.mom=cb.mom;o.parry=cb.parry;o.slots=(cb.slots||[]).map(w=>w.id).join(',');o.drawTop=cb.draw.slice(0,5).map(c=>c.id).join(',');
  o.hand=cb.hand.map((c,i)=>i+':'+G.CARDS[c.id].n+(c.up?'+':'')+'('+cost(c)+') '+G.CARDS[c.id].d.replace(/<[^>]+>/g,'').replace(/\{([^|}]*)\|[^}]*\}/g,'$1'));
  o.enemies=cb.ens.map((e,i)=>i+':'+e.n+' '+e.hp+'/'+e.max+(e.block?' blk'+e.block:'')+' '+JSON.stringify(e.st)+' intent='+intentText(e)+(e.hp<=0||e.fled?' (gone)':''));o.log=cb.log;o.mode=cb.mode&&cb.mode.k}
 if(S.screen!=='combat')o.btns=[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&!/node|potion|mini/.test(b.className)).map(b=>b.className+':'+b.textContent.trim().slice(0,70));if(S.screen==='reward')o.rew=S.rew.cards;if(S.screen==='map'){o.avail=[...document.querySelectorAll('.node.av')].map(n=>n.title||n.textContent)}return o});
console.log(JSON.stringify(st,null,1));if(errs.length)console.log('ERRORS',errs);
if(shotName)await pg.screenshot({path:'/workspace/game/playtests/screens-v1/'+shotName+'.png'});
await b.close();srv.close()})();
