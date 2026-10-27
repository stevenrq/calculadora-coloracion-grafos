import type { Edge, Graph, VertexId } from '@/lib/graph/types';
import { boundingBox, edgeCrossings, edgeIntrusions, minVertexDistance } from '../quality';

const graph = (vertices: VertexId[], edges: Edge[]): Graph => ({ directed: false, vertices, edges });

describe('minVertexDistance', () => {
  it('es la menor distancia entre dos vértices', () => {
    expect(minVertexDistance({ A: { x: 0, y: 0 }, B: { x: 3, y: 4 }, C: { x: 100, y: 0 } })).toBe(5);
  });

  it('con menos de dos vértices no hay distancia que medir', () => {
    expect(minVertexDistance({ A: { x: 0, y: 0 } })).toBe(Infinity);
  });
});

describe('edgeIntrusions', () => {
  const g = graph(['A', 'B', 'C'], [['A', 'C']]);

  it('cuenta los vértices que una arista atraviesa sin ser su extremo', () => {
    const pos = { A: { x: 0, y: 0 }, B: { x: 50, y: 0 }, C: { x: 100, y: 0 } };
    expect(edgeIntrusions(g, pos, 10)).toBe(1);
  });

  it('un vértice lejos de la arista no cuenta', () => {
    const pos = { A: { x: 0, y: 0 }, B: { x: 50, y: 30 }, C: { x: 100, y: 0 } };
    expect(edgeIntrusions(g, pos, 10)).toBe(0);
  });

  it('se mide hasta el segmento, no hasta la recta que lo prolonga', () => {
    const pos = { A: { x: 0, y: 0 }, B: { x: 150, y: 0 }, C: { x: 100, y: 0 } };
    expect(edgeIntrusions(g, pos, 10)).toBe(0);
  });
});

describe('edgeCrossings', () => {
  const square = { A: { x: 0, y: 0 }, B: { x: 100, y: 0 }, C: { x: 100, y: 100 }, D: { x: 0, y: 100 } };

  it('cuenta las diagonales que se cruzan', () => {
    expect(edgeCrossings(graph(['A', 'B', 'C', 'D'], [['A', 'C'], ['B', 'D']]), square)).toBe(1);
  });

  it('un cuadrado sin diagonales no tiene cruces', () => {
    const c4: Edge[] = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']];
    expect(edgeCrossings(graph(['A', 'B', 'C', 'D'], c4), square)).toBe(0);
  });

  it('dos aristas que comparten un vértice no se cruzan', () => {
    expect(edgeCrossings(graph(['A', 'B', 'C'], [['A', 'B'], ['A', 'C']]), square)).toBe(0);
  });
});

describe('boundingBox', () => {
  it('abarca todos los centros', () => {
    expect(boundingBox({ A: { x: -10, y: 5 }, B: { x: 30, y: -20 } })).toEqual({
      minX: -10,
      minY: -20,
      width: 40,
      height: 25,
    });
  });
});
