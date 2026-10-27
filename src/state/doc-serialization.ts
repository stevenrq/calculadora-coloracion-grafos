import { isValidLabel } from '@/lib/graph/graph';
import { type Edge, LIMITS, type Point, type VertexId } from '@/lib/graph/types';
import {
  type ActivityInfo,
  DURATION_UNITS,
  type DurationUnit,
  MAX_DURATION,
  NAME_MAX_LENGTH,
} from '@/lib/precedence/types';
import type { EditorDoc } from './editor-reducer';

const VERSION = 1;

export function serializeDoc(doc: EditorDoc): string {
  return JSON.stringify({
    version: VERSION,
    directed: doc.graph.directed,
    vertices: doc.graph.vertices,
    edges: doc.graph.edges,
    positions: doc.positions,
    // Solo en precedencias; JSON.stringify omite los campos `undefined`.
    activities: doc.activities,
    unit: doc.unit,
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
  const { version, directed, vertices, edges, positions, activities, unit } = data as Record<string, unknown>;
  if (version !== VERSION || typeof directed !== 'boolean') return null;

  if (!Array.isArray(vertices) || vertices.length > LIMITS.maxVertices) return null;
  if (!vertices.every((v): v is VertexId => typeof v === 'string' && isValidLabel(v))) return null;
  const known = new Set<VertexId>(vertices);
  if (known.size !== vertices.length) return null;

  if (!Array.isArray(edges) || edges.length > LIMITS.maxEdges) return null;
  const validEdge = (e: unknown): e is [VertexId, VertexId] =>
    Array.isArray(e) && e.length === 2 && known.has(e[0]) && known.has(e[1]) && e[0] !== e[1];
  if (!edges.every(validEdge)) return null;
  // Sin aristas repetidas (en no dirigido, A-B y B-A son la misma).
  const edgeKeys = new Set(edges.map(([a, b]) => (directed || a < b ? `${a}>${b}` : `${b}>${a}`)));
  if (edgeKeys.size !== edges.length) return null;

  if (typeof positions !== 'object' || positions === null) return null;
  const pos = positions as Record<string, Partial<Point> | undefined>;
  const cleanPositions: Record<VertexId, Point> = {};
  for (const v of vertices) {
    const p = pos[v];
    if (!p || !isFiniteNumber(p.x) || !isFiniteNumber(p.y)) return null;
    cleanPositions[v] = { x: p.x, y: p.y };
  }

  if (unit !== undefined && !DURATION_UNITS.includes(unit as DurationUnit)) return null;
  let cleanActivities: Record<VertexId, ActivityInfo> | undefined;
  if (activities !== undefined) {
    if (typeof activities !== 'object' || activities === null) return null;
    cleanActivities = {};
    const raw = activities as Record<string, Partial<ActivityInfo> | undefined>;
    for (const v of vertices) {
      const info = raw[v];
      if (info === undefined) continue;
      const { name, duration } = info;
      if (typeof name !== 'string' || name.length > NAME_MAX_LENGTH) return null;
      if (duration !== null && !(isFiniteNumber(duration) && duration >= 0 && duration <= MAX_DURATION)) return null;
      cleanActivities[v] = { name, duration };
    }
  }

  return {
    graph: { directed, vertices, edges: edges.map(([a, b]): Edge => [a, b]) },
    positions: cleanPositions,
    ...(cleanActivities && { activities: cleanActivities }),
    ...(unit !== undefined && { unit: unit as DurationUnit }),
  };
}
