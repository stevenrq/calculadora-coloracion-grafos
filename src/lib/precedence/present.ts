import type { HighlightSpec } from '@/lib/analysis/highlights';
import { cycleEdges } from '@/lib/analysis/highlights';
import type { Coloring } from '@/lib/coloring/types';
import type { VertexId } from '@/lib/graph/types';
import type { Schedule } from './critical-path';
import type { StageAnalysis, StageStep } from './stages';
import { type DurationUnit, MAX_DURATION, type PrecedenceIssue, UNIT_SINGULAR } from './types';

/** Qué se resalta en el lienzo al tocar una fila de los resultados. */
export type PrecedenceTarget = { kind: 'stage'; stage: number } | { kind: 'critical' } | null;

export function issueHighlight(issues: readonly PrecedenceIssue[]): HighlightSpec | undefined {
  const cycle = issues.find((i) => i.kind === 'cycle');
  if (!cycle) return undefined;
  return { vertices: [...cycle.cycle], edges: cycleEdges(cycle.cycle), tone: 'warning' };
}

export function precedenceHighlight(
  target: PrecedenceTarget,
  analysis: { stages: StageAnalysis; schedule: Schedule | null },
): HighlightSpec | undefined {
  if (!target) return undefined;
  if (target.kind === 'stage') return { vertices: analysis.stages.stages[target.stage - 1] ?? [], edges: [], tone: 'focus' };
  if (!analysis.schedule) return undefined;
  return { vertices: analysis.schedule.critical, edges: analysis.schedule.criticalEdges, tone: 'focus' };
}

/** Etapas identificadas hasta el paso `index` (inclusive), pintadas con color = etapa − 1. */
export function stageColoringAtStep(steps: readonly StageStep[], index: number): Coloring {
  const coloring: Record<VertexId, number> = {};
  for (const step of steps.slice(0, index + 1)) {
    if (step.stage !== null) for (const v of step.vertices) coloring[v] = step.stage - 1;
  }
  return coloring;
}

/** En el reproductor: las actividades que el paso acaba de identificar. */
export function stageStepHighlight(steps: readonly StageStep[], index: number): HighlightSpec | undefined {
  const vertices = index >= 0 ? steps[index]?.vertices : undefined;
  return vertices && vertices.length > 0 ? { vertices: [...vertices], edges: [], tone: 'focus' } : undefined;
}

/** Coma decimal y hasta dos decimales, sin ceros sobrantes: `2,5`, `14`, `0,3`. */
export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

export function formatDuration(n: number, unit: DurationUnit): string {
  return `${formatNumber(n)} ${n === 1 ? UNIT_SINGULAR[unit] : unit}`;
}

/**
 * Lo escrito en el campo Duración: vacío → `null`; un número entre 0 y `MAX_DURATION` (coma o punto) con hasta dos
 * decimales, los mismos que muestra `formatNumber` (así reabrir el diálogo y guardar no lo redondea); si no, inválido.
 */
export function parseDuration(text: string): number | null | 'invalid' {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(trimmed)) return 'invalid';
  const value = Number(trimmed.replace(',', '.'));
  return value <= MAX_DURATION ? value : 'invalid';
}

export function pathLabel(path: readonly VertexId[]): string {
  return path.join(' → ');
}

/** Lo elegido en los resultados: el resaltado activo y el paso del reproductor (para la clave de un grafo). */
export interface PrecedenceSelection {
  target: PrecedenceTarget;
  /** `null` o una `key` vieja equivalen al paso final. */
  step: { key: string; index: number } | null;
}

function sameTarget(a: PrecedenceTarget, b: PrecedenceTarget): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind === 'critical' || (b.kind === 'stage' && a.stage === b.stage);
}

/** Tocar un resaltado lo alterna; al activarlo, el reproductor salta al final para que el lienzo lo muestre. */
export function toggleTarget(s: PrecedenceSelection, target: NonNullable<PrecedenceTarget>): PrecedenceSelection {
  return sameTarget(s.target, target) ? { ...s, target: null } : { target, step: null };
}

/** Moverse antes del final apaga el resaltado: el lienzo pasa a mostrar el paso. */
export function changeStep(
  s: PrecedenceSelection,
  step: { key: string; index: number },
  lastStep: number,
): PrecedenceSelection {
  return { target: step.index < lastStep ? null : s.target, step };
}
