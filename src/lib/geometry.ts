import type { Edge, Graph, Point, Positions, VertexId } from '@/lib/graph/types';

/** Transformación del lienzo: pantalla = mundo * scale + (tx, ty). */
export interface Viewport {
  scale: number;
  tx: number;
  ty: number;
}

export interface Box {
  width: number;
  height: number;
  padding: number;
}

export const IDENTITY_VIEWPORT: Viewport = { scale: 1, tx: 0, ty: 0 };

export const VERTEX_RADIUS = 22;
/** Mayor que el radio dibujado para que el objetivo táctil supere los 48 dp. */
export const VERTEX_HIT_RADIUS = 30;
export const EDGE_HIT_TOLERANCE = 14;
export const MIN_SCALE = 0.3;
export const MAX_SCALE = 3;

/** Caja de referencia del mundo para los layouts; luego `fitViewport` la adapta a la pantalla real. */
export const WORLD_BOX: Box = { width: 360, height: 520, padding: 40 };

export function screenToWorld(p: Point, vp: Viewport): Point {
  return { x: (p.x - vp.tx) / vp.scale, y: (p.y - vp.ty) / vp.scale };
}

export function worldToScreen(p: Point, vp: Viewport): Point {
  return { x: p.x * vp.scale + vp.tx, y: p.y * vp.scale + vp.ty };
}

/** Punta de flecha de los grafos dirigidos: largo (en la dirección de la arista) y ancho de la base. */
export const ARROW_LENGTH = 12;
export const ARROW_WIDTH = 10;

/**
 * Flecha de `a` a `b` entre dos círculos de radio `radius`: la línea va del borde de `a` a la base de la punta, y la
 * punta toca el borde de `b`. `null` si no queda sitio para la punta (círculos encimados o casi).
 */
export function arrowGeometry(
  a: Point,
  b: Point,
  radius: number,
): { x1: number; y1: number; x2: number; y2: number; head: [Point, Point, Point] } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d - 2 * radius < ARROW_LENGTH) return null;
  const ux = dx / d;
  const uy = dy / d;
  const tip = { x: b.x - ux * radius, y: b.y - uy * radius };
  const base = { x: tip.x - ux * ARROW_LENGTH, y: tip.y - uy * ARROW_LENGTH };
  const half = ARROW_WIDTH / 2;
  return {
    x1: a.x + ux * radius,
    y1: a.y + uy * radius,
    x2: base.x,
    y2: base.y,
    head: [tip, { x: base.x - uy * half, y: base.y + ux * half }, { x: base.x + uy * half, y: base.y - ux * half }],
  };
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Vértice más cercano dentro del radio; ante empate gana el dibujado encima (el último). */
export function hitTestVertex(
  p: Point,
  positions: Positions,
  vertices: readonly VertexId[],
  radius = VERTEX_HIT_RADIUS,
): VertexId | null {
  let best: VertexId | null = null;
  let bestDistance = radius;
  for (const v of vertices) {
    const q = positions[v];
    if (!q) continue;
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d <= bestDistance) {
      best = v;
      bestDistance = d;
    }
  }
  return best;
}

export function hitTestEdge(p: Point, g: Graph, positions: Positions, tolerance = EDGE_HIT_TOLERANCE): Edge | null {
  let best: Edge | null = null;
  let bestDistance = tolerance;
  for (const edge of g.edges) {
    const a = positions[edge[0]];
    const b = positions[edge[1]];
    if (!a || !b) continue;
    const d = distanceToSegment(p, a, b);
    if (d <= bestDistance) {
      best = edge;
      bestDistance = d;
    }
  }
  return best;
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}
