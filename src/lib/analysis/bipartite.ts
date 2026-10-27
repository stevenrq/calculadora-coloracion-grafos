import { undirectedAdjacency } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';

export type BipartiteResult =
  | { bipartite: true; parts: [VertexId[], VertexId[]] }
  /** Ciclo impar sin repetir el primer vértice: cada vértice es vecino del siguiente y el último del primero. */
  | { bipartite: false; oddCycle: VertexId[] };

/**
 * BFS por componente con 2 colores. Si una arista une dos vértices del mismo color,
 * los dos caminos hasta su ancestro común más esa arista forman un ciclo impar
 * (ambos están a profundidades de la misma paridad).
 */
export function checkBipartite(g: Graph): BipartiteResult {
  const adj = undirectedAdjacency(g);
  const side = new Map<VertexId, 0 | 1>();
  const parent = new Map<VertexId, VertexId | null>();
  const depth = new Map<VertexId, number>();

  for (const root of g.vertices) {
    if (side.has(root)) continue;
    side.set(root, 0);
    parent.set(root, null);
    depth.set(root, 0);
    const queue = [root];
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const v of adj.get(u)!) {
        if (!side.has(v)) {
          side.set(v, side.get(u) === 0 ? 1 : 0);
          parent.set(v, u);
          depth.set(v, depth.get(u)! + 1);
          queue.push(v);
        } else if (side.get(v) === side.get(u)) {
          return { bipartite: false, oddCycle: oddCycleThrough(u, v, parent, depth) };
        }
      }
    }
  }

  const parts: [VertexId[], VertexId[]] = [[], []];
  for (const v of g.vertices) parts[side.get(v)!].push(v);
  return { bipartite: true, parts };
}

function oddCycleThrough(
  u: VertexId,
  v: VertexId,
  parent: Map<VertexId, VertexId | null>,
  depth: Map<VertexId, number>,
): VertexId[] {
  const fromU: VertexId[] = [u];
  const fromV: VertexId[] = [v];
  let a = u;
  let b = v;
  while (depth.get(a)! > depth.get(b)!) fromU.push((a = parent.get(a)!));
  while (depth.get(b)! > depth.get(a)!) fromV.push((b = parent.get(b)!));
  while (a !== b) {
    fromU.push((a = parent.get(a)!));
    fromV.push((b = parent.get(b)!));
  }
  // fromU termina en el ancestro común; fromV también: se quita para no repetirlo.
  fromV.pop();
  return [...fromU, ...fromV.reverse()];
}
