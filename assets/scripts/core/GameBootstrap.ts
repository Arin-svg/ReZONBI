import { _decorator, Camera, Color, Component, EffectAsset, instantiate, Layers, Node, Prefab, profiler, ResolutionPolicy, Texture2D, view } from 'cc';
import { WorldSpriteVisual } from '../player/WorldSpriteVisual';
import { IsometricCamera } from '../camera/IsometricCamera';
import { GeometryFactory } from '../levels/GeometryFactory';
import { buildResidential } from '../levels/ResidentialArena';
import { PlayerController } from '../player/PlayerController';
import { RinVisual } from '../player/RinVisual';
import { RiggedCharacterVisual } from '../player/CharacterVisual';
import { buildExplorationHUD } from '../ui/ExplorationHUD';
import { GameConfig as C, Palette } from './GameConfig';
import { CombatEncounter } from './CombatEncounter';
const { ccclass, property } = _decorator;

/** Attached to Main.scene. Creates the M1 arena and connected M2 encounter. */
@ccclass('GameBootstrap')
export class GameBootstrap extends Component {
    // Serialized reference keeps the standard effect in both web and RPK builds.
    @property(EffectAsset) surfaceEffect: EffectAsset | null = null;
    @property(Prefab) rinModel: Prefab | null = null;
    @property(Texture2D) rinSpriteAtlas: Texture2D | null = null;
    @property(Texture2D) rinActionAtlas: Texture2D | null = null;
    @property(Texture2D) infectedAtlas: Texture2D | null = null;
    @property(EffectAsset) spriteEffect: EffectAsset | null = null;
    private spriteVisual: WorldSpriteVisual | null = null;
    private geometry: GeometryFactory | null = null;
    onLoad(): void {
        view.setDesignResolutionSize(1280, 720, ResolutionPolicy.FIXED_HEIGHT);
        profiler.hideStats();
        if (!this.surfaceEffect) throw new Error('Main.scene must reference the builtin standard surface effect');
        this.geometry = new GeometryFactory(this.surfaceEffect);
        const arena = new Node('Residential Arena'); this.node.addChild(arena);
        const obstacles = buildResidential(arena, this.geometry);
        const rin = new Node('Rin'); this.node.addChild(rin); rin.setPosition(0, 0.06, 1);
        const visual = this.rinModel ? new RiggedCharacterVisual(instantiate(this.rinModel)) : new RinVisual(rin, this.geometry);
        if (this.rinModel) rin.addChild(visual.root);
        const player = rin.addComponent(PlayerController); player.obstacles = obstacles; player.visual = visual;
        const cameraNode = this.node.getChildByName('Main Camera')!;
        const camera = cameraNode.getComponent(Camera)!;
        camera.projection = Camera.ProjectionType.ORTHO; camera.orthoHeight = C.orthoHeight;
        camera.near = 0.1; camera.far = 120; camera.visibility = Layers.Enum.DEFAULT;
        camera.clearFlags = Camera.ClearFlag.SOLID_COLOR; camera.clearColor = new Color().fromHEX(Palette.navy);
        if (this.rinSpriteAtlas && this.spriteEffect) {
            this.spriteVisual = new WorldSpriteVisual(rin, cameraNode, this.rinSpriteAtlas, this.spriteEffect, 'rin', this.rinActionAtlas);
            visual.root.active = false; player.visual = this.spriteVisual;
        }
        const tracking = cameraNode.addComponent(IsometricCamera); tracking.target = rin;
        tracking.buildings = arena.children.filter(n => n.name === 'Building facade');
        player.joystick = buildExplorationHUD(this.node, player);
        if(this.infectedAtlas&&this.spriteEffect) this.geometry.spriteAssets={camera:cameraNode,effect:this.spriteEffect,infected:this.infectedAtlas};
        const encounterNode = new Node('Combat Encounter'); this.node.addChild(encounterNode);
        encounterNode.addComponent(CombatEncounter).initialize(player, this.geometry, obstacles);
    }
    onDestroy(): void { this.spriteVisual?.destroy(); this.geometry?.destroy(); }
}
