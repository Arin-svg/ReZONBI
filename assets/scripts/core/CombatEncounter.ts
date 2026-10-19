import { _decorator, Camera, Component, game, Game, Node } from 'cc';
import { CombatConfig as C, SurvivalConfig as S } from './GameConfig';
import { Obstacle } from './MovementMath';
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
import { overlaps } from './MovementMath';
import { DamageNumbers } from '../ui/DamageNumbers';
const { ccclass } = _decorator;
export type EncounterState = 'playing' | 'victory' | 'defeat';

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
    numbers!: DamageNumbers;
    targets(): readonly ZombieBase[] { return this.bossSpawned ? [...this.spawner.enemies, this.boss] : this.spawner.enemies; }
    nextHit(): number { return ++this.hitId; }
    private hitId = 0;
    initialize(player: PlayerController, geometry: GeometryFactory, obstacles: readonly Obstacle[]): void {
        this.player = player; this.health = player.node.addComponent(PlayerHealth); this.combat = player.node.addComponent(PlayerCombat);
        this.numbers = new DamageNumbers(this.node.parent!.getChildByName('Mobile Canvas')!.getChildByName('Safe area')!, this.node.parent!.getChildByName('Main Camera')!.getComponent(Camera)!);
        const effectRoot = new Node('Combat Effects'); this.node.addChild(effectRoot); this.effects = new CombatEffects(effectRoot, geometry);
        const enemyRoot = new Node('Infected'); this.node.addChild(enemyRoot);
        const pickupRoot = new Node('EXP crystals'); this.node.addChild(pickupRoot);
        this.pickups = new ExperiencePickups(pickupRoot, geometry, obstacles);
        this.spawner = new ZombieSpawner(enemyRoot, geometry, {
            player: player.node, health: this.health, obstacles, navigation: new ArenaNavigation(obstacles, C.enemyRadius),
            effects: this.effects, peers: () => this.spawner?.enemies ?? [], nextHit: () => ++this.hitId,
            onHit: (enemy, amount) => this.numbers.show(enemy.position, `${Math.round(amount)}`),
            onDeath: (enemy, hit) => {
                this.kills++; this.pickups.drop(enemy.position, enemy.kind === 'runner' ? S.runnerXP : S.walkerXP);
                const healed = hit.source === 'Rin' ? this.health.state.heal(this.progression.rank('blood') * 3) : 0;
                if (healed) { this.effects.impact(player.node.position, '#73E6A4'); this.numbers.show(player.node.position, `+${healed} HP`, '#73E6A4'); }
            },
        });
        const bossNode = new Node('Signal Tyrant'); this.node.addChild(bossNode); this.boss = bossNode.addComponent(SignalTyrant);
        this.boss.initializeBoss({ x: 0, z: -12 }, {
            player: player.node, health: this.health, obstacles, navigation: new ArenaNavigation(obstacles, .95),
            effects: this.effects, peers: () => [], nextHit: () => this.nextHit(),
            onHit: (enemy, amount) => this.numbers.show(enemy.position, `${Math.round(amount)}`, '#FF92C3'),
            onDeath: enemy => { this.kills++; this.pickups.drop(enemy.position, S.bossXP); },
        }, geometry);
        this.boss.summon = () => { this.spawner.spawn(this.elapsed); this.spawner.spawn(this.elapsed); };
        this.combat.context = { player, health: this.health, effects: this.effects, obstacles,
            enemies: () => this.targets(), canAct: () => this.state === 'playing' && !this.paused && !this.selecting && !this.health.dead,
            nextHit: () => ++this.hitId, pause: () => this.togglePause(),
            rank: id => this.progression.rank(id), onAction: kind => {
                this.noise.emit(kind, player.node.position, this.spawner.enemies);
                if (kind === 'dodge') this.skills.afterimage();
            },
        };
        this.health.canReceive = () => this.state === 'playing' && !this.paused && !this.selecting;
        this.health.onDamaged = dead => {
            player.visual?.play(dead ? 'die' : 'hurt', dead ? 0.65 : 0.18);
            if (dead) { player.dead = true; player.clearInput(); this.combat.clearInput(); this.state = 'defeat'; player.joystick!.enabled = false; }
        };
        this.hud = new CombatHUD(this.node.parent!, this);
        this.selection = new SkillSelectionUI(this.node.parent!.getChildByName('Mobile Canvas')!.getChildByName('Safe area')!, this.progression, id => this.chooseSkill(id));
        this.skills = new SkillEffects(effectRoot, geometry, this);
    }
    onEnable(): void { game.on(Game.EVENT_HIDE, this.onHide, this); }
    onDisable(): void { game.off(Game.EVENT_HIDE, this.onHide, this); }
    private onHide(): void { if (this.spawner && this.state === 'playing' && !this.paused) this.togglePause(); }
    togglePause(): void {
        if (this.state !== 'playing' || this.selecting) return;
        this.paused = !this.paused; this.player.paused = this.paused;
        this.player.clearInput(); this.combat.clearInput(); this.hud.clearTouches();
        this.player.joystick!.enabled = !this.paused; this.hud.refresh();
    }
    restart(): void {
        this.selecting = false; this.progression.reset(); this.pickups.reset(); this.selection.refresh(false); this.skills.reset();
        this.elapsed = this.kills = 0;
        this.noise.reset(); this.bossSpawned = false; this.boss.hide();
        this.numbers.reset();
        this.state = 'playing'; this.paused = false; this.player.reset(); this.health.state.reset(); this.combat.reset();
        this.spawner.reset(); this.effects.reset(); this.hud.clearTouches(); this.player.joystick!.enabled = true; this.hud.refresh();
    }
    lateUpdate(frameDt: number): void {
        if (!this.spawner) return;
        const dt = Math.min(frameDt, 0.1);
        if (!this.paused && !this.selecting) {
            if (this.state === 'playing') {
                this.elapsed += dt; this.noise.tick(dt);
                // Ordinary survival spawning ends at the boss. Noise reinforcements and summons retain the same cap.
                if (!this.bossSpawned || this.noise.pressure >= 60) this.spawner.tick(dt, this.elapsed, this.noise.pressure);
                if (!this.bossSpawned && this.elapsed >= S.bossTime) this.spawnBoss();
                this.health.state.tick(dt); this.combat.tick(dt);
                this.skills.tick(dt);
                for (const enemy of this.spawner.enemies) { if (this.health.dead) break; enemy.tick(dt); }
                if (this.bossSpawned && !this.health.dead) this.boss.tick(dt);
                this.pickups.tick(dt, this.player.node.position, 3 + this.progression.rank('magnet') * 1.2, .7 + this.progression.rank('magnet') * .15, xp => {
                    this.progression.addXP(xp); this.numbers.show(this.player.node.position, `+${xp} EXP`, '#55D9EF'); this.effects.impact(this.player.node.position, '#55D9EF');
                });
                if (!this.health.dead && this.progression.pending) this.openSelection();
                if (!this.health.dead && this.bossSpawned && this.boss.dead) {
                    this.selecting = false; this.selection.refresh(false);
                    this.state = 'victory'; this.player.clearInput(); this.combat.clearInput(); this.player.paused = true; this.player.joystick!.enabled = false;
                    this.player.visual?.play('victory', 3600); this.player.visual?.animate(0, 0);
                }
            } else { this.spawner.enemies.forEach(e => e.tickDeath(dt)); if (this.bossSpawned) this.boss.tickDeath(dt); }
            this.effects.tick(dt);
            this.numbers.tick(dt);
        }
        this.hud.refresh(dt);
    }
    spawnBoss(): void {
        const player = this.player.node.position, obstacles = this.player.obstacles;
        const positions = [{ x: 0, z: -12 }, { x: 0, z: 10 }, { x: -12, z: 0 }, { x: 12, z: 0 }];
        const p = positions.find(q => Math.hypot(q.x - player.x, q.z - player.z) >= 7 && !obstacles.some(o => overlaps(q, 1.2, o)));
        if (!p) return;
        this.bossSpawned = true; this.boss.resetBoss(p);
    }
    openSelection(): void {
        this.progression.roll(); this.selecting = this.progression.offers.length > 0;
        if (!this.selecting) return;
        this.player.paused = true; this.player.clearInput(); this.combat.clearInput(); this.hud.clearTouches();
        this.player.joystick!.enabled = false; this.selection.refresh(true);
    }
    chooseSkill(id: SkillId): void {
        if (!this.selecting || !this.progression.choose(id)) return;
        this.selecting = false; this.selection.refresh(false);
        if (this.progression.pending) this.openSelection();
        this.player.paused = this.paused || this.selecting; this.player.clearInput(); this.combat.clearInput();
        this.player.joystick!.enabled = !this.player.paused; this.hud.refresh();
    }
}
