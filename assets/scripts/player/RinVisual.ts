import { Material, MeshRenderer, Node } from 'cc';
import { Palette as P } from '../core/GameConfig';
import { GeometryFactory } from '../levels/GeometryFactory';

/** Replace VisualRoot with a rigged model later; controller only calls animate().
 * Original procedural blockout, not final anime character art.
 */
export class RinVisual {
    readonly root: Node;
    private leftLeg: Node;
    private rightLeg: Node;
    private leftArm: Node;
    private rightArm: Node;
    private phase = 0;
    private action = '';
    private actionTime = 0;
    private actionLength = 0;
    private dead = false;
    private flashTime = 0;
    private renderers: MeshRenderer[] = [];
    private originalMaterials: (Material | null)[] = [];
    private flashMaterial: Material;
    private muzzle: Node;
    constructor(parent: Node, g: GeometryFactory) {
        this.root = new Node('VisualRoot'); parent.addChild(this.root);
        const part = (name: string, c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, round = false) =>
            g.part(this.root, name, c, x, y, z, sx, sy, sz, round);
        part('Contact shadow', P.navy, 0, 0.025, 0, 0.85, 0.015, 0.65, true);
        part('Jacket', P.charcoal, 0, 1.13, 0, 0.54, 0.5, 0.31);
        part('Shirt', '#737582', 0, 1.1, -0.17, 0.24, 0.34, 0.03);
        part('Pink collar', P.pink, 0, 1.36, -0.08, 0.42, 0.08, 0.29);
        part('Shorts', P.hair, 0, 0.83, 0, 0.43, 0.22, 0.29);
        part('Belt', '#695362', 0, 0.93, 0, 0.48, 0.06, 0.34);
        part('Head', P.skin, 0, 1.64, -0.025, 0.46, 0.48, 0.4, true);
        part('Hair cap', P.hair, 0, 1.82, 0.025, 0.51, 0.26, 0.44, true);
        part('Hair back', P.hair, 0, 1.61, 0.15, 0.47, 0.42, 0.2);
        part('Side fringe', P.hair, -0.22, 1.65, -0.05, 0.1, 0.4, 0.29);
        part('Side fringe', P.hair, 0.22, 1.69, -0.05, 0.1, 0.32, 0.29);
        const fringe = part('Swept bangs', P.hair, -0.06, 1.78, -0.21, 0.35, 0.15, 0.08);
        fringe.setRotationFromEuler(0, 0, -14);
        part('Hair ribbon', P.pink, 0.25, 1.83, 0.08, 0.12, 0.13, 0.12);
        part('Ponytail', P.hair, 0.1, 1.58, 0.32, 0.18, 0.45, 0.2);
        for (const x of [-0.105, 0.105]) part('Eye', '#5E354E', x, 1.66, -0.222, 0.055, 0.04, 0.015);
        const limb = (name: string, x: number, y: number) => {
            const node = new Node(name); this.root.addChild(node); node.setPosition(x, y, 0); return node;
        };
        this.leftLeg = limb('Left leg pivot', -0.13, 0.79);
        this.rightLeg = limb('Right leg pivot', 0.13, 0.79);
        for (const leg of [this.leftLeg, this.rightLeg]) {
            g.part(leg, 'Leg', P.skin, 0, -0.22, 0, 0.16, 0.43, 0.18);
            g.part(leg, 'Boot', P.hair, 0, -0.57, -0.04, 0.21, 0.34, 0.31);
            g.part(leg, 'Boot strap', '#575060', 0, -0.47, -0.02, 0.22, 0.06, 0.26);
        }
        this.leftArm = limb('Left arm pivot', -0.34, 1.28);
        this.rightArm = limb('Right arm pivot', 0.34, 1.28);
        for (const arm of [this.leftArm, this.rightArm]) {
            g.part(arm, 'Sleeve', P.charcoal, 0, -0.18, 0, 0.18, 0.38, 0.22);
            g.part(arm, 'Glove', P.hair, 0, -0.4, -0.02, 0.15, 0.16, 0.18);
        }
        const weapon = new Node('WeaponAnchor'); this.rightArm.addChild(weapon); weapon.setPosition(0, -0.4, -0.1);
        g.part(weapon, 'Pistol', '#596071', 0, 0, -0.13, 0.12, 0.13, 0.37);
        this.muzzle = g.part(weapon, 'Muzzle flash', '#FFE5A8', 0, 0, -0.38, 0.2, 0.2, 0.3, true);
        this.muzzle.active = false;
        part('Knife sheath', '#555365', -0.29, 0.8, 0.08, 0.09, 0.35, 0.12);
        part('Jacket ribbon', P.pink, 0.28, 0.86, 0.1, 0.08, 0.32, 0.04);
        for (const name of ['AttackOrigin', 'CameraTarget', 'EffectsRoot']) {
            const node = new Node(name); parent.addChild(node);
            node.setPosition(0, name === 'AttackOrigin' ? 1.1 : 0.9, name === 'AttackOrigin' ? -0.5 : 0);
        }
        this.renderers = this.root.getComponentsInChildren(MeshRenderer);
        this.originalMaterials = this.renderers.map(r => r.getSharedMaterial(0));
        this.flashMaterial = g.material('#FFE5E5');
    }
    play(action: 'shoot' | 'slash' | 'dodge' | 'hurt' | 'die', duration: number): void {
        if (this.dead) return;
        if (action === 'hurt') this.flashTime = duration;
        if (action === 'die') this.dead = true;
        this.action = action; this.actionTime = this.actionLength = duration;
    }
    reset(): void {
        this.dead = false; this.action = ''; this.actionTime = this.flashTime = 0;
        this.root.setRotationFromEuler(0, 0, 0); this.root.setScale(1, 1, 1); this.animate(0, 0);
    }
    animate(dt: number, moving: number): void {
        this.actionTime = Math.max(0, this.actionTime - dt); this.flashTime = Math.max(0, this.flashTime - dt);
        const progress = 1 - this.actionTime / Math.max(0.001, this.actionLength);
        this.phase += dt * (moving > 0.05 ? 11 : 2);
        const swing = Math.sin(this.phase) * 27 * moving;
        this.leftLeg.setRotationFromEuler(swing, 0, 0);
        this.rightLeg.setRotationFromEuler(-swing, 0, 0);
        this.leftArm.setRotationFromEuler(-swing * 0.7, 0, 5);
        this.rightArm.setRotationFromEuler(swing * 0.35 - 12, 0, -5);
        this.root.setPosition(0, Math.abs(Math.sin(this.phase)) * (moving > 0.05 ? 0.045 * moving : 0.012), 0);
        this.root.setScale(1, this.action === 'dodge' && this.actionTime > 0 ? 0.72 : 1, 1);
        this.root.setRotationFromEuler(0, 0, this.dead ? Math.min(1, progress) * 82 : 0);
        this.muzzle.active = this.action === 'shoot' && this.actionTime > this.actionLength - 0.07;
        if (this.actionTime > 0) {
            if (this.action === 'shoot') this.rightArm.setRotationFromEuler(-75 - Math.sin(progress * Math.PI) * 20, 0, -5);
            if (this.action === 'slash') this.leftArm.setRotationFromEuler(-70, -70 + progress * 140, -35);
            if (this.action === 'hurt') this.root.setRotationFromEuler(-12 * Math.sin(progress * Math.PI), 0, 0);
        }
        this.renderers.forEach((r, i) => {
            const material = this.flashTime > 0 ? this.flashMaterial : this.originalMaterials[i];
            if (material && r.getSharedMaterial(0) !== material) r.setSharedMaterial(material, 0);
        });
    }
}
