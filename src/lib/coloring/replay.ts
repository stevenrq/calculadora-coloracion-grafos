import type { VertexId } from '@/lib/graph/types';
import type { Coloring, ColoringStep } from './types';

/** Coloración tras aplicar `steps[0..index]` (inclusive). Con -1 no hay ningún color. */
export function coloringAtStep(steps: readonly ColoringStep[], index: number): Coloring {
  const coloring: Record<VertexId, number> = {};
  for (const step of steps.slice(0, index + 1)) {
    if (step.vertex === undefined) continue;
    if (step.kind === 'assign' && step.color !== undefined) coloring[step.vertex] = step.color;
    else if (step.kind === 'unassign') delete coloring[step.vertex];
  }
  return coloring;
}
