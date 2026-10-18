const assert=require('node:assert/strict'),fs=require('node:fs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const c=await require('./cdp-client.cjs').connect(),{send,evaluate,errors}=c;
 let checks=0;
 const check=async(name,expression)=>{assert.equal(await evaluate(expression),true,name);checks++;console.log('PASS',name);};
 const key=(type,k,code,vk)=>send('Input.dispatchKeyEvent',{type,key:k,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});
 const touch=(type,points)=>send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:4,radiusY:4,force:1}))});
 const point=name=>evaluate(`(()=>{const n=safe.getChildByName('${name}')||safe.getChildByName('Encounter result').getChildByName('${name}');const cam=scene.getChildByName('Mobile Canvas').getChildByName('UI Camera').getComponent(cc.Camera);const p=cam.worldToScreen(n.worldPosition),el=document.querySelector('canvas'),r=el.getBoundingClientRect();return {x:r.left+p.x/el.width*r.width,y:r.top+(el.height-p.y)/el.height*r.height};})()`);
 try{
  await send('Runtime.enable');await send('Page.enable');errors.length=0;
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await send('Page.navigate',{url:process.argv[2]||'http://localhost:7457'});
  let ready=false;for(let i=0;i<60;i++){await delay(500);ready=await evaluate(`typeof cc!=='undefined'&&!!cc.director.getScene()?.getChildByName('Combat Encounter')?.getComponent('CombatEncounter')?.hud`);if(ready)break;}
  assert.ok(ready,'M2 bootstrap loads');
  await evaluate(`window.scene=cc.director.getScene();window.enc=scene.getChildByName('Combat Encounter').getComponent('CombatEncounter');window.rin=enc.player.node;window.enemies=enc.spawner.enemies;window.safe=scene.getChildByName('Mobile Canvas').getChildByName('Safe area');cc.profiler.hideStats();cc.director.pause();
   window.fixture=()=>{enc.restart();rin.setPosition(0,.06,1);rin.setRotationFromEuler(0,0,0);enemies.forEach((e,i)=>e.node.setPosition(-2+i,.06,16));};void 0;`);
  await check('Three Walkers and two Runners spawn safely',`(()=>{enc.restart();return enemies.length===5&&enemies.filter(e=>e.kind==='walker').length===3&&enemies.filter(e=>e.kind==='runner').length===2&&enemies.every(e=>e.active&&!e.dead&&Math.hypot(e.position.x,e.position.z-1)>=4);})()`);
  await check('Actual pistol selects nearest target, damages once, obeys cooldown',`(()=>{fixture();enemies[0].node.setPosition(0,.06,-3);enemies[1].node.setPosition(0,.06,4);const first=enc.combat.shoot(),second=enc.combat.shoot();const hp=enemies[1].health.current;enc.combat.tick(.24);const early=enc.combat.shoot();enc.combat.tick(.011);const later=enc.combat.shoot();return first&&!second&&!early&&later&&hp===56&&enemies[1].health.current===32&&enemies[0].health.current===80;})()`);
  await check('Pistol cannot damage through residential barricade',`(()=>{fixture();rin.setPosition(2,.06,-4);enemies[0].node.setPosition(2,.06,-8);enc.combat.shoot();return enemies[0].health.current===80;})()`);
  await check('Actual knife enforces range, facing arc and once-per-slash cooldown',`(()=>{fixture();enemies[0].node.setPosition(0,.06,-.8);enemies[1].node.setPosition(0,.06,2.8);enemies[2].node.setPosition(1.8,.06,1);enemies[3].node.setPosition(0,.06,-1.3);const first=enc.combat.knife(),second=enc.combat.knife();return first&&!second&&enemies[0].health.current===40&&enemies[1].health.current===80&&enemies[2].health.current===80&&enemies[3].health.current===50;})()`);
  await check('Knife cannot slash through a solid barricade',`(()=>{fixture();rin.setPosition(2,.06,-5.3);enemies[0].node.setPosition(2,.06,-6.8);enc.combat.knife();return enemies[0].health.current===80;})()`);
  await check('Dodge uses facing fallback, covers distance and rejects damage during i-frames',`(()=>{fixture();const before=rin.position.z;const first=enc.combat.dodge(),again=enc.combat.dodge();const protectedHit=enc.health.receiveDamage({amount:10,id:9000,source:'test',kind:'melee'});for(let i=0;i<30;i++){enc.player.update(1/120);enc.health.state.tick(1/120);}enc.health.state.tick(.001);const hit=enc.health.receiveDamage({amount:10,id:9001,source:'test',kind:'melee'});return first&&!again&&!protectedHit&&hit&&Math.abs(before-rin.position.z-3.5)<.02&&enc.health.state.current===390;})()`);
  await check('Dodge remains blocked by the same walls as movement',`(()=>{fixture();rin.setPosition(2,.06,-4.8);enc.combat.dodge();for(let i=0;i<30;i++)enc.player.update(1/120);return rin.position.z>-5.46&&rin.position.z<-4.8;})()`);
  await check('Walkers and Runners detect and chase; Runner moves faster',`(()=>{fixture();enemies[0].node.setPosition(-6,.06,1);enemies[3].node.setPosition(6,.06,1);for(let i=0;i<60;i++){enemies[0].tick(1/60);enemies[3].tick(1/60);}return enemies[0].state==='Chase'&&enemies[3].state==='Chase'&&enemies[0].position.x>-4.2&&enemies[3].position.x<3;})()`);
  await check('Enemy wind-up hits once; moving out of range avoids the hit',`(()=>{fixture();const e=enemies[0];e.node.setPosition(0,.06,0);e.tick(.01);const warning=e.state==='Attack';rin.setPosition(0,.06,4);e.tick(.4);const missed=enc.health.state.current===400;fixture();e.node.setPosition(0,.06,0);e.tick(.01);e.tick(.4);const damaged=enc.health.state.current===385;e.tick(.01);return warning&&missed&&damaged&&enc.health.state.current===385;})()`);
  await check('Dead enemies reject more hits and never attack',`(()=>{fixture();const e=enemies[0];e.node.setPosition(0,.06,0);e.tick(.01);e.receiveDamage({amount:80,id:9002,source:'test',kind:'knife'});const twice=e.receiveDamage({amount:80,id:9003,source:'test',kind:'knife'});e.tick(.5);e.tick(.5);return e.dead&&e.state==='Dead'&&!twice&&!e.node.active&&enc.health.state.current===400;})()`);
  await check('Investigate and Stunned interfaces function without a noise system',`(()=>{fixture();const e=enemies[0];e.node.setPosition(-12,.06,0);e.investigate({x:-7,z:0});e.tick(.2);const investigated=e.state==='Investigate'&&e.position.x>-12;e.stun(.3);const x=e.position.x;e.tick(.2);const frozen=e.state==='Stunned'&&e.position.x===x;e.tick(.2);return investigated&&frozen&&e.state==='Chase';})()`);
  await check('Enemy navigation escapes the blocked side of a house',`(()=>{fixture();rin.setPosition(-6,.06,-11);const e=enemies[0];e.node.setPosition(-16,.06,-11);e.state='Chase';for(let i=0;i<1000;i++)e.tick(1/60);return Math.hypot(e.position.x-rin.position.x,e.position.z-rin.position.z)<2;})()`);
  await check('Pause freezes AI, HP, cooldowns and dodge; restart resets all state',`(()=>{fixture();enc.combat.dodge();enc.togglePause();const timer=enc.combat.dodgeCooldown,pos=rin.position.z,enemy=enemies[0].position.x;enc.player.update(.1);enc.lateUpdate(.1);const frozen=timer===enc.combat.dodgeCooldown&&pos===rin.position.z&&enemy===enemies[0].position.x&&!enc.combat.shoot();enc.restart();return frozen&&!enc.paused&&!enc.player.paused&&!enc.player.dead&&enc.combat.dodgeCooldown===0&&enc.health.state.current===400&&enc.spawner.alive===5&&enc.player.joystick.enabled;})()`);
  await check('Player health clamps to zero, defeat disables movement/combat',`(()=>{fixture();enc.health.receiveDamage({amount:999,id:9004,source:'test',kind:'melee'});const z=rin.position.z;enc.player.update(.1);enc.hud.refresh();return enc.health.dead&&enc.health.state.current===0&&enc.state==='defeat'&&enc.player.dead&&!enc.combat.shoot()&&!enc.combat.knife()&&!enc.combat.dodge()&&rin.position.z===z&&safe.getChildByName('Encounter result').active;})()`);
  // Resume normal Cocos updates and drive the real UI/input for the rest.
  await evaluate('enc.restart();cc.director.resume();void 0');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:640,y:360,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:640,y:360,button:'left',clickCount:1});
  await key('keyDown','w','KeyW',87);await delay(400);await key('keyUp','w','KeyW',87);await delay(180);
  await check('WASD still moves Rin and camera follows',`rin.position.x<-.7&&scene.getChildByName('Main Camera').position.x<14`);
  await evaluate('enc.restart();void 0');const j=await point('Movement joystick'),p=await point('Pistol button');
  await touch('touchStart',[{...j,id:1}]);await touch('touchMove',[{x:j.x+60,y:j.y,id:1}]);
  await touch('touchStart',[{x:j.x+60,y:j.y,id:1},{...p,id:2}]);await delay(600);
  await check('Two fingers can move and hold-fire simultaneously',`enc.player.joystick.output.x>.5&&enc.combat.firing&&enc.combat.shotsFired>=2&&rin.position.x>.5`);
  await touch('touchEnd',[{...p,id:2}]);await check('Releasing pistol does not cancel joystick',`!enc.combat.firing&&enc.player.joystick.output.x>.5`);
  await touch('touchEnd',[]);await check('Joystick releases and recenters',`enc.player.joystick.output.lengthSqr()===0`);
  const knife=await point('Knife button');await touch('touchStart',[{...knife,id:3}]);await touch('touchEnd',[]);
  await check('Knife touch button activates the real cooldown',`enc.combat.knifeCooldown>0`);
  const dodge=await point('Dodge button');await touch('touchStart',[{...dodge,id:4}]);await touch('touchEnd',[]);
  await check('Dodge touch button activates movement and cooldown',`enc.combat.dodgeCooldown>2.5`);
  await key('keyDown','Escape','Escape',27);await key('keyUp','Escape','Escape',27);await check('Escape pauses the encounter',`enc.paused&&enc.player.paused`);
  const pause=await point('Pause button');await touch('touchStart',[{...pause,id:5}]);await touch('touchEnd',[]);await check('Pause HUD resumes the encounter',`!enc.paused&&!enc.player.paused`);
  // Real beginning-to-victory run: default HP/enemies, no direct damage calls.
  await evaluate('enc.restart();void 0');await key('keyDown','j','KeyJ',74);
  let won=false;for(let i=0;i<50;i++){await delay(250);won=await evaluate(`enc.state==='victory'`);if(won)break;}
  await key('keyUp','j','KeyJ',74);assert.ok(won,'Holding J can defeat all five default enemies');checks++;console.log('PASS full five-enemy victory through real J input');
  await check('Victory screen shows AREA CLEARED',`safe.getChildByName('Encounter result').active&&safe.getChildByName('Encounter result').getChildByName('Result title').getComponentInChildren(cc.Label).string.includes('AREA CLEARED')`);
  let shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('temp/m2-victory.png',Buffer.from(shot.data,'base64'));
  const replay=await point('Replay button');await touch('touchStart',[{...replay,id:6}]);await touch('touchEnd',[]);
  await check('Replay UI resets all five enemies, health and combat',`enc.state==='playing'&&enc.spawner.alive===5&&enc.health.state.current===400&&enc.combat.shotsFired===0`);
  // Real defeat run: let the default five enemies attack the full 400 HP player.
  let lost=false;for(let i=0;i<160;i++){await delay(250);lost=await evaluate(`enc.state==='defeat'`);if(lost)break;}
  assert.ok(lost,'Default enemies can defeat the player');checks++;console.log('PASS full-health defeat from real enemy attacks');
  shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('temp/m2-defeat.png',Buffer.from(shot.data,'base64'));
  const replay2=await point('Replay button');await touch('touchStart',[{...replay2,id:7}]);await touch('touchEnd',[]);await check('Defeat restart restores playable state',`enc.state==='playing'&&!enc.player.dead&&enc.health.state.current===400`);
  await evaluate('enc.togglePause();void 0');
  const sizes=(process.argv[2]||'').includes(':7456')?[[1280,720]]:[[1280,720],[1560,720],[960,720]];
  for(const [width,height] of sizes){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await delay(400);for(const name of ['Movement joystick','Pistol button','Knife button','Dodge button','Player health','Enemy count']){const at=await point(name);assert.ok(at.x>40&&at.x<width-40&&at.y>30&&at.y<height-30,`${name} within ${width}x${height}`);}console.log(`PASS combat HUD bounds ${width}x${height}`);checks++;}
  assert.equal(errors.length,0,JSON.stringify(errors));checks++;console.log('PASS no console errors or uncaught exceptions');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await evaluate('enc.restart();void 0');await delay(200);shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('temp/m2-combat.png',Buffer.from(shot.data,'base64'));
  console.log(`${checks} M2 runtime checks passed`);
 }finally{await evaluate('cc.director.resume();void 0').catch(()=>{});c.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
