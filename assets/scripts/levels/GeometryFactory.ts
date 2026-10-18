import { Color, EffectAsset, Material, MeshRenderer, Node, primitives, utils } from 'cc';

/** One shared unit mesh per shape and one material per colour; no external assets. */
export class GeometryFactory {
    private readonly boxMesh = utils.createMesh(primitives.box());
    private readonly sphereMesh = utils.createMesh(primitives.sphere(0.5, { segments: 10 }));
    private readonly materials = new Map<string, Material>();
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
    material(color: string): Material {
        let material = this.materials.get(color);
        if (!material) {
            material = new Material();
            material.initialize({ effectAsset: this.surfaceEffect, defines: { USE_ALBEDO_MAP: false, USE_INSTANCING: true } });
            material.setProperty('albedo', new Color().fromHEX(color));
            material.setProperty('roughness', 0.9);
            this.materials.set(color, material);
        }
        return material;
    }
    destroy(): void {
        this.materials.forEach(m => m.destroy());
        this.boxMesh.destroy();
        this.sphereMesh.destroy();
    }
}
