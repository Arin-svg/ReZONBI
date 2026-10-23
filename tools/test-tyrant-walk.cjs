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
const cc = {Node,Color,Vec3,Vec4,Material,MeshRenderer,utils:{createMesh:()=>({destroy(){}})}};
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
    visual.animate(.125,2.1); seen.add(visual.frame);
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
assert.ok(chargeTime>visual.bossWalkTime,'charge increases cadence');
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
