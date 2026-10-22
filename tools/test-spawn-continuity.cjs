// Exercise the real spawner's initial population, timed reinforcements and pool reuse.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require(process.env.COCOS_TYPESCRIPT || 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');
class Node {
    constructor() { this.active = true; this.position = {x: 0, z: 0}; }
    addChild() {}
    addComponent(Type) { const c = new Type(); c.node = this; return c; }
}
class Enemy {
    get active() { return this.node.active; }
    get position() { return this.node.position; }
    initialize(kind, position) { this.kind = kind; this.reset(position); }
    reset(position, healthMultiplier = 1) { this.node.position = {...position}; this.node.active = true; this.dead = false; this.healthMultiplier = healthMultiplier; }
    investigate() {}
}
function loader(configOverride) {
    const cache = new Map();
    return function load(file) {
        file = path.resolve(file);
        if (cache.has(file)) return cache.get(file);
        const exports = {};
        cache.set(file, exports);
        const source = file.endsWith('GameConfig.ts') && configOverride !== undefined ? configOverride : fs.readFileSync(file, 'utf8');
        const requireLocal = id => id === 'cc' ? {Node} : id.endsWith('/ZombieBase') ? {ZombieBase: Enemy} : load(path.resolve(path.dirname(file), id + '.ts'));
        vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {exports, require: requireLocal});
        return exports;
    };
}
function fixture(load) {
    const {ZombieSpawner} = load('assets/scripts/enemies/ZombieSpawner.ts');
    const {ArenaNavigation} = load('assets/scripts/systems/ArenaNavigation.ts');
    return new ZombieSpawner(new Node(), {}, {player: new Node(), obstacles: [], navigation: new ArenaNavigation([], .34)});
}
const spawner = fixture(loader());
assert.equal(spawner.alive, 5);
for (const enemy of spawner.enemies) { enemy.dead = true; enemy.node.active = false; }
spawner.tick(4.01, 10);
assert.equal(spawner.alive, 1, 'timed reinforcement after all starting enemies die');
assert.equal(spawner.enemies.find(e => e.active).healthMultiplier, 1.05);
for (let cycle = 0; cycle < 50; cycle++) {
    for (const enemy of spawner.enemies) { enemy.dead = true; enemy.node.active = false; }
    spawner.tick(4.01, 20 + cycle * 4);
    assert.equal(spawner.alive, 1, `reinforcement cycle ${cycle}`);
    assert.ok(spawner.enemies.length <= 24);
}
console.log('PASS initial clear followed by 51 timed reinforcements and pool reuse');
// Reproduce the missing export from the pre-fix config: initial five succeed,
// but the first timed spawn throws. This distinguishes it from an art issue.
const originalConfig = require('node:child_process').execFileSync('git', ['show', 'HEAD:assets/scripts/core/GameConfig.ts'], {encoding: 'utf8'});
if (!originalConfig.includes('function enemyHealthMultiplier')) {
    const broken = fixture(loader(originalConfig));
    assert.equal(broken.alive, 5);
    assert.throws(() => broken.tick(4.01, 10), /enemyHealthMultiplier/);
    console.log('PASS reproduced pre-fix failure: initial five spawn, timed spawn throws');
}
