#!/usr/bin/env node
// Tiny dependency-free static server for local play and tests.
//   node serve.js            -> http://localhost:8080/  (also reachable from a phone on the same Wi-Fi)
//   PORT=5000 node serve.js
// In code: const {start}=require('./serve.js'); const srv=await start(0); srv.url
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=__dirname;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.md':'text/markdown; charset=utf-8'};
function handler(req,res){let p=decodeURIComponent(new URL(req.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';
 const f=path.join(ROOT,path.normalize(p).replace(/^(\.\.[\/\\])+/,''));if(!f.startsWith(ROOT)||/[\/\\](node_modules|\.git)[\/\\]/.test(f)){res.writeHead(403);return res.end('forbidden')}
 fs.stat(f,(err,st)=>{if(err||!st.isFile()){res.writeHead(404,{'Content-Type':'text/plain'});return res.end('not found')}
  res.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream','Content-Length':st.size,'Cache-Control':'no-cache','Service-Worker-Allowed':'/'});
  fs.createReadStream(f).pipe(res)})}
function start(port=+process.env.PORT||8080,host=process.env.HOST||'0.0.0.0'){return new Promise((ok,bad)=>{const s=http.createServer(handler);s.on('error',bad);
 s.listen(port,host,()=>{s.url=`http://localhost:${s.address().port}/`;ok(s)})})}
module.exports={start};
if(require.main===module)start().then(s=>{console.log(`The Drowned Sun: ${s.url}  (Ctrl+C to stop)`);
 const nets=require('os').networkInterfaces();for(const n of Object.values(nets).flat())if(n&&n.family==='IPv4'&&!n.internal)console.log(`  on your phone (same Wi-Fi): http://${n.address}:${s.address().port}/`)});
