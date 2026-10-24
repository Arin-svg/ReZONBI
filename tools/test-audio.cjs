const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
const storage=new Map(),sources=[],loads=[],events=new Map();let delay=false,pending=[],missing=false;
class Node{constructor(name){this.name=name;this.children=[];this.events={};}addChild(n){this.children.push(n);}addComponent(T){const c=new T();c.node=this;return c;}on(k,f){this.events[k]=f;}once(){}destroy(){}}
Node.EventType={NODE_DESTROYED:'destroy'};
class AudioSource{constructor(){sources.push(this);this.plays=0;}play(){this.plays++;this.playing=true;}stop(){this.playing=false;}pause(){this.playing=false;}}
AudioSource.EventType={ENDED:"ended"};
const clip=p=>({path:p,addRef(){},decRef(){},getDuration(){return .3;}});
const cc={Node,AudioSource,AudioClip:class{},Game:{EVENT_HIDE:'hide',EVENT_SHOW:'show'},game:{on(k,f,owner){events.set(k,()=>f.call(owner));},off(k){events.delete(k);}},sys:{localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},assetManager:{loadBundle(name,cb){assert.equal(name,'audio');cb(null,{load(p,type,done){loads.push(p);const finish=()=>done(missing?new Error('missing'):null,missing?null:clip(p));if(delay)pending.push(finish);else finish();}});}}};
const box={exports:{},require:()=>cc,console:{warn(){}}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/systems/AudioManager.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2019,module:ts.ModuleKind.CommonJS}}).outputText,box);
const {AudioManager,MUSIC,SOUNDS}=box.exports;
let a=new AudioManager(new Node());const step=(n=12)=>{for(let i=0;i<n;i++)a.tick(.1);};
assert.equal(a.music,.65);assert.equal(a.sfx,.85);assert.equal(sources.length,7);
for(const p of loads){const ext=p.startsWith('bgm/')?'.mp3':'.wav';assert.ok(fs.statSync(path.join('assets/audio',p+ext)).size>44,p);const meta=JSON.parse(fs.readFileSync(path.join('assets/audio',p+ext+'.meta')));assert.equal(meta.importer,'audio-clip');}
assert.equal(SOUNDS.length,27);assert.equal(loads.length,33);
const bgm=sources[0];a.musicState('home');step();assert.equal(bgm.clip.path,'bgm/'+MUSIC.home);assert.equal(bgm.loop,true);assert.equal(bgm.volume,.65);
const played=bgm.plays;for(let i=0;i<30;i++){a.musicState('home');a.tick(.1);}assert.equal(bgm.plays,played,'same track must not restart');
a.musicState('combat');step();assert.equal(bgm.clip.path,'bgm/'+MUSIC.combat);
a.musicState('boss');step();assert.equal(bgm.clip.path,'bgm/'+MUSIC.boss);assert.equal(sources.filter(s=>s.loop&&s.playing).length,1);
a.musicState('boss',true);step();assert.equal(bgm.volume,.65*.25);
a.setVolume('music',.2);assert.equal(bgm.volume,.2*.25);a.setVolume('sfx',.7);a.playSfx('gunshot');const shots=()=>sources.slice(1).reduce((n,s)=>n+s.plays,0);const first=shots();a.playSfx('gunshot');assert.equal(shots(),first,'gunshot throttled');
for(const name of SOUNDS)a.playSfx(name);assert.ok(sources.slice(1).filter(s=>s.playing).length<=6);assert.equal(sources.length,7,'no components allocated for effects');
a.toggleMute('sfx');for(const s of sources.slice(1))assert.equal(s.volume,0);const muted=shots();a.playSfx('ui_click');assert.equal(shots(),muted);
a.toggleMute('music');assert.equal(bgm.volume,0);assert.equal(a.sfx,.7);a.toggleMute('music');a.toggleMute('sfx');
events.get('hide')();assert.ok(sources.every(s=>!s.playing));events.get('show')();assert.equal(bgm.playing,true);
for(const state of ['defeat','victory']){a.musicState(state);step();assert.equal(bgm.clip.path,'bgm/'+MUSIC[state]);assert.equal(bgm.loop,false);bgm.playing=false;bgm.node.events.ended();const n=bgm.plays;events.get('hide')();events.get('show')();step();assert.equal(bgm.plays,n,'ending music must not repeat');}
a.stop();step();assert.ok(sources.every(s=>!s.playing));a.dispose();assert.equal(AudioManager.instance,undefined);
a=new AudioManager(new Node());assert.equal(a.music,.2);assert.equal(a.sfx,.7);a.dispose();
// Deferred loading must honor the latest requested state and not replay old SFX.
delay=true;a=new AudioManager(new Node());a.musicState('home');a.musicState('boss');a.playSfx('gunshot');while(pending.length)pending.shift()();step();assert.equal(a.bgm.clip.path,'bgm/'+MUSIC.boss);assert.ok(a.voices.every(v=>v.remaining===0));a.dispose();
delay=false;missing=true;a=new AudioManager(new Node());a.musicState('combat');a.playSfx('gunshot');step();assert.ok(!a.bgm.playing);a.dispose();
console.log('PASS audio: 33 real assets, defaults, transitions, no restart, ducking, bounded SFX, throttling, independent volume/mute, persistence, suspend/resume, async state, missing clips');
