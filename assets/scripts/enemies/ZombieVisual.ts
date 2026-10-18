import { Material, MeshRenderer, Node } from 'cc';
import { GeometryFactory } from '../levels/GeometryFactory';

export class ZombieVisual {
    readonly root: Node;
    private arms: Node[] = [];
    private legs: Node[] = [];
    private bar: Node;
    private warning: Node;
    private phase = 0;
    private renderers: MeshRenderer[];
    private originals: (Material | null)[];
    private flash: Material;
    constructor(parent: Node, g: GeometryFactory, private readonly runner: boolean) {
        this.root = new Node('Zombie Visual'); parent.addChild(this.root);
        const skin = runner ? '#A79EA7' : '#AAB7A9', shirt = runner ? '#8F3E59' : '#545866';
        g.part(this.root, 'Torn torso', shirt, 0, 1.05, 0, runner ? 0.4 : 0.65, 0.65, 0.35);
        g.part(this.root, 'Infected head', skin, 0, 1.57, -0.12, 0.42, 0.44, 0.38, true);
        g.part(this.root, 'Jaw', skin, 0, 1.41, -0.24, 0.3, 0.12, 0.15);
        for (const side of [-1, 1]) {
            g.part(this.root, 'Infection eye', '#F06D8F', side * 0.1, 1.61, -0.31, 0.07, 0.06, 0.03);
            const arm = new Node('Arm pivot'); this.root.addChild(arm); arm.setPosition(side * (runner ? 0.28 : 0.43), 1.27, 0);
            g.part(arm, 'Sleeve', shirt, 0, -0.18, 0, 0.21, 0.36, 0.23);
            g.part(arm, 'Claw', skin, 0, -0.43, -0.05, 0.19, 0.27, 0.18); this.arms.push(arm);
            const leg = new Node('Leg pivot'); this.root.addChild(leg); leg.setPosition(side * 0.16, 0.77, 0);
            g.part(leg, 'Trouser', '#343845', 0, -0.25, 0, 0.22, 0.5, 0.25);
            g.part(leg, 'Foot', '#202535', 0, -0.61, -0.1, 0.25, 0.23, 0.4); this.legs.push(leg);
        }
        g.part(this.root, 'Torn hem', '#B2A8A5', -0.1, 0.79, -0.19, 0.08, 0.2, 0.04);
        g.part(parent, 'Health background', '#171D30', 0, 2.12, 0, 0.85, 0.075, 0.075);
        this.bar = g.part(parent, 'Enemy health', '#D56A91', 0, 2.13, 0, 0.8, 0.08, 0.08);
        this.warning = g.part(parent, 'Attack warning', '#D84A63', 0, 0.03, 0, 1.5, 0.02, 1.5, true); this.warning.active = false;
        this.renderers = this.root.getComponentsInChildren(MeshRenderer); this.originals = this.renderers.map(r => r.getSharedMaterial(0));
        this.flash = g.material('#FFE5E5');
    }
    tick(dt: number, speed: number, attack: boolean, hurt: boolean, death: number, fraction: number): void {
        this.phase += dt * (this.runner ? 14 : 7);
        this.legs.forEach((leg, i) => leg.setRotationFromEuler(Math.sin(this.phase + i * Math.PI) * 32 * speed, 0, 0));
        this.arms.forEach((arm, i) => arm.setRotationFromEuler(attack ? -115 : -30 + Math.sin(this.phase + i * Math.PI) * 15 * speed, 0, i ? -10 : 10));
        this.root.setRotationFromEuler(death > 0 ? Math.min(1, death / 0.55) * 88 : (this.runner ? 18 : 8), 0, 0);
        this.root.setPosition(0, speed * Math.abs(Math.sin(this.phase)) * 0.04, 0);
        this.bar.setScale(0.8 * Math.max(0.001, fraction), 0.08, 0.08); this.bar.active = death <= 0;
        this.warning.active = attack && death <= 0;
        this.renderers.forEach((r, i) => { const m = hurt ? this.flash : this.originals[i]; if (m && r.getSharedMaterial(0) !== m) r.setSharedMaterial(m, 0); });
    }
}
