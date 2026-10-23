import { Color, MeshRenderer, Node, SphereLight, utils } from 'cc';
import { GeometryFactory } from './GeometryFactory';

/** Static street lighting and utility details; no additional gameplay obstacles. */
export function buildNightAtmosphere(parent:Node,g:GeometryFactory):void {
    const root=new Node('Night street atmosphere');parent.addChild(root);
    for(const x of [-5.2,5.2])for(const z of [-5.2,5.2]){
        const lamp=new Node('Amber streetlight spill');root.addChild(lamp);lamp.setPosition(x-Math.sign(x)*.8,3.12,z);
        const light=lamp.addComponent(SphereLight);light.color=new Color().fromHEX('#FFC083');
        light.range=6;light.size=.35;light.luminousFlux=720;
        g.part(root,'Utility pole extension','#413845',x,3.5,z,.13,1.1,.13);
        g.part(root,'Cable crossarm','#55434B',x,3.9,z,.7,.065,.075);
        for(const dx of [-.25,.25])g.form(root,'Ceramic insulator','#81777C',x+dx,4,z,.09,.16,.09,'taper');
        g.part(root,'Pole junction box','#65585E',x,1.7,z+.12,.25,.36,.15);
    }
    // Sagging cables batched into a single mesh rather than dozens of objects.
    const positions:number[]=[],normals:number[]=[],indices:number[]=[];
    const line=(ax:number,az:number,bx:number,bz:number)=>{
        for(const offset of [-.22,.22])for(let i=0;i<16;i++){
            const a=i/16,b=(i+1)/16;
            const x1=ax+(bx-ax)*a+offset,z1=az+(bz-az)*a;
            const x2=ax+(bx-ax)*b+offset,z2=az+(bz-az)*b;
            const y1=4-.38*Math.sin(Math.PI*a),y2=4-.38*Math.sin(Math.PI*b);
            const length=Math.hypot(x2-x1,z2-z1),dx=-(z2-z1)/length*.009,dz=(x2-x1)/length*.009;
            const n=positions.length/3;
            positions.push(x1+dx,y1,z1+dz,x2+dx,y2,z2+dz,x1-dx,y1,z1-dz,x2-dx,y2,z2-dz);
            normals.push(0,1,0,0,1,0,0,1,0,0,1,0);indices.push(n,n+1,n+2,n+2,n+1,n+3,n+2,n+1,n,n+3,n+1,n+2);
        }
    };
    line(-5.2,-5.2,-5.2,5.2);line(5.2,-5.2,5.2,5.2);
    line(-5.2,-5.2,5.2,-5.2);line(-5.2,5.2,5.2,5.2);
    const cables=new Node('Overhead utility wires');root.addChild(cables);
    const mesh=cables.addComponent(MeshRenderer);mesh.mesh=g.ownMesh(utils.createMesh({positions,normals,indices}));mesh.setSharedMaterial(g.material('#211D2B'),0);
}
