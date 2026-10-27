import { undirectedAdjacency } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';
import { countColors } from './helpers';
import type { ColoringResult, ColoringStep } from './types';

/**
 * Welsh-Powell clásico: ordena por grado descendente (desempate: orden de entrada)
 * y barre la lista una vez por color, dando ese color a quien no tenga un vecino que ya lo use.
 */
export function welshPowellColoring(g: Graph): ColoringResult {
  const start = Date.now();
  const adj = undirectedAdjacency(g);
  const degree = (v: VertexId) => adj.get(v)!.size;
  // sort es estable: a igual grado se conserva el orden de entrada.
  const order = [...g.vertices].sort((a, b) => degree(b) - degree(a));
  const coloring: Record<VertexId, number> = {};
  const steps: ColoringStep[] = [];

  if (order.length > 0) {
    steps.push({
      kind: 'info',
      message: `Orden por grado descendente: ${order.map((v) => `${v}(${degree(v)})`).join(', ')}.`,
    });
  }

  for (let color = 0; Object.keys(coloring).length < order.length; color++) {
    steps.push({ kind: 'info', message: `Color ${color + 1}: se recorre la lista ordenada.` });
    for (const v of order) {
      if (coloring[v] !== undefined) continue;
      const blocker = order.find((u) => coloring[u] === color && adj.get(v)!.has(u));
      if (blocker !== undefined) {
        steps.push({ kind: 'info', vertex: v, message: `${v} es vecino de ${blocker} (color ${color + 1}); se salta.` });
        continue;
      }
      coloring[v] = color;
      steps.push({
        kind: 'assign',
        vertex: v,
        color,
        message: `${v} (grado ${degree(v)}) no es vecino de ningún vértice con color ${color + 1}. Recibe el color ${color + 1}.`,
      });
    }
  }

  return {
    algorithm: 'welsh-powell',
    coloring,
    colorsUsed: countColors(coloring),
    steps,
    stepsTruncated: false,
    elapsedMs: Date.now() - start,
  };
}
