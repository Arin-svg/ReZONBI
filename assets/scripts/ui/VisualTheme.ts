import { Color, Graphics, Node } from 'cc';
import { ui } from './ExplorationHUD';

export const Accent = { bullet: '#FF779F', blade: '#B5A0FF', shadow: '#79BFFF', pulse: '#6CE5FF', blood: '#FFA9B6', magnet: '#7AE3BE' };
export type Icon = keyof typeof Accent | 'knife' | 'pause' | 'play' | 'portrait';
/** Original vector glyphs: crisp at phone sizes, no texture dependency. */
export function icon(parent: Node, kind: Icon, size: number, tint = '#F5E7F0'): Node {
    const n = ui(parent, 'Icon ' + kind, size, size), g = n.addComponent(Graphics), s = size / 64;
    const polygon = (points: number[][], c: string) => { g.fillColor = new Color().fromHEX(c); g.moveTo(points[0][0] * s, points[0][1] * s); points.slice(1).forEach(p => g.lineTo(p[0] * s, p[1] * s)); g.close(); g.fill(); };
    const line = (points: number[][], width = 3) => { g.strokeColor = new Color().fromHEX(tint); g.lineWidth = width * s; g.moveTo(points[0][0] * s, points[0][1] * s); points.slice(1).forEach(p => g.lineTo(p[0] * s, p[1] * s)); g.stroke(); };
    if (kind === 'bullet') {
        polygon([[-25,16],[24,16],[24,5],[3,5],[-1,-3],[-7,-3],[-10,-22],[-22,-22],[-17,5],[-25,5]], tint);
        line([[0,2],[0,-7],[-6,-7]], 2); line([[28,12],[32,12]], 2);
    } else if (kind === 'knife' || kind === 'blade') {
        polygon([[-7,-10],[15,24],[25,28],[22,12],[1,-15]], tint); line([[-18,-20],[-5,-6]], 8); line([[-12,-4],[5,-17]], 4);
        if (kind === 'blade') { line([[-26,2],[-22,19],[-8,27]], 2); line([[7,-27],[22,-19],[27,-4]], 2); }
    } else if (kind === 'shadow') {
        polygon([[-7,24],[7,24],[21,2],[5,-23],[-9,-23],[7,2]], tint);
        line([[-29,14],[-12,14]]); line([[-32,2],[-17,2]]); line([[-27,-11],[-12,-11]]);
    } else if (kind === 'pulse') {
        polygon([[5,29],[-18,-3],[-3,-3],[-10,-29],[22,7],[6,7]], tint);
        line([[-27,13],[-30,0],[-25,-13]], 2); line([[25,20],[30,8],[29,-7]], 2);
    } else if (kind === 'blood') {
        g.fillColor = new Color().fromHEX(tint); g.moveTo(0,-25*s); g.bezierCurveTo(-52*s,5*s,-17*s,40*s,0,17*s); g.bezierCurveTo(17*s,40*s,52*s,5*s,0,-25*s); g.fill();
        g.strokeColor = new Color(29, 26, 44); g.lineWidth = 3*s; g.moveTo(-17*s,0); g.lineTo(-5*s,0); g.lineTo(0,8*s); g.lineTo(5*s,-8*s); g.lineTo(10*s,0); g.lineTo(19*s,0); g.stroke();
    } else if (kind === 'magnet') {
        line([[-20,22],[-20,-9],[-13,-22],[0,-26],[13,-22],[20,-9],[20,22]], 10);
        line([[-28,28],[-32,32]], 2); line([[28,28],[32,32]], 2);
    } else if (kind === 'pause') { line([[-9,-18],[-9,18]], 6); line([[9,-18],[9,18]], 6); }
    else if (kind === 'play') polygon([[-12,-22],[-12,22],[23,0]], tint);
    else {
        g.fillColor = new Color(42, 29, 54); g.circle(0,0,30*s); g.fill();
        polygon([[-23,-18],[-24,12],[-14,27],[10,29],[24,13],[25,-25],[12,-9],[-12,-10]], '#E8CDE3');
        polygon([[-14,13],[14,13],[16,-5],[0,-19],[-15,-5]], '#F0C6C5');
        polygon([[-23,11],[-7,27],[19,22],[22,7],[3,16],[-7,3],[-5,18],[-18,-4]], '#F9E8F3');
        line([[-11,0],[-5,-1]], 3); line([[5,-1],[11,0]], 3);
        polygon([[-19,-17],[-7,-11],[0,-20],[8,-11],[22,-21],[27,-31],[-27,-31]], '#242538');
        polygon([[-6,-18],[0,-23],[7,-18],[4,-30],[-3,-30]], '#ED547F');
    }
    return n;
}
export function disc(parent: Node, radius: number, tint = '#FF779F'): Graphics {
    const g = parent.addComponent(Graphics); g.fillColor = new Color(12, 18, 34, 185); g.circle(0, 0, radius); g.fill();
    g.strokeColor = new Color().fromHEX(tint); g.lineWidth = 2; g.stroke();
    g.strokeColor = new Color(148, 172, 203, 70); g.lineWidth = 1; g.circle(0, 0, radius - 6); g.stroke(); return g;
}
