import { MeshRenderer, Node } from 'cc';
import { PointXZ } from '../core/MovementMath';
import { GeometryFactory } from '../levels/GeometryFactory';

/** Fixed-size pool: no transient nodes or materials are allocated during combat. */
export class CombatEffects {
    private pool: { node: Node; life: number }[] = [];
    private cursor = 0;
    constructor(parent: Node, private readonly geometry: GeometryFactory) {
        for (let i = 0; i < 32; i++) {
            const node = geometry.part(parent, 'Combat effect', '#FFE5A8', 0, 1, 0, 0.1, 0.1, 0.1);
            node.active = false; this.pool.push({ node, life: 0 });
        }
    }
    line(a: PointXZ, b: PointXZ, color: string, duration = 0.09, width = 0.045): void {
        const effect = this.pool[this.cursor++ % this.pool.length]; effect.life = duration;
        effect.node.active = true; effect.node.setPosition((a.x + b.x) / 2, 1.05, (a.z + b.z) / 2);
        effect.node.setScale(width, width, Math.max(0.1, Math.hypot(b.x - a.x, b.z - a.z)));
        effect.node.setRotationFromEuler(0, Math.atan2(b.x - a.x, b.z - a.z) * 180 / Math.PI, 0);
        effect.node.getComponent(MeshRenderer)!.setSharedMaterial(this.geometry.material(color, .45), 0);
    }
    impact(p: PointXZ, color = '#FFE5E5'): void { this.line({ x: p.x - 0.12, z: p.z }, { x: p.x + 0.12, z: p.z }, color, 0.16, 0.24); }
    slash(p: PointXZ, facing: PointXZ, range: number, arc: number, color = '#67B7C6'): void {
        const angle = Math.atan2(facing.x, facing.z), half = arc * Math.PI / 360;
        for (let i = 0; i < 7; i++) {
            const a = angle - half + i / 7 * half * 2, b = angle - half + (i + 1) / 7 * half * 2;
            this.line({ x: p.x + Math.sin(a) * range, z: p.z + Math.cos(a) * range },
                { x: p.x + Math.sin(b) * range, z: p.z + Math.cos(b) * range }, color, 0.18, 0.07);
        }
    }
    tick(dt: number): void { for (const e of this.pool) if (e.life > 0) { e.life -= dt; if (e.life <= 0) e.node.active = false; } }
    reset(): void { this.pool.forEach(e => { e.life = 0; e.node.active = false; }); }
}
