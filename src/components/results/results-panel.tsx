import { AlgorithmPicker } from '@/components/results/algorithm-picker';
import { BoundsCard } from '@/components/results/bounds-card';
import { ChromaticCard } from '@/components/results/chromatic-card';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ColorClasses } from '@/components/results/color-classes';
import { CompareCard } from '@/components/results/compare-card';
import { SaturationTable } from '@/components/results/saturation-table';
import { StepPlayer } from '@/components/results/step-player';
import { StructureCard } from '@/components/results/structure-card';
import { graphColor } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import type { useResultsView } from '@/hooks/use-results-view';
import type { Graph } from '@/lib/graph/types';

/** Contenido de la hoja de resultados, en el orden fijado por el diseño. */
export function ResultsPanel({
  graph,
  view,
  header,
}: {
  graph: Graph;
  view: ReturnType<typeof useResultsView>;
  /** Tarjeta opcional antes de todo (p. ej. las etapas como coloración). */
  header?: ReactNode;
}) {
  const theme = useTheme();
  const { analysis, displayed, highlightTarget, toggleHighlight } = view;
  if (!analysis || !displayed) return null;
  const { steps } = displayed;
  const currentStep = view.stepIndex >= 0 ? steps[view.stepIndex] : undefined;

  return (
    <>
      {header}
      <AlgorithmPicker value={view.algorithm} onChange={view.changeAlgorithm} />
      <ChromaticCard chromatic={analysis.chromatic} displayed={displayed} onCancel={view.cancelExact} />
      <CompareCard
        heuristics={analysis.heuristics}
        chromatic={analysis.chromatic}
        selected={view.algorithm}
        onApply={view.changeAlgorithm}
      />
      <StepPlayer
        steps={steps}
        index={view.stepIndex}
        onIndexChange={view.changeStep}
        resetKey={view.resultKey}
        swatchColor={(i) => {
          const step = steps[i];
          return step.kind === 'assign' && step.color !== undefined ? graphColor(step.color) : undefined;
        }}>
        {displayed.stepsTruncated && (
          <Text style={[styles.note, { color: theme.textSecondary }]}>
            Se omitieron pasos intermedios del backtracking.
          </Text>
        )}
        {displayed.algorithm === 'dsatur' && <SaturationTable step={currentStep} degrees={analysis.degrees.byVertex} />}
      </StepPlayer>
      <ColorClasses
        graph={graph}
        coloring={displayed.coloring}
        selected={highlightTarget?.kind === 'class' ? highlightTarget.color : null}
        onSelect={(color) => toggleHighlight({ kind: 'class', color })}
      />
      <BoundsCard
        clique={analysis.clique.clique}
        bounds={analysis.bounds}
        cliqueHighlighted={highlightTarget?.kind === 'clique'}
        onToggleClique={() => toggleHighlight({ kind: 'clique' })}
      />
      <StructureCard
        bipartite={analysis.bipartite}
        componentCount={analysis.components.length}
        degrees={analysis.degrees}
        cycleHighlighted={highlightTarget?.kind === 'odd-cycle'}
        onToggleCycle={() => toggleHighlight({ kind: 'odd-cycle' })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
});
