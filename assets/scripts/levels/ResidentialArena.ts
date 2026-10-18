import { Node } from 'cc';
import { Palette as P } from '../core/GameConfig';
import { Obstacle } from '../core/MovementMath';
import { GeometryFactory } from './GeometryFactory';

/** Deliberately small crossed streets with loops around cars and barricades. */
export function buildResidential(parent: Node, g: GeometryFactory): Obstacle[] {
    const obstacles: Obstacle[] = [];
    const part = (name: string, c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
        g.part(parent, name, c, x, y, z, sx, sy, sz);
    const solid = (name: string, c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
        obstacles.push({ x, z, halfX: sx / 2, halfZ: sz / 2 });
        return part(name, c, x, y, z, sx, sy, sz);
    };
    part('City foundation', P.navy, 0, -0.23, 0, 70, 0.4, 70);
    part('North south street', P.road, 0, -0.01, 0, 10, 0.1, 36);
    part('East west street', P.road, 0, 0, 0, 36, 0.1, 9);
    for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
        const x = sideX * 11, z = sideZ * 11;
        part('Raised pavement', P.concrete, x, 0.01, z, 12, 0.16, 12);
        solid('House', P.wall, x, 1.75, z, 7, 3.5, 6);
        part('Roof cap', P.roof, x, 3.57, z, 7.35, 0.22, 6.35);
        part('Roof utility box', P.charcoal, x + 1.8, 3.95, z, 1.5, 0.6, 1.2);
        for (const wx of [-2.3, 0, 2.3]) {
            part('Street window', wx === 0 ? P.amber : P.glass, x + wx, 2.1, z - sideZ * 3.02, 1.1, 1.1, 0.05);
            part('Window sill', P.roof, x + wx, 1.5, z - sideZ * 3.12, 1.3, 0.12, 0.25);
        }
        part('Door', P.charcoal, x - sideX * 3.52, 0.95, z, 0.06, 1.8, 1.1);
        part('Address light', P.pink, x - sideX * 3.57, 2.25, z, 0.08, 0.15, 0.6);
        solid('Garden wall', P.purple, x, 0.45, z + sideZ * 4.6, 9, 0.9, 0.3);
        solid('Planter', P.roof, x - sideX * 4.8, 0.35, z + 2.2, 1.1, 0.7, 2.2);
        part('Dry shrub', '#4E5261', x - sideX * 4.8, 0.85, z + 2.2, 0.8, 0.5, 1.8);
    }
    for (let z = -15; z <= 15; z += 5) {
        if (Math.abs(z) > 4) part('Faded lane stripe', '#727080', 0, 0.055, z, 0.1, 0.01, 1.8);
    }
    for (const x of [-5.2, 5.2]) for (const z of [-5.2, 5.2]) {
        solid('Lamp post', P.charcoal, x, 1.7, z, 0.16, 3.4, 0.16);
        part('Lamp arm', P.charcoal, x - Math.sign(x) * 0.4, 3.35, z, 0.9, 0.12, 0.15);
        part('Warm lamp', P.amber, x - Math.sign(x) * 0.8, 3.25, z, 0.35, 0.13, 0.35);
    }
    for (const [x, z, color] of [[-3.2, -9, P.purple], [10, 2.6, '#364F63'], [3.2, 12, P.charcoal]] as const) {
        solid('Abandoned car', color, x, 0.55, z, 1.65, 0.8, 3.3);
        part('Car cabin', P.glass, x, 1.13, z + 0.1, 1.35, 0.55, 1.7);
        for (const sign of [-1, 1]) {
            part('Rear light', P.red, x + sign * 0.56, 0.64, z + 1.67, 0.3, 0.16, 0.05);
            for (const wheelZ of [-1, 1]) part('Tyre', P.hair, x + sign * 0.83, 0.32, z + wheelZ, 0.18, 0.5, 0.55);
        }
    }
    for (const [x, z] of [[-9, -2], [2, -6], [-1, 14]]) {
        solid('Road barricade', P.charcoal, x, 0.5, z, 2.4, 1, 0.45);
        part('Warning stripe', P.amber, x, 0.7, z + 0.23, 2.2, 0.15, 0.02);
        part('Warning stripe back', P.amber, x, 0.7, z - 0.23, 2.2, 0.15, 0.02);
    }
    // Visible limits match the movement solver's 36m playable square.
    for (const side of [-1, 1]) {
        part('Boundary rail', P.roof, side * 18.15, 0.4, 0, 0.3, 0.8, 36.6);
        part('Boundary rail', P.roof, 0, 0.4, side * 18.15, 36.6, 0.8, 0.3);
    }
    for (let i = 0; i < 10; i++) {
        const x = (i * 7 % 29) - 14, z = (i * 11 % 29) - 14;
        part('Road damage', P.navy, x, 0.06, z, 0.5 + i % 3 * 0.3, 0.015, 0.12);
    }
    return obstacles;
}
