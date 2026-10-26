import { Material, MeshRenderer, Node } from 'cc';
import { GeometryFactory } from '../levels/GeometryFactory';
import type { ZombieKind } from './ZombieBase';
import { WorldSpriteVisual } from '../player/WorldSpriteVisual';

export class ZombieVisual {
    readonly root: Node;
    private arms: Node[] = [];
    private legs: Node[] = [];
    private bar: Node;
    private barBackground: Node;
    private warning: Node;
    private phase = 0;
    private renderers: MeshRenderer[];
    private originals: (Material | null)[];
    private flash: Material;
    private sprite: WorldSpriteVisual|null = null;
    private wasDead = false;
    constructor(parent: Node, g: GeometryFactory, private readonly kind: ZombieKind) {
        const runner=kind==='runner';
        this.root = new Node('Zombie Visual'); parent.addChild(this.root);
        const skin = runner ? '#8E8A98' : '#8D9C93', shirt = runner ? '#493444' : '#424959';
        g.form(this.root, 'Torn torso', shirt, 0, 1.05, 0, runner ? .38 : .7, .7, .38, 'taper');
        if (runner) {
            for (let i = 0; i < 3; i++) {
                const spine = g.form(this.root, 'Feral spine', '#986078', 0, 1.2 + i * .2, .19, .13, .45, .17, 'cone'); spine.setRotationFromEuler(45, 0, 0);
            }
            g.part(this.root, 'Exposed rib cage', '#A39C9B', 0, 1.08, -.21, .25, .3, .035);
        } else {
            g.part(this.root, 'Torn shirt lapel', '#69727D', -.17, 1.19, -.21, .12, .3, .04).setRotationFromEuler(0, 0, -22);
            g.part(this.root, 'Civilian tie', '#61515E', .02, 1.05, -.24, .055, .35, .035);
            g.part(this.root, 'Uneven shoulder', shirt, -.32, 1.34, .03, .29, .26, .35, true);
        }
        g.part(this.root, 'Infected head', skin, 0, 1.57, -0.12, 0.42, 0.44, 0.38, true);
        g.part(this.root, 'Jaw', skin, 0, 1.41, -0.24, 0.3, 0.12, 0.15);
        for (const side of [-1, 1]) {
            g.part(this.root, 'Infection eye', '#F06D8F', side * 0.1, 1.61, -0.31, 0.07, 0.06, 0.03);
            const arm = new Node('Arm pivot'); this.root.addChild(arm); arm.setPosition(side * (runner ? 0.28 : 0.43), 1.27, 0);
            g.form(arm, 'Sleeve', shirt, 0, -.2, 0, runner ? .16 : .24, runner ? .5 : .36, .23, 'taper');
            g.part(arm, 'Claw', skin, 0, runner ? -.61 : -.43, -.05, .19, runner ? .38 : .27, .18, true); this.arms.push(arm);
            if (runner) for (const finger of [-1, 0, 1]) {
                const claw = g.form(arm, 'Long talon', '#BEB4B6', finger * .065, -.83, -.12, .05, .25, .05, 'cone'); claw.setRotationFromEuler(155, 0, 0);
            }
            const leg = new Node('Leg pivot'); this.root.addChild(leg); leg.setPosition(side * 0.16, 0.77, 0);
            g.form(leg, 'Trouser', '#343845', 0, -.25, 0, runner ? .17 : .25, .5, .25, 'taper');
            g.part(leg, 'Foot', '#202535', 0, -0.61, -0.1, 0.25, 0.23, 0.4); this.legs.push(leg);
        }
        g.part(this.root, 'Torn hem', '#B2A8A5', -0.1, 0.79, -0.19, 0.08, 0.2, 0.04);
        this.barBackground = g.part(parent, 'Health background', '#171D30', 0, 2.12, 0, 0.85, 0.075, 0.075);
        this.bar = g.part(parent, 'Enemy health', '#D56A91', 0, 2.13, 0, 0.8, 0.08, 0.08);
        if(kind==='runner'){this.bar.setPosition(0,1.8,0);this.barBackground.setPosition(0,1.79,0);}
        if(kind==='brute'){this.root.setScale(1.4,1.4,1.4);this.bar.setPosition(0,2.95,0);this.barBackground.setPosition(0,2.94,0);}
        this.warning = g.part(parent, 'Attack warning', '#D84A63', 0, 0.03, 0, 1.5, 0.02, 1.5, true); this.warning.active = false;
        this.renderers = this.root.getComponentsInChildren(MeshRenderer); this.originals = this.renderers.map(r => r.getSharedMaterial(0));
        this.flash = g.material('#FFE5E5');
        if(g.spriteAssets){const a=g.spriteAssets;this.sprite=new WorldSpriteVisual(parent,a.camera,(kind==='walker'?a.infected:a[kind])??a.infected,a.effect,kind,null,null,null,null,null,null,kind!=='walker'&&!!a[kind]);this.root.active=false;}
    }
    tick(dt: number, speed: number, attack: boolean, hurt: boolean, death: number, fraction: number): void {
        if(this.sprite){
            if(this.wasDead&&death<=0)this.sprite.reset();this.wasDead=death>0;
            if(death>0)this.sprite.play('die',.7);else if(hurt)this.sprite.play('hurt',.12);else if(attack)this.sprite.play('slash',.12);
            this.sprite.animate(dt,speed);
        }
        this.phase += dt * ((this.kind==='runner') ? 14 : 7);
        this.legs.forEach((leg, i) => leg.setRotationFromEuler(Math.sin(this.phase + i * Math.PI) * 32 * speed, 0, 0));
        this.arms.forEach((arm, i) => arm.setRotationFromEuler(attack ? -115 : -30 + Math.sin(this.phase + i * Math.PI) * 15 * speed, 0, i ? -10 : 10));
        this.root.setRotationFromEuler(death > 0 ? Math.min(1, death / 0.55) * 88 : ((this.kind==='runner') ? 29 : 13), 0, !(this.kind==='runner') && death <= 0 ? Math.sin(this.phase) * 5 * speed : 0);
        this.root.setPosition(0, speed * Math.abs(Math.sin(this.phase)) * 0.04, 0);
        this.bar.setScale(0.8 * Math.max(0.001, fraction), 0.08, 0.08); this.bar.active = this.barBackground.active = death <= 0 && fraction < 1;
        this.warning.active = attack && death <= 0;
        this.renderers.forEach((r, i) => { const m = hurt ? this.flash : this.originals[i]; if (m && r.getSharedMaterial(0) !== m) r.setSharedMaterial(m, 0); });
    }
    destroy():void {this.sprite?.destroy();}
}
