
import {
    _decorator,
    Camera,
    Component,
    game,
    Game,
    Node,
    Canvas,
    UITransform,
    Widget,
} from 'cc';

import { CombatConfig as C, SurvivalConfig as S } from './GameConfig';
import { Obstacle, overlaps } from './MovementMath';
import { ZombieSpawner } from '../enemies/ZombieSpawner';
import { GeometryFactory } from '../levels/GeometryFactory';
import { PlayerController } from '../player/PlayerController';
import { PlayerCombat } from '../player/PlayerCombat';
import { PlayerHealth } from '../player/PlayerHealth';
import { ArenaNavigation } from '../systems/ArenaNavigation';
import { CombatEffects } from '../systems/CombatEffects';
import { CombatHUD } from '../ui/CombatHUD';
import { Progression, SkillId } from '../systems/Progression';
import { ExperiencePickups } from '../systems/ExperiencePickups';
import { SkillSelectionUI } from '../ui/SkillSelectionUI';
import { SkillEffects } from '../systems/SkillEffects';
import { NoiseSystem } from '../systems/NoiseSystem';
import { SignalTyrant } from '../enemies/SignalTyrant';
import { ZombieBase } from '../enemies/ZombieBase';
import { DamageNumbers } from '../ui/DamageNumbers';

const { ccclass } = _decorator;

export type EncounterState =
    'playing' | 'defeat';

@ccclass('CombatEncounter')
export class CombatEncounter extends Component {

    state: EncounterState = 'playing';
    paused = false;

    player!: PlayerController;
    health!: PlayerHealth;
    combat!: PlayerCombat;
    spawner!: ZombieSpawner;
    effects!: CombatEffects;
    hud!: CombatHUD;

    readonly progression = new Progression();

    pickups!: ExperiencePickups;
    selection!: SkillSelectionUI;
    selecting = false;

    skills!: SkillEffects;

    elapsed = 0;
    kills = 0;

    readonly noise = new NoiseSystem();

    boss!: SignalTyrant;
    bossSpawned = false;
    bossCount = 0;
    readonly bosses: SignalTyrant[] = [];
    private createBoss!: () => SignalTyrant;

    numbers!: DamageNumbers;

    private hitId = 0;

    targets(): readonly ZombieBase[] {
        return this.bossSpawned
            ? [...this.spawner.enemies, ...this.bosses.filter(boss => boss.active)]
            : this.spawner.enemies;
    }

    nextHit(): number {
        return ++this.hitId;
    }

    /**
     * Find or create the UI hierarchy required
     * by the combat HUD, damage numbers and skills.
     */
    private ensureSafeArea(): Node {

        const root = this.node.parent;

        if (!root) {
            throw new Error(
                'CombatEncounter must have a parent node.'
            );
        }

        let canvasNode =
            root.getChildByName('Mobile Canvas');

        if (!canvasNode) {
            canvasNode = new Node('Mobile Canvas');
            root.addChild(canvasNode);

            canvasNode.addComponent(Canvas);

            const transform =
                canvasNode.getComponent(UITransform) ??
                canvasNode.addComponent(UITransform);

            transform.setContentSize(1280, 720);

            console.log(
                'CombatEncounter: Created Mobile Canvas.'
            );
        }

        let safeArea =
            canvasNode.getChildByName('Safe area');

        if (!safeArea) {
            safeArea = new Node('Safe area');
            canvasNode.addChild(safeArea);

            const transform =
                safeArea.addComponent(UITransform);

            transform.setContentSize(1280, 720);

            const widget =
                safeArea.addComponent(Widget);

            widget.isAlignLeft = true;
            widget.isAlignRight = true;
            widget.isAlignTop = true;
            widget.isAlignBottom = true;

            widget.left = 0;
            widget.right = 0;
            widget.top = 0;
            widget.bottom = 0;

            console.log(
                'CombatEncounter: Created Safe area.'
            );
        }

        return safeArea;
    }

