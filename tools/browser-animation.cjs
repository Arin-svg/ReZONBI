// Real Cocos/WebGL regression: run against a freshly built web-check on port 7457.
// Outputs rendered frame/contact sheets and assertions; never imported into the game.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const delay = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    const c = await require('./cdp-client.cjs').connect();
    const prefix = process.argv[2] || 'animation-after';
    try {
        await c.send('Runtime.enable');
        c.errors.length = 0;
        await c.send('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
        await c.send('Page.navigate', {url:process.argv[3] || 'http://127.0.0.1:7457'});
        let ready = false;
        for (let i=0; i<80; i++) {
            await delay(250);
            ready = await c.evaluate(`typeof cc !== 'undefined' && !!cc.director.getScene()?.getChildByName('Combat Encounter')?.components.find(c=>c.player)?.player.visual`);
            if (ready) break;
        }
        assert.ok(ready, 'fresh scene initialized');
        // Optional engine integration test when Creator's asset compiler is unavailable.
        // Runs current TypeScript in the live engine; does NOT verify asset importing/building.
        if (process.argv.includes('--inject-source')) {
            const ts = require(process.env.COCOS_TYPESCRIPT || 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
            const compile = path => ts.transpileModule(fs.readFileSync(path,'utf8'), {
                compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}
            }).outputText;
            await c.evaluate(`(async()=>{
                const engine=await System.import('cc');
                const config={};new Function('exports',${JSON.stringify(compile('assets/scripts/core/GameConfig.ts'))})(config);
                const module={};new Function('exports','require',${JSON.stringify(compile('assets/scripts/player/WorldSpriteVisual.ts'))})(module,
                    name=>name==='cc'?engine:config);
                const scene=cc.director.getScene(),enc=scene.getChildByName('Combat Encounter').components.find(c=>c.player);
                enc.restart();enc.togglePause();const old=enc.player.visual;
                const replacement=new module.WorldSpriteVisual(old.actor,old.camera,old.texture,old.material.effectAsset,
                    'rin',old.actions,old.runRightAtlas,old.runFrontAtlas,old.runBackAtlas,old.runLeftAtlas);
                old.destroy();enc.player.visual=replacement;
                scene.components.filter(c=>c.constructor.name==='GameBootstrap').forEach(c=>c.enabled=false);
            })()`);
        }
        const startup = await c.evaluate(`(()=>{
            window.enc=cc.director.getScene().getChildByName('Combat Encounter').components.find(c=>c.player);
            enc.restart(); if(!enc.player.paused) enc.togglePause();
            window.visual=enc.player.visual; window.originalMesh=visual.mesh; window.originalMaterial=visual.material;
            cc.director.getScene().getChildByName('Mobile Canvas').active=false;
            return {implementation:!!visual.runAtlases, effect:visual.material.effectAsset.name,
                roots:enc.player.node.children.map(n=>n.name),
                bootstraps:(()=>{const all=[];const visit=n=>{all.push(...n.components.filter(c=>c.constructor.name==='GameBootstrap'&&c.enabled));n.children.forEach(visit);};visit(cc.director.getScene());return all.length;})(),
                textures:visual.runAtlases?.map(t=>[t.width,t.height])};
        })()`);
        assert.ok(startup.implementation, 'updated implementation loaded (reject stale builds)');
        assert.equal(startup.bootstraps, 1);
        assert.deepEqual(startup.roots, ['Rin world sprite']);
        assert.equal(startup.effect, 'builtin-unlit');
        assert.equal(startup.textures.length, 4);
        await delay(300);
        const crop = await c.evaluate(`(()=>{const cam=cc.director.getScene().getChildByName('Main Camera').components.find(c=>c.worldToScreen);
            const p=cam.worldToScreen(visual.actor.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
            return {x:Math.round(r.left+p.x/canvas.width*r.width)-90,y:Math.round(r.bottom-p.y/canvas.height*r.height)-150};})()`);
        const shots=[], states=[];
        for (const [d,yaw] of [[0,-135],[1,45],[2,135],[3,-45]]) {
            for (let f=0;f<8;f++) {
                const state=await c.evaluate(`(()=>{
                    visual.actor.setRotationFromEuler(0,${yaw},0);visual.reset();visual.age=${f}/12+.001;visual.animate(0,1);
                    const uv=visual.material.getProperty('tilingOffset');
                    return {direction:visual.direction,frame:visual.frame,texture:visual.textureKey,
                        sameMesh:visual.mesh===originalMesh && visual.renderer.mesh===originalMesh,
                        sameMaterial:visual.renderer.getSharedMaterial(0)===originalMaterial,
                        sameTexture:visual.material.getProperty('mainTexture')===visual.runAtlases[${d}],uv:[uv.x,uv.y,uv.z,uv.w]};
                })()`);
                assert.equal(state.direction,d);assert.equal(state.frame,f);
                assert.ok(state.sameMesh && state.sameMaterial && state.sameTexture);
                assert.deepEqual(state.uv,[1/8,1,f/8,0]);states.push(state);
                await delay(70);
                shots.push((await c.send('Page.captureScreenshot',{format:'png'})).data);
            }
        }
        async function sheet(images,columns,file) {
            const result=await c.evaluate(`(async()=>{
                const canvas=document.createElement('canvas');canvas.width=${columns}*180;canvas.height=Math.ceil(${images.length}/${columns})*180;
                const ctx=canvas.getContext('2d'),hashes=[];
                for(const [i,data] of ${JSON.stringify(images)}.entries()){
                    const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();
                    ctx.drawImage(im,${crop.x},${crop.y},180,180,(i%${columns})*180,Math.floor(i/${columns})*180,180,180);
                    const pixels=ctx.getImageData((i%${columns})*180,Math.floor(i/${columns})*180,180,180).data;
                    let h=2166136261;for(const b of pixels)h=Math.imul(h^b,16777619);hashes.push(h>>>0);
                }return {image:canvas.toDataURL().split(',')[1],hashes};})()`);
            fs.writeFileSync(file,Buffer.from(result.image,'base64'));return result.hashes;
        }
        const hashes=await sheet(shots,8,`temp/${prefix}.png`);
        for(let d=0;d<4;d++) for(let f=1;f<8;f++) assert.notEqual(hashes[d*8+f],hashes[d*8+f-1],`rendered pixels change: direction ${d} frame ${f}`);
        const actionShots=[];
        for(const [d,yaw] of [[0,-135],[1,45],[2,135],[3,-45]]) for(const action of ['shoot','slash','dodge','hurt','die']) {
            const state=await c.evaluate(`(()=>{visual.actor.setRotationFromEuler(0,${yaw},0);visual.reset();visual.play('${action}',.4);visual.animate(0,0);
                return {state:visual.state,texture:visual.textureKey,frame:visual.frame,finite:Number.isFinite(visual.root.scale.y)};})()`);
            assert.equal(state.state,action);assert.equal(state.texture,'actions');assert.ok(state.finite);
            assert.equal(state.frame,d*5+['shoot','slash','dodge','hurt','die'].indexOf(action));
            await delay(70);actionShots.push((await c.send('Page.captureScreenshot',{format:'png'})).data);
        }
        await sheet(actionShots,5,`temp/${prefix}-actions.png`);
        const transitions=await c.evaluate(`(()=>{
            const states=[];visual.reset();states.push(visual.state);visual.animate(.1,1);states.push(visual.state);
            visual.animate(.1,0);states.push(visual.state);visual.play('shoot',.2);visual.animate(.1,0);states.push(visual.state);
            visual.animate(.2,1);states.push(visual.state);visual.play('die',.1);visual.animate(1,1);states.push(visual.state);
            visual.play('shoot',1);visual.animate(.1,1);states.push(visual.state);visual.reset();states.push(visual.state);
            const firingFrames=new Set();let firingKeptRunning=true;
            for(let i=0;i<1200;i++){if(i%15===0)visual.play('shoot',.16);visual.animate(1/60,1);firingFrames.add(visual.frame);firingKeptRunning=firingKeptRunning&&visual.state==='run';}
            return {states,firingKeptRunning,firingFrameCount:firingFrames.size,sameMesh:originalMesh===visual.mesh,sameMaterial:originalMaterial===visual.material};})()`);
        assert.deepEqual(transitions.states,['idle','run','idle','shoot','run','die','die','idle']);
        assert.ok(transitions.sameMesh && transitions.sameMaterial);
        assert.ok(transitions.firingKeptRunning);assert.equal(transitions.firingFrameCount,8);
        fs.writeFileSync(`temp/${prefix}.json`,JSON.stringify({startup,states,hashes,transitions,errors:c.errors},null,2));
        assert.equal(c.errors.length,0,JSON.stringify(c.errors));
        console.log('PASS fresh initialization, one active bootstrap/visual, four atlases, 32 rendered frames with adjacent pixel changes, 20 action poses, transitions/death/reset, stable mesh/material over 1200 updates, no runtime errors.');
    } finally {
        await c.evaluate(`if(typeof enc!=='undefined'){cc.director.getScene().getChildByName('Mobile Canvas').active=true;enc.restart();}void 0`).catch(()=>{});
        c.close();
    }
})().catch(e=>{console.error(e);process.exitCode=1;});
