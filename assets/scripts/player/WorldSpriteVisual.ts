
import {
    Color,
    EffectAsset,
    Material,
    Mesh,
    MeshRenderer,
    Node,
    Texture2D,
    utils,
    Vec3,
    Vec4,
} from 'cc';

import { CharacterAction, CharacterVisual } from './CharacterVisual';

/**
 * Re:ZONBI - World Sprite Visual
 *
 * Renders 2D anime character sprites in the existing 3D world.
 *
 * Features:
 * - Camera-facing world-space sprite
 * - Four directional views
 * - Idle and running animation
 * - Smooth idle/run transitions
 * - Rin action sprites
 * - Ground-anchored character visuals
 * - Compatible with existing gameplay and collisions
 *
 * Locomotion atlas:
 * Rows: front / back / left / right
 * Columns: idle0 / idle1 / run0 / run1
 *
 * Action atlas:
 * Rows: front / back / left / right
 * Columns: shoot / slash / dodge / hurt / die
 */
export class WorldSpriteVisual implements CharacterVisual {

    readonly root: Node;
    readonly material: Material;
    readonly mesh: Mesh;

    frame = -1;
    direction = 0;
    state = 'idle';

    private age = 0;

    // Prevents rapid idle/run switching near zero speed.
    private running = false;

    private actionTime = 0;
    private action = '';
    private terminal = false;
    private textureKey = '';

    // Visual animation settings.
    private readonly runStartThreshold = 0.12;
    private readonly runStopThreshold = 0.04;

    // Two-frame animation rates.
    private readonly idleFPS = 2;
    private readonly runFPS = 6;
    private readonly enemyFPS = 5;

    // Subtle movement effect for Rin.
    private readonly runBobAmount = 0.025;
    private readonly runBobFrequency = 12;

    private readonly forward = new Vec3();
    private readonly uv = new Vec4(0.25, 0.25, 0, 0);

    private readonly normalColor = new Color(255, 255, 255, 255);
    private readonly hurtColor = new Color(255, 140, 170, 255);

    constructor(
        private actor: Node,
        private camera: Node,
        private texture: Texture2D,
        effect: EffectAsset,
        private kind: 'rin' | 'walker' | 'runner' | 'boss' = 'rin',
        private actions: Texture2D | null = null,
    ) {

        const nodeName =
            kind === 'rin'
                ? 'Rin world sprite'
                : kind === 'boss'
                    ? 'Boss world sprite'
                    : 'Enemy world sprite';

        this.root = new Node(nodeName);
        this.actor.addChild(this.root);

        // Rin is 25% larger than the original 2.3-unit sprite.
        // This does not change gameplay collisions.
        const size =
            kind === 'boss' ? 4.2 :
            kind === 'rin' ? 2.875 :
            kind === 'runner' ? 2.1 :
            2.3;

        // Bottom-center origin keeps the feet near the actor.
        this.mesh = utils.createMesh({
            positions: [
                -size / 2, -0.04, 0,
                 size / 2, -0.04, 0,
                -size / 2, size - 0.04, 0,
                 size / 2, size - 0.04, 0,
            ],

            normals: [
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
            ],

            uvs: [
                0, 1,
                1, 1,
                0, 0,
                1, 0,
            ],

            indices: [0, 1, 2, 2, 1, 3],
        });

        this.material = new Material();

        this.material.initialize({
            effectAsset: effect,
            technique: 0,
            defines: {
                USE_TEXTURE: true,
                USE_ALPHA_TEST: true,
            },
        });

        this.material.setProperty('mainTexture', texture);
        this.material.setProperty('alphaThreshold', 0.45);
        this.material.setProperty('mainColor', this.normalColor);

        const renderer = this.root.addComponent(MeshRenderer);
        renderer.mesh = this.mesh;
        renderer.setSharedMaterial(this.material, 0);

        this.animate(0, 0);
    }

    /**
     * Play a combat or character action.
     */
    play(action: CharacterAction, duration: number): void {

        if (this.terminal) {
            return;
        }

        this.action = action;
        this.actionTime = duration;

        if (action === 'die' || action === 'victory') {
            this.terminal = true;
        }
    }

    /**
     * Reset the character's animation state.
     */
    reset(): void {

        this.action = '';
        this.actionTime = 0;
        this.terminal = false;

        this.age = 0;
        this.running = false;

        this.frame = -1;
        this.textureKey = '';

        this.root.setPosition(0, 0, 0);
        this.root.setScale(1, 1, 1);

        this.animate(0, 0);
    }

