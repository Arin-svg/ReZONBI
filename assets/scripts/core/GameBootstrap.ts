import { _decorator, Camera, Color, Component, EffectAsset, Layers, Node, ResolutionPolicy, view } from 'cc';
import { IsometricCamera } from '../camera/IsometricCamera';
import { GeometryFactory } from '../levels/GeometryFactory';
import { buildResidential } from '../levels/ResidentialArena';
import { PlayerController } from '../player/PlayerController';
import { RinVisual } from '../player/RinVisual';
import { buildExplorationHUD } from '../ui/ExplorationHUD';
import { GameConfig as C, Palette } from './GameConfig';
const { ccclass, property } = _decorator;

/** Attached to Main.scene. Creates the entire M1 graph, with no editor-only APIs. */
@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
    // Serialized reference keeps the standard effect in both web and RPK builds.
    @property(EffectAsset) surfaceEffect: EffectAsset | null = null;
    private geometry: GeometryFactory | null = null;
    onLoad(): void {
        view.setDesignResolutionSize(1280, 720, ResolutionPolicy.FIXED_HEIGHT);
        if (!this.surfaceEffect) throw new Error('Main.scene must reference the builtin standard surface effect');
        this.geometry = new GeometryFactory(this.surfaceEffect);
        const arena = new Node('Residential Arena'); this.node.addChild(arena);
        const obstacles = buildResidential(arena, this.geometry);
        const rin = new Node('Rin'); this.node.addChild(rin); rin.setPosition(0, 0.06, 1);
        const visual = new RinVisual(rin, this.geometry);
        const player = rin.addComponent(PlayerController); player.obstacles = obstacles; player.visual = visual;
        const cameraNode = this.node.getChildByName('Main Camera')!;
        const camera = cameraNode.getComponent(Camera)!;
        camera.projection = Camera.ProjectionType.ORTHO; camera.orthoHeight = C.orthoHeight;
        camera.near = 0.1; camera.far = 120; camera.visibility = Layers.Enum.DEFAULT;
        camera.clearFlags = Camera.ClearFlag.SOLID_COLOR; camera.clearColor = new Color().fromHEX(Palette.navy);
        cameraNode.addComponent(IsometricCamera).target = rin;
        player.joystick = buildExplorationHUD(this.node, player);
    }
    onDestroy(): void { this.geometry?.destroy(); }
}
