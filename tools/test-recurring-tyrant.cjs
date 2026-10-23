const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
function run(file,deps){const box={exports:{},require:id=>deps(id)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019,experimentalDecorators:true}}).outputText,box);return box.exports;}
const cc={_decorator:{ccclass:()=>T=>T},Component:class{}};
const config=run('assets/scripts/core/GameConfig.ts',()=>({}));
const generic=new Proxy({}, {get:()=>class{}});
const {CombatEncounter}=run('assets/scripts/core/CombatEncounter.ts',id=>id==='cc'?cc:id==='./GameConfig'?config:id==='./MovementMath'?{overlaps:()=>false}:generic);
const e=new CombatEncounter();
const makeBoss=()=>{const b={active:false,dead:false,ticks:0,resetBoss(p,s){this.active=true;this.dead=false;this.strength=s;},hide(){this.active=false;},tick(){this.ticks++;},tickDeath(){}};e.bosses.push(b);return b;};
e.createBoss=makeBoss;e.boss=makeBoss();e.spawner={enemies:[],tick(){},reset(){}};e.player={node:{position:{x:0,z:0}},obstacles:[],reset(){}};e.health={dead:false,state:{tick(){},reset(){}}};e.combat={tick(){},reset(){}};e.noise={pressure:0,tick(){},reset(){}};e.skills={tick(){},reset(){}};e.pickups={tick(){},reset(){}};e.numbers={tick(){},reset(){}};e.effects={tick(){},reset(){}};e.hud={refresh(){},clearTouches(){}};e.progression.rank=()=>0;e.progression.reset=()=>{};e.selection={refresh(){}};
e.elapsed=119.8;e.lateUpdate(.1);assert.equal(e.bossCount,0);e.lateUpdate(.1);assert.equal(e.bossCount,1);assert.equal(e.boss.strength,1);
e.paused=true;e.elapsed=239.95;e.lateUpdate(.1);assert.equal(e.bossCount,1);e.paused=false;e.selecting=true;e.lateUpdate(.1);assert.equal(e.bossCount,1);e.selecting=false;e.lateUpdate(.1);assert.equal(e.bossCount,2);assert.equal(e.boss.strength,1.5);assert.equal(e.targets().length,2);assert.ok(e.bosses.every(b=>b.ticks>0));
e.bosses[0].active=false;e.elapsed=359.95;e.lateUpdate(.1);assert.equal(e.bossCount,3);assert.equal(e.boss.strength,2.25);assert.equal(e.bosses.length,2,'inactive boss reused');
e.restart();assert.equal(e.bossCount,0);assert.equal(e.elapsed,0);assert.ok(e.bosses.every(b=>!b.active));e.elapsed=119.95;e.lateUpdate(.1);assert.equal(e.boss.strength,1);
const {HealthState}=run('assets/scripts/systems/DamageSystem.ts',()=>({}));
const {SignalTyrant}=run('assets/scripts/enemies/SignalTyrant.ts',id=>id==='cc'?cc:id.endsWith('GameConfig')?config:id.endsWith('DamageSystem')?{HealthState}:id==='./ZombieBase'?{ZombieBase:class{reset(){}}}:generic);
const b=new SignalTyrant();let hit;b.bossContext={health:{receiveDamage(h){hit=h;}},nextHit:()=>1};b.node={uuid:'boss'};
for(const [strength,hp,damage] of [[1,1800,50],[1.5,2700,75],[2.25,4050,112.5]]){b.resetBoss({x:0,z:0},strength);assert.equal(b.health.maximum,hp);b.hit(50);assert.equal(hit.amount,damage);b.hit(40);assert.equal(hit.amount,40*strength);}
console.log('PASS recurring Tyrants: 120-second boundaries, 1.5x HP/damage, overlapping bosses, pooling, pause/selection, restart');