    /**
     * Update the sprite every frame.
     *
     * @param dt Delta time in seconds
     * @param moving Existing movement magnitude supplied by gameplay
     */
    animate(dt: number, moving: number): void {

        const delta = Math.max(0, dt);

        this.age += delta;

        this.actionTime = Math.max(
            0,
            this.actionTime - delta,
        );

        // ---------------------------------------------
        // 1. Smooth idle/run state switching
        // ---------------------------------------------

        if (this.running) {

            if (moving < this.runStopThreshold) {
                this.running = false;
            }

        } else {

            if (moving > this.runStartThreshold) {
                this.running = true;
            }
        }

        // ---------------------------------------------
        // 2. Calculate directional facing
        // ---------------------------------------------

        Vec3.transformQuat(
            this.forward,
            new Vec3(0, 0, -1),
            this.actor.worldRotation,
        );

        const screenX =
            (this.forward.x - this.forward.z) * Math.SQRT1_2;

        const screenY =
            (-this.forward.x - this.forward.z) * Math.SQRT1_2;

        this.direction =
            Math.abs(screenX) > Math.abs(screenY)
                ? (screenX < 0 ? 2 : 3)
                : (screenY > 0 ? 1 : 0);

        // ---------------------------------------------
        // 3. Determine animation state
        // ---------------------------------------------

        if (this.terminal) {

            this.state = this.action;

        } else if (this.actionTime > 0) {

            this.state = this.action;

        } else {

            this.state = this.running ? 'run' : 'idle';
        }

        // ---------------------------------------------
        // 4. Determine sprite atlas
        // ---------------------------------------------

        const actionIndex = [
            'shoot',
            'slash',
            'dodge',
            'hurt',
            'die',
        ].indexOf(this.state);

        const useAction =
            this.kind === 'rin' &&
            this.actions !== null &&
            actionIndex >= 0;

        let column = 0;

        if (useAction) {

            column = actionIndex;

        } else if (this.kind === 'rin') {

            if (this.running && !this.terminal) {

                column =
                    2 +
                    (Math.floor(this.age * this.runFPS) % 2);

            } else {

                column =
                    Math.floor(this.age * this.idleFPS) % 2;
            }

        } else {

            const baseColumn =
                this.kind === 'runner' ? 2 : 0;

            const animationFrame =
                moving > 0.05
                    ? Math.floor(this.age * this.enemyFPS) % 2
                    : 0;

            column = baseColumn + animationFrame;
        }

        // ---------------------------------------------
        // 5. Update sprite frame
        // ---------------------------------------------

        const frame =
            this.direction * (useAction ? 5 : 4) + column;

        const textureKey =
            useAction ? 'actions' : 'locomotion';

        if (
            frame !== this.frame ||
            textureKey !== this.textureKey
        ) {

            this.frame = frame;
            this.textureKey = textureKey;

            this.material.setProperty(
                'mainTexture',
                useAction ? this.actions! : this.texture,
            );

            const rows = useAction
                ? [0, 305, 589, 852, 1122]
                : this.kind === 'rin'
                    ? [0, 324, 635, 933, 1234]
                    : [0, 319, 632, 929, 1244];

            const width = useAction
                ? 1402
                : this.kind === 'rin'
                    ? 1274
                    : 1264;

            const height = rows[4];

            const columns = useAction
                ? [0, 295, 603, 882, 1094, 1402]
                : [
                    0,
                    width / 4,
                    width / 2,
                    width * 3 / 4,
                    width,
                ];

            const top = rows[this.direction] + 1;
            const bottom = rows[this.direction + 1] - 1;

            const left = columns[column] + 1;
            const right = columns[column + 1] - 1;

            this.uv.set(
                (right - left) / width,
                (bottom - top) / height,
                left / width,
                top / height,
            );

            this.material.setProperty(
                'tilingOffset',
                this.uv,
            );
        }

        // ---------------------------------------------
        // 6. Face the camera
        // ---------------------------------------------

        this.root.setWorldRotation(
            this.camera.worldRotation,
        );

        // ---------------------------------------------
        // 7. Subtle running animation
        // ---------------------------------------------

        // Apply only to Rin.
        // Does not modify the actor or collision position.
        let visualOffsetY = 0;

        if (
            this.kind === 'rin' &&
            this.running &&
            this.state === 'run'
        ) {

            const bounce = Math.abs(
                Math.sin(
                    this.age * this.runBobFrequency,
                ),
            );

            visualOffsetY =
                bounce * this.runBobAmount;
        }

        this.root.setPosition(
            0,
            visualOffsetY,
            0,
        );

        // ---------------------------------------------
        // 8. Action transforms
        // ---------------------------------------------

        let scaleY = 1;

        if (!useAction && this.state === 'dodge') {
            scaleY = 0.72;
        }

        if (!useAction && this.state === 'die') {
            scaleY = 0.18;
        }

        this.root.setScale(
            1,
            scaleY,
            1,
        );

        // ---------------------------------------------
        // 9. Damage feedback
        // ---------------------------------------------

        this.material.setProperty(
            'mainColor',
            this.state === 'hurt'
                ? this.hurtColor
                : this.normalColor,
        );
    }

    /**
     * Release GPU resources.
     */
    destroy(): void {

        this.material.destroy();
        this.mesh.destroy();
        this.root.destroy();
    }
}
