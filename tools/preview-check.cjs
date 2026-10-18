/* Developer-only CDP probe for a dedicated Chrome instance on port 9333.
 * Run: node tools/preview-check.cjs '<JavaScript expression>' [screenshot path]
 * Not imported or packaged by Cocos. Requires Node 22+; no dependencies.
 */
const fs = require('node:fs');
(async () => {
    const targets = await (await fetch('http://localhost:9333/json')).json();
    const target = targets.find(t => t.type === 'page' && /^http:\/\/localhost:(7456|7457)/.test(t.url));
    if (!target) throw Error('Cocos preview test tab not found');
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    const pending = new Map(); let sequence = 0;
    const exceptions = [];
    socket.onmessage = e => {
        const m = JSON.parse(e.data);
        if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
        else if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params);
        else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') exceptions.push({consoleError:m.params.args.map(a=>a.description || a.value)});
    };
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    await send('Runtime.enable');
    if (process.argv[2] === '--navigate') {
        await send('Page.navigate', {url: process.argv[3]}); socket.close(); return;
    }
    const expression = process.argv[2]?.startsWith('@') ? fs.readFileSync(process.argv[2].slice(1),'utf8') : process.argv[2] || '({title:document.title,system:typeof System,cc:typeof cc})';
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    console.log(JSON.stringify({ result, exceptions }, null, 2));
    if (process.argv[3]) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(process.argv[3], Buffer.from(shot.data, 'base64'));
    }
    socket.close();
    if (result.exceptionDetails || exceptions.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
