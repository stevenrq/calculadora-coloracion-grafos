import { useState } from 'react';

import { coloringColors } from '@/constants/palette';
import { graphKey } from '@/lib/graph/graph';
import { analyzePrecedence } from '@/lib/precedence/analyze';
import {
  changeStep,
  issueHighlight,
  precedenceHighlight,
  type PrecedenceSelection,
  type PrecedenceTarget,
  stageColoringAtStep,
  stageStepHighlight,
  toggleTarget,
} from '@/lib/precedence/present';
import type { EditorDoc } from '@/state/editor-reducer';

const EMPTY_SELECTION: PrecedenceSelection = { target: null, step: null };

/**
 * Análisis de precedencias (síncrono: es lineal) y estado de la hoja de resultados, más lo que el lienzo debe pintar.
 * Con errores, el ciclo se resalta en rojo siempre, esté o no abierta la hoja.
 */
export function usePrecedenceView(doc: EditorDoc) {
  const analysis = analyzePrecedence(doc.graph, doc.activities);
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<PrecedenceSelection>(EMPTY_SELECTION);

  // El paso del reproductor vale para un grafo concreto: si el grafo cambia, vuelve al paso final.
  const key = graphKey(doc.graph);
  const steps = analysis.valid ? analysis.stages.steps : [];
  const lastStep = steps.length - 1;
  const stepIndex = selection.step?.key === key ? selection.step.index : lastStep;
  const replaying = stepIndex < lastStep;

  let vertexColors: Record<string, string> | undefined;
  let highlight: ReturnType<typeof issueHighlight>;
  if (!analysis.valid) {
    highlight = issueHighlight(analysis.issues);
  } else if (open) {
    vertexColors = coloringColors(stageColoringAtStep(steps, stepIndex));
    highlight = replaying ? stageStepHighlight(steps, stepIndex) : precedenceHighlight(selection.target, analysis);
  }

  return {
    analysis,
    open,
    key,
    steps,
    stepIndex,
    target: selection.target,
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
    toggleTarget(target: NonNullable<PrecedenceTarget>) {
      setSelection((s) => toggleTarget(s, target));
    },
    changeStep(index: number) {
      setSelection((s) => changeStep(s, { key, index }, lastStep));
    },
  };
}
