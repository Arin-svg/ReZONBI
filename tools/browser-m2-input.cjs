// Focused input regression: complementary to the full combat encounter test.
const assert=require('node:assert/strict'),delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const c=await require('./cdp-client.cjs').connect(),{send,evaluate,errors}=c;
 const key=(type,key,code,vk)=>send('Input.dispatchKeyEvent',{type,key,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});
 const touch=(type,touchPoints)=>send('Input.dispatchTouchEvent',{type,touchPoints});
 const mouse=(type,x,y)=>send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1});
 const point=name=>evaluate(`(()=>{const n=safe.getChildByName('${name}'),cam=scene.getChildByName('Mobile Canvas').getChildByName('UI Camera').getComponent(cc.Camera),p=cam.worldToScreen(n.worldPosition),el=document.querySelector('canvas'),r=el.getBoundingClientRect();return{x:r.left+p.x/el.width*r.width,y:r.top+(el.height-p.y)/el.height*r.height};})()`);
 try{
  await send('Runtime.enable');errors.length=0;
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  // Start at the chosen viewport, rather than inheriting a resized canvas from another test.
  const url = process.argv[2] || await evaluate('location.href');
  await send('Page.navigate',{url});
  let ready=false;for(let i=0;i<60;i++){await delay(500);ready=await evaluate(`typeof cc!=='undefined'&&!!cc.director.getScene()?.getChildByName('Combat Encounter')?.getComponent('CombatEncounter')?.hud`);if(ready)break;}
  assert.ok(ready,'Combat scene loaded');
  await evaluate(`window.scene=cc.director.getScene();window.enc=scene.getChildByName('Combat Encounter').getComponent('CombatEncounter');window.safe=scene.getChildByName('Mobile Canvas').getChildByName('Safe area');enc.restart();cc.director.resume();void 0`);
  await mouse('mousePressed',640,360);
  for(let i=0;i<20;i++){await delay(100);if(await evaluate('enc.combat.shotsFired>=2'))break;}
  await mouse('mouseReleased',640,360);
  assert.ok(await evaluate('enc.combat.shotsFired>=2&&!enc.combat.firing'));console.log('PASS left mouse hold-to-fire and release');
  await evaluate('enc.restart();void 0');const k=await point('Knife button');
  await mouse('mousePressed',k.x,k.y);await mouse('mouseReleased',k.x,k.y);await delay(100);
  assert.ok(await evaluate('enc.combat.knifeCooldown>0&&enc.combat.shotsFired===0'));console.log('PASS clicking knife UI does not fire pistol into the world');
  await evaluate('enc.restart();void 0');await key('keyDown','k','KeyK',75);await key('keyUp','k','KeyK',75);
  assert.ok(await evaluate('enc.combat.knifeCooldown>0'));await key('keyDown',' ','Space',32);await key('keyUp',' ','Space',32);
  assert.ok(await evaluate('enc.combat.dodgeCooldown>2.5'));console.log('PASS K knife and Space dodge keyboard bindings');
  await key('keyDown','Escape','Escape',27);await key('keyDown','Escape','Escape',27);
  assert.ok(await evaluate('enc.paused'));await key('keyUp','Escape','Escape',27);await key('keyDown','Escape','Escape',27);await key('keyUp','Escape','Escape',27);
  assert.ok(await evaluate('!enc.paused'));console.log('PASS held Escape does not repeatedly toggle pause');
  await evaluate('enc.restart();void 0');const j=await point('Movement joystick'),p=await point('Pistol button');
  await touch('touchStart',[{...j,id:1}]);await touch('touchMove',[{x:j.x+65,y:j.y,id:1}]);
  await touch('touchStart',[{x:j.x+65,y:j.y,id:1},{...p,id:2}]);await delay(100);
  await touch('touchEnd',[{x:j.x+65,y:j.y,id:1}]);
  assert.ok(await evaluate('enc.combat.firing&&enc.player.joystick.output.lengthSqr()===0'));console.log('PASS releasing joystick does not cancel pistol finger');
  await touch('touchCancel',[]);assert.ok(await evaluate('!enc.combat.firing'));console.log('PASS cancelled pistol touch releases hold-fire');
  assert.equal(errors.length,0,JSON.stringify(errors));await evaluate('enc.restart();void 0');console.log('6 extra input checks passed');
 }finally{c.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
