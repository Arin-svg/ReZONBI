import { _decorator, Component } from 'cc';
import { CombatConfig as C } from '../core/GameConfig';
import { Damageable, DamageHit, HealthState } from '../systems/DamageSystem';
const { ccclass } = _decorator;
@ccclass('PlayerHealth')
export class PlayerHealth extends Component implements Damageable {
    readonly state = new HealthState(C.maxHP, C.hitProtection);
    onDamaged: (dead: boolean) => void = () => {};
    canReceive: () => boolean = () => true;
    get dead(): boolean { return this.state.dead; }
    receiveDamage(hit: DamageHit): boolean {
        if (!this.canReceive() || !this.state.damage(hit)) return false;
        this.onDamaged(this.dead); return true;
    }
}
