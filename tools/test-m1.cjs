const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require(process.env.COCOS_TYPESCRIPT || 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
const source = fs.readFileSync('assets/scripts/core/MovementMath.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const sandbox = { exports: {} }; vm.runInNewContext(js, sandbox);
const { joystickOutput, cameraRelative, moveAndSlide, overlaps, approach } = sandbox.exports;
let checks = 0;
function check(name, action) { action(); checks++; console.log('PASS', name); }
check('Joystick dead zone, analog scaling and clamping', () => {
    assert.equal(joystickOutput(3, 4, 68, 0.14).x, 0);
    const full = joystickOutput(100, 100, 68, 0.14);
    assert.ok(Math.abs(Math.hypot(full.x, full.y) - 1) < 1e-8);
    assert.ok(joystickOutput(34, 0, 68, 0.14).x < 0.5);
});
check('Camera-relative diagonal has no speed boost', () => {
    for (const [x,y] of [[1,0],[0,1],[1,1],[-1,-1]]) {
        const d = cameraRelative(x,y); assert.ok(Math.abs(Math.hypot(d.x,d.z)-1)<1e-8);
    }
    assert.ok(cameraRelative(0,1).x < 0 && cameraRelative(0,1).z < 0);
});
check('Fast movement cannot tunnel through thin wall', () => {
    const wall = {x:0,z:0,halfX:0.1,halfZ:8};
    const p=moveAndSlide({x:-5,z:0},10,0,0.32,18,[wall]);
    assert.ok(p.x < -0.4); assert.ok(!overlaps(p,0.32,wall));
});
check('Collision permits sliding along wall', () => {
    const p=moveAndSlide({x:-0.43,z:0},2,3,0.32,18,[{x:0,z:0,halfX:0.1,halfZ:8}]);
    assert.ok(p.x < -0.4 && p.z > 2.9);
});
check('All arena edges constrain the whole player radius', () => {
    for(const sign of [-1,1]) {
        const p=moveAndSlide({x:0,z:0},sign*50,sign*50,0.32,18,[]);
        assert.ok(Math.abs(p.x)<=17.68 && Math.abs(p.z)<=17.68);
    }
});
check('Fixed integration produces matching 30/60/120 FPS distances', () => {
    const simulate=fps=>{ let v=0,p=0; for(let frame=0;frame<fps*2;frame++) for(let i=0;i<120/fps;i++) {v=approach(v,5,22/120);p+=v/120;} return p; };
    assert.ok(Math.abs(simulate(30)-simulate(120))<1e-8);
    assert.ok(Math.abs(simulate(60)-simulate(120))<1e-8);
});
check('Scene references are valid and bootstrap UUID resolves', () => {
    const scene=JSON.parse(fs.readFileSync('assets/Main.scene'));
    const visit=o=>{if(!o||typeof o!=='object')return;if('__id__'in o)assert.ok(scene[o.__id__]);Object.values(o).forEach(visit);};
    scene.forEach(visit);
    const component=scene[scene[1]._components[0].__id__];
    assert.equal(component.node.__id__,1); assert.equal(component._enabled,true);
    const hex=JSON.parse(fs.readFileSync('assets/scripts/core/GameBootstrap.ts.meta')).uuid.replace(/-/g,'');
    const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let id=hex.slice(0,5);
    for(let i=5;i<32;i+=3){const n=parseInt(hex.slice(i,i+3),16);id+=chars[n>>6]+chars[n&63];}
    assert.equal(component.__type__,id);
});
check('Source Huawei configuration retains entry scene and landscape', () => {
    const c=JSON.parse(fs.readFileSync('build-config/huawei-quick-game.json'));
    assert.equal(c.platform,'huawei-quick-game');
    assert.equal(c.packages['huawei-quick-game'].deviceOrientation,'landscape');
    assert.equal(c.startScene,JSON.parse(fs.readFileSync('assets/Main.scene.meta')).uuid);
});
console.log(`${checks} checks passed. These are not device/runtime tests.`);
