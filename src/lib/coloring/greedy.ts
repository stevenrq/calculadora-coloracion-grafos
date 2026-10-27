import { undirectedAdjacency } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';
import { countColors, humanColors, neighborColors, smallestFreeColor } from './helpers';
import type { ColoringResult, ColoringStep } from './types';

/** Colorea en el orden de entrada con el menor color libre. El resultado depende de ese orden. */
export function greedyColoring(g: Graph): ColoringResult {
  const start = Date.now();
  const adj = undirectedAdjacency(g);
  const coloring: Record<VertexId, number> = {};
  const steps: ColoringStep[] = [];

  for (const v of g.vertices) {
    const used = neighborColors(adj.get(v)!, coloring);
    const color = smallestFreeColor(used);
    coloring[v] = color;
    const neighborsText =
      used.length > 0 ? `sus vecinos ya coloreados usan ${humanColors(used)}` : 'no tiene vecinos coloreados';
    steps.push({
      kind: 'assign',
      vertex: v,
      color,
      message: `${v} (siguiente en orden de entrada): ${neighborsText}. Recibe el color ${color + 1}.`,
    });
  }

  return {
    algorithm: 'greedy',
    coloring,
    colorsUsed: countColors(coloring),
    steps,
    stepsTruncated: false,
    elapsedMs: Date.now() - start,
  };
}
