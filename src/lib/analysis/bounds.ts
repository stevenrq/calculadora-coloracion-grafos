import type { Graph } from '@/lib/graph/types';
import { connectedComponents } from './components';
import { degreeStats } from './degrees';

export interface Bounds {
  lower: number;
  lowerReason: 'empty' | 'edgeless' | 'clique' | 'odd-cycle';
  deltaPlusOne: number;
  /** Brooks aplicado por componente: Δ_c, o Δ_c + 1 si la componente es completa o un ciclo impar. */
  brooks: number;
}

export function chromaticBounds(g: Graph, cliqueSize: number, bipartite: boolean): Bounds {
  const { byVertex, max } = degreeStats(g);
  const deltaPlusOne = g.vertices.length === 0 ? 0 : max + 1;

  let brooks = 0;
  for (const component of connectedComponents(g)) {
    const degrees = component.map((v) => byVertex[v]);
    const delta = Math.max(...degrees);
    const complete = degrees.every((d) => d === component.length - 1);
    const oddCycle = component.length % 2 === 1 && component.length >= 3 && degrees.every((d) => d === 2);
    brooks = Math.max(brooks, complete || oddCycle ? delta + 1 : delta);
  }

  if (g.vertices.length === 0) return { lower: 0, lowerReason: 'empty', deltaPlusOne, brooks };
  if (g.edges.length === 0) return { lower: 1, lowerReason: 'edgeless', deltaPlusOne, brooks };
  if (!bipartite && cliqueSize < 3) return { lower: 3, lowerReason: 'odd-cycle', deltaPlusOne, brooks };
  // Con aristas, la clique encontrada tiene al menos 2 vértices aunque se agote el tiempo (lo fija una prueba); el
  // máximo con 2 es solo una red de seguridad.
  return { lower: Math.max(2, cliqueSize), lowerReason: 'clique', deltaPlusOne, brooks };
}
