import { Node } from 'cc';
import { CombatConfig as C } from '../core/GameConfig';
import { overlaps } from '../core/MovementMath';
import { GeometryFactory } from '../levels/GeometryFactory';
import { distance } from '../systems/CombatMath';
import { ZombieBase, ZombieContext, ZombieKind } from './ZombieBase';

export class ZombieSpawner {
    readonly enemies: ZombieBase[] = [];
    constructor(parent: Node, geometry: GeometryFactory, context: ZombieContext) {
        const positions: [ZombieKind, number, number][] = [
            ['walker', -6, 2], ['walker', 0, -7], ['walker', 6, -2], ['runner', -3, 7], ['runner', 4, -7],
        ];
        for (const [kind, x, z] of positions.slice(0, C.maxEnemies)) {
            const p = { x, z };
            if (distance(p, context.player.position) < 4 || context.obstacles.some(o => overlaps(p, C.enemyRadius, o))) throw new Error(`Unsafe zombie spawn: ${x}, ${z}`);
            const node = new Node(`${kind === 'runner' ? 'Runner' : 'Walker'} ${this.enemies.length + 1}`); parent.addChild(node);
            const enemy = node.addComponent(ZombieBase); enemy.initialize(kind, p, context, geometry); this.enemies.push(enemy);
        }
    }
    get alive(): number { return this.enemies.filter(e => !e.dead).length; }
    reset(): void { this.enemies.forEach(e => e.reset()); }
}
