import { analyzeGraph } from '@/lib/analysis/analyze';
import { cycleEdges, highlightFor, sameTarget, stepHighlight } from '@/lib/analysis/highlights';
import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';

describe('cycleEdges', () => {
  it('une vértices consecutivos y cierra el ciclo', () => {
    expect(cycleEdges(['A', 'B', 'C'])).toEqual([
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
    ]);
  });
});

describe('highlightFor', () => {
  const c5 = exampleGraph(findExample('c5'));
  const a = analyzeGraph(c5);
  const coloring = a.heuristics.dsatur.coloring;

  it('ciclo impar: sus 5 vértices y 5 aristas en tono de advertencia', () => {
    const h = highlightFor({ kind: 'odd-cycle' }, c5, coloring, a);
    expect(h?.tone).toBe('warning');
    expect(h?.vertices).toHaveLength(5);
    expect(h?.edges).toHaveLength(5);
  });

  it('clase de color: solo los vértices de ese color, en foco', () => {
    const h = highlightFor({ kind: 'class', color: 0 }, c5, coloring, a);
    expect(h?.tone).toBe('focus');
    expect(h?.vertices.every((v) => coloring[v] === 0)).toBe(true);
    expect(h?.vertices.length).toBeGreaterThan(0);
  });

  it('clique: sus vértices y todas las aristas entre ellos', () => {
    const k5 = exampleGraph(findExample('k5'));
    const h = highlightFor({ kind: 'clique' }, k5, {}, analyzeGraph(k5));
    expect(h?.vertices).toHaveLength(5);
    expect(h?.edges).toHaveLength(10);
  });

  it('sin resaltado: undefined; un grafo bipartito no tiene ciclo impar', () => {
    expect(highlightFor(null, c5, coloring, a)).toBeUndefined();
    const k33 = exampleGraph(findExample('k33'));
    expect(highlightFor({ kind: 'odd-cycle' }, k33, {}, analyzeGraph(k33))).toBeUndefined();
  });
});

describe('sameTarget', () => {
  it('compara tipo y color', () => {
    expect(sameTarget({ kind: 'class', color: 1 }, { kind: 'class', color: 1 })).toBe(true);
    expect(sameTarget({ kind: 'class', color: 1 }, { kind: 'class', color: 2 })).toBe(false);
    expect(sameTarget({ kind: 'clique' }, { kind: 'odd-cycle' })).toBe(false);
    expect(sameTarget(null, { kind: 'clique' })).toBe(false);
  });
});

describe('stepHighlight', () => {
  const steps = [
    { kind: 'info' as const, message: 'inicio' },
    { kind: 'assign' as const, vertex: 'A', color: 0, message: 'A recibe el color 1' },
  ];

  it('resalta en foco el vértice del paso actual', () => {
    expect(stepHighlight(steps, 1)).toEqual({ vertices: ['A'], edges: [], tone: 'focus' });
  });

  it('sin vértice (paso informativo o índice -1) no resalta nada', () => {
    expect(stepHighlight(steps, 0)).toBeUndefined();
    expect(stepHighlight(steps, -1)).toBeUndefined();
  });
});
