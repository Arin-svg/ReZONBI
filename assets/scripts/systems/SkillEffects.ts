import { Node } from 'cc';
import type { CombatEncounter } from '../core/CombatEncounter';
import { GeometryFactory } from '../levels/GeometryFactory';
import { clearLine, distance } from './CombatMath';
import { PointXZ } from '../core/MovementMath';

/** All automatic skills share the encounter simulation clock and bounded geometry. */
export class SkillEffects {
    private blades: Node[] = [];
    private hitTimes = new Map<string, number>();
    private time = 0;
    private pulse = 0;
    private shadow: { p: PointXZ; remaining: number; fired: boolean } | null = null;
    constructor(parent: Node, geometry: GeometryFactory, private encounter: CombatEncounter) {
        for (let i = 0; i < 3; i++) { const n = geometry.part(parent, 'Orbit blade', '#C3E7FF', 0, 1, 0, .16, .1, .8); n.active = false; this.blades.push(n); }
    }
    afterimage(): void {
        if (this.encounter.progression.rank('shadow') < 3) return;
        const p = this.encounter.player.node.position; this.shadow = { p: { x: p.x, z: p.z }, remaining: .3, fired: false };
        this.encounter.effects.impact(p, '#D56A91');
    }
    private area(p: PointXZ, radius: number, damage: number, stun = 0): void {
        const e = this.encounter;
        e.effects.slash(p, { x: 0, z: 1 }, radius, 360);
        for (const enemy of e.targets()) if (enemy.active && !enemy.dead && distance(p, enemy.position) <= radius && clearLine(p, enemy.position, e.player.obstacles)) {
            enemy.receiveDamage({ amount: damage, id: e.nextHit(), source: 'Rin', kind: 'skill' }); if (stun) enemy.stun(stun);
        }
    }
    tick(dt: number): void {
        const e = this.encounter, rank = e.progression.rank('blade'); this.time += dt;
        const count = rank ? 1 + Math.floor(rank / 2) : 0, p = e.player.node.position;
        this.blades.forEach((n, i) => {
            n.active = i < count; if (!n.active) return;
            const angle = this.time * 3.5 + i / count * Math.PI * 2;
            const q = { x: p.x + Math.sin(angle) * 1.7, z: p.z + Math.cos(angle) * 1.7 };
            n.setPosition(q.x, .9, q.z); n.setRotationFromEuler(0, angle * 180 / Math.PI, 0);
            for (const enemy of e.targets()) if (enemy.active && !enemy.dead && (this.hitTimes.get(enemy.node.uuid) || 0) <= this.time &&
                distance(q, enemy.position) < .85 && clearLine(p, enemy.position, e.player.obstacles)) {
                if (enemy.receiveDamage({ amount: 12 + rank * 6, id: e.nextHit(), source: 'Rin', kind: 'skill' })) this.hitTimes.set(enemy.node.uuid, this.time + .5);
            }
        });
        this.pulse -= dt; const pulseRank = e.progression.rank('pulse');
        if (pulseRank && this.pulse <= 0) { this.pulse = 6 - pulseRank * .5; this.area(p, 2.5 + pulseRank * .35, 20 + pulseRank * 10, .25); e.noise.emit('pulse', p, e.spawner.enemies); }
        if (this.shadow) {
            this.shadow.remaining -= dt;
            if (!this.shadow.fired && this.shadow.remaining <= 0) { this.shadow.fired = true; this.area(this.shadow.p, 1.8, 20 + e.progression.rank('shadow') * 8); this.shadow = null; }
        }
    }
    reset(): void { this.time = this.pulse = 0; this.hitTimes.clear(); this.shadow = null; this.blades.forEach(n => n.active = false); }
}
