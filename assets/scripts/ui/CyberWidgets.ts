import { AudioManager } from '../systems/AudioManager';
import { Color, EventTouch, Graphics, isValid, Label, Node, resources, Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { label, panel, typography, ui } from './ExplorationHUD';
import { localizedText, translate } from './Localization';

export function stretch(node:Node):void {
    const w=node.addComponent(Widget);w.isAlignLeft=w.isAlignRight=w.isAlignTop=w.isAlignBottom=true;
    w.left=w.right=w.top=w.bottom=0;w.alignMode=Widget.AlignMode.ALWAYS;w.updateAlignment();
}
export function copy(node:Node,value:string):void { const l=node.getComponentInChildren(Label);if(l)localizedText(l,value); }
export function heading(parent:Node,text:string,y:number,size=30):Node {
    const n=label(parent,'Heading '+text,text,540,Math.max(65,text.split('\n').length*(size+7)),size);n.setPosition(0,y);const l=n.getComponentInChildren(Label)!;
    typography(l,size>=28?'display':text===text.toUpperCase()?'label':'body');return n;
}
export function action(parent:Node,name:string,text:string,y:number,click:()=>void,primary=false,enabled=true,width=330):Node {
    const n=label(parent,name,text,width,58,21);n.setPosition(0,y);panel(n,width,58);
    const caption=n.getComponentInChildren(Label)!;
    caption.fontSize=Math.min(21,Math.floor((width-36)/(Math.max(1,translate(text).length)*.62)));
    caption.node.getComponent(UITransform)!.setContentSize(width-32,42);typography(caption,'label');
    if(primary){const g=n.getChildByName('Panel')!.getComponent(Graphics)!;g.fillColor=new Color(221,0,75,245);g.moveTo(-width/2+16,-25);g.lineTo(width/2-10,-25);g.lineTo(width/2,25);g.lineTo(-width/2+26,25);g.close();g.fill();g.strokeColor=new Color(255,100,163);g.lineWidth=2;g.stroke();}
    n.getComponentInChildren(Label)!.color=new Color().fromHEX(enabled?'#FFF0F7':'#627084');
    if(!enabled)return n;
    let owner:number|null=null;
    let sx=1,sy=1;
    const reset=()=>{owner=null;Tween.stopAllByTarget(n);n.setScale(sx,sy,1);};
    n.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{e.propagationStopped=true;if(owner!==null)return;owner=e.getID();sx=n.scale.x;sy=n.scale.y;Tween.stopAllByTarget(n);tween(n).to(.07,{scale:new Vec3(sx*.97,sy*.97,1)}).start();});
    n.on(Node.EventType.TOUCH_CANCEL,reset);
    // Native simulator input belongs to its system window, which need not be window 0.
    n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;if(owner!==e.getID())return;const inside=n.getComponent(UITransform)!.hitTest(e.getLocation(),e.windowId);reset();if(inside){AudioManager.instance?.unlock();AudioManager.instance?.playSfx(text==='CONFIRM'?'ui_confirm':text==='BACK'||text==='CANCEL'?'ui_back':'ui_click');click();}});
    return n;
}
export function artwork(parent:Node,path:string,width:number,height:number,ready?:()=>void):Node {
    const n=ui(parent,'Art '+path,width,height);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;
    resources.load(path+'/texture',Texture2D,(err,texture)=>{
        if(!isValid(n)||err||!texture)return;
        const frame=new SpriteFrame();frame.texture=texture;s.spriteFrame=frame;
        ready?.();
        n.once(Node.EventType.NODE_DESTROYED,()=>frame.destroy());
    });return n;
}
export function entrance(node:Node):void {const alpha=node.getComponent(UIOpacity)??node.addComponent(UIOpacity);Tween.stopAllByTarget(alpha);alpha.opacity=80;tween(alpha).to(.16,{opacity:255}).start();}
