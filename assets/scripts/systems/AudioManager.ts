import { assetManager, AudioClip, AudioSource, game, Game, Node, sys } from 'cc';

export const MUSIC = {
    home: 'dark cyberpunk ambient music', combat: 'cyberpunk action combat loop',
    boss: 'intense electronic boss battle', defeat: 'dark game over sound',
    victory: 'electronic victory fanfare',
};
export const SOUNDS = 'gunshot bullet_impact reload melee_slash electric_pulse bloodlust zombie_groan zombie_attack zombie_hit zombie_death rin_hurt dodge rin_death exp_pickup upgrade_selected level_up ui_click ui_confirm ui_back pause boss_spawn boss_attack boss_phase boss_defeat horde_warning low_hp high_noise'.split(' ');
const KEY = 'rezonbi.audio.v1';
const SOUND_FILES: {[key:string]:string} = {gunshot:'bullet', exp_pickup:'pick up', electric_pulse:'faespencer-high-voltage-spark-486895'};
const LIMITS: {[key:string]:number} = {gunshot:.09, bullet_impact:.12, zombie_hit:.18, zombie_death:.3, zombie_attack:.6, zombie_groan:9, exp_pickup:.12, bloodlust:2, low_hp:12, high_noise:18, horde_warning:15, level_jingle:1};
type Channel = 'music'|'sfx';

