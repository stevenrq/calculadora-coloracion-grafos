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
