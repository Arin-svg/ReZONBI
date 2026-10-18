/** M1 tuning. World ground is XZ, up is Y; distances are metres. */
export const GameConfig = {
    speed: 5, acceleration: 22, deceleration: 30, turnSpeed: 14,
    playerRadius: 0.32, arenaHalfSize: 18, maxStep: 1 / 120,
    cameraHeight: 17, cameraOffset: 14, orthoHeight: 9, cameraDamping: 9,
    joystickRadius: 68, joystickDeadZone: 0.14,
};

export const Palette = {
    navy: '#171D30', purple: '#29243D', charcoal: '#252731',
    pink: '#D56A91', red: '#D84A63', cyan: '#67B7C6',
    amber: '#D79B68', white: '#E8E2E2', road: '#222B40',
    concrete: '#414A60', wall: '#35415A', roof: '#252D43',
    skin: '#DFC0B8', hair: '#151723', glass: '#46677C',
};

export const CombatConfig = {
    maxHP: 400, hitProtection: 0.35,
    pistolDamage: 24, pistolInterval: 0.25, pistolRange: 12,
    knifeDamage: 40, knifeRange: 2.2, knifeCooldown: 0.6, knifeArc: 110,
    dodgeDistance: 3.5, dodgeDuration: 0.25, dodgeCooldown: 3, dodgeInvulnerability: 0.25,
    enemyRadius: 0.34, maxEnemies: 5, repathInterval: 0.5,
    walker: { hp: 80, speed: 2, damage: 15, range: 1.4, cooldown: 1.5, detection: 8, windup: 0.38 },
    runner: { hp: 50, speed: 3.8, damage: 10, range: 1.3, cooldown: 0.9, detection: 11, windup: 0.25 },
};
