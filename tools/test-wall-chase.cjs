const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ts=require(process.env.COCOS_TYPESCRIPT||'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const box={exports:{},require:id=>load(path.resolve(path.dirname(file),id+'.ts'))};cache.set(file,box.exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,box);return box.exports;}
const {ArenaNavigation}=load('assets/scripts/systems/ArenaNavigation.ts');
const {clearLine,distance}=load('assets/scripts/systems/CombatMath.ts');
const {moveAndSlide,overlaps}=load('assets/scripts/core/MovementMath.ts');
const wall=[{x:0,z:0,halfX:3.5,halfZ:3}];
let target={x:6,z:0};
for(let i=0;i<400;i++) target=moveAndSlide(target,-.01,0,.32,18,wall);
assert.ok(!overlaps(target,.32,wall[0]));
assert.ok(overlaps(target,.34,wall[0]),'reproduce player fitting where an infected cannot');
for(const radius of [.34,.95]) {
    const nav=new ArenaNavigation(wall,radius),from={x:-6,z:0};
    const route=nav.path(from,target);
    assert.ok(route.length>1,'enemy routes around building to wall-adjacent player');
    let previous=from;
    for(const p of route){assert.ok(clearLine(previous,p,wall,radius));assert.ok(!overlaps(p,radius,wall[0]));previous=p;}
    assert.ok(distance(previous,target)<1.4,'approach finishes within melee range');
    assert.ok(clearLine(previous,target,wall),'approach ends on player side of wall');
    assert.equal(nav.path(from,{x:0,z:0}).length,0,'solid interiors remain unreachable');
    const normal={x:6,z:0},normalRoute=nav.path(from,normal);
    assert.ok(distance(normalRoute[normalRoute.length-1],normal)<.001,'ordinary routes still reach exact destination');
}
const enclosure=[{x:0,z:-2,halfX:2,halfZ:.3},{x:0,z:2,halfX:2,halfZ:.3},{x:-2,z:0,halfX:.3,halfZ:2},{x:2,z:0,halfX:.3,halfZ:2}];
assert.equal(new ArenaNavigation(enclosure,.34).path({x:-5,z:0},{x:0,z:0}).length,0);
console.log('PASS wall-contact chase for infected and Tyrant, route clearance, melee approach, solid interiors and enclosed destinations');
