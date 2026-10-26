/** M1 tuning. World ground is XZ, up is Y; distances are metres. */
export const GameConfig = {
    speed: 5, acceleration: 32, deceleration: 38, turnSpeed: 18,
    playerRadius: 0.32, arenaHalfSize: Infinity, maxStep: 1 / 120,
    cameraHeight: 17, cameraOffset: 14, orthoHeight: 7.4, cameraDamping: 9,
    joystickRadius: 68, joystickDeadZone: 0.14,
};

/** Visible billboard heights (excluding transparent padding), in world units. */
export const SpriteConfig = {
    runFPS: 12, characterHeight: 2.15, runnerHeight: 1.65, bruteHeight: 2.8, bossHeight: 4.8,
};

export const Palette = {
    navy: '#171D30', purple: '#29243D', charcoal: '#252731',
    pink: '#D56A91', red: '#D84A63', cyan: '#67B7C6',
    amber: '#D79B68', white: '#E8E2E2', road: '#292B36',
    concrete: '#41424E', wall: '#354052', roof: '#252D43',
    skin: '#DFC0B8', hair: '#151723', glass: '#46677C',
};

/** Endless survival balancing. Survival time excludes pauses and upgrade choices. */
export const SurvivalConfig = {
    bossEveryWaves: 5, bossKillThreshold: 100, bossStrengthMultiplier: 1.5, maxEnemies: 24, phaseSeconds: 30,
    baseSpawnBudget: 8, waveGrowth: 1.25, baseSpawnInterval: 4, minSpawnInterval: .4, spawnGrowthPerMinute: .05,
    waveFrequencyGrowth: 1.10, speedEveryWaves: 5, speedGrowth: 1.03, maxSpeedMultiplier: 1.3,
    rushEveryWaves: 3, rushDuration: 10, rushFrequencyMultiplier: 4, rushMinInterval: .2,
    bruteChances: [.12, .15, .18, .2, .22],
    runnerChances: [.1, .25, .4, .5, .55],
    minSpawnDistance: 7, maxSpawnDistance: 15,
    walkerXP: 5, runnerXP: 8, bruteXP: 15, bossXP: 100,
};

/** Spawn health grows 30% per minute, capped at 2.5x after five minutes. */
export function enemyHealthMultiplier(elapsed: number): number {
    return 1 + Math.min(1.5, Math.max(0, elapsed) * .005);
}

export const CombatConfig = {
    maxHP: 400, hitProtection: 0.35,
    pistolDamage: 24, pistolInterval: 0.25, pistolRange: 12,
    // Active area-slash skill: every visible enemy around Rin, once per cast.
    knifeDamage: 100, knifeRange: 3.2, knifeCooldown: 15, knifeArc: 360,
    dodgeDistance: 3.5, dodgeDuration: 0.25, dodgeCooldown: 3, dodgeInvulnerability: 0.25,
    enemyRadius: 0.34, maxEnemies: 5, repathInterval: 0.5,
    walker: { hp: 80, speed: 2, damage: 15, range: 1.4, cooldown: 1.5, detection: 8, windup: 0.38 },
    brute: { hp: 200, speed: 1.6, damage: 25, range: 1.6, cooldown: 1.8, detection: 10, windup: .55 },
    runner: { hp: 50, speed: 3.8, damage: 10, range: 1.3, cooldown: 0.9, detection: 11, windup: 0.25 },
};
