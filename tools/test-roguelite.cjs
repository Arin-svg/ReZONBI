const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
const box={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/systems/Progression.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,box);
const {Progression,Skills,requiredXP}=box.exports;let tests=0;
function test(name,f){f();console.log('PASS',name);tests++;}
test('Exact threshold and excess carry across multiple levels',()=>{const p=new Progression();p.addXP(20+36+60+7);assert.equal(p.level,4);assert.equal(p.xp,7);assert.equal(p.pending,3);assert.equal(requiredXP(4),92);});
test('Invalid experience cannot corrupt progression',()=>{const p=new Progression();[NaN,Infinity,-4,0].forEach(n=>p.addXP(n));assert.equal(p.xp,0);});
test('Three unique valid choices and only offered skills can be applied',()=>{const p=new Progression();p.addXP(20);p.roll(()=>.3);assert.equal(p.offers.length,3);assert.equal(new Set(p.offers.map(s=>s.id)).size,3);assert.ok(!p.choose(Skills.find(s=>!p.offers.some(o=>o.id===s.id)).id));const id=p.offers[0].id;assert.ok(p.choose(id));assert.equal(p.rank(id),1);assert.ok(!p.choose(id));});
test('Maxed skills excluded; exhausted catalogue cannot deadlock selection',()=>{const p=new Progression();Skills.forEach(s=>p.levels[s.id]=s.max);p.levels.blood=4;p.pending=2;p.roll();assert.equal(p.offers.length,1);assert.equal(p.offers[0].id,'blood');p.choose('blood');p.roll();assert.equal(p.pending,0);assert.equal(p.offers.length,0);});
test('Restart clears all run progression',()=>{const p=new Progression();p.addXP(500);p.roll();p.choose(p.offers[0].id);p.reset();assert.equal(p.level,1);assert.equal(p.xp,0);assert.equal(p.pending,0);assert.equal(Object.keys(p.levels).length,0);});
test('Every skill has descriptions for every supported rank',()=>{for(const s of Skills)for(let i=1;i<=s.max;i++)assert.ok(s.describe(i).length>12);assert.equal(Skills.length,6);});
console.log(`${tests} progression checks passed`);
