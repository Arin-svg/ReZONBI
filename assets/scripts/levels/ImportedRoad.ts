import { MeshRenderer, Node, utils } from 'cc';
import { GeometryFactory } from './GeometryFactory';
import { importedRoadData } from './ImportedRoadData';

/** Supplied GLB, fitted to the existing XZ arena without changing gameplay solids. */
export function buildImportedRoad(parent: Node, g: GeometryFactory): void {
    const root=new Node('Imported cyberpunk road intersection');parent.addChild(root);
    importedRoadData.forEach((batch,i)=>{
        const node=new Node(`Road material ${i+1}`);root.addChild(node);
        const renderer=node.addComponent(MeshRenderer);
        renderer.mesh=g.ownMesh(utils.createMesh({positions:batch.positions,normals:batch.normals,indices:batch.indices}));
        renderer.setSharedMaterial(g.material(batch.color,batch.emission),0);
    });
}
