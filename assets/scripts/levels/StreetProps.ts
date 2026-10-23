import { isValid, MeshRenderer, Node, resources, Texture2D, utils } from 'cc';
import { GeometryFactory } from './GeometryFactory';

/** Detailed static props; the arena owns the original car collision footprints. */
export function buildStreetProps(parent: Node, g: GeometryFactory): void {
    const root = new Node('Abandoned street props'); parent.addChild(root);
    const paintByCar = new Map<Node,string>();
    const surfaces: { renderer: MeshRenderer; emission: number; tint: string }[] = [];
    const quad = (owner: Node, name: string, p: number[], tile: number, color: string, emission = 0) => {
        const a = [p[3]-p[0],p[4]-p[1],p[5]-p[2]], b = [p[6]-p[0],p[7]-p[1],p[8]-p[2]];
        const n = [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
        const length = Math.hypot(...n); const normal = n.map(v=>v/length);
        const u = (tile%2)*.5, v = Math.floor(tile/2)*.5, e = .003;
        const mesh = g.ownMesh(utils.createMesh({positions:p,normals:[...normal,...normal,...normal,...normal],
            uvs:[u+e,v+.5-e,u+.5-e,v+.5-e,u+e,v+e,u+.5-e,v+e],indices:[0,1,2,2,1,3]}));
        const node = new Node(name); owner.addChild(node);
        const renderer = node.addComponent(MeshRenderer); renderer.mesh = mesh;
        if(owner.name.endsWith('sedan'))renderer.shadowCastingMode=MeshRenderer.ShadowCastingMode.ON;
        renderer.setSharedMaterial(g.material(color,emission),0);
        surfaces.push({renderer,emission,tint:(tile===0||tile===2)?(paintByCar.get(owner)||'#FFFFFF'):'#FFFFFF'});
    };
    const paper = (owner: Node,x:number,z:number,angle:number) => {
        const sheet=new Node('Discarded newspaper');owner.addChild(sheet);sheet.setPosition(x,.085,z);sheet.setRotationFromEuler(0,angle,0);
        quad(sheet,'Stained paper',[-.14,0,.2,.14,0,.2,-.14,0,-.2,.14,0,-.2],3,'#938C89');
    };
    const cone = (owner:Node,x:number,z:number,fallen:boolean) => {
        const node=new Node(fallen?'Fallen traffic cone':'Traffic cone');owner.addChild(node);
        node.setPosition(x,fallen?.16:.07,z); if(fallen)node.setRotationFromEuler(0,25,83);
        g.part(node,'Cone rubber base','#242433',0,.025,0,.3,.05,.3);
        g.form(node,'Weathered orange cone','#B64E2E',0,.23,0,.23,.42,.23,'cone');
        g.form(node,'Reflective cone stripe','#BEB6A6',0,.24,0,.13,.07,.13,'taper');
    };
    const brick = (owner:Node,x:number,z:number) => {
        const node=g.part(owner,'Broken concrete block','#706A70',x,.14,z,.25,.18,.35);
        node.setRotationFromEuler(0,x*57,0);
        for(const dz of [-.08,.08])g.part(node,'Block hollow','#262636',0,.505,dz*2.3,.55,.015,.24);
    };
    const vine = (owner:Node,x:number,z:number,seed:number) => {
        for(let i=0;i<6;i++) {
            const y=.18+i*.19, px=x+Math.sin(i*1.6+seed)*.09, pz=z+Math.cos(i+seed)*.06;
            const stem=g.part(owner,'Climbing vine','#56603B',px,y,pz,.025,.26,.025);stem.setRotationFromEuler(0,0,Math.sin(i)*22);
            const leaf=g.form(owner,'Ivy leaves',i%2?'#798049':'#475534',px+.06,y,pz,.18,.09,.12,'crystal');leaf.setRotationFromEuler(15,i*53,25);
        }
    };
    const cars=[[-3.2,-9],[10,2.6],[3.2,12]];
    cars.forEach(([x,z],index)=>{
        const car=new Node(['Faded red sedan','Grey-white sedan','Faded orange sedan'][index]);root.addChild(car);car.setPosition(x,0,z);
        const paint=['#CF7770','#DBD8CD','#E8A169'][index];
        paintByCar.set(car,paint);
        const steel=['#98605A','#AAA79E','#B67B4F'][index];
        g.part(car,'Chassis','#252333',0,.32,0,1.55,.26,3.15);
        // The body and sloped cabin are actual meshes, with front toward -Z.
        quad(car,'Left door panels',[-.8,.36,-1.65,-.8,.36,1.65,-.8,.87,-1.65,-.8,.87,1.65],2,steel);
        quad(car,'Right door panels',[.8,.36,1.65,.8,.36,-1.65,.8,.87,1.65,.8,.87,-1.65],2,steel);
        quad(car,'Hood',[-.8,.87,-.72,.8,.87,-.72,-.76,.75,-1.65,.76,.75,-1.65],0,steel);
        quad(car,'Trunk',[-.8,.8,1.65,.8,.8,1.65,-.8,.87,.96,.8,.87,.96],0,steel);
        quad(car,'Dented roof',[-.62,1.36,.62,.62,1.36,.62,-.62,1.4,-.34,.62,1.4,-.34],0,steel);
        quad(car,'Broken windshield',[.76,.88,-.72,-.76,.88,-.72,.62,1.4,-.34,-.62,1.4,-.34],1,'#23303D');
        quad(car,'Broken rear window',[-.76,.88,.96,.76,.88,.96,-.62,1.36,.62,.62,1.36,.62],1,'#23303D');
        quad(car,'Left side windows',[-.8,.88,-.72,-.8,.88,.96,-.62,1.4,-.34,-.62,1.36,.62],1,'#253340');
        quad(car,'Right side windows',[.8,.88,.96,.8,.88,-.72,.62,1.36,.62,.62,1.4,-.34],1,'#253340');
        quad(car,'Front grille',[.8,.36,-1.65,-.8,.36,-1.65,.76,.75,-1.65,-.76,.75,-1.65],0,steel);
        quad(car,'Rear panel',[-.8,.36,1.65,.8,.36,1.65,-.8,.8,1.65,.8,.8,1.65],0,steel);
        for(const end of [-1,1])g.part(car,'Scuffed bumper','#5F5558',0,.4,end*1.66,1.62,.13,.09);
        for(const side of [-1,1]) {
            const pillar=g.part(car,'Window pillar',steel,side*.72,1.12,.15,.055,.52,.065);pillar.setRotationFromEuler(0,0,side*18);
            g.part(car,'Side mirror',steel,side*.84,.95,-.55,.12,.1,.17);
            for(const wheelZ of [-1.05,1.08]) {
                g.part(car,'Deflated tyre','#171B24',side*.79,.3,wheelZ,.24,.5,.52,true);
                const rim=g.form(car,'Rusty wheel rim','#807475',side*.92,.3,wheelZ,.37,.37,.37,'ring');rim.setRotationFromEuler(0,0,90);
                g.part(car,'Wheel hub','#3F3A46',side*.92,.3,wheelZ,.025,.15,.15,true);
            }
            const lamp=g.part(car,'Damaged headlight',index===2?'#544A42':'#D9A375',side*.54,.64,-1.665,.3,.16,.035);
            if(index!==2)g.glow(lamp,'#E4A166',.45);
            const tail=g.part(car,'Cracked tail light','#B03142',side*.55,.64,1.67,.3,.13,.035);g.glow(tail,'#B03142',.25);
            for(const pz of [-.36,.66])g.part(car,'Door handle','#99858B',side*.81,.79,pz,.025,.035,.13);
            vine(car,side*.81,side*.5,index+side);
        }
        for(let i=0;i<5;i++)g.part(car,'Grille slat','#1E202B',-.3+i*.15,.6,-1.67,.035,.18,.025);
        cone(car,-1.13,.85,true);brick(car,1.15,1.23);
        paper(car,-1.15,-.55,index*37);paper(car,1.16,.25,index*57);
        // Large litter sits beside the car; this is decorative and adds no blockers.
        g.form(car,'Tied trash bag','#292938',1.13,.28,-1.05,.38,.43,.36,'crystal');
        g.part(car,'Bag knot','#514653',1.13,.51,-1.05,.1,.12,.1);
        g.form(car,'Discarded can','#9B6045',-1.1,.14,-1.18,.14,.2,.14,'taper');
    });
    // Low-profile street dressing leaves the crossing and chase routes open.
    for(const [x,z] of [[-4.5,-11],[4.5,9],[-10,3.8],[12,-3.8]]) {
        cone(root,x,z,false);paper(root,x+.45,z+.3,x*9);brick(root,x-.3,z+.5);
        g.part(root,'Recessed street drain','#222737',x,.065,z-1,.6,.02,.42);
        for(let i=0;i<6;i++)g.part(root,'Drain grille','#655C65',x-.25+i*.1,.08,z-1,.025,.02,.36);
        for(let i=0;i<4;i++) {
            const crack=g.part(root,'Branching asphalt crack','#141A27',x+.2+i*.13,.071,z-.4-i*.16,.025,.006,.27);
            crack.setRotationFromEuler(0,i%2?55:-20,0);
        }
    }
    for(const [x,z] of [[-3.6,-4],[3.6,4]]) {
        g.form(root,'Weathered manhole','#534650',x,.065,z,.68,.025,.68,'taper');
        g.form(root,'Manhole rim','#837078',x,.084,z,.62,.025,.62,'ring');
        for(let i=-2;i<=2;i++)g.part(root,'Manhole ribs','#302B39',x+i*.09,.085,z,.025,.012,.38);
    }
    resources.load('environment/worn-car-paint-atlas/texture',Texture2D,(error,texture)=>{
        if(!isValid(root))return;
        if(error||!texture){console.error('Street textures unavailable; retaining fallback materials.',error);return;}
        for(const surface of surfaces)surface.renderer.setSharedMaterial(g.texturedMaterial(texture,surface.emission,surface.tint),0);
    });
}
