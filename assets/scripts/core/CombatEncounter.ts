import { AudioManager } from '../systems/AudioManager';

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
import { GameUI } from '../ui/GameUI';
import { EndlessCity } from '../levels/EndlessCity';
import { CITY, originShift } from '../levels/CityChunkMath';
import { IsometricCamera } from '../camera/IsometricCamera';

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
    ui!: GameUI;
    world:EndlessCity|null=null;
    private worldCamera:Camera|null=null;
    private bossPlacement:ArenaNavigation|null=null;
    restoreWorld(state:ReturnType<EndlessCity['capture']>|undefined):void {
        this.world?.restore(state,this.player.node.position);
        this.worldCamera?.node.getComponent(IsometricCamera)?.resetFocus();
    }

    private updateWorld():void {
        if(!this.world)return;
        const shift=originShift(this.player.node.position);
        if(shift.x||shift.z){
            const p=this.player.node.position;this.player.node.setPosition(p.x-shift.x,p.y,p.z-shift.z);
            for(const enemy of this.spawner.enemies)enemy.rebase(shift.x,shift.z);
            for(const boss of this.bosses)boss.rebase(shift.x,shift.z);
            this.effects.rebase(shift.x,shift.z);this.pickups.rebase(shift.x,shift.z);this.skills.rebase(shift.x,shift.z);this.numbers.rebase(shift.x,shift.z);
            this.worldCamera?.node.getComponent(IsometricCamera)?.rebase(shift.x,shift.z);
            this.world.rebase(shift,this.player.node.position);
        }else this.world.sync(this.player.node.position);
        // Projection queries this frame must see the rebased camera, not last frame's matrices.
        this.worldCamera?.camera?.update();
        for(const enemy of this.spawner.enemies)if(enemy.active&&Math.hypot(enemy.position.x-this.player.node.position.x,enemy.position.z-this.player.node.position.z)>CITY.retireDistance&&(!this.worldCamera||!this.world.visible(enemy.position,this.worldCamera)))enemy.node.active=false;
    }

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
        this.worldCamera=camera;

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
                    AudioManager.instance?.playSfx('zombie_hit');
                    this.numbers.show(
                        enemy.position,
                        `${Math.round(amount)}`
                    );
                },

                onDeath: (enemy, hit) => {
                    AudioManager.instance?.playSfx('zombie_death');

                    this.kills++;
                    this.spawner.regularKilled();

                    this.pickups.drop(
                        enemy.position,
                        enemy.kind === 'brute' ? S.bruteXP : enemy.kind === 'runner'
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
                        AudioManager.instance?.playSfx('bloodlust');

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

        this.spawner.endless=!!this.world;
        if(this.world)this.spawner.visible=p=>this.world!.visible(p,camera);
        this.bossPlacement=new ArenaNavigation(obstacles,1.2);
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
                        AudioManager.instance?.playSfx('boss_defeat');

                        this.kills++;

                        this.pickups.drop(
                            enemy.position,
                            S.bossXP
                        );
                    if(!this.bosses.some(boss=>boss.active&&!boss.dead))this.spawner.bossDefeated();
                    this.ui?.notify('Area Cleared','Tyrant defeated. Survival continues.');
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
                AudioManager.instance?.playSfx({pistol:'gunshot',knife:'melee_slash',dodge:'dodge'}[kind]);

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
            AudioManager.instance?.playSfx(dead?'rin_death':'rin_hurt');
            if(!dead && this.health.state.current/this.health.state.maximum<=.25)AudioManager.instance?.playSfx('low_hp');

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
            this,
            camera
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
        this.ui = new GameUI(this);
        this.spawner.onRush=()=>this.ui?.notify('Zombie Rush!','Incoming infected. Keep moving!');

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

        if (this.ui?.routePause()) return;

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
        this.world?.reset();

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
        this.worldCamera?.node.getComponent(IsometricCamera)?.resetFocus();
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
        this.updateWorld();

        const dt = Math.min(frameDt, 0.1);

        if (!this.paused && !this.selecting) {

            if (this.state === 'playing') {

                this.elapsed += dt;

                this.noise.tick(dt);

                this.spawner.tick(
                    dt,
                    this.elapsed,
                    this.noise.pressure,
                    this.bosses.some(boss=>boss.active&&!boss.dead)
                );

                if (this.spawner.bossReady) this.spawnBoss();

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

                        const oldLevel=this.progression.level;
                        this.progression.addXP(xp);
                        AudioManager.instance?.playSfx(this.progression.level>oldLevel?'level_jingle':'exp_pickup');

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
        this.ui?.tick(dt);
    }

    restoreBossCheckpoint(states:{x:number;z:number;hp:number;strength:number}[]):void {
        for(const state of states){const boss=this.bosses.find(b=>!b.active)??this.createBoss();boss.resetBoss(state,state.strength);boss.health.current=state.hp;this.boss=boss;}
        this.bossSpawned=this.bossCount>0;
    }

    spawnBoss(): void {
        if(this.paused||this.selecting||this.state!=='playing'||!this.spawner.bossReady)return;

        const player =
            this.player.node.position;

        const obstacles =
            this.player.obstacles;

        const positions = this.world ? [12,18,24].reduce((points,r)=>{
            for(let i=0;i<16;i++){const a=i*Math.PI/8;points.push({x:player.x+Math.cos(a)*r,z:player.z+Math.sin(a)*r});}return points;
        },[] as {x:number;z:number}[]) : [
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
                    this.world?2.3:1.2,
                    obstacle
                )
            ) && (!this.world||!!this.bossPlacement?.path(p,player).length)
        );

        if (!position) return;

        this.bossSpawned = true;

        this.boss = this.bosses.find(boss => !boss.active) ?? this.createBoss();
        const strength = Math.pow(S.bossStrengthMultiplier, this.bossCount);
        this.boss.resetBoss(position, strength);
        this.bossCount++;
        this.spawner.bossStarted();
        AudioManager.instance?.playSfx('boss_spawn');
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

        AudioManager.instance?.playSfx('upgrade_selected');
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
