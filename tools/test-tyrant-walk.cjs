const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require(process.env.COCOS_TYPESCRIPT || 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
// Minimal render API fixture: execute the actual animation code without a GPU.
class Vec3 {
    constructor(x=0,y=0,z=0) { this.set(x,y,z); }
    set(x,y,z) { Object.assign(this,{x,y,z}); }
    static transformQuat(out,v) { out.set(v.x,v.y,v.z); }
    static add(out,a,b) { out.set(a.x+b.x,a.y+b.y,a.z+b.z); }
}
Vec3.FORWARD = new Vec3(0,0,-1);
class Vec4 { set(x,y,z,w) { Object.assign(this,{x,y,z,w}); } }
class Color { constructor(r,g,b,a) { Object.assign(this,{r,g,b,a}); } }
class Node {
    constructor() { this.worldPosition = new Vec3(); this.worldRotation = {}; }
    addChild() {}
    addComponent(T) { return new T(); }
    setPosition() {}
    setWorldPosition(v) { this.worldPosition = {...v}; }
    setWorldRotation() {}
    setScale(x,y,z) { this.scale = {x,y,z}; }
    destroy() {}
}
class Material {
    constructor() { this.props = {}; }
    initialize() {}
    setProperty(k,v) { this.props[k] = v; }
    getProperty(k) { return this.props[k]; }
    destroy() {}
}
class MeshRenderer { setSharedMaterial() {} }
const cc = {isValid:n=>!n.destroyed,Node,Color,Vec3,Vec4,Material,MeshRenderer,utils:{createMesh:()=>({destroy(){}})}};
const compile = file => ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const config = {exports:{}};
vm.runInNewContext(compile('assets/scripts/core/GameConfig.ts'),config);
const moduleBox = {exports:{},require:id=>id==='cc'?cc:config.exports};
vm.runInNewContext(compile('assets/scripts/player/WorldSpriteVisual.ts'),moduleBox);
const {WorldSpriteVisual} = moduleBox.exports;
const key = {width:1254,height:1254}, sheet = {width:1774,height:887};
const make = (kind='boss',walk=sheet) => new WorldSpriteVisual(new Node(),new Node(),key,{},kind,null,null,null,null,null,walk);
const visual = make();
assert.equal(visual.material.getProperty('mainTexture'),sheet);
const seen = new Set();
for(let i=0;i<8;i++) {
    visual.animate(.1,2.1); seen.add(visual.frame);
    const uv = visual.material.getProperty('tilingOffset');
    assert.ok(uv.x>0 && uv.y>0 && uv.z>=0 && uv.w>=0);
    assert.ok(uv.x+uv.z<=1.000001 && uv.y+uv.w<=1.000001);
}
assert.equal(seen.size,8,'all walking poses played');
const frame = visual.frame;
visual.animate(0,2.1);
assert.equal(visual.frame,frame,'camera-only update does not advance paused animation');
visual.animate(.2,0);
assert.equal(visual.frame,0,'stationary boss uses a planted pose');
visual.reset(); visual.animate(.125,10);
const chargeTime = visual.bossWalkTime;
visual.reset(); visual.animate(.125,2.1);
assert.equal(chargeTime,visual.bossWalkTime,'charge preserves the 10 FPS cadence');
visual.play('die',.7); visual.animate(.1,2.1);
assert.equal(visual.state,'die'); assert.equal(visual.frame,0);
const deadHeight = visual.root.scale.y;
visual.reset(); assert.equal(visual.state,'idle'); assert.ok(visual.root.scale.y>deadHeight);
const fallback = make('boss',null);
assert.equal(fallback.material.getProperty('mainTexture'),key);
assert.equal(fallback.material.getProperty('tilingOffset').x,1);
const walker = make('walker',null);
assert.equal(walker.material.getProperty('mainTexture'),key);
assert.ok(walker.material.getProperty('tilingOffset').x<.3,'ordinary zombie still uses its atlas');
const scene = JSON.parse(fs.readFileSync('assets/Main.scene','utf8'));
const meta = JSON.parse(fs.readFileSync('assets/art/bosses/signal-tyrant/signal-tyrant-walk.png.meta','utf8'));
const bootstraps = scene.filter(n=>n.bossArtwork);
assert.ok(bootstraps.length, 'scene contains a boss artwork assignment');
for(const bootstrap of bootstraps) {
    assert.ok(bootstrap.bossWalkAtlas, 'Boss Walk Atlas is unassigned in Main.scene: Tyrant will show static art');
    assert.equal(bootstrap.bossWalkAtlas.__uuid__,meta.subMetas['6c48a'].uuid);
}
console.log('PASS Tyrant walk: eight frames, UV bounds, pause, idle, charge cadence, death/reset, fallback, zombie atlas and scene bindings');

for(const parentAlreadyDestroyed of [false,true]) {
    const cleanup=make('walker',null);let roots=0,meshes=0,materials=0;
    cleanup.root.destroyed=parentAlreadyDestroyed;
    cleanup.root.destroy=()=>{roots++;cleanup.root.destroyed=true;};
    cleanup.mesh.destroy=()=>meshes++;
    cleanup.material.destroy=()=>materials++;
    Object.defineProperty(cleanup.renderer,'mesh',{set(){throw new Error('Cocos renderer already torn down');}});
    assert.doesNotThrow(()=>cleanup.destroy());
    assert.doesNotThrow(()=>cleanup.destroy());
    assert.equal(roots,parentAlreadyDestroyed?0:1);assert.equal(meshes,1);assert.equal(materials,1);
}
console.log('PASS sprite cleanup: live root, parent teardown, no renderer mutation and idempotent asset release');

for(const kind of ['runner','brute']){
 const texture={width:kind==='runner'?981:996,height:793};
 const enemy=new WorldSpriteVisual(new Node(),new Node(),texture,{},kind,null,null,null,null,null,null,true);
 const frames=new Set();
 for(let i=0;i<40;i++){enemy.animate(.05,1);frames.add(enemy.frame);const uv=enemy.material.getProperty('tilingOffset');assert.ok(uv.x>0&&uv.y>0&&uv.z>=0&&uv.w>=0&&uv.x+uv.z<=1&&uv.y+uv.w<=1);}
 assert.equal(frames.size,kind==='runner'&&enemy.direction===0?2:4);assert.equal(enemy.material.getProperty('mainTexture'),texture);
 assert.equal(enemy.size,kind==='runner'?1.65:2.8);
 const hashes={"runner":"1aa05d1368a8f4c872bc85a5784bc7c814686610f91fcb4a2ffa35daa59302a2","brute":"cb7b9e055526fbb6d162b425a5945ff475009879f8c374d1503a6f6a06bcaef9"};assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync('assets/resources/enemies/'+kind+'.png')).digest('hex'),hashes[kind]);
}
console.log('PASS runner/brute original artwork, distinct sizes and directional atlas animation');

