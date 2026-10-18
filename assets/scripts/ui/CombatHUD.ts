import { Color, EventTouch, Graphics, Label, Node, UITransform, Widget } from 'cc';
import type { CombatEncounter } from '../core/CombatEncounter';
import { label, panel, pin, ui } from './ExplorationHUD';

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
    constructor(scene: Node, private readonly encounter: CombatEncounter) {
        const safe = scene.getChildByName('Mobile Canvas')!.getChildByName('Safe area')!;
        safe.getChildByName('Area heading')!.active = false; safe.getChildByName('Movement hint')!.active = false;
        const hp = label(safe, 'Player health', '', 300, 80, 21); panel(hp, 300, 80); pin(hp, 'left', 'top', 24, 20);
        this.healthText = hp.getComponentInChildren(Label)!; this.healthText.node.setPosition(0, 13, 0);
        const bar = ui(hp, 'Health bar', 256, 13); bar.setPosition(0, -20, 0); this.healthFill = bar.addComponent(Graphics);
        const count = label(safe, 'Enemy count', '', 230, 64, 21); panel(count, 230, 64);
        const countWidget = count.addComponent(Widget); countWidget.isAlignHorizontalCenter = true; countWidget.isAlignTop = true; countWidget.top = 24; countWidget.alignMode = Widget.AlignMode.ALWAYS;
        this.count = count.getComponentInChildren(Label)!;
        const pistol = label(safe, 'Pistol button', 'PISTOL\nHOLD / J', 116, 116, 23); panel(pistol, 116, 116); pin(pistol, 'right', 'bottom', 28, 140);
        const knife = label(safe, 'Knife button', 'KNIFE\nK', 112, 100, 22); panel(knife, 112, 100); pin(knife, 'right', 'bottom', 164, 28);
        const dodge = label(safe, 'Dodge button', 'DODGE\nSPACE', 116, 100, 22); panel(dodge, 116, 100); pin(dodge, 'right', 'bottom', 28, 28);
        this.pistol = pistol.getComponentInChildren(Label)!; this.knife = knife.getComponentInChildren(Label)!; this.dodge = dodge.getComponentInChildren(Label)!;
        this.bind(pistol, () => encounter.combat.setFire('touch-pistol', true), () => encounter.combat.setFire('touch-pistol', false));
        this.bind(knife, () => encounter.combat.knife()); this.bind(dodge, () => encounter.combat.dodge());
        const pause = safe.getChildByName('Pause button')!; pause.off(Node.EventType.TOUCH_END);
        this.pause = pause.getComponentInChildren(Label)!; this.bind(pause, () => encounter.togglePause());
        this.pausedHint = safe.getChildByName('Paused hint')!;
        this.result = ui(safe, 'Encounter result', 480, 240); panel(this.result, 480, 240);
        const title = label(this.result, 'Result title', '', 450, 100, 34); title.setPosition(0, 48, 0); this.resultTitle = title.getComponentInChildren(Label)!;
        const replay = label(this.result, 'Replay button', 'RESTART ENCOUNTER', 340, 68, 24); panel(replay, 340, 68); replay.setPosition(0, -60, 0);
        this.bind(replay, () => encounter.restart()); this.result.active = false;
        this.guide = label(safe, 'Combat controls guide', 'MOVE  WASD / arrows\nFIRE  J / mouse    KNIFE  K\nDODGE  Space    PAUSE  Esc', 360, 86, 17);
        panel(this.guide, 360, 86); const guideWidget = this.guide.addComponent(Widget);
        guideWidget.isAlignHorizontalCenter = true; guideWidget.isAlignBottom = true; guideWidget.bottom = 18; guideWidget.alignMode = Widget.AlignMode.ALWAYS;
        const blocked = [hp, count, pistol, knife, dodge, pause, replay, this.result, this.guide, safe.getChildByName('Movement joystick')!];
        encounter.combat.blocksMouse = p => blocked.some(n => n.activeInHierarchy && n.getComponent(UITransform)!.hitTest(p));
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
        if (hp.current !== this.lastHP) {
            this.lastHP = hp.current; text(this.healthText, `RIN   ${Math.ceil(hp.current)} / ${hp.maximum}`);
            this.healthFill.clear(); this.healthFill.fillColor = new Color(41, 36, 61); this.healthFill.rect(-128, -6, 256, 12); this.healthFill.fill();
            this.healthFill.fillColor = new Color(213, 106, 145); this.healthFill.rect(-128, -6, 256 * hp.current / hp.maximum, 12); this.healthFill.fill();
        }
        text(this.count, `RESIDENTIAL\nINFECTED  ${e.spawner.alive} / 5`);
        text(this.knife, e.combat.knifeCooldown > 0 ? `KNIFE\n${e.combat.knifeCooldown.toFixed(1)}s` : 'KNIFE\nK');
        text(this.dodge, e.combat.dodgeCooldown > 0 ? `DODGE\n${e.combat.dodgeCooldown.toFixed(1)}s` : 'DODGE\nSPACE');
        this.pistol.color = e.combat.firing ? new Color(213, 106, 145) : new Color(232, 226, 226);
        text(this.pause, e.paused ? 'RESUME' : 'PAUSE'); this.pausedHint.active = e.paused;
        this.result.active = e.state !== 'playing'; text(this.resultTitle, e.state === 'victory' ? 'AREA CLEARED\nAll five infected defeated' : 'RIN HAS FALLEN');
        if (!e.paused && e.state === 'playing') this.guideTime -= dt;
        this.guide.active = this.guideTime > 0 && e.state === 'playing' && !e.paused;
    }
}
