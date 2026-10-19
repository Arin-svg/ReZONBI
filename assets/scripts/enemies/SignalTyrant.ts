import { _decorator, Node } from 'cc';
import { GameConfig } from '../core/GameConfig';
import { moveAndSlide, PointXZ } from '../core/MovementMath';
import { GeometryFactory } from '../levels/GeometryFactory';
import { ArenaNavigation } from '../systems/ArenaNavigation';
import { clearLine, distance } from '../systems/CombatMath';
import { DamageHit, HealthState } from '../systems/DamageSystem';
import { ZombieBase, ZombieContext } from './ZombieBase';
const { ccclass } = _decorator;
type BossStage = 'arrival' | 'approach' | 'slamWarning' | 'chargeWarning' | 'charge' | 'recovery';

@ccclass('SignalTyrant')
export class SignalTyrant extends ZombieBase {
    stage: BossStage = 'arrival';
    phase = 1;
    timer = 2;
    private bossContext!: ZombieContext;
    private body!: Node;
    private core!: Node;
    private warning!: Node;
    private lane!: Node;
    private nav!: ArenaNavigation;
    private route: PointXZ[] = [];
    private repathTime = 0;
    private aim = { x: 0, z: 1 };
    private attackOrigin = { x: 0, z: 0 };
    private attacked = false;
    private turns = 0;
    private plates: Node[] = [];
    private geometry!: GeometryFactory;
    summon: () => void = () => {};
    initializeBoss(p: PointXZ, context: ZombieContext, g: GeometryFactory): void {
        this.bossContext = context; this.nav = new ArenaNavigation(context.obstacles, .95);
        this.geometry = g;
        super.initialize('walker', p, context, g);
        this.node.getChildByName('Zombie Visual')!.active = false;
        const inheritedSprite=this.node.getChildByName('Enemy world sprite');if(inheritedSprite)inheritedSprite.active=false;
        this.node.getChildByName('Health background')!.active = false;
        this.node.getChildByName('Enemy health')!.active = false;
        this.body = new Node('Tyrant mutated silhouette'); this.node.addChild(this.body);
        g.part(this.body, 'Mutated torso', '#352D46', 0, 1.55, 0, 1.5, 1.7, 1.1, true);
        g.part(this.body, 'Armoured head', '#635469', 0, 2.65, -.2, .8, .8, .7, true);
        this.core = g.part(this.body, 'Signal core', '#FF427E', 0, 1.7, -.65, .55, .75, .22, true);
        g.glow(this.core, '#FF427E', .7);
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
            const plate = g.form(this.body, 'Obsidian crystal plate', '#4D3655', side * (.5 + i * .28), 2.3 - i * .2, .2, .6, 1.05, .55, 'cone');
            plate.setRotationFromEuler(0, 0, side * (-20 - i * 15)); this.plates.push(plate);
            const shard = g.form(this.body, 'Signal crystal', '#D9468C', side * (.45 + i * .2), 2.65 - i * .14, .25, .18, .75, .2, 'cone'); g.glow(shard, '#D9468C', .35);
        }
        for (const side of [-1, 1]) {
            g.part(this.body, 'Oversized arm', '#443B51', side * 1.05, 1.25, 0, .65, 1.8, .65, true);
            g.part(this.body, 'Claw', '#A191AA', side * 1.05, .48, -.25, .6, .35, .7);
            g.part(this.body, 'Heavy leg', '#292536', side * .48, .45, .1, .6, .9, .7);
            g.part(this.body, 'Antenna growth', '#D84A63', side * .6, 2.65, .3, .12, 1.2, .12);
        }
        // Warnings are children of the arena root so facing changes cannot move a locked telegraph.
        this.warning = g.form(this.node.parent!, 'Tyrant slam telegraph', '#FF528A', 0, .09, 0, 6.4, 1, 6.4, 'ring'); g.glow(this.warning, '#FF528A', .7);
        this.lane = g.part(this.node.parent!, 'Tyrant charge telegraph', '#D84A63', 0, .1, 0, 1.8, .025, 8);
        this.resetBoss(p); this.node.active = false;
    }
    resetBoss(p: PointXZ): void {
        super.reset(p); this.health = new HealthState(1800); this.stage = 'arrival'; this.phase = 1; this.timer = 2;
        this.turns = this.repathTime = 0; this.route = []; this.attacked = false;
        if (this.body) this.body.setRotationFromEuler(0, 0, 0);
        if (this.warning) this.warning.active = this.lane.active = false;
    }
    receiveDamage(hit: DamageHit): boolean {
        if (!this.active || this.stage === 'arrival') return false;
        return super.receiveDamage({ ...hit, amount: hit.amount * (this.stage === 'recovery' ? 1.5 : 1) });
    }
    stun(_duration: number): void { /* Heavy boss resists stun; its recovery window stays predictable. */ }
    investigate(_p: PointXZ): void { /* Boss already tracks Rin. */ }
    tickDeath(dt: number): void {
        if (!this.dead) return;
        this.warning.active = this.lane.active = false;
        this.body.setRotationFromEuler(Math.min(88, this.body.eulerAngles.x + dt * 120), 0, 0);
        super.tickDeath(dt);
    }
    tick(dt: number): void {
        if (!this.active) return;
        if (this.dead) { this.tickDeath(dt); return; }
        const nextPhase = this.health.current <= this.health.maximum * .5 ? 2 : 1;
        if (nextPhase !== this.phase) { this.bossContext.effects.slash(this.position, { x: 0, z: 1 }, 3.6, 360); this.phase = nextPhase; }
        this.timer -= dt; this.health.tick(dt);
        this.core.setScale(.55 + Math.sin(this.timer * 8) * .06, .75, .22);
        this.geometry.glow(this.core, this.stage === 'recovery' ? '#FFE2F3' : this.phase === 2 ? '#FF318B' : '#FF427E', this.stage === 'recovery' ? 1 : .7);
        this.plates.forEach((p, i) => p.setScale(.6, this.phase === 2 ? 1.25 : 1.05, .55));
        const player = this.bossContext.player.position;
        if (this.stage === 'arrival') { if (this.timer <= 0) { this.stage = 'approach'; this.timer = 1.4; } return; }
        if (this.stage === 'approach') {
            this.repathTime -= dt;
            if (this.repathTime <= 0) { this.route = this.nav.path(this.position, player); this.repathTime = .6; }
            while (this.route.length && distance(this.position, this.route[0]) < .3) this.route.shift();
            if (this.route.length && distance(this.position, player) > 2.5) {
                const q = this.route[0], d = distance(q, this.position);
                this.moveBoss((q.x - this.position.x) / d * dt * 2.1, (q.z - this.position.z) / d * dt * 2.1);
            }
            if (this.timer <= 0) {
                this.turns++; this.attacked = false; this.attackOrigin = { x: this.position.x, z: this.position.z };
                const d = Math.max(.01, distance(this.position, player)); this.aim = { x: (player.x - this.position.x) / d, z: (player.z - this.position.z) / d };
                this.stage = distance(this.position, player) < 4 && this.turns % 2 ? 'slamWarning' : 'chargeWarning';
                this.timer = this.phase === 2 ? .85 : 1.1;
                if (this.stage === 'slamWarning') { this.warning.active = true; this.warning.setPosition(this.position.x, .09, this.position.z); }
                else {
                    this.lane.active = true; this.lane.setPosition(this.position.x + this.aim.x * 4, .1, this.position.z + this.aim.z * 4);
                    this.lane.setRotationFromEuler(0, Math.atan2(this.aim.x, this.aim.z) * 180 / Math.PI, 0);
                }
                if (this.phase === 2 && this.turns % 3 === 0) this.summon();
            }
        } else if (this.stage === 'slamWarning' && this.timer <= 0) {
            this.warning.active = false; this.bossContext.effects.slash(this.attackOrigin, this.aim, 3.2, 360);
            if (distance(this.attackOrigin, player) <= 3.2 && clearLine(this.attackOrigin, player, this.bossContext.obstacles)) this.hit(50);
            this.recover();
        } else if (this.stage === 'chargeWarning' && this.timer <= 0) {
            this.lane.active = false; this.stage = 'charge'; this.timer = .8;
        } else if (this.stage === 'charge') {
            // Substeps prevent skipping a player or thin wall during the charge.
            const steps = Math.max(1, Math.ceil(dt / .016));
            for (let i = 0; i < steps; i++) {
                const moved = this.moveBoss(this.aim.x * 10 * dt / steps, this.aim.z * 10 * dt / steps);
                if (!this.attacked && distance(this.position, player) <= 1.25 && clearLine(this.position, player, this.bossContext.obstacles)) { this.hit(40); this.attacked = true; }
                if (moved < .001) { this.timer = 0; break; }
            }
            if (this.timer <= 0) this.recover();
        } else if (this.stage === 'recovery' && this.timer <= 0) { this.stage = 'approach'; this.timer = this.phase === 2 ? .8 : 1.4; }
    }
    private hit(amount: number): void { this.bossContext.health.receiveDamage({ amount, id: this.bossContext.nextHit(), source: this.node.uuid, kind: 'melee' }); }
    private recover(): void { this.stage = 'recovery'; this.timer = this.phase === 2 ? 1.25 : 1.65; }
    private moveBoss(dx: number, dz: number): number {
        const p = moveAndSlide(this.position, dx, dz, .9, GameConfig.arenaHalfSize, this.bossContext.obstacles), moved = distance(p, this.position);
        this.node.setPosition(p.x, .06, p.z);
        if (moved > .001) this.node.setRotationFromEuler(0, Math.atan2(-dx, -dz) * 180 / Math.PI, 0);
        return moved;
    }
    hide(): void { this.node.active = false; this.warning.active = this.lane.active = false; }
}
