import { dsaturColoring } from '@/lib/coloring/dsatur';
import { greedyColoring } from '@/lib/coloring/greedy';
import type { ColoringResult } from '@/lib/coloring/types';
import { welshPowellColoring } from '@/lib/coloring/welsh-powell';
import { graphKey } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';
import { type BipartiteResult, checkBipartite } from './bipartite';
import { type Bounds, chromaticBounds } from './bounds';
import { findMaximumClique } from './clique';
import { connectedComponents } from './components';
import { type DegreeStats, degreeStats } from './degrees';

export type HeuristicId = 'dsatur' | 'greedy' | 'welsh-powell';

/** Todo lo que se calcula de forma síncrona; χ exacto llega aparte, en segundo plano. */
export interface StructuralAnalysis {
  /** graphKey del grafo analizado. */
  key: string;
  heuristics: Record<HeuristicId, ColoringResult>;
  degrees: DegreeStats;
  components: VertexId[][];
  bipartite: BipartiteResult;
  clique: { clique: VertexId[]; exact: boolean };
  bounds: Bounds;
}

export function analyzeGraph(g: Graph): StructuralAnalysis {
  const bipartite = checkBipartite(g);
  const clique = findMaximumClique(g);
  return {
    key: graphKey(g),
    heuristics: { dsatur: dsaturColoring(g), greedy: greedyColoring(g), 'welsh-powell': welshPowellColoring(g) },
    degrees: degreeStats(g),
    components: connectedComponents(g),
    bipartite,
    clique,
    bounds: chromaticBounds(g, clique.clique.length, bipartite.bipartite),
  };
}
