const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
class Node {
    constructor(name){this.name=name;this.children=[];this.position={x:0,y:0,z:0};this.scale={x:1,y:1,z:1};}
    addChild(node){this.children.push(node);}
    setPosition(x,y,z){this.position={x,y,z};}
    setScale(x,y,z){this.scale={x,y,z};}
    setRotationFromEuler(x,y,z){this.rotation={x,y,z};}
    addComponent(){const c={setSharedMaterial(m){this.material=m;}};this.component=c;return c;}
}
const pending=[];
const cc={Node,MeshRenderer:class{},Texture2D:class{},SphereLight:class{},Color:class{fromHEX(hex){return hex;}},isValid:()=>true,resources:{load(name,type,callback){assert.match(name,/^environment\/(convenience-store|coffee-shop|pharmacy|ramen-shop|abandoned-street)-atlas\/texture$/);pending.push({name,callback});}},utils:{createMesh(data){assert.ok(data.positions.every(Number.isFinite));assert.ok(data.indices.every(i=>i<data.positions.length/3));return data;}}};
const cache=new Map();
function load(file,override){file=path.resolve(file);if(!override&&cache.has(file))return cache.get(file);const box={exports:{},require:id=>id==='cc'?cc:load(path.resolve(path.dirname(file),id+'.ts'))};if(!override)cache.set(file,box.exports);vm.runInNewContext(ts.transpileModule(override||fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText,box);return box.exports;}
const g={part(parent,name,color,x,y,z,sx,sy,sz){const n=new Node(name);parent.addChild(n);n.setPosition(x,y,z);n.setScale(sx,sy,sz);return n;},form(...args){return this.part(...args);},glow(){},material(){return {};},texturedMaterial(texture,emission){return {texture,emission};},ownMesh(mesh){return mesh;}};
const arena=new Node('Arena');
const obstacles=load('assets/scripts/levels/ResidentialArena.ts').buildResidential(arena,g);
const baseline=require('node:child_process').execFileSync('git',['show','HEAD:assets/scripts/levels/ResidentialArena.ts'],{encoding:'utf8'});
const original=load('assets/scripts/levels/ResidentialArena.ts',baseline).buildResidential(new Node('Baseline'),g);
assert.equal(JSON.stringify(obstacles),JSON.stringify(original),'all collision footprints preserved');
const names=['Convenience store','Coffee shop','Pharmacy','Ramen shop'];
for(const name of names){const shop=arena.children.find(n=>n.name===name);assert.ok(shop,name);assert.equal(shop.scale.y,1);assert.equal(shop.children.find(n=>n.name==='House').scale.y,5.5);assert.ok(shop.children.some(n=>n.name.endsWith('illuminated lettering')));assert.equal(shop.children.filter(n=>n.name==='Roof HVAC').length,2);}
const pharmacy=arena.children.find(n=>n.name==='Pharmacy');
assert.equal(pharmacy.children.find(n=>n.name==='Pharmacy projecting icon').children.filter(n=>n.name==='Pharmacy cross').length,2);
const ramen=arena.children.find(n=>n.name==='Ramen shop');assert.equal(ramen.children.filter(n=>n.name==='Red ramen lantern').length,4);
console.log('PASS four distinct 3D shops, sign mesh geometry, roof equipment, pharmacy/ramen identifiers and unchanged arena collision');
const atlases=['convenience-store','coffee-shop','pharmacy','ramen-shop'];
for(let i=0;i<names.length;i++){
const png=fs.readFileSync('assets/resources/environment/'+atlases[i]+'-atlas.png');
const texture={width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
assert.equal(texture.width,texture.height,'square atlas required');
const request=pending.find(p=>p.name==='environment/'+atlases[i]+'-atlas/texture');
assert.ok(request,'each shop requests its own atlas');request.callback(null,texture);
const store=arena.children.find(n=>n.name===names[i]);
assert.equal(store.children.find(n=>n.name==='House').active,false,'fallback shell is replaced');
assert.equal(store.children.find(n=>n.name==='Roof HVAC').active,true,'3D equipment retained');
const faces=store.children.filter(n=>n.name.startsWith('Textured '));assert.equal(faces.length,5);
for(const face of faces){const mesh=face.component.mesh;assert.ok(mesh.uvs.every(n=>n>0&&n<1));const p=mesh.positions,n=mesh.normals;const a=[p[3]-p[0],p[4]-p[1],p[5]-p[2]],b=[p[6]-p[0],p[7]-p[1],p[8]-p[2]];const cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];assert.ok(cross[0]*n[0]+cross[1]*n[1]+cross[2]*n[2]>0,'outward face winding');}
assert.equal(store.children.filter(n=>n.name.endsWith('spill')).length,2,'two local lights');
console.log('PASS '+names[i]+': atlas, five outward faces, roof geometry and local lights');
}

// Failed loads must leave the original shop visible and usable.
const fallback=new Node('Fallback');
load('assets/scripts/levels/ShopBuildings.ts').buildShop(fallback,g,0,0,1);
const failed=pending[pending.length-1];
failed.callback(new Error('simulated missing atlas'),null);
assert.notEqual(fallback.children[0].children.find(n=>n.name==='House').active,false);
assert.equal(fallback.children[0].children.filter(n=>n.name.startsWith('Textured ')).length,0);
console.log('PASS failed atlas retains fallback geometry');
