import { analyzeGraph } from '@/lib/analysis/analyze';
import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { graphKey } from '@/lib/graph/graph';

describe('analyzeGraph', () => {
  it('C5: clave del grafo, heurísticas con 3 colores y ciclo impar de 5', () => {
    const g = exampleGraph(findExample('c5'));
    const a = analyzeGraph(g);
    expect(a.key).toBe(graphKey(g));
    expect(a.heuristics.dsatur.colorsUsed).toBe(3);
    expect(a.heuristics.greedy.algorithm).toBe('greedy');
    expect(a.heuristics['welsh-powell'].algorithm).toBe('welsh-powell');
    expect(a.bipartite.bipartite).toBe(false);
    if (!a.bipartite.bipartite) expect(a.bipartite.oddCycle).toHaveLength(5);
    expect(a.bounds.lower).toBe(3);
    expect(a.components).toHaveLength(1);
    expect(a.degrees.min).toBe(2);
    expect(a.degrees.max).toBe(2);
  });

  it('K3,3: bipartito, clique de 2 y cota inferior 2', () => {
    const a = analyzeGraph(exampleGraph(findExample('k33')));
    expect(a.bipartite.bipartite).toBe(true);
    expect(a.clique.clique).toHaveLength(2);
    expect(a.bounds.lower).toBe(2);
    expect(a.bounds.deltaPlusOne).toBe(4);
  });
});
