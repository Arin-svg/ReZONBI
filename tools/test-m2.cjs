const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require(process.env.COCOS_TYPESCRIPT||'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const box={exports:{},require:id=>load(path.resolve(path.dirname(file),id+'.ts'))};cache.set(file,box.exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText,box);return box.exports;}
const {HealthState}=load('assets/scripts/systems/DamageSystem.ts');
const {clearLine,inArc,nearestVisible,distance}=load('assets/scripts/systems/CombatMath.ts');
const {ArenaNavigation}=load('assets/scripts/systems/ArenaNavigation.ts');
const {CombatConfig:C,enemyHealthMultiplier}=load('assets/scripts/core/GameConfig.ts');
let count=0;function check(name,fn){fn();console.log('PASS',name);count++;}
const hit=(id,amount=24)=>({id,amount,source:'test',kind:'pistol'});
check('Health clamps, rejects duplicate hits and dead targets',()=>{const h=new HealthState(50);assert.ok(h.damage(hit(1)));assert.equal(h.current,26);assert.ok(!h.damage(hit(1)));assert.ok(h.damage(hit(2,99)));assert.equal(h.current,0);assert.ok(!h.damage(hit(3)));h.reset();assert.equal(h.current,50);assert.ok(!h.damage(hit(4,NaN)));});
check('Hit protection and dodge invulnerability expire in simulation time',()=>{const h=new HealthState(400,0.35);h.invulnerability=.25;assert.ok(!h.damage(hit(1)));h.tick(.26);assert.ok(h.damage(hit(2)));assert.ok(!h.damage(hit(3)));h.tick(.36);assert.ok(h.damage(hit(4)));assert.equal(h.current,352);});
const wall=[{x:0,z:0,halfX:1,halfZ:3}];
check('Line of sight blocks crossings, tangent hits, endpoints inside solids',()=>{assert.ok(!clearLine({x:-4,z:0},{x:4,z:0},wall));assert.ok(!clearLine({x:-4,z:3},{x:4,z:3},wall));assert.ok(!clearLine({x:0,z:0},{x:4,z:0},wall));assert.ok(clearLine({x:-4,z:4},{x:4,z:4},wall));});
check('Targeting excludes dead/inactive/occluded/out-of-range enemies',()=>{const a={position:{x:2,z:0},dead:false,active:true},b={position:{x:-4,z:2},dead:false,active:true},c={position:{x:-4,z:1},dead:true,active:true};assert.equal(nearestVisible({x:-4,z:0},[a,b,c],12,wall),b);b.active=false;assert.equal(nearestVisible({x:-4,z:0},[a,b,c],12,wall),null);assert.equal(nearestVisible({x:-4,z:0},[a],1,[]),null);});
check('Area slash covers every direction and respects radius',()=>{const p={x:0,z:0},f={x:0,z:-1};for(const target of [{x:0,z:-3},{x:3,z:0},{x:0,z:3},{x:-3,z:0}])assert.ok(inArc(p,f,target,C.knifeRange,C.knifeArc));assert.ok(!inArc(p,f,{x:0,z:3.81},C.knifeRange,C.knifeArc));});
check('Area slash tuning is 360 degrees with 15-second cooldown',()=>{assert.equal(C.knifeRange,3.8);assert.equal(C.knifeArc,360);assert.equal(C.knifeCooldown,15);});
check('A* routes around a solid wall with clearance on every segment',()=>{const nav=new ArenaNavigation(wall,.34),from={x:-4,z:0},to={x:4,z:0},route=nav.path(from,to);assert.ok(route.length>2);let prev=from;for(const p of route){assert.ok(clearLine(prev,p,wall,.34));prev=p;}assert.ok(distance(prev,to)<.01);assert.ok(route.some(p=>Math.abs(p.z)>3.34));});
check('Navigation handles an unreachable enclosed destination',()=>{const box=[{x:0,z:-2,halfX:2,halfZ:.3},{x:0,z:2,halfX:2,halfZ:.3},{x:-2,z:0,halfX:.3,halfZ:2},{x:2,z:0,halfX:.3,halfZ:2}];const nav=new ArenaNavigation(box,.34);assert.equal(nav.path({x:-5,z:0},{x:0,z:0}).length,0);});
check('Combat budget and enemy tuning remain coherent',()=>{assert.equal(C.maxEnemies,5);assert.ok(C.runner.speed>C.walker.speed);assert.ok(C.runner.hp<C.walker.hp);assert.ok(C.dodgeInvulnerability<=C.dodgeDuration);assert.equal(C.pistolDamage,24);assert.equal(C.knifeDamage,100);});
check('New infected gain health continuously over time and have a firm cap',()=>{assert.equal(enemyHealthMultiplier(-60),1);assert.equal(enemyHealthMultiplier(0),1);assert.equal(enemyHealthMultiplier(30),1.15);assert.equal(enemyHealthMultiplier(120),1.6);assert.equal(enemyHealthMultiplier(240),2.2);assert.equal(enemyHealthMultiplier(300),2.5);assert.equal(enemyHealthMultiplier(900),2.5);});
console.log(`${count} M2 logic checks passed; runtime components are checked separately.`);
