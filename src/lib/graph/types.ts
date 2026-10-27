/** Identificador de un vértice. La etiqueta visible ES el id (son únicas). */
export type VertexId = string;

export type Edge = readonly [VertexId, VertexId];

export interface Graph {
  readonly directed: boolean;
  /** En orden de inserción (importa para Greedy y los desempates). */
  readonly vertices: readonly VertexId[];
  readonly edges: readonly Edge[];
}

export interface Point {
  x: number;
  y: number;
}

export type Positions = Readonly<Record<VertexId, Point>>;

export type EditError =
  | 'invalid-label'
  | 'duplicate-vertex'
  | 'unknown-vertex'
  | 'self-loop'
  | 'limit-vertices'
  | 'limit-edges';

export type EditResult = { ok: true; graph: Graph } | { ok: false; error: EditError };

export const LIMITS = { maxVertices: 60, maxEdges: 600, maxLabelLength: 12 } as const;
