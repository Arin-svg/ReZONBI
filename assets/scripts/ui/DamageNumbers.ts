import { Camera, Color, Label, Node, Vec3 } from 'cc';
import { PointXZ } from '../core/MovementMath';
import { label } from './ExplorationHUD';

/** Small fixed HUD pool projected from real world hit positions. */
export class DamageNumbers {
    private pool: { node: Node; text: Label; world: Vec3; life: number }[] = [];
    private cursor = 0;
    private projected = new Vec3();
    constructor(private parent: Node, private camera: Camera) {
        for (let i = 0; i < 24; i++) {
            const n = label(parent, 'Floating feedback', '', 100, 35, 21); n.active = false;
            this.pool.push({ node: n, text: n.getComponentInChildren(Label)!, world: new Vec3(), life: 0 });
        }
    }
    show(p: PointXZ, text: string, color = '#FFE5E5'): void {
        const n = this.pool[this.cursor++ % this.pool.length]; n.world.set(p.x, 2, p.z); n.life = .6;
        n.text.string = text; n.text.color = new Color().fromHEX(color); n.node.active = true;
        this.camera.convertToUINode(n.world, this.parent, this.projected); n.node.setPosition(this.projected);
    }
    tick(dt: number): void {
        for (const n of this.pool) if (n.life > 0) {
            n.life -= dt; n.node.active = n.life > 0; n.world.y += dt * 1.3;
            this.camera.convertToUINode(n.world, this.parent, this.projected); n.node.setPosition(this.projected);
        }
    }
    rebase(x:number,z:number):void {for(const n of this.pool){n.world.x-=x;n.world.z-=z;}}
    reset(): void { this.pool.forEach(n => { n.life = 0; n.node.active = false; }); }
}
