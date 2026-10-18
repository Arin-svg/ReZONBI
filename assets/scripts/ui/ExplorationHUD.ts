import { Camera, Canvas, Color, Graphics, Label, Layers, Node, SafeArea, UITransform, Widget } from 'cc';
import { Palette as P } from '../core/GameConfig';
import { PlayerController } from '../player/PlayerController';
import { MobileJoystick } from './MobileJoystick';

function ui(parent: Node, name: string, width: number, height: number): Node {
    const node = new Node(name); node.layer = Layers.Enum.UI_2D; parent.addChild(node);
    node.addComponent(UITransform).setContentSize(width, height); return node;
}
function pin(node: Node, horizontal: 'left' | 'right', vertical: 'top' | 'bottom', x: number, y: number): void {
    const widget = node.addComponent(Widget);
    widget.isAlignLeft = horizontal === 'left'; widget.isAlignRight = horizontal === 'right';
    widget.isAlignTop = vertical === 'top'; widget.isAlignBottom = vertical === 'bottom';
    widget.left = widget.right = x; widget.top = widget.bottom = y;
    widget.alignMode = Widget.AlignMode.ALWAYS;
}
function label(parent: Node, name: string, text: string, width: number, height: number, size: number): Node {
    const node = ui(parent, name, width, height);
    const textNode = ui(node, 'Text', width, height); const l = textNode.addComponent(Label);
    l.string = text; l.fontSize = size; l.lineHeight = size + 6;
    l.color = new Color().fromHEX(P.white); l.horizontalAlign = Label.HorizontalAlign.CENTER;
    l.verticalAlign = Label.VerticalAlign.CENTER; return node;
}
function panel(node: Node, width: number, height: number): void {
    const background = ui(node, 'Panel', width, height); background.setSiblingIndex(0);
    const g = background.addComponent(Graphics); g.fillColor = new Color(23, 29, 48, 224);
    g.roundRect(-width / 2, -height / 2, width, height, 12); g.fill();
    g.strokeColor = new Color().fromHEX(P.concrete); g.lineWidth = 2; g.stroke();
}

export function buildExplorationHUD(parent: Node, player: PlayerController): MobileJoystick {
    const canvasNode = ui(parent, 'Mobile Canvas', 1280, 720);
    const cameraNode = new Node('UI Camera'); canvasNode.addChild(cameraNode); cameraNode.setPosition(0, 0, 1000);
    const camera = cameraNode.addComponent(Camera); camera.projection = Camera.ProjectionType.ORTHO;
    camera.visibility = Layers.Enum.UI_2D; camera.priority = 10; camera.clearFlags = Camera.ClearFlag.DEPTH_ONLY;
    camera.near = 0.1; camera.far = 2000;
    const canvas = canvasNode.addComponent(Canvas); canvas.cameraComponent = camera; canvas.alignCanvasWithScreen = true;
    const canvasFit = canvasNode.addComponent(Widget);
    canvasFit.isAlignLeft = canvasFit.isAlignRight = canvasFit.isAlignTop = canvasFit.isAlignBottom = true;
    canvasFit.left = canvasFit.right = canvasFit.top = canvasFit.bottom = 0;
    canvasFit.alignMode = Widget.AlignMode.ALWAYS; canvasFit.updateAlignment();
    const safe = ui(canvasNode, 'Safe area', 1280, 720);
    const fill = safe.addComponent(Widget); fill.isAlignLeft = fill.isAlignRight = fill.isAlignTop = fill.isAlignBottom = true;
    fill.left = fill.right = fill.top = fill.bottom = 0; fill.alignMode = Widget.AlignMode.ALWAYS;
    safe.addComponent(SafeArea);
    const heading = label(safe, 'Area heading', 'RE:ZONBI  /  NEW HAVEN\nRESIDENTIAL AREA', 350, 80, 23);
    panel(heading, 350, 80); pin(heading, 'left', 'top', 24, 20);
    const instruction = label(safe, 'Movement hint', 'Explore the streets\nWASD / arrows or left joystick', 380, 68, 20);
    panel(instruction, 380, 68); pin(instruction, 'right', 'bottom', 24, 24);
    const joystickNode = ui(safe, 'Movement joystick', 184, 184); pin(joystickNode, 'left', 'bottom', 32, 32);
    const base = joystickNode.addComponent(Graphics);
    base.fillColor = new Color(23, 29, 48, 155); base.circle(0, 0, 86); base.fill();
    base.lineWidth = 3; base.strokeColor = new Color(103, 183, 198, 155); base.stroke();
    base.lineWidth = 1; base.circle(0, 0, 68); base.stroke();
    const thumb = ui(joystickNode, 'Thumb', 64, 64); const tg = thumb.addComponent(Graphics);
    tg.fillColor = new Color(154, 178, 201, 210); tg.circle(0, 0, 29); tg.fill();
    tg.strokeColor = new Color().fromHEX(P.white); tg.lineWidth = 2; tg.stroke();
    const joystick = joystickNode.addComponent(MobileJoystick); joystick.setThumb(thumb);
    const pause = label(safe, 'Pause button', 'PAUSE', 132, 58, 22); panel(pause, 132, 58); pin(pause, 'right', 'top', 24, 24);
    const pauseLabel = pause.getComponentInChildren(Label)!;
    const overlay = label(safe, 'Paused hint', 'PAUSED\nTap RESUME to continue', 410, 110, 28); panel(overlay, 410, 110); overlay.active = false;
    pause.on(Node.EventType.TOUCH_END, () => {
        player.paused = !player.paused; player.clearInput(); joystick.enabled = !player.paused;
        pauseLabel.string = player.paused ? 'RESUME' : 'PAUSE'; overlay.active = player.paused;
    });
    return joystick;
}
