// No downloads: compile the small editor-only hook using Creator's bundled TypeScript.
const fs=require('node:fs'),path=require('node:path');
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
const root=path.resolve('extensions/rezonbi-build');fs.mkdirSync(path.join(root,'dist'),{recursive:true});
for(const name of ['builder','hooks'])fs.writeFileSync(path.join(root,'dist',name+'.js'),ts.transpileModule(fs.readFileSync(path.join(root,'source',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText);
console.log('Compiled Re:ZONBI build extension');
