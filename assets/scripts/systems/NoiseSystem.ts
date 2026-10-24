import { AudioManager } from './AudioManager';
import { PointXZ } from '../core/MovementMath';
import { ZombieBase } from '../enemies/ZombieBase';
import { distance } from './CombatMath';

export class NoiseSystem {
    pressure = 0;
    emit(kind: 'pistol' | 'knife' | 'dodge' | 'pulse', p: PointXZ, enemies: readonly ZombieBase[]): void {
        const intensity = { pistol: 8, knife: 1, dodge: .5, pulse: 12 }[kind];
        const radius = { pistol: 15, knife: 3, dodge: 2, pulse: 12 }[kind];
        const previous=this.pressure;
        this.pressure = Math.min(100, this.pressure + intensity);
        if(previous<60 && this.pressure>=60)AudioManager.instance?.playSfx('high_noise');
        for (const e of enemies) if (e.active && !e.dead && distance(e.position, p) <= radius * (e.kind === 'runner' ? 1.2 : 1)) e.investigate(p);
    }
    tick(dt: number): void { this.pressure = Math.max(0, this.pressure - 5 * dt); }
    reset(): void { this.pressure = 0; }
}
