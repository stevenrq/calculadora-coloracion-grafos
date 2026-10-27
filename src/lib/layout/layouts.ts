import { connectedComponents } from '@/lib/analysis/components';
import { type Box, clampScale, distanceToSegment, IDENTITY_VIEWPORT, VERTEX_RADIUS, type Viewport } from '@/lib/geometry';
import type { Graph, Point, Positions, VertexId } from '@/lib/graph/types';
import { forceLayout, graphDistances, type IndexEdge, seededRandom, separate, stressLayout } from './engines';
import { segmentsCross } from './quality';

/** Escala máxima al encuadrar, para que un grafo pequeño no se vea gigante. */
const MAX_FIT_SCALE = 1.5;
/** Distancia mínima entre centros: los círculos quedan con aire entre sí. */
export const MIN_SEPARATION = 2.8 * VERTEX_RADIUS;
/** Distancia mínima de una arista al centro de un vértice ajeno: así no parece que pasa por él. */
export const EDGE_CLEARANCE = VERTEX_RADIUS + 10;
/** Largo de arista de los grafos grandes; los pequeños usan aristas más largas para llenar la caja. */
const MIN_EDGE_LENGTH = 1.15 * MIN_SEPARATION;
const MAX_EDGE_LENGTH = 150;
/** Alto/ancho del área útil del lienzo en un celular vertical. */
const PORTRAIT_RATIO = 1.6;

export function circleLayout(vertices: readonly VertexId[], box: Box): Positions {
  const cx = box.width / 2;
  const cy = box.height / 2;
  if (vertices.length === 1) return { [vertices[0]]: { x: cx, y: cy } };
  const radius = Math.min(box.width, box.height) / 2 - box.padding;
  const points = ring(vertices.length, radius);
  return Object.fromEntries(vertices.map((v, i) => [v, { x: cx + points[i].x, y: cy + points[i].y }]));
}

function ring(count: number, radius: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
}

/** Orden DFS desde el primer vértice: en un círculo deja juntos a los vecinos y así hay menos cruces. */
function dfsOrder(n: number, edges: readonly IndexEdge[]): number[] {
  const adj = adjacency(n, edges);
  const seen = new Array<boolean>(n).fill(false);
  const order: number[] = [];
  const stack = [0];
  while (stack.length > 0) {
    const v = stack.pop()!;
    if (seen[v]) continue;
    seen[v] = true;
    order.push(v);
    for (let k = adj[v].length - 1; k >= 0; k--) if (!seen[adj[v][k]]) stack.push(adj[v][k]);
  }
  return order;
}

/** El ciclo más corto que pasa por cada arista, sin repetir: en un grafo plano casi siempre son sus caras. */
function shortCycles(n: number, edges: readonly IndexEdge[]): number[][] {
  const adj = adjacency(n, edges);
  const seen = new Set<string>();
  const cycles: number[][] = [];
  for (const [u, v] of edges) {
    // Camino más corto de v a u (BFS) sin usar la arista u–v; con ella cierra el ciclo.
    const prev = new Array<number>(n).fill(-1);
    prev[v] = v;
    const queue = [v];
    for (let head = 0; head < queue.length && prev[u] === -1; head++) {
      const x = queue[head];
      for (const y of adj[x]) {
        if (prev[y] !== -1 || (x === v && y === u)) continue;
        prev[y] = x;
        queue.push(y);
      }
    }
    if (prev[u] === -1) continue; // La arista es un puente: no está en ningún ciclo.
    const cycle = [u];
    for (let x = u; x !== v; ) {
      x = prev[x];
      cycle.push(x);
    }
    const key = [...cycle].sort((a, b) => a - b).join(',');
    if (!seen.has(key)) {
      seen.add(key);
      cycles.push(cycle);
    }
  }
  return cycles;
}

/**
 * Dibujo de Tutte: el ciclo `outer` en un polígono regular y cada vértice restante en el promedio de sus vecinos.
 * Si el grafo es plano y 3-conexo y `outer` es una de sus caras, queda sin cruces (teorema de Tutte).
 */
function tutteLayout(n: number, edges: readonly IndexEdge[], outer: readonly number[], radius: number): Point[] {
  const adj = adjacency(n, edges);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const fixed = new Array<boolean>(n).fill(false);
  ring(outer.length, radius).forEach((p, i) => {
    xs[outer[i]] = p.x;
    ys[outer[i]] = p.y;
    fixed[outer[i]] = true;
  });
  for (let iter = 0; iter < 300; iter++) {
    let maxMove = 0;
    for (let v = 0; v < n; v++) {
      if (fixed[v]) continue;
      let sx = 0;
      let sy = 0;
      for (const w of adj[v]) {
        sx += xs[w];
        sy += ys[w];
      }
      const x = sx / adj[v].length;
      const y = sy / adj[v].length;
      maxMove = Math.max(maxMove, Math.abs(x - xs[v]) + Math.abs(y - ys[v]));
      xs[v] = x;
      ys[v] = y;
    }
    if (maxMove < 0.1) break;
  }
  return Array.from(xs, (x, i) => ({ x, y: ys[i] }));
}

