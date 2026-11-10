const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
class Node{constructor(name=''){this.name=name;this.children=[];this.components=[];this.events={};this.active=true;this.position={x:0,y:0,z:0};this.scale={x:1,y:1,z:1};}addChild(n){n.parent=this;this.children.push(n);}removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}addComponent(T){const c=new T();c.node=this;this.components.push(c);return c;}getComponent(T){return this.components.find(c=>c instanceof T)||null;}getComponentInChildren(T){return this.getComponent(T)||this.children.map(n=>n.getComponentInChildren(T)).find(Boolean)||null;}getChildByName(n){return this.children.find(c=>c.name===n)||null;}setPosition(x,y=0,z=0){this.position={x,y,z};}setScale(x,y,z){this.scale={x,y,z};}setSiblingIndex(){}on(t,fn){(this.events[t]??=[]).push(fn);}off(t){this.events[t]=[];}once(t,fn){this.on(t,fn);}destroy(){this.active=false;for(const f of this.events.destroy||[])f();}get activeInHierarchy(){return this.active&&(!this.parent||this.parent.activeInHierarchy);}}
Node.EventType={TOUCH_START:'start',TOUCH_END:'end',TOUCH_CANCEL:'cancel',TOUCH_MOVE:'move',NODE_DESTROYED:'destroy'};
class UITransform{setContentSize(w,h){this.width=w;this.height=h;}hitTest(point,windowId=0){return point.windowId===windowId;}convertToNodeSpaceAR(p){return p;}}
class Widget{updateAlignment(){const p=this.node.parent?.getComponent(UITransform);if(p)this.node.getComponent(UITransform).setContentSize(p.width,p.height);}}Widget.AlignMode={ALWAYS:1};
class Color{constructor(...v){this.value=v;}fromHEX(v){this.hex=v;return this;}}
class Graphics{}for(const m of ['moveTo','lineTo','close','fill','stroke','rect','roundRect','circle','clear','bezierCurveTo'])Graphics.prototype[m]=()=>{};
class Label{constructor(){this.string='';}}Label.HorizontalAlign={CENTER:1};Label.VerticalAlign={CENTER:1};Label.Overflow={SHRINK:1};Label.CacheMode={BITMAP:1};
class Sprite{}Sprite.SizeMode={CUSTOM:1};class SpriteFrame{destroy(){}}
const storage=new Map(),scene={globals:{shadows:{enabled:true}}};
const cc={Node,UITransform,Widget,Color,Graphics,Label,Sprite,SpriteFrame,Texture2D:class{},UIOpacity:class{},BlockInputEvents:class{},Component:class{},Vec2:class{},Vec3:class{constructor(x,y,z){Object.assign(this,{x,y,z});}},Layers:{Enum:{UI_2D:1}},_decorator:{ccclass:()=>T=>T},isValid:n=>!!n,resources:{load(p,t,cb){cb(null,{});}},sys:{isNative:false,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}},director:{getScene:()=>scene},game:{on(){},off(){}},Game:{EVENT_HIDE:"hide",EVENT_SHOW:"show"},AudioSource:class{play(){this.playing=true;}stop(){this.playing=false;}pause(){this.playing=false;}},AudioClip:class{},assetManager:{loadBundle(name,cb){cb(null,{load(path,type,done){done(null,{addRef(){},decRef(){},getDuration(){return .2;}});}});}},Tween:{stopAllByTarget(){}},tween:n=>({to(t,props){Object.assign(n,props);return this;},start(){}})};
cc.AudioSource.EventType={ENDED:"ended"};
const cache=new Map();function load(p){p=path.resolve(p);if(cache.has(p))return cache.get(p);const box={exports:{},require:id=>id==='cc'?cc:load(path.resolve(path.dirname(p),id+'.ts'))};cache.set(p,box.exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2019,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,box);return box.exports;}
const {ui}=load('assets/scripts/ui/ExplorationHUD.ts'),{Progression}=load('assets/scripts/systems/Progression.ts');
const root=new Node('Scene'),canvas=ui(root,'Mobile Canvas',1280,720),safe=ui(canvas,'Safe area',1280,720),hud=ui(safe,'HUD layer',1280,720),en= new Node('Encounter');root.addChild(en);
const e={node:en,state:'playing',paused:false,selecting:false,elapsed:0,kills:0,bossCount:0,bossSpawned:false,bosses:[],progression:new Progression(),noise:{pressure:0},health:{dead:false,state:{current:400,maximum:400}},player:{node:new Node('Rin'),paused:false,obstacles:[],joystick:{enabled:true},clearInput(){}},combat:{blocksMouse:()=>false,clearInput(){},pistolCooldown:0,knifeCooldown:0,dodgeCooldown:0},hud:{node:hud,clearTouches(){}},selection:{refresh(){}},spawner:{enemies:[],captureWaves(){return this.waves||{wave:1,waveSpawned:5,spawnedSinceBoss:5,nextBossWave:5,cooldown:4};},restoreWaves(w){this.waves=w;},restoreCheckpoint(s){this.enemies=s;}},pickups:{pool:[],drop(p,value){this.pool.push({node:{position:p},value});}},targets(){return[];},restoreWorld(){},restoreBossCheckpoint(){},restart(){this.elapsed=this.kills=this.bossCount=0;this.paused=this.selecting=false;this.state='playing';this.health.dead=false;this.health.state.current=400;this.progression.reset();this.pickups.pool=[];this.bosses=[];}};
const {GameUI}=load('assets/scripts/ui/GameUI.ts');const flow=new GameUI(e);
function find(n,name){if(n.name===name)return n;for(const c of n.children){const r=find(c,name);if(r)return r;}}
function click(name){const n=find(safe,name);assert.ok(n,name);const event={getID:()=>1,windowId:1,getLocation:()=>({windowId:1}),propagationStopped:false};for(const f of n.events.start||[])f(event);for(const f of n.events.end||[])f(event);return n;}
assert.equal(flow.page,'home');assert.equal(e.paused,true);assert.equal(hud.active,false);assert.equal((find(safe,'CONTINUE').events.start||[]).length,0);click('EXIT');assert.equal(flow.page,'home');
click('\u25b6   START');assert.equal(flow.page,'dialogue');for(let i=0;flow.page==='dialogue'&&i<20;i++)click(find(safe,'NEXT')?'NEXT':'CLOSE');assert.equal(flow.page,'game');assert.equal(e.paused,false);assert.equal(hud.active,true);
e.elapsed=130;e.kills=25;e.progression.level=4;e.progression.levels.blade=2;e.combat.knifeCooldown=8;flow.routePause();assert.equal(flow.page,'pause');assert.equal(e.paused,true);click('SETTINGS');click('GRAPHICS  \u2039  HIGH  \u203a');assert.equal(scene.globals.shadows.enabled,false);click('music mute');assert.equal(flow.audio.musicMuted,true);click('music mute');
const slider=find(safe,'music slider');const drag={getID:()=>9,getUILocation:()=>({x:0,y:0})};slider.events.start[0](drag);slider.events.end[0](drag);assert.equal(flow.audio.music,.5);assert.equal(flow.audio.sfx,.85);assert.equal(JSON.parse(storage.get('rezonbi.audio.v1')).music,.5);assert.equal(flow.page,'settings');click('BACK');click('TUTORIAL');click('NEXT');click('PREVIOUS');click('BACK');assert.equal(flow.page,'pause');
click('RETURN TO HOMEPAGE');click('CANCEL');assert.equal(flow.page,'pause');click('RETURN TO HOMEPAGE');click('CONFIRM');assert.equal(flow.page,'home');click('CONTINUE');assert.equal(flow.page,'game');assert.equal(e.elapsed,130);assert.equal(e.kills,25);assert.equal(e.progression.rank('blade'),2);assert.equal(e.combat.knifeCooldown,8);
flow.stageClear(100);flow.tick(.1);assert.equal(flow.page,'victory');click('NEXT STAGE');assert.equal(flow.page,'game');e.state='defeat';e.health.dead=true;flow.tick(.1);assert.equal(flow.page,'defeat');assert.equal(storage.has('rezonbi.run.v1'),false);click('RESTART ENCOUNTER');for(let i=0;flow.page==='dialogue'&&i<20;i++)click(find(safe,'NEXT')?'NEXT':'CLOSE');assert.equal(e.kills,0);assert.equal(e.elapsed,0);
let held=0;flow.interaction('Hold','Open',true,()=>held++);find(hud,'Interaction prompt').events.start[0]();flow.tick(1);assert.equal(held,0);flow.tick(1);assert.equal(held,1);flow.tick(1);assert.equal(held,1);
for(const [w,h] of [[960,720],[1280,720],[1560,720]]){safe.getComponent(UITransform).setContentSize(w,h);flow.tick(.1);const content=find(safe,'Screen content');assert.ok(content.scale.x*960<=w);}
const {captureRun,parseRun}=load('assets/scripts/systems/RunCheckpoint.ts');const good=captureRun(e);assert.ok(parseRun(JSON.stringify(good)));for(const bad of [null,{}, {...good,player:{x:Infinity,z:0,hp:10}},{...good,cooldowns:[0,-2,0]},{...good,levels:{blade:99}}])assert.equal(parseRun(JSON.stringify(bad)),null);
console.log('PASS UI: homepage, disabled controls, dialogue, pause, settings, tutorial, confirmations, save/continue, victory, defeat/restart, hold input, landscape fit and save validation');

