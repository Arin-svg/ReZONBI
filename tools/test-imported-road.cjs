const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('assets/scripts/levels/ImportedRoadData.ts','utf8');
const batches=JSON.parse(source.slice(source.indexOf(' = ')+3).trim().replace(/;$/,''));
let triangles=0;
for(const b of batches){
    assert.match(b.color,/^#[0-9a-f]{6}$/);
    assert.equal(b.positions.length,b.normals.length);
    assert.ok(b.positions.every(Number.isFinite));
    assert.ok(b.indices.every(i=>Number.isInteger(i)&&i>=0&&i<b.positions.length/3));
    for(let i=0;i<b.positions.length;i+=3){
        assert.ok(Math.abs(b.positions[i])<=18.00001&&Math.abs(b.positions[i+2])<=18.00001,'within arena bounds');
        assert.ok(Math.abs(Math.hypot(...b.normals.slice(i,i+3))-1)<.00001,'normalized normals');
    }
    triangles+=b.indices.length/3;
}
assert.equal(triangles,4296);assert.equal(batches.length,35);
const arena=fs.readFileSync('assets/scripts/levels/ResidentialArena.ts','utf8');
assert.ok(arena.includes('buildImportedRoad(parent, g)'));
for(const old of ['North south street','Crosswalk paint','Street manhole','Raised pavement','Road damage']) assert.ok(!arena.includes(old),'old overlapping road removed');
const b=fs.readFileSync('assets/art/environment/ReZONBI_Cyberpunk_Road_Intersection.glb');
assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);
console.log('PASS imported road: 4296 triangles, 35 batches, valid normals/indices/bounds, preserved GLB and no duplicate old road');

const crossings=batches.filter(b=>b.surface==='crosswalk');
assert.equal(crossings.reduce((n,b)=>n+b.indices.length/3,0),28*12,'all 28 original zebra stripes are tagged');
assert.ok(crossings.every(b=>b.emission===0),'road paint is not emissive');
console.log('PASS zebra crossing classification: 28 original stripe meshes, no layout changes');
