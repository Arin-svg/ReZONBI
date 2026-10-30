import { _decorator, Component, EventKeyboard, game, Game, input, Input, KeyCode } from 'cc';
import { CombatConfig as C } from '../core/GameConfig';
import { Obstacle } from '../core/MovementMath';
import { ZombieBase } from '../enemies/ZombieBase';
import { CombatEffects } from '../systems/CombatEffects';
import { clearLine, distance, nearestVisible } from '../systems/CombatMath';
import { PlayerController } from './PlayerController';
import { PlayerHealth } from './PlayerHealth';
import { SkillId } from '../systems/Progression';
const { ccclass } = _decorator;

export interface CombatContext {
    player: PlayerController; health: PlayerHealth; effects: CombatEffects;
    enemies: () => readonly ZombieBase[]; obstacles: readonly Obstacle[];
    canAct: () => boolean; nextHit: () => number; pause: () => void;
    rank?: (id: SkillId) => number; onAction?: (kind: 'pistol' | 'knife' | 'dodge') => void;
}
@ccclass('PlayerCombat')
export class PlayerCombat extends Component {
    context!: CombatContext;
    pistolCooldown = 0;
    knifeCooldown = 0;
    dodgeCooldown = 0;
    shotsFired = 0;
    private keys = new Set<KeyCode>();
    private escapeHeld = false;
    private trailTimer = 0;
    onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.keyDown, this); input.on(Input.EventType.KEY_UP, this.keyUp, this);
        game.on(Game.EVENT_HIDE, this.clearInput, this);
    }
    onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.keyDown, this); input.off(Input.EventType.KEY_UP, this.keyUp, this);
        game.off(Game.EVENT_HIDE, this.clearInput, this); this.clearInput();
    }
    clearInput(): void { this.keys.clear(); }
    reset(): void { this.clearInput(); this.pistolCooldown = this.knifeCooldown = this.dodgeCooldown = this.trailTimer = this.shotsFired = 0; }
    private keyDown(e: EventKeyboard): void {
        if (e.keyCode === KeyCode.ESCAPE) {
            if (!this.escapeHeld) { this.escapeHeld = true; this.context?.pause(); }
            return;
        }
        if (this.keys.has(e.keyCode)) return; this.keys.add(e.keyCode);
        if (e.keyCode === KeyCode.KEY_K) this.knife();
        if (e.keyCode === KeyCode.SPACE) this.dodge();
    }
    private keyUp(e: EventKeyboard): void { if (e.keyCode === KeyCode.ESCAPE) this.escapeHeld = false; this.keys.delete(e.keyCode); }
    tick(dt: number): void {
        this.pistolCooldown = Math.max(0, this.pistolCooldown - dt);
        this.knifeCooldown = Math.max(0, this.knifeCooldown - dt);
        this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
        // Automatic targeting is independent of joystick, mouse and touch input.
        this.shoot();
        this.trailTimer -= dt;
        if (this.context.player.dodgeRemaining > 0 && this.trailTimer <= 0) {
            this.context.effects.impact(this.node.position, '#67B7C6'); this.trailTimer = 0.06;
        }
    }
    shoot(): boolean {
        if (!this.context?.canAct() || this.pistolCooldown > 1e-6 || this.context.player.dodgeRemaining > 0) return false;
        const origin = this.node.position;
        const target = nearestVisible(origin, this.context.enemies(), C.pistolRange, this.context.obstacles);
        if (!target) return false;
        const rank = this.context.rank?.('bullet') || 0;
        this.pistolCooldown = C.pistolInterval * (rank >= 4 ? .8 : 1); this.shotsFired++;
        this.context.onAction?.('pistol');
        const end = { x: target.position.x, z: target.position.z };
        this.context.player.face(end.x - origin.x, end.z - origin.z);
        target.receiveDamage({ amount: C.pistolDamage * (rank >= 2 ? 1.25 : 1), id: this.context.nextHit(), source: 'Rin', kind: 'pistol' });
        this.context.effects.bullet(origin, end, '#FFE5A8');
        // Independent assisted hitscan shots. Spread prefers distinct targets, then focuses the survivor.
        const used: ZombieBase[] = [target];
        for (let i = 0; i < (rank >= 3 ? 2 : rank ? 1 : 0); i++) {
            const candidates = this.context.enemies().filter(e => used.indexOf(e) < 0);
            const extra = nearestVisible(origin, candidates, C.pistolRange + (rank >= 5 ? 4 : 0), this.context.obstacles) ||
                nearestVisible(origin, this.context.enemies(), C.pistolRange, this.context.obstacles);
            if (!extra) break;
            used.push(extra); this.context.effects.bullet({ x: origin.x + (i ? -.18 : .18), z: origin.z }, extra.position, '#F6A4D7');
            extra.receiveDamage({ amount: C.pistolDamage * (rank >= 2 ? 1.25 : 1), id: this.context.nextHit(), source: 'Rin', kind: 'pistol' });
        }
        this.context.player.visual?.play('shoot', 0.16); return true;
    }
    knife(): boolean {
        if (!this.context?.canAct() || this.knifeCooldown > 1e-6 || this.context.player.dodgeRemaining > 0) return false;
        this.knifeCooldown = C.knifeCooldown;
        this.context.onAction?.('knife');
        const origin = this.node.position, facing = this.node.forward, id = this.context.nextHit();
        for (const enemy of this.context.enemies()) if (!enemy.dead && enemy.active &&
            distance(origin, enemy.position) <= C.knifeRange && clearLine(origin, enemy.position, this.context.obstacles)) {
            enemy.receiveDamage({ amount: C.knifeDamage, id, source: 'Rin', kind: 'knife' });
        }
        this.context.effects.knifeSlash(origin, facing, C.knifeRange, C.knifeArc); this.context.player.visual?.play('slash', 0.36); return true;
    }
    dodge(): boolean {
        if (!this.context?.canAct() || this.dodgeCooldown > 1e-6) return false;
        const rank = this.context.rank?.('shadow') || 0;
        this.dodgeCooldown = C.dodgeCooldown - rank * .3;
        this.context.health.state.invulnerability = C.dodgeInvulnerability + rank * .02;
        this.context.onAction?.('dodge');
        this.context.player.beginDodge(C.dodgeDistance + rank * .2, C.dodgeDuration); return true;
    }
}
