import { _decorator, Component, EventTouch, game, Game, Node, UITransform, Vec2, Vec3 } from 'cc';
import { GameConfig as C } from '../core/GameConfig';
import { joystickOutput } from '../core/MovementMath';
const { ccclass } = _decorator;

@ccclass('MobileJoystick')
export class MobileJoystick extends Component {
    readonly output = new Vec2();
    private touchId: number | null = null;
    private thumb: Node | null = null;
    private readonly local = new Vec3();
    private readonly screen = new Vec3();
    setThumb(thumb: Node): void { this.thumb = thumb; }
    onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onStart, this);
        // Cocos routes subsequent events to the node that captured TOUCH_START,
        // even outside its rectangle. Global input can be swallowed by UI dispatch.
        this.node.on(Node.EventType.TOUCH_MOVE, this.onMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onEnd, this);
        game.on(Game.EVENT_HIDE, this.reset, this);
    }
    onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onEnd, this);
        game.off(Game.EVENT_HIDE, this.reset, this);
        this.reset();
    }
    reset(): void {
        this.touchId = null; this.output.set(0, 0); this.thumb?.setPosition(0, 0, 0);
    }
    private onStart(e: EventTouch): void {
        if (this.touchId !== null) return;
        this.touchId = e.getID(); this.sample(e); e.propagationStopped = true;
    }
    private onMove(e: EventTouch): void { if (e.getID() === this.touchId) this.sample(e); }
    private onEnd(e: EventTouch): void { if (e.getID() === this.touchId) this.reset(); }
    private sample(e: EventTouch): void {
        const point = e.getUILocation(); this.screen.set(point.x, point.y, 0);
        this.node.getComponent(UITransform)!.convertToNodeSpaceAR(this.screen, this.local);
        const value = joystickOutput(this.local.x, this.local.y, C.joystickRadius, C.joystickDeadZone);
        this.output.set(value.x, value.y);
        const factor = Math.min(1, C.joystickRadius / Math.max(1, Math.hypot(this.local.x, this.local.y)));
        this.thumb?.setPosition(this.local.x * factor, this.local.y * factor, 0);
    }
}
