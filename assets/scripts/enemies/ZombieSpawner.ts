import { AudioManager } from '../systems/AudioManager';
import { Node } from 'cc';
import { CombatConfig as C, enemyHealthMultiplier, SurvivalConfig as S } from '../core/GameConfig';
import { overlaps, PointXZ } from '../core/MovementMath';
import { GeometryFactory } from '../levels/GeometryFactory';
import { distance } from '../systems/CombatMath';
import { ZombieBase, ZombieContext, ZombieKind } from './ZombieBase';

/** Bounded reusable population. A dying node finishes its animation before reuse. */
export class ZombieSpawner {
    readonly enemies: ZombieBase[] = [];
    private candidates: PointXZ[] = [];
    private cooldown = 4;
    private audioPhase=0;
    constructor(private parent: Node, private geometry: GeometryFactory, private context: ZombieContext) {
        for (let x = -16; x <= 16; x += 2) for (let z = -16; z <= 16; z += 2)
            if (!context.obstacles.some(o => overlaps({ x, z }, C.enemyRadius + .15, o))) this.candidates.push({ x, z });
        this.reset();
    }
    get alive(): number { return this.enemies.filter(e => e.active && !e.dead).length; }
    private create(kind: ZombieKind, p: PointXZ, healthMultiplier = 1, damageMultiplier = 1): ZombieBase | null {
        if (this.alive >= S.maxEnemies) return null;
        let enemy = this.enemies.find(e => !e.node.active && e.kind === kind);
        if (!enemy && this.enemies.length < S.maxEnemies) {
            const node = new Node(`${kind} ${this.enemies.length + 1}`); this.parent.addChild(node);
            enemy = node.addComponent(ZombieBase); enemy.initialize(kind, p, this.context, this.geometry); this.enemies.push(enemy);
        }
        // Preserve the node budget even when the available pool has a different mix.
        if (!enemy) enemy = this.enemies.find(e => !e.node.active);
        if (!enemy) return null;
        enemy.reset(p, healthMultiplier, damageMultiplier); enemy.investigate(this.context.player.position); return enemy;
    }
    spawn(elapsed: number, random: () => number = Math.random): ZombieBase | null {
        if (this.alive >= S.maxEnemies) return null;
        const phase = Math.min(4, Math.floor(elapsed / S.phaseSeconds));
        const start = Math.floor(random() * this.candidates.length);
        for (let i = 0; i < this.candidates.length; i++) {
            const p = this.candidates[(start + i) % this.candidates.length], d = distance(p, this.context.player.position);
            if (d < S.minSpawnDistance || d > S.maxSpawnDistance || this.enemies.some(e => e.active && !e.dead && distance(e.position, p) < 1.2)) continue;
            if (!this.context.navigation.path(p, this.context.player.position).length) continue;
            return this.create(
                random() < S.runnerChances[phase] ? 'runner' : 'walker',
                p,
                enemyHealthMultiplier(elapsed),
                1 + phase * .15,
            );
        }
        return null;
    }
    tick(dt: number, elapsed: number, pressure = 0): void {
        const wave=Math.min(4,Math.floor(elapsed/S.phaseSeconds));
        if(wave>this.audioPhase)AudioManager.instance?.playSfx('horde_warning');
        this.audioPhase=wave;
        this.cooldown -= dt;
        if (this.cooldown > 0) return;
        const phase = Math.min(4, Math.floor(elapsed / S.phaseSeconds));
        this.cooldown = S.spawnIntervals[phase] * (pressure >= 60 ? .65 : 1);
        this.spawn(elapsed);
    }
    restoreCheckpoint(states: {kind:ZombieKind;x:number;z:number;hp:number;max:number}[], elapsed:number):void {
        this.audioPhase=Math.min(4,Math.floor(elapsed/S.phaseSeconds));
        // Rebuild only when loading a checkpoint; ordinary spawns keep their pool.
        this.enemies.forEach(e=>e.node.destroy());this.enemies.length=0;
        this.cooldown=S.spawnIntervals[Math.min(4,Math.floor(elapsed/S.phaseSeconds))];
        for(const state of states){const enemy=this.create(state.kind,state,state.max/C[state.kind].hp,1+Math.min(4,Math.floor(elapsed/S.phaseSeconds))*.15);if(enemy)enemy.health.current=state.hp;}
    }
    reset(): void {
        this.audioPhase=0;
        this.enemies.forEach(e => e.node.active = false); this.cooldown = S.spawnIntervals[0];
        const initial: [ZombieKind, number, number][] = [['walker', -6, 2], ['walker', 0, -7], ['walker', 6, -2], ['runner', -3, 7], ['walker', 4, -7]];
        for (const [kind, x, z] of initial) this.create(kind, { x, z });
    }
}
