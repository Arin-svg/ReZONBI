import type { CombatEncounter } from '../core/CombatEncounter';
import { Skills } from './Progression';
import { CombatConfig, SurvivalConfig as S } from '../core/GameConfig';
import type { ZombieSpawner } from '../enemies/ZombieSpawner';

export function captureRun(e:CombatEncounter) {
    return {version:1,elapsed:e.elapsed,kills:e.kills,bossCount:e.bossCount,waves:e.spawner.captureWaves() as ReturnType<ZombieSpawner['captureWaves']>|undefined,world:e.world?.capture(),
        player:{x:e.player.node.position.x,z:e.player.node.position.z,hp:e.health.state.current},
        level:e.progression.level,xp:e.progression.xp,pending:e.progression.pending,levels:{...e.progression.levels},noise:e.noise.pressure,
        cooldowns:[e.combat.pistolCooldown,e.combat.knifeCooldown,e.combat.dodgeCooldown],
        enemies:e.spawner.enemies.filter(b=>b.active&&!b.dead).map(b=>({kind:b.kind,x:b.position.x,z:b.position.z,hp:b.health.current,max:b.health.maximum})),
        bosses:e.bosses.filter(b=>b.active&&!b.dead).map(b=>({x:b.position.x,z:b.position.z,hp:b.health.current,strength:b.strength})),
        pickups:e.pickups.pool.filter(p=>p.value>0).map(p=>({x:p.node.position.x,z:p.node.position.z,value:p.value}))};
}
export type RunCheckpoint=ReturnType<typeof captureRun>;
export function parseRun(raw:string|null):RunCheckpoint|null {
    try {
        const s=JSON.parse(raw||'null');const finite=(v:unknown,min=0,max=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
        const pos=(p:any)=>p&&finite(p.x,-1e9,1e9)&&finite(p.z,-1e9,1e9);
        if(!s||s.version!==1||!finite(s.elapsed)||!Number.isInteger(s.kills)||s.kills<0||!Number.isInteger(s.bossCount)||s.bossCount<0||s.bossCount>1e4||!pos(s.player)||!finite(s.player.hp,1,CombatConfig.maxHP))return null;
        if(!Number.isInteger(s.level)||!finite(s.level,1,1e6)||!finite(s.xp)||!Number.isInteger(s.pending)||!finite(s.pending)||!s.levels||!finite(s.noise,0,100))return null;
        if(!Skills.every(k=>s.levels[k.id]===undefined||(Number.isInteger(s.levels[k.id])&&finite(s.levels[k.id],0,k.max))))return null;
        if(!Array.isArray(s.cooldowns)||s.cooldowns.length!==3||!s.cooldowns.every((v:number)=>finite(v,0,60)))return null;
        if(!Array.isArray(s.enemies)||s.enemies.length>24||!s.enemies.every((b:any)=>pos(b)&&['walker','runner'].indexOf(b.kind)>=0&&finite(b.max,1)&&finite(b.hp,1,b.max)))return null;
        if(!Array.isArray(s.bosses)||s.bosses.length>s.bossCount||!s.bosses.every((b:any)=>pos(b)&&finite(b.strength,1)&&finite(b.hp,1,Math.round(1800*b.strength))))return null;
        if(!Array.isArray(s.pickups)||s.pickups.length>64||!s.pickups.every((p:any)=>pos(p)&&finite(p.value,1)))return null;
        if(s.world!==undefined){const w=s.world;if(!w||!Number.isInteger(w.seed)||!finite(w.seed,0,0xffffffff)||!finite(w.originX,-1e12,1e12)||!finite(w.originZ,-1e12,1e12)||w.originX%36!==0||w.originZ%36!==0)return null;}
        if(s.waves!==undefined){const w=s.waves;
            if(!w||!Number.isInteger(w.wave)||!finite(w.wave,1,1e6)||!Number.isInteger(w.waveSpawned)||!finite(w.waveSpawned,0,Number.MAX_SAFE_INTEGER)||!Number.isInteger(w.spawnedSinceBoss)||!finite(w.spawnedSinceBoss,0,Number.MAX_SAFE_INTEGER)||w.spawnedSinceBoss<w.waveSpawned&&s.bosses.length===0||w.nextBossWave!==(s.bossCount+1)*S.bossEveryWaves||!finite(w.cooldown,0,S.baseSpawnInterval))return null;
        }
        return s;
    }catch{return null;}
}
export function restoreRun(e:CombatEncounter,s:RunCheckpoint):void {
    e.restart();e.elapsed=s.elapsed;e.kills=s.kills;e.bossCount=s.bossCount;
    e.player.node.setPosition(s.player.x,.06,s.player.z);e.health.state.current=s.player.hp;
    e.restoreWorld(s.world);
    e.progression.level=s.level;e.progression.xp=s.xp;e.progression.pending=s.pending;
    for(const skill of Skills)if(s.levels[skill.id])e.progression.levels[skill.id]=s.levels[skill.id];
    e.noise.pressure=s.noise;[e.combat.pistolCooldown,e.combat.knifeCooldown,e.combat.dodgeCooldown]=s.cooldowns;
    e.spawner.restoreCheckpoint(s.enemies,s.elapsed);e.restoreBossCheckpoint(s.bosses);
    e.spawner.restoreWaves(s.waves,s.bossCount,s.bosses.length>0);
    for(const item of s.pickups)e.pickups.drop(item,item.value);
}
