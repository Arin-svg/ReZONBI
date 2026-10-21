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
        const isShop = sideX === -1 && sideZ === -1;
        if (!isShop) for (const wx of [-2.3, 0, 2.3]) {
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
        if (isShop) {
            const signFace = front - sideZ * .21;
            part('Shop fascia', '#151A2B', x, 2.93, signFace, 6.25, .68, .2);
            part('Shop fascia lower trim', '#41475B', x, 2.57, signFace, 6.35, .08, .24);
            for (const dx of [-3.02, 3.02]) {
                const neonEdge = part('Shop fascia neon edge', '#FF4F97', x + dx, 2.94, signFace + sideZ * .12, .045, .62, .025);
                g.glow(neonEdge, '#FF4F97', 1.1);
            }
            for (const dy of [2.64, 3.24]) {
                const neonEdge = part('Shop fascia neon edge', '#FF4F97', x, dy, signFace + sideZ * .12, 6.05, .035, .025);
                g.glow(neonEdge, '#FF4F97', 1.1);
            }
            for (let glyph = -2; glyph <= 2; glyph++) {
                const glyphX = x + glyph * .83;
                const color = glyph === 0 ? '#FFF0CB' : '#FF86B5';
                const top = part('Store sign glyph', color, glyphX, 3.02, signFace + sideZ * .15, .39, .055, .025);
                const bottom = part('Store sign glyph', color, glyphX, 2.82, signFace + sideZ * .15, .39, .055, .025);
                const left = part('Store sign glyph', color, glyphX - .17, 2.92, signFace + sideZ * .15, .05, .17, .025);
                const right = part('Store sign glyph', color, glyphX + .17, 2.92, signFace + sideZ * .15, .05, .17, .025);
                g.glow(top, color, .8); g.glow(bottom, color, .8); g.glow(left, color, .8); g.glow(right, color, .8);
                if (glyph !== -2) {
                    const diagonal = part('Store sign glyph', color, glyphX, 2.92, signFace + sideZ * .16, .055, .2, .025);
                    diagonal.setRotationFromEuler(0, 0, 38); g.glow(diagonal, color, .8);
                }
            }
            part('Convenience store awning', '#612841', x, 2.43, front - sideZ * .27, 6.5, .19, .82);
            part('Awning front valance', '#341F36', x, 2.32, front - sideZ * .66, 6.45, .18, .12);
            const awningNeon = part('Awning neon edge', '#FF568E', x, 2.33, front - sideZ * .73, 6.2, .035, .025);
            g.glow(awningNeon, '#FF568E', .85);
            for (let stripe = -2; stripe <= 2; stripe++) {
                const awningStripe = part('Awning neon rib', stripe % 2 ? '#EC5B95' : '#67C8D7', x + stripe * 1.08, 2.55, front - sideZ * .73, .055, .19, .025);
                g.glow(awningStripe, stripe % 2 ? '#EC5B95' : '#67C8D7', .55);
            }
            const glassZ = front - sideZ * .1;
            const frameZ = front - sideZ * .16;
            for (const dx of [-2.35, -.9, .55]) {
                part('Shopfront window frame', '#242438', x + dx, 1.38, frameZ, 1.34, 1.88, .14);
                const window = part('Shopfront display glass', '#D99369', x + dx, 1.42, glassZ, 1.22, 1.73, .035);
                g.glow(window, '#EBA777', .32);
                part('Shopfront mullion', '#28283A', x + dx - .68, 1.4, front - sideZ * .19, .085, 1.93, .1);
                for (const shelfY of [.93, 1.42, 1.9]) {
                    part('Store display shelf', '#5C4856', x + dx, shelfY, front + sideZ * .23, 1.12, .055, .18);
                    for (let item = -2; item <= 2; item++) {
                        const productColor = item % 2 ? '#69D9DF' : '#F08B62';
                        const product = part('Store shelf product', productColor, x + dx + item * .19, shelfY + .13, front + sideZ * .34, .13, .2, .1);
                        g.glow(product, productColor, .24);
                        part('Product label', '#F5DBAF', x + dx + item * .19, shelfY + .13, front + sideZ * .4, .08, .045, .015);
                    }
                }
            }
            const entranceX = x + 2.35;
            part('Shop entrance surround', '#404459', entranceX, 1.43, front - sideZ * .18, 1.28, 2.02, .2);
            part('Shop entrance glass', '#346579', entranceX, 1.4, front - sideZ * .29, 1.04, 1.82, .06);
            part('Shop door divider', '#242438', entranceX, 1.4, front - sideZ * .33, .075, 1.84, .045);
            part('Shop door handle', '#E8B77E', entranceX - .37, 1.3, front - sideZ * .38, .055, .3, .06);
            part('Shop door kickplate', '#344156', entranceX, .57, front - sideZ * .36, .95, .14, .06);
            part('Shop door transom', '#5BD4E0', entranceX, 2.22, front - sideZ * .32, .82, .08, .025);
            part('Shop entrance step', '#727182', entranceX, .22, front - sideZ * .43, 1.5, .16, .55);
            part('Projecting sign bracket', '#525A6D', x - 2.8, 2.35, front - sideZ * .38, .12, .9, .48);
            part('Projecting sign box', '#171D31', x - 2.8, 2.65, front - sideZ * .72, .82, 1.32, .18);
            for (const dy of [-.45, 0, .45]) {
                const glyph = part('Vertical neon glyph', dy === 0 ? '#55D8E8' : '#FF5C9B', x - 2.8, 2.65 + dy, front - sideZ * .83, .45, .1, .035);
                g.glow(glyph, dy < 0 ? '#FF5C9B' : '#55D8E8', .9);
            }
            part('Shop vending machine', '#263752', x - 3.28, .92, front - sideZ * .52, .68, 1.72, .62);
            part('Shop vending display frame', '#161E31', x - 3.28, 1.16, front - sideZ * .86, .5, 1, .045);
            const vendingGlow = part('Shop vending display', '#50BDD5', x - 3.28, 1.16, front - sideZ * .9, .39, .84, .025);
            g.glow(vendingGlow, '#50D8E8', .7);
            for (let row = 0; row < 3; row++) for (let col = -1; col <= 1; col++) {
                const can = part('Vending machine drink', row % 2 ? '#E77A86' : '#77DBD7', x - 3.28 + col * .11, .88 + row * .23, front - sideZ * .94, .07, .15, .025);
                g.glow(can, row % 2 ? '#E77A86' : '#77DBD7', .35);
            }
            part('Vending machine foot', '#111726', x - 3.28, .12, front - sideZ * .5, .68, .16, .62);
            for (const dx of [-3.02, 3.02]) {
                part('Storefront pillar', '#41475B', x + dx, 1.32, front - sideZ * .14, .18, 2.1, .2);
                for (const y of [.5, 1, 1.5, 2]) {
                    const bolt = g.form(building, 'Storefront pillar bolt', '#A4A6AC', x + dx, y, front - sideZ * .26, .055, .055, .025, 'crystal');
                    bolt.setRotationFromEuler(0, 0, 45);
                }
            }
            for (const dx of [-2.7, -1.2, .3, 1.8]) {
                const support = part('Awning support', '#565B70', x + dx, 1.92, front - sideZ * .48, .055, .82, .06);
                support.setRotationFromEuler(0, 0, 7);
            }
            for (const [plantX, plantZ] of [[-2.8, -2.6], [2.7, -2.3]]) {
                part('Roof planter', '#34394C', x + plantX, 3.82, z - sideZ * Math.abs(plantZ), 1.35, .28, .8);
                for (let leaf = 0; leaf < 5; leaf++) {
                    const leafNode = g.form(building, 'Rooftop plant', leaf % 2 ? '#508773' : '#6AA17C',
                        x + plantX - .5 + leaf * .24, 4.12 + (leaf % 2) * .12, z - sideZ * Math.abs(plantZ), .27, .65, .3, 'crystal');
                    leafNode.setRotationFromEuler(0, 0, (leaf - 2) * 17);
                }
            }
            for (const dx of [-3.45, 3.45]) {
                part('Shop security grille rail', '#31394C', x + dx, 3.85, z - sideZ * 1, .08, .08, 3.8);
                for (let bar = 0; bar < 5; bar++) {
                    const vine = g.form(building, 'Hanging rooftop vine', '#477A62', x + dx + (bar % 2) * .16, 3.32 - bar * .42, z - sideZ * 2.65, .1, .65, .11, 'crystal');
                    vine.setRotationFromEuler(0, 0, (bar % 2 ? 1 : -1) * 12);
                }
            }
            for (const [propX, propZ, propColor] of [[-3.5, .15, '#AC604B'], [-2.9, .15, '#D39151'], [3.2, .25, '#526958']] as const) {
                part('Shop delivery crate', '#383B4C', x + propX, .34, front - sideZ * propZ, .65, .65, .55);
                part('Crate face inset', propColor, x + propX, .35, front - sideZ * (propZ + .28), .48, .42, .045);
                for (const cross of [-1, 1]) {
                    const brace = part('Crate brace', '#666071', x + propX, .35, front - sideZ * (propZ + .31), .05, .52, .025);
                    brace.setRotationFromEuler(0, 0, cross * 43);
                }
            }
            part('Shop trash bin', '#304A49', x + 3.4, .53, front - sideZ * .8, .64, 1.02, .72);
            part('Trash bin lid', '#3A5953', x + 3.4, 1.07, front - sideZ * .8, .72, .12, .8);
            part('Trash bin handle', '#A6A28C', x + 3.4, 1.17, front - sideZ * .8, .26, .045, .12);
        } else {
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
            const broken = part('Broken window diagonal', P.charcoal, x + 2.3, 2.1, front - sideZ * .02, .08, 1.2, .08); broken.setRotationFromEuler(0, 0, 32);
            part('External duct', '#61616E', x + 2.7, 3.85, z + 1, .7, .55, 1.4);
            const alleyNeon = part('Vertical alley neon', '#55D8E8', x - 3.35, 2.3, front - sideZ * .16, .07, 1.15, .035);
            g.glow(alleyNeon, '#55D8E8', .8);
        }
        // Props remain inside the existing solid house footprint, preserving navigation.
        if (!isShop) {
            part('Vending machine', '#4A344F', x - 2.9, .9, front + sideZ * .3, .65, 1.7, .5);
            const vending = part('Vending display', '#79BFD0', x - 2.9, 1.15, front - sideZ * .01, .45, .8, .04); g.glow(vending, '#79BFD0', .35);
            part('Vending slot', P.charcoal, x - 2.9, .35, front - sideZ * .02, .4, .15, .05);
        }
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
