import { MeshRenderer, Node, utils } from 'cc';
import { GeometryFactory } from './GeometryFactory';
import { applyShopTextures } from './ConvenienceStoreTextures';

const SHOPS = [
    { name: 'Convenience store', atlas: 'convenience-store', sign: 'CONVENIENCE', neon: '#FF3985', wall: '#535269', awning: '#702B4B' },
    { name: 'Coffee shop', atlas: 'coffee-shop', sign: 'COFFEE', neon: '#FFB36A', wall: '#5F4F49', awning: '#783F2D' },
    { name: 'Pharmacy', atlas: 'pharmacy', sign: 'PHARMACY', neon: '#39DFFF', wall: '#4E646B', awning: '#276D63' },
    { name: 'Ramen shop', atlas: 'ramen-shop', sign: 'RAMEN', neon: '#FF393F', wall: '#594B59', awning: '#8C302C' },
];

// Small authored sign alphabet, merged into a single mesh per sign.
const FONT: Record<string, string[]> = {
    A:['01110','10001','10001','11111','10001','10001','10001'],
    C:['01111','10000','10000','10000','10000','10000','01111'],
    E:['11111','10000','10000','11110','10000','10000','11111'],
    F:['11111','10000','10000','11110','10000','10000','10000'],
    H:['10001','10001','10001','11111','10001','10001','10001'],
    I:['111','010','010','010','010','010','111'],
    M:['10001','11011','10101','10101','10001','10001','10001'],
    N:['10001','11001','11001','10101','10011','10011','10001'],
    O:['01110','10001','10001','10001','10001','10001','01110'],
    P:['11110','10001','10001','11110','10000','10000','10000'],
    R:['11110','10001','10001','11110','10100','10010','10001'],
    V:['10001','10001','10001','10001','10001','01010','00100'],
    Y:['10001','10001','01010','00100','00100','00100','00100'],
};

function lettering(parent: Node, g: GeometryFactory, text: string, color: string): void {
    const width = [...text].reduce((n, c) => n + FONT[c][0].length + 1, -1);
    const pixel = Math.min(.075, 5.5 / width);
    const positions: number[] = [], normals: number[] = [], indices: number[] = [];
    let cursor = -width * pixel / 2;
    for (const c of text) {
        const glyph = FONT[c];
        glyph.forEach((row,y) => [...row].forEach((on,x) => {
            if (on !== '1') return;
            const left = cursor + x * pixel, bottom = (3 - y) * pixel;
            const i = positions.length / 3, size = pixel * .9;
            positions.push(left,bottom,0, left+size,bottom,0, left,bottom+size,0, left+size,bottom+size,0);
            normals.push(0,0,1, 0,0,1, 0,0,1, 0,0,1);
            indices.push(i,i+1,i+2,i+2,i+1,i+3);
        }));
        cursor += (glyph[0].length + 1) * pixel;
    }
    const node = new Node(text + ' illuminated lettering'); parent.addChild(node);
    node.setPosition(0,2.9,3.075);
    const renderer = node.addComponent(MeshRenderer);
    renderer.mesh = g.ownMesh(utils.createMesh({positions,normals,indices}));
    renderer.setSharedMaterial(g.material(color,.9),0);
}

