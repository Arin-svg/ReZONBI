import { Color, EffectAsset, Material, Mesh, MeshRenderer, Node, primitives, resources, Texture2D, utils, Vec3 } from 'cc';

/** One shared unit mesh per shape and one material per colour; no external assets. */
export class GeometryFactory {
    private pendingTextures=0;
    private textureWaiters:(()=>void)[]=[];
    loadTexture(path:string,done:(error:Error|null,texture:Texture2D)=>void):void {
        this.pendingTextures++;
        resources.load(path,Texture2D,(error,texture)=>{try{done(error,texture);}finally{
            if(--this.pendingTextures===0)this.textureWaiters.splice(0).forEach(resolve=>resolve());
        }});
    }
    texturesReady():Promise<void> {return this.pendingTextures?new Promise(resolve=>this.textureWaiters.push(resolve)):Promise.resolve();}
    spriteAssets: {camera:Node; effect:EffectAsset; infected:Texture2D; boss?:Texture2D; bossWalk?:Texture2D} | null = null;
    private readonly boxMesh = utils.createMesh(primitives.box());
    private readonly sphereMesh = utils.createMesh(primitives.sphere(0.5, { segments: 10 }));
    private readonly materials = new Map<string, Material>();
    private readonly customMeshes: Mesh[] = [];
    ownMesh(mesh: Mesh): Mesh { this.customMeshes.push(mesh); return mesh; }
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
    texturedMaterial(texture: Texture2D, emission = 0, tint = '#FFFFFF', roughness = .82): Material {
        const key = `texture:${texture.uuid}:${emission}:${tint}:${roughness}`;
        let material = this.materials.get(key);
        if (!material) {
            material = new Material();
            material.initialize({ effectAsset: this.surfaceEffect, defines: {
                USE_ALBEDO_MAP: true, USE_EMISSIVE_MAP: emission > 0, USE_INSTANCING: true,
            }});
            material.setProperty('albedo', new Color().fromHEX(tint));
            material.setProperty('albedoMap', texture);
            material.setProperty('roughness', roughness);
            material.setProperty('metallic', .04);
            if (emission > 0) {
                material.setProperty('emissiveMap', texture);
                material.setProperty('emissive', new Color(255,255,255));
                material.setProperty('emissiveScale', new Vec3(emission,emission,emission));
            }
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
        this.customMeshes.forEach(mesh => mesh.destroy());
        this.materials.forEach(m => m.destroy());
        this.boxMesh.destroy();
        this.sphereMesh.destroy();
        Object.keys(this.shapes).forEach(k => this.shapes[k].destroy());
    }
}