function adjacency(n: number, edges: readonly IndexEdge[]): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

/** Marco vertical con espacio holgado para `n` vértices: crece con el grafo en vez de apretarlo. */
function portraitFrame(n: number, edgeLength: number): { width: number; height: number } {
  const width = Math.sqrt((n * (1.15 * edgeLength) ** 2) / PORTRAIT_RATIO);
  return { width, height: width * PORTRAIT_RATIO };
}

/**
 * Gira el dibujo para que quepa lo más grande posible en una pantalla vertical, con el primer vértice arriba.
 * Prueba giros de 3 en 3 grados: el eje principal (PCA) falla con dibujos cuadrados, como una cuadrícula, que
 * quedaban girados 45° y ocupaban más.
 */
function orientPortrait(pos: readonly Point[]): Point[] {
  const n = pos.length;
  const cx = pos.reduce((s, p) => s + p.x, 0) / n;
  const cy = pos.reduce((s, p) => s + p.y, 0) / n;
  const rotate = (angle: number) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return pos.map((p) => ({ x: (p.x - cx) * cos - (p.y - cy) * sin, y: (p.x - cx) * sin + (p.y - cy) * cos }));
  };
  let bestAngle = 0;
  let bestNeed = Infinity;
  for (let k = 0; k < 60; k++) {
    const angle = (k * Math.PI) / 60;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = pos[i].x * cos - pos[i].y * sin;
      const y = pos[i].x * sin + pos[i].y * cos;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    // Lo que hace falta de alto para que entre en una pantalla de proporción PORTRAIT_RATIO.
    const need = Math.max((maxX - minX) * PORTRAIT_RATIO, maxY - minY);
    if (need < bestNeed - 1e-6) {
      bestNeed = need;
      bestAngle = angle;
    }
  }
  const out = rotate(bestAngle);
  return out[0].y > 0 ? out.map((p) => ({ x: -p.x, y: -p.y })) : out;
}

/**
 * Menor es mejor. En orden de importancia: vértices encimados, aristas que pasan por vértices, que no quepa en la
 * pantalla, cruces de aristas y, por último, aristas de largos muy distintos.
 */
function layoutScore(
  pos: readonly Point[],
  edges: readonly IndexEdge[],
  frame: { width: number; height: number },
  dense: boolean,
) {
  let overlaps = 0;
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      if (Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y) < MIN_SEPARATION - 0.01) overlaps++;
    }
  }
  // En un grafo denso las intrusiones y los cruces son inevitables (y contarlos es caro): ahí deciden el tamaño y
  // la regularidad.
  let intrusions = 0;
  let crossings = 0;
  if (!dense) {
    for (const [a, b] of edges) {
      for (let v = 0; v < pos.length; v++) {
        if (v !== a && v !== b && distanceToSegment(pos[v], pos[a], pos[b]) < EDGE_CLEARANCE - 0.01) intrusions++;
      }
    }
    for (let i = 0; i < edges.length; i++) {
      const [a, b] = edges[i];
      for (let j = i + 1; j < edges.length; j++) {
        const [c, d] = edges[j];
        if (a !== c && a !== d && b !== c && b !== d && segmentsCross(pos[a], pos[b], pos[c], pos[d])) crossings++;
      }
    }
  }
  const xs = pos.map((p) => p.x);
  const ys = pos.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  // Pasarse un poco del marco cuesta poco (un 10 % equivale a un cruce); pasarse más del 30 % deja el dibujo
  // pequeño en el celular y cada 10 % extra pesa como 20 cruces.
  const ratio = Math.max(width / frame.width, height / frame.height);
  const overflow = Math.max(0, ratio - 1) * 1000 + Math.max(0, ratio - 1.3) * 2e4;
  const lengths = edges.map(([a, b]) => Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y));
  const mean = lengths.reduce((s, l) => s + l, 0) / (lengths.length || 1);
  const spread = mean > 0 ? Math.sqrt(lengths.reduce((s, l) => s + (l - mean) ** 2, 0) / lengths.length) / mean : 0;
  return overlaps * 1e6 + intrusions * 1e4 + overflow + crossings * 100 + spread * 10;
}

