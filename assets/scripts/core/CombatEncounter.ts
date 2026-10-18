import { _decorator, Component, game, Game, Node } from 'cc';
import { CombatConfig as C } from './GameConfig';
import { Obstacle } from './MovementMath';
import { ZombieSpawner } from '../enemies/ZombieSpawner';
import { GeometryFactory } from '../levels/GeometryFactory';
import { PlayerController } from '../player/PlayerController';
import { PlayerCombat } from '../player/PlayerCombat';
import { PlayerHealth } from '../player/PlayerHealth';
import { ArenaNavigation } from '../systems/ArenaNavigation';
import { CombatEffects } from '../systems/CombatEffects';
import { CombatHUD } from '../ui/CombatHUD';
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
    private hitId = 0;
    initialize(player: PlayerController, geometry: GeometryFactory, obstacles: readonly Obstacle[]): void {
        this.player = player; this.health = player.node.addComponent(PlayerHealth); this.combat = player.node.addComponent(PlayerCombat);
        const effectRoot = new Node('Combat Effects'); this.node.addChild(effectRoot); this.effects = new CombatEffects(effectRoot, geometry);
        const enemyRoot = new Node('Infected'); this.node.addChild(enemyRoot);
        this.spawner = new ZombieSpawner(enemyRoot, geometry, {
            player: player.node, health: this.health, obstacles, navigation: new ArenaNavigation(obstacles, C.enemyRadius),
            effects: this.effects, peers: () => this.spawner?.enemies ?? [], nextHit: () => ++this.hitId,
        });
        this.combat.context = { player, health: this.health, effects: this.effects, obstacles,
            enemies: () => this.spawner.enemies, canAct: () => this.state === 'playing' && !this.paused && !this.health.dead,
            nextHit: () => ++this.hitId, pause: () => this.togglePause(),
        };
        this.health.canReceive = () => this.state === 'playing' && !this.paused;
        this.health.onDamaged = dead => {
            player.visual?.play(dead ? 'die' : 'hurt', dead ? 0.65 : 0.18);
            if (dead) { player.dead = true; player.clearInput(); this.combat.clearInput(); this.state = 'defeat'; player.joystick!.enabled = false; }
        };
        this.hud = new CombatHUD(this.node.parent!, this);
    }
    onEnable(): void { game.on(Game.EVENT_HIDE, this.onHide, this); }
    onDisable(): void { game.off(Game.EVENT_HIDE, this.onHide, this); }
    private onHide(): void { if (this.spawner && this.state === 'playing' && !this.paused) this.togglePause(); }
    togglePause(): void {
        if (this.state !== 'playing') return;
        this.paused = !this.paused; this.player.paused = this.paused;
        this.player.clearInput(); this.combat.clearInput(); this.hud.clearTouches();
        this.player.joystick!.enabled = !this.paused; this.hud.refresh();
    }
    restart(): void {
        this.state = 'playing'; this.paused = false; this.player.reset(); this.health.state.reset(); this.combat.reset();
        this.spawner.reset(); this.effects.reset(); this.hud.clearTouches(); this.player.joystick!.enabled = true; this.hud.refresh();
    }
    lateUpdate(frameDt: number): void {
        if (!this.spawner) return;
        const dt = Math.min(frameDt, 0.1);
        if (!this.paused) {
            if (this.state === 'playing') {
                this.health.state.tick(dt); this.combat.tick(dt);
                for (const enemy of this.spawner.enemies) { if (this.health.dead) break; enemy.tick(dt); }
                if (!this.health.dead && this.spawner.alive === 0) {
                    this.state = 'victory'; this.player.clearInput(); this.combat.clearInput(); this.player.paused = true; this.player.joystick!.enabled = false;
                }
            } else this.spawner.enemies.forEach(e => e.tickDeath(dt));
            this.effects.tick(dt);
        }
        this.hud.refresh(dt);
    }
}
