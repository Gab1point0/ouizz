// Zones correctes de la question « Point sur l'image ».
// Coordonnées relatives à l'image (0..1). Cercle : centre x,y + rayon r (relatif à la largeur, ar = hauteur/largeur).
// Rectangle : centre x,y + largeur w, hauteur h. Polygone (tracé point par point ou à main levée) : pts.
import type { Question, Zone } from './types';

export function zonesOf(q: Pick<Question, 'zone' | 'zones'>): Zone[] {
  return q.zones ?? (q.zone ? [q.zone] : []);
}

export function inZone(z: Zone, p: { x: number; y: number }): boolean {
  const shape = z.shape ?? 'circle';
  if (shape === 'rect') return Math.abs(p.x - z.x) <= (z.w ?? 0) / 2 && Math.abs(p.y - z.y) <= (z.h ?? 0) / 2;
  if (shape === 'poly') {
    const pts = z.pts ?? [];
    if (pts.length < 3) return false;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  return Math.hypot(p.x - z.x, (p.y - z.y) * (z.ar ?? 1)) <= z.r;
}

export function inAnyZone(zones: Zone[], p: { x: number; y: number }): boolean {
  return zones.some((z) => inZone(z, p));
}

/** Simplifie un tracé à main levée (garde les points espacés d'au moins `min`). */
export function simplify(pts: [number, number][], min = 0.012): [number, number][] {
  const out: [number, number][] = [];
  for (const p of pts) {
    const l = out[out.length - 1];
    if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) >= min) out.push(p);
  }
  return out;
}

/** Aire d'un polygone (formule du lacet), en fraction de l'image. */
export function polyArea(pts: [number, number][]): number {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(a / 2);
}

export function zoneOk(z: Zone): boolean {
  const shape = z.shape ?? 'circle';
  if (shape === 'rect') return (z.w ?? 0) > 0.005 && (z.h ?? 0) > 0.005;
  if (shape === 'poly') return (z.pts?.length ?? 0) >= 3 && polyArea(z.pts!) > 0.0003;
  return z.r > 0;
}
