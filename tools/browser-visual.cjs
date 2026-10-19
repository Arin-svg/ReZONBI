const assert=require('node:assert/strict'),fs=require('node:fs'),delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const c=await require('./cdp-client.cjs').connect(),{send,evaluate,errors}=c;try{
await send('Runtime.enable');errors.length=0;await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:process.argv[2]||'http://localhost:7457'});
let ready=false;for(let i=0;i<60;i++){await delay(500);ready=await evaluate(`typeof cc!=='undefined'&&!!cc.director.getScene()?.getChildByName('Combat Encounter')?.getComponent('CombatEncounter')?.boss`);if(ready)break;}assert.ok(ready);
await evaluate(`window.scene=cc.director.getScene();window.enc=scene.getChildByName('Combat Encounter').getComponent('CombatEncounter');enc.restart();cc.profiler.hideStats();void 0`);await delay(200);
assert.ok(await evaluate(`scene.getChildByName('Mobile Canvas').getChildByName('Safe area').getChildByName('Pistol button').getChildByName('Icon bullet')!==null`),'Real vector combat icon connected');
await evaluate(`cc.director.pause();for(let i=0;i<15;i++)enc.spawner.spawn(60);enc.spawner.enemies.forEach((e,i)=>{if(i>=15){e.node.active=false;return;}const a=i/15*Math.PI*2,r=2.8+(i%2)*.8;e.node.setPosition(Math.sin(a)*r,.06,1+Math.cos(a)*r);e.state='Chase';e.tick(.001);});enc.hud.guideTime=0;enc.hud.refresh();void 0`);
assert.equal(await evaluate('enc.spawner.alive'),15);assert.ok(await evaluate(`!!enc.player.node.getChildByName('Rin ground indicator')`));
fs.writeFileSync('temp/visual-horde.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
for(const action of ['shoot','slash','dodge','hurt','die','victory']){await evaluate(`enc.player.visual.reset();enc.player.visual.play('${action}',1);enc.player.visual.animate(.25,0);void 0`);}
console.log('PASS connected HUD, 15-enemy readability fixture and six action poses without runtime errors');
const cutaway=await evaluate(`(()=>{const camera=scene.getChildByName('Main Camera').getComponent('IsometricCamera');const group=camera.buildings.find(b=>b.getChildByName('House').position.x===11&&b.getChildByName('House').position.z===11);const count=enc.player.obstacles.length;enc.player.node.setPosition(7,.06,7);for(let i=0;i<20;i++)camera.lateUpdate(.1);const hidden=group.scale.y;enc.player.node.setPosition(0,.06,1);for(let i=0;i<20;i++)camera.lateUpdate(.1);return{hidden,restored:group.scale.y,count,after:enc.player.obstacles.length};})()`);
assert.ok(cutaway.hidden<.15,JSON.stringify(cutaway));assert.ok(cutaway.restored>.95);assert.equal(cutaway.count,cutaway.after);
console.log('PASS building cutaway reveals Rin and restores facade without changing collision');
await evaluate('enc.restart();cc.director.resume();void 0');assert.equal(errors.length,0,JSON.stringify(errors));
}finally{c.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