/** One music voice and six reusable effects voices; no per-shot components. */
export class AudioManager {
    static instance: AudioManager | undefined;
    music = .65; sfx = .85; musicMuted = false; sfxMuted = false;
    private root:Node;
    private bgm:AudioSource;
    private voices:{source:AudioSource; remaining:number}[]=[];
    private clips = new Map<string,AudioClip>();
    private cooldowns = new Map<string,number>();
    private desired = ''; private current = ''; private gain = 0; private duck = 1;
    private suspended = false; private disposed = false; private ended = false;
    private time = 0;
    constructor(parent:Node) {
        AudioManager.instance?.dispose();AudioManager.instance=this;
        try {
            const p=JSON.parse(sys.localStorage.getItem(KEY)||'{}');
            if(Number.isFinite(p.music))this.music=this.clamp(p.music);
            if(Number.isFinite(p.sfx))this.sfx=this.clamp(p.sfx);
            this.musicMuted=p.musicMuted===true;this.sfxMuted=p.sfxMuted===true;
        }catch{/* Storage can be unavailable in private browsing. */}
        this.root=new Node('Audio channels');parent.addChild(this.root);
        this.bgm=this.source('Music');
        this.bgm.node.on(AudioSource.EventType.ENDED,()=>{this.ended=true;});
        for(let i=0;i<6;i++)this.voices.push({source:this.source('SFX '+i),remaining:0});
        game.on(Game.EVENT_HIDE,this.pause,this);game.on(Game.EVENT_SHOW,this.resume,this);
        parent.once(Node.EventType.NODE_DESTROYED,this.dispose,this);
        assetManager.loadBundle('audio',(error,bundle)=>{
            if(this.disposed)return;
            if(error||!bundle){console.warn('Audio bundle unavailable',error);return;}
            const paths=Object.keys(MUSIC).map(k=>'bgm/'+MUSIC[k as keyof typeof MUSIC])
                .concat(['bgm/futuristic level up jingle'],SOUNDS.map(s=>'sfx/'+(SOUND_FILES[s]||s)));
            let index=0;
            // Serial loading keeps mobile decode/memory spikes bounded.
            const next=()=>{if(this.disposed||index===paths.length)return;
                const path=paths[index++];bundle.load(path,AudioClip,(err,clip)=>{
                    if(this.disposed)return;
                    if(!err&&clip){clip.addRef();this.clips.set(path,clip);}else console.warn('Missing audio: '+path);
                    next();
                });};next();
        });
    }
    private source(name:string):AudioSource {const n=new Node(name);this.root.addChild(n);const s=n.addComponent(AudioSource);s.playOnAwake=false;return s;}
    private clamp(v:number):number{return Math.max(0,Math.min(1,v));}
    setVolume(channel:Channel,value:number):void {if(!Number.isFinite(value))return;this[channel]=this.clamp(value);this.persist();this.volumes();}
    toggleMute(channel:Channel):void {if(channel==='music')this.musicMuted=!this.musicMuted;else this.sfxMuted=!this.sfxMuted;this.persist();this.volumes();}
    private persist():void {try{sys.localStorage.setItem(KEY,JSON.stringify({music:this.music,sfx:this.sfx,musicMuted:this.musicMuted,sfxMuted:this.sfxMuted}));}catch{/* Keep session preferences. */}}
    private volumes():void {this.bgm.volume=this.musicMuted?0:this.music*this.gain*this.duck;for(const v of this.voices)v.source.volume=this.sfxMuted?0:this.sfx;}
    musicState(state:keyof typeof MUSIC,duck=false):void {this.desired='bgm/'+MUSIC[state];this.duck=duck ? .25 : 1;}
    stop():void {this.desired=this.current='';this.gain=0;this.bgm.stop();for(const v of this.voices){v.source.stop();v.remaining=0;}}
    pause():void {if(this.suspended)return;this.suspended=true;this.bgm.pause();for(const v of this.voices){v.source.stop();v.remaining=0;}}
    resume():void {if(!this.suspended||this.disposed)return;this.suspended=false;if(this.current&&!this.ended&&!this.bgm.playing)this.bgm.play();}
    /** Called in an actual touch-end callback. Cocos also defers blocked playback until a gesture. */
    unlock():void {if(!this.suspended&&!this.bgm.playing&&this.current&&this.bgm.loop)this.bgm.play();}
    playSfx(name:string):void {
        if(this.disposed||this.suspended||this.sfxMuted||this.sfx===0)return;
        if((this.cooldowns.get(name)||0)>this.time)return;
        const clip=name==='level_jingle'?(this.clips.get('bgm/futuristic level up jingle')||this.clips.get('sfx/level_up')):this.clips.get('sfx/'+(SOUND_FILES[name]||name));
        if(!clip)return; // Never queue stale combat sounds while assets load.
        const important=/^(boss_|rin_death|level_jingle|upgrade_selected|ui_|pause)/.test(name);
        // Reserve one voice for progression, boss cues and UI feedback.
        let voice:typeof this.voices[number]|undefined;
        for(let i=0;i<(important?6:5);i++){if(this.voices[i].remaining<=0){voice=this.voices[i];break;}}
        if(!voice&&important)voice=this.voices[5];
        if(!voice)return;
        this.cooldowns.set(name,this.time+(LIMITS[name]||.15));
        voice.source.stop();voice.source.clip=clip;voice.source.loop=false;voice.source.volume=this.sfx;
        voice.remaining=Math.max(.1,clip.getDuration())+.05;voice.source.play();
    }
    tick(dt:number):void {
        if(this.disposed||this.suspended)return;this.time+=dt;
        for(const v of this.voices){if(v.remaining>0){v.remaining-=dt;if(v.remaining<=0)v.source.stop();}}
        if(this.current!==this.desired){
            this.gain=Math.max(0,this.gain-dt*3);
            if(this.gain===0){if(this.current)this.bgm.stop();this.current='';
                const clip=this.clips.get(this.desired);
                if(clip){this.current=this.desired;this.ended=false;this.bgm.clip=clip;this.bgm.loop=this.current!=='bgm/'+MUSIC.defeat&&this.current!=='bgm/'+MUSIC.victory;this.bgm.volume=0;this.bgm.play();}
            }
        }else this.gain=Math.min(1,this.gain+dt*2);
        this.volumes();
    }
    dispose():void {
        if(this.disposed)return;this.disposed=true;this.stop();
        game.off(Game.EVENT_HIDE,this.pause,this);game.off(Game.EVENT_SHOW,this.resume,this);
        this.root.destroy();for(const clip of this.clips.values())clip.decRef();this.clips.clear();
        if(AudioManager.instance===this)AudioManager.instance=undefined;
    }
}
