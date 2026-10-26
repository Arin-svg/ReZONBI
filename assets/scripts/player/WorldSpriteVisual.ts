
import {
    Color,
    EffectAsset,
    isValid,
    Material,
    Mesh,
    MeshRenderer,
    Node,
    Texture2D,
    utils,
    Vec3,
    Vec4,
} from 'cc';

import {
    CharacterAction,
    CharacterVisual,
} from './CharacterVisual';
import { SpriteConfig } from '../core/GameConfig';

// Alpha >= 0.45 bounds measured by tools/audit-sprite-art.cjs.
// One reference height per clip/direction preserves pose compression; never stretch each pose to full height.
const RUN_HEIGHT = [336, 336, 336, 336];
const RUN_FEET = [[360,360,360,360,360,360,360,360], [360,360,360,360,360,360,360,360],
    [360,360,360,360,360,360,360,360], [360,360,360,360,360,360,360,360]];
const RIN_HEIGHT = [304,303,295,289];
const RIN_FEET = [[318,318,319,319],[305,305,306,305],[297,296,297,293],[295,295,295,295]];
const ACTION_HEIGHT = [292,284,263,258];
const ACTION_FEET = [[305,299,301,299,300],[284,284,278,284,280],[263,263,254,262,255],[258,255,254,258,254]];
// Explicit pixel crops: the supplied runner poses are staggered, not a uniform grid.
// Front, back, left, right. Keep the last two right-facing crops separate at x=627/634.
const RUNNER_CROPS = [
    [[24,20,187,208],[218,35,409,209]],
    [[23,407,171,584],[212,410,377,585],[416,407,587,585],[625,420,762,581]],
    [[27,219,220,397],[235,233,426,396],[444,219,676,394],[716,225,941,396]],
    [[19,596,194,775],[205,601,407,774],[420,592,627,774],[634,596,935,775]],
];
// Front, back, left, right. Bounds exclude neighbouring poses in this staggered sheet.
const BRUTE_CROPS = [
    [[30,13,227,213],[251,12,441,217],[463,13,677,217],[694,16,983,221]],
    [[29,409,235,600],[261,407,478,603],[504,409,734,593],[759,420,965,595]],
    [[41,216,209,404],[252,217,484,404],[517,219,721,408],[741,226,969,415]],
    [[24,601,204,779],[217,604,427,779],[438,601,659,780],[700,602,978,779]],
];
const ENEMY_HEIGHT = [[300,293,285,288],[279,290,264,274]];
// Measured source rectangles and ground pivots; keep the supplied pose order.
// The fourth walk cell ends before the next pose (the old x=565 cut included it).
const BOSS_CROPS = [
    [0,0,164,153,89,146], [164,0,315,153,237,146],
    [315,0,468,153,389.5,146], [468,0,628,153,539.5,146],
    [0,153,152,309,87,297], [152,153,283,309,223,298],
    [283,153,416,309,353,298], [416,153,550,309,479,297],
];
const BOSS_WALK_COLUMNS = [0,449,908,1340,1774];
const BOSS_WALK_ROWS = [0,444,887];
const ENEMY_FEET = [[312,312,316,313],[298,298,295,305],[285,284,288,278],[290,289,287,283]];

/**
 * Re:ZONBI - World Sprite Visual
 *
 * Rin:
 * - 4-direction running
 * - 8 frames per running direction
 * - Idle and combat actions
 * - Camera-facing billboard
 * - One immutable quad; builtin-unlit atlas UV uniform
 *
 * Zombies:
 * - Existing atlas animation preserved
 */
export class WorldSpriteVisual implements CharacterVisual {

    readonly root: Node;
    readonly material: Material;

    readonly mesh: Mesh;

    frame = -1;
    direction = 0;
    state = 'idle';

    private readonly renderer: MeshRenderer;
    private destroyed = false;

    private readonly forward = new Vec3();

    private readonly uv = new Vec4(1, 1, 0, 0);

    private readonly normalColor =
        new Color(255, 255, 255, 255);

    private readonly hurtColor =
        new Color(255, 140, 170, 255);

    private readonly size: number;
    private readonly runAtlases: readonly (Texture2D | null)[];
    private readonly offset = new Vec3();
    private width = 1;
    private height = 1;
    private footPadding = 0;
    private pivotOffset = 0;

    private age = 0;
    private bossWalkTime = 0;
    private running = false;

    private actionTime = 0;
    private action: CharacterAction | '' = '';
    private terminal = false;

    private textureKey = '';

