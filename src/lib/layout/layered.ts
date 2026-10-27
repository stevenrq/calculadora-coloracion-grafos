import type { Box } from '@/lib/geometry';
import type { Graph, Point, Positions, VertexId } from '@/lib/graph/types';
import { seededRandom } from './engines';
import { EDGE_CLEARANCE } from './layouts';

/** Distancia horizontal entre columnas (etapas) y vertical entre actividades de una misma columna. */
export const LAYER_GAP = 76;
export const ROW_GAP = 72;
/** Huecos mínimos con los puntos de paso de las flechas largas (no se dibujan; reservan el sitio de la línea). */
const WAYPOINT_GAP = EDGE_CLEARANCE + 12;
const WAYPOINT_PAIR_GAP = 20;
const ORDER_SWEEPS = 8;
/** Arranques del ordenamiento: el primero con el orden de la lista y el resto barajados (con semilla). */
const ORDER_RESTARTS = 12;
const PLACEMENT_SWEEPS = 30;
/** Peso de un punto de paso en el ajuste: la recta de su flecha manda y son las actividades las que se apartan. */
const WAYPOINT_WEIGHT = 50;
const REPAIR_PASSES = 40;

interface LayerNode {
  layer: number;
  /** Vértice real, o `null` si es un punto de paso de una flecha que salta columnas. */
  vertex: VertexId | null;
  /** Punto de paso: extremos reales de su flecha y su fracción del recorrido. */
  span?: { from: number; to: number; t: number };
  up: number[];
  down: number[];
}

/**
 * Dibujo por capas (Sugiyama simplificado): una columna por etapa, de izquierda a derecha. Las flechas que saltan
 * columnas reciben puntos de paso; el orden dentro de cada columna se elige por baricentro para evitar cruces, y la
 * altura de cada nodo se ajusta hacia el promedio de sus vecinos respetando los huecos mínimos. Al final, las
 * actividades que una flecha aún roza se apartan en vertical.
 */
export function layeredLayout(g: Graph, stageOf: Readonly<Record<VertexId, number>>, box: Box): Positions {
  if (g.vertices.length === 0) return {};
  const layerOf = (v: VertexId) => Math.max(0, (stageOf[v] ?? 1) - 1);
  const nodes: LayerNode[] = g.vertices.map((v) => ({ layer: layerOf(v), vertex: v, up: [], down: [] }));
  const indexOf = new Map(g.vertices.map((v, i) => [v, i]));

  for (const [a, b] of g.edges) {
    const from = indexOf.get(a);
    const to = indexOf.get(b);
    if (from === undefined || to === undefined || nodes[to].layer <= nodes[from].layer) continue;
    let previous = from;
    const length = nodes[to].layer - nodes[from].layer;
    for (let k = 1; k < length; k++) {
      nodes.push({ layer: nodes[from].layer + k, vertex: null, span: { from, to, t: k / length }, up: [previous], down: [] });
      nodes[previous].down.push(nodes.length - 1);
      previous = nodes.length - 1;
    }
    nodes[previous].down.push(to);
    nodes[to].up.push(previous);
  }

  // Con reduce y no con Math.max(...): puede haber unos 20 000 nodos y Hermes no admite tantos argumentos.
  const layerCount = nodes.reduce((max, n) => Math.max(max, n.layer), 0) + 1;
  const order = orderLayers(nodes, layerCount);
  const y = placeRows(nodes, order);

  const pos: Point[] = g.vertices.map((_, i) => ({ x: nodes[i].layer * LAYER_GAP, y: y[i] }));
  // En un grafo denso siempre habrá flechas sobre vértices: repararlo solo gastaría tiempo.
  if (g.edges.length <= 3 * g.vertices.length) repairIntrusions(g, pos, nodes, order);

  // Centrar en la caja del mundo.
  const xs = pos.map((p) => p.x);
  const ys = pos.map((p) => p.y);
  const dx = box.width / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = box.height / 2 - (Math.min(...ys) + Math.max(...ys)) / 2;
  return Object.fromEntries(g.vertices.map((v, i) => [v, { x: pos[i].x + dx, y: pos[i].y + dy }]));
}

/**
 * Orden de cada columna por baricentro con barridos de ida y vuelta y, tras cada barrido, transposiciones de vecinos
 * que reduzcan cruces. Los empates del baricentro pueden dejarlo en un óptimo local, así que se repite desde varios
 * órdenes iniciales y se queda con el de menos cruces.
 */
