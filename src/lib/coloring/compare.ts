import type { HeuristicId } from '@/lib/analysis/analyze';
import type { ChromaticState } from './present';
import { ALGORITHM_SHORT_LABELS, type AlgorithmId, type ColoringResult } from './types';

export interface CompareRow {
  id: AlgorithmId;
  label: string;
  /** `null` mientras el exacto corre o si no terminó: no hay un número que comparar. */
  colorsUsed: number | null;
  steps: number | null;
  time: string;
  note?: string;
  /** Tocar la fila aplica esa coloración; el exacto sin terminar no tiene una propia. */
  applicable: boolean;
}

/** "< 1 ms", "12 ms" o "1,2 s". */
export function formatElapsed(ms: number): string {
  if (ms < 1) return '< 1 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

const numbers = (r: ColoringResult) => ({
  colorsUsed: r.colorsUsed,
  steps: r.steps.length,
  time: formatElapsed(r.elapsedMs),
});

/** Los cinco algoritmos sobre el mismo grafo: Auto, DSATUR, Welsh-Powell, Greedy y Exacto. */
export function compareRows(heuristics: Record<HeuristicId, ColoringResult>, chromatic: ChromaticState): CompareRow[] {
  const heuristic = (id: HeuristicId): CompareRow => ({
    id,
    label: ALGORITHM_SHORT_LABELS[id],
    ...numbers(heuristics[id]),
    applicable: true,
  });

  let auto: CompareRow;
  let exact: CompareRow;
  const exactLabel = ALGORITHM_SHORT_LABELS.exact;
  if (chromatic.status === 'exact') {
    auto = { id: 'auto', label: 'Auto', ...numbers(chromatic.result), note: 'usó Exacto', applicable: true };
    exact = { id: 'exact', label: exactLabel, ...numbers(chromatic.result), applicable: true };
  } else if (chromatic.status === 'running') {
    const note = 'usa DSATUR mientras tanto';
    auto = { id: 'auto', label: 'Auto', ...numbers(heuristics.dsatur), note, applicable: true };
    exact = { id: 'exact', label: exactLabel, colorsUsed: null, steps: null, time: 'Calculando…', applicable: false };
  } else {
    const reason = chromatic.status === 'timeout' ? 'se agotó el tiempo' : 'se canceló';
    auto = { id: 'auto', label: 'Auto', ...numbers(heuristics.dsatur), note: 'usó DSATUR', applicable: true };
    exact = {
      id: 'exact',
      label: exactLabel,
      colorsUsed: null,
      steps: null,
      time: '—',
      note: `${reason}: χ ≤ ${chromatic.upper}`,
      applicable: false,
    };
  }
  return [auto, heuristic('dsatur'), heuristic('welsh-powell'), heuristic('greedy'), exact];
}