    constructor(
        private actor: Node,
        private camera: Node,
        private texture: Texture2D,
        effect: EffectAsset,
        private kind: 'rin' | 'walker' | 'runner' | 'brute' | 'boss' = 'rin',
        private actions: Texture2D | null = null,
        private runRightAtlas: Texture2D | null = null,
        private runFrontAtlas: Texture2D | null = null,
        private runBackAtlas: Texture2D | null = null,
        private runLeftAtlas: Texture2D | null = null,
        private bossWalkAtlas: Texture2D | null = null,
        private dedicatedEnemyAtlas = false,
        private bossAnimationAtlas: Texture2D | null = null,
    ) {

        const nodeName =
            kind === 'rin'
                ? 'Rin world sprite'
                : kind === 'boss'
                    ? 'Boss world sprite'
                    : 'Enemy world sprite';

        this.root = new Node(nodeName);
        this.actor.addChild(this.root);

        // World-space character height
        this.size =
            kind === 'boss' ? SpriteConfig.bossHeight :
            kind === 'brute' ? SpriteConfig.bruteHeight :
            kind === 'runner' ? SpriteConfig.runnerHeight : SpriteConfig.characterHeight;
        this.runAtlases = [runFrontAtlas, runBackAtlas, runLeftAtlas, runRightAtlas];

        // Initial full-texture quad
        this.mesh = this.createQuad(
            0, 0, 1, 1,
        );

        this.material = new Material();

        this.material.initialize({
            effectAsset: effect,
            technique: 0,
            defines: {
                USE_TEXTURE: true,
                USE_ALPHA_TEST: true,
            },
        });

        this.material.setProperty(
            'mainTexture',
            texture,
        );

        this.material.setProperty(
            'alphaThreshold',
            // The red atlas has a low-alpha matte outside the painted silhouette.
            // Reject it without altering the source texture or other characters.
            kind === 'boss' && bossAnimationAtlas ? .9 : 0.45,
        );

        this.material.setProperty(
            'mainColor',
            this.normalColor,
        );

        // builtin-unlit-vs applies a_texCoord * tilingOffset.xy + tilingOffset.zw.
        this.material.setProperty('tilingOffset', this.uv);

        this.renderer =
            this.root.addComponent(MeshRenderer);

        this.renderer.mesh = this.mesh;

        this.renderer.setSharedMaterial(
            this.material,
            0,
        );

        this.animate(0, 0);
    }

    /**
     * Create a billboard quad with explicit UV coordinates.
     *
     * left/right/top/bottom are normalized atlas coordinates.
     */
    private createQuad(
        left: number,
        top: number,
        right: number,
        bottom: number,
    ): Mesh {

        const half = 0.5;
        const height = 1;

        return utils.createMesh({
            positions: [
                -half, 0, 0,
                 half, 0, 0,
                -half, height, 0,
                 half, height, 0,
            ],

            normals: [
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
            ],

            // Preserve the original atlas V orientation.
            uvs: [
                left,  bottom,
                right, bottom,
                left,  top,
                right, top,
            ],

            indices: [
                0, 1, 2,
                2, 1, 3,
            ],
        });
    }

    play(
        action: CharacterAction,
        duration: number,
    ): void {

        if (this.terminal) {
            return;
        }

        this.action = action;
        this.actionTime = duration;

        if (
            action === 'die' ||
            action === 'victory'
        ) {
            this.terminal = true;
        }
    }

    reset(): void {

        this.action = '';
        this.actionTime = 0;
        this.terminal = false;

        this.age = 0;
        this.bossWalkTime = 0;
        this.running = false;

        this.frame = -1;
        this.textureKey = '';

        this.root.setPosition(0, 0, 0);
        this.root.setScale(1, 1, 1);

        this.animate(0, 0);
    }