/** All ground-level details remain inside the existing 7 x 6 solid footprint. */
export function buildShop(parent: Node, g: GeometryFactory, x: number, z: number, index: number): void {
    const style = SHOPS[index];
    const root = new Node(style.name); parent.addChild(root); root.setPosition(x,0,z);
    // Front faces the east-west street. The solid footprint is symmetric.
    if (z > 0) root.setRotationFromEuler(0,180,0);
    const part = (name:string,color:string,px:number,y:number,pz:number,sx:number,sy:number,sz:number) =>
        g.part(root,name,color,px,y,pz,sx,sy,sz);
    const glow = (name:string,color:string,px:number,y:number,pz:number,sx:number,sy:number,sz:number) => {
        const n=part(name,color,px,y,pz,sx,sy,sz); g.glow(n,color,.55); return n;
    };
    part('House',style.wall,0,2.75,0,7,5.5,6);
    part('Stone foundation','#303746',0,.2,0,7,.4,6);
    part('Upper floor belt','#242E3C',0,3.35,0,7.16,.22,6.12);
    part('Roof cap','#303748',0,5.58,0,7.28,.22,6.24);
    part('Roof inset','#454858',0,5.72,0,6.7,.1,5.7);
    // Front glass and visible shelf silhouettes, with one distinct entrance.
    for (const px of [-2.35,-.75,.85]) {
        part('Window surround','#1E2734',px,1.45,2.95,1.48,2.05,.12);
        glow('Warm shop window','#E9AF72',px,1.45,3.015,1.3,1.85,.025);
        for(const y of [.8,1.3,1.8]) {
            part('Window shelf','#71503D',px,y,3.034,1.25,.045,.02);
            for(const dx of [-.4,0,.4]) part('Display goods',index===2?'#B8DCCF':'#B56D51',px+dx,y+.13,3.047,.17,.22,.02);
        }
        part('Window mullion','#27323E',px,1.45,3.06,.065,1.9,.04);
    }
    part('Door frame','#25303D',2.35,1.35,2.95,1.25,2.3,.1);
    glow('Entrance glass','#D9AA75',2.35,1.35,3.015,1.05,2.1,.025);
    part('Door rail','#343C45',2.35,1.35,3.04,.055,2.1,.04);
    part('Door handle','#D8D2B7',2.65,1.25,3.07,.055,.35,.055);
    part('Sign fascia','#202635',0,2.9,3.015,6.7,.82,.1);
    glow('Sign top trim',style.neon,0,3.28,3.08,6.6,.045,.04);
    glow('Sign bottom trim',style.neon,0,2.52,3.08,6.6,.045,.04);
    lettering(root,g,style.sign,style.neon);
    part('Canvas awning',style.awning,0,2.4,2.82,6.6,.14,.65);
    for(let i=0;i<12;i++) part('Awning stripe',i%2?style.awning:'#B69B80',-3.03+i*.55,2.3,3.11,.49,.18,.06);
    // Upper-floor windows and side windows make the shops read as real buildings.
    for(const px of [-2.25,0,2.25]) {
        part('Upper window recess','#202735',px,4.35,3.015,1.7,1.45,.05);
        glow('Upper warm glass',index===2?'#8ACCB9':'#D69A65',px,4.35,3.05,1.5,1.25,.03);
        part('Upper window mullion','#37414D',px,4.35,3.08,.065,1.3,.035);
        part('Upper window sill','#6C6F7A',px,3.67,3.07,1.8,.1,.15);
    }
    for(const side of [-1,1]) {
        for(const pz of [-1.8,.2,1.8]) for(const y of [1.55,4.35]) {
            part('Side window frame','#242D3B',side*3.51,y,pz,.04,1.25,1.15);
            glow('Side window glass',y>3?'#BD9167':'#7D958D',side*3.54,y,pz,.025,1.05,.95);
            part('Side window bar','#303947',side*3.57,y,pz,.025,1.08,.055);
        }
        part('Drainpipe','#72757F',side*3.3,2.8,-2.86,.1,5.4,.12);
        part('Roof side railing','#3D4655',side*3.25,6.05,0,.065,.065,5.3);
        for(const pz of [-2.5,0,2.5]) part('Roof railing post','#4E5765',side*3.25,5.9,pz,.065,.5,.065);
    }
    part('Roof front railing','#49515F',0,6.05,2.6,6.5,.065,.065);
    part('Roof rear railing','#49515F',0,6.05,-2.6,6.5,.065,.065);
    for(const px of [-1.4,1.25]) {
        part('Roof HVAC','#747581',px,6.05,-.9,1.6,.65,1.45);
        for(let n=0;n<5;n++) part('HVAC grille','#303848',px-.57+n*.28,6.39,-.9,.13,.025,1.05);
    }
    part('Antenna mast','#75717E',-2.6,6.5,-2,.055,1.65,.055);
    part('Antenna crossbar','#777681',-2.6,7,-2,1.15,.04,.04);
    for(const px of [-2.65,2.65]) {
        part('Rooftop planter','#514D4B',px,5.85,1.8,1,.25,1);
        for(let n=0;n<4;n++) g.form(root,'Roof greenery',n%2?'#53654C':'#75805A',px-.3+n*.2,6.05,1.8,.35,.5,.55,'crystal');
        for(let n=0;n<5;n++) g.form(root,'Trailing vine','#536952',px+(n%2)*.12,5.5-n*.28,3.1,.2,.4,.13,'crystal');
    }
    // A projecting icon is legible from the street even at the opposite corner.
    const icon = new Node(style.name+' projecting icon'); root.addChild(icon);
    icon.setPosition(3.15,3.15,2.45); icon.setRotationFromEuler(0,90,0);
    g.part(icon,'Icon backing','#222B39',0,0,0,1.15,1.15,.14);
    const mark=(name:string,px:number,y:number,sx:number,sy:number) => {
        const n=g.part(icon,name,style.neon,px,y,.09,sx,sy,.035);g.glow(n,style.neon,.8);
    };
    if(index===2) { mark('Pharmacy cross',0,0,.24,.85);mark('Pharmacy cross',0,0,.85,.24); }
    else if(index===1) { mark('Coffee cup',-.08,-.06,.48,.42);mark('Cup handle',.27,-.03,.15,.28);mark('Coffee steam',-.12,.32,.05,.22);mark('Cup saucer',0,-.33,.75,.06); }
    else if(index===3) { mark('Ramen bowl',0,-.1,.7,.32);mark('Bowl foot',0,-.32,.32,.08);for(const px of [-.22,0,.22])mark('Noodle steam',px,.29,.05,.32); }
    else { mark('Store stripe',0,-.25,.8,.12);mark('Store stripe',0,0,.8,.12);mark('Store stripe',0,.25,.8,.12); }
    if(index===0 || index===2) {
        part('Blue vending machine','#2F4662',-3.12,.95,2.65,.65,1.8,.65);
        glow('Vending display','#66D8EC',-3.12,1.12,2.985,.49,1.12,.025);
        for(const y of [.77,1.07,1.37]) for(const px of [-3.28,-3.1,-2.94]) {
            part('Vending drink',y>1?'#EBBCA0':'#41698C',px,y,3.005,.1,.18,.02);
        }
        part('Vending dispenser','#1C293C',-3.12,.35,2.99,.4,.18,.025);
    }
    if(index===3) for(const px of [-2.7,-1.35,0,1.35]) {
        const lantern=g.form(root,'Red ramen lantern','#F65F42',px,2.08,3.09,.34,.48,.25,'taper');g.glow(lantern,'#F65F42',.45);
    }
    applyShopTextures(root,g,style.atlas,style.neon);
}
