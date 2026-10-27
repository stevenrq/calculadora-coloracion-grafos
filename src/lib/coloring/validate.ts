import type { Edge, Graph, VertexId } from '@/lib/graph/types';
import type { Coloring } from './types';

/** Aristas cuyos dos extremos tienen el mismo color. */
export function conflictingEdges(g: Graph, c: Coloring): Edge[] {
  return g.edges.filter(([a, b]) => c[a] !== undefined && c[a] === c[b]);
}

/** Todos los vértices tienen color y ninguna arista une dos del mismo color. */
export function isProperColoring(g: Graph, c: Coloring): boolean {
  return g.vertices.every((v) => c[v] !== undefined) && conflictingEdges(g, c).length === 0;
}

/** Índice = color; cada clase lista sus vértices en el orden del grafo. */
export function colorClasses(g: Graph, c: Coloring): VertexId[][] {
  const classes: VertexId[][] = [];
  for (const v of g.vertices) {
    const color = c[v];
    if (color === undefined) continue;
    (classes[color] ??= []).push(v);
  }
  return Array.from(classes, (cls) => cls ?? []);
}
