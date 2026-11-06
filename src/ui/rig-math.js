// Piece-rig pose maths (format 1, see studio/design/RIG-FORMAT.md). Pure functions, no DOM, so tests can import it.
// A channel is bias + sum(amp*sin(2pi*(cycles*u+phase))); a piece's local transform is T(dx,dy)*Rot(angle,pivot)*Scale(1+sx,1+sy,pivot);
// world = parent world * local. Matrices are 2x3 affine [a,b,c,d,e,f] (CSS matrix() order: x'=a*x+c*y+e, y'=b*x+d*y+f).
export const TAU=Math.PI*2;
export function ch(c,u){if(!c)return 0;let v=c.bias||0;const h=c.h;if(h)for(let i=0;i<h.length;i++){const k=h[i];v+=k.amp*Math.sin(TAU*(k.cycles*u+k.phase))}return v}
export const IDENT=[1,0,0,1,0,0];
// out = a*b (apply b first)
export function mul(a,b,o=[0,0,0,0,0,0]){const a0=a[0],a1=a[1],a2=a[2],a3=a[3],a4=a[4],a5=a[5];
 o[0]=a0*b[0]+a2*b[1];o[1]=a1*b[0]+a3*b[1];o[2]=a0*b[2]+a2*b[3];o[3]=a1*b[2]+a3*b[3];o[4]=a0*b[4]+a2*b[5]+a4;o[5]=a1*b[4]+a3*b[5]+a5;return o}
// local transform of one rig object (root, piece or glow) at loop position u
export function local(o,u,out=[0,0,0,0,0,0]){
 const p=o.pivot||[0,0],px=p[0],py=p[1],th=ch(o.angle,u)*Math.PI/180,c=Math.cos(th),s=Math.sin(th),sx=1+ch(o.sx,u),sy=1+ch(o.sy,u),dx=ch(o.dx,u),dy=ch(o.dy,u);
 // Rot*Scale about the pivot: linear part [c*sx -s*sy; s*sx c*sy]
 const a=c*sx,b=s*sx,cc=-s*sy,d=c*sy;
 out[0]=a;out[1]=b;out[2]=cc;out[3]=d;
 // p' = pivot + L*(p-pivot)  => translation = pivot - L*pivot, then + (dx,dy)
 out[4]=px-(a*px+cc*py)+dx;out[5]=py-(b*px+d*py)+dy;return out}
// index a rig once: id -> object, so pose() allocates nothing per frame
export function prepare(rig){
 const byId={};for(const p of rig.pieces)byId[p.id]=p;
 const order=[];const seen={};
 const visit=p=>{if(seen[p.id])return;seen[p.id]=1;const par=p.parent;if(par&&par!=='root'&&par!=='static'&&byId[par])visit(byId[par]);order.push(p)};
 rig.pieces.forEach(visit);
 const W={root:[0,0,0,0,0,0],static:IDENT};for(const p of rig.pieces)W[p.id]=[0,0,0,0,0,0];
 for(const g of rig.glows||[])W['g:'+g.id]=[0,0,0,0,0,0];
 const L=[0,0,0,0,0,0];
 return {rig,byId,order,W,L,
  // world matrices at u (sprite-pixel space). The returned object is reused between calls.
  pose(u){local(this.rig.root,u,W.root);
   for(const p of order){const par=p.parent||'root';local(p,u,L);mul(W[par]||W.root,L,W[p.id])}
   return W},
  // CSS matrix for an element laid out at (x,y) in sprite space with transform-origin 0 0:  T(-x,-y) * World * T(x,y)
  css(world,x,y,out=[0,0,0,0,0,0]){const m=world;out[0]=m[0];out[1]=m[1];out[2]=m[2];out[3]=m[3];
   out[4]=m[0]*x+m[2]*y+m[4]-x;out[5]=m[1]*x+m[3]*y+m[5]-y;return out}};
}
export const frac=v=>v-Math.floor(v);
// loop position for a rig: seconds/phase from the file, per-figure offset (desync) in cycles
export const loopU=(rig,tSec,off=0)=>frac(tSec/rig.loop.seconds+(rig.loop.phase||0)+off);
// glow strength at u (clamped >=0)
export const glowAt=(g,u)=>Math.max(0,ch(g.intensity,u));
// stable [0,1) hash of a string, for per-figure desync
export function hash01(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return ((h>>>0)%100000)/100000}
