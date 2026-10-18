import { Obstacle, overlaps, PointXZ } from '../core/MovementMath';
import { clearLine, distance } from './CombatMath';

/** Small static A* grid, built once. At most five enemies replan twice a second. */
export class ArenaNavigation {
    private readonly size = 35;
    private readonly cells: PointXZ[] = [];
    private readonly open: boolean[] = [];
    constructor(private readonly obstacles: readonly Obstacle[], private readonly radius: number) {
        for (let z = -17; z <= 17; z++) for (let x = -17; x <= 17; x++) {
            this.cells.push({ x, z }); this.open.push(!obstacles.some(o => overlaps({ x, z }, radius + 0.08, o)));
        }
    }
    path(from: PointXZ, to: PointXZ): PointXZ[] {
        if (clearLine(from, to, this.obstacles, this.radius + 0.04)) return [{ x: to.x, z: to.z }];
        const closest = (p: PointXZ) => {
            let best = -1, min = Infinity;
            this.cells.forEach((c, i) => { const d = distance(p, c); if (this.open[i] && d < min && clearLine(p, c, this.obstacles, this.radius)) { best = i; min = d; } });
            return best;
        };
        const start = closest(from), end = closest(to);
        if (start < 0 || end < 0) return [];
        const todo = [start], cost = new Map<number, number>([[start, 0]]), came = new Map<number, number>(), closed = new Set<number>();
        while (todo.length) {
            let best = 0;
            for (let i = 1; i < todo.length; i++) if (cost.get(todo[i])! + distance(this.cells[todo[i]], this.cells[end]) <
                cost.get(todo[best])! + distance(this.cells[todo[best]], this.cells[end])) best = i;
            const current = todo.splice(best, 1)[0];
            if (current === end) {
                const result: PointXZ[] = []; let cursor = end;
                while (cursor !== start) { result.unshift(this.cells[cursor]); cursor = came.get(cursor)!; }
                result.unshift(this.cells[start]); result.push({ x: to.x, z: to.z }); return result;
            }
            closed.add(current);
            const cx = current % this.size, cz = Math.floor(current / this.size);
            for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dz) continue;
                const x = cx + dx, z = cz + dz, next = z * this.size + x;
                if (x < 0 || z < 0 || x >= this.size || z >= this.size || !this.open[next] || closed.has(next) ||
                    !clearLine(this.cells[current], this.cells[next], this.obstacles, this.radius + 0.04)) continue;
                const c = cost.get(current)! + Math.hypot(dx, dz);
                if (c < (cost.get(next) ?? Infinity)) { cost.set(next, c); came.set(next, current); if (todo.indexOf(next) < 0) todo.push(next); }
            }
        }
        return [];
    }
}