    animate(
        dt: number,
        moving: number,
    ): void {

        const delta = Math.max(0, dt);

        this.age += delta;
        if (this.kind === 'boss' && moving > .04 && !this.terminal) {
            this.bossWalkTime += delta;
        }

        this.actionTime = Math.max(
            0,
            this.actionTime - delta,
        );

        // 1. Movement state with hysteresis
        if (this.running) {

            if (moving < 0.04) {
                this.running = false;
            }

        } else if (moving > 0.12) {

            this.running = true;
        }

        // 2. Calculate facing direction
        Vec3.transformQuat(
            this.forward,
            Vec3.FORWARD,
            this.actor.worldRotation,
        );

        const screenX =
            (this.forward.x - this.forward.z) *
            Math.SQRT1_2;

        const screenY =
            (-this.forward.x - this.forward.z) *
            Math.SQRT1_2;

        this.direction =
            Math.abs(screenX) > Math.abs(screenY)
                ? (screenX < 0 ? 2 : 3)
                : (screenY > 0 ? 1 : 0);

        // Direction:
        // 0 = front
        // 1 = back
        // 2 = left
        // 3 = right

        // 3. Determine animation state
        if (this.terminal) {

            this.state = this.action;

        } else if (this.actionTime > 0 && !(this.running && this.action === 'shoot')) {

            // The action sheet contains stationary full-body shooting poses.
            // While moving, preserve the leg cycle; PlayerCombat still emits
            // the shot, damage and tracer. Other actions keep their priority.

            this.state = this.action;

        } else {

            this.state = this.running
                ? 'run'
                : 'idle';
        }

        // 4. Combat action
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

        // 5. Default atlas column
        let column: number;

        if (useAction) {

            column = actionIndex;

        } else if (this.kind === 'rin') {

            column = this.state === 'run'
                ? 2 + Math.floor(this.age * 6) % 2
                : Math.floor(this.age * 2) % 2;

        } else if(this.dedicatedEnemyAtlas){
            const frames=this.kind==='runner'?RUNNER_CROPS[this.direction].length:4;
            column=moving>.05?Math.floor(this.age*(this.kind==='runner'?9:5))%frames:0;
        } else {

            column =
                (this.kind === 'runner' ? 2 : 0) +
                (
                    moving > 0.05
                        ? Math.floor(this.age * 5) % 2
                        : 0
                );
        }

        // 6. Select the correct running atlas


        const runAtlas =
            this.kind === 'rin' &&
            this.state === 'run'
                ? this.runAtlases[this.direction]
                : null;

        const useRunAtlas = runAtlas !== null;

        // Eight running frames, 12 FPS
        const runFrame =
            Math.floor(this.age * SpriteConfig.runFPS) % 8;

        const atlasFrame =
            this.direction *
            (useAction ? 5 : 4) +
            column;

        const useBossAnimation=this.kind==='boss'&&this.bossAnimationAtlas!==null;
        const useBossWalk = this.kind === 'boss' && (this.bossWalkAtlas !== null || useBossAnimation);
        const bossFrame = this.terminal ? 0 : useBossAnimation
            ? (this.running ? 4 + Math.floor(this.bossWalkTime * 10 + 1e-8) % 4 : Math.floor(this.age * 10 + 1e-8) % 4)
            : this.running ? Math.floor(this.bossWalkTime * 10 + 1e-8) % 8 : 0;
        const nextFrame =
            this.kind === 'boss' ? (useBossWalk ? bossFrame : 0) : useRunAtlas
                ? runFrame
                : atlasFrame;

        const nextTextureKey =
            useBossAnimation ? 'boss-red' : useBossWalk ? 'boss-walk' : useAction
                ? 'actions'
                : useRunAtlas
                    ? `run-${this.direction}`
                    : 'locomotion';

        // 7. Apply selected texture and frame
        if (
            nextFrame !== this.frame ||
            nextTextureKey !== this.textureKey
        ) {

            this.frame = nextFrame;
            this.textureKey = nextTextureKey;

            const selectedTexture =
                useBossAnimation ? this.bossAnimationAtlas! : useBossWalk ? this.bossWalkAtlas! : useAction
                    ? this.actions!
                    : useRunAtlas
                        ? runAtlas!
                        : this.texture;

            if (this.material.getProperty('mainTexture') !== selectedTexture) {
                this.material.setProperty('mainTexture', selectedTexture);
            }

            let left: number;
            let right: number;
            let top: number;
            let bottom: number;

            if (this.kind === 'boss') {
                if (useBossWalk) {
                    // Separate measured columns for the supplied idle and walk rows; retain the legacy atlas fallback.
                    const columns = BOSS_WALK_COLUMNS;
                    const rows = BOSS_WALK_ROWS;
                    const c = bossFrame % 4, r = Math.floor(bossFrame / 4);
                    const crop = useBossAnimation ? BOSS_CROPS[bossFrame] : null;
                    left = ((crop ? crop[0] : columns[c]) + .5) / selectedTexture.width;
                    right = ((crop ? crop[2] : columns[c + 1]) - .5) / selectedTexture.width;
                    top = ((crop ? crop[1] : rows[r]) + .5) / selectedTexture.height;
                    bottom = ((crop ? crop[3] : rows[r + 1]) - .5) / selectedTexture.height;
                } else {
                    left = top = 0;
                    right = bottom = 1;
                }
            } else if(this.dedicatedEnemyAtlas&&this.kind==='runner'){
                const crop=RUNNER_CROPS[this.direction][column];
                left=crop[0]/selectedTexture.width;right=crop[2]/selectedTexture.width;
                top=crop[1]/selectedTexture.height;bottom=crop[3]/selectedTexture.height;
            } else if(this.dedicatedEnemyAtlas){
                const crop=BRUTE_CROPS[this.direction][column];
                left=(crop[0]+.5)/selectedTexture.width;right=(crop[2]-.5)/selectedTexture.width;
                top=(crop[1]+.5)/selectedTexture.height;bottom=(crop[3]-.5)/selectedTexture.height;
            } else if (useRunAtlas) {

                // Eight equal-width frames in one row.
                left = runFrame / 8;
                right = (runFrame + 1) / 8;

                top = 0;
                bottom = 1;

            } else {

                // Original idle/action/zombie atlas layout
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
                    ? [
                        0,
                        295,
                        603,
                        882,
                        1094,
                        1402,
                    ]
                    : [
                        0,
                        width / 4,
                        width / 2,
                        width * 3 / 4,
                        width,
                    ];

                left =
                    (columns[column] + 1) / width;

                right =
                    (columns[column + 1] - 1) / width;

                top =
                    (rows[this.direction] + 1) / height;

                bottom =
                    (rows[this.direction + 1] - 1) / height;
            }

            this.uv.set(right - left, bottom - top, left, top);
            this.material.setProperty('tilingOffset', this.uv);

            // Restore source aspect ratio and account for transparent padding.
            // Actions retain their crouched/dead heights relative to a standing pose.
            const referenceHeight = this.dedicatedEnemyAtlas?(this.kind==='brute'?208:190):this.kind === 'boss' ? (useBossAnimation ? 140 : useBossWalk ? 400 : selectedTexture.height) : useRunAtlas ? RUN_HEIGHT[this.direction]
                : useAction ? ACTION_HEIGHT[this.direction]
                : this.kind === 'rin' ? RIN_HEIGHT[this.direction]
                : ENEMY_HEIGHT[this.kind === 'runner' ? 1 : 0][this.direction];
            const feet = this.dedicatedEnemyAtlas?(this.kind==='brute'?(BRUTE_CROPS[this.direction][column][3]-BRUTE_CROPS[this.direction][column][1]-1):(RUNNER_CROPS[this.direction][column][3]-RUNNER_CROPS[this.direction][column][1]-1)):this.kind === 'boss' ? (useBossAnimation ? (bossFrame<4?146:[144,145,145,144][bossFrame-4]) : useBossWalk ? [431,431,429,430,411,413,411,413][bossFrame] : selectedTexture.height) : useRunAtlas ? RUN_FEET[this.direction][runFrame]
                : useAction ? ACTION_FEET[this.direction][column]
                : this.kind === 'rin' ? RIN_FEET[this.direction][column]
                : ENEMY_FEET[this.direction][column];
            const pixelWidth = (right - left) * selectedTexture.width;
            const pixelHeight = (bottom - top) * selectedTexture.height;
            this.width = pixelWidth / referenceHeight * this.size;
            this.height = pixelHeight / referenceHeight * this.size;
            // Non-running cells have a one-pixel inset on each edge.
            this.footPadding = Math.max(0, pixelHeight - feet + (useRunAtlas || this.kind === 'boss' ? 0 : 1))
                / referenceHeight * this.size;
            if (useBossAnimation) {
                const crop = BOSS_CROPS[bossFrame];
                this.footPadding = (crop[3] - .5 - crop[5]) / referenceHeight * this.size;
                this.pivotOffset = ((crop[0] + crop[2]) / 2 - crop[4]) / referenceHeight * this.size;
            }
        }

        // 8. Face the camera
        this.root.setWorldRotation(
            this.camera.worldRotation,
        );

        // 9. No synthetic bob: motion comes from the actual artwork.

        // 10. Dodge/death scaling
        let scaleY = 1;

        if (
            !useAction &&
            this.state === 'dodge'
        ) {
            scaleY = 0.72;
        }

        if (
            !useAction &&
            this.state === 'die'
        ) {
            scaleY = 0.18;
        }

        this.root.setScale(this.width, this.height * scaleY, 1);
        // Offset along billboard up, not world Y, so visible feet meet the actor origin.
        this.offset.set(this.pivotOffset, -this.footPadding * scaleY, 0);
        Vec3.transformQuat(this.offset, this.offset, this.camera.worldRotation);
        Vec3.add(this.offset, this.offset, this.actor.worldPosition);
        this.root.setWorldPosition(this.offset);

        // 11. Damage color
        this.material.setProperty(
            'mainColor',
            this.state === 'hurt'
                ? this.hurtColor
                : this.normalColor,
        );
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        // Parent teardown may already have destroyed the child MeshRenderer.
        // Its mesh setter touches engine arrays cleared during destruction.
        // Destroy the owned node instead; never mutate a renderer during teardown.
        if (isValid(this.root, true)) this.root.destroy();
        this.mesh.destroy();
        this.material.destroy();
    }
}
