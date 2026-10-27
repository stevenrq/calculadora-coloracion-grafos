import { undirectedAdjacency } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';

/** Componentes conexas (ignorando direcciones), en el orden del primer vértice de cada una. */
export function connectedComponents(g: Graph): VertexId[][] {
  const adj = undirectedAdjacency(g);
  const seen = new Set<VertexId>();
  const components: VertexId[][] = [];
  for (const start of g.vertices) {
    if (seen.has(start)) continue;
    const component: VertexId[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length > 0) {
      const v = queue.shift()!;
      component.push(v);
      for (const w of adj.get(v)!) {
        if (!seen.has(w)) {
          seen.add(w);
          queue.push(w);
        }
      }
    }
    components.push(component);
  }
  return components;
}
