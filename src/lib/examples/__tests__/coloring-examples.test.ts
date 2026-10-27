import { COLORING_EXAMPLES, exampleGraph, findExample } from '../coloring-examples';

it('los 13 ejemplos parsean y tienen ids únicos', () => {
  expect(COLORING_EXAMPLES).toHaveLength(13);
  expect(new Set(COLORING_EXAMPLES.map((e) => e.id)).size).toBe(13);
  for (const ex of COLORING_EXAMPLES) expect(exampleGraph(ex).vertices.length).toBeGreaterThan(0);
});

it('tamaños conocidos', () => {
  const size = (id: string) => {
    const g = exampleGraph(findExample(id));
    return [g.vertices.length, g.edges.length];
  };
  expect(size('petersen')).toEqual([10, 15]);
  expect(size('homework')).toEqual([13, 16]);
  expect(size('exams')).toEqual([7, 10]);
  expect(size('w6')).toEqual([7, 12]);
  expect(size('k5')).toEqual([5, 10]);
});

describe('tarea de 13 actividades (Apéndice A del diseño)', () => {
  // Código → predecesoras, tal como en la tabla de la tarea.
  const PREDECESSORS: Record<string, string[]> = {
    A: [],
    B: ['A'],
    C: ['B'],
    D: ['B'],
    E: ['C'],
    F: ['C'],
    G: ['E'],
    H: ['E'],
    I: ['D'],
    J: ['G', 'H', 'I'],
    K: ['J', 'F'],
    L: ['J'],
    M: ['K', 'L'],
  };
  const homework = exampleGraph(findExample('homework'));
  const key = (a: string, b: string) => [a, b].sort().join('-');

  it('sus aristas son exactamente las relaciones de precedencia, sin direcciones', () => {
    const expected = Object.entries(PREDECESSORS).flatMap(([activity, preds]) => preds.map((p) => key(p, activity)));
    expect(homework.edges.map(([a, b]) => key(a, b)).sort()).toEqual(expected.sort());
    expect(homework.vertices).toEqual(Object.keys(PREDECESSORS));
  });

  it('la 3-coloración del apéndice es válida', () => {
    const color: Record<string, number> = {};
    for (const v of ['B', 'E', 'F', 'I', 'L']) color[v] = 1;
    for (const v of ['A', 'C', 'D', 'G', 'H', 'K']) color[v] = 2;
    for (const v of ['J', 'M']) color[v] = 3;
    expect(Object.keys(color).sort()).toEqual([...homework.vertices].sort());
    for (const [a, b] of homework.edges) expect(color[a]).not.toBe(color[b]);
  });
});
