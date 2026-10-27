import { LIMITS } from '../types';
import {
  addEdge,
  addVertex,
  emptyGraph,
  graphKey,
  hasEdge,
  isValidLabel,
  nextLabel,
  removeEdge,
  removeVertex,
  renameVertex,
  undirectedAdjacency,
} from '../graph';

const ok = (r: ReturnType<typeof addVertex>) => {
  if (!r.ok) throw new Error(r.error);
  return r.graph;
};
const tri = () =>
  ok(
    addEdge(
      ok(addEdge(ok(addEdge(['A', 'B', 'C'].reduce((g, v) => ok(addVertex(g, v)), emptyGraph()), 'A', 'B')), 'B', 'C')),
      'C',
      'A',
    ),
  );

describe('graph', () => {
  it('valida etiquetas', () => {
    expect(isValidLabel('A')).toBe(true);
    expect(isValidLabel('Física')).toBe(true);
    expect(isValidLabel('x_1')).toBe(true);
    expect(isValidLabel('')).toBe(false);
    expect(isValidLabel('A-B')).toBe(false);
    expect(isValidLabel('ABCDEFGHIJKLM')).toBe(false); // 13 caracteres
  });

  it('agrega vértices y rechaza duplicados e inválidos', () => {
    const g = ok(addVertex(emptyGraph(), 'A'));
    expect(g.vertices).toEqual(['A']);
    expect(addVertex(g, 'A')).toEqual({ ok: false, error: 'duplicate-vertex' });
    expect(addVertex(g, 'A$')).toEqual({ ok: false, error: 'invalid-label' });
  });

  it('respeta el límite de 60 vértices', () => {
    let g = emptyGraph();
    for (let i = 0; i < LIMITS.maxVertices; i++) g = ok(addVertex(g, `v${i}`));
    expect(addVertex(g, 'extra')).toEqual({ ok: false, error: 'limit-vertices' });
  });

  it('aristas no dirigidas: sin lazos, duplicados idempotentes en ambos sentidos', () => {
    const g = tri();
    expect(g.edges).toHaveLength(3);
    expect(hasEdge(g, 'B', 'A')).toBe(true);
    expect(addEdge(g, 'A', 'A')).toEqual({ ok: false, error: 'self-loop' });
    expect(addEdge(g, 'Z', 'A')).toEqual({ ok: false, error: 'unknown-vertex' });
    expect(ok(addEdge(g, 'B', 'A')).edges).toHaveLength(3);
  });

  it('aristas dirigidas: A→B y B→A son distintas', () => {
    let g = ['A', 'B'].reduce((acc, v) => ok(addVertex(acc, v)), emptyGraph(true));
    g = ok(addEdge(ok(addEdge(g, 'A', 'B')), 'B', 'A'));
    expect(g.edges).toEqual([
      ['A', 'B'],
      ['B', 'A'],
    ]);
    expect(hasEdge(g, 'A', 'B')).toBe(true);
  });

  it('borra vértices con sus aristas y borra aristas en cualquier orden', () => {
    expect(removeVertex(tri(), 'A').edges).toEqual([['B', 'C']]);
    expect(removeEdge(tri(), 'B', 'A').edges).toHaveLength(2);
  });

  it('renombra actualizando aristas; rechaza nombre existente', () => {
    const g = ok(renameVertex(tri(), 'A', 'X'));
    expect(g.vertices).toEqual(['X', 'B', 'C']);
    expect(hasEdge(g, 'X', 'B')).toBe(true);
    expect(renameVertex(tri(), 'A', 'B')).toEqual({ ok: false, error: 'duplicate-vertex' });
  });

  it('adyacencia no dirigida', () => {
    expect([...undirectedAdjacency(tri()).get('A')!].sort()).toEqual(['B', 'C']);
  });

  it('nextLabel: A..Z, luego A1..Z1, A2…', () => {
    expect(nextLabel([])).toBe('A');
    expect(nextLabel(['A', 'B'])).toBe('C');
    expect(nextLabel(['A', 'C'])).toBe('B');
    const az = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    expect(nextLabel(az)).toBe('A1');
    expect(nextLabel([...az, 'A1'])).toBe('B1');
  });

  it('graphKey es canónico (no depende del orden)', () => {
    const g1 = tri();
    const g2 = ok(
      addEdge(
        ok(addEdge(ok(addEdge(['C', 'B', 'A'].reduce((g, v) => ok(addVertex(g, v)), emptyGraph()), 'B', 'C')), 'A', 'C')),
        'B',
        'A',
      ),
    );
    expect(graphKey(g1)).toBe(graphKey(g2));
    expect(graphKey(g1)).not.toBe(graphKey(removeEdge(g1, 'A', 'B')));
  });
});