function orderLayers(nodes: LayerNode[], layerCount: number): number[][] {
  const initial: number[][] = Array.from({ length: layerCount }, () => []);
  nodes.forEach((n, i) => initial[n.layer].push(i));
  const rank = new Float64Array(nodes.length);
  const refreshRank = (layer: number[]) => layer.forEach((node, i) => (rank[node] = i));
  const random = seededRandom(7);

  let best = initial.map((layer) => [...layer]);
  initial.forEach(refreshRank);
  let bestCrossings = countCrossings(nodes, best, rank);
  // Con muchísimos puntos de paso (grafos densos) cada barrido es caro y el dibujo no queda limpio de todos modos.
  const heavy = nodes.length > 300;
  const restarts = heavy ? 1 : ORDER_RESTARTS;
  const sweeps = heavy ? ORDER_SWEEPS / 2 : ORDER_SWEEPS;
  for (let restart = 0; restart < restarts && bestCrossings > 0; restart++) {
    const order = initial.map((layer) => (restart === 0 ? [...layer] : shuffle(layer, random)));
    order.forEach(refreshRank);
    for (let sweep = 0; sweep < sweeps; sweep++) {
      const downward = sweep % 2 === 0;
      const layers = downward ? range(1, layerCount) : range(0, layerCount - 1).reverse();
      for (const l of layers) {
        const key = new Map<number, number>();
        for (const node of order[l]) {
          const neighbors = downward ? nodes[node].up : nodes[node].down;
          key.set(node, neighbors.length > 0 ? neighbors.reduce((s, m) => s + rank[m], 0) / neighbors.length : rank[node]);
        }
        order[l] = [...order[l]].sort((a, b) => (key.get(a) ?? 0) - (key.get(b) ?? 0));
        refreshRank(order[l]);
      }
      transpose(nodes, order, rank);
      const crossings = countCrossings(nodes, order, rank);
      if (crossings < bestCrossings) {
        bestCrossings = crossings;
        best = order.map((layer) => [...layer]);
      }
    }
  }
  return best;
}

/** Cruces entre las flechas de `u` y las de `v` si `u` va antes que `v` (hacia ambas columnas vecinas). */
function pairCrossings(nodes: LayerNode[], u: number, v: number, rank: Float64Array): number {
  let total = 0;
  for (const side of ['up', 'down'] as const) {
    for (const a of nodes[u][side]) for (const b of nodes[v][side]) if (rank[a] > rank[b]) total++;
  }
  return total;
}

/** Intercambia vecinos de una misma columna mientras eso reduzca los cruces. */
function transpose(nodes: LayerNode[], order: number[][], rank: Float64Array) {
  let improved = true;
  for (let round = 0; improved && round < 10; round++) {
    improved = false;
    for (const layer of order) {
      for (let i = 0; i + 1 < layer.length; i++) {
        const u = layer[i];
        const v = layer[i + 1];
        if (pairCrossings(nodes, v, u, rank) < pairCrossings(nodes, u, v, rank)) {
          layer[i] = v;
          layer[i + 1] = u;
          rank[v] = i;
          rank[u] = i + 1;
          improved = true;
        }
      }
    }
  }
}

function shuffle(items: readonly number[], random: () => number): number[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Cruces entre columnas vecinas: con las flechas ordenadas por su origen, son las inversiones de la secuencia de
 * destinos, que un árbol de Fenwick cuenta en O(e log n).
 */
function countCrossings(nodes: LayerNode[], order: number[][], rank: Float64Array): number {
  let total = 0;
  for (let l = 0; l + 1 < order.length; l++) {
    const size = order[l + 1].length;
    const tree = new Int32Array(size + 1);
    let seen = 0;
    for (const node of order[l]) {
      // Destinos de un mismo origen de menor a mayor: así no se cuentan como cruces entre ellos.
      const targets = nodes[node].down.map((m) => rank[m]).sort((a, b) => a - b);
      for (const target of targets) {
        // Flechas anteriores que llegan más abajo que esta: se cruzan con ella.
        let atOrBelow = 0;
        for (let i = target + 1; i > 0; i -= i & -i) atOrBelow += tree[i];
        total += seen - atOrBelow;
        for (let i = target + 1; i <= size; i += i & -i) tree[i]++;
        seen++;
      }
    }
  }
  return total;
}

/** Altura de cada nodo: hacia el promedio de sus vecinos (o, si es punto de paso, sobre la recta de su flecha). */
function placeRows(nodes: LayerNode[], order: number[][]): Float64Array {
  const y = new Float64Array(nodes.length);
  for (const layer of order) {
    const gaps = layerGaps(nodes, layer);
    const height = gaps.reduce((s, g) => s + g, 0);
    let current = -height / 2;
    layer.forEach((node, i) => {
      y[node] = current;
      current += gaps[i] ?? 0;
    });
  }
  for (let sweep = 0; sweep < PLACEMENT_SWEEPS; sweep++) {
    const layers = sweep % 2 === 0 ? order : [...order].reverse();
    for (const layer of layers) {
      const desired = layer.map((node) => {
        const n = nodes[node];
        if (n.span) return y[n.span.from] + (y[n.span.to] - y[n.span.from]) * n.span.t;
        const neighbors = [...n.up, ...n.down];
        return neighbors.length > 0 ? neighbors.reduce((s, m) => s + y[m], 0) / neighbors.length : y[node];
      });
      const weights = layer.map((node) => (nodes[node].span ? WAYPOINT_WEIGHT : 1));
      const placed = fitInOrder(desired, layerGaps(nodes, layer), weights);
      layer.forEach((node, i) => (y[node] = placed[i]));
    }
  }
  return y;
}

function layerGaps(nodes: LayerNode[], layer: number[]): number[] {
  return layer.slice(1).map((node, i) => {
    const realA = nodes[layer[i]].vertex !== null;
    const realB = nodes[node].vertex !== null;
    return realA && realB ? ROW_GAP : realA || realB ? WAYPOINT_GAP : WAYPOINT_PAIR_GAP;
  });
}

/**
 * Las alturas más cercanas a `desired` (mínimos cuadrados con pesos) que conservan el orden con al menos `gaps[i]`
 * entre el nodo i y el i + 1. Restando los huecos acumulados queda una regresión isotónica, que resuelve PAVA.
 */
function fitInOrder(desired: number[], gaps: number[], weights?: number[]): number[] {
  const offsets = [0];
  for (const gap of gaps) offsets.push(offsets[offsets.length - 1] + gap);
  const blocks: { sum: number; weight: number; count: number }[] = [];
  desired.forEach((d, i) => {
    const w = weights?.[i] ?? 1;
    blocks.push({ sum: w * (d - offsets[i]), weight: w, count: 1 });
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1];
      const prev = blocks[blocks.length - 2];
      if (prev.sum / prev.weight <= last.sum / last.weight) break;
      prev.sum += last.sum;
      prev.weight += last.weight;
      prev.count += last.count;
      blocks.pop();
    }
  });
  const result: number[] = [];
  for (const block of blocks) for (let k = 0; k < block.count; k++) result.push(block.sum / block.weight + offsets[result.length]);
  return result;
}

