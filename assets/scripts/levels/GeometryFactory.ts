import { Color, EffectAsset, Material, MeshRenderer, Node, primitives, Texture2D, utils, Vec3 } from 'cc';

/** One shared unit mesh per shape and one material per colour; no external assets. */
export class GeometryFactory {
    spriteAssets: {camera:Node; effect:EffectAsset; infected:Texture2D; boss?:Texture2D} | null = null;
    private readonly boxMesh = utils.createMesh(primitives.box());
    private readonly sphereMesh = utils.createMesh(primitives.sphere(0.5, { segments: 10 }));
    private readonly materials = new Map<string, Material>();
    private readonly shapes = {
        taper: utils.createMesh(primitives.cylinder(.5, .34, 1, { radialSegments: 8 })),
        cone: utils.createMesh(primitives.cylinder(0, .5, 1, { radialSegments: 6 })),
        ring: utils.createMesh(primitives.torus(.5, .025, { radialSegments: 4, tubularSegments: 32 })),
        crystal: utils.createMesh(primitives.sphere(.5, { segments: 4 })),
    };
    constructor(private readonly surfaceEffect: EffectAsset) {}
    part(parent: Node, name: string, color: string, x: number, y: number, z: number,
        sx: number, sy: number, sz: number, rounded = false): Node {
        const node = new Node(name);
        parent.addChild(node);
        node.setPosition(x, y, z);
        node.setScale(sx, sy, sz);
        const renderer = node.addComponent(MeshRenderer);
        renderer.mesh = rounded ? this.sphereMesh : this.boxMesh;
        renderer.setSharedMaterial(this.material(color), 0);
        return node;
    }
    material(color: string, emission = 0): Material {
        const key = color + ':' + emission;
        let material = this.materials.get(key);
        if (!material) {
            material = new Material();
            material.initialize({ effectAsset: this.surfaceEffect, defines: { USE_ALBEDO_MAP: false, USE_INSTANCING: true } });
            material.setProperty('albedo', new Color().fromHEX(color));
            material.setProperty('roughness', 0.9);
            if (emission) { material.setProperty('emissive', new Color().fromHEX(color)); material.setProperty('emissiveScale', new Vec3(emission, emission, emission)); }
            this.materials.set(key, material);
        }
        return material;
    }
    glow(node: Node, color: string, emission = .3): void {
        const renderer = node.getComponent(MeshRenderer)!;
        const material = this.material(color, emission);
        if (renderer.getSharedMaterial(0) !== material) renderer.setSharedMaterial(material, 0);
    }
    form(parent: Node, name: string, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, shape: keyof GeometryFactory['shapes']): Node {
        const node = this.part(parent, name, color, x, y, z, sx, sy, sz);
        node.getComponent(MeshRenderer)!.mesh = this.shapes[shape]; return node;
    }
    destroy(): void {
        this.materials.forEach(m => m.destroy());
        this.boxMesh.destroy();
        this.sphereMesh.destroy();
        Object.keys(this.shapes).forEach(k => this.shapes[k].destroy());
    }
}