    initialize(
        player: PlayerController,
        geometry: GeometryFactory,
        obstacles: readonly Obstacle[]
    ): void {

        this.player = player;

        this.health =
            player.node.getComponent(PlayerHealth) ??
            player.node.addComponent(PlayerHealth);

        this.combat =
            player.node.getComponent(PlayerCombat) ??
            player.node.addComponent(PlayerCombat);

        const root = this.node.parent;

        if (!root) {
            throw new Error(
                'CombatEncounter: Missing parent node.'
            );
        }

        const cameraNode =
            root.getChildByName('Main Camera') ??
            root.scene?.getChildByName('Main Camera');

        const camera =
            cameraNode?.getComponent(Camera);

        if (!camera) {
            throw new Error(
                'CombatEncounter: Main Camera is missing.'
            );
        }

        // Ensure required UI exists before creating
        // damage numbers and skill selection.
        const safeArea = this.ensureSafeArea();

        this.numbers = new DamageNumbers(
            safeArea,
            camera
        );

        // -------------------------------------
        // Combat effects
        // -------------------------------------

        const effectRoot =
            new Node('Combat Effects');

        this.node.addChild(effectRoot);

        this.effects =
            new CombatEffects(effectRoot, geometry);

        // -------------------------------------
        // Enemy and EXP containers
        // -------------------------------------

        const enemyRoot =
            new Node('Infected');

        this.node.addChild(enemyRoot);

        const pickupRoot =
            new Node('EXP crystals');

        this.node.addChild(pickupRoot);

        this.pickups = new ExperiencePickups(
            pickupRoot,
            geometry,
            obstacles
        );

        // -------------------------------------
        // Zombie spawner
        // -------------------------------------

        this.spawner = new ZombieSpawner(
            enemyRoot,
            geometry,
            {
                player: player.node,
                health: this.health,
                obstacles,

                navigation: new ArenaNavigation(
                    obstacles,
                    C.enemyRadius
                ),

                effects: this.effects,

                peers: () =>
                    this.spawner?.enemies ?? [],

                nextHit: () => ++this.hitId,

                onHit: (enemy, amount) => {
                    this.numbers.show(
                        enemy.position,
                        `${Math.round(amount)}`
                    );
                },

                onDeath: (enemy, hit) => {

                    this.kills++;

                    this.pickups.drop(
                        enemy.position,
                        enemy.kind === 'runner'
                            ? S.runnerXP
                            : S.walkerXP
                    );

                    const healed =
                        hit.source === 'Rin'
                            ? this.health.state.heal(
                                this.progression.rank('blood') * 3
                            )
                            : 0;

                    if (healed) {

                        this.effects.impact(
                            player.node.position,
                            '#73E6A4'
                        );

                        this.numbers.show(
                            player.node.position,
                            `+${healed} HP`,
                            '#73E6A4'
                        );
                    }
                },
            }
        );

        // -------------------------------------
        // Boss
        // -------------------------------------

        this.createBoss = () => {
            const bossNode =
                new Node('Signal Tyrant');

            this.node.addChild(bossNode);

            const boss =
                bossNode.addComponent(SignalTyrant);

            boss.initializeBoss(
                { x: 0, z: -12 },
                {
                    player: player.node,
                    health: this.health,
                    obstacles,

                    navigation: new ArenaNavigation(
                        obstacles,
                        0.95
                    ),

                    effects: this.effects,

                    peers: () => [],

                    nextHit: () => this.nextHit(),

                    onHit: (enemy, amount) => {
                        this.numbers.show(
                            enemy.position,
                            `${Math.round(amount)}`,
                            '#FF92C3'
                        );
                    },

                    onDeath: enemy => {

                        this.kills++;

                        this.pickups.drop(
                            enemy.position,
                            S.bossXP
                        );
                    },
                },
                geometry
            );

            boss.summon = () => {

                this.spawner.spawn(this.elapsed);
                this.spawner.spawn(this.elapsed);

            };

            this.bosses.push(boss);
            return boss;
        };
        this.boss = this.createBoss();

        // -------------------------------------
        // Player combat
        // -------------------------------------

        this.combat.context = {

            player,

            health: this.health,

            effects: this.effects,

            obstacles,

            enemies: () => this.targets(),

            canAct: () =>
                this.state === 'playing' &&
                !this.paused &&
                !this.selecting &&
                !this.health.dead,

            nextHit: () => ++this.hitId,

            pause: () => this.togglePause(),

            rank: id =>
                this.progression.rank(id),

            onAction: kind => {

                this.noise.emit(
                    kind,
                    player.node.position,
                    this.spawner.enemies
                );

                if (kind === 'dodge') {
                    this.skills.afterimage();
                }
            },
        };

        // -------------------------------------
        // Player health
        // -------------------------------------

        this.health.canReceive = () =>
            this.state === 'playing' &&
            !this.paused &&
            !this.selecting;

        this.health.onDamaged = dead => {

            player.visual?.play(
                dead ? 'die' : 'hurt',
                dead ? 0.65 : 0.18
            );

            if (dead) {

                player.dead = true;

                player.clearInput();
                this.combat.clearInput();

                this.state = 'defeat';

                if (player.joystick) {
                    player.joystick.enabled = false;
                }
            }
        };

        // -------------------------------------
        // Combat HUD and skill selection
        // -------------------------------------

        this.hud = new CombatHUD(
            root,
            this
        );

        this.selection = new SkillSelectionUI(
            safeArea,
            this.progression,
            id => this.chooseSkill(id)
        );

        this.skills = new SkillEffects(
            effectRoot,
            geometry,
            this
        );

        console.log(
            'CombatEncounter initialized successfully.'
        );
    }

    onEnable(): void {
        game.on(
            Game.EVENT_HIDE,
            this.onHide,
            this
        );
    }

    onDisable(): void {
        game.off(
            Game.EVENT_HIDE,
            this.onHide,
            this
        );
    }

    private onHide(): void {

        if (
            this.spawner &&
            this.state === 'playing' &&
            !this.paused
        ) {
            this.togglePause();
        }
    }

