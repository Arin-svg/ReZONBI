const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
function run(file,deps){const box={exports:{},require:id=>deps(id)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019,experimentalDecorators:true}}).outputText,box);return box.exports;}
class Node{constructor(){this.active=true;this.position={x:0,z:0};}addChild(){}addComponent(T){const c=new T();c.node=this;return c;}destroy(){this.active=false;}}
class Enemy{get active(){return this.node.active;}get position(){return this.node.position;}initialize(kind,p){this.kind=kind;this.reset(p);}reset(p,m=1){this.node.position={...p};this.node.active=true;this.dead=false;this.health={maximum:100*m,current:100*m};}investigate(){}tick(){}}
const cc={Node,_decorator:{ccclass:()=>T=>T},Component:class{}};
const config=run('assets/scripts/core/GameConfig.ts',()=>({}));const S=config.SurvivalConfig;
const generic=new Proxy({}, {get:()=>class{}});
const movement={overlaps:(p,r,o)=>!!o.blocked};
const {ZombieSpawner}=run('assets/scripts/enemies/ZombieSpawner.ts',id=>id==='cc'?cc:id.endsWith('GameConfig')?config:id.endsWith('MovementMath')?movement:id.endsWith('CombatMath')?{distance:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)}:id==='./ZombieBase'?{ZombieBase:Enemy}:generic);
const makeSpawner=()=>new ZombieSpawner(new Node(),{},{player:new Node(),obstacles:[],navigation:{path:(a,b)=>[a,b]}});
const clear=s=>s.enemies.forEach(e=>{e.node.active=false;e.dead=true;});
const sp=makeSpawner();assert.equal(sp.wave,1);assert.equal(sp.spawnedSinceBoss,5);assert.equal(sp.waveSpawnBudget,8);
for(const wave of [1,2,5,10,100,500]){sp.wave=wave;assert.equal(sp.waveSpawnBudget,Math.ceil(8*1.015**(wave-1)));assert.equal(sp.exactSpawnBudget,8*1.015**(wave-1));}
for(const mins of [0,5,10,20,30,1000])assert.equal(sp.spawnInterval(mins*60),Math.max(.4,4/(1+.05*mins)));
assert.ok(sp.spawnInterval(61)<sp.spawnInterval(60));assert.equal(sp.spawnInterval(1e9,100),.4);
sp.reset();let spawned=sp.spawnedSinceBoss;for(let t=0;t<100;t+=.1){clear(sp);sp.tick(.1,t);assert.ok(sp.wave>=1&&sp.wave<=5);}
assert.ok(sp.wave>1);assert.ok(sp.spawnedSinceBoss>spawned);
// Pending milestone cannot disappear even if supplied a later wave number.
sp.wave=7;sp.nextBossWave=5;sp.spawnedSinceBoss=49;sp.waveSpawned=100;sp.cooldown=4;sp.tick(.1,200);assert.equal(sp.wave,7);assert.equal(sp.bossReady,false);
clear(sp);assert.ok(sp.spawn(200));assert.equal(sp.bossReady,true);sp.bossStarted();assert.equal(sp.spawnedSinceBoss,0);assert.equal(sp.nextBossWave,10);
const during=sp.wave;sp.waveSpawned=100;sp.tick(.1,200,100,true);assert.equal(sp.wave,during);sp.bossDefeated();assert.equal(sp.wave,during+1);assert.equal(sp.waveSpawned,0);
// Hard cap, failed placement and pool reuse never inflate counters.
sp.reset();for(let i=0;i<80;i++)sp.spawn(0);assert.equal(sp.alive,S.maxEnemies);const capCount=sp.spawnedSinceBoss;assert.equal(sp.spawn(0),null);assert.equal(sp.spawnedSinceBoss,capCount);sp.tick(100,10000);assert.equal(sp.enemies.length,S.maxEnemies);assert.equal(sp.spawnedSinceBoss,capCount);
clear(sp);assert.ok(sp.spawn(100));assert.equal(sp.enemies.length,S.maxEnemies);assert.equal(sp.spawnedSinceBoss,capCount+1);
sp.candidates=[];const failedCount=sp.spawnedSinceBoss;assert.equal(sp.spawn(100),null);assert.equal(sp.spawnedSinceBoss,failedCount);
const {CombatEncounter}=run('assets/scripts/core/CombatEncounter.ts',id=>id==='cc'?cc:id==='./GameConfig'?config:id==='./MovementMath'?movement:generic);
const e=new CombatEncounter();
const makeBoss=()=>{const b={active:false,dead:false,ticks:0,resetBoss(p,s){this.active=true;this.dead=false;this.strength=s;},hide(){this.active=false;},tick(){this.ticks++;},tickDeath(){}};e.bosses.push(b);return b;};
e.createBoss=makeBoss;e.boss=makeBoss();e.spawner=makeSpawner();e.player={node:{position:{x:0,z:0}},obstacles:[],reset(){}};e.health={dead:false,state:{tick(){},reset(){}}};e.combat={tick(){},reset(){}};e.noise={pressure:0,tick(){},reset(){}};e.skills={tick(){},reset(){}};e.pickups={tick(){},reset(){}};e.numbers={tick(){},reset(){}};e.effects={tick(){},reset(){}};e.hud={refresh(){},clearTouches(){}};e.progression.rank=()=>0;e.progression.reset=()=>{};e.selection={refresh(){}};
e.elapsed=10000;e.kills=50;e.spawner.wave=4;e.spawner.spawnedSinceBoss=50;e.spawner.cooldown=4;e.lateUpdate(.1);assert.equal(e.bossCount,0,'time and kills do not trigger a boss');
e.spawner.wave=5;e.spawner.spawnedSinceBoss=49;e.lateUpdate(.1);assert.equal(e.bossCount,0);
e.spawner.spawnedSinceBoss=50;e.player.obstacles=[{blocked:true}];e.spawnBoss();assert.equal(e.bossCount,0);assert.equal(e.spawner.spawnedSinceBoss,50,'failed boss placement preserves threshold');
e.player.obstacles=[];e.paused=true;const elapsed=e.elapsed;e.lateUpdate(.1);assert.equal(e.elapsed,elapsed);assert.equal(e.bossCount,0);e.paused=false;e.selecting=true;e.lateUpdate(.1);assert.equal(e.elapsed,elapsed);assert.equal(e.bossCount,0);e.selecting=false;e.lateUpdate(.1);assert.equal(e.bossCount,1);assert.equal(e.boss.strength,1);assert.equal(e.spawner.spawnedSinceBoss,0);assert.equal(e.spawner.nextBossWave,10);
for(let i=0;i<20;i++){e.spawnBoss();e.lateUpdate(.1);}assert.equal(e.bossCount,1);assert.equal(e.spawner.wave,5);assert.equal(e.spawner.spawnedSinceBoss,0,'normal quiet spawning pauses during boss');
e.boss.dead=true;e.spawner.bossDefeated();assert.equal(e.spawner.wave,6);e.lateUpdate(.1);assert.equal(e.bossCount,1);
e.boss.active=false;e.spawner.wave=10;e.spawner.waveSpawned=0;e.spawner.spawnedSinceBoss=49;e.spawner.cooldown=4;e.lateUpdate(.1);assert.equal(e.bossCount,1);e.spawner.spawnedSinceBoss=50;e.lateUpdate(.1);assert.equal(e.bossCount,2);assert.equal(e.boss.strength,1.5);assert.equal(e.bosses.length,1,'inactive boss pooled');
e.restart();assert.equal(e.elapsed,0);assert.equal(e.bossCount,0);assert.equal(e.spawner.wave,1);assert.equal(e.spawner.spawnedSinceBoss,5);assert.equal(e.spawner.nextBossWave,5);assert.ok(e.bosses.every(b=>!b.active));
// Restore living enemies without counting them again; retain pacing and pending milestone.
const saved={wave:5,waveSpawned:14,spawnedSinceBoss:49,nextBossWave:5,cooldown:1.2};e.spawner.restoreCheckpoint([{kind:'walker',x:8,z:8,hp:20,max:100}],180);e.spawner.restoreWaves(saved,0,false);assert.equal(e.spawner.spawnedSinceBoss,49);assert.deepEqual(JSON.parse(JSON.stringify(e.spawner.captureWaves())),saved);
e.spawner.restoreWaves(undefined,2,false);assert.equal(e.spawner.wave,11);assert.equal(e.spawner.nextBossWave,15);assert.equal(e.spawner.spawnedSinceBoss,0);

