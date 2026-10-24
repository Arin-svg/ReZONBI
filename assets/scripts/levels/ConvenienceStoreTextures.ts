import { Color, isValid, MeshRenderer, Node, resources, SphereLight, Texture2D, utils } from 'cc';
import { GeometryFactory } from './GeometryFactory';

// Authored panel bounds on the 1254px source sheets exclude gutters. The ramen
// sheet's row break is above centre, so equal quadrants would leak rear-wall art.
const PANELS: Record<string, number[][]> = {
    'coffee-shop': [[12,22,610,600],[638,20,1244,600],[12,637,610,1236],[640,620,1248,1236]],
    pharmacy: [[12,20,612,610],[648,20,1248,610],[15,647,612,1240],[650,644,1244,1244]],
    'ramen-shop': [[5,20,620,578],[636,20,1250,578],[8,610,620,1245],[640,600,1248,1245]],
};

/** UV-mapped solid store shell. Atlas: front, side, rear, roof, in reading order. */
export function applyConvenienceStoreTextures(root: Node, g: GeometryFactory): void {
    applyShopTextures(root, g, 'convenience-store', '#FF3985');
}

/** Shared solid shell; each shop supplies its own four-panel artwork and neon. */
export function applyShopTextures(root: Node, g: GeometryFactory, atlas: string, neonColor: string): void {
    g.loadTexture(`environment/${atlas}-atlas/texture`, (error, texture) => {
        if (!isValid(root)) return;
        if (error || !texture) {
            console.error(`${root.name} texture could not load; keeping fallback geometry.`, error);
            return;
        }
        // Keep the actual roof machinery, rails, plants and pipes as 3D geometry.
        for (const child of root.children) {
            child.active = /^(Roof (side railing|railing post|front railing|rear railing|HVAC|greenery)|Rooftop planter|HVAC grille|Antenna |Trailing vine|Drainpipe)/.test(child.name);
        }
        const surface = (name: string, vertices: number[], normal: number[], tile: number, emission = 0) => {
            const node = new Node(name); root.addChild(node);
            const u = tile % 2 * .5, v = Math.floor(tile / 2) * .5;
            // Inset UVs to avoid sampling neighbouring atlas panels.
            const e = 1 / texture.width;
            const panel = PANELS[atlas]?.[tile];
            const l = panel ? panel[0]/1254 : u+e, r = panel ? panel[2]/1254 : u+.5-e;
            const t = panel ? panel[1]/1254 : v+e, b = panel ? panel[3]/1254 : v+.5-e;
            const mesh = g.ownMesh(utils.createMesh({ positions: vertices,
                normals: [...normal,...normal,...normal,...normal],
                uvs: [l,b,r,b,l,t,r,t], indices:[0,1,2,2,1,3] }));
            const renderer = node.addComponent(MeshRenderer); renderer.mesh = mesh;
            renderer.shadowCastingMode = MeshRenderer.ShadowCastingMode.ON;
            renderer.setSharedMaterial(g.texturedMaterial(texture, emission),0);
        };
        surface('Textured storefront',[-3.5,0,3, 3.5,0,3, -3.5,5.5,3, 3.5,5.5,3],[0,0,1],0,.38);
        surface('Textured right wall',[3.5,0,3, 3.5,0,-3, 3.5,5.5,3, 3.5,5.5,-3],[1,0,0],1,.08);
        surface('Textured rear wall',[3.5,0,-3, -3.5,0,-3, 3.5,5.5,-3, -3.5,5.5,-3],[0,0,-1],2,.04);
        surface('Textured left wall',[-3.5,0,-3, -3.5,0,3, -3.5,5.5,-3, -3.5,5.5,3],[-1,0,0],1,.08);
        surface('Textured roof',[-3.5,5.51,3, 3.5,5.51,3, -3.5,5.51,-3, 3.5,5.51,-3],[0,1,0],3);
        // Architectural depth around the painted front: sign housing, canopy,
        // mullions, sill and corner columns, without covering the texture art.
        g.part(root,'Sign upper housing','#3C334C',0,3.12,3.08,7,.09,.18);
        g.part(root,'Sign lower housing','#382C42',0,2.23,3.08,7,.08,.18);
        g.part(root,'Store canopy','#542939',0,2.17,3.16,6.95,.1,.38);
        for (const x of [-3.46,3.46]) g.part(root,'Store corner column','#4A4353',x,2.7,3.04,.09,5.4,.12);
        for (const x of [-2.55,-1.05,.4,1.45,2.4]) g.part(root,'Recessed glass divider','#493C3E',x,1.08,3.02,.045,1.95,.07);
        g.part(root,'Entrance threshold','#767074',2.3,.08,2.87,1.6,.16,.25);
        const neon = g.part(root,'Neon sign rim',neonColor,0,3.06,3.19,6.7,.035,.035);
        g.glow(neon,neonColor,1.4);
        const light = (name: string, color: string, x: number, y: number, z: number, flux: number) => {
            const node = new Node(name); root.addChild(node); node.setPosition(x,y,z);
            const lamp = node.addComponent(SphereLight); lamp.color = new Color().fromHEX(color);
            lamp.range = 5; lamp.size = .3; lamp.luminousFlux = flux;
        };
        light('Neon storefront spill',neonColor,-1.7,2.75,3.8,650);
        light('Amber entrance spill','#FFBF77',2.15,1.9,3.6,480);
    });
}
