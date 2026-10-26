
import {
    _decorator,
    Camera,
    Color,
    Component,
    EffectAsset,
    instantiate,
    isValid,
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
import { EndlessCity } from '../levels/EndlessCity';
import { PlayerController } from '../player/PlayerController';
import { RinVisual } from '../player/RinVisual';
import { RiggedCharacterVisual } from '../player/CharacterVisual';
import { buildExplorationHUD } from '../ui/ExplorationHUD';
import { GameConfig as C, Palette } from './GameConfig';
import { CombatEncounter } from './CombatEncounter';

const { ccclass, property } = _decorator;

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
    rinRunFrontAtlas: Texture2D | null = null;

    @property(Texture2D)
    rinRunBackAtlas: Texture2D | null = null;

    @property(Texture2D)
    rinRunLeftAtlas: Texture2D | null = null;

    @property(Texture2D)
    infectedAtlas: Texture2D | null = null;

    @property(Texture2D)
    bossArtwork: Texture2D | null = null;

    @property(Texture2D)
    bossWalkAtlas: Texture2D | null = null;

    @property(EffectAsset)
    spriteEffect: EffectAsset | null = null;

    private spriteVisual: WorldSpriteVisual | null = null;
    private geometry: GeometryFactory | null = null;

    async onLoad(): Promise<void> {

        // Prevent duplicate initialization.
        if (this.node.name !== 'GameManager') {
            console.warn(
                'Skipping GameBootstrap on unexpected node:',
                this.node.name
            );
            return;
        }

        console.log('Re:ZONBI GameBootstrap starting');

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

        // ------------------------------------
        // 1. Scene and camera
        // ------------------------------------

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

        const camera = cameraNode.getComponent(Camera);

        if (!camera) {
            throw new Error(
                'GameBootstrap: Camera component missing.'
            );
        }

        // ------------------------------------
        // 2. Create arena
        // ------------------------------------

        this.geometry = new GeometryFactory(
            this.surfaceEffect
        );

        const arena = new Node('Residential Arena');
        this.node.addChild(arena);

        const city=await EndlessCity.create(arena,this.geometry);
        if(!city||!isValid(this.node))return;
        const obstacles=city.obstacles;

        // ------------------------------------
        // 3. Create Rin
        // ------------------------------------

        const rin = new Node('Rin');

        this.node.addChild(rin);
        rin.setPosition(0, 0.06, 1);

        // ------------------------------------
        // 4. Choose character visual
        // ------------------------------------

        let visual;

        if (this.rinSpriteAtlas && this.spriteEffect) {

            this.spriteVisual = new WorldSpriteVisual(
                rin,
                cameraNode,
                this.rinSpriteAtlas,
                this.spriteEffect,
                'rin',
                this.rinActionAtlas,
                this.rinRunRightAtlas,
                this.rinRunFrontAtlas,
                this.rinRunBackAtlas,
                this.rinRunLeftAtlas
            );

            visual = this.spriteVisual;

        } else if (this.rinModel) {

            const model = instantiate(this.rinModel);

            visual = new RiggedCharacterVisual(model);
            rin.addChild(visual.root);

        } else {

            visual = new RinVisual(
                rin,
                this.geometry
            );
        }

        // ------------------------------------
        // 5. Player controller
        // ------------------------------------

        const player = rin.addComponent(
            PlayerController
        );

        player.obstacles = obstacles;
        player.visual = visual;

        // ------------------------------------
        // 6. Camera settings
        // ------------------------------------

        camera.projection =
            Camera.ProjectionType.ORTHO;

        camera.orthoHeight = C.orthoHeight;
        camera.near = 0.1;
        camera.far = 120;

        camera.visibility = Layers.Enum.DEFAULT;

        camera.clearFlags =
            Camera.ClearFlag.SOLID_COLOR;

        camera.clearColor =
            new Color().fromHEX(Palette.navy);

        // ------------------------------------
        // 7. Camera tracking
        // ------------------------------------

        const tracking =
            cameraNode.getComponent(IsometricCamera) ??
            cameraNode.addComponent(IsometricCamera);

        tracking.target = rin;

        // ------------------------------------
        // 8. Create exploration HUD
        // IMPORTANT: Use sceneRoot, not GameManager
        // ------------------------------------

        player.joystick = buildExplorationHUD(
            sceneRoot,
            player
        );

        // Check that the expected UI nodes exist.
        const mobileCanvas =
            sceneRoot.getChildByName('Mobile Canvas');

        const safeArea =
            mobileCanvas?.getChildByName('Safe area');

        if (!mobileCanvas || !safeArea) {
            console.error(
                'Missing Mobile Canvas or Safe area. ' +
                'Check buildExplorationHUD() in ExplorationHUD.ts.'
            );

            return;
        }

        console.log(
            'Mobile Canvas and Safe area found.'
        );

        // ------------------------------------
        // 9. Configure infected sprites
        // ------------------------------------

        if (this.infectedAtlas && this.spriteEffect) {

            if (this.bossArtwork && !this.bossWalkAtlas) {
                console.warn('Signal Tyrant walking texture is missing. Assign signal-tyrant-walk.png (Texture2D) to GameManager > GameBootstrap > Boss Walk Atlas and save Main.scene.');
            }

            this.geometry.spriteAssets = {
                camera: cameraNode,
                effect: this.spriteEffect,
                infected: this.infectedAtlas,
                boss: this.bossArtwork ?? undefined,
                bossWalk: this.bossWalkAtlas ?? undefined
            };
        }

        // ------------------------------------
        // 10. Initialize combat
        // ------------------------------------

        if(this.geometry.spriteAssets){
            const assets=this.geometry.spriteAssets;
            for(const kind of ['runner','brute'] as const)this.geometry.loadTexture('enemies/'+kind+'/texture',(error,texture)=>{
                if(error)console.warn('Missing enemy artwork: '+kind,error);else assets[kind]=texture;
            });
            this.geometry.loadTexture('enemies/signal-tyrant-red-atlas/texture',(error,texture)=>{
                if(error)console.warn('Missing red Tyrant atlas',error);else assets.bossAnimation=texture;
            });
            await this.geometry.texturesReady();
            if(!isValid(this.node,true))return;
        }
        const encounterNode =
            new Node('Combat Encounter');

        // Keep the encounter under GameManager.
        this.node.addChild(encounterNode);

        // CombatEncounter expects Mobile Canvas
        // under its parent. Therefore, place
        // the encounter directly under sceneRoot.
        encounterNode.removeFromParent();
        sceneRoot.addChild(encounterNode);

        const encounter =
            encounterNode.addComponent(CombatEncounter);

        encounter.world=city;
        encounter.initialize(
            player,
            this.geometry,
            obstacles
        );

        console.log(
            'Re:ZONBI combat initialized successfully.'
        );
    }

    onDestroy(): void {
        this.spriteVisual?.destroy();
        this.geometry?.destroy();
    }
}
