import { SpriteConfig } from '../core/GameConfig';
import { Camera, Vec3, Color, EventTouch, Graphics, Label, Node, UITransform, Widget } from 'cc';
import type { CombatEncounter } from '../core/CombatEncounter';
import { label, panel, pin, typography, ui } from './ExplorationHUD';
import { icon, disc, Accent } from './VisualTheme';
import { artwork, stretch } from './CyberWidgets';
import { Skills } from '../systems/Progression';
import { requiredXP } from '../systems/Progression';
import { localizedText } from './Localization';

/** Extends the existing safe-area Canvas and joystick; no parallel input system. */
export class CombatHUD {
    readonly node: Node;
    private readonly owners = new Map<Node, number>();
    private healthText: Label;
    private healthFill: Graphics;
    private count: Label;
    private knife: Label;
    private dodge: Label;
    private pause: Label;
    private pausedHint: Node;
    private result: Node;
    private resultTitle: Label;
    private guide: Node;
    private guideTime = 14;
    private lastHP = -1;
    private skillRanks: Label[] = [];
    private skillKey = '';
    private pauseIcon: Node;
    private lastPaused = false;
    private xpText: Label;
    private xpFill: Graphics;
    private xpKey = '';
    private bossBars: {node:Node; fill:Graphics; fraction:number}[] = [];
    private bossWorld = new Vec3();
    private bossProjected = new Vec3();
    constructor(scene: Node, private readonly encounter: CombatEncounter, private readonly camera:Camera) {
        const safe = scene.getChildByName('Mobile Canvas')!.getChildByName('Safe area')!;
        safe.getChildByName('Area heading')!.active = false; safe.getChildByName('Movement hint')!.active = false;
        const hp = label(safe, 'Player health', '', 300, 72, 18); panel(hp, 300, 72); pin(hp, 'left', 'top', 24, 20);
        this.healthText = hp.getComponentInChildren(Label)!; this.healthText.node.setPosition(35, 14, 0);this.healthText.fontSize=16;this.healthText.node.getComponent(UITransform)!.setContentSize(210,26);typography(this.healthText,'label');
        artwork(hp, 'ui/rin-portrait', 62, 62).setPosition(-110, 0, 0);
        const bar = ui(hp, 'Health bar', 200, 10); bar.setPosition(35, -10, 0); this.healthFill = bar.addComponent(Graphics);
        const count = label(safe, 'Enemy count', '', 200, 54, 13);
        const countWidget = count.addComponent(Widget); countWidget.isAlignHorizontalCenter = true; countWidget.isAlignTop = true; countWidget.top = 24; countWidget.alignMode = Widget.AlignMode.ALWAYS;
        this.count = count.getComponentInChildren(Label)!;typography(this.count,'label');
        const xp = label(safe, 'Experience', '', 300, 30, 13);
        const xw = xp.addComponent(Widget); xw.isAlignLeft = xw.isAlignTop = true; xw.left = 24; xw.top = 92; xw.alignMode = Widget.AlignMode.ALWAYS;
        this.xpText = xp.getComponentInChildren(Label)!; this.xpText.node.setPosition(0, 9, 0);typography(this.xpText,'label');
        const fill = ui(xp, 'EXP fill', 260, 8); fill.setPosition(0, -6, 0); this.xpFill = fill.addComponent(Graphics);
        const knife = label(safe, 'Knife button', '', 100, 100, 13); disc(knife, 46, '#B5A0FF'); icon(knife, 'knife', 42).setPosition(0, 7, 0); pin(knife, 'right', 'bottom', 164, 28);
        const dodge = label(safe, 'Dodge button', '', 100, 100, 13); disc(dodge, 46, '#79BFFF'); icon(dodge, 'shadow', 42).setPosition(0, 7, 0); pin(dodge, 'right', 'bottom', 28, 28);
        this.knife = knife.getComponentInChildren(Label)!; this.dodge = dodge.getComponentInChildren(Label)!;
        for (const l of [this.knife, this.dodge]) { l.node.setPosition(0, -29, 0);typography(l,'label'); }
        this.bind(knife, () => encounter.combat.knife()); this.bind(dodge, () => encounter.combat.dodge());
        const pause = safe.getChildByName('Pause button')!; pause.off(Node.EventType.TOUCH_END);
        pause.getChildByName('Panel')!.active = false; pause.getComponent(UITransform)!.setContentSize(58, 58); disc(pause, 27, '#A5BAD1'); this.pauseIcon = icon(pause, 'pause', 30);
        this.pause = pause.getComponentInChildren(Label)!; this.bind(pause, () => encounter.togglePause());
        this.pausedHint = safe.getChildByName('Paused hint')!;
        this.result = ui(safe, 'Encounter result', 480, 240); panel(this.result, 480, 240);
        const title = label(this.result, 'Result title', '', 450, 100, 34); title.setPosition(0, 48, 0); this.resultTitle = title.getComponentInChildren(Label)!;
        const replay = label(this.result, 'Replay button', 'RESTART ENCOUNTER', 340, 68, 24); panel(replay, 340, 68); replay.setPosition(0, -60, 0);
        this.bind(replay, () => encounter.restart()); this.result.active = false;
        this.guide = label(safe, 'Combat controls guide', 'MOVE  Joystick\nAUTO FIRE  Nearby enemies\nTAP  Sword / Dodge', 360, 86, 17);
        panel(this.guide, 360, 86); const guideWidget = this.guide.addComponent(Widget);
        guideWidget.isAlignHorizontalCenter = true; guideWidget.isAlignBottom = true; guideWidget.bottom = 52; guideWidget.alignMode = Widget.AlignMode.ALWAYS;
        for (let i = 0; i < Skills.length; i++) {
            const slot = label(safe, 'Active skill ' + Skills[i].id, '', 34, 34, 11); pin(slot, 'left', 'top', 27 + i * 43, 128);
            disc(slot, 16, Accent[Skills[i].id]); icon(slot, Skills[i].id, 21).setPosition(0, 2, 0);
            const rank = slot.getComponentInChildren(Label)!; rank.node.setPosition(12, -11, 0); this.skillRanks.push(rank);
        }
        this.node = ui(safe, 'HUD layer', 1280, 720);stretch(this.node);
        for (const child of [...safe.children]) if (child !== this.node) { child.removeFromParent(); this.node.addChild(child); }
        this.refresh();
    }
    private refreshBossBars():void {
        const bounds=this.node.getComponent(UITransform)!;
        for(let i=0;i<this.encounter.bosses.length;i++){
            const boss=this.encounter.bosses[i];
            let bar=this.bossBars[i];
            if(!bar){const node=ui(this.node,'Tyrant overhead health',72,8);node.setSiblingIndex(0);bar={node,fill:node.addComponent(Graphics),fraction:-1};this.bossBars.push(bar);}
            bar.node.active=boss.active&&!boss.dead;
            if(!bar.node.active)continue;
            this.bossWorld.set(0,SpriteConfig.bossHeight+.22,0);
            Vec3.transformQuat(this.bossWorld,this.bossWorld,this.camera.node.worldRotation);
            Vec3.add(this.bossWorld,this.bossWorld,boss.node.worldPosition);
            this.camera.convertToUINode(this.bossWorld,this.node,this.bossProjected);
            bar.node.active=Math.abs(this.bossProjected.x)<bounds.width/2-36&&Math.abs(this.bossProjected.y)<bounds.height/2-4;
            if(!bar.node.active)continue;
            bar.node.setPosition(this.bossProjected);
            const fraction=Math.max(0,Math.min(1,boss.health.current/boss.health.maximum));
            if(bar.fraction===fraction)continue;
            bar.fraction=fraction;const g=bar.fill;g.clear();
            g.fillColor=new Color(27,25,39,230);g.rect(-36,-4,72,8);g.fill();
            if(fraction>0){g.fillColor=new Color(250,78,99);g.rect(-35,-3,70*fraction,6);g.fill();}
        }
    }
    private bind(node: Node, start: () => void, end: () => void = () => {}): void {
        node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.owners.has(node)) return;
            this.owners.set(node, event.getID()); start();
        });
        const release = (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.owners.get(node) !== event.getID()) return;
            this.owners.delete(node); end();
        };
        node.on(Node.EventType.TOUCH_END, release); node.on(Node.EventType.TOUCH_CANCEL, release);
        node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => { event.propagationStopped = true; });
    }
    clearTouches(): void { this.owners.clear(); }
    refresh(dt = 0): void {
        const e = this.encounter, hp = e.health.state;
        const text = localizedText;
        const progress = e.progression; const buildKey = Skills.map(s => progress.rank(s.id)).join();
        if (this.skillKey !== buildKey) { this.skillKey = buildKey; this.skillRanks.forEach((l, i) => { const n = progress.rank(Skills[i].id); localizedText(l, String(n)); l.node.parent!.active = n > 0; }); }
        const key = `${progress.level}:${progress.xp}`;
        this.refreshBossBars();
        if (key !== this.xpKey) {
            this.xpKey = key; text(this.xpText, `LV ${progress.level}  ?  EXP ${progress.xp} / ${requiredXP(progress.level)}`);
            this.xpFill.clear(); this.xpFill.fillColor = new Color(41, 36, 61); this.xpFill.rect(-130, -4, 260, 8); this.xpFill.fill();
            this.xpFill.fillColor = new Color(85, 217, 239); this.xpFill.rect(-130, -4, 260 * progress.xp / requiredXP(progress.level), 8); this.xpFill.fill();
        }
        if (hp.current !== this.lastHP || this.healthText.string.indexOf(`LV ${progress.level} `) < 0) {
            this.lastHP = hp.current; text(this.healthText, `RIN ? LV ${progress.level}  ${Math.ceil(hp.current)} HP`);
            this.healthFill.clear(); this.healthFill.fillColor = new Color(41, 36, 61); this.healthFill.rect(-100, -5, 200, 10); this.healthFill.fill();
            this.healthFill.fillColor = new Color(213, 106, 145); this.healthFill.rect(-100, -5, 200 * hp.current / hp.maximum, 10); this.healthFill.fill();
        }
        const bossAlive=e.bosses.some(b=>b.active&&!b.dead);
        text(this.count, `WAVE ${e.spawner.wave} · ${Math.floor(e.elapsed / 60)}:${('0' + Math.floor(e.elapsed % 60)).slice(-2)}\nINFECTED ${e.spawner.alive}${bossAlive?' · BOSS':''}`);
        text(this.knife, e.combat.knifeCooldown > 1e-6 ? `${Math.ceil(e.combat.knifeCooldown)}s` : 'SLASH');
        this.knife.color = e.combat.knifeCooldown > 1e-6 ? new Color(130,125,148) : new Color(255,171,214);
        text(this.dodge, e.combat.dodgeCooldown > 0 ? `${e.combat.dodgeCooldown.toFixed(1)}s` : 'DODGE');
        text(this.pause, ''); if (e.paused !== this.lastPaused) { this.lastPaused = e.paused; this.pauseIcon.destroy(); this.pauseIcon = icon(this.pause.node.parent!, e.paused ? 'play' : 'pause', 30); } this.pausedHint.active = false;
        this.result.active = false; text(this.resultTitle, `RIN HAS FALLEN\nLevel ${e.progression.level} / ${e.kills} kills`);
        if (!e.paused && !e.selecting && e.state === 'playing') this.guideTime -= dt;
        this.guide.active = false && this.guideTime > 0 && e.state === 'playing' && !e.paused && !e.selecting;
    }
}