    togglePause(): void {

        if (
            this.state !== 'playing' ||
            this.selecting ||
            !this.spawner
        ) {
            return;
        }

        this.paused = !this.paused;

        this.player.paused = this.paused;

        this.player.clearInput();
        this.combat.clearInput();

        this.hud.clearTouches();

        if (this.player.joystick) {
            this.player.joystick.enabled =
                !this.paused;
        }

        this.hud.refresh();
    }

    restart(): void {

        if (!this.spawner) return;

        this.selecting = false;

        this.progression.reset();
        this.pickups.reset();
        this.selection.refresh(false);
        this.skills.reset();

        this.elapsed = 0;
        this.kills = 0;

        this.noise.reset();

        this.bossSpawned = false;
        this.bossCount = 0;
        this.bosses.forEach(boss => boss.hide());

        this.numbers.reset();

        this.state = 'playing';
        this.paused = false;

        this.player.reset();
        this.health.state.reset();
        this.combat.reset();

        this.spawner.reset();
        this.effects.reset();

        this.hud.clearTouches();

        if (this.player.joystick) {
            this.player.joystick.enabled = true;
        }

        this.hud.refresh();
    }

    lateUpdate(frameDt: number): void {

        if (!this.spawner) return;

        const dt = Math.min(frameDt, 0.1);

        if (!this.paused && !this.selecting) {

            if (this.state === 'playing') {

                this.elapsed += dt;

                this.noise.tick(dt);

                if (
                    !this.bossSpawned ||
                    this.noise.pressure >= 60 ||
                    !this.bosses.some(boss => boss.active && !boss.dead)
                ) {
                    this.spawner.tick(
                        dt,
                        this.elapsed,
                        this.noise.pressure
                    );
                }

                if (
                    this.elapsed + 1e-6 >= S.bossTime * (this.bossCount + 1)
                ) {
                    this.spawnBoss();
                }

                this.health.state.tick(dt);
                this.combat.tick(dt);
                this.skills.tick(dt);

                for (const enemy of this.spawner.enemies) {

                    if (this.health.dead) break;

                    enemy.tick(dt);
                }

                if (
                    this.bossSpawned &&
                    !this.health.dead
                ) {
                    for (const boss of this.bosses) {
                        if (this.health.dead) break;
                        boss.tick(dt);
                    }
                }

                this.pickups.tick(
                    dt,
                    this.player.node.position,
                    3 + this.progression.rank('magnet') * 1.2,
                    0.7 + this.progression.rank('magnet') * 0.15,
                    xp => {

                        this.progression.addXP(xp);

                        this.numbers.show(
                            this.player.node.position,
                            `+${xp} EXP`,
                            '#55D9EF'
                        );

                        this.effects.impact(
                            this.player.node.position,
                            '#55D9EF'
                        );
                    }
                );

                if (
                    !this.health.dead &&
                    this.progression.pending
                ) {
                    this.openSelection();
                }

            } else {

                this.spawner.enemies.forEach(
                    enemy => enemy.tickDeath(dt)
                );

                if (this.bossSpawned) {
                    this.bosses.filter(boss => boss.active).forEach(boss => boss.tickDeath(dt));
                }
            }

            this.effects.tick(dt);
            this.numbers.tick(dt);
        }

        this.hud.refresh(dt);
    }

    spawnBoss(): void {

        const player =
            this.player.node.position;

        const obstacles =
            this.player.obstacles;

        const positions = [
            { x: 0, z: -12 },
            { x: 0, z: 10 },
            { x: -12, z: 0 },
            { x: 12, z: 0 },
        ];

        const position = positions.find(p =>
            Math.hypot(
                p.x - player.x,
                p.z - player.z
            ) >= 7 &&
            !obstacles.some(
                obstacle => overlaps(
                    p,
                    1.2,
                    obstacle
                )
            )
        );

        if (!position) return;

        this.bossSpawned = true;

        this.boss = this.bosses.find(boss => !boss.active) ?? this.createBoss();
        const strength = Math.pow(S.bossStrengthMultiplier, this.bossCount);
        this.bossCount++;
        this.boss.resetBoss(position, strength);
    }

    openSelection(): void {

        this.progression.roll();

        this.selecting =
            this.progression.offers.length > 0;

        if (!this.selecting) return;

        this.player.paused = true;

        this.player.clearInput();
        this.combat.clearInput();

        this.hud.clearTouches();

        if (this.player.joystick) {
            this.player.joystick.enabled = false;
        }

        this.selection.refresh(true);
    }

    chooseSkill(id: SkillId): void {

        if (
            !this.selecting ||
            !this.progression.choose(id)
        ) {
            return;
        }

        this.selecting = false;

        this.selection.refresh(false);

        if (this.progression.pending) {
            this.openSelection();
        }

        this.player.paused =
            this.paused || this.selecting;

        this.player.clearInput();
        this.combat.clearInput();

        if (this.player.joystick) {
            this.player.joystick.enabled =
                !this.player.paused;
        }

        this.hud.refresh();
    }
}
