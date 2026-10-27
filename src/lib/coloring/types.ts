import type { VertexId } from '@/lib/graph/types';

/** Color de cada vértice como índice desde 0 (en los textos se muestra desde 1). */
export type Coloring = Readonly<Record<VertexId, number>>;

export type AlgorithmId = 'auto' | 'dsatur' | 'welsh-powell' | 'greedy' | 'exact';
export type ConcreteAlgorithm = Exclude<AlgorithmId, 'auto'>;

export interface ColoringStep {
  kind: 'assign' | 'unassign' | 'info';
  vertex?: VertexId;
  color?: number;
  /** Explicación en español que ve el usuario. */
  message: string;
  /** Solo DSATUR: saturación de los vértices sin color ANTES de elegir. */
  saturation?: Readonly<Record<VertexId, number>>;
}

export interface ColoringResult {
  algorithm: ConcreteAlgorithm;
  coloring: Coloring;
  colorsUsed: number;
  steps: readonly ColoringStep[];
  stepsTruncated: boolean;
  elapsedMs: number;
}

export const ALGORITHM_LABELS: Record<AlgorithmId, string> = {
  auto: 'Auto',
  dsatur: 'DSATUR',
  'welsh-powell': 'Welsh-Powell',
  greedy: 'Greedy (orden de entrada)',
  exact: 'Exacto (backtracking)',
};

export const ALGORITHM_SHORT_LABELS: Record<ConcreteAlgorithm, string> = {
  dsatur: 'DSATUR',
  'welsh-powell': 'Welsh-Powell',
  greedy: 'Greedy',
  exact: 'Exacto',
};
