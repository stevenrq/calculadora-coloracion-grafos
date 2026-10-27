import { AlgorithmPicker } from '@/components/results/algorithm-picker';
import { BoundsCard } from '@/components/results/bounds-card';
import { ChromaticCard } from '@/components/results/chromatic-card';
import { ColorClasses } from '@/components/results/color-classes';
import { StepPlayer } from '@/components/results/step-player';
import { StructureCard } from '@/components/results/structure-card';
import type { useResultsView } from '@/hooks/use-results-view';
import type { Graph } from '@/lib/graph/types';

/** Contenido de la hoja de resultados, en el orden fijado por el diseño. */
export function ResultsPanel({ graph, view }: { graph: Graph; view: ReturnType<typeof useResultsView> }) {
  const { analysis, displayed, highlightTarget, toggleHighlight } = view;
  if (!analysis || !displayed) return null;

  return (
    <>
      <AlgorithmPicker value={view.algorithm} onChange={view.changeAlgorithm} />
      <ChromaticCard chromatic={analysis.chromatic} displayed={displayed} onCancel={view.cancelExact} />
      <StepPlayer
        key={view.resultKey}
        steps={displayed.steps}
        truncated={displayed.stepsTruncated}
        index={view.stepIndex}
        onIndexChange={view.changeStep}
        algorithm={displayed.algorithm}
        degrees={analysis.degrees.byVertex}
      />
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