const progressionModule=run('assets/scripts/systems/Progression.ts',()=>({}));
const checkpoints=run('assets/scripts/systems/RunCheckpoint.ts',id=>id==='./Progression'?progressionModule:config);
e.progression=new progressionModule.Progression();e.health.state.current=400;e.player.node.setPosition=function(x,y,z){this.position={x,y,z};};
e.combat.pistolCooldown=e.combat.knifeCooldown=e.combat.dodgeCooldown=0;e.pickups.pool=[];e.pickups.drop=()=>{};
e.spawner.restoreWaves(saved,0,false);e.elapsed=180;e.kills=32;
const captured=checkpoints.captureRun(e);assert.ok(checkpoints.parseRun(JSON.stringify(captured)));
checkpoints.restoreRun(e,captured);assert.equal(e.elapsed,180);assert.equal(e.kills,32);assert.equal(e.spawner.spawnedSinceBoss,49);assert.equal(e.spawner.wave,5);assert.equal(e.spawner.cooldown,1.2);assert.equal(e.spawner.alive,1);
const legacy={...captured};delete legacy.waves;assert.ok(checkpoints.parseRun(JSON.stringify(legacy)));checkpoints.restoreRun(e,legacy);assert.equal(e.elapsed,180);assert.equal(e.spawner.wave,1);assert.equal(e.spawner.spawnedSinceBoss,0);
for(const bad of [{...saved,wave:0},{...saved,nextBossWave:10},{...saved,spawnedSinceBoss:-1},{...saved,cooldown:99}])assert.equal(checkpoints.parseRun(JSON.stringify({...captured,waves:bad})),null);
console.log('PASS actual checkpoint round-trip, no duplicate restored spawn counts, legacy migration, invalid wave-state rejection');

const {HealthState}=run('assets/scripts/systems/DamageSystem.ts',()=>({}));
const {SignalTyrant}=run('assets/scripts/enemies/SignalTyrant.ts',id=>id==='cc'?cc:id.endsWith('GameConfig')?config:id.endsWith('DamageSystem')?{HealthState}:id==='./ZombieBase'?{ZombieBase:class{reset(){}}}:generic);
const b=new SignalTyrant();let hit;b.bossContext={health:{receiveDamage(h){hit=h;}},nextHit:()=>1};b.node={uuid:'boss'};
for(const [strength,hp,damage] of [[1,1800,50],[1.5,2700,75],[2.25,4050,112.5]]){b.resetBoss({x:0,z:0},strength);assert.equal(b.health.maximum,hp);b.hit(50);assert.equal(hit.amount,damage);b.hit(40);assert.equal(hit.amount,40*strength);}
console.log('PASS wave budgets, continuous frequency, successful-spawn counts, cap/pooling, 49/50 gates, pending milestones, boss placement/duplicates, victory progression, pause/selection, saves, restart and unchanged boss strength/attacks');
