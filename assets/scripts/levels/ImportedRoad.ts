import { isValid, MeshRenderer, Node, resources, Texture2D, utils } from 'cc';
import { GeometryFactory } from './GeometryFactory';
import { importedRoadData } from './ImportedRoadData';

/** Supplied GLB, fitted to the existing XZ arena without changing gameplay solids. */
export function buildImportedRoad(parent: Node, g: GeometryFactory): void {
    const root=new Node('Imported cyberpunk road intersection');parent.addChild(root);
    const asphalt: MeshRenderer[] = [], pavement: MeshRenderer[] = [], crossings: MeshRenderer[] = [];
    importedRoadData.forEach((batch,i)=>{
        const node=new Node(`Road material ${i+1}`);root.addChild(node);
        const renderer=node.addComponent(MeshRenderer);
        // World-space mapping keeps the ground pattern consistent across triangles.
        const uvs:number[]=[];
        const scale=batch.surface==='crosswalk'?1.2:i===0?4:3;
        for(let j=0;j<batch.positions.length;j+=3)uvs.push(batch.positions[j]/scale,batch.positions[j+2]/scale);
        renderer.mesh=g.ownMesh(utils.createMesh({positions:batch.positions,normals:batch.normals,indices:batch.indices,uvs}));
        renderer.setSharedMaterial(g.material(batch.color,batch.emission),0);
        if(i===0)asphalt.push(renderer);
        if(i===1||i===3)pavement.push(renderer);
        if(batch.surface==='crosswalk')crossings.push(renderer);
    });
    const load=(name:string,targets:MeshRenderer[],roughness:number)=>g.loadTexture(`environment/${name}/texture`, (error,texture)=>{
        if(!isValid(root))return;
        if(error||!texture){console.error(`Ground texture ${name} unavailable; retaining original material.`,error);return;}
        for(const renderer of targets)renderer.setSharedMaterial(g.texturedMaterial(texture,0,'#FFFFFF',roughness),0);
    });
    load('wet-asphalt',asphalt,.27);
    load('wet-pavement',pavement,.46);
    load('worn-crosswalk',crossings,.58);
}
