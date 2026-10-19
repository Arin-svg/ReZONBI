const assert=require('node:assert/strict'),fs=require('node:fs'),delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const c=await require('./cdp-client.cjs').connect(),{send,evaluate,errors}=c;try{
await send('Runtime.enable');errors.length=0;await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:process.argv[2]||'http://127.0.0.1:7457'});
let ready=false;for(let i=0;i<80;i++){await delay(250);ready=await evaluate(`typeof cc!=='undefined'&&!!cc.director.getScene()?.getChildByName('Rin')?.getChildByName('Rin world sprite')`);if(ready)break;}assert.ok(ready,'Serialized sprite texture/shader launch in scene');
await evaluate(`window.scene=cc.director.getScene();window.enc=scene.getChildByName('Combat Encounter').getComponent('CombatEncounter');enc.restart();enc.togglePause();window.visual=enc.player.visual;void 0`);await delay(200);
assert.equal(await evaluate(`enc.player.node.getChildByName('VisualRoot').active`),false);
await evaluate(`cc.director.pause();scene.getChildByName('Mobile Canvas').getChildByName('Safe area').getChildByName('Paused hint').active=false;void 0`);
for(const [direction,yaw] of [[0,-135],[1,45],[2,135],[3,-45]]){
 const state=await evaluate(`(()=>{enc.player.node.setRotationFromEuler(0,${yaw},0);visual.animate(0,0);const idle=visual.frame;visual.animate(.51,0);const next=visual.frame;visual.animate(.14,1);return{direction:visual.direction,idle,next,run:visual.frame,rotation:visual.root.worldRotation,cam:scene.getChildByName('Main Camera').worldRotation};})()`);
 assert.equal(state.direction,direction);assert.notEqual(state.idle,state.next);assert.ok(state.run%4>=2);for(const k of ['x','y','z','w'])assert.ok(Math.abs(state.rotation[k]-state.cam[k])<.0001);
 fs.writeFileSync(`temp/sprite-direction-${direction}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
}
console.log('PASS four sprite directions, distinct idle/run frames, world-camera facing and hidden fallback');
await evaluate(`enc.player.node.setRotationFromEuler(0,-135,0);visual.animate(0,0);enc.hud.guideTime=0;enc.hud.refresh();scene.getChildByName('Mobile Canvas').getChildByName('Safe area').getChildByName('Paused hint').active=false;void 0`);
fs.writeFileSync('temp/sprite-rin-game.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS no sprite shader/texture runtime errors');
await evaluate('cc.director.resume();void 0');
}finally{c.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
