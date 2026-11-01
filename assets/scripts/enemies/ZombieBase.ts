import { AudioManager } from '../systems/AudioManager';
import { _decorator, Component, Node } from 'cc';
import { CombatConfig as C, GameConfig } from '../core/GameConfig';
import { moveAndSlide, Obstacle, PointXZ } from '../core/MovementMath';
import { GeometryFactory } from '../levels/GeometryFactory';
import { PlayerHealth } from '../player/PlayerHealth';
import { ArenaNavigation } from '../systems/ArenaNavigation';
import { CombatEffects } from '../systems/CombatEffects';
import { clearLine, distance } from '../systems/CombatMath';
import { Damageable, DamageHit, HealthState } from '../systems/DamageSystem';
import { ZombieVisual } from './ZombieVisual';
const { ccclass } = _decorator;
export type ZombieState = 'Idle' | 'Investigate' | 'Chase' | 'Attack' | 'Stunned' | 'Dead';
export type ZombieKind = 'walker' | 'runner' | 'brute';
export interface ZombieContext {
    player: Node; health: PlayerHealth; obstacles: readonly Obstacle[];
    navigation: ArenaNavigation; effects: CombatEffects; peers: () => readonly ZombieBase[]; nextHit: () => number;
    onDeath?: (enemy: ZombieBase, hit: DamageHit) => void;
    onHit?: (enemy: ZombieBase, amount: number) => void;
}
@ccclass('ZombieBase')
export class ZombieBase extends Component implements Damageable {
    onDestroy(): void { this.visual?.destroy(); }
    kind: ZombieKind = 'walker';
    state: ZombieState = 'Idle';
    health!: HealthState;
    stats = C.walker;
    private context!: ZombieContext;
    private visual!: ZombieVisual;
    private spawn!: PointXZ;
    private destination: PointXZ = { x: 0, z: 0 };
    private path: PointXZ[] = [];
    private repath = 0;
    private attackTime = 0;
    private cooldown = 0;
    private hurtTime = 0;
    private stunTime = 0;
    private deathTime = 0;
    private knockbackTime = 0;
    private knockbackX = 0;
    private knockbackZ = 0;
    get position(): PointXZ { return this.node.position; }
    get dead(): boolean { return this.health.dead; }
    get active(): boolean { return this.node.activeInHierarchy && this.enabled; }
    rebase(x:number,z:number):void {
        const p=this.node.position;this.node.setPosition(p.x-x,p.y,p.z-z);
        if(this.spawn){this.spawn={x:this.spawn.x-x,z:this.spawn.z-z};}
        this.destination={x:this.destination.x-x,z:this.destination.z-z};this.path=[];this.repath=0;
        this.context.navigation.invalidate();
    }
    initialize(kind: ZombieKind, spawn: PointXZ, context: ZombieContext, geometry: GeometryFactory): void {
        this.kind = kind; this.stats = C[kind]; this.context = context; this.spawn = spawn;
        this.health = new HealthState(this.stats.hp); this.visual = new ZombieVisual(this.node, geometry, kind); this.reset();
    }
    reset(spawn?: PointXZ, healthMultiplier = 1, damageMultiplier = 1): void {
        if (spawn) this.spawn = { x: spawn.x, z: spawn.z };
        this.stats = {
            ...C[this.kind],
            hp: Math.round(C[this.kind].hp * healthMultiplier),
            damage: Math.round(C[this.kind].damage * damageMultiplier),
        };
        this.health = new HealthState(this.stats.hp);
        this.node.active = true; this.node.setPosition(this.spawn.x, 0.06, this.spawn.z);
        this.node.setRotationFromEuler(0, 0, 0); this.health.reset(); this.state = 'Idle';
        this.path = []; this.repath = this.cooldown = this.attackTime = this.hurtTime = this.stunTime = this.deathTime = 0;
        this.knockbackTime = this.knockbackX = this.knockbackZ = 0;
        this.visual.tick(0, 0, false, false, 0, 1);
    }
    /** M3 hook: a listener can pass a heard noise position without coupling noise here. */
    investigate(position: PointXZ): void {
        if (this.dead || this.state === 'Chase' || this.state === 'Attack' || this.state === 'Stunned') return;
        this.destination = { x: position.x, z: position.z }; this.state = 'Investigate'; this.repath = 0;
    }
    stun(duration: number): void { if (!this.dead) { this.stunTime = Math.max(this.stunTime, duration); this.state = 'Stunned'; this.attackTime = 0; } }
    knockback(origin: PointXZ, amount: number, duration: number): void {
        if (!this.active || amount <= 0 || duration <= 0) return;
        const dx = this.position.x - origin.x, dz = this.position.z - origin.z;
        const length = Math.hypot(dx, dz);
        this.knockbackX = (length > .001 ? dx / length : 1) * amount / duration;
        this.knockbackZ = (length > .001 ? dz / length : 0) * amount / duration;
        this.knockbackTime = duration;
        this.path = []; this.repath = 0; this.attackTime = 0;
        this.stun(duration);
    }
    private tickKnockback(dt: number): void {
        const step = Math.min(Math.max(0, dt), this.knockbackTime);
        if (step <= 0) return;
        const p = moveAndSlide(this.position, this.knockbackX * step, this.knockbackZ * step,
            C.enemyRadius, GameConfig.arenaHalfSize, this.context.obstacles);
        this.node.setPosition(p.x, this.node.position.y, p.z);
        this.knockbackTime = Math.max(0, this.knockbackTime - step);
    }
    receiveDamage(hit: DamageHit): boolean {
        if (!this.health.damage(hit)) return false;
        if(hit.kind==='pistol')AudioManager.instance?.playSfx('bullet_impact');
        this.context.onHit?.(this, hit.amount);
        this.hurtTime = 0.15; this.context.effects.impact(this.position);
        if (this.dead) { this.state = 'Dead'; this.deathTime = 0.001; this.attackTime = 0; this.context.onDeath?.(this, hit); }
        else if (this.state !== 'Stunned') { this.state = 'Chase'; this.repath = 0; }
        return true;
    }
    tickDeath(dt: number): void {
        if (!this.dead || !this.node.active) return;
        this.tickKnockback(dt);
        this.deathTime += dt; this.visual.tick(dt, 0, false, false, this.deathTime, 0);
        if (this.deathTime >= 0.7) this.node.active = false;
    }
    tick(dt: number): void {
        if (this.dead) { this.tickDeath(dt); return; }
        if (!this.active) return;
        this.tickKnockback(dt);
        this.health.tick(dt); this.cooldown = Math.max(0, this.cooldown - dt); this.hurtTime = Math.max(0, this.hurtTime - dt);
        const player = this.context.player.position, d = distance(this.position, player);
        const visible = clearLine(this.position, player, this.context.obstacles);
        let moving = 0;
        if (this.state === 'Stunned') {
            this.stunTime -= dt; if (this.stunTime <= 0) this.state = 'Chase';
        } else if (this.state === 'Attack') {
            this.attackTime -= dt;
            if (this.attackTime <= 0) {
                if (d <= this.stats.range && visible && !this.context.health.dead) this.context.health.receiveDamage({
                    amount: this.stats.damage, id: this.context.nextHit(), source: this.node.uuid, kind: 'melee',
                });
                this.cooldown = this.stats.cooldown; this.state = 'Chase';
            }
        } else {
            if ((this.state === 'Idle' || this.state === 'Investigate') && d <= this.stats.detection && visible && !this.context.health.dead) this.state = 'Chase';
            if (this.state === 'Chase') {
                if(d<9)AudioManager.instance?.playSfx('zombie_groan');
                this.destination = { x: player.x, z: player.z };
                if (d <= this.stats.range && visible) {
                    if (this.cooldown <= 0) { AudioManager.instance?.playSfx('zombie_attack'); this.state = 'Attack'; this.attackTime = this.stats.windup; }
                } else moving = this.move(dt);
            } else if (this.state === 'Investigate') {
                if (distance(this.position, this.destination) < 0.5) this.state = 'Idle'; else moving = this.move(dt);
            }
        }
        if (this.state === 'Attack') this.face(player.x - this.position.x, player.z - this.position.z);
        // Rin can move into a stationary attacker; separate without crossing solids.
        const contact = C.enemyRadius + GameConfig.playerRadius + 0.08;
        const overlapDistance = distance(this.position, player);
        if (overlapDistance < contact) {
            const dx = overlapDistance > 0.001 ? (this.position.x - player.x) / overlapDistance : 1;
            const dz = overlapDistance > 0.001 ? (this.position.z - player.z) / overlapDistance : 0;
            const push = Math.min(contact - overlapDistance, dt * 5);
            const p = moveAndSlide(this.position, dx * push, dz * push, C.enemyRadius, GameConfig.arenaHalfSize, this.context.obstacles);
            this.node.setPosition(p.x, 0.06, p.z);
        }
        this.visual.tick(dt, moving, this.state === 'Attack', this.hurtTime > 0, 0, this.health.current / this.health.maximum);
    }
    private face(x: number, z: number): void { if (Math.hypot(x, z) > 0.001) this.node.setRotationFromEuler(0, Math.atan2(-x, -z) * 180 / Math.PI, 0); }
    private move(dt: number): number {
        this.repath -= dt;
        if (this.repath <= 0) { this.path = this.context.navigation.path(this.position, this.destination); this.repath = C.repathInterval; }
        while (this.path.length && distance(this.position, this.path[0]) < 0.25) this.path.shift();
        // Shortcut only when the full enemy radius clears every obstacle.
        for (let i = this.path.length - 1; i > 0; i--) if (clearLine(this.position, this.path[i], this.context.obstacles, C.enemyRadius + 0.04)) { this.path.splice(0, i); break; }
        if (!this.path.length) return 0;
        let dx = this.path[0].x - this.position.x, dz = this.path[0].z - this.position.z;
        const length = Math.hypot(dx, dz); dx /= Math.max(length, 0.001); dz /= Math.max(length, 0.001);
        for (const other of this.context.peers()) {
            if (other === this || !other.active || other.dead) continue;
            const d = distance(this.position, other.position);
            if (d < 0.85 && d > 0.001) { dx += (this.position.x - other.position.x) / d * (0.85 - d) * 2; dz += (this.position.z - other.position.z) / d * (0.85 - d) * 2; }
        }
        const magnitude = Math.max(1, Math.hypot(dx, dz));
        const step = Math.min(this.stats.speed * dt, length);
        const p = moveAndSlide(this.position, dx / magnitude * step, dz / magnitude * step, C.enemyRadius, GameConfig.arenaHalfSize, this.context.obstacles);
        if (distance(p, this.context.player.position) < C.enemyRadius + GameConfig.playerRadius + 0.08) return 0;
        const moved = distance(p, this.position); this.face(p.x - this.position.x, p.z - this.position.z);
        this.node.setPosition(p.x, 0.06, p.z); return moved > 0.001 ? 1 : 0;
    }
}
