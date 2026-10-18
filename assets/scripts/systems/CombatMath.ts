import { Obstacle, PointXZ } from '../core/MovementMath';
export function distance(a: PointXZ, b: PointXZ): number { return Math.hypot(a.x - b.x, a.z - b.z); }

/** Segment/slab intersection against the SAME footprints as movement collision. */
export function clearLine(a: PointXZ, b: PointXZ, obstacles: readonly Obstacle[], padding = 0): boolean {
    for (const o of obstacles) {
        let enter = 0, exit = 1;
        for (const axis of ['x', 'z'] as const) {
            const h = (axis === 'x' ? o.halfX : o.halfZ) + padding;
            const d = b[axis] - a[axis], low = o[axis] - h, high = o[axis] + h;
            if (Math.abs(d) < 1e-8) { if (a[axis] < low || a[axis] > high) { enter = 2; break; } }
            else {
                const t1 = (low - a[axis]) / d, t2 = (high - a[axis]) / d;
                enter = Math.max(enter, Math.min(t1, t2)); exit = Math.min(exit, Math.max(t1, t2));
            }
        }
        if (enter <= exit) return false;
    }
    return true;
}
export function inArc(origin: PointXZ, facing: PointXZ, target: PointXZ, range: number, arc: number): boolean {
    const d = distance(origin, target);
    return d <= range && (d < 1e-6 || ((target.x - origin.x) * facing.x + (target.z - origin.z) * facing.z) / d >= Math.cos(arc * Math.PI / 360));
}
export function nearestVisible<T extends { position: PointXZ; dead: boolean; active: boolean }>(
    origin: PointXZ, enemies: readonly T[], range: number, obstacles: readonly Obstacle[]): T | null {
    let best: T | null = null, nearest = range;
    for (const enemy of enemies) {
        const d = distance(origin, enemy.position);
        if (!enemy.dead && enemy.active && d <= nearest && clearLine(origin, enemy.position, obstacles)) { best = enemy; nearest = d; }
    }
    return best;
}
