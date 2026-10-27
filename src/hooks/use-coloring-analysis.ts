import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { analyzeGraph, type StructuralAnalysis } from '@/lib/analysis/analyze';
import type { ExactProgress } from '@/lib/coloring/exact';
import { type ChromaticState, type KeyedChromatic, keepProven } from '@/lib/coloring/present';
import { DEFAULT_EXACT_BUDGET_MS, type ExactOutcome, runExact } from '@/lib/coloring/run-exact';
import { graphKey } from '@/lib/graph/graph';
import type { Graph } from '@/lib/graph/types';

export interface ColoringAnalysis extends StructuralAnalysis {
  chromatic: ChromaticState;
}

const RUNNING: ChromaticState = { status: 'running', k: null };

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
  const cancelRef = useRef<(() => void) | null>(null);

  const search = useEffectEvent(
    async (isCancelled: () => boolean, onProgress: (p: ExactProgress) => void): Promise<ExactOutcome> => {
      try {
        return await runExact(graph, { budgetMs: DEFAULT_EXACT_BUDGET_MS, isCancelled, onProgress });
      } catch (error) {
        // No dejar la tarjeta en "Calculando…" para siempre: se muestra la cota de DSATUR.
        console.error('Falló la búsqueda exacta', error);
        const dsatur = structural?.heuristics.dsatur ?? analyzeGraph(graph).heuristics.dsatur;
        return { status: 'timeout', lower: structural?.bounds.lower ?? 1, upper: dsatur.colorsUsed, result: dsatur };
      }
    },
  );

  useEffect(() => {
    if (!active) return;
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
      if (!disposed) setExact((prev) => keepProven(prev, { key, state: outcome }));
    });
    return () => {
      disposed = true;
      cancelRef.current = null;
    };
  }, [key, active]);

  const cancelExact = () => cancelRef.current?.();

  if (!structural) return { analysis: null, cancelExact };
  // Un estado de otro grafo nunca se muestra: hasta que llegue el propio, "Calculando…".
  const chromatic = exact?.key === key ? exact.state : RUNNING;
  return { analysis: { ...structural, chromatic }, cancelExact };
}
