import { AudioManager } from '../systems/AudioManager';
import { BlockInputEvents, Color, EventTouch, Vec3, director, game, Graphics, Label, Node, sys, UITransform } from 'cc';
import type { CombatEncounter } from '../core/CombatEncounter';
import { captureRun, parseRun, restoreRun } from '../systems/RunCheckpoint';
import { action, artwork, copy, entrance, heading, stretch } from './CyberWidgets';
import { label, panel, pin, typography, ui } from './ExplorationHUD';
import { getLanguage, setLanguage } from './Localization';
import { staticGraphics } from './StaticUIGraphics';

type Page='home'|'game'|'pause'|'settings'|'tutorial'|'defeat'|'victory'|'confirm'|'dialogue'|'stats';
export type Notice='Zombie Rush!'|'Supply Found'|'Ammo Low'|'Health Low'|'Skill Ready'|'Door Locked'|'Item Obtained'|'Objective Updated'|'Area Cleared'|'Save Point';
const SAVE='rezonbi.run.v1', SETTINGS='rezonbi.ui.settings.v1';
const RECORD='rezonbi.record.v1';
const TUTORIAL=[['SURVIVE NEW HAVEN','The infected are everywhere. Keep moving and stay alert.'],['EQUIPPED WEAPONS','Your pistol fires automatically at nearby visible enemies. Use the joystick to move, tap the sword to slash, and tap dodge to evade.'],['NOISE DETECTION','Automatic gunfire attracts more infected. Keep moving and use your sword when enemies surround you.'],['HEALTH AND DAMAGE','Your health is shown here. Avoid taking damage to survive longer.'],['MINIMAP','The minimap shows your position, enemies, and obstacles in the area.']];
TUTORIAL.push(['YOUR NEXT CHALLENGE','Collect EXP, choose upgrades, and survive. A Tyrant returns after every 100 zombie kills. Defeat it and keep going.']);

