// Actual Cocos web-build integration test through Chrome DevTools Protocol.
// Start tools/serve-check.cjs and a dedicated Chrome on port 9333 first.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
    const targets = await (await fetch('http://localhost:9333/json')).json();
    const target = targets.find(t=>t.type==='page' && /^http:\/\/(localhost|127\.0\.0\.1):(7456|7457)/.test(t.url));
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    let sequence=0; const pending=new Map(), errors=[];
    socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params);else if(m.method==='Runtime.consoleAPICalled' && m.params.type==='error')errors.push(m.params.args.map(a=>a.description||a.value));};
    await new Promise(r=>socket.onopen=r);
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
    try {
        await send('Runtime.enable'); await send('Page.enable'); errors.length=0;
        await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
        await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
        await send('Page.navigate',{url:process.argv[2] || 'http://localhost:7457'});
        let ready=false;
        for(let i=0;i<60;i++){await delay(500);ready=await evaluate(`typeof cc !== 'undefined' && !!cc.director.getScene()?.getChildByName('Rin')`);if(ready)break;}
        assert.ok(ready,'Main scene creates Rin');
        await evaluate('cc.profiler.hideStats();void 0');
        await send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:360,button:'left',clickCount:1});
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:360,button:'left',clickCount:1});
        await evaluate(`window.rin=cc.director.getScene().getChildByName('Rin');window.player=rin.getComponent('PlayerController');window.joystick=player.joystick;window.cam=cc.director.getScene().getChildByName('Main Camera');void 0;`);
        const position=()=>evaluate('({x:rin.position.x,z:rin.position.z})');
        const key=async(type,k,code,vk)=>send('Input.dispatchKeyEvent',{type,key:k,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});
        let before=await position();
        const cameraBefore=await evaluate('({x:cam.position.x,z:cam.position.z})');
        await key('keyDown','w','KeyW',87);await delay(800);await key('keyUp','w','KeyW',87);await delay(300);
        let after=await position();assert.ok(after.x<before.x-1 && after.z<before.z-1,'W moves screen-up on XZ');
        console.log('PASS real keyboard W movement and key release');
        const cameraAfter=await evaluate('({x:cam.position.x,z:cam.position.z})');
        assert.ok(cameraAfter.x<cameraBefore.x-1 && cameraAfter.z<cameraBefore.z-1);
        console.log('PASS camera tracks movement');
        const stopped=await position();await delay(300);const stoppedAfter=await position();assert.ok(Math.hypot(stopped.x-stoppedAfter.x,stopped.z-stoppedAfter.z)<0.02);
        await evaluate('player.clearInput();rin.setPosition(-5,0.06,-9)');
        await key('keyDown','d','KeyD',68);await key('keyDown','s','KeyS',83);await delay(1200);
        await key('keyUp','d','KeyD',68);await key('keyUp','s','KeyS',83);await delay(200);
        after=await position();assert.ok(after.x<=-4.3 && after.x>-5,'Car blocks movement in runtime');console.log('PASS runtime car collision');
        await evaluate('player.clearInput();rin.setPosition(0,0.06,1)');await delay(500);
        await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
        // Convert Cocos UI world coordinates to actual browser pixels for real touch dispatch.
        const point=async name=>evaluate(`(()=>{const s=cc.director.getScene();const n=s.getChildByName('Mobile Canvas').getChildByName('Safe area').getChildByName('${name}');const c=s.getChildByName('Mobile Canvas').getChildByName('UI Camera').getComponent(cc.Camera);const p=c.worldToScreen(n.worldPosition);const el=document.querySelector('canvas');const r=el.getBoundingClientRect();return {x:r.left+p.x/el.width*r.width,y:r.top+(el.height-p.y)/el.height*r.height};})()`);
        const j=await point('Movement joystick');
        const touch=(type,points)=>send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:4,radiusY:4,force:1}))});
        await touch('touchStart',[{...j,id:1}]);
        await touch('touchMove',[{x:j.x+65,y:j.y,id:1}]);await delay(600);
        let output=await evaluate('({x:joystick.output.x,y:joystick.output.y})');assert.ok(output.x>0.5,'Joystick produces rightward output');
        const other={x:1000,y:390,id:2};
        await touch('touchStart',[{x:j.x+65,y:j.y,id:1},other]);
        await touch('touchMove',[{x:j.x+65,y:j.y,id:1},{...other,y:340}]);await delay(200);
        output=await evaluate('joystick.output.x');assert.ok(output>0.5,'Second finger does not steal joystick');
        await touch('touchEnd',[{...other,y:340}]);assert.ok(await evaluate('joystick.output.x')>0.5);
        await touch('touchEnd',[]);await delay(300);assert.equal(await evaluate('joystick.output.lengthSqr()'),0);
        console.log('PASS real two-finger touch ownership, movement, release and recenter');
        await touch('touchStart',[{...j,id:4}]);await touch('touchMove',[{x:j.x+180,y:j.y,id:4}]);
        assert.ok(await evaluate('joystick.output.x')>0.9,'Dragging outside the base remains captured');
        await touch('touchCancel',[]);await delay(100);assert.equal(await evaluate('joystick.output.lengthSqr()'),0);
        console.log('PASS drag outside base and touch cancellation');
        const pause=await point('Pause button');await touch('touchStart',[{...pause,id:3}]);await touch('touchEnd',[]);
        assert.equal(await evaluate('player.paused'),true);await touch('touchStart',[{...pause,id:3}]);await touch('touchEnd',[]);assert.equal(await evaluate('player.paused'),false);
        console.log('PASS pause/resume touch button');
        // Creator's toolbar can lock its embedded canvas to Design Resolution.
        // Exercise fresh landscape launches. Live viewport resizing is a separate device check.
        const sizes = (process.argv[2] || '').includes(':7456') ? [[1280,720]] : [[1280,720],[1560,720],[960,720]];
        for(const [width,height] of sizes){
            await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(500);
            await send('Page.navigate',{url:process.argv[2] || 'http://localhost:7457'});
            let loaded=false;for(let i=0;i<60;i++){await delay(250);loaded=await evaluate(`typeof cc !== 'undefined' && !!cc.director.getScene()?.getChildByName('Rin')`);if(loaded)break;}assert.ok(loaded);
            await evaluate(`window.rin=cc.director.getScene().getChildByName('Rin');window.player=rin.getComponent('PlayerController');cc.profiler.hideStats();void 0`);await delay(250);
            const stick=await point('Movement joystick'), button=await point('Pause button');
            assert.ok(stick.x>70 && stick.x<width-70 && stick.y>70 && stick.y<height-70);
            assert.ok(button.x>40 && button.x<width-40 && button.y>20 && button.y<height-20);
            const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`temp/m1-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
            console.log(`PASS HUD inside ${width}x${height} viewport`);
        }
        assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS no uncaught runtime exceptions');
        await evaluate('player.clearInput();rin.setPosition(0,0.06,1)');
        await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await delay(500);
        const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('temp/m1-verified.png',Buffer.from(shot.data,'base64'));
    } finally { socket.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
