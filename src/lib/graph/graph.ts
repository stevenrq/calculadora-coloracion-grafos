import { type Edge, type EditResult, type Graph, LIMITS, type VertexId } from './types';

const LABEL_PATTERN = new RegExp(`^[\\p{L}\\p{N}_]{1,${LIMITS.maxLabelLength}}$`, 'u');

export function emptyGraph(directed = false): Graph {
  return { directed, vertices: [], edges: [] };
}

export function isValidLabel(label: string): boolean {
  return LABEL_PATTERN.test(label);
}

function sameEdge(g: Graph, [a, b]: Edge, x: VertexId, y: VertexId): boolean {
  return (a === x && b === y) || (!g.directed && a === y && b === x);
}

export function hasEdge(g: Graph, a: VertexId, b: VertexId): boolean {
  return g.edges.some((e) => sameEdge(g, e, a, b));
}

export function addVertex(g: Graph, label: string): EditResult {
  if (!isValidLabel(label)) return { ok: false, error: 'invalid-label' };
  if (g.vertices.includes(label)) return { ok: false, error: 'duplicate-vertex' };
  if (g.vertices.length >= LIMITS.maxVertices) return { ok: false, error: 'limit-vertices' };
  return { ok: true, graph: { ...g, vertices: [...g.vertices, label] } };
}

export function removeVertex(g: Graph, id: VertexId): Graph {
  return {
    ...g,
    vertices: g.vertices.filter((v) => v !== id),
    edges: g.edges.filter(([a, b]) => a !== id && b !== id),
  };
}

export function addEdge(g: Graph, a: VertexId, b: VertexId): EditResult {
  if (!g.vertices.includes(a) || !g.vertices.includes(b)) return { ok: false, error: 'unknown-vertex' };
  if (a === b) return { ok: false, error: 'self-loop' };
  if (hasEdge(g, a, b)) return { ok: true, graph: g };
  if (g.edges.length >= LIMITS.maxEdges) return { ok: false, error: 'limit-edges' };
  return { ok: true, graph: { ...g, edges: [...g.edges, [a, b]] } };
}

export function removeEdge(g: Graph, a: VertexId, b: VertexId): Graph {
  return { ...g, edges: g.edges.filter((e) => !sameEdge(g, e, a, b)) };
}

export function renameVertex(g: Graph, from: VertexId, to: string): EditResult {
  if (!g.vertices.includes(from)) return { ok: false, error: 'unknown-vertex' };
  if (from === to) return { ok: true, graph: g };
  if (!isValidLabel(to)) return { ok: false, error: 'invalid-label' };
  if (g.vertices.includes(to)) return { ok: false, error: 'duplicate-vertex' };
  const rename = (v: VertexId) => (v === from ? to : v);
  return {
    ok: true,
    graph: {
      ...g,
      vertices: g.vertices.map(rename),
      edges: g.edges.map(([a, b]) => [rename(a), rename(b)] as const),
    },
  };
}

/** Vecinos ignorando la dirección (lo que necesita la coloración). */
export function undirectedAdjacency(g: Graph): Map<VertexId, Set<VertexId>> {
  const adj = new Map<VertexId, Set<VertexId>>(g.vertices.map((v) => [v, new Set<VertexId>()]));
  for (const [a, b] of g.edges) {
    adj.get(a)?.add(b);
    adj.get(b)?.add(a);
  }
  return adj;
}

/** Primera etiqueta libre en la secuencia A..Z, A1..Z1, A2..Z2, … */
export function nextLabel(existing: readonly VertexId[]): VertexId {
  const taken = new Set(existing);
  for (let round = 0; ; round++) {
    for (let i = 0; i < 26; i++) {
      const label = String.fromCharCode(65 + i) + (round === 0 ? '' : String(round));
      if (!taken.has(label)) return label;
    }
  }
}

/** Clave canónica: igual para el mismo grafo sin importar el orden de inserción. */
export function graphKey(g: Graph): string {
  const vertices = [...g.vertices].sort();
  const edges = g.edges
    .map(([a, b]) => (g.directed || a < b ? `${a}>${b}` : `${b}>${a}`))
    .sort();
  return `${g.directed ? 'D' : 'U'}|${vertices.join(',')}|${edges.join(',')}`;
}
