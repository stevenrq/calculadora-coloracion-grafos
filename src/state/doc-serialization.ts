import { isValidLabel } from '@/lib/graph/graph';
import { type Edge, LIMITS, type Point, type VertexId } from '@/lib/graph/types';
import type { EditorDoc } from './editor-reducer';

const VERSION = 1;

export function serializeDoc(doc: EditorDoc): string {
  return JSON.stringify({
    version: VERSION,
    directed: doc.graph.directed,
    vertices: doc.graph.vertices,
    edges: doc.graph.edges,
    positions: doc.positions,
  });
}

const isFiniteNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Documento guardado o `null` si está corrupto, incompleto o es de otra versión. Nunca lanza. */
export function deserializeDoc(text: string | null): EditorDoc | null {
  if (text === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { version, directed, vertices, edges, positions } = data as Record<string, unknown>;
  if (version !== VERSION || typeof directed !== 'boolean') return null;

  if (!Array.isArray(vertices) || vertices.length > LIMITS.maxVertices) return null;
  if (!vertices.every((v): v is VertexId => typeof v === 'string' && isValidLabel(v))) return null;
  const known = new Set<VertexId>(vertices);
  if (known.size !== vertices.length) return null;

  if (!Array.isArray(edges) || edges.length > LIMITS.maxEdges) return null;
  const validEdge = (e: unknown): e is [VertexId, VertexId] =>
    Array.isArray(e) && e.length === 2 && known.has(e[0]) && known.has(e[1]) && e[0] !== e[1];
  if (!edges.every(validEdge)) return null;

  if (typeof positions !== 'object' || positions === null) return null;
  const pos = positions as Record<string, Partial<Point> | undefined>;
  const cleanPositions: Record<VertexId, Point> = {};
  for (const v of vertices) {
    const p = pos[v];
    if (!p || !isFiniteNumber(p.x) || !isFiniteNumber(p.y)) return null;
    cleanPositions[v] = { x: p.x, y: p.y };
  }

  return {
    graph: { directed, vertices, edges: edges.map(([a, b]): Edge => [a, b]) },
    positions: cleanPositions,
  };
}