/**
 * Retoque final: si una arista que termina en una hoja está cruzada, prueba la hoja en 32 posiciones alrededor de su
 * vecino y la deja donde se cruza con menos aristas, sin encimarla ni ponerla sobre (o debajo de) una arista.
 * Modifica `pos`.
 */
function untangleLeaves(pos: Point[], edges: readonly IndexEdge[], edgeLength: number, clearance: number): void {
  const degree = new Array<number>(pos.length).fill(0);
  for (const [a, b] of edges) {
    degree[a]++;
    degree[b]++;
  }
  const crossingsOf = (leaf: number, hub: number, p: Point) =>
    edges.filter(
      ([c, d]) => c !== leaf && d !== leaf && c !== hub && d !== hub && segmentsCross(pos[hub], p, pos[c], pos[d]),
    ).length;
  const fits = (leaf: number, hub: number, p: Point) =>
    pos.every((q, v) => v === leaf || Math.hypot(q.x - p.x, q.y - p.y) >= MIN_SEPARATION) &&
    (clearance === 0 ||
      (edges.every(([c, d]) => c === leaf || d === leaf || distanceToSegment(p, pos[c], pos[d]) >= clearance) &&
        pos.every((q, v) => v === leaf || v === hub || distanceToSegment(q, pos[hub], p) >= clearance)));
  for (const [a, b] of edges) {
    const leaf = degree[a] === 1 ? a : degree[b] === 1 ? b : -1;
    if (leaf < 0) continue;
    const hub = leaf === a ? b : a;
    let best = { p: pos[leaf], crossings: crossingsOf(leaf, hub, pos[leaf]) };
    for (let k = 0; k < 32 && best.crossings > 0; k++) {
      const angle = (2 * Math.PI * (k % 16)) / 16;
      const r = edgeLength * (k < 16 ? 1 : 1.5);
      const p = { x: pos[hub].x + r * Math.cos(angle), y: pos[hub].y + r * Math.sin(angle) };
      if (!fits(leaf, hub, p)) continue;
      const crossings = crossingsOf(leaf, hub, p);
      if (crossings < best.crossings) best = { p, crossings };
    }
    pos[leaf] = best.p;
  }
}