/**
 * Aparta en vertical a las actividades que una flecha ajena roza: el empujón se reparte entre la actividad y los
 * extremos de la flecha (según dónde la toca), así la flecha también se mueve y la columna apretada no se atasca.
 * Después de cada pasada, cada columna recupera sus huecos sin cambiar de orden.
 */
function repairIntrusions(g: Graph, pos: Point[], nodes: LayerNode[], order: number[][]) {
  const indexOf = new Map(g.vertices.map((v, i) => [v, i]));
  const columns = order.map((layer) => layer.filter((node) => nodes[node].vertex !== null));
  for (let pass = 0; pass < REPAIR_PASSES; pass++) {
    let moved = false;
    for (const [a, b] of g.edges) {
      const ia = indexOf.get(a);
      const ib = indexOf.get(b);
      if (ia === undefined || ib === undefined) continue;
      for (let v = 0; v < g.vertices.length; v++) {
        if (v === ia || v === ib) continue;
        const pa = pos[ia];
        const pb = pos[ib];
        const p = pos[v];
        // Fuera del rectángulo de la flecha ampliado en el margen, no puede rozarla.
        if (p.x < (pa.x < pb.x ? pa.x : pb.x) - EDGE_CLEARANCE || p.x > (pa.x < pb.x ? pb.x : pa.x) + EDGE_CLEARANCE) continue;
        if (p.y < (pa.y < pb.y ? pa.y : pb.y) - EDGE_CLEARANCE || p.y > (pa.y < pb.y ? pb.y : pa.y) + EDGE_CLEARANCE) continue;
        const ex = pb.x - pa.x;
        const ey = pb.y - pa.y;
        const lengthSq = ex * ex + ey * ey;
        if (lengthSq === 0) continue;
        const t = Math.max(0, Math.min(1, ((p.x - pa.x) * ex + (p.y - pa.y) * ey) / lengthSq));
        const cy = pa.y + t * ey;
        const d = Math.sqrt((p.x - (pa.x + t * ex)) ** 2 + (p.y - cy) ** 2);
        if (d >= EDGE_CLEARANCE) continue;
        // Moverse en vertical cambia la distancia a la recta según el coseno de su inclinación.
        const cos = Math.max(0.3, Math.abs(ex) / Math.sqrt(lengthSq));
        const push = (EDGE_CLEARANCE - d + 1) / cos / 2;
        const side = p.y >= cy ? 1 : -1;
        p.y += side * push;
        pa.y -= side * push * (1 - t);
        pb.y -= side * push * t;
        moved = true;
      }
    }
    for (const column of columns) {
      const fitted = fitInOrder(
        column.map((node) => pos[node].y),
        column.slice(1).map(() => ROW_GAP),
      );
      column.forEach((node, i) => (pos[node].y = fitted[i]));
    }
    if (!moved) break;
  }
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);
}
