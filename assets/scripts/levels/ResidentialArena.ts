import { Node } from 'cc';
import { Palette as P } from '../core/GameConfig';
import { Obstacle } from '../core/MovementMath';
import { GeometryFactory } from './GeometryFactory';
import { buildShop } from './ShopBuildings';
import { buildImportedRoad } from './ImportedRoad';
import { buildStreetProps } from './StreetProps';
import { buildNightAtmosphere } from './NightAtmosphere';

/** Deliberately small crossed streets with loops around cars and barricades. */
export function buildResidential(parent: Node, g: GeometryFactory): Obstacle[] {
    const obstacles: Obstacle[] = [];
    let visualParent = parent;
    const part = (name: string, c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
        g.part(visualParent, name, c, x, y, z, sx, sy, sz);
    const solid = (name: string, c: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
        obstacles.push({ x, z, halfX: sx / 2, halfZ: sz / 2 });
        return part(name, c, x, y, z, sx, sy, sz);
    };
    part('City foundation', P.navy, 0, -0.23, 0, 70, 0.4, 70);
    buildImportedRoad(parent, g);
    for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
        const x = sideX * 11, z = sideZ * 11;
        // The four reference shops share the existing solid footprints.
        obstacles.push({ x, z, halfX: 3.5, halfZ: 3 });
        const shopIndex = (sideX > 0 ? 2 : 0) + (sideZ > 0 ? 1 : 0);
        buildShop(parent, g, x, z, shopIndex);
        solid('Garden wall', P.purple, x, 0.45, z + sideZ * 4.6, 9, 0.9, 0.3);
        solid('Planter', P.roof, x - sideX * 4.8, 0.35, z + 2.2, 1.1, 0.7, 2.2);
        part('Dry shrub', '#4E5261', x - sideX * 4.8, 0.85, z + 2.2, 0.8, 0.5, 1.8);
    }
    for (const x of [-5.2, 5.2]) for (const z of [-5.2, 5.2]) {
        solid('Lamp post', P.charcoal, x, 1.7, z, 0.16, 3.4, 0.16);
        part('Lamp arm', P.charcoal, x - Math.sign(x) * 0.4, 3.35, z, 0.9, 0.12, 0.15);
        const lamp = part('Warm lamp', P.amber, x - Math.sign(x) * 0.8, 3.25, z, 0.35, 0.13, 0.35); g.glow(lamp, '#F4BB84', .65);
    }
    for (const [x,z] of [[-3.2,-9],[10,2.6],[3.2,12]]) obstacles.push({x,z,halfX:.825,halfZ:1.65});
    buildStreetProps(parent,g);
    buildNightAtmosphere(parent,g);
    for (const [x, z] of [[-9, -2], [2, -6], [-1, 14]]) {
        solid('Road barricade', P.charcoal, x, 0.5, z, 2.4, 1, 0.45);
        part('Warning stripe', P.amber, x, 0.7, z + 0.23, 2.2, 0.15, 0.02);
        part('Warning stripe back', P.amber, x, 0.7, z - 0.23, 2.2, 0.15, 0.02);
        // Cones on top of the solid barricade cannot add invisible movement blockers.
        g.form(parent, 'Road cone', '#C47A57', x + .85, 1.2, z, .27, .4, .27, 'cone');
    }
    // Visible limits match the movement solver's 36m playable square.
    for (const side of [-1, 1]) {
        part('Boundary rail', P.roof, side * 18.15, 0.4, 0, 0.3, 0.8, 36.6);
        part('Boundary rail', P.roof, 0, 0.4, side * 18.15, 36.6, 0.8, 0.3);
    }
    return obstacles;
}
