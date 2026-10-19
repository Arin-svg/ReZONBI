import { Color, EventTouch, Graphics, Label, Node, UITransform, Widget } from 'cc';
import type { CombatEncounter } from '../core/CombatEncounter';
import { label, panel, pin, ui } from './ExplorationHUD';
import { icon, disc, Accent } from './VisualTheme';
import { Skills } from '../systems/Progression';
import { requiredXP } from '../systems/Progression';

/** Extends the existing safe-area Canvas and joystick; no parallel input system. */
export class CombatHUD {
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
    private noiseText: Label;
    private bossText: Label;
    private bossFill: Graphics;
    private noiseFill: Graphics;
    private lastBoss = -1;
    private lastNoise = -1;
    constructor(scene: Node, private readonly encounter: CombatEncounter) {
        const safe = scene.getChildByName('Mobile Canvas')!.getChildByName('Safe area')!;
        safe.getChildByName('Area heading')!.active = false; safe.getChildByName('Movement hint')!.active = false;
        const hp = label(safe, 'Player health', '', 300, 72, 18); panel(hp, 300, 72); pin(hp, 'left', 'top', 24, 20);
        this.healthText = hp.getComponentInChildren(Label)!; this.healthText.node.setPosition(35, 14, 0);
        icon(hp, 'portrait', 62).setPosition(-110, 0, 0);
        const bar = ui(hp, 'Health bar', 200, 10); bar.setPosition(35, -10, 0); this.healthFill = bar.addComponent(Graphics);
        const count = label(safe, 'Enemy count', '', 200, 54, 18);
        const countWidget = count.addComponent(Widget); countWidget.isAlignHorizontalCenter = true; countWidget.isAlignTop = true; countWidget.top = 24; countWidget.alignMode = Widget.AlignMode.ALWAYS;
        this.count = count.getComponentInChildren(Label)!;
        const xp = label(safe, 'Experience', '', 360, 30, 13);
        const xw = xp.addComponent(Widget); xw.isAlignHorizontalCenter = xw.isAlignBottom = true; xw.bottom = 12; xw.alignMode = Widget.AlignMode.ALWAYS;
        this.xpText = xp.getComponentInChildren(Label)!; this.xpText.node.setPosition(0, 9, 0);
        const fill = ui(xp, 'EXP fill', 320, 8); fill.setPosition(0, -6, 0); this.xpFill = fill.addComponent(Graphics);
        const noise = label(safe, 'Noise pressure', '', 200, 34, 12); const nw = noise.addComponent(Widget); nw.isAlignHorizontalCenter = nw.isAlignTop = true; nw.top = 76; nw.alignMode = Widget.AlignMode.ALWAYS; this.noiseText = noise.getComponentInChildren(Label)!;
        this.noiseText.node.setPosition(0, 6, 0); const nf = ui(noise, 'Noise fill', 160, 5); nf.setPosition(0, -9, 0); this.noiseFill = nf.addComponent(Graphics);
        const boss = label(safe, 'Boss health', '', 430, 56, 19); panel(boss, 430, 56);
        const bw = boss.addComponent(Widget); bw.isAlignHorizontalCenter = bw.isAlignTop = true; bw.top = 112; bw.alignMode = Widget.AlignMode.ALWAYS;
        this.bossText = boss.getComponentInChildren(Label)!; boss.active = false;
        this.bossText.node.setPosition(0, 5, 0); const bf = ui(boss, 'Boss fill', 390, 5); bf.setPosition(0, -22, 0); this.bossFill = bf.addComponent(Graphics);
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
        this.guide = label(safe, 'Combat controls guide', 'MOVE  WASD / arrows\nFIRE  J / mouse    KNIFE  K\nDODGE  Space    PAUSE  Esc', 360, 86, 17);
        panel(this.guide, 360, 86); const guideWidget = this.guide.addComponent(Widget);
        guideWidget.isAlignHorizontalCenter = true; guideWidget.isAlignBottom = true; guideWidget.bottom = 52; guideWidget.alignMode = Widget.AlignMode.ALWAYS;
        for (let i = 0; i < Skills.length; i++) {
            const slot = label(safe, 'Active skill ' + Skills[i].id, '', 34, 34, 11); pin(slot, 'left', 'top', 27 + i * 43, 102);
            disc(slot, 16, Accent[Skills[i].id]); icon(slot, Skills[i].id, 21).setPosition(0, 2, 0);
            const rank = slot.getComponentInChildren(Label)!; rank.node.setPosition(12, -11, 0); this.skillRanks.push(rank);
        }
        const blocked = [hp, count, pistol, knife, dodge, pause, replay, this.result, this.guide, safe.getChildByName('Movement joystick')!];
        blocked.push(xp, noise, boss);
        encounter.combat.blocksMouse = p => encounter.selecting || blocked.some(n => n.activeInHierarchy && n.getComponent(UITransform)!.hitTest(p));
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
        text(this.noiseText, `NOISE  ${Math.round(e.noise.pressure)}${e.noise.pressure >= 60 ? '  /  HIGH ALERT' : ''}`);
        if (Math.round(e.noise.pressure) !== this.lastNoise) {
            this.lastNoise = Math.round(e.noise.pressure); this.noiseFill.clear(); this.noiseFill.fillColor = new Color(230, 75, 127);
            this.noiseFill.rect(-80, -2, 160 * e.noise.pressure / 100, 4); this.noiseFill.fill();
        }
        this.bossText.node.parent!.active = e.bossSpawned;
        if (e.bossSpawned) text(this.bossText, `SIGNAL TYRANT  /  PHASE ${e.boss.phase}\n${Math.ceil(e.boss.health.current)} / ${e.boss.health.maximum} HP${e.boss.stage === 'recovery' ? '  EXPOSED!' : ''}`);
        if (e.bossSpawned && this.lastBoss !== e.boss.health.current) {
            this.lastBoss = e.boss.health.current; this.bossFill.clear(); this.bossFill.fillColor = new Color(255, 66, 126);
            this.bossFill.rect(-195, -2, 390 * e.boss.health.current / e.boss.health.maximum, 4); this.bossFill.fill();
        }
        if (key !== this.xpKey) {
            this.xpKey = key; text(this.xpText, `LEVEL ${progress.level}    EXP ${progress.xp} / ${requiredXP(progress.level)}`);
            this.xpFill.clear(); this.xpFill.fillColor = new Color(41, 36, 61); this.xpFill.rect(-160, -4, 320, 8); this.xpFill.fill();
            this.xpFill.fillColor = new Color(85, 217, 239); this.xpFill.rect(-160, -4, 320 * progress.xp / requiredXP(progress.level), 8); this.xpFill.fill();
        }
        if (hp.current !== this.lastHP || this.healthText.string.indexOf(`LV ${progress.level} `) < 0) {
            this.lastHP = hp.current; text(this.healthText, `RIN  /  LV ${progress.level}   ${Math.ceil(hp.current)}`);
            this.healthFill.clear(); this.healthFill.fillColor = new Color(41, 36, 61); this.healthFill.rect(-100, -5, 200, 10); this.healthFill.fill();
            this.healthFill.fillColor = new Color(213, 106, 145); this.healthFill.rect(-100, -5, 200 * hp.current / hp.maximum, 10); this.healthFill.fill();
        }
        text(this.count, `HORDE  ${Math.floor(e.elapsed / 60)}:${('0' + Math.floor(e.elapsed % 60)).slice(-2)}\nINFECTED  ${e.spawner.alive}`);
        text(this.knife, e.combat.knifeCooldown > 0 ? `${e.combat.knifeCooldown.toFixed(1)}s` : 'K');
        text(this.dodge, e.combat.dodgeCooldown > 0 ? `${e.combat.dodgeCooldown.toFixed(1)}s` : 'SPACE');
        this.pistol.color = e.combat.firing ? new Color(213, 106, 145) : new Color(232, 226, 226);
        text(this.pause, ''); if (e.paused !== this.lastPaused) { this.lastPaused = e.paused; this.pauseIcon.destroy(); this.pauseIcon = icon(this.pause.node.parent!, e.paused ? 'play' : 'pause', 30); } this.pausedHint.active = e.paused;
        this.result.active = e.state !== 'playing'; text(this.resultTitle, e.state === 'victory' ? `STAGE CLEARED\n${e.kills} infected defeated` : `RIN HAS FALLEN\nLevel ${e.progression.level} / ${e.kills} kills`);
        if (!e.paused && !e.selecting && e.state === 'playing') this.guideTime -= dt;
        this.guide.active = this.guideTime > 0 && e.state === 'playing' && !e.paused && !e.selecting;
    }
}
