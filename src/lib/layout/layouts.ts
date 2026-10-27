import { type Box, clampScale, IDENTITY_VIEWPORT, VERTEX_RADIUS, type Viewport } from '@/lib/geometry';
import type { Graph, Point, Positions, VertexId } from '@/lib/graph/types';

/** Escala máxima al encuadrar, para que un grafo pequeño no se vea gigante. */
const MAX_FIT_SCALE = 1.5;
const MIN_SEPARATION = 2.2 * VERTEX_RADIUS;

export function circleLayout(vertices: readonly VertexId[], box: Box): Positions {
  const cx = box.width / 2;
  const cy = box.height / 2;
  if (vertices.length === 1) return { [vertices[0]]: { x: cx, y: cy } };
  const radius = Math.min(box.width, box.height) / 2 - box.padding;
  return Object.fromEntries(
    vertices.map((v, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / vertices.length;
      return [v, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }];
    }),
  );
}

const clampToBox = (p: Point, box: Box): Point => ({
  x: Math.min(box.width - box.padding, Math.max(box.padding, p.x)),
  y: Math.min(box.height - box.padding, Math.max(box.padding, p.y)),
});

/**
 * Fruchterman–Reingold sin aleatoriedad (parte del círculo), seguido de una pasada que separa
 * los vértices que quedaron demasiado cerca. Mismo grafo → mismas posiciones.
 */
export function forceLayout(g: Graph, box: Box, opts: { iterations?: number } = {}): Positions {
  const iterations = opts.iterations ?? 300;
  const n = g.vertices.length;
  const start = circleLayout(g.vertices, box);
  const pos = g.vertices.map((v) => ({ ...start[v] }));
  if (n <= 1) return start;

  const index = new Map(g.vertices.map((v, i) => [v, i]));
  const edges = g.edges.map(([a, b]) => [index.get(a)!, index.get(b)!] as const);
  const area = (box.width - 2 * box.padding) * (box.height - 2 * box.padding);
  const k = Math.sqrt(area / n);
  const initialTemperature = (box.width - 2 * box.padding) / 8;

  for (let iter = 0; iter < iterations; iter++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[i].x - pos[j].x;
        let dy = pos[i].y - pos[j].y;
        if (dx === 0 && dy === 0) {
          dx = 0.01 * (i - j);
          dy = 0.01;
        }
        const d = Math.hypot(dx, dy);
        const force = (k * k) / d;
        disp[i].x += (dx / d) * force;
        disp[i].y += (dy / d) * force;
        disp[j].x -= (dx / d) * force;
        disp[j].y -= (dy / d) * force;
      }
    }
    for (const [a, b] of edges) {
      const dx = pos[a].x - pos[b].x;
      const dy = pos[a].y - pos[b].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const force = (d * d) / k;
      disp[a].x -= (dx / d) * force;
      disp[a].y -= (dy / d) * force;
      disp[b].x += (dx / d) * force;
      disp[b].y += (dy / d) * force;
    }
    const temperature = initialTemperature * (1 - iter / iterations);
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(disp[i].x, disp[i].y);
      if (d === 0) continue;
      const step = Math.min(d, temperature);
      pos[i] = clampToBox({ x: pos[i].x + (disp[i].x / d) * step, y: pos[i].y + (disp[i].y / d) * step }, box);
    }
  }

  for (let pass = 0; pass < 100; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= MIN_SEPARATION) continue;
        const push = (MIN_SEPARATION - d) / 2;
        pos[i] = clampToBox({ x: pos[i].x - (dx / d) * push, y: pos[i].y - (dy / d) * push }, box);
        pos[j] = clampToBox({ x: pos[j].x + (dx / d) * push, y: pos[j].y + (dy / d) * push }, box);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return Object.fromEntries(g.vertices.map((v, i) => [v, pos[i]]));
}

export function autoLayout(g: Graph, box: Box): Positions {
  return g.vertices.length <= 8 || g.edges.length === 0 ? circleLayout(g.vertices, box) : forceLayout(g, box);
}

/** Convierte posiciones en [0,1]×[0,1] al área útil de la caja. */
export function fromNormalized(norm: Positions, box: Box): Positions {
  const w = box.width - 2 * box.padding;
  const h = box.height - 2 * box.padding;
  return Object.fromEntries(
    Object.entries(norm).map(([v, p]) => [v, { x: box.padding + p.x * w, y: box.padding + p.y * h }]),
  );
}

/** Viewport que centra y muestra todos los vértices (con su radio) dentro de la vista. */
export function fitViewport(positions: Positions, view: { width: number; height: number }, padding: number): Viewport {
  const points = Object.values(positions);
  if (points.length === 0) return IDENTITY_VIEWPORT;
  const minX = Math.min(...points.map((p) => p.x)) - VERTEX_RADIUS;
  const maxX = Math.max(...points.map((p) => p.x)) + VERTEX_RADIUS;
  const minY = Math.min(...points.map((p) => p.y)) - VERTEX_RADIUS;
  const maxY = Math.max(...points.map((p) => p.y)) + VERTEX_RADIUS;
  const fit = Math.min((view.width - 2 * padding) / (maxX - minX), (view.height - 2 * padding) / (maxY - minY));
  const scale = clampScale(Math.min(MAX_FIT_SCALE, fit));
  return {
    scale,
    tx: view.width / 2 - ((minX + maxX) / 2) * scale,
    ty: view.height / 2 - ((minY + maxY) / 2) * scale,
  };
}

/** Conserva las posiciones de los vértices que ya existían; los nuevos toman las de `autoLayout`. */
export function mergePositions(old: Positions, g: Graph, box: Box): Positions {
  const auto = autoLayout(g, box);
  return Object.fromEntries(g.vertices.map((v) => [v, old[v] ?? auto[v]]));
}