/** Ancho y alto del dibujo. */
function extent(pos: readonly Point[]): { width: number; height: number } {
  const xs = pos.map((p) => p.x);
  const ys = pos.map((p) => p.y);
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

/** Dibuja una componente conexa: prueba varios métodos y arranques, repara cada resultado y se queda con el mejor. */
function layoutComponent(n: number, edges: readonly IndexEdge[], edgeLength: number): Point[] {
  if (n === 1) return [{ x: 0, y: 0 }];
  if (n === 2) {
    return [
      { x: 0, y: -edgeLength / 2 },
      { x: 0, y: edgeLength / 2 },
    ];
  }
  // Un vértice con muchos vecinos necesita aristas más largas para que sus vecinos quepan alrededor sin encimarse.
  const degree = new Array<number>(n).fill(0);
  for (const [a, b] of edges) {
    degree[a]++;
    degree[b]++;
  }
  const lengths = edges.map(([a, b]) =>
    Math.max(edgeLength, (Math.max(degree[a], degree[b]) * MIN_SEPARATION * 1.05) / (2 * Math.PI)),
  );
  const dist = graphDistances(n, edges, lengths);
  const frame = portraitFrame(n, edgeLength);
  const ringPoints = ring(n, edgeLength / (2 * Math.sin(Math.PI / n)));
  const circle: Point[] = new Array(n);
  dfsOrder(n, edges).forEach((v, i) => (circle[v] = ringPoints[i]));

  // En grafos grandes el estrés se corta antes: lo que le falta afinar no se nota y en el celular cada iteración
  // cuesta (Hermes no tiene JIT).
  const stressIterations = n <= 30 ? 200 : 120;
  const stressed = [stressLayout(dist, circle, stressIterations)];
  const forced = [forceLayout(edges, circle, frame)];
  const randomStarts = n <= 15 ? 6 : n <= 30 ? 3 : 1;
  for (let seed = 1; seed <= randomStarts; seed++) {
    const random = seededRandom(seed);
    const side = Math.sqrt(n) * edgeLength;
    const init = Array.from({ length: n }, () => ({ x: (random() - 0.5) * side, y: (random() - 0.5) * side }));
    stressed.push(stressLayout(dist, init, stressIterations));
    // En grafos chicos las fuerzas encuentran a veces el dibujo plano que el estrés no ve (el cubo como dos
    // cuadrados, uno dentro del otro).
    if (n <= 15) forced.push(forceLayout(edges, init, frame));
  }
  // Si el estrés quedó más grande que la pantalla (caminos y ciclos largos), las paredes se van cerrando poco a poco
  // hasta el marco y las fuerzas lo pliegan sin enredarlo.
  const refolded = stressed.map(orientPortrait).map((pos) => {
    const size = extent(pos);
    if (size.width <= frame.width && size.height <= frame.height) return pos;
    // Se pliega hacia un marco algo menor porque la reparación posterior suele agrandarlo un poco.
    const target = { width: 0.9 * frame.width, height: 0.9 * frame.height };
    const startFrame = { width: Math.max(size.width, target.width), height: Math.max(size.height, target.height) };
    return forceLayout(edges, pos, target, startFrame);
  });
  // Grafos que pueden ser planos (m ≤ 3n − 6): dibujos de Tutte con varias caras exteriores posibles, de la más
  // grande a la más chica. Si el grafo no es plano tendrán cruces y el puntaje los descartará.
  // El polígono exterior deja aristas de al menos `edgeLength` y espacio adentro para los demás vértices.
  const outerRadius = (k: number) => edgeLength * Math.max(1 / (2 * Math.sin(Math.PI / k)), 0.6 * Math.sqrt(n));
  const planar =
    n <= 20 && edges.length <= 3 * n - 6
      ? shortCycles(n, edges)
          .sort((a, b) => b.length - a.length)
          .slice(0, 8)
          .map((outer) => tutteLayout(n, edges, outer, outerRadius(outer.length)))
      : [];
  const candidates = [circle, ...forced, ...stressed, ...refolded, ...planar];

  // En grafos densos es imposible que ninguna arista roce un vértice: ahí solo se separan los vértices.
  const dense = edges.length > 3 * n;
  const clearance = dense ? 0 : EDGE_CLEARANCE;
  let best: { pos: Point[]; score: number } | null = null;
  for (const candidate of candidates) {
    let pos = orientPortrait(candidate);
    // Si la reparación no logra dejar todo en regla, se agranda el dibujo (así crecen todas las distancias) y se
    // vuelve a intentar.
    for (let attempt = 0; attempt < 3 && !separate(pos, edges, MIN_SEPARATION, clearance); attempt++) {
      pos = pos.map((p) => ({ x: p.x * 1.15, y: p.y * 1.15 }));
    }
    const score = layoutScore(pos, edges, frame, dense);
    if (!best || score < best.score) best = { pos, score };
  }
  untangleLeaves(best!.pos, edges, edgeLength, clearance);
  return best!.pos;
}

/** Acomoda las componentes en filas, de la más grande a la más pequeña, sin que se encimen. */
function packComponents(
  parts: readonly { vertices: readonly VertexId[]; pos: readonly Point[] }[],
  rowWidth: number,
  gap: number,
): Record<VertexId, Point> {
  const sorted = parts
    .map((part, i) => {
      const xs = part.pos.map((p) => p.x);
      const ys = part.pos.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return { ...part, i, minX, minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
    })
    .sort((a, b) => b.vertices.length - a.vertices.length || a.i - b.i);
  const out: Record<VertexId, Point> = {};
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const part of sorted) {
    if (x > 0 && x + part.width > rowWidth) {
      x = 0;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    part.pos.forEach((p, k) => (out[part.vertices[k]] = { x: x + p.x - part.minX, y: y + p.y - part.minY }));
    x += part.width + gap;
    rowHeight = Math.max(rowHeight, part.height);
  }
  return out;
}

/**
 * Layout automático ("Reorganizar"): cada componente con el mejor de varios métodos, vertical como el celular,
 * con el área creciendo según el número de vértices, y todo centrado en la caja. Mismo grafo → mismas posiciones.
 */
export function autoLayout(g: Graph, box: Box): Positions {
  const n = g.vertices.length;
  if (n === 0) return {};
  const interior = (box.width - 2 * box.padding) * (box.height - 2 * box.padding);
  const edgeLength = Math.min(MAX_EDGE_LENGTH, Math.max(MIN_EDGE_LENGTH, 0.9 * Math.sqrt(interior / n)));

  const parts = connectedComponents(g).map((vertices) => {
    const local = new Map(vertices.map((v, i) => [v, i]));
    const edges = g.edges.filter(([a]) => local.has(a)).map(([a, b]) => [local.get(a)!, local.get(b)!] as const);
    return { vertices, pos: layoutComponent(vertices.length, edges, edgeLength) };
  });
  const packed = packComponents(parts, portraitFrame(n, edgeLength).width, edgeLength);

  const points = Object.values(packed);
  const midX = (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2;
  const midY = (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2;
  return Object.fromEntries(
    g.vertices.map((v) => [v, { x: packed[v].x - midX + box.width / 2, y: packed[v].y - midY + box.height / 2 }]),
  );
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
