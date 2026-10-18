// Local-only test server for the generated web validation build; never packaged.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('build/m1-web-check');
const types = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.css':'text/css', '.png':'image/png', '.wasm':'application/wasm' };
http.createServer((req,res)=>{
    const requested = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root, '.' + (requested==='/'?'/index.html':requested));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);});
}).listen(7457,'127.0.0.1',()=>console.log('M1 web test: http://localhost:7457'));
