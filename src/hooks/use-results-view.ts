import { useState } from 'react';

import { coloringColors } from '@/constants/palette';
import { useColoringAnalysis } from '@/hooks/use-coloring-analysis';
import {
  afterHighlightToggle,
  afterStepChange,
  EMPTY_SELECTION,
  highlightFor,
  type HighlightTarget,
  type ResultsSelection,
  stepHighlight,
} from '@/lib/analysis/highlights';
import { selectDisplayedResult } from '@/lib/coloring/present';
import { coloringAtStep } from '@/lib/coloring/replay';
import type { AlgorithmId } from '@/lib/coloring/types';
import type { Graph } from '@/lib/graph/types';

/**
 * Estado de la hoja de resultados: apertura, algoritmo, resaltado y paso del reproductor,
 * más lo que el lienzo debe pintar a partir de ellos.
 */
export function useResultsView(graph: Graph, active: boolean) {
  const [open, setOpen] = useState(false);
  const [algorithm, setAlgorithm] = useState<AlgorithmId>('auto');
  const [selection, setSelection] = useState<ResultsSelection>(EMPTY_SELECTION);
  const highlightTarget = selection.target;

  const { analysis, cancelExact } = useColoringAnalysis(graph, open && active);
  const displayed = analysis ? selectDisplayedResult(algorithm, analysis.heuristics, analysis.chromatic) : null;

  // Paso del reproductor: si cambia el resultado mostrado (otro grafo u otro algoritmo), vuelve al paso final.
  const resultKey = analysis && displayed ? `${analysis.key}|${displayed.algorithm}` : null;
  const lastStep = displayed ? displayed.steps.length - 1 : -1;
  const stepIndex = selection.step?.key === resultKey ? selection.step.index : lastStep;
  const replaying = displayed !== null && stepIndex < lastStep;

  let vertexColors: Record<string, string> | undefined;
  let highlight: ReturnType<typeof highlightFor>;
  if (analysis && displayed) {
    vertexColors = coloringColors(replaying ? coloringAtStep(displayed.steps, stepIndex) : displayed.coloring);
    highlight = replaying
      ? stepHighlight(displayed.steps, stepIndex)
      : highlightFor(highlightTarget, graph, displayed.coloring, analysis);
  }

  return {
    open,
    analysis,
    displayed,
    cancelExact,
    algorithm,
    highlightTarget,
    resultKey,
    stepIndex,
    vertexColors,
    highlight,
    openResults() {
      setOpen(true);
      setSelection((s) => ({ ...s, target: null }));
    },
    closeResults() {
      setOpen(false);
      setSelection((s) => ({ ...s, target: null }));
    },
    changeAlgorithm(next: AlgorithmId) {
      setAlgorithm(next);
      // Las clases de color cambian con el algoritmo; clique y ciclo no.
      setSelection((s) => (s.target?.kind === 'class' ? { ...s, target: null } : s));
    },
    toggleHighlight(target: NonNullable<HighlightTarget>) {
      setSelection((s) => afterHighlightToggle(s, target));
    },
    changeStep(index: number) {
      if (resultKey) setSelection((s) => afterStepChange(s, { key: resultKey, index }, lastStep));
    },
  };
}
