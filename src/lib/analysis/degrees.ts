import { undirectedAdjacency } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';

export interface DegreeStats {
  byVertex: Readonly<Record<VertexId, number>>;
  min: number;
  max: number;
  average: number;
  /** Secuencia de grados en orden descendente. */
  sequence: number[];
}

export function degreeStats(g: Graph): DegreeStats {
  const adj = undirectedAdjacency(g);
  const byVertex = Object.fromEntries(g.vertices.map((v) => [v, adj.get(v)!.size]));
  const sequence = Object.values(byVertex).sort((a, b) => b - a);
  if (sequence.length === 0) return { byVertex, min: 0, max: 0, average: 0, sequence };
  return {
    byVertex,
    min: sequence[sequence.length - 1],
    max: sequence[0],
    average: sequence.reduce((sum, d) => sum + d, 0) / sequence.length,
    sequence,
  };
}
