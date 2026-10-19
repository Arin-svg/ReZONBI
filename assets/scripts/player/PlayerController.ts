import { _decorator, Component, EventKeyboard, game, Game, input, Input, KeyCode, Quat } from 'cc';
import { GameConfig as C } from '../core/GameConfig';
import { approach, cameraRelative, moveAndSlide, Obstacle } from '../core/MovementMath';
import { MobileJoystick } from '../ui/MobileJoystick';
import { CharacterVisual } from './CharacterVisual';
const { ccclass } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {
    obstacles: readonly Obstacle[] = [];
    joystick: MobileJoystick | null = null;
    visual: CharacterVisual | null = null;
    paused = false;
    dead = false;
    dodgeRemaining = 0;
    private dodgeVelocity = { x: 0, z: 0 };
    private aimLock = 0;
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
    reset(): void {
        this.clearInput(); this.dead = this.paused = false; this.dodgeRemaining = this.aimLock = 0;
        this.node.setPosition(0, 0.06, 1); this.node.setRotationFromEuler(0, 0, 0); this.visual?.reset();
    }
    face(x: number, z: number): void {
        if (Math.hypot(x, z) < 0.001) return;
        this.node.setRotationFromEuler(0, Math.atan2(-x, -z) * 180 / Math.PI, 0); this.aimLock = 0.16;
    }
    beginDodge(distance: number, duration: number): void {
        const direction = this.movementDirection();
        if (Math.hypot(direction.x, direction.z) < 0.01) { direction.x = this.node.forward.x; direction.z = this.node.forward.z; }
        const length = Math.hypot(direction.x, direction.z);
        this.dodgeVelocity = { x: direction.x / length * distance / duration, z: direction.z / length * distance / duration };
        this.dodgeRemaining = duration; this.face(direction.x, direction.z); this.visual?.play('dodge', duration);
    }
    private keyDown(e: EventKeyboard): void { this.keys.add(e.keyCode); }
    private keyUp(e: EventKeyboard): void { this.keys.delete(e.keyCode); }
    movementDirection(): { x: number; z: number } {
        const down = (...codes: KeyCode[]) => codes.some(c => this.keys.has(c)) ? 1 : 0;
        let x = down(KeyCode.KEY_D, KeyCode.ARROW_RIGHT) - down(KeyCode.KEY_A, KeyCode.ARROW_LEFT);
        let y = down(KeyCode.KEY_W, KeyCode.ARROW_UP) - down(KeyCode.KEY_S, KeyCode.ARROW_DOWN);
        if (this.joystick && this.joystick.output.lengthSqr() > 0) {
            x = this.joystick.output.x; y = this.joystick.output.y;
        }
        return cameraRelative(x, y);
    }
    update(frameDt: number): void {
        if (this.paused) return;
        const dt = Math.min(frameDt, 0.1);
        if (this.dead) { this.visual?.animate(dt, 0); return; }
        this.aimLock = Math.max(0, this.aimLock - dt);
        if (this.dodgeRemaining > 0) {
            const step = Math.min(dt, this.dodgeRemaining);
            const p = moveAndSlide(this.node.position, this.dodgeVelocity.x * step, this.dodgeVelocity.z * step, C.playerRadius, C.arenaHalfSize, this.obstacles);
            this.node.setPosition(p.x, 0.06, p.z); this.dodgeRemaining = Math.max(0, this.dodgeRemaining - step);
            this.visual?.animate(dt, 1); return;
        }
        const direction = this.movementDirection();
        const acceleration = direction.x || direction.z ? C.acceleration : C.deceleration;
        // Ignore resume-sized deltas; integrate ordinary frames in <= 1/120s steps.
        const steps = Math.max(1, Math.ceil(dt / C.maxStep)), step = dt / steps;
        let p = { x: this.node.position.x, z: this.node.position.z };
        for (let i = 0; i < steps; i++) {
            this.vx = approach(this.vx, direction.x * C.speed, acceleration * step);
            this.vz = approach(this.vz, direction.z * C.speed, acceleration * step);
            p = moveAndSlide(p, this.vx * step, this.vz * step, C.playerRadius, C.arenaHalfSize, this.obstacles);
        }
        const actualSpeed = Math.hypot(p.x - this.node.position.x, p.z - this.node.position.z) / Math.max(dt, 0.0001);
        this.node.setPosition(p.x, 0.06, p.z);
        if (this.aimLock <= 0 && Math.hypot(this.vx, this.vz) > 0.1) {
            const yaw = Math.atan2(-this.vx, -this.vz) * 180 / Math.PI;
            Quat.fromEuler(this.targetRotation, 0, yaw, 0);
            Quat.slerp(this.rotation, this.node.rotation, this.targetRotation, 1 - Math.exp(-C.turnSpeed * dt));
            this.node.setRotation(this.rotation);
        }
        this.visual?.animate(dt, Math.min(1, actualSpeed / C.speed));
    }
}
