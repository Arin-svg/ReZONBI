export interface DamageHit { amount: number; id: number; source: string; kind: 'pistol' | 'knife' | 'melee' | 'skill'; }
export interface Damageable { receiveDamage(hit: DamageHit): boolean; }

/** Shared bounded health state. Simulation time, never wall-clock time. */
export class HealthState {
    current: number;
    protection = 0;
    invulnerability = 0;
    private recent: number[] = [];
    constructor(public readonly maximum: number, private readonly hitProtection = 0) { this.current = maximum; }
    get dead(): boolean { return this.current <= 0; }
    tick(dt: number): void {
        this.protection = Math.max(0, this.protection - dt);
        this.invulnerability = Math.max(0, this.invulnerability - dt);
    }
    damage(hit: DamageHit): boolean {
        if (!Number.isFinite(hit.amount) || hit.amount <= 0 || this.dead || this.protection > 0 ||
            this.invulnerability > 0 || this.recent.indexOf(hit.id) >= 0) return false;
        this.recent.push(hit.id); if (this.recent.length > 64) this.recent.shift();
        this.current = Math.max(0, this.current - hit.amount); this.protection = this.hitProtection;
        return true;
    }
    reset(): void { this.current = this.maximum; this.protection = this.invulnerability = 0; this.recent.length = 0; }
    heal(amount: number): number {
        if (this.dead || !Number.isFinite(amount) || amount <= 0) return 0;
        const before = this.current; this.current = Math.min(this.maximum, this.current + amount); return this.current - before;
    }
}
