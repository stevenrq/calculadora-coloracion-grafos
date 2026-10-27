import type { Graph } from '@/lib/graph/types';

import type { ChromaticState } from '../present';
import { shareCardText } from '../share-card';
import type { Coloring, ColoringResult, ConcreteAlgorithm } from '../types';

const C5: Graph = {
  directed: false,
  vertices: ['A', 'B', 'C', 'D', 'E'],
  edges: [
    ['A', 'B'],
    ['B', 'C'],
    ['C', 'D'],
    ['D', 'E'],
    ['E', 'A'],
  ],
};

const result = (coloring: Coloring, algorithm: ConcreteAlgorithm = 'dsatur'): ColoringResult => ({
  algorithm,
  coloring,
  colorsUsed: new Set(Object.values(coloring)).size,
  steps: [],
  stepsTruncated: false,
  elapsedMs: 1,
});

/** n vértices aislados V1…Vn, cada uno con su propio color. */
function isolated(n: number): { graph: Graph; coloring: Coloring } {
  const vertices = Array.from({ length: n }, (_, i) => `V${i + 1}`);
  return {
    graph: { directed: false, vertices, edges: [] },
    coloring: Object.fromEntries(vertices.map((v, i) => [v, i])),
  };
}

describe('shareCardText', () => {
  const c5 = result({ A: 0, B: 1, C: 0, D: 1, E: 2 });

  it('C₅ con χ exacto: título, χ, colores usados y una línea por color', () => {
    const exact: ChromaticState = { status: 'exact', chromaticNumber: 3, result: c5 };
    expect(shareCardText(C5, c5, exact)).toEqual({
      title: 'ColorGrafos',
      chromatic: 'χ(G) = 3 · Exacto',
      used: 'DSATUR usó 3 colores',
      legend: [
        { color: 0, text: 'Color 1: A, C' },
        { color: 1, text: 'Color 2: B, D' },
        { color: 2, text: 'Color 3: E' },
      ],
      more: null,
    });
  });

  it('sin demostración dice cota superior; mientras busca, calculando', () => {
    const timeout: ChromaticState = { status: 'timeout', lower: 3, upper: 4, result: c5 };
    expect(shareCardText(C5, c5, timeout).chromatic).toBe('χ(G) ≤ 4 · Cota superior');
    expect(shareCardText(C5, c5, { status: 'running', k: 3 }).chromatic).toBe('χ(G): calculando…');
  });

  it('un solo color va en singular', () => {
    const { graph, coloring } = isolated(1);
    expect(shareCardText(graph, result(coloring, 'greedy'), { status: 'running', k: null }).used).toBe(
      'Greedy usó 1 color',
    );
  });

  it('con más de 8 colores la leyenda se resume', () => {
    const twelve = isolated(12);
    const text = shareCardText(twelve.graph, result(twelve.coloring), { status: 'running', k: null });
    expect(text.legend).toHaveLength(8);
    expect(text.legend[7]).toEqual({ color: 7, text: 'Color 8: V8' });
    expect(text.more).toBe('y 4 colores más');

    const nine = isolated(9);
    expect(shareCardText(nine.graph, result(nine.coloring), { status: 'running', k: null }).more).toBe(
      'y 1 color más',
    );
  });

  it('un color con muchos vértices muestra los primeros 12 y cuántos faltan', () => {
    const vertices = Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i));
    const graph: Graph = { directed: false, vertices, edges: [] };
    const text = shareCardText(graph, result(Object.fromEntries(vertices.map((v) => [v, 0]))), {
      status: 'running',
      k: null,
    });
    expect(text.legend).toEqual([{ color: 0, text: 'Color 1: A, B, C, D, E, F, G, H, I, J, K, L y 3 más' }]);
  });
});
