import { Color, EffectAsset, Material, Mesh, MeshRenderer, Node, Texture2D, utils, Vec3, Vec4 } from 'cc';
import { CharacterAction, CharacterVisual } from './CharacterVisual';

/** Alpha-tested world geometry: depth-tested against the city, never a HUD sprite.
 * Atlas rows front/back/left/right; columns idle0/idle1/run0/run1.
 * Gameplay rotation stays on the actor; only the visual faces the camera.
 */
export class WorldSpriteVisual implements CharacterVisual {
    readonly root: Node;
    readonly material: Material;
    readonly mesh: Mesh;
    frame = -1;
    direction = 0;
    state = 'idle';
    private age = 0;
    private actionTime = 0;
    private action = '';
    private terminal = false;
    private textureKey = '';
    private readonly forward = new Vec3();
    private readonly uv = new Vec4(.25, .25, 0, 0);
    constructor(private actor: Node, private camera: Node, private texture: Texture2D, effect: EffectAsset,
        private kind: 'rin'|'walker'|'runner'|'boss' = 'rin', private actions: Texture2D|null = null) {
        this.root = new Node(kind==='rin'?'Rin world sprite':kind==='boss'?'Boss world sprite':'Enemy world sprite'); actor.addChild(this.root);
        // Bottom-center origin anchors feet to actor position. Small atlas padding below boots.
        const size=kind==='boss'?4.2:kind==='runner'?2.1:2.3;
        this.mesh = utils.createMesh({ positions: [-size/2,-.04,0, size/2,-.04,0, -size/2,size-.04,0, size/2,size-.04,0],
            normals: [0,0,1,0,0,1,0,0,1,0,0,1], uvs: [0,1,1,1,0,0,1,0], indices: [0,1,2,2,1,3] });
        this.material = new Material();
        this.material.initialize({effectAsset:effect,technique:0,defines:{USE_TEXTURE:true,USE_ALPHA_TEST:true}});
        this.material.setProperty('mainTexture', texture); this.material.setProperty('alphaThreshold', .45);
        this.material.setProperty('mainColor', new Color(255,255,255,255));
        const renderer = this.root.addComponent(MeshRenderer); renderer.mesh = this.mesh; renderer.setSharedMaterial(this.material,0);
        this.animate(0,0);
    }
    play(action: CharacterAction, duration: number): void {
        if(this.terminal) return;
        this.action=action;this.actionTime=duration;this.terminal=action==='die'||action==='victory';
    }
    reset(): void {this.action='';this.actionTime=0;this.terminal=false;this.age=0;this.animate(0,0);}
    animate(dt:number,moving:number):void {
        this.age+=dt;this.actionTime=Math.max(0,this.actionTime-dt);
        Vec3.transformQuat(this.forward,new Vec3(0,0,-1),this.actor.worldRotation);
        const screenX=(this.forward.x-this.forward.z)*Math.SQRT1_2;
        const screenY=(-this.forward.x-this.forward.z)*Math.SQRT1_2;
        this.direction=Math.abs(screenX)>Math.abs(screenY)?(screenX<0?2:3):(screenY>0?1:0);
        this.state=this.terminal?this.action:(this.actionTime>0?this.action:(moving>.05?'run':'idle'));
        const actionIndex=['shoot','slash','dodge','hurt','die'].indexOf(this.state);
        const useAction=this.kind==='rin'&&!!this.actions&&actionIndex>=0;
        const column=useAction?actionIndex:this.kind==='rin'?(moving>.05&&!this.terminal?2+Math.floor(this.age*8)%2:Math.floor(this.age*2)%2):(this.kind==='runner'?2:0)+(moving>.05?Math.floor(this.age*5)%2:0);
        const frame=this.direction*(useAction?5:4)+column;
        const textureKey=useAction?'actions':'locomotion';
        if(frame!==this.frame||textureKey!==this.textureKey){
            this.frame=frame;
            this.textureKey=textureKey;this.material.setProperty('mainTexture',useAction?this.actions!:this.texture);
            const rows=useAction?[0,305,589,852,1122]:this.kind==='rin'?[0,324,635,933,1234]:[0,319,632,929,1244];
            const width=useAction?1402:this.kind==='rin'?1274:1264, height=rows[4];
            const columns=useAction?[0,295,603,882,1094,1402]:[0,width/4,width/2,width*3/4,width];
            const top=rows[this.direction]+1,bottom=rows[this.direction+1]-1,left=columns[column]+1,right=columns[column+1]-1;
            this.uv.set((right-left)/width,(bottom-top)/height,left/width,top/height);
            this.material.setProperty('tilingOffset',this.uv);
        }
        this.root.setWorldRotation(this.camera.worldRotation);
        // Missing authored action frames use explicit temporary transforms; never represented as sprite clips.
        this.root.setScale(1,!useAction&&this.state==='dodge'?.72:1,1);
        if(this.state==='die'&&!useAction) this.root.setScale(1,.18,1);
        this.material.setProperty('mainColor',this.state==='hurt'?new Color(255,140,170,255):new Color(255,255,255,255));
    }
    destroy():void {this.material.destroy();this.mesh.destroy();this.root.destroy();}
}
