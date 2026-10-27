import type { Coloring } from '@/lib/coloring/types';
import { graphKey } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';
import { longestPath, type StageAnalysis } from './stages';
import type { Activity } from './types';

/** Lo que Colorear necesita para mostrar las etapas como coloración. */
export interface StageBridge {
  /** `graphKey` del grafo sin direcciones: el puente vale mientras el grafo de Colorear sea ese. */
  key: string;
  /** Color = etapa − 1. */
  coloring: Coloring;
  stageCount: number;
  longestPath: VertexId[];
}

/**
 * El grafo de precedencias sin direcciones, pintado por etapas. Toda flecha une etapas distintas, así que es una
 * coloración propia (y como el grafo no tiene ciclos, no hay flechas opuestas que se vuelvan aristas repetidas).
 */
export function stageBridge(
  g: Graph,
  stages: StageAnalysis,
  acts: readonly Activity[],
): { graph: Graph; bridge: StageBridge } {
  const graph: Graph = { directed: false, vertices: g.vertices, edges: g.edges };
  const coloring = Object.fromEntries(g.vertices.map((v) => [v, (stages.stageOf[v] ?? 1) - 1]));
  return {
    graph,
    bridge: {
      key: graphKey(graph),
      coloring,
      stageCount: stages.stages.length,
      longestPath: longestPath(acts, stages.stageOf),
    },
  };
}

export function activeBridge(bridge: StageBridge | null, g: Graph): StageBridge | null {
  return bridge && graphKey(g) === bridge.key ? bridge : null;
}
