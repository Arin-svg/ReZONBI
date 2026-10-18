import { _decorator, Component, EventKeyboard, game, Game, input, Input, KeyCode, Quat } from 'cc';
import { GameConfig as C } from '../core/GameConfig';
import { approach, cameraRelative, moveAndSlide, Obstacle } from '../core/MovementMath';
import { MobileJoystick } from '../ui/MobileJoystick';
import { RinVisual } from './RinVisual';
const { ccclass } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    obstacles: readonly Obstacle[] = [];
    joystick: MobileJoystick | null = null;
    visual: RinVisual | null = null;
    paused = false;
    private readonly keys = new Set<KeyCode>();
    private vx = 0;
    private vz = 0;
    private readonly targetRotation = new Quat();
    private readonly rotation = new Quat();
    onEnable(): void {
        input.on(Input.EventType.KEY_DOWN, this.keyDown, this);
        input.on(Input.EventType.KEY_UP, this.keyUp, this);
        game.on(Game.EVENT_HIDE, this.clearInput, this);
    }
    onDisable(): void {
        input.off(Input.EventType.KEY_DOWN, this.keyDown, this);
        input.off(Input.EventType.KEY_UP, this.keyUp, this);
        game.off(Game.EVENT_HIDE, this.clearInput, this); this.clearInput();
    }
    clearInput(): void { this.keys.clear(); this.vx = this.vz = 0; this.joystick?.reset(); }
    private keyDown(e: EventKeyboard): void { this.keys.add(e.keyCode); }
    private keyUp(e: EventKeyboard): void { this.keys.delete(e.keyCode); }
    update(frameDt: number): void {
        if (this.paused) return;
        const down = (...codes: KeyCode[]) => codes.some(c => this.keys.has(c)) ? 1 : 0;
        let x = down(KeyCode.KEY_D, KeyCode.ARROW_RIGHT) - down(KeyCode.KEY_A, KeyCode.ARROW_LEFT);
        let y = down(KeyCode.KEY_W, KeyCode.ARROW_UP) - down(KeyCode.KEY_S, KeyCode.ARROW_DOWN);
        if (this.joystick && this.joystick.output.lengthSqr() > 0) {
            x = this.joystick.output.x; y = this.joystick.output.y;
        }
        const direction = cameraRelative(x, y);
        const acceleration = x || y ? C.acceleration : C.deceleration;
        // Ignore resume-sized deltas; integrate ordinary frames in <= 1/120s steps.
        const dt = Math.min(frameDt, 0.1);
        const steps = Math.max(1, Math.ceil(dt / C.maxStep)), step = dt / steps;
        let p = { x: this.node.position.x, z: this.node.position.z };
        for (let i = 0; i < steps; i++) {
            this.vx = approach(this.vx, direction.x * C.speed, acceleration * step);
            this.vz = approach(this.vz, direction.z * C.speed, acceleration * step);
            p = moveAndSlide(p, this.vx * step, this.vz * step, C.playerRadius, C.arenaHalfSize, this.obstacles);
        }
        const actualSpeed = Math.hypot(p.x - this.node.position.x, p.z - this.node.position.z) / Math.max(dt, 0.0001);
        this.node.setPosition(p.x, 0.06, p.z);
        if (Math.hypot(this.vx, this.vz) > 0.1) {
            const yaw = Math.atan2(-this.vx, -this.vz) * 180 / Math.PI;
            Quat.fromEuler(this.targetRotation, 0, yaw, 0);
            Quat.slerp(this.rotation, this.node.rotation, this.targetRotation, 1 - Math.exp(-C.turnSpeed * dt));
            this.node.setRotation(this.rotation);
        }
        this.visual?.animate(dt, Math.min(1, actualSpeed / C.speed));
    }
}