// Exercise every facing: UVs must match individual poses, never the old grid cells.
const runnerCrops=[[[24,20,187,208],[218,35,409,209]],[[23,407,171,584],[212,410,377,585],[416,407,587,585],[625,420,762,581]],[[27,219,220,397],[235,233,426,396],[444,219,676,394],[716,225,941,396]],[[19,596,194,775],[205,601,407,774],[420,592,627,774],[634,596,935,775]]];
const transform=Vec3.transformQuat;
Vec3.transformQuat=(out,v,q)=>q.facing?out.set(...q.facing):transform(out,v,q);
for(let dir=0;dir<4;dir++){
 const actor=new Node();actor.worldRotation={facing:[[1,0,1],[-1,0,-1],[-1,0,1],[1,0,-1]][dir]};
 const runner=new WorldSpriteVisual(actor,new Node(),{width:981,height:793},{},'runner',null,null,null,null,null,null,true);
 const observed=new Set();
 for(let i=0;i<50;i++){runner.animate(.04,1);assert.equal(runner.direction,dir);const uv=runner.material.getProperty('tilingOffset'),c=runnerCrops[dir][runner.frame%4];observed.add(runner.frame);assert.ok(Math.abs(uv.z*981-c[0])<1e-6);assert.ok(Math.abs((uv.z+uv.x)*981-c[2])<1e-6);assert.ok(Math.abs(uv.w*793-c[1])<1e-6);assert.ok(Math.abs((uv.w+uv.y)*793-c[3])<1e-6);}
 assert.equal(observed.size,runnerCrops[dir].length);
}
Vec3.transformQuat=transform;
console.log('PASS all 14 runner frames use measured per-pose crops in all four directions');

