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

export interface SaturationRow {
  vertex: VertexId;
  saturation: number;
  degree: number;
}

/** Filas de la tabla de saturación en el orden en que DSATUR elige: la primera es la elegida. */
export function saturationRows(
  saturation: Readonly<Record<VertexId, number>>,
  degrees: Readonly<Record<VertexId, number>>,
): SaturationRow[] {
  return Object.entries(saturation)
    .map(([vertex, s]) => ({ vertex, saturation: s, degree: degrees[vertex] ?? 0 }))
    .sort((a, b) => b.saturation - a.saturation || b.degree - a.degree);
}

/** Posiciones del deslizador de velocidad; el índice 2 (1×) es el predeterminado. */
export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

const BASE_STEP_MS = 900;

export const stepIntervalMs = (speed: number) => BASE_STEP_MS / speed;

export const speedLabel = (speed: number) => `${String(speed).replace('.', ',')}×`;
