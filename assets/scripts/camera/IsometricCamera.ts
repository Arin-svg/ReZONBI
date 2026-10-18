import { _decorator, Component, Node, Vec3 } from 'cc';
import { GameConfig as C } from '../core/GameConfig';
const { ccclass } = _decorator;

@ccclass('IsometricCamera')
export class IsometricCamera extends Component {
    target: Node | null = null;
    private readonly focus = new Vec3();
    private readonly desired = new Vec3();
    private initialized = false;
    lateUpdate(frameDt: number): void {
        if (!this.target) return;
        const p = this.target.worldPosition;
        this.desired.set(Math.max(-16, Math.min(16, p.x)), 0.7, Math.max(-16, Math.min(16, p.z)));
        if (!this.initialized) { this.focus.set(this.desired); this.initialized = true; }
        else Vec3.lerp(this.focus, this.focus, this.desired, 1 - Math.exp(-C.cameraDamping * Math.min(frameDt, 0.1)));
        this.node.setWorldPosition(this.focus.x + C.cameraOffset, this.focus.y + C.cameraHeight, this.focus.z + C.cameraOffset);
        this.node.lookAt(this.focus);
    }
}
