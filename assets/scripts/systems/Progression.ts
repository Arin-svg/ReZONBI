/** Engine-independent run progression and data-driven upgrade catalogue. */
export type SkillId = 'bullet' | 'blade' | 'shadow' | 'pulse' | 'blood' | 'magnet';
export interface SkillDefinition {
    id: SkillId; name: string; icon: string; category: string; max: number;
    prerequisites?: { id: SkillId; level: number }[];
    describe: (next: number) => string;
}
export const Skills: readonly SkillDefinition[] = [
    { id: 'bullet', name: 'Bullet Storm', icon: '>>', category: 'WEAPON', max: 5,
        describe: n => ['+1 assisted shot per volley', 'Volley damage +25%', '+2 assisted shots per volley', 'Fire interval reduced 20%', 'Extra shots reach 4m farther'][n - 1] },
    { id: 'blade', name: 'Blade Cyclone', icon: 'X', category: 'AUTOMATIC', max: 5,
        describe: n => `${1 + Math.floor(n / 2)} orbiting blades\n${12 + n * 6} contact damage` },
    { id: 'shadow', name: 'Shadow Dash', icon: '»', category: 'MOBILITY', max: 5,
        describe: n => `Dodge cooldown ${(3 - n * .3).toFixed(1)}s\nDistance ${(3.5 + n * .2).toFixed(1)}m${n >= 3 ? '\nDamaging afterimage' : ''}` },
    { id: 'pulse', name: 'Electric Pulse', icon: '~', category: 'AUTOMATIC', max: 5,
        describe: n => `${20 + n * 10} area damage / ${(6 - n * .5).toFixed(1)}s\nRadius ${(2.5 + n * .35).toFixed(1)}m + stun` },
    { id: 'blood', name: 'Bloodlust', icon: '+', category: 'PASSIVE', max: 5,
        describe: n => `Restore ${n * 3} HP\nper attributed kill` },
    { id: 'magnet', name: 'Zombie Magnet', icon: '<>', category: 'UTILITY', max: 5,
        describe: n => `EXP attraction radius ${3 + n * 1.2}m\nPickup radius ${(0.7 + n * .15).toFixed(2)}m` },
];
export function requiredXP(level: number): number { const n = level - 1; return 20 + 12 * n + 4 * n * n; }
export class Progression {
    level = 1; xp = 0; pending = 0;
    readonly levels: Partial<Record<SkillId, number>> = {};
    offers: SkillDefinition[] = [];
    rank(id: SkillId): number { return this.levels[id] || 0; }
    addXP(amount: number): void {
        if (!Number.isFinite(amount) || amount <= 0) return;
        this.xp += amount;
        while (this.xp >= requiredXP(this.level)) { this.xp -= requiredXP(this.level); this.level++; this.pending++; }
    }
    roll(random: () => number = Math.random): void {
        if (!this.pending) { this.offers = []; return; }
        const valid = Skills.filter(s => this.rank(s.id) < s.max && (!s.prerequisites || s.prerequisites.every(p => this.rank(p.id) >= p.level)));
        for (let i = valid.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [valid[i], valid[j]] = [valid[j], valid[i]]; }
        this.offers = valid.slice(0, 3);
        // All skills maxed: no fake cards and no permanent paused state.
        if (!valid.length) this.pending = 0;
    }
    choose(id: SkillId): boolean {
        if (!this.pending || !this.offers.some(s => s.id === id && this.rank(id) < s.max)) return false;
        this.levels[id] = this.rank(id) + 1; this.pending--; this.offers = []; return true;
    }
    reset(): void { this.level = 1; this.xp = this.pending = 0; this.offers = []; for (const s of Skills) delete this.levels[s.id]; }
}
