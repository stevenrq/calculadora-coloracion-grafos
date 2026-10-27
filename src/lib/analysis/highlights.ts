import type { Coloring } from '@/lib/coloring/types';
import { colorClasses } from '@/lib/coloring/validate';
import type { Edge, Graph, VertexId } from '@/lib/graph/types';
import type { StructuralAnalysis } from './analyze';

/** Qué se resalta en el lienzo al tocar una fila de la hoja de resultados. */
export type HighlightTarget = { kind: 'class'; color: number } | { kind: 'clique' } | { kind: 'odd-cycle' } | null;

export interface HighlightSpec {
  vertices: VertexId[];
  edges: Edge[];
  tone: 'focus' | 'warning';
}

export function cycleEdges(cycle: readonly VertexId[]): Edge[] {
  return cycle.map((v, i) => [v, cycle[(i + 1) % cycle.length]] as const);
}

function allPairs(vertices: readonly VertexId[]): Edge[] {
  return vertices.flatMap((a, i) => vertices.slice(i + 1).map((b) => [a, b] as const));
}

export function highlightFor(
  target: HighlightTarget,
  g: Graph,
  coloring: Coloring,
  analysis: Pick<StructuralAnalysis, 'clique' | 'bipartite'>,
): HighlightSpec | undefined {
  if (!target) return undefined;
  switch (target.kind) {
    case 'class':
      return { vertices: colorClasses(g, coloring)[target.color] ?? [], edges: [], tone: 'focus' };
    case 'clique': {
      const { clique } = analysis.clique;
      return { vertices: clique, edges: allPairs(clique), tone: 'focus' };
    }
    case 'odd-cycle':
      if (analysis.bipartite.bipartite) return undefined;
      return { vertices: analysis.bipartite.oddCycle, edges: cycleEdges(analysis.bipartite.oddCycle), tone: 'warning' };
  }
}

export function sameTarget(a: HighlightTarget, b: HighlightTarget): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind !== 'class' || (b.kind === 'class' && a.color === b.color);
}
