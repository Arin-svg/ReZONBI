// Development-only connection to the dedicated browser used for Cocos tests.
exports.connect=async()=>{
    const targets=await(await fetch('http://localhost:9333/json')).json();
    const target=targets.find(t=>t.type==='page'&&/^http:\/\/localhost:(7456|7457)/.test(t.url));
    if(!target)throw Error('Open Cocos in the dedicated Chrome test instance on port 9333 first');
    const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),errors=[];let sequence=0;
    socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.description||a.value));};
    await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    return {send,evaluate,errors,close:()=>socket.close()};
};
