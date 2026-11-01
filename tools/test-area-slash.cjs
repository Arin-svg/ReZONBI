const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
const cache=new Map(),cc={_decorator:{ccclass:()=>T=>T},Component:class{}};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const box={exports:{},require:id=>id==='cc'?cc:load(path.resolve(path.dirname(file),id+'.ts'))};cache.set(file,box.exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019,experimentalDecorators:true}}).outputText,box);return box.exports;}
const {PlayerCombat}=load('assets/scripts/player/PlayerCombat.ts');
const combat=new PlayerCombat();combat.node={position:{x:0,z:0},forward:{x:0,z:-1}};
const enemy=(x,z,active=true,dead=false)=>({position:{x,z},active,dead,hits:[],knockback(origin,amount,duration){this.push={origin,amount,duration};},receiveDamage(hit){this.hits.push(hit);return true;}});
const enemies=[enemy(0,-3.8),enemy(-3,0),enemy(0,3),enemy(.5,0),enemy(2,0),enemy(0,3.81),enemy(0,1,false),enemy(0,1,true,true)];
let allowed=true,id=0,casts=0,noise=0;
combat.context={player:{dodgeRemaining:0,visual:{play(){}}},canAct:()=>allowed,enemies:()=>enemies,obstacles:[{x:1,z:0,halfX:.1,halfZ:.5}],nextHit:()=>++id,effects:{knifeSlash(p,f,r,a){casts++;assert.equal(r,3.8);assert.equal(a,360);}},onAction:()=>noise++};
assert.equal(combat.knife(),true);assert.equal(combat.knifeCooldown,15);
enemies.slice(0,4).forEach(e=>{assert.equal(e.hits.length,1);assert.equal(e.hits[0].amount,100);});
enemies.slice(4).forEach(e=>assert.equal(e.hits.length,0));
assert.equal(combat.knife(),false);assert.equal(casts,1);assert.equal(noise,1);
allowed=false;combat.tick(14.9);allowed=true;assert.equal(combat.knife(),false);
allowed=false;combat.tick(.1);allowed=true;assert.equal(combat.knife(),true);assert.equal(casts,2);
combat.reset();assert.equal(combat.knifeCooldown,0);
allowed=false;assert.equal(combat.knife(),false);assert.equal(combat.knifeCooldown,0);
allowed=true;combat.context.player.dodgeRemaining=.2;assert.equal(combat.knife(),false);
console.log('PASS area slash: all directions, radius edge, walls, inactive/dead targets, one hit per cast, 15-second cooldown, restart and action gates');

enemies.slice(0,4).forEach(e=>assert.equal(e.push.amount,1.6));
enemies.slice(4).forEach(e=>assert.equal(e.push,undefined));
const {ZombieBase}=load('assets/scripts/enemies/ZombieBase.ts');
function zombie(x,z,obstacles=[]){
 const e=new ZombieBase();e.enabled=true;e.health={dead:false};
 e.node={position:{x,y:.06,z},activeInHierarchy:true,setPosition(x,y,z){this.position={x,y,z};}};
 e.context={obstacles};return e;
}
for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1]]){
 const e=zombie(x,z);e.state='Attack';e.attackTime=.1;e.knockback({x:0,z:0},1.6,.2);
 assert.equal(e.state,'Stunned');assert.equal(e.attackTime,0);
 for(let i=0;i<4;i++)e.tickKnockback(.05);
 assert.ok(Math.abs(Math.hypot(e.position.x,e.position.z)-2.6)<1e-6);
 e.tickKnockback(1);assert.ok(Math.abs(Math.hypot(e.position.x,e.position.z)-2.6)<1e-6);
}
const wall=zombie(1,0,[{x:2,z:0,halfX:.05,halfZ:2}]);wall.knockback({x:0,z:0},1.6,.2);wall.tickKnockback(1);
assert.ok(wall.position.x<1.7,'knockback cannot tunnel through a thin wall');
const overlap=zombie(0,0);overlap.knockback({x:0,z:0},1.6,.2);overlap.tickKnockback(.2);assert.ok(Math.abs(overlap.position.x-1.6)<1e-6);
const corpse=zombie(1,0);corpse.health.dead=true;corpse.knockback({x:0,z:0},1.6,.2);corpse.tickKnockback(.2);assert.ok(Math.abs(corpse.position.x-2.6)<1e-6);
console.log('PASS slash knockback: outward directions, attack interrupt, finite overlap fallback, lethal hits, bounded duration and thin-wall collision');
