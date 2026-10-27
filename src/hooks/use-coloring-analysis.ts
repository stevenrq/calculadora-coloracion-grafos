import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';

import { analyzeGraph, type StructuralAnalysis } from '@/lib/analysis/analyze';
import type { ExactProgress } from '@/lib/coloring/exact';
import {
  type ChromaticState,
  type KeyedChromatic,
  keepProven,
  knownChromatic,
  needsExactSearch,
} from '@/lib/coloring/present';
import { DEFAULT_EXACT_BUDGET_MS, type ExactOutcome, runExact } from '@/lib/coloring/run-exact';
import { graphKey } from '@/lib/graph/graph';
import type { Graph } from '@/lib/graph/types';

export interface ColoringAnalysis extends StructuralAnalysis {
  chromatic: ChromaticState;
}

const RUNNING: ChromaticState = { status: 'running', k: null };

// Último χ definitivo (demostrado o con el tiempo agotado), compartido entre instancias: la hoja de resultados y
// "Colorea tú" analizan el mismo grafo, y la segunda no debe repetir la búsqueda que ya hizo la primera.
let solved: KeyedChromatic = null;
const solvedListeners = new Set<() => void>();
const subscribeSolved = (listener: () => void) => {
  solvedListeners.add(listener);
  return () => void solvedListeners.delete(listener);
};
const getSolved = () => solved;
function publishSolved(next: { key: string; state: ChromaticState }) {
  if (next.state.status !== 'exact' && next.state.status !== 'timeout') return;
  const updated = keepProven(solved, next);
  if (updated === solved) return;
  solved = updated;
  solvedListeners.forEach((listener) => listener());
}

/**
 * Análisis síncrono (estructura y heurísticas) + χ exacto en segundo plano.
 * La búsqueda depende solo de la clave del grafo: cambiar de algoritmo no la relanza.
 */
export function useColoringAnalysis(
  graph: Graph,
  enabled: boolean,
): { analysis: ColoringAnalysis | null; cancelExact(): void } {
  const key = graphKey(graph);
  const active = enabled && graph.vertices.length > 0;
  const structural = active ? analyzeGraph(graph) : null;
  const [exact, setExact] = useState<KeyedChromatic>(null);
  const known = knownChromatic(exact, useSyncExternalStore(subscribeSolved, getSolved), key);
  const cancelRef = useRef<(() => void) | null>(null);

  const search = useEffectEvent(
    async (isCancelled: () => boolean, onProgress: (p: ExactProgress) => void): Promise<ExactOutcome> => {
      try {
        // Reutilizar las cotas del análisis: clique y DSATUR ya se calcularon de forma síncrona.
        const bounds = structural && {
          lower: structural.bounds.lower,
          upper: structural.heuristics.dsatur.colorsUsed,
          dsatur: structural.heuristics.dsatur,
        };
        return await runExact(graph, { budgetMs: DEFAULT_EXACT_BUDGET_MS, bounds: bounds ?? undefined, isCancelled, onProgress });
      } catch (error) {
        // No dejar la tarjeta en "Calculando…" para siempre: se muestra la cota de DSATUR.
        console.error('Falló la búsqueda exacta', error);
        const dsatur = structural?.heuristics.dsatur ?? analyzeGraph(graph).heuristics.dsatur;
        return { status: 'timeout', lower: structural?.bounds.lower ?? 1, upper: dsatur.colorsUsed, result: dsatur };
      }
    },
  );

  // Lee el último resultado sin volverlo dependencia: reabrir la hoja (o pasar a "Colorea tú") no repite una búsqueda
  // ya resuelta.
  const alreadySolved = useEffectEvent(() => !needsExactSearch(known, key));

  useEffect(() => {
    if (!active || alreadySolved()) return;
    // disposed: el efecto se limpió (otro grafo, hoja cerrada o desmontaje) → su resultado se descarta.
    // userCancelled: el usuario pulsó Cancelar → el resultado 'cancelled' sí se muestra.
    let disposed = false;
    let userCancelled = false;
    cancelRef.current = () => {
      userCancelled = true;
    };
    search(
      () => disposed || userCancelled,
      (p) => {
        if (!disposed) setExact((prev) => keepProven(prev, { key, state: { status: 'running', k: p.k } }));
      },
    ).then((outcome) => {
      if (disposed) return;
      setExact((prev) => keepProven(prev, { key, state: outcome }));
      publishSolved({ key, state: outcome });
    });
    return () => {
      disposed = true;
      cancelRef.current = null;
    };
  }, [key, active]);

  const cancelExact = () => cancelRef.current?.();

  if (!structural) return { analysis: null, cancelExact };
  // Un estado de otro grafo nunca se muestra: hasta que llegue el propio, "Calculando…".
  const chromatic = known?.state ?? RUNNING;
  return { analysis: { ...structural, chromatic }, cancelExact };
}
