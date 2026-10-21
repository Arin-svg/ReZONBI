// End-to-end run using browser keyboard/touch input. No health, EXP, timer or damage overrides.
const assert=require('node:assert/strict'),fs=require('node:fs'),delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const c=await require('./cdp-client.cjs').connect(),{send,evaluate,errors}=c;const held=new Set();
const key=(type,k)=>send('Input.dispatchKeyEvent',{type,key:k==='Space'?' ':k.toLowerCase(),code:k==='Space'?'Space':'Key'+k,windowsVirtualKeyCode:k==='Space'?32:k.charCodeAt(0),nativeVirtualKeyCode:k==='Space'?32:k.charCodeAt(0)});
const set=async keys=>{for(const k of held)if(!keys.includes(k)){await key('keyUp',k);held.delete(k);}for(const k of keys)if(!held.has(k)){await key('keyDown',k);held.add(k);}};
try{
await send('Runtime.enable');errors.length=0;await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await send('Page.navigate',{url:process.argv[2]||'http://localhost:7457'});
let ready=false;for(let i=0;i<60;i++){await delay(500);ready=await evaluate(`typeof cc!=='undefined'&&!!cc.director.getScene()?.getChildByName('Combat Encounter')?.getComponent('CombatEncounter')?.boss`);if(ready)break;}assert.ok(ready,'Cocos combat scene finishes loading');
await evaluate(`window.enc=cc.director.getScene().getChildByName('Combat Encounter').getComponent('CombatEncounter');enc.restart();cc.profiler.hideStats();cc.director.resume();window.routeIndex=0;void 0`);
await send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:360,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:360,button:'left',clickCount:1});
let lastLog=-1,selected=0,result,bossDeathTime=-1,bossDeathKills=0;
for(let i=0;i<1000;i++){
const s=await evaluate(`(()=>{const p=enc.player.node.position;return {state:enc.state,time:enc.elapsed,hp:enc.health.state.current,level:enc.progression.level,kills:enc.kills,selecting:enc.selecting,boss:enc.bossSpawned?enc.boss.health.current:null};})()`);
if(Math.floor(s.time/15)>lastLog){lastLog=Math.floor(s.time/15);console.log('RUN',JSON.stringify(s));}
if(s.boss===0&&bossDeathTime<0){bossDeathTime=s.time;bossDeathKills=s.kills;console.log('BOSS DEFEATED',JSON.stringify(s));}
if(bossDeathTime>=0&&s.time>=bossDeathTime+10&&s.state==='playing'){result=s;break;}
if(s.state!=='playing'){result=s;break;}
if(s.selecting){
 await set([]);
 const p=await evaluate(`(()=>{const priority=['bullet','blade','blood','pulse','magnet','shadow'];let best=0;enc.progression.offers.forEach((s,i)=>{if(priority.indexOf(s.id)<priority.indexOf(enc.progression.offers[best].id))best=i;});const scene=cc.director.getScene(),safe=scene.getChildByName('Mobile Canvas').getChildByName('Safe area'),n=safe.getChildByName('Skill selection').getChildByName('Upgrade panel').getChildByName('Skill card '+best),cam=scene.getChildByName('Mobile Canvas').getChildByName('UI Camera').getComponent(cc.Camera),p=cam.worldToScreen(n.worldPosition),el=document.querySelector('canvas'),r=el.getBoundingClientRect();return{x:r.left+p.x/el.width*r.width,y:r.top+(el.height-p.y)/el.height*r.height};})()`);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:3}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});selected++;await delay(200);continue;
}
const action=await evaluate(`(()=>{const p=enc.player.node.position,d=q=>Math.hypot(q.x-p.x,q.z-p.z);let target=null;
const crystals=enc.pickups.pool.filter(c=>c.value>0).sort((a,b)=>d(a.node.position)-d(b.node.position));
if(crystals.length)target=crystals[0].node.position;
if(enc.bossSpawned&&!enc.boss.dead){const b=enc.boss.position,dist=d(b);if(dist<4.5){const len=Math.max(.01,dist);target={x:p.x+(p.x-b.x)/len*4,z:p.z+(p.z-b.z)/len*4};}else if(dist>8)target=b;}
if(!target){const patrol=[{x:0,z:1},{x:-5,z:0},{x:0,z:-4},{x:5,z:0},{x:0,z:5}];target=patrol[routeIndex%patrol.length];if(d(target)<1)routeIndex++;}
const route=enc.spawner.context.navigation.path(p,target);while(route.length&&d(route[0])<.45)route.shift();const q=route[0];let keys=['J'];if(q){const dx=q.x-p.x,dz=q.z-p.z,m=Math.hypot(dx,dz),x=(dx-dz)/m,y=(-dx-dz)/m;if(x>.4)keys.push('D');if(x<-.4)keys.push('A');if(y>.4)keys.push('W');if(y<-.4)keys.push('S');}
return {keys,knife:enc.targets().some(e=>e.active&&!e.dead&&d(e.position)<2.2),dodge:enc.bossSpawned&&/Warning/.test(enc.boss.stage)&&d(enc.boss.position)<5};})()`);
await set(action.keys);if(action.knife){await key('keyDown','K');await key('keyUp','K');}if(action.dodge){await key('keyDown','Space');await key('keyUp','Space');}await delay(250);
}
await set([]);console.log('RESULT',JSON.stringify({result,selected}));fs.writeFileSync('temp/roguelite-playthrough.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
assert.ok(result,'Run survives beyond boss defeat within test deadline');assert.equal(result.state,'playing');assert.ok(bossDeathTime>=120&&result.time>=bossDeathTime+10&&result.kills>bossDeathKills);assert.ok(selected>0&&result.level>1&&result.kills>5);assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS complete input-driven roguelite survival continues after boss defeat');
}finally{await set([]);c.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