/** Screen flow owns UI pause only; simulation and combat remain in the encounter. */
export class GameUI {
    page:Page='home';
    private audio:AudioManager;
    private musicPage:'home'|'combat'|'boss'|'defeat'|'victory'='home';
    private overlay:Node;
    private art:Node;
    private content:Node;
    private safe:Node;
    private map:Graphics;
    private toast:Node;
    private toastTitle:Node;
    private prompt:Node;
    private toastTime=0;
    private mapTime=0;
    private saveTime=0;
    private previousHP=400;
    private previousSlash=0;
    private previousBoss=0;
    private previousPhase=0;
    private tutorialPage=0;
    private back:Page='home';
    private notices:{title:Notice;detail:string}[]=[];
    private started=false;
    private pendingClear=0;
    private quality:'high'|'low'='high';
    private popup:Node;
    private popupTime=0;
    private dialogueLines:string[]=[];
    private dialogueIndex=0;
    private holdTime=0;
    private holding=false;
    private holdAction:(()=>void)|null=null;
    constructor(private e:CombatEncounter) {
        this.audio=new AudioManager(e.node);
        this.safe=e.node.parent!.getChildByName('Mobile Canvas')!.getChildByName('Safe area')!;
        const minimap=ui(e.hud.node,'Minimap',128,128);pin(minimap,'right','top',94,20);this.map=minimap.addComponent(Graphics);
        this.toast=label(e.hud.node,'Notification','',390,62,18);panel(this.toast,390,62);pin(this.toast,'left','top',24,195);this.toast.active=false;
        const detail=this.toast.getComponentInChildren(Label)!;detail.fontSize=15;detail.lineHeight=18;detail.node.getComponent(UITransform)!.setContentSize(362,36);detail.node.setPosition(0,-12);
        this.toastTitle=label(this.toast,'Notification heading','',362,22,16);this.toastTitle.setPosition(0,18);typography(this.toastTitle.getComponentInChildren(Label)!,'label');
        this.prompt=label(e.hud.node,'Interaction prompt','',240,58,19);panel(this.prompt,240,58);this.prompt.setPosition(0,-100);this.prompt.active=false;
        this.popup=label(e.hud.node,'Item popup','',240,56,18);panel(this.popup,240,56);pin(this.popup,'right','top',24,205);this.popup.active=false;
        this.overlay=ui(this.safe,'Game screens',1280,720);stretch(this.overlay);this.overlay.addComponent(BlockInputEvents);
        this.art=artwork(this.overlay,'ui/menu-background',1280,720);
        const shade=ui(this.overlay,'Screen shade',10000,10000);staticGraphics(shade,g=>{g.fillColor=new Color(3,6,16,155);g.rect(-5000,-5000,10000,10000);g.fill();});
        this.content=ui(this.overlay,'Screen content',960,620);
        try{const data=JSON.parse(sys.localStorage.getItem(SETTINGS)||'{}');this.quality=data.quality==='low'?'low':'high';}catch{/* defaults */}
        this.applyQuality();this.show('home');
    }
    private freeze(value:boolean):void {
        this.holding=false;this.holdTime=0;
        const e=this.e;e.paused=value;e.player.paused=value;e.player.clearInput();e.combat.clearInput();e.hud.clearTouches();
        if(e.player.joystick)e.player.joystick.enabled=!value&&e.state==='playing'&&!e.selecting;
    }
    private clear():void {for(const child of [...this.content.children]){child.removeFromParent();child.destroy();}}
    private button(text:string,y:number,click:()=>void,primary=false,enabled=true,parent=this.content):Node {return action(parent,text,text,y,click,primary,enabled);}
    private saved(){try{return parseRun(sys.localStorage.getItem(SAVE));}catch{return null;}}
    private removeSave():void {try{sys.localStorage.removeItem(SAVE);}catch{/* storage unavailable */}}
    private record():{kills:number;seconds:number} {
        try{const r=JSON.parse(sys.localStorage.getItem(RECORD)||'{}');return {kills:Number.isSafeInteger(r.kills)&&r.kills>=0?r.kills:0,seconds:Number.isFinite(r.seconds)&&r.seconds>=0?r.seconds:0};}catch{return {kills:0,seconds:0};}
    }
    private updateRecord():void {
        if(!this.started)return;
        const r=this.record();
        try{sys.localStorage.setItem(RECORD,JSON.stringify({kills:Math.max(r.kills,this.e.kills),seconds:Math.max(r.seconds,this.e.elapsed)}));}catch{/* Records are optional when storage is unavailable. */}
    }
    save():boolean {
        if(!this.started||this.e.state!=='playing'||this.e.health.dead)return false;
        this.updateRecord();
        try{sys.localStorage.setItem(SAVE,JSON.stringify(captureRun(this.e)));return true;}catch{return false;}
    }
    routePause():boolean {
        this.audio.playSfx('pause');
        if(this.page==='game'){if(this.e.selecting||this.e.state!=='playing')return true;this.save();this.show('pause');}
        else if(this.page==='pause')this.show('game');
        else if(['settings','tutorial','stats','dialogue'].indexOf(this.page)>=0)this.show(this.back);
        return true;
    }
    private start():void {
        this.removeSave();this.e.restart();this.started=true;this.notices=[];this.pendingClear=0;this.resetTracking();this.show('game');
        this.notify('Objective Updated','Survive the horde. Tyrant returns after every 100 zombie kills.');this.save();
        this.dialogue(['There are still more… ','I have to keep moving no matter what.','I can\'t let them catch me.','I have to survive.']);
    }
    private resumeSaved():void {
        const saved=this.saved();if(!saved){this.show('home');return;}
        restoreRun(this.e,saved);this.started=true;this.resetTracking();this.show('game');this.notify('Save Point','Checkpoint restored.');
    }
    private resetTracking():void {this.previousHP=this.e.health.state.current;this.previousSlash=this.e.combat.knifeCooldown;this.saveTime=0;this.toastTime=0;}
    private home():void {if(this.e.state==='playing')this.save();this.e.selecting=false;this.e.selection.refresh(false);this.show('home');}
    private show(page:Page):void {
        this.page=page;this.syncMusic();this.freeze(page!=='game');this.e.hud.node.active=page==='game';this.overlay.active=page!=='game';
        if(page==='game')return;
        this.overlay.setSiblingIndex(this.safe.children.length-1);this.art.active=page==='home';this.clear();
        if(page==='home'){
            const left=ui(this.content,'Home menu',420,600);left.setPosition(-260,0);
            const logo=heading(left,'Re:ZONBI',190,68);logo.getComponentInChildren(Label)!.color=new Color().fromHEX('#FF1766');logo.getComponentInChildren(Label)!.isItalic=true;
            artwork(left,'ui/title-logo',460,153,()=>logo.active=false).setPosition(0,190);
            const glitch=ui(left,'Logo neon scratches',390,100);glitch.setPosition(0,190);glitch.setSiblingIndex(0);const ink=glitch.addComponent(Graphics);
            for(let i=0;i<9;i++){ink.fillColor=new Color().fromHEX(i%3===0?'#42D9EA':'#C91457');ink.rect(-205+i*37,(i%2?1:-1)*(45+i%3*5),22+i%3*9,2);ink.fill();}
            heading(left,'WELCOME TO NEW HAVEN',100,15);
            this.button('▶   START',45,()=>this.saved()?this.confirm('Start a new run?\nYour saved checkpoint will be replaced.',()=>this.start(),'home'):this.start(),true,true,left);
            this.button('CONTINUE',-26,()=>this.resumeSaved(),false,!!this.saved(),left);
            this.button('SETTINGS',-97,()=>{this.back='home';this.show('settings');},false,true,left);
            this.button(sys.isNative?'EXIT':'EXIT',-168,()=>this.confirm('Exit Re:ZONBI?',()=>game.end(),'home'),false,sys.isNative,left);
            this.button('STATS',-239,()=>{this.back='home';this.show('stats');},false,true,left);

        }else{
            const frame=ui(this.content,'Modal frame',600,570);panel(frame,600,570);
            if(page==='pause'){
                heading(frame,'PAUSED',220,38);heading(frame,'WELCOME TO NEW HAVEN',165,15);
                this.button('RESUME',85,()=>this.show('game'),true,true,frame);
                this.button('SETTINGS',10,()=>{this.back='pause';this.show('settings');},false,true,frame);
                this.button('TUTORIAL',-65,()=>{this.back='pause';this.tutorialPage=0;this.show('tutorial');},false,true,frame);
                this.button('RETURN TO HOMEPAGE',-160,()=>this.confirm('Save this checkpoint and return home?',()=>this.home(),'pause'),false,true,frame);
            }else if(page==='defeat'){
                artwork(frame,'ui/rin-portrait',145,145).setPosition(0,160);heading(frame,'RIN HAS FALLEN',45,35);
                heading(frame,`Level ${this.e.progression.level}  ?  ${this.e.kills} kills\nSurvived ${this.time()}`,-20,20);
                this.button('RESTART ENCOUNTER',-115,()=>this.start(),true,true,frame);
                this.button('RETURN TO HOMEPAGE',-195,()=>this.home(),false,true,frame);
            }else if(page==='victory'){
                heading(frame,'STAGE CLEAR',190,46);heading(frame,'TYRANT DEFEATED',132,18);
                heading(frame,`TIME  ${this.time()}  ?  KILLS  ${this.e.kills}\n\nREWARD DROP\n${this.pendingClear} EXP`,25,21);
                this.button('NEXT STAGE',-105,()=>{this.pendingClear=0;this.show('game');this.notify('Objective Updated','Keep going!');},true,true,frame);
                this.button('RETURN TO HOMEPAGE',-185,()=>{this.pendingClear=0;this.home();},false,true,frame);
            }else if(page==='settings'){
                heading(frame,'SETTINGS',220,36);
                this.audioSlider(frame,'music',130);
                this.audioSlider(frame,'sfx',60);
                this.button('GRAPHICS  ‹  '+this.quality.toUpperCase()+'  ›',-10,()=>{this.quality=this.quality==='high'?'low':'high';this.applyQuality();try{sys.localStorage.setItem(SETTINGS,JSON.stringify({quality:this.quality}));}catch{}this.show('settings');},false,true,frame);
                this.button('LANGUAGE: ENGLISH',-80,()=>{setLanguage(getLanguage()==='en'?'ms':'en',this.safe);this.show('settings');},false,true,frame);
                heading(frame,'',-140,14);this.button('BACK',-210,()=>this.show(this.back),true,true,frame);
            }else if(page==='tutorial'){
                heading(frame,'FIELD GUIDE',220,34);heading(frame,TUTORIAL[this.tutorialPage][0],140,23);
                heading(frame,TUTORIAL[this.tutorialPage][1],35,20);heading(frame,`${this.tutorialPage+1} / ${TUTORIAL.length}`,-65,16);
                const prev=this.button('PREVIOUS',-125,()=>{this.tutorialPage--;this.show('tutorial');},false,this.tutorialPage>0,frame);prev.setPosition(-130,-125);prev.setScale(.65,1,1);
                const next=this.button('NEXT',-125,()=>{this.tutorialPage++;this.show('tutorial');},true,this.tutorialPage<TUTORIAL.length-1,frame);next.setPosition(130,-125);next.setScale(.65,1,1);
                this.button('BACK',-215,()=>this.show(this.back),false,true,frame);
            }else if(page==='stats'){
                const s=this.saved(),r=this.record();heading(frame,'RUN RECORD',210,35);
                heading(frame,`${getLanguage()==='ms'?'REKOD TERBAIK':'PERSONAL BEST'}\n${r.kills} ${getLanguage()==='ms'?'DITEWASKAN':'KILLS'} / ${Math.floor(r.seconds/60)}m ${Math.floor(r.seconds%60)}s`,115,22);
                heading(frame,s?`SAVED RUN\nLEVEL ${s.level}   /   ${s.kills} KILLS\n${Math.floor(s.elapsed/60)}m ${Math.floor(s.elapsed%60)}s`:'NO SAVED RUN',-35,22);this.button('BACK',-190,()=>this.show(this.back),true,true,frame);
            }else if(page==='dialogue'){
                artwork(frame,'ui/rin-portrait',150,150).setPosition(-155,145);heading(frame,'RIN',145,28);
                heading(frame,this.dialogueLines[this.dialogueIndex]||'',-15,22);
                this.button(this.dialogueIndex+1<this.dialogueLines.length?'NEXT':'CLOSE',-200,()=>{if(++this.dialogueIndex<this.dialogueLines.length)this.show('dialogue');else this.show(this.back);},true,true,frame);
            }
        }
        entrance(this.content);this.layout();
    }
    private confirm(message:string,yes:()=>void,back:Page):void {
        this.show('confirm');const frame=this.content.getChildByName('Modal frame')!;heading(frame,'CONFIRM',150,32);heading(frame,message,30,23);
        this.button('CONFIRM',-80,yes,true,true,frame);this.button('CANCEL',-160,()=>this.show(back),false,true,frame);
    }
    dialogue(lines:string[]):void {if(!lines.length)return;this.back=this.page;this.dialogueLines=lines;this.dialogueIndex=0;this.show('dialogue');}
    stageClear(reward:number):void {this.pendingClear+=reward;}
    notify(title:Notice,detail:string):void {if(title==='Zombie Rush!'){this.notices=this.notices.filter(n=>n.title!==title);this.notices.unshift({title,detail});this.notices.length=Math.min(4,this.notices.length);this.toastTime=0;return;}if(this.notices.length<4&&!this.notices.some(n=>n.title===title))this.notices.push({title,detail});}
    item(kind:'Health Pack'|'Ammo'|'EXP'|'Energy Crystal',amount:number):void {copy(this.popup,`${kind.toUpperCase()}   +${amount}`);this.popupTime=2;this.popup.active=true;}
    interaction(verb:'Open'|'Collect'|'Tap'|'Hold',text:string,available:boolean,callback?:()=>void):void {
        this.prompt.active=available;copy(this.prompt,`${verb.toUpperCase()}  /  ${text}`);this.prompt.off(Node.EventType.TOUCH_END);
        this.prompt.off(Node.EventType.TOUCH_START);this.prompt.off(Node.EventType.TOUCH_CANCEL);this.holding=false;this.holdTime=0;this.holdAction=null;
        if(available&&callback&&verb!=='Hold')this.prompt.on(Node.EventType.TOUCH_END,()=>{if(this.page==='game')callback();});
        if(available&&callback&&verb==='Hold'){
            this.holdAction=callback;this.prompt.on(Node.EventType.TOUCH_START,()=>{this.holding=true;this.holdTime=0;});
            const release=()=>{this.holding=false;this.holdTime=0;copy(this.prompt,'HOLD  /  '+text);};this.prompt.on(Node.EventType.TOUCH_END,release);this.prompt.on(Node.EventType.TOUCH_CANCEL,release);
        }
    }
    private applyQuality():void {const scene=director.getScene();if(scene)scene.globals.shadows.enabled=this.quality==='high';}
    private time():string {return `${Math.floor(this.e.elapsed/60)}:${('0'+Math.floor(this.e.elapsed%60)).slice(-2)}`;}
    private layout():void {
        const {width,height}=this.safe.getComponent(UITransform)!;const scale=Math.min(1,(width-40)/960,(height-30)/620);this.content.setScale(scale,scale,1);
        const cover=Math.max(width/1280,height/720);this.art.setScale(cover,cover,1);
    }
    tick(dt:number):void {
        this.syncMusic();this.audio.tick(dt);
        this.layout();const e=this.e;
        if(this.page==='game'&&e.state==='defeat'){this.updateRecord();this.removeSave();this.show('defeat');return;}
        if(this.page==='game'&&this.pendingClear&&!e.selecting){this.save();this.show('victory');return;}
        if(this.page!=='game'||e.selecting)return;
        if(this.holding&&this.holdAction){this.holdTime+=dt;copy(this.prompt,`HOLD  ${Math.min(100,Math.floor(this.holdTime/2*100))}%`);if(this.holdTime>=2){this.holding=false;const callback=this.holdAction;this.holdAction=null;callback();}}
        this.mapTime-=dt;if(this.mapTime<=0){this.mapTime=.1;this.drawMap();}
        if(e.health.state.current<=e.health.state.maximum*.25&&this.previousHP>e.health.state.maximum*.25)this.notify('Health Low','Dodge and keep your distance.');
        if(this.previousSlash>0&&e.combat.knifeCooldown<=0)this.notify('Skill Ready','Area slash is ready. Tap the knife.');
        this.previousHP=e.health.state.current;this.previousSlash=e.combat.knifeCooldown;
        this.saveTime+=dt;if(this.saveTime>=15){this.saveTime=0;this.save();}
        this.toastTime-=dt;if(this.toastTime<=0){const n=this.notices.shift();this.toast.active=!!n;if(n){copy(this.toastTitle,n.title.toUpperCase());copy(this.toast,n.detail);this.toastTime=3;entrance(this.toast);}}
        this.popupTime-=dt;this.popup.active=this.popupTime>0;
    }
    private syncMusic():void {
        if(this.page==='home'||this.page==='defeat'||this.page==='victory')this.musicPage=this.page;
        else if(this.page==='game')this.musicPage=this.e.bosses.some(b=>b.active&&!b.dead)?'boss':'combat';
        this.audio.musicState(this.musicPage,this.e.selecting||(this.page!=='game'&&this.page!=='home'&&this.page!=='defeat'&&this.page!=='victory'));
    }
    private audioSlider(parent:Node,channel:'music'|'sfx',y:number):void {
        const row=ui(parent,channel+' volume',420,62);row.setPosition(0,y);
        const title=label(row,channel+' percentage','',270,25,16);title.setPosition(-55,20);typography(title.getComponentInChildren(Label)!,'label');
        const track=ui(row,channel+' slider',250,36);track.setPosition(-55,-10);const g=track.addComponent(Graphics);
        const mute=action(row,channel+' mute','',-3,()=>{this.audio.toggleMute(channel);draw();},false,true,110);mute.setPosition(160,-3);
        const draw=()=>{
            const value=this.audio[channel];copy(title,channel.toUpperCase()+'  '+Math.round(value*100)+'%');
            copy(mute,(channel==='music'?this.audio.musicMuted:this.audio.sfxMuted)?'UNMUTE':'MUTE');
            g.clear();g.fillColor=new Color(47,61,85);g.roundRect(-125,-4,250,8,4);g.fill();
            g.fillColor=new Color(247,40,120);if(value>0){g.rect(-125,-4,250*value,8);g.fill();}
            g.fillColor=new Color(255,205,232);g.circle(-125+250*value,0,9);g.fill();
        };
        let finger:number|null=null;
        const move=(event:EventTouch)=>{event.propagationStopped=true;if(finger!==event.getID())return;
            const p=event.getUILocation();const local=track.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
            this.audio.setVolume(channel,(local.x+125)/250);draw();};
        track.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{if(finger!==null)return;finger=event.getID();move(event);});
        track.on(Node.EventType.TOUCH_MOVE,move);
        track.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{if(finger!==event.getID())return;move(event);finger=null;this.audio.unlock();if(channel==='sfx')this.audio.playSfx('ui_click');});
        track.on(Node.EventType.TOUCH_CANCEL,()=>{finger=null;});draw();
    }
    private drawMap():void {
        const g=this.map;g.clear();g.fillColor=new Color(7,12,25,220);g.circle(0,0,59);g.fill();g.strokeColor=new Color(255,35,112);g.lineWidth=2;g.stroke();
        const center=this.e.player.node.position;
        const point=(x:number,z:number)=>({x:((x-center.x)-(z-center.z))*1.05,y:-((x-center.x)+(z-center.z))*.65});
        g.fillColor=new Color(44,56,78);for(const o of this.e.player.obstacles){const p=point(o.x,o.z);if(Math.hypot(p.x,p.y)<48){g.rect(p.x-2,p.y-2,4,4);g.fill();}}
        g.fillColor=new Color(255,40,100);for(const enemy of this.e.targets())if(enemy.active&&!enemy.dead){const p=point(enemy.position.x,enemy.position.z);if(Math.hypot(p.x,p.y)<54){g.circle(p.x,p.y,2.2);g.fill();}}
        const p=point(this.e.player.node.position.x,this.e.player.node.position.z);g.fillColor=new Color(255,238,250);g.moveTo(p.x,p.y+5);g.lineTo(p.x-4,p.y-4);g.lineTo(p.x+4,p.y-4);g.close();g.fill();
    }
}
