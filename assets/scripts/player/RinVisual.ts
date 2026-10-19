import { Material, MeshRenderer, Node } from 'cc';
import { Palette as P } from '../core/GameConfig';
import { GeometryFactory } from '../levels/GeometryFactory';
import { CharacterAction, CharacterVisual } from './CharacterVisual';

/** Replace VisualRoot with a rigged model later; controller only calls animate().
 * Original procedural blockout, not final anime character art.
 */
export class RinVisual implements CharacterVisual {
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
    private hair: Node[] = [];
    constructor(parent: Node, g: GeometryFactory) {
        this.root = new Node('VisualRoot'); parent.addChild(this.root);
        const part = (name: string, c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, round = false) =>
            g.part(this.root, name, c, x, y, z, sx, sy, sz, round);
        part('Contact shadow', P.navy, 0, 0.025, 0, 0.85, 0.015, 0.65, true);
        g.form(this.root, 'Tailored jacket', '#692C48', 0, 1.13, 0, .57, .52, .35, 'taper');
        part('Shirt', '#737582', 0, 1.1, -0.17, 0.24, 0.34, 0.03);
        part('Crimson collar', '#E65A86', 0, 1.36, -0.08, 0.42, 0.08, 0.29);
        part('Shorts', P.hair, 0, 0.83, 0, 0.43, 0.22, 0.29);
        part('Belt', '#695362', 0, 0.93, 0, 0.48, 0.06, 0.34);
        part('Head', P.skin, 0, 1.64, -0.025, 0.46, 0.48, 0.4, true);
        part('Silver pink crown', '#F1DAEB', 0, 1.82, 0.025, 0.53, 0.3, 0.46, true);
        part('Hair volume', '#D9B6D0', 0, 1.61, 0.15, 0.49, 0.46, 0.25, true);
        for (let i = 0; i < 6; i++) {
            const side = i < 3 ? -1 : 1, strand = i % 3;
            const h = g.form(this.root, 'Twin tail strand', strand % 2 ? '#F2DCEB' : '#D7A8C9', side * (.29 + strand * .06), 1.28 - strand * .05, .14 + strand * .1, .18, .9, .23, 'cone');
            h.setRotationFromEuler(180, 0, side * 18); this.hair.push(h);
        }
        for (const side of [-1, 1]) {
            part('Crimson twin tail tie', '#D93368', side * .3, 1.74, .1, .18, .13, .16);
        }
        const fringe = part('Swept bangs', '#FFF0F5', -0.06, 1.78, -0.21, 0.35, 0.15, 0.08);
        fringe.setRotationFromEuler(0, 0, -14);
        part('Hair ribbon', P.pink, 0.25, 1.83, 0.08, 0.12, 0.13, 0.12);
        part('Ribbon knot', '#D93368', .21, 1.85, .08, .18, .13, .13);
        for (const x of [-0.105, 0.105]) part('Crimson eye', '#F35C88', x, 1.66, -0.222, 0.065, 0.045, 0.015);
        const limb = (name: string, x: number, y: number) => {
            const node = new Node(name); this.root.addChild(node); node.setPosition(x, y, 0); return node;
        };
        this.leftLeg = limb('Left leg pivot', -0.13, 0.79);
        this.rightLeg = limb('Right leg pivot', 0.13, 0.79);
        for (const leg of [this.leftLeg, this.rightLeg]) {
            g.form(leg, 'Shaped leg', P.skin, 0, -.22, 0, .17, .43, .19, 'taper');
            g.part(leg, 'Boot', P.hair, 0, -0.57, -0.04, 0.21, 0.34, 0.31);
            g.part(leg, 'Boot strap', '#575060', 0, -0.47, -0.02, 0.22, 0.06, 0.26);
            g.part(leg, 'Boot crimson sole', '#C83D67', 0, -.735, -.04, .22, .055, .32);
        }
        this.leftArm = limb('Left arm pivot', -0.34, 1.28);
        this.rightArm = limb('Right arm pivot', 0.34, 1.28);
        for (const arm of [this.leftArm, this.rightArm]) {
            g.form(arm, 'Sleeve', P.charcoal, 0, -.18, 0, .21, .38, .24, 'taper');
            g.part(arm, 'Crimson shoulder trim', '#D93368', 0, -.04, -.12, .18, .08, .035);
            g.part(arm, 'Glove', P.hair, 0, -0.4, -0.02, 0.15, 0.16, 0.18);
        }
        const weapon = new Node('WeaponAnchor'); this.rightArm.addChild(weapon); weapon.setPosition(0, -0.4, -0.1);
        g.part(weapon, 'Pistol', '#596071', 0, 0, -0.13, 0.12, 0.13, 0.37);
        this.muzzle = g.part(weapon, 'Muzzle flash', '#FFE5A8', 0, 0, -0.38, 0.2, 0.2, 0.3, true);
        this.muzzle.active = false;
        part('Knife sheath', '#555365', -0.29, 0.8, 0.08, 0.09, 0.35, 0.12);
        part('Jacket ribbon', P.pink, 0.28, 0.86, 0.1, 0.08, 0.32, 0.04);
        const strap = part('Utility cross strap', '#BD7791', -.08, 1.12, -.19, .045, .38, .035); strap.setRotationFromEuler(0, 0, -22);
        part('Utility pouch', '#4C415A', .24, .92, -.08, .14, .18, .16);
        g.glow(g.form(parent, 'Rin ground indicator', '#F19ABE', 0, .045, 0, 1.05, 1, 1.05, 'ring'), '#F19ABE', .5);
        part('Silver shoulder piping', '#B7CCE8', -.28, 1.34, 0, .05, .04, .27);
        part('Silver shoulder piping', '#B7CCE8', .28, 1.34, 0, .05, .04, .27);
        for (const name of ['AttackOrigin', 'CameraTarget', 'EffectsRoot']) {
            const node = new Node(name); parent.addChild(node);
            node.setPosition(0, name === 'AttackOrigin' ? 1.1 : 0.9, name === 'AttackOrigin' ? -0.5 : 0);
        }
        this.renderers = this.root.getComponentsInChildren(MeshRenderer);
        this.originalMaterials = this.renderers.map(r => r.getSharedMaterial(0));
        this.flashMaterial = g.material('#FFE5E5');
    }
    play(action: CharacterAction, duration: number): void {
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
        this.hair.forEach((h, i) => h.setRotationFromEuler(180 + Math.sin(this.phase + i * .5) * (moving ? 9 : 2), 0, (i < 3 ? -1 : 1) * 18));
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
            if (this.action === 'victory') { this.rightArm.setRotationFromEuler(-145, 0, -15); this.leftArm.setRotationFromEuler(0, 0, 25); }
        }
        this.renderers.forEach((r, i) => {
            const material = this.flashTime > 0 ? this.flashMaterial : this.originalMaterials[i];
            if (material && r.getSharedMaterial(0) !== material) r.setSharedMaterial(material, 0);
        });
    }
}
