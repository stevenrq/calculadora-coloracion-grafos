import type { ExactOutcome } from './run-exact';
import { ALGORITHM_SHORT_LABELS, type AlgorithmId, type ColoringResult } from './types';

export type ChromaticState = { status: 'running'; k: number | null } | ExactOutcome;

export type KeyedChromatic = { key: string; state: ChromaticState } | null;

/**
 * Un χ ya demostrado para el mismo grafo no se degrada (p. ej. al reabrir la hoja y relanzar la búsqueda).
 * Si el progreso no cambió (mismo k), devuelve el estado previo: React omite el render y la búsqueda no se frena.
 */
export function keepProven(prev: KeyedChromatic, next: { key: string; state: ChromaticState }): KeyedChromatic {
  if (prev?.key !== next.key) return next;
  if (prev.state.status === 'exact') return prev;
  if (prev.state.status === 'running' && next.state.status === 'running' && prev.state.k === next.state.k) return prev;
  return next;
}

/** Coloración que se pinta según el algoritmo elegido. Auto/Exacto usan DSATUR mientras la búsqueda corre. */
export function selectDisplayedResult(
  algorithm: AlgorithmId,
  heuristics: Record<'dsatur' | 'greedy' | 'welsh-powell', ColoringResult>,
  chromatic: ChromaticState,
): ColoringResult {
  if (algorithm === 'dsatur' || algorithm === 'greedy' || algorithm === 'welsh-powell') return heuristics[algorithm];
  return chromatic.status === 'running' ? heuristics.dsatur : chromatic.result;
}

export function chromaticLabel(chromatic: ChromaticState): {
  value: string;
  badge: 'Exacto' | 'Cota superior' | 'Calculando…';
  detail: string | null;
} {
  switch (chromatic.status) {
    case 'running':
      return {
        value: '…',
        badge: 'Calculando…',
        detail: chromatic.k === null ? 'Preparando…' : `Probando con ${chromatic.k} colores…`,
      };
    case 'exact':
      return { value: `${chromatic.chromaticNumber}`, badge: 'Exacto', detail: null };
    default:
      return {
        value: `≤ ${chromatic.upper}`,
        badge: 'Cota superior',
        detail: `χ(G) ≤ ${chromatic.upper} (cota superior). Cota inferior: ${chromatic.lower}.`,
      };
  }
}

/** "Welsh-Powell usó 4 colores; el mínimo es 3." — solo cuando χ está demostrado y el algoritmo lo supera. */
export function colorsUsedWarning(result: ColoringResult, chromatic: ChromaticState): string | null {
  if (chromatic.status !== 'exact' || result.colorsUsed <= chromatic.chromaticNumber) return null;
  return `${ALGORITHM_SHORT_LABELS[result.algorithm]} usó ${result.colorsUsed} colores; el mínimo es ${chromatic.chromaticNumber}.`;
}
