import { _decorator, Component, Graphics, Node } from 'cc';
const { ccclass } = _decorator;

/** Repaint static vectors after native UI render data is discarded on hide/reparent. */
@ccclass('StaticUIGraphics')
export class StaticUIGraphics extends Component {
    private graphics: Graphics | null = null;
    private paint: ((graphics: Graphics) => void) | null = null;
    initialize(graphics: Graphics, paint: (graphics: Graphics) => void): void {
        this.graphics = graphics; this.paint = paint; this.redraw();
    }
    onEnable(): void { this.redraw(); }
    private redraw(): void {
        if (!this.graphics || !this.paint) return;
        this.graphics.clear(); this.paint(this.graphics);
    }
}

export function staticGraphics(node: Node, paint: (graphics: Graphics) => void): Graphics {
    const graphics = node.addComponent(Graphics);
    node.addComponent(StaticUIGraphics).initialize(graphics, paint);
    return graphics;
}
