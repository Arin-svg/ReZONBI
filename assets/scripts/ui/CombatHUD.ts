import { Color, EventTouch, Graphics, Label, Node, UITransform, Widget } from 'cc';
import type { CombatEncounter } from '../core/CombatEncounter';
import { label, panel, pin, ui } from './ExplorationHUD';
import { icon, disc, Accent } from './VisualTheme';
import { artwork, stretch } from './CyberWidgets';
import { Skills } from '../systems/Progression';
import { requiredXP } from '../systems/Progression';

/** Extends the existing safe-area Canvas and joystick; no parallel input system. */
export class CombatHUD {
    readonly node: Node;
    private readonly owners = new Map<Node, number>();
    private healthText: Label;
    private healthFill: Graphics;
    private count: Label;
    private pistol: Label;
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
    private bossText: Label;
    private bossFill: Graphics;
    private lastBoss = -1;
    constructor(scene: Node, private readonly encounter: CombatEncounter) {
        const safe = scene.getChildByName('Mobile Canvas')!.getChildByName('Safe area')!;
        safe.getChildByName('Area heading')!.active = false; safe.getChildByName('Movement hint')!.active = false;
        const hp = label(safe, 'Player health', '', 300, 72, 18); panel(hp, 300, 72); pin(hp, 'left', 'top', 24, 20);
        this.healthText = hp.getComponentInChildren(Label)!; this.healthText.node.setPosition(35, 14, 0);
        artwork(hp, 'ui/rin-portrait', 62, 62).setPosition(-110, 0, 0);
        const bar = ui(hp, 'Health bar', 200, 10); bar.setPosition(35, -10, 0); this.healthFill = bar.addComponent(Graphics);
        const count = label(safe, 'Enemy count', '', 200, 54, 18);
        const countWidget = count.addComponent(Widget); countWidget.isAlignHorizontalCenter = true; countWidget.isAlignTop = true; countWidget.top = 24; countWidget.alignMode = Widget.AlignMode.ALWAYS;
        this.count = count.getComponentInChildren(Label)!;
        const xp = label(safe, 'Experience', '', 300, 30, 13);
        const xw = xp.addComponent(Widget); xw.isAlignLeft = xw.isAlignTop = true; xw.left = 24; xw.top = 92; xw.alignMode = Widget.AlignMode.ALWAYS;
        this.xpText = xp.getComponentInChildren(Label)!; this.xpText.node.setPosition(0, 9, 0);
        const fill = ui(xp, 'EXP fill', 260, 8); fill.setPosition(0, -6, 0); this.xpFill = fill.addComponent(Graphics);
        const boss = label(safe, 'Boss health', 'SIGNAL TYRANT', 380, 42, 18);
        const bw = boss.addComponent(Widget); bw.isAlignHorizontalCenter = bw.isAlignTop = true; bw.top = 128; bw.alignMode = Widget.AlignMode.ALWAYS;
        this.bossText = boss.getComponentInChildren(Label)!; boss.active = false;
        this.bossText.node.setPosition(0, 9, 0);
        this.bossText.node.getComponent(UITransform)!.setContentSize(380, 26);
        const bf = ui(boss, 'Boss fill', 340, 10); bf.setPosition(0, -12, 0); this.bossFill = bf.addComponent(Graphics);
        const pistol = label(safe, 'Pistol button', '', 116, 116, 13); disc(pistol, 56); icon(pistol, 'bullet', 52).setPosition(0, 8, 0); pin(pistol, 'right', 'bottom', 28, 140);
        const knife = label(safe, 'Knife button', '', 100, 100, 13); disc(knife, 46, '#B5A0FF'); icon(knife, 'knife', 42).setPosition(0, 7, 0); pin(knife, 'right', 'bottom', 164, 28);
        const dodge = label(safe, 'Dodge button', '', 100, 100, 13); disc(dodge, 46, '#79BFFF'); icon(dodge, 'shadow', 42).setPosition(0, 7, 0); pin(dodge, 'right', 'bottom', 28, 28);
        this.pistol = pistol.getComponentInChildren(Label)!; this.knife = knife.getComponentInChildren(Label)!; this.dodge = dodge.getComponentInChildren(Label)!;
        for (const l of [this.pistol, this.knife, this.dodge]) l.node.setPosition(0, -29, 0); this.pistol.string = 'HOLD';
        this.bind(pistol, () => encounter.combat.setFire('touch-pistol', true), () => encounter.combat.setFire('touch-pistol', false));
        this.bind(knife, () => encounter.combat.knife()); this.bind(dodge, () => encounter.combat.dodge());
        const pause = safe.getChildByName('Pause button')!; pause.off(Node.EventType.TOUCH_END);
        pause.getChildByName('Panel')!.active = false; pause.getComponent(UITransform)!.setContentSize(58, 58); disc(pause, 27, '#A5BAD1'); this.pauseIcon = icon(pause, 'pause', 30);
        this.pause = pause.getComponentInChildren(Label)!; this.bind(pause, () => encounter.togglePause());
        this.pausedHint = safe.getChildByName('Paused hint')!;
        this.result = ui(safe, 'Encounter result', 480, 240); panel(this.result, 480, 240);
        const title = label(this.result, 'Result title', '', 450, 100, 34); title.setPosition(0, 48, 0); this.resultTitle = title.getComponentInChildren(Label)!;
        const replay = label(this.result, 'Replay button', 'RESTART ENCOUNTER', 340, 68, 24); panel(replay, 340, 68); replay.setPosition(0, -60, 0);
        this.bind(replay, () => encounter.restart()); this.result.active = false;
        this.guide = label(safe, 'Combat controls guide', 'MOVE  WASD / arrows\nFIRE  J / mouse    SLASH  K (15s)\nDODGE  Space    PAUSE  Esc', 360, 86, 17);
        panel(this.guide, 360, 86); const guideWidget = this.guide.addComponent(Widget);
        guideWidget.isAlignHorizontalCenter = true; guideWidget.isAlignBottom = true; guideWidget.bottom = 52; guideWidget.alignMode = Widget.AlignMode.ALWAYS;
        for (let i = 0; i < Skills.length; i++) {
            const slot = label(safe, 'Active skill ' + Skills[i].id, '', 34, 34, 11); pin(slot, 'left', 'top', 27 + i * 43, 128);
            disc(slot, 16, Accent[Skills[i].id]); icon(slot, Skills[i].id, 21).setPosition(0, 2, 0);
            const rank = slot.getComponentInChildren(Label)!; rank.node.setPosition(12, -11, 0); this.skillRanks.push(rank);
        }
        this.node = ui(safe, 'HUD layer', 1280, 720);stretch(this.node);
        for (const child of [...safe.children]) if (child !== this.node) { child.removeFromParent(); this.node.addChild(child); }
        const blocked = [hp, count, pistol, knife, dodge, pause, replay, this.result, this.guide, this.node.getChildByName('Movement joystick')!];
        blocked.push(xp, boss);
        encounter.combat.blocksMouse = p => encounter.paused || encounter.state !== 'playing' || encounter.selecting || blocked.some(n => n.activeInHierarchy && n.getComponent(UITransform)!.hitTest(p));
        this.refresh();
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
    clearTouches(): void { this.owners.clear(); this.encounter.combat.setFire('touch-pistol', false); }
    refresh(dt = 0): void {
        const e = this.encounter, hp = e.health.state;
        const text = (label: Label, value: string) => { if (label.string !== value) label.string = value; };
        const progress = e.progression; const buildKey = Skills.map(s => progress.rank(s.id)).join();
        if (this.skillKey !== buildKey) { this.skillKey = buildKey; this.skillRanks.forEach((l, i) => { const n = progress.rank(Skills[i].id); l.string = String(n); l.node.parent!.active = n > 0; }); }
        const key = `${progress.level}:${progress.xp}`;
        const boss = e.bosses.find(boss => boss.active && !boss.dead) ?? e.boss;
        this.bossText.node.parent!.active = e.bossSpawned && boss.active && !boss.dead;
        const bossFraction = Math.max(0, Math.min(1, boss.health.current / boss.health.maximum));
        if (e.bossSpawned && this.lastBoss !== bossFraction) {
            this.lastBoss = bossFraction;
            const g = this.bossFill; g.clear();
            const strip = (width:number, color:Color) => {
                if (width <= 0) return;
                const tip = Math.min(5,width/2);
                g.fillColor=color;g.moveTo(-170,0);g.lineTo(-170+tip,5);
                g.lineTo(-170+width-tip,5);g.lineTo(-170+width,0);
                g.lineTo(-170+width-tip,-5);g.lineTo(-170+tip,-5);g.close();g.fill();
            };
            strip(340,new Color(27,25,39,210));
            strip(340*bossFraction,new Color(250,78,99));
        }
        if (key !== this.xpKey) {
            this.xpKey = key; text(this.xpText, `LEVEL ${progress.level}    EXP ${progress.xp} / ${requiredXP(progress.level)}`);
            this.xpFill.clear(); this.xpFill.fillColor = new Color(41, 36, 61); this.xpFill.rect(-130, -4, 260, 8); this.xpFill.fill();
            this.xpFill.fillColor = new Color(85, 217, 239); this.xpFill.rect(-130, -4, 260 * progress.xp / requiredXP(progress.level), 8); this.xpFill.fill();
        }
        if (hp.current !== this.lastHP || this.healthText.string.indexOf(`LV ${progress.level} `) < 0) {
            this.lastHP = hp.current; text(this.healthText, `RIN  /  LV ${progress.level}   ${Math.ceil(hp.current)}`);
            this.healthFill.clear(); this.healthFill.fillColor = new Color(41, 36, 61); this.healthFill.rect(-100, -5, 200, 10); this.healthFill.fill();
            this.healthFill.fillColor = new Color(213, 106, 145); this.healthFill.rect(-100, -5, 200 * hp.current / hp.maximum, 10); this.healthFill.fill();
        }
        text(this.count, `HORDE  ${Math.floor(e.elapsed / 60)}:${('0' + Math.floor(e.elapsed % 60)).slice(-2)}\nINFECTED  ${e.spawner.alive}`);
        text(this.knife, e.combat.knifeCooldown > 1e-6 ? `${Math.ceil(e.combat.knifeCooldown)}s` : 'SLASH / K');
        this.knife.color = e.combat.knifeCooldown > 1e-6 ? new Color(130,125,148) : new Color(255,171,214);
        text(this.dodge, e.combat.dodgeCooldown > 0 ? `${e.combat.dodgeCooldown.toFixed(1)}s` : 'SPACE');
        this.pistol.color = e.combat.firing ? new Color(213, 106, 145) : new Color(232, 226, 226);
        text(this.pause, ''); if (e.paused !== this.lastPaused) { this.lastPaused = e.paused; this.pauseIcon.destroy(); this.pauseIcon = icon(this.pause.node.parent!, e.paused ? 'play' : 'pause', 30); } this.pausedHint.active = false;
        this.result.active = false; text(this.resultTitle, `RIN HAS FALLEN\nLevel ${e.progression.level} / ${e.kills} kills`);
        if (!e.paused && !e.selecting && e.state === 'playing') this.guideTime -= dt;
        this.guide.active = false && this.guideTime > 0 && e.state === 'playing' && !e.paused && !e.selecting;
    }
}
