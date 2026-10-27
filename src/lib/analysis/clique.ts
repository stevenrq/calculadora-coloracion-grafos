import { undirectedAdjacency } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';

/**
 * Clique máxima por Bron–Kerbosch con pivote (Tomita) y poda por tamaño.
 * Si se agota `budgetMs`, devuelve la mejor encontrada con `exact: false`.
 */
export function findMaximumClique(g: Graph, budgetMs = 500): { clique: VertexId[]; exact: boolean } {
  const adj = undirectedAdjacency(g);
  const start = Date.now();
  let best: VertexId[] = [];
  let calls = 0;
  let timedOut = false;

  const expand = (clique: VertexId[], candidates: VertexId[], excluded: VertexId[]): void => {
    if (timedOut) return;
    if (++calls % 256 === 0 && Date.now() - start > budgetMs) {
      timedOut = true;
      return;
    }
    if (candidates.length === 0) {
      if (excluded.length === 0 && clique.length > best.length) best = clique;
      return;
    }
    if (clique.length + candidates.length <= best.length) return;

    let pivot = candidates[0];
    let pivotHits = -1;
    for (const u of [...candidates, ...excluded]) {
      const hits = candidates.filter((w) => adj.get(u)!.has(w)).length;
      if (hits > pivotHits) {
        pivot = u;
        pivotHits = hits;
      }
    }

    let remaining = candidates;
    let done = excluded;
    for (const v of candidates.filter((w) => !adj.get(pivot)!.has(w))) {
      const neighbors = adj.get(v)!;
      expand(
        [...clique, v],
        remaining.filter((w) => neighbors.has(w)),
        done.filter((w) => neighbors.has(w)),
      );
      remaining = remaining.filter((w) => w !== v);
      done = [...done, v];
    }
  };

  expand([], [...g.vertices], []);
  return { clique: best, exact: !timedOut };
}
