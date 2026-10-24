import { Camera, instantiate, isValid, Node, SphereLight, Vec3, view } from 'cc';
import { Obstacle, PointXZ } from '../core/MovementMath';
import { GameConfig } from '../core/GameConfig';
import { GeometryFactory } from './GeometryFactory';
import { buildResidential } from './ResidentialArena';
import { CITY, chunkAt, chunkCells, chunkRadius, chunkSolids, chunkVariant } from './CityChunkMath';

type Slot={node:Node;key:string;cx:number;cz:number;turned:boolean;shops:Node[];lights:SphereLight[]};
/** Only scenery is recycled. Combat actors live outside this hierarchy. */
export class EndlessCity {
    readonly obstacles:Obstacle[] & {revision?:number}=[];
    readonly origin={x:0,z:0};
    seed=CITY.seed;
    private slots:Slot[]=[];
    private layout='';
    private lightPoint={x:Infinity,z:Infinity};
    private projected=new Vec3();
    private sample=new Vec3();
    private constructor(private parent:Node,private template:Node,private local:Obstacle[]){}
    static async create(parent:Node,g:GeometryFactory):Promise<EndlessCity|null> {
        const template=new Node('City chunk template');parent.addChild(template);template.active=false;
        const solids=buildResidential(template,g,true);
        // Clone only the finished textured layout; all clones share its meshes/materials.
        await g.texturesReady();if(!isValid(parent,true))return null;
        const prune=(n:Node)=>{for(const c of [...n.children]){if(!c.active){c.removeFromParent();c.destroy();}else prune(c);}};prune(template);
        const city=new EndlessCity(parent,template,solids);city.sync({x:0,z:1});return city;
    }
    private makeSlot():Slot {
        const node=instantiate(this.template);node.name='City chunk';this.parent.addChild(node);
        const names=['Convenience store','Coffee shop','Pharmacy','Ramen shop'];
        const slot:Slot={node,key:'',cx:0,cz:0,turned:false,shops:names.map(name=>node.getChildByName(name)!).filter(Boolean),lights:node.getComponentsInChildren(SphereLight)};
        for(const light of slot.lights)light.enabled=false;this.slots.push(slot);return slot;
    }
    sync(p:PointXZ,force=false):void {
        const size=view.getVisibleSize(),radius=chunkRadius(size.width/Math.max(1,size.height),GameConfig.orthoHeight);
        const key=chunkAt(p.x+this.origin.x)+':'+chunkAt(p.z+this.origin.z)+':'+radius;
        if(force||key!==this.layout){
            const cells=chunkCells(p,this.origin,radius);
            this.layout=key;const needed=new Set(cells.map(c=>c.x+':'+c.z));
            for(const slot of this.slots)if(!needed.has(slot.key)){slot.key='';slot.node.active=false;}
            for(const c of cells){
                const id=c.x+':'+c.z;let slot=this.slots.find(s=>s.key===id);
                if(!slot){slot=this.slots.find(s=>!s.key)||this.makeSlot();slot.key=id;slot.cx=c.x;slot.cz=c.z;
                    const variant=c.x===0&&c.z===0?0:chunkVariant(this.seed,c.x,c.z);slot.turned=(variant&1)!==0;
                    slot.node.setRotationFromEuler(0,slot.turned?180:0,0);
                    // Identical solid footprints allow safe shop permutations without new assets.
                    const places=[[-11,-11],[-11,11],[11,-11],[11,11]];
                    slot.shops.forEach((shop,i)=>{const q=places[(i+(variant>>>1)%4)%4];shop.setPosition(q[0],0,q[1]);shop.setRotationFromEuler(0,q[1]>0?180:0,0);});
                }
                slot.node.setPosition(c.x*CITY.size-this.origin.x,0,c.z*CITY.size-this.origin.z);slot.node.active=true;
            }
            this.obstacles.length=0;
            for(const slot of this.slots)if(slot.key)this.obstacles.push(...chunkSolids(this.local,slot.cx,slot.cz,this.origin,slot.turned));
            this.obstacles.revision=(this.obstacles.revision||0)+1;this.lightPoint.x=Infinity;
        }
        if(Math.hypot(p.x-this.lightPoint.x,p.z-this.lightPoint.z)>2){
            this.lightPoint={x:p.x,z:p.z};const lights=this.slots.filter(s=>s.key).reduce((all,s)=>all.concat(s.lights),[] as SphereLight[]);
            lights.sort((a,b)=>Math.hypot(a.node.worldPosition.x-p.x,a.node.worldPosition.z-p.z)-Math.hypot(b.node.worldPosition.x-p.x,b.node.worldPosition.z-p.z));
            lights.forEach((light,i)=>light.enabled=i<12);
        }
    }
    /** Include an enemy's upper body and a generous off-screen margin. */
    visible(p:PointXZ,camera:Camera):boolean {
        const screen=view.getVisibleSizeInPixel();
        for(const y of [0,4]){this.sample.set(p.x,y,p.z);camera.worldToScreen(this.sample,this.projected);
            if(this.projected.x>=-100&&this.projected.x<=screen.width+100&&this.projected.y>=-100&&this.projected.y<=screen.height+100)return true;}
        return false;
    }
    rebase(shift:PointXZ,p:PointXZ):void {this.origin.x+=shift.x;this.origin.z+=shift.z;this.sync(p,true);}
    reset():void {this.origin.x=this.origin.z=0;this.layout='';for(const s of this.slots)s.key='';this.sync({x:0,z:1},true);}
    capture(){return {seed:this.seed,originX:this.origin.x,originZ:this.origin.z};}
    restore(state:ReturnType<EndlessCity['capture']>|undefined,p:PointXZ):void {
        this.seed=state?.seed??CITY.seed;this.origin.x=state?.originX??0;this.origin.z=state?.originZ??0;
        this.layout='';for(const s of this.slots)s.key='';this.sync(p,true);
    }
}
