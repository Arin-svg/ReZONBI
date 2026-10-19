import { _decorator, Component, Node, Vec3 } from 'cc';
import { GameConfig as C } from '../core/GameConfig';
const { ccclass } = _decorator;

@ccclass('IsometricCamera')
export class IsometricCamera extends Component {
    target: Node | null = null;
    /** Visual-only cutaway: collision and navigation footprints never change. */
    buildings: Node[] = [];
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
        for (const building of this.buildings) {
            const house = building.getChildByName('House'); if (!house) continue;
            const center = house.position;
            let enter = 0, leave = 1;
            const camera = this.node.worldPosition;
            for (const axis of ['x', 'z'] as const) {
                const half = axis === 'x' ? 3.7 : 3.4, delta = camera[axis] - p[axis];
                if (Math.abs(delta) < .001) { if (Math.abs(p[axis] - center[axis]) > half) leave = -1; }
                else {
                    const a = (center[axis] - half - p[axis]) / delta, b = (center[axis] + half - p[axis]) / delta;
                    enter = Math.max(enter, Math.min(a, b)); leave = Math.min(leave, Math.max(a, b));
                }
            }
            const occludes = enter <= leave && leave > 0 && 1.5 + (camera.y - 1.5) * enter < 4.3;
            const height = building.scale.y + ((occludes ? .08 : 1) - building.scale.y) * (1 - Math.exp(-18 * Math.min(frameDt, .1)));
            building.setScale(1, height, 1);
        }
    }
}
