const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
const cache=new Map(),events=[],cc={_decorator:{ccclass:()=>T=>T},Component:class{},input:{on:event=>events.push(event),off(){}},Input:{EventType:{KEY_DOWN:'key-down',KEY_UP:'key-up',MOUSE_DOWN:'mouse-down',MOUSE_UP:'mouse-up'}},game:{on(){},off(){}},Game:{EVENT_HIDE:'hide'}};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const box={exports:{},require:id=>id==='cc'?cc:load(path.resolve(path.dirname(file),id+'.ts'))};cache.set(file,box.exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019,experimentalDecorators:true}}).outputText,box);return box.exports;}
const {PlayerCombat}=load('assets/scripts/player/PlayerCombat.ts'),{CombatConfig:C}=load('assets/scripts/core/GameConfig.ts');
const combat=new PlayerCombat();combat.node={position:{x:0,z:0},forward:{x:0,z:-1}};
let allowed=true,id=0,bullets=0,noise=0,rank=0;
const target={position:{x:0,z:-2},active:true,dead:false,hits:[],receiveDamage(hit){this.hits.push(hit);}};
let enemies=[target];
combat.context={player:{dodgeRemaining:0,face(){},visual:{play(){}}},canAct:()=>allowed,enemies:()=>enemies,obstacles:[],nextHit:()=>++id,rank:()=>rank,effects:{bullet(){bullets++;},impact(){}},onAction:()=>noise++};
combat.onEnable();assert.deepEqual(events,['key-down','key-up'],'mouse and joystick clicks never trigger firing');
combat.tick(.016);assert.equal(combat.shotsFired,1,'fires without any held input');assert.equal(target.hits[0].amount,C.pistolDamage);
combat.tick(C.pistolInterval/2);assert.equal(combat.shotsFired,1,'original fire interval retained');
combat.tick(C.pistolInterval/2);assert.equal(combat.shotsFired,2);
for(const state of ['menu','pause','upgrade','defeat']){allowed=false;combat.tick(1);assert.equal(combat.shotsFired,2,state+' prevents fire');}
allowed=true;combat.context.player.dodgeRemaining=.2;combat.tick(1);assert.equal(combat.shotsFired,2,'dodge prevents shooting');
combat.context.player.dodgeRemaining=0;
for(const condition of ['empty','dead','inactive','out-of-range','wall']){
 enemies=condition==='empty'?[]:[target];target.dead=condition==='dead';target.active=condition!=='inactive';
 target.position.z=condition==='out-of-range'?-(C.pistolRange+1):-2;
 combat.context.obstacles=condition==='wall'?[{x:0,z:-1,halfX:1,halfZ:.1}]:[];
 combat.tick(1);assert.equal(combat.shotsFired,2,condition+' prevents wasteful shots');
}
assert.equal(bullets,2);assert.equal(noise,2,'no noise without an actual shot');
combat.context.obstacles=[];rank=3;combat.tick(.016);
assert.equal(combat.shotsFired,3);assert.equal(bullets,5,'Bullet Storm assisted shots retained');
combat.reset();assert.equal(combat.shotsFired,0);combat.tick(.016);assert.equal(combat.shotsFired,1,'restart needs no input to resume auto fire');
console.log('PASS automatic targeting, cooldown, action gates, dodge, walls/range, no empty shots, upgrades, restart and no mouse firing listener');
