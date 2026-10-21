import { Node } from 'cc';
import { Palette as P } from '../core/GameConfig';
import { Obstacle } from '../core/MovementMath';
import { GeometryFactory } from './GeometryFactory';

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
    part('North south street', P.road, 0, -0.01, 0, 10, 0.1, 36);
    part('East west street', P.road, 0, 0, 0, 36, 0.1, 9);
    for (const sideX of [-1, 1]) for (const sideZ of [-1, 1]) {
        const x = sideX * 11, z = sideZ * 11;
        part('Raised pavement', P.concrete, x, 0.01, z, 12, 0.16, 12);
        part('Street curb', '#65616A', x, .12, z - sideZ * 5.95, 12, .18, .15);
        part('Street curb', '#65616A', x - sideX * 5.95, .12, z, .15, .18, 12);
        for (let tile = -2; tile <= 2; tile++) {
            part('Pavement joint', '#343D50', x + tile * 2.2, .096, z, .025, .008, 11.5);
            part('Pavement joint', '#343D50', x, .096, z + tile * 2.2, 11.5, .008, .025);
        }
        const building = new Node('Building facade'); parent.addChild(building);
        visualParent = building;
        solid('House', P.wall, x, 1.75, z, 7, 3.5, 6);
        part('Roof cap', P.roof, x, 3.57, z, 7.35, 0.22, 6.35);
        part('Roof utility plinth', P.charcoal, x + 1.8, 3.72, z, 1.9, .18, 1.55);
        part('Roof utility box', '#394459', x + 1.8, 4.08, z, 1.5, .55, 1.2);
        part('Air conditioner grille', '#191F31', x + 1.8, 4.09, z - .62, 1.12, .3, .035);
        for (let vent = -2; vent <= 2; vent++) {
            part('Air conditioner vent', '#718094', x + 1.8 + vent * .19, 4.09, z - .65, .035, .2, .025);
        }
        for (const pipeX of [-2.85, 2.95]) {
            part('Facade conduit', '#647085', x + pipeX, 1.85, z - sideZ * 3.08, .09, 3.25, .1);
            for (const bandY of [.48, 1.55, 2.55, 3.24]) {
                part('Conduit bracket', '#9296A4', x + pipeX, bandY, z - sideZ * 3.13, .16, .055, .16);
            }
        }
        for (const wx of [-2.3, 0, 2.3]) {
            part('Window recess', '#1B2233', x + wx, 2.1, z - sideZ * 3.01, 1.34, 1.32, .12);
            const pane = part('Street window', wx === 0 ? '#DFA66F' : '#477488', x + wx, 2.1, z - sideZ * 3.09, 1.08, 1.04, .035);
            g.glow(pane, wx === 0 ? '#DFA66F' : '#477488', wx === 0 ? .34 : .16);
            part('Window mullion', '#22283A', x + wx, 2.1, z - sideZ * 3.12, .07, 1.08, .045);
            part('Window crossbar', '#22283A', x + wx, 2.03, z - sideZ * 3.12, 1.12, .055, .045);
            part('Window sill', '#515B70', x + wx, 1.48, z - sideZ * 3.12, 1.38, 0.12, 0.25);
        }
        part('Door', P.charcoal, x - sideX * 3.52, 0.95, z, 0.06, 1.8, 1.1);
        part('Address light', P.pink, x - sideX * 3.57, 2.25, z, 0.08, 0.15, 0.6);
        const front = z - sideZ * 3.06;
        const trim = sideX === sideZ ? '#FF5C9B' : '#55D8E8';
        const roofNeon = part('Neon roof trim', trim, x, 3.48, z - sideZ * 3.15, 5.8, .045, .05); g.glow(roofNeon, trim, .8);
        part('Facade canopy lip', '#1B2233', x, 2.76, front - sideZ * .1, 6.7, .12, .2);
        for (const dx of [-2.65, -1.6, -.55, .55, 1.6, 2.65]) {
            const accent = part('Facade light strip', dx < 0 ? '#55D8E8' : '#FF5C9B', x + dx, 2.77, front - sideZ * .21, .5, .035, .025);
            g.glow(accent, dx < 0 ? '#55D8E8' : '#FF5C9B', .65);
        }
        for (const dx of [-3.1, 3.1]) part('Facade column', P.roof, x + dx, 1.7, front, .16, 3.4, .14);
        part('Brick course', '#535163', x, .45, front, 6.8, .12, .1);
        part('Neon sign backing', '#202438', x, 3.08, front - sideZ * .08, 3.7, .48, .14);
        for (const dx of [-1.72, 1.72]) {
            const edge = part('Neon sign edge', trim, x + dx, 3.08, front - sideZ * .17, .035, .42, .025);
            g.glow(edge, trim, .9);
        }
        for (const dy of [-.19, .19]) {
            const edge = part('Neon sign edge', trim, x, 3.08 + dy, front - sideZ * .17, 3.45, .025, .025);
            g.glow(edge, trim, .9);
        }
        const neon = part('Illuminated sign', '#FF74AE', x, 3.08, front - sideZ * .19, 2.9, .075, .035); g.glow(neon, '#FF74AE', .95);
        const signSpark = part('Sign spark', '#7AE8F1', x + 1.15, 3.08, front - sideZ * .22, .12, .12, .035); g.glow(signSpark, '#7AE8F1', .9);
        if (sideX === -1 && sideZ === -1) {
            part('Convenience store awning', '#842D51', x, 2.55, front - sideZ * .35, 6.5, .22, .75);
            for (let stripe = -2; stripe <= 2; stripe++) {
                const awningStripe = part('Awning neon rib', stripe % 2 ? '#EC5B95' : '#67C8D7', x + stripe * 1.08, 2.55, front - sideZ * .73, .055, .19, .025);
                g.glow(awningStripe, stripe % 2 ? '#EC5B95' : '#67C8D7', .55);
            }
            for (const dx of [-2.2, -.7, .7, 2.2]) {
                const window = part('Store display', '#EAB883', x + dx, 1.35, front - sideZ * .06, 1.25, 1.65, .06); g.glow(window, '#EAB883', .3);
                part('Display mullion', P.charcoal, x + dx + .58, 1.35, front - sideZ * .04, .07, 1.7, .07);
                part('Display shelf', '#72546A', x + dx, 1.05, front - sideZ * .1, 1.05, .045, .05);
            }
            part('Store sign bracket', '#69778B', x + 3.35, 2.05, front - sideZ * .08, .12, 2.35, .12);
            part('Store vertical sign', '#202438', x + 3.58, 2.05, front - sideZ * .12, .55, 2.1, .16);
            for (const dy of [-.72, -.24, .24, .72]) {
                const glyph = part('Vertical neon glyph', dy < 0 ? '#FF5C9B' : '#55D8E8', x + 3.58, 2.05 + dy, front - sideZ * .22, .28, .09, .035);
                g.glow(glyph, dy < 0 ? '#FF5C9B' : '#55D8E8', .9);
            }
        } else {
            const broken = part('Broken window diagonal', P.charcoal, x + 2.3, 2.1, front - sideZ * .02, .08, 1.2, .08); broken.setRotationFromEuler(0, 0, 32);
            part('External duct', '#61616E', x + 2.7, 3.85, z + 1, .7, .55, 1.4);
            const neon = part('Vertical alley neon', '#55D8E8', x - 3.35, 2.3, front - sideZ * .16, .07, 1.15, .035);
            g.glow(neon, '#55D8E8', .8);
        }
        // Props remain inside the existing solid house footprint, preserving navigation.
        part('Vending machine', '#4A344F', x - 2.9, .9, front + sideZ * .3, .65, 1.7, .5);
        const vending = part('Vending display', '#79BFD0', x - 2.9, 1.15, front - sideZ * .01, .45, .8, .04); g.glow(vending, '#79BFD0', .35);
        part('Vending slot', P.charcoal, x - 2.9, .35, front - sideZ * .02, .4, .15, .05);
        visualParent = parent;
        solid('Garden wall', P.purple, x, 0.45, z + sideZ * 4.6, 9, 0.9, 0.3);
        solid('Planter', P.roof, x - sideX * 4.8, 0.35, z + 2.2, 1.1, 0.7, 2.2);
        part('Dry shrub', '#4E5261', x - sideX * 4.8, 0.85, z + 2.2, 0.8, 0.5, 1.8);
    }
    for (let z = -16; z <= 16; z += 4) {
        if (Math.abs(z) > 5) {
            part('Faded lane stripe', '#858697', 0, 0.055, z, 0.11, 0.012, 1.75);
            for (const laneX of [-3.35, 3.35]) {
                part('Road lane dash', '#586174', laneX, .054, z, .07, .009, 1.15);
            }
        }
    }
    for (let x = -16; x <= 16; x += 4) {
        if (Math.abs(x) > 5) for (const laneZ of [-3.1, 3.1]) {
            part('Road lane dash', '#586174', x, .054, laneZ, 1.15, .009, .07);
        }
    }
    for (const side of [-1, 1]) for (let i = -3; i <= 3; i++) {
        part('Crosswalk paint', '#77757C', i * .85, .062, side * 4, .55, .012, 1.25);
        part('Crosswalk paint', '#77757C', side * 5.6, .062, i * .85, 1.25, .012, .55);
    }
    for (const [x, z] of [[-2, -12], [3, 7], [-11, 1], [12, -2]]) {
        const puddle = g.part(parent, 'Wet asphalt reflection', '#3B4053', x, .058, z, 2.6, .012, 1.1, true);
        const glint = part('Puddle neon glint', '#70506C', x, .067, z, 1.4, .008, .035);
        glint.setRotationFromEuler(0, 20, 0);
        const cyanReflection = part('Puddle cyan reflection', '#477D91', x - .35, .068, z + .12, .62, .008, .025);
        cyanReflection.setRotationFromEuler(0, -16, 0);
    }
    for (const [x, z] of [[-4.15, -1.1], [4.15, 1.1], [1.1, -3.65], [-1.1, 3.65]]) {
        g.form(parent, 'Street manhole', '#343B4D', x, .062, z, 1.05, .018, 1.05, 'ring');
        part('Manhole cover', '#30384A', x, .055, z, .72, .018, .72);
        for (let grate = -2; grate <= 2; grate++) {
            part('Manhole slot', '#687083', x + grate * .12, .068, z, .035, .008, .38);
        }
    }
    for (const x of [-5.2, 5.2]) for (const z of [-5.2, 5.2]) {
        solid('Lamp post', P.charcoal, x, 1.7, z, 0.16, 3.4, 0.16);
        part('Lamp arm', P.charcoal, x - Math.sign(x) * 0.4, 3.35, z, 0.9, 0.12, 0.15);
        const lamp = part('Warm lamp', P.amber, x - Math.sign(x) * 0.8, 3.25, z, 0.35, 0.13, 0.35); g.glow(lamp, '#F4BB84', .65);
        g.part(parent, 'Warm pavement pool', '#51494D', x - Math.sign(x) * .8, .075, z, 1.7, .012, 1.7, true);
        g.form(parent, 'Lamp ground halo', '#CB8B72', x - Math.sign(x) * .8, .084, z, .9, .018, .9, 'ring');
    }
    for (const [x, z, color] of [[-3.2, -9, P.purple], [10, 2.6, '#364F63'], [3.2, 12, P.charcoal]] as const) {
        solid('Abandoned car', color, x, 0.55, z, 1.65, 0.8, 3.3);
        part('Car cabin', P.glass, x, 1.13, z + 0.1, 1.35, 0.55, 1.7);
        part('Car roof', color, x, 1.43, z + .1, 1.4, .08, 1);
        part('Hood seam', P.charcoal, x, .97, z - 1.25, 1.5, .025, .045);
        for (const sign of [-1, 1]) {
            part('Rear light', P.red, x + sign * 0.56, 0.64, z + 1.67, 0.3, 0.16, 0.05);
            for (const wheelZ of [-1, 1]) part('Tyre', P.hair, x + sign * 0.83, 0.32, z + wheelZ, 0.18, 0.5, 0.55);
        }
    }
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
    for (let i = 0; i < 10; i++) {
        const x = (i * 7 % 29) - 14, z = (i * 11 % 29) - 14;
        part('Road damage', P.navy, x, 0.06, z, 0.5 + i % 3 * 0.3, 0.015, 0.12);
    }
    return obstacles;
}