const bruteCrops=[[[30,13,227,213],[251,12,441,217],[463,13,677,217],[694,16,983,221]],[[29,409,235,600],[261,407,478,603],[504,409,734,593],[759,420,965,595]],[[41,216,209,404],[252,217,484,404],[517,219,721,408],[741,226,969,415]],[[24,601,204,779],[217,604,427,779],[438,601,659,780],[700,602,978,779]]];
Vec3.transformQuat=(out,v,q)=>q.facing?out.set(...q.facing):transform(out,v,q);
for(let dir=0;dir<4;dir++){
 const actor=new Node();actor.worldRotation={facing:[[1,0,1],[-1,0,-1],[-1,0,1],[1,0,-1]][dir]};
 const brute=new WorldSpriteVisual(actor,new Node(),{width:996,height:793},{},'brute',null,null,null,null,null,null,true);
 const observed=new Set();
 for(let i=0;i<60;i++){brute.animate(.04,1);assert.equal(brute.direction,dir);const uv=brute.material.getProperty('tilingOffset'),c=bruteCrops[dir][brute.frame%4];observed.add(brute.frame);assert.ok(Math.abs(uv.z*996-c[0]-.5)<1e-6);assert.ok(Math.abs((uv.z+uv.x)*996-c[2]+.5)<1e-6);assert.ok(Math.abs(uv.w*793-c[1]-.5)<1e-6);assert.ok(Math.abs((uv.w+uv.y)*793-c[3]+.5)<1e-6);}
 assert.equal(observed.size,4);
}
Vec3.transformQuat=transform;
console.log('PASS all 16 brute crops in four directions, with half-texel sampling inset');

const redTexture={width:2172,height:724};
const red=new WorldSpriteVisual(new Node(),new Node(),key,{},'boss',null,null,null,null,null,sheet,false,redTexture);
assert.equal(red.material.getProperty('mainTexture'),redTexture);
const idleFrames=new Set(),walkFrames=new Set();
for(let i=0;i<8;i++){red.animate(.1,0);idleFrames.add(red.frame);assert.ok(red.frame<4);}
for(let i=0;i<8;i++){red.animate(.1,2.1);walkFrames.add(red.frame);assert.ok(red.frame>=4&&red.frame<8);const uv=red.material.getProperty('tilingOffset');assert.ok(uv.x>0&&uv.y>0&&uv.x+uv.z<=1&&uv.y+uv.w<=1);}
assert.equal(idleFrames.size,4);assert.equal(walkFrames.size,4);const frozen=red.frame;red.animate(0,2.1);assert.equal(red.frame,frozen);red.reset();assert.equal(red.frame,0);
console.log('PASS red Tyrant atlas binding, idle/walk clips, UV bounds, pause and reset');

// Verify actual source pivots, constant pixel scale and the untouched world origin.
const crops=[
 [0,0,164,153,89,146],[164,0,315,153,237,146],
 [315,0,468,153,389.5,146],[468,0,628,153,539.5,146],
 [0,153,152,309,87,297],[152,153,283,309,223,298],
 [283,153,416,309,353,298],[416,153,550,309,479,297],
];
const actor=new Node();actor.worldPosition.set(7,.06,-9);
const grounded=new WorldSpriteVisual(actor,new Node(),key,{},'boss',null,null,null,null,null,sheet,false,redTexture);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const resources=[grounded.mesh,grounded.material];
for(const speed of [0,2.1,10])for(let i=0;i<8;i++){
 grounded.animate(.1,speed);
 const crop=crops[grounded.frame],uv=grounded.material.getProperty('tilingOffset');
 near(uv.z*2172,crop[0]+.5);near((uv.z+uv.x)*2172,crop[2]-.5);
 const unit=grounded.size/140;
 near(grounded.root.scale.x/(crop[2]-crop[0]-1),unit);
 near(grounded.root.scale.y/(crop[3]-crop[1]-1),unit);
 near(grounded.root.worldPosition.x+(crop[4]-(crop[0]+crop[2])/2)*unit,7);
 near(grounded.root.worldPosition.y+(crop[3]-.5-crop[5])*unit,.06);
 near(grounded.root.worldPosition.z,-9);
 assert.equal(grounded.mesh,resources[0]);assert.equal(grounded.material,resources[1]);
}
const visibleRatio=135/140*grounded.size/config.exports.SpriteConfig.characterHeight;
assert.ok(visibleRatio>=2&&visibleRatio<=2.5);
Vec3.transformQuat=(out,v,q)=>q.facing?out.set(...q.facing):transform(out,v,q);
const beforeTurn=grounded.frame,timeBeforeTurn=grounded.bossWalkTime;
for(const facing of [[1,0,1],[-1,0,-1],[-1,0,1],[1,0,-1]]){
 actor.worldRotation={facing};grounded.animate(0,2.1);
 assert.equal(grounded.frame,beforeTurn);assert.equal(grounded.bossWalkTime,timeBeforeTurn);
}
Vec3.transformQuat=transform;
grounded.play('hurt',.12);grounded.animate(.05,0);assert.equal(grounded.state,'hurt');
grounded.play('die',.7);
for(let i=0;i<8;i++){grounded.play('die',.7);grounded.animate(.1,0);assert.equal(grounded.frame,0);}
grounded.reset();assert.equal(grounded.state,'idle');assert.equal(grounded.frame,0);
console.log('PASS Tyrant measured crops, aspect ratio, 2–2.5x visible height, ground pivots, world depth, turn continuity, cached resources and terminal death');
