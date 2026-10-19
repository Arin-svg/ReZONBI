
import {
    _decorator,
    Camera,
    Color,
    Component,
    EffectAsset,
    instantiate,
    Layers,
    Node,
    Prefab,
    profiler,
    ResolutionPolicy,
    Texture2D,
    view,
} from 'cc';

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

/**
 * Re:ZONBI Game Bootstrap
 *
 * Creates:
 * - Residential arena
 * - One playable Rin
 * - Anime sprite visuals
 * - Camera tracking
 * - Movement HUD
 * - Zombie encounter
 */
@ccclass('GameBootstrap')
export class GameBootstrap extends Component {

    @property(EffectAsset)
    surfaceEffect: EffectAsset | null = null;

    @property(Prefab)
    rinModel: Prefab | null = null;

    @property(Texture2D)
    rinSpriteAtlas: Texture2D | null = null;

    @property(Texture2D)
    rinActionAtlas: Texture2D | null = null;

    @property(Texture2D)
    rinRunRightAtlas: Texture2D | null = null;

    @property(Texture2D)
    infectedAtlas: Texture2D | null = null;

    @property(EffectAsset)
    spriteEffect: EffectAsset | null = null;

    private spriteVisual: WorldSpriteVisual | null = null;
    private geometry: GeometryFactory | null = null;

    private initialized = false;

    onLoad(): void {

        // Only the GameManager component should
        // initialize the game.
        if (this.node.name !== 'GameManager') {
            console.warn(
                'Skipping duplicate GameBootstrap on:',
                this.node.name
            );
            return;
        }

        if (this.initialized) {
            console.warn(
                'GameBootstrap already initialized.'
            );
            return;
        }

        this.initialized = true;

        console.log(
            'Re:ZONBI bootstrap starting:',
            this.node.name
        );

        // -----------------------------------------
        // 1. Display configuration
        // -----------------------------------------

        view.setDesignResolutionSize(
            1280,
            720,
            ResolutionPolicy.FIXED_HEIGHT
        );

        profiler.hideStats();

        if (!this.surfaceEffect) {
            throw new Error(
                'GameBootstrap: Surface Effect is missing.'
            );
        }

        // -----------------------------------------
        // 2. Find scene and camera
        // -----------------------------------------

        const sceneRoot = this.node.scene;

        if (!sceneRoot) {
            throw new Error(
                'GameBootstrap: Scene root not found.'
            );
        }

        const cameraNode =
            sceneRoot.getChildByName('Main Camera');

        if (!cameraNode) {
            throw new Error(
                'GameBootstrap: Main Camera not found.'
            );
        }

        const camera =
            cameraNode.getComponent(Camera);

        if (!camera) {
            throw new Error(
                'GameBootstrap: Camera component missing.'
            );
        }

        // -----------------------------------------
        // 3. Create city environment
        // -----------------------------------------

        this.geometry = new GeometryFactory(
            this.surfaceEffect
        );

        const arena =
            new Node('Residential Arena');

        // Important: add to the scene root.
        sceneRoot.addChild(arena);

        const obstacles = buildResidential(
            arena,
            this.geometry
        );

        // -----------------------------------------
        // 4. Create ONE playable Rin
        // -----------------------------------------

        const rin = new Node('Rin');

        // Important: add to the scene root.
        sceneRoot.addChild(rin);

        rin.setPosition(0, 0.06, 1);

        // -----------------------------------------
        // 5. Select character visual
        // -----------------------------------------

        const useAnimeSprite =
            this.rinSpriteAtlas !== null &&
            this.spriteEffect !== null;

        let visual:
            WorldSpriteVisual |
            RiggedCharacterVisual |
            RinVisual;

        if (useAnimeSprite) {

            this.spriteVisual =
                new WorldSpriteVisual(
                    rin,
                    cameraNode,
                    this.rinSpriteAtlas!,
                    this.spriteEffect!,
                    'rin',
                    this.rinActionAtlas,
                    this.rinRunRightAtlas
                );

            visual = this.spriteVisual;

            console.log(
                'Rin anime sprite initialized.'
            );

        } else if (this.rinModel) {

            const model =
                instantiate(this.rinModel);

            visual =
                new RiggedCharacterVisual(model);

            rin.addChild(visual.root);

            console.log(
                'Rin prefab initialized.'
            );

        } else {

            visual = new RinVisual(
                rin,
                this.geometry
            );

            console.log(
                'Rin fallback visual initialized.'
            );
        }

        // -----------------------------------------
        // 6. Player controller
        // -----------------------------------------

        const player =
            rin.addComponent(PlayerController);

        player.obstacles = obstacles;
        player.visual = visual;

        // -----------------------------------------
        // 7. Configure camera
        // -----------------------------------------

        camera.projection =
            Camera.ProjectionType.ORTHO;

        camera.orthoHeight =
            C.orthoHeight;

        camera.near = 0.1;
        camera.far = 120;

        camera.visibility =
            Layers.Enum.DEFAULT;

        camera.clearFlags =
            Camera.ClearFlag.SOLID_COLOR;

        camera.clearColor =
            new Color().fromHEX(Palette.navy);

        // -----------------------------------------
        // 8. Camera tracking
        // -----------------------------------------

        const tracking =
            cameraNode.getComponent(
                IsometricCamera
            ) ??
            cameraNode.addComponent(
                IsometricCamera
            );

        tracking.target = rin;

        tracking.buildings =
            arena.children.filter(
                node =>
                    node.name === 'Building facade'
            );

        // -----------------------------------------
        // 9. Exploration HUD
        // -----------------------------------------

        player.joystick =
            buildExplorationHUD(
                sceneRoot,
                player
            );

        // -----------------------------------------
        // 10. Zombie sprite textures
        // -----------------------------------------

        if (
            this.infectedAtlas &&
            this.spriteEffect
        ) {

            this.geometry.spriteAssets = {
                camera: cameraNode,
                effect: this.spriteEffect,
                infected: this.infectedAtlas
            };

            console.log(
                'Zombie sprite assets initialized.'
            );
        }

        // -----------------------------------------
        // 11. Combat encounter
        // -----------------------------------------

        const encounterNode =
            new Node('Combat Encounter');

        // Important: add to the scene root.
        sceneRoot.addChild(encounterNode);

        const encounter =
            encounterNode.addComponent(
                CombatEncounter
            );

        encounter.initialize(
            player,
            this.geometry,
            obstacles
        );

        console.log(
            'Re:ZONBI initialization completed.'
        );
    }

    onDestroy(): void {

        this.spriteVisual?.destroy();
        this.spriteVisual = null;

        this.geometry?.destroy();
        this.geometry = null;
    }
}
