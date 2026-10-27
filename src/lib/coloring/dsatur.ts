import { undirectedAdjacency } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';
import { countColors, smallestFreeColor } from './helpers';
import type { ColoringResult, ColoringStep } from './types';

/**
 * Regla de selección de DSATUR (Brélaz, 1979): de los vértices sin color, cuál se colorea ahora.
 *
 * @param uncolored   vértices sin color, en orden de entrada
 * @param saturation  cuántos colores DISTINTOS ve cada vértice sin color entre sus vecinos
 * @param degree      grado de cada vértice en el grafo
 * @returns el vértice elegido
 *
 * Criterio fijado por el diseño: mayor saturación; si empatan, mayor grado;
 * si siguen empatados, el que aparece primero en `uncolored` (orden de entrada).
 */
export function pickDsaturVertex(
  uncolored: readonly VertexId[],
  saturation: ReadonlyMap<VertexId, number>,
  degree: Readonly<Record<VertexId, number>>,
): VertexId {
  let best = uncolored[0];
  for (const v of uncolored.slice(1)) {
    const bySaturation = saturation.get(v)! - saturation.get(best)!;
    // `>` estricto: ante empate total gana el que apareció primero (orden de entrada).
    if (bySaturation > 0 || (bySaturation === 0 && degree[v] > degree[best])) best = v;
  }
  return best;
}

export function dsaturColoring(g: Graph): ColoringResult {
  const start = Date.now();
  const adj = undirectedAdjacency(g);
  const degree = Object.fromEntries(g.vertices.map((v) => [v, adj.get(v)!.size]));
  const seenColors = new Map(g.vertices.map((v) => [v, new Set<number>()]));
  const coloring: Record<VertexId, number> = {};
  const steps: ColoringStep[] = [];
  let uncolored = [...g.vertices];

  while (uncolored.length > 0) {
    const saturation = new Map(uncolored.map((v) => [v, seenColors.get(v)!.size]));
    const v = pickDsaturVertex(uncolored, saturation, degree);
    const s = saturation.get(v)!;
    const color = smallestFreeColor(seenColors.get(v)!);
    coloring[v] = color;
    for (const w of adj.get(v)!) seenColors.get(w)!.add(color);
    uncolored = uncolored.filter((w) => w !== v);
    steps.push({
      kind: 'assign',
      vertex: v,
      color,
      saturation: Object.fromEntries(saturation),
      message: `Se elige ${v}: ve ${s} ${s === 1 ? 'color distinto' : 'colores distintos'} y tiene grado ${degree[v]}. Recibe el color ${color + 1}, el menor libre.`,
    });
  }

  return {
    algorithm: 'dsatur',
    coloring,
    colorsUsed: countColors(coloring),
    steps,
    stepsTruncated: false,
    elapsedMs: Date.now() - start,
  };
}
