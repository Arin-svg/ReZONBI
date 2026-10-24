import { Obstacle, PointXZ } from '../core/MovementMath';

export const CITY = { size:36, seed:20261025, rebaseDistance:144, retireDistance:90 };
export function chunkAt(value:number):number {return Math.floor((value+CITY.size/2)/CITY.size);}
export function chunkVariant(seed:number,x:number,z:number):number {
    let h=(seed^Math.imul(x,73856093)^Math.imul(z,19349663))>>>0;
    h=Math.imul(h^(h>>>16),2246822507);return (h^(h>>>13))>>>0;
}
/** Isometric ground-plane extent plus roof height, camera lag and a spawn buffer. */
export function chunkRadius(aspect:number,orthoHeight:number):number {
    const extent=orthoHeight*(Math.max(1,aspect)+Math.sqrt(17*17+2*14*14)/17)*Math.SQRT1_2+10;
    return Math.max(1,Math.min(2,Math.ceil(extent/CITY.size)));
}
export function chunkCells(p:PointXZ,origin:PointXZ,radius:number):PointXZ[] {
    const cx=chunkAt(p.x+origin.x),cz=chunkAt(p.z+origin.z),cells:PointXZ[]=[];
    for(let z=cz-radius;z<=cz+radius;z++)for(let x=cx-radius;x<=cx+radius;x++)cells.push({x,z});
    return cells;
}
export function chunkSolids(local:readonly Obstacle[],cx:number,cz:number,origin:PointXZ,turned:boolean):Obstacle[] {
    const sign=turned?-1:1;
    return local.map(o=>({x:cx*CITY.size-origin.x+o.x*sign,z:cz*CITY.size-origin.z+o.z*sign,halfX:o.halfX,halfZ:o.halfZ}));
}
export function originShift(p:PointXZ):PointXZ {
    return {x:Math.abs(p.x)>=CITY.rebaseDistance?chunkAt(p.x)*CITY.size:0,z:Math.abs(p.z)>=CITY.rebaseDistance?chunkAt(p.z)*CITY.size:0};
}
