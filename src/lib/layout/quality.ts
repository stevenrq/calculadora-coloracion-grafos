import { distanceToSegment } from '@/lib/geometry';
import type { Graph, Point, Positions } from '@/lib/graph/types';

/** Métricas para juzgar un dibujo: con ellas se elige el mejor layout y se prueba que no empeore. */

export function minVertexDistance(pos: Positions): number {
  const points = Object.values(pos);
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      min = Math.min(min, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
    }
  }
  return min;
}

/** Cuántos pares (arista, vértice ajeno a ella) quedan a menos de `clearance`: la arista parece pasar por el vértice. */
export function edgeIntrusions(g: Graph, pos: Positions, clearance: number): number {
  let count = 0;
  for (const [a, b] of g.edges) {
    for (const v of g.vertices) {
      if (v !== a && v !== b && distanceToSegment(pos[v], pos[a], pos[b]) < clearance) count++;
    }
  }
  return count;
}

const orientation = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

/** Si los segmentos `ab` y `cd` se cruzan en un punto interior de ambos. */
export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/** Cruces entre aristas sin extremo común (las que comparten un vértice solo se tocan ahí). */
export function edgeCrossings(g: Graph, pos: Positions): number {
  let count = 0;
  for (let i = 0; i < g.edges.length; i++) {
    const [a, b] = g.edges[i];
    for (let j = i + 1; j < g.edges.length; j++) {
      const [c, d] = g.edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (segmentsCross(pos[a], pos[b], pos[c], pos[d])) count++;
    }
  }
  return count;
}

export function boundingBox(pos: Positions): { minX: number; minY: number; width: number; height: number } {
  const points = Object.values(pos);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}
