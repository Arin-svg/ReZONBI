import { AudioManager } from '../systems/AudioManager';
import { Node } from 'cc';
import { CombatConfig as C, enemyHealthMultiplier, SurvivalConfig as S } from '../core/GameConfig';
import { overlaps, PointXZ } from '../core/MovementMath';
import { GeometryFactory } from '../levels/GeometryFactory';
import { distance } from '../systems/CombatMath';
import { ZombieBase, ZombieContext, ZombieKind } from './ZombieBase';

/** Bounded reusable population. A dying node finishes its animation before reuse. */
export class ZombieSpawner {
    readonly enemies: ZombieBase[] = [];
    private candidates: PointXZ[] = [];
    endless = false;
    visible:((p:PointXZ)=>boolean)|null=null;
    private cooldown = S.baseSpawnInterval;
    onRush: (()=>void)|null = null;
    nextRushWave = S.rushEveryWaves;
    rushRemaining = 0;
    wave = 1;
    waveSpawned = 0;
    spawnedSinceBoss = 0;
    nextBossWave = S.bossEveryWaves;
    get exactSpawnBudget():number {return Math.min(Number.MAX_SAFE_INTEGER,S.baseSpawnBudget*Math.pow(S.waveGrowth,this.wave-1));}
    get waveSpawnBudget():number {return Math.max(1,Math.ceil(this.exactSpawnBudget));}
    get bossReady():boolean {return this.wave>=this.nextBossWave&&this.spawnedSinceBoss>=S.bossSpawnThreshold;}
    spawnInterval(elapsed:number,pressure=0):number {
        return Math.max(S.minSpawnInterval,S.baseSpawnInterval/Math.pow(S.waveFrequencyGrowth,this.wave-1)/(1+S.spawnGrowthPerMinute*Math.max(0,elapsed)/60)*(pressure>=60?.65:1));
    }
    get speedMultiplier():number {return Math.min(S.maxSpeedMultiplier,Math.pow(S.speedGrowth,Math.floor(this.wave/S.speedEveryWaves)));}
    private applySpeed():void {for(const e of this.enemies)e.stats={...e.stats,speed:C[e.kind].speed*this.speedMultiplier};}
    private nextWave():void {this.wave++;this.waveSpawned=0;this.applySpeed();AudioManager.instance?.playSfx('horde_warning');}
    bossStarted():void {this.spawnedSinceBoss=0;this.nextBossWave+=S.bossEveryWaves;}
    bossDefeated():void {this.nextWave();}
    captureWaves(){return {wave:this.wave,waveSpawned:this.waveSpawned,spawnedSinceBoss:this.spawnedSinceBoss,nextBossWave:this.nextBossWave,cooldown:this.cooldown,nextRushWave:this.nextRushWave,rushRemaining:this.rushRemaining};}
    restoreWaves(state:(Omit<ReturnType<ZombieSpawner['captureWaves']>,'nextRushWave'|'rushRemaining'>&{nextRushWave?:number; rushRemaining?:number})|undefined,bossCount:number,bossAlive:boolean):void {
        if(state){this.wave=state.wave;this.waveSpawned=state.waveSpawned;this.spawnedSinceBoss=state.spawnedSinceBoss;this.nextBossWave=state.nextBossWave;this.cooldown=state.cooldown;this.nextRushWave=state.nextRushWave??(Math.floor(this.wave/S.rushEveryWaves)+1)*S.rushEveryWaves;this.rushRemaining=state.rushRemaining??0;this.applySpeed();return;}
        // Old checkpoints have no historical spawn counts: never infer them from kills.
        this.wave=Math.max(1,bossCount*S.bossEveryWaves+(bossAlive?0:1));this.waveSpawned=0;this.spawnedSinceBoss=0;
        this.nextBossWave=(bossCount+1)*S.bossEveryWaves;
        this.nextRushWave=(Math.floor(this.wave/S.rushEveryWaves)+1)*S.rushEveryWaves;this.rushRemaining=0;this.applySpeed();
    }
    constructor(private parent: Node, private geometry: GeometryFactory, private context: ZombieContext) {
        for (let x = -16; x <= 16; x += 2) for (let z = -16; z <= 16; z += 2)
            if (!context.obstacles.some(o => overlaps({ x, z }, C.enemyRadius + .15, o))) this.candidates.push({ x, z });
        this.reset();
    }
    get alive(): number { return this.enemies.filter(e => e.active && !e.dead).length; }
    private create(kind: ZombieKind, p: PointXZ, healthMultiplier = 1, damageMultiplier = 1, countSpawn = true): ZombieBase | null {
        if (this.alive >= S.maxEnemies) return null;
        let enemy = this.enemies.find(e => !e.node.active && e.kind === kind);
        if (!enemy && this.enemies.length < S.maxEnemies) {
            const node = new Node(`${kind} ${this.enemies.length + 1}`); this.parent.addChild(node);
            enemy = node.addComponent(ZombieBase); enemy.initialize(kind, p, this.context, this.geometry); this.enemies.push(enemy);
        }
        // Preserve the node budget even when the available pool has a different mix.
        if (!enemy) enemy = this.enemies.find(e => !e.node.active);
        if (!enemy) return null;
        enemy.reset(p, healthMultiplier, damageMultiplier); enemy.stats={...enemy.stats,speed:C[enemy.kind].speed*this.speedMultiplier}; enemy.investigate(this.context.player.position);
        if(countSpawn){this.waveSpawned++;this.spawnedSinceBoss++;}return enemy;
    }
    spawn(elapsed: number, random: () => number = Math.random): ZombieBase | null {
        if (this.alive >= S.maxEnemies) return null;
        if(this.endless){
            const player=this.context.player.position;this.candidates.length=0;
            for(const radius of [18,24,30])for(let i=0;i<32;i++){
                const angle=i*Math.PI/16,p={x:player.x+Math.cos(angle)*radius,z:player.z+Math.sin(angle)*radius};
                if(!this.context.obstacles.some(o=>overlaps(p,C.enemyRadius+.15,o))&&!this.visible?.(p))this.candidates.push(p);
            }
        }
        const phase = Math.min(4, Math.floor(elapsed / S.phaseSeconds));
        const start = Math.floor(random() * this.candidates.length);
        for (let i = 0; i < this.candidates.length; i++) {
            const p = this.candidates[(start + i) % this.candidates.length], d = distance(p, this.context.player.position);
            if (d < S.minSpawnDistance || d > (this.endless?30.01:S.maxSpawnDistance) || this.enemies.some(e => e.active && !e.dead && distance(e.position, p) < 1.2)) continue;
            if (!this.context.navigation.path(p, this.context.player.position).length) continue;
            return this.create(
                random() < S.runnerChances[phase] ? 'runner' : 'walker',
                p,
                enemyHealthMultiplier(elapsed),
                1 + phase * .15,
            );
        }
        return null;
    }
    tick(dt: number, elapsed: number, pressure = 0, bossAlive = false): void {
        // Spawn-completion waves; milestones remain pending until their boss is defeated.
        if(!bossAlive&&this.wave<this.nextBossWave&&this.waveSpawned>=this.waveSpawnBudget)this.nextWave();
        // Scalar milestones avoid an unbounded queue. Bosses take priority over rushes.
        const bossPending=bossAlive||this.wave>=this.nextBossWave;
        if(!bossPending&&this.rushRemaining<=0&&this.wave>=this.nextRushWave){
            this.nextRushWave+=S.rushEveryWaves;this.rushRemaining=S.rushDuration;
            this.cooldown=0;this.onRush?.();
        }
        const rushing=!bossPending&&this.rushRemaining>0;
        const interval=rushing?Math.max(S.rushMinInterval,this.spawnInterval(elapsed,pressure)/S.rushFrequencyMultiplier):this.spawnInterval(elapsed,pressure);
        this.cooldown=Math.min(this.cooldown,interval)-dt;
        if(rushing)this.rushRemaining=Math.max(0,this.rushRemaining-dt);
        if(this.cooldown>0)return;
        // One attempt per frame: no catch-up burst or accumulated spawn debt.
        this.cooldown=interval;
        this.spawn(elapsed);
    }
    restoreCheckpoint(states: {kind:ZombieKind;x:number;z:number;hp:number;max:number}[], elapsed:number):void {
        // Rebuild only when loading a checkpoint; ordinary spawns keep their pool.
        this.enemies.forEach(e=>e.node.destroy());this.enemies.length=0;
        this.cooldown=this.spawnInterval(elapsed);
        for(const state of states){const enemy=this.create(state.kind,state,state.max/C[state.kind].hp,1+Math.min(4,Math.floor(elapsed/S.phaseSeconds))*.15,false);if(enemy)enemy.health.current=state.hp;}
    }
    reset(): void {
        this.nextRushWave=S.rushEveryWaves;this.rushRemaining=0;
        this.wave=1;this.waveSpawned=0;this.spawnedSinceBoss=0;this.nextBossWave=S.bossEveryWaves;
        this.enemies.forEach(e => e.node.active = false); this.cooldown = S.baseSpawnInterval;
        const initial: [ZombieKind, number, number][] = [['walker', -6, 2], ['walker', 0, -7], ['walker', 6, -2], ['runner', -3, 7], ['walker', 4, -7]];
        for (const [kind, x, z] of initial) this.create(kind, { x, z });
    }
}
