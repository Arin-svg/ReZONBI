import { BlockInputEvents, Color, EventTouch, Graphics, Label, Node, tween, Tween, UITransform, Vec3, Widget } from 'cc';
import { Accent, disc, icon } from './VisualTheme';
import { Progression, SkillId } from '../systems/Progression';
import { label, panel, typography, ui } from './ExplorationHUD';
import { localizedText } from './Localization';
import { staticGraphics } from './StaticUIGraphics';

export class SkillSelectionUI {
    readonly node: Node;
    private cards: Node[] = [];
    private signature = '';
    private icons: Node[] = [];
    private names: Label[] = [];
    private levels: Label[] = [];
    constructor(safe: Node, private progression: Progression, choose: (id: SkillId) => void) {
        this.node = ui(safe, 'Skill selection', 1280, 720);
        const fit = this.node.addComponent(Widget); fit.isAlignLeft = fit.isAlignRight = fit.isAlignTop = fit.isAlignBottom = true;
        fit.left = fit.right = fit.top = fit.bottom = 0; fit.alignMode = Widget.AlignMode.ALWAYS;
        this.node.addComponent(BlockInputEvents);
        const dim = ui(this.node, 'Dimmed world', 10000, 10000); staticGraphics(dim, shade => {
        shade.fillColor = new Color(6, 10, 22, 190); shade.rect(-5000, -5000, 10000, 10000); shade.fill(); });
        const backing = ui(this.node, 'Upgrade panel', 880, 420); panel(backing, 880, 420);
        const title = label(backing, 'Level up title', 'LEVEL UP', 840, 36, 29); title.setPosition(0, 174, 0);typography(title.getComponentInChildren(Label)!,'display');
        label(backing, 'Level up subtitle', 'Choose an upgrade', 840, 24, 17).setPosition(0, 140, 0);
        for (let i = 0; i < 3; i++) {
            const card = label(backing, `Skill card ${i}`, '', 260, 280, 20); panel(card, 260, 280); card.setPosition((i - 1) * 280, -20, 0);
            card.getComponentInChildren(Label)!.color = new Color(180, 229, 245);
            const text = card.getComponentInChildren(Label)!; text.fontSize = 17; text.lineHeight = 23; text.node.getComponent(UITransform)!.setContentSize(232, 94); text.node.setPosition(0, -72, 0);
            const name = label(card, 'Skill name', '', 232, 28, 19);name.setPosition(0, 20, 0);
            const nameText=name.getComponentInChildren(Label)!;nameText.color=text.color;typography(nameText,'label');this.names.push(nameText);
            const level = label(card, 'Skill level', '', 232, 24, 15);level.setPosition(0, -10, 0);
            const levelText=level.getComponentInChildren(Label)!;levelText.color=text.color;typography(levelText,'label');this.levels.push(levelText);
            const emblem = ui(card, 'Skill emblem', 70, 70); emblem.setPosition(0, 84, 0); disc(emblem, 35); this.icons.push(emblem);
            let owner: number | null = null;
            card.on(Node.EventType.TOUCH_START, (e: EventTouch) => { e.propagationStopped = true; if (owner === null) owner = e.getID(); });
            card.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => { if (owner === e.getID()) owner = null; });
            card.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
                e.propagationStopped = true; if (owner !== e.getID()) return; owner = null;
                if (card.getComponent(UITransform)!.hitTest(e.getLocation(), e.windowId)) { const skill = progression.offers[i]; if (skill) choose(skill.id); }
            }); this.cards.push(card);
        }
        this.node.active = false;
    }
    refresh(selecting: boolean): void {
        if (selecting && !this.node.active) {
            const panel = this.node.getChildByName('Upgrade panel')!; Tween.stopAllByTarget(panel);
            panel.setScale(.94, .94, 1); tween(panel).to(.16, { scale: new Vec3(1, 1, 1) }).start();
        }
        this.node.active = selecting;
        if (!selecting) { this.signature = ''; return; }
        const key = this.progression.offers.map(s => s.id + this.progression.rank(s.id)).join();
        if (key === this.signature) return; this.signature = key;
        this.cards.forEach((c, i) => {
            const s = this.progression.offers[i]; c.active = !!s; if (!s) return;
            const rank = this.progression.rank(s.id);
            c.setPosition((i - (this.progression.offers.length - 1) / 2) * 280, -20, 0);
            for (const child of [...this.icons[i].children]) { child.removeFromParent(); child.destroy(); }
            icon(this.icons[i], s.id, 46, Accent[s.id]);
            localizedText(this.names[i], s.name);
            localizedText(this.levels[i], `LV ${rank} → ${rank + 1}`);
            localizedText(c.getComponentInChildren(Label)!, s.describe(rank + 1));
        });
    }
}
