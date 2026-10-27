import type { Graph } from '@/lib/graph/types';
import { type ExactBounds, type ExactProgress, exactBounds, exactSearch } from './exact';
import type { ColoringResult } from './types';

export const DEFAULT_EXACT_BUDGET_MS = 3000;

export type ExactOutcome =
  | { status: 'exact'; chromaticNumber: number; result: ColoringResult }
  /** Sin demostración: `result` es la coloración DSATUR y χ queda entre `lower` y `upper`. */
  | { status: 'timeout' | 'cancelled'; lower: number; upper: number; result: ColoringResult };

const yieldToUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Ejecuta la búsqueda exacta por trozos, cediendo el control entre ellos para no congelar la interfaz.
 * Antes de cada trozo revisa, en este orden, la cancelación y el presupuesto de tiempo.
 */
export async function runExact(
  g: Graph,
  opts: {
    budgetMs: number;
    /** Cotas ya calculadas (p. ej. por el análisis de la hoja) para no repetir clique y DSATUR. */
    bounds?: ExactBounds;
    isCancelled?: () => boolean;
    onProgress?: (p: ExactProgress) => void;
    nodesPerChunk?: number;
  },
): Promise<ExactOutcome> {
  const start = Date.now();
  const bounds = opts.bounds ?? exactBounds(g);
  const search = exactSearch(g, { bounds, nodesPerChunk: opts.nodesPerChunk });
  const unproven = (status: 'timeout' | 'cancelled'): ExactOutcome => ({
    status,
    lower: bounds.lower,
    upper: bounds.upper,
    result: bounds.dsatur,
  });

  if (bounds.lower !== bounds.upper) {
    for (;;) {
      if (opts.isCancelled?.()) return unproven('cancelled');
      if (Date.now() - start >= opts.budgetMs) return unproven('timeout');
      const r = search.next();
      if (r.done) return { status: 'exact', ...r.value };
      opts.onProgress?.(r.value);
      await yieldToUI();
    }
  }

  const r = search.next();
  if (!r.done) throw new Error('exactSearch no terminó con cotas iguales');
  return { status: 'exact', ...r.value };
}