flow.show('home');click('SETTINGS');click('HUAWEI ACCOUNT');
assert.equal(flow.page,'account');assert.equal(e.paused,true);
click('SIGN IN WITH HUAWEI');assert.equal(flow.huawei.status,'unavailable');
click('BACK');assert.equal(flow.page,'settings');click('BACK');assert.equal(flow.page,'home');
console.log('PASS account screen navigation and browser-unavailable sign-in leaves guest gameplay accessible');
flow.show('game');

const locale=load('assets/scripts/ui/Localization.ts');
const caption=name=>find(safe,name).getComponentInChildren(Label).string;
flow.routePause();click('SETTINGS');
const qualityBefore=storage.get('rezonbi.ui.settings.v1'),saveBefore=storage.get('rezonbi.run.v1');
click('LANGUAGE: ENGLISH');
assert.equal(locale.getLanguage(),'ms');assert.equal(caption('LANGUAGE: ENGLISH'),'BAHASA: BAHASA MELAYU');
assert.equal(caption('BACK'),'KEMBALI');assert.equal(caption('Heading SETTINGS'),'TETAPAN');
assert.equal(storage.get('rezonbi.language.v1'),'ms');
assert.equal(storage.get('rezonbi.ui.settings.v1'),qualityBefore);assert.equal(storage.get('rezonbi.run.v1'),saveBefore);
click('BACK');click('TUTORIAL');assert.equal(caption('Heading FIELD GUIDE'),'PANDUAN LAPANGAN');
assert.equal(caption('NEXT'),'SETERUSNYA');click('BACK');click('SETTINGS');
assert.equal(locale.translate('WAVE 12 · 2:03\nINFECTED 24'),'GELOMBANG 12 · 2:03\nZOMBI 24');
assert.equal(locale.translate('Level 3  ?  20 kills\nSurvived 1:05'),'Tahap 3  ?  20 ditewaskan\nBertahan 1:05');
for(const skill of load('assets/scripts/systems/Progression.ts').Skills){
 assert.notEqual(locale.translate(skill.name),skill.name);
 for(let rank=1;rank<=skill.max;rank++)assert.notEqual(locale.translate(skill.describe(rank)),skill.describe(rank));
}
// Simulate a fresh launch reading the saved preference, plus restricted storage.
const localeCode=ts.transpileModule(fs.readFileSync('assets/scripts/ui/Localization.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2019,module:ts.ModuleKind.CommonJS}}).outputText;
const fresh={exports:{},require:()=>cc};vm.runInNewContext(localeCode,fresh);assert.equal(fresh.exports.getLanguage(),'ms');
const blocked={exports:{},require:()=>({...cc,sys:{localStorage:{getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}}}})};
vm.runInNewContext(localeCode,blocked);assert.equal(blocked.exports.getLanguage(),'en');
assert.doesNotThrow(()=>blocked.exports.setLanguage('ms'));assert.equal(blocked.exports.translate('BACK'),'KEMBALI');
click('LANGUAGE: ENGLISH');assert.equal(caption('BACK'),'BACK');assert.equal(locale.getLanguage(),'en');
assert.equal(storage.get('rezonbi.language.v1'),'en');
console.log('PASS English/Malay toggle, menus/tutorial, dynamic text, all upgrade ranks, persistence, storage fallback and unchanged saves/graphics');

const {staticGraphics,StaticUIGraphics}=load('assets/scripts/ui/StaticUIGraphics.ts');
const control=ui(safe,'Native lifecycle fixture',100,100);let paints=0;
const graphic=staticGraphics(control,g=>{paints++;g.circle(0,0,40);g.fill();});
const retained=control.getComponent(StaticUIGraphics),componentCount=control.components.length;
assert.equal(paints,1);
// Native Graphics loses draw data when its HUD is hidden or removed from its parent.
for(let i=0;i<5;i++)retained.onEnable();
assert.equal(paints,6);assert.equal(control.getComponent(Graphics),graphic);
assert.equal(control.components.length,componentCount,'showing controls reuses components');
assert.equal(retained.update,undefined,'static controls do not redraw every frame');
console.log('PASS static UI repaint after native hide/reparent without per-frame rendering or new components');

cc.Vec2.prototype.set=function(x,y){this.x=x;this.y=y;};
cc.Vec3.prototype.set=function(x,y,z){this.x=x;this.y=y;this.z=z;};
const {MobileJoystick}=load('assets/scripts/ui/MobileJoystick.ts');
const stickNode=ui(safe,'Touch joystick fixture',184,184),thumb=new Node('Thumb');
stickNode.getComponent(UITransform).convertToNodeSpaceAR=(p,out)=>{out.set(p.x,p.y,p.z);return out;};
const stick=stickNode.addComponent(MobileJoystick);stick.setThumb(thumb);stick.reset();
const touch=(id,x,y)=>({getID:()=>id,getUILocation:()=>({x,y}),propagationStopped:false});
stick.onStart(touch(1,68,0));assert.equal(stick.output.x,1);assert.equal(stick.output.y,0);
stick.onStart(touch(2,-68,0));assert.equal(stick.output.x,1,'second finger cannot steal movement');
stick.onEnd(touch(2,0,0));assert.equal(stick.output.x,1,'releasing fire finger preserves joystick');
stick.onMove(touch(1,0,68));assert.equal(stick.output.y,1);
stick.onEnd(touch(1,0,0));assert.equal(stick.output.x,0);assert.equal(stick.output.y,0);
stick.onStart(touch(1,68,0));stick.onDisable();assert.equal(stick.output.x,0);
console.log('PASS touch joystick movement, second-finger isolation, release and pause/reset');

const {CombatHUD}=load('assets/scripts/ui/CombatHUD.ts');
const {label,panel}=load('assets/scripts/ui/ExplorationHUD.ts');
const mobileScene=new Node('Mobile test'),mobileCanvas=ui(mobileScene,'Mobile Canvas',1280,720),mobileSafe=ui(mobileCanvas,'Safe area',1280,720);
for(const name of ['Area heading','Movement hint','Movement joystick','Paused hint'])ui(mobileSafe,name,100,100);
const pauseButton=label(mobileSafe,'Pause button','',58,58,16);panel(pauseButton,58,58);
let swordTaps=0,dodgeTaps=0;
const mobileEncounter={...e,bosses:[],combat:{pistolCooldown:0,knifeCooldown:0,dodgeCooldown:0,knife(){swordTaps++;},dodge(){dodgeTaps++;}},togglePause(){},restart(){}};
const mobileHUD=new CombatHUD(mobileScene,mobileEncounter,{});
assert.equal(find(mobileSafe,'Pistol button'),undefined,'no manual Fire button');
assert.ok(find(mobileSafe,'Movement joystick'));
for(const name of ['Knife button','Dodge button']){
 const button=find(mobileSafe,name);assert.ok(button);
 button.events.start[0]({getID:()=>3,propagationStopped:false});
 button.events.end[0]({getID:()=>3,propagationStopped:false});
}
assert.equal(swordTaps,1);assert.equal(dodgeTaps,1);
console.log('PASS mobile HUD contains joystick, working sword/dodge and no Fire button');

// Personal bests survive death/new runs, remain independent, and tolerate corrupt storage.
storage.delete('rezonbi.record.v1');flow.started=true;e.kills=42;e.elapsed=180;
flow.updateRecord();e.kills=12;e.elapsed=240;flow.updateRecord();
assert.deepEqual(JSON.parse(storage.get('rezonbi.record.v1')),{kills:42,seconds:240});
flow.show('home');click('STATS');assert.equal(flow.page,'stats');click('BACK');
assert.equal(flow.page,'home');e.state='defeat';e.health.dead=true;flow.show('game');flow.tick(.1);
assert.equal(storage.has('rezonbi.run.v1'),false);
assert.deepEqual(JSON.parse(storage.get('rezonbi.record.v1')),{kills:42,seconds:240});
flow.start();assert.deepEqual(JSON.parse(storage.get('rezonbi.record.v1')),{kills:42,seconds:240});
storage.set('rezonbi.record.v1','{broken');assert.equal(flow.record().kills,0);
storage.set('rezonbi.record.v1',JSON.stringify({kills:-1,seconds:'bad'}));assert.equal(flow.record().seconds,0);
console.log('PASS accessible stats, independent personal bests, death/restart persistence and invalid-record fallback');
