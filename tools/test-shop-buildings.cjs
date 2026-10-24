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
const cc={Node,MeshRenderer:class{static ShadowCastingMode={ON:1};},Texture2D:class{},SphereLight:class{},Color:class{fromHEX(hex){return hex;}},isValid:()=>true,resources:{load(name,type,callback){assert.match(name,/^environment\/((convenience-store|coffee-shop|pharmacy|ramen-shop|abandoned-street|worn-car-paint)-atlas|wet-asphalt|wet-pavement|worn-crosswalk)\/texture$/);pending.push({name,callback});}},utils:{createMesh(data){assert.ok(data.positions.every(Number.isFinite));assert.ok(data.indices.every(i=>i<data.positions.length/3));return data;}}};
const cache=new Map();
function load(file,override){file=path.resolve(file);if(!override&&cache.has(file))return cache.get(file);const box={exports:{},require:id=>id==='cc'?cc:load(path.resolve(path.dirname(file),id+'.ts'))};if(!override)cache.set(file,box.exports);vm.runInNewContext(ts.transpileModule(override||fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText,box);return box.exports;}
const g={part(parent,name,color,x,y,z,sx,sy,sz){const n=new Node(name);parent.addChild(n);n.setPosition(x,y,z);n.setScale(sx,sy,sz);return n;},form(...args){return this.part(...args);},glow(){},material(){return {};},texturedMaterial(texture,emission,tint){return {texture,emission,tint};},ownMesh(mesh){return mesh;}};
const arena=new Node('Arena');
g.loadTexture=(path,callback)=>cc.resources.load(path,cc.Texture2D,callback);
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

const street=arena.children.find(n=>n.name==='Abandoned street props');
assert.ok(street);
const cars=street.children.filter(n=>n.name.endsWith('sedan'));
assert.equal(cars.length,3);
for(const car of cars){
const faces=car.children.filter(n=>n.component?.mesh);assert.equal(faces.length,11);
for(const face of faces){const m=face.component.mesh;const center=[0,0,0];for(let i=0;i<12;i++)center[i%3]+=m.positions[i]/4;center[1]-=.75;assert.ok(center.reduce((sum,v,i)=>sum+v*m.normals[i],0)>0,'car face points outward: '+face.name);assert.ok(m.uvs.every(v=>v>0&&v<1));}
assert.equal(car.children.filter(n=>n.name==='Deflated tyre').length,4);
assert.ok(car.children.some(n=>n.name==='Climbing vine'));
}
const streetPng=fs.readFileSync('assets/resources/environment/worn-car-paint-atlas.png');
assert.equal(streetPng.readUInt32BE(16),streetPng.readUInt32BE(20));
const streetTexture={uuid:'street',width:streetPng.readUInt32BE(16)};
pending.find(p=>p.name==='environment/worn-car-paint-atlas/texture').callback(null,streetTexture);
for(const car of cars)for(const face of car.children.filter(n=>n.component?.mesh)){assert.equal(face.component.material.texture,streetTexture);assert.equal(face.component.material.tint,/window|windshield/i.test(face.name)?'#FFFFFF':({'Faded red sedan':'#CF7770','Grey-white sedan':'#DBD8CD','Faded orange sedan':'#E8A169'}[car.name]));}
console.log('PASS street props: three 3D cars, outward mesh faces, wheels, vines, atlas mapping, faded red/grey-white/orange paint and untinted glass');

const road=arena.children.find(n=>n.name==='Imported cyberpunk road intersection');
for(const name of ['wet-asphalt','wet-pavement']){
const meta=JSON.parse(fs.readFileSync('assets/resources/environment/'+name+'.png.meta','utf8'));assert.equal(meta.subMetas['6c48a'].userData.wrapModeS,'repeat');
const texture={uuid:name};pending.find(p=>p.name==='environment/'+name+'/texture').callback(null,texture);
const targets=name==='wet-asphalt'?[road.children[0]]:[road.children[1],road.children[3]];
for(const target of targets){assert.equal(target.component.material.texture,texture);assert.equal(target.component.mesh.uvs.length,target.component.mesh.positions.length/3*2);}
}
const atmosphere=arena.children.find(n=>n.name==='Night street atmosphere');
assert.equal(atmosphere.children.filter(n=>n.name==='Amber streetlight spill').length,4);
assert.ok(atmosphere.children.some(n=>n.name==='Overhead utility wires'));
const scene=JSON.parse(fs.readFileSync('assets/Main.scene','utf8'));
assert.equal(scene.find(n=>n.__type__==='cc.ShadowsInfo')._enabled,true);
assert.equal(scene.find(n=>n.__type__==='cc.DirectionalLight')._shadowEnabled,true);
console.log('PASS night scene: repeat ground textures, UV mapping, street lights, wires and shadow configuration');

const paintTexture={uuid:'worn-crosswalk'};
pending.find(p=>p.name==='environment/worn-crosswalk/texture').callback(null,paintTexture);
const batches=load('assets/scripts/levels/ImportedRoadData.ts').importedRoadData;
const painted=road.children.filter((node,i)=>batches[i].surface==='crosswalk');
assert.ok(painted.length>0);
for(const node of painted)assert.equal(node.component.material.texture,paintTexture);
assert.notEqual(road.children[0].component.material.texture,paintTexture);
const paint=fs.readFileSync('assets/resources/environment/worn-crosswalk.png');assert.equal(paint.readUInt32BE(16),paint.readUInt32BE(20));
console.log('PASS worn paint loads only onto zebra crossing batches');
