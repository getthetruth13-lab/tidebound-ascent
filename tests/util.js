// Shared test helpers: start the static server, device presets, robust card-click points.
const {start}=require('../serve.js');
const DEVICES={
 s24Landscape:{viewport:{width:832,height:384},deviceScaleFactor:3.75,isMobile:true,hasTouch:true},
 s24Portrait:{viewport:{width:384,height:832},deviceScaleFactor:3.75,isMobile:true,hasTouch:true},
 desktop:{viewport:{width:1280,height:800},deviceScaleFactor:1}};
// A point on hand card i that really hits that card (cards overlap and are rotated in the fan).
async function cardPoint(pg,i){return pg.evaluate(i=>{const el=document.querySelectorAll('.hand .card')[i];if(!el)return null;const r=el.getBoundingClientRect();
 const left=Math.max(4,r.left),right=Math.min(innerWidth-4,r.right),top=Math.max(4,r.top),bottom=Math.min(innerHeight-8,r.bottom);
 for(const fy of [.5,.35,.65,.2,.8])for(const fx of [.5,.3,.7,.15,.85]){const x=Math.round(left+(right-left)*fx),y=Math.round(top+(bottom-top)*fy);const h=document.elementFromPoint(x,y);if(h&&h.closest('.hand .card')===el)return {x,y}}

 for(const fy of [.55,.4,.7,.25,.85])for(const fx of [.5,.3,.7,.15,.85,.08,.92]){const x=r.left+r.width*fx,y=r.top+r.height*fy;if(x<0||y<0||x>innerWidth||y>innerHeight)continue;const h=document.elementFromPoint(x,y);if(h&&h.closest('.hand .card')===el)return {x,y}}return null},i)}
async function tapCardUI(pg,i){let p;for(let tries=0;tries<40;tries++){p=await cardPoint(pg,i);if(p)break;await pg.waitForTimeout(50)}if(!p)throw new Error('no clickable point for card '+i);await pg.mouse.click(p.x,p.y)}
module.exports={start,DEVICES,cardPoint,tapCardUI};
// Play through the drag-only UI. Touch dispatch preserves real pointer capture.
async function dragCardUI(pg,i,target=null,{touch=false,cancel=false}={}){
 const a=await cardPoint(pg,i);if(!a)throw Error('no drag point for card '+i);
 const b=await pg.evaluate(target=>{if(target==='empty')return {x:innerWidth*.45,y:innerHeight*.24};
  const el=target==null?document.querySelector('.hero .fig'):document.querySelector(`.en[data-en="${target}"] .fig`);const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height*.55}},target);
 if(touch){const session=await pg.context().newCDPSession(pg);const send=(type,x,y)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1}]});await send('touchStart',a.x,a.y);for(let k=1;k<=8;k++){await send('touchMove',a.x+(b.x-a.x)*k/8,a.y+(b.y-a.y)*k/8);await pg.waitForTimeout(12)}await send(cancel?'touchCancel':'touchEnd');await session.detach()}
 else{await pg.mouse.move(a.x,a.y);await pg.mouse.down();await pg.mouse.move(b.x,b.y,{steps:10});await pg.waitForTimeout(40);await pg.mouse.up()}
}
module.exports.dragCardUI=dragCardUI;
