import { Node } from 'cc';
import { PointXZ, Obstacle } from '../core/MovementMath';
import { GeometryFactory } from '../levels/GeometryFactory';
import { clearLine, distance } from './CombatMath';

/** Bounded pool; when full, merge value into the nearest existing crystal. No EXP is lost. */
export class ExperiencePickups {
    readonly pool: { node: Node; value: number }[] = [];
    private age = 0;
    constructor(parent: Node, geometry: GeometryFactory, private obstacles: readonly Obstacle[]) {
        for (let i = 0; i < 64; i++) {
            const node = geometry.form(parent, 'EXP crystal', '#55D9EF', 0, .35, 0, .28, .5, .28, 'crystal');
            geometry.glow(node, '#55D9EF', .65);
            node.setRotationFromEuler(0, 45, 35); node.active = false; this.pool.push({ node, value: 0 });
        }
    }
    drop(p: PointXZ, value: number): void {
        if (value <= 0 || !Number.isFinite(value)) return;
        let item = this.pool.find(c => c.value === 0);
        if (!item) {
            item = this.pool.reduce((a, b) => distance(a.node.position, p) < distance(b.node.position, p) ? a : b);
            item.value += value; return;
        }
        item.value = value; item.node.active = true; item.node.setPosition(p.x, .35, p.z);
    }
    tick(dt: number, player: PointXZ, magnet: number, pickup: number, collect: (xp: number) => void): void {
        this.age += dt;
        for (const c of this.pool) if (c.value > 0) {
            const p = c.node.position, d = distance(p, player), visible = clearLine(p, player, this.obstacles);
            if (visible && d <= pickup) { const value = c.value; c.value = 0; c.node.active = false; collect(value); continue; }
            const step = visible && d < magnet ? Math.min(d, dt * 9) : 0;
            c.node.setPosition(p.x + (player.x - p.x) / Math.max(d, .001) * step, .35 + Math.sin(this.age * 4) * .07,
                p.z + (player.z - p.z) / Math.max(d, .001) * step);
            c.node.setRotationFromEuler(0, this.age * 85, 35);
        }
    }
    rebase(x:number,z:number):void {for(const item of this.pool){const p=item.node.position;item.node.setPosition(p.x-x,p.y,p.z-z);}}
    reset(): void { this.age = 0; this.pool.forEach(c => { c.value = 0; c.node.active = false; }); }
}
