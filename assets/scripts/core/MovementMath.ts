/** Engine-independent collision and input math, also exercised by tools/test-m1.cjs. */
export interface Obstacle { x: number; z: number; halfX: number; halfZ: number; }
export interface PointXZ { x: number; z: number; }

export function joystickOutput(x: number, y: number, radius: number, deadZone: number) {
    const length = Math.hypot(x, y);
    if (length <= radius * deadZone) return { x: 0, y: 0 };
    const amount = Math.min(1, (length / radius - deadZone) / (1 - deadZone));
    return { x: x / length * amount, y: y / length * amount };
}

export function cameraRelative(x: number, y: number): PointXZ {
    const scale = Math.SQRT1_2 / Math.max(1, Math.hypot(x, y));
    return { x: (x - y) * scale, z: (-x - y) * scale };
}

export function overlaps(p: PointXZ, radius: number, obstacle: Obstacle): boolean {
    const dx = p.x - Math.max(obstacle.x - obstacle.halfX, Math.min(p.x, obstacle.x + obstacle.halfX));
    const dz = p.z - Math.max(obstacle.z - obstacle.halfZ, Math.min(p.z, obstacle.z + obstacle.halfZ));
    return dx * dx + dz * dz < radius * radius;
}

/** Small swept substeps prevent tunnelling; independent axes allow wall sliding.
 * Static axis-aligned arena geometry uses the same bounds as rendered props.
 */
export function moveAndSlide(p: PointXZ, dx: number, dz: number, radius: number,
    halfSize: number, obstacles: readonly Obstacle[]): PointXZ {
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * 0.45)));
    const result = { x: p.x, z: p.z };
    const limit = halfSize - radius;
    for (let i = 0; i < count; i++) {
        const x = Math.max(-limit, Math.min(limit, result.x + dx / count));
        if (!obstacles.some(o => overlaps({ x, z: result.z }, radius, o))) result.x = x;
        const z = Math.max(-limit, Math.min(limit, result.z + dz / count));
        if (!obstacles.some(o => overlaps({ x: result.x, z }, radius, o))) result.z = z;
    }
    return result;
}

export function approach(value: number, target: number, maxDelta: number): number {
    return value + Math.max(-maxDelta, Math.min(maxDelta, target - value));
}
