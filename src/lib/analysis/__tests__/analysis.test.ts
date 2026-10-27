import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { emptyGraph } from '@/lib/graph/graph';
import { parseGraphText } from '@/lib/graph/text';
import type { Graph } from '@/lib/graph/types';
import { chromaticBounds } from '../bounds';
import { checkBipartite } from '../bipartite';
import { findMaximumClique } from '../clique';
import { connectedComponents } from '../components';
import { degreeStats } from '../degrees';

const ex = (id: string) => exampleGraph(findExample(id));
const c4c5 = parseGraphText('A-B, B-C, C-D, D-A, P-Q, Q-R, R-S, S-T, T-P', 'edges', false).graph!;
const isOddCycleOf = (g: Graph, cyc: string[]) =>
  cyc.length % 2 === 1 &&
  cyc.every((v, i) =>
    g.edges.some(([a, b]) => {
      const w = cyc[(i + 1) % cyc.length];
      return (a === v && b === w) || (a === w && b === v);
    }),
  );

describe('degreeStats', () => {
  it('tarea', () => {
    const d = degreeStats(ex('homework'));
    expect([d.min, d.max]).toEqual([1, 5]);
    expect(d.average).toBeCloseTo(32 / 13);
    expect(d.sequence).toEqual([5, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1]);
    expect(d.byVertex.J).toBe(5);
  });
  it('grafo vacío', () => expect(degreeStats(emptyGraph())).toMatchObject({ min: 0, max: 0, average: 0, sequence: [] }));
});

describe('connectedComponents', () => {
  it('C₄ ∪ C₅ tiene 2 componentes', () =>
    expect(
      connectedComponents(c4c5)
        .map((c) => c.length)
        .sort(),
    ).toEqual([4, 5]));
  it('vértices aislados son componentes', () =>
    expect(connectedComponents(parseGraphText('A\nB\nC', 'edges', false).graph!)).toHaveLength(3));
});

describe('checkBipartite', () => {
  it('K₃,₃ es bipartito', () => {
    const r = checkBipartite(ex('k33'));
    expect(r.bipartite).toBe(true);
    if (r.bipartite) expect(r.parts.map((p) => p.length).sort()).toEqual([3, 3]);
  });
  it.each(['c5', 'petersen', 'homework'])('%s no es bipartito y da un ciclo impar válido', (id) => {
    const r = checkBipartite(ex(id));
    expect(r.bipartite).toBe(false);
    if (!r.bipartite) expect(isOddCycleOf(ex(id), r.oddCycle)).toBe(true);
  });
  it('desconexo C₄ ∪ C₅: el ciclo impar está en la componente C₅', () => {
    const r = checkBipartite(c4c5);
    expect(r.bipartite).toBe(false);
    if (!r.bipartite) {
      expect(isOddCycleOf(c4c5, r.oddCycle)).toBe(true);
      expect(r.oddCycle.every((v) => 'PQRST'.includes(v))).toBe(true);
    }
  });
});

describe('findMaximumClique', () => {
  it.each([
    ['k5', 5],
    ['petersen', 2],
    ['w5', 3],
    ['homework', 2],
    ['exams', 3],
    ['k33', 2],
  ])('%s → ω = %i', (id, w) => {
    const r = findMaximumClique(ex(id as string));
    expect(r.clique).toHaveLength(w as number);
    expect(r.exact).toBe(true);
  });
  it('vacío → []', () => expect(findMaximumClique(emptyGraph()).clique).toEqual([]));
});

describe('chromaticBounds', () => {
  it('Petersen', () =>
    expect(chromaticBounds(ex('petersen'), 2, false)).toEqual({
      lower: 3,
      lowerReason: 'odd-cycle',
      deltaPlusOne: 4,
      brooks: 3,
    }));
  it('K₅ (completo: Brooks no mejora)', () =>
    expect(chromaticBounds(ex('k5'), 5, false)).toEqual({ lower: 5, lowerReason: 'clique', deltaPlusOne: 5, brooks: 5 }));
  it('C₄ ∪ C₅: Brooks por componente', () =>
    expect(chromaticBounds(c4c5, 2, false)).toEqual({ lower: 3, lowerReason: 'odd-cycle', deltaPlusOne: 3, brooks: 3 }));
  it('vacío y sin aristas', () => {
    expect(chromaticBounds(emptyGraph(), 0, true)).toEqual({ lower: 0, lowerReason: 'empty', deltaPlusOne: 0, brooks: 0 });
    expect(chromaticBounds(parseGraphText('A\nB', 'edges', false).graph!, 1, true)).toEqual({
      lower: 1,
      lowerReason: 'edgeless',
      deltaPlusOne: 1,
      brooks: 1,
    });
  });
});
