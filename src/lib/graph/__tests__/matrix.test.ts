import { adjacencyMatrix, cellLabel, sameMatrixRow } from '../matrix';
import { parseGraphText } from '../text';

const c4 = parseGraphText('A-B, B-C, C-D, D-A', 'edges', false).graph!;
const fork = parseGraphText('A->B, A->C', 'edges', true).graph!;

describe('adjacencyMatrix', () => {
  it('no dirigido: simétrica, diagonal vacía y grados iguales en las dos columnas', () => {
    const m = adjacencyMatrix(c4);
    expect(m.labels).toEqual(['A', 'B', 'C', 'D']);
    expect(m.cells[0][1]).toBe(true);
    expect(m.cells[1][0]).toBe(true);
    expect(m.cells[0][2]).toBe(false);
    expect(m.cells.map((row, i) => row[i])).toEqual([false, false, false, false]);
    expect(m.outDegree).toEqual([2, 2, 2, 2]);
    expect(m.inDegree).toEqual([2, 2, 2, 2]);
  });

  it('dirigido: la fila es la predecesora de la columna', () => {
    const m = adjacencyMatrix(fork);
    expect(m.cells[0][1]).toBe(true);
    expect(m.cells[1][0]).toBe(false);
    expect(m.outDegree).toEqual([2, 0, 0]);
    expect(m.inDegree).toEqual([0, 1, 1]);
  });
});

describe('cellLabel', () => {
  it('describe cada celda para TalkBack', () => {
    const d = adjacencyMatrix(fork);
    expect(cellLabel(d, 0, 1, true)).toBe('A → B: sí');
    expect(cellLabel(d, 1, 0, true)).toBe('B → A: no');
    const u = adjacencyMatrix(c4);
    expect(cellLabel(u, 0, 1, false)).toBe('A – B: arista');
    expect(cellLabel(u, 0, 2, false)).toBe('A – C: sin arista');
    expect(cellLabel(u, 2, 2, false)).toBe('C: no se permiten lazos');
  });
});

describe('sameMatrixRow', () => {
  const g = parseGraphText('A-B, B-C, C-D', 'edges', false).graph!;
  const before = adjacencyMatrix(g);

  it('al tocar una celda solo cambian las filas de sus dos vértices', () => {
    const after = adjacencyMatrix({ ...g, edges: [...g.edges, ['A', 'C']] });
    expect([0, 1, 2, 3].map((row) => sameMatrixRow(before, after, row))).toEqual([false, true, false, true]);
  });

  it('en dirigido cambia también la fila del destino, por su grado de entrada', () => {
    const d = parseGraphText('A->B, B->C', 'edges', true).graph!;
    const after = adjacencyMatrix({ ...d, edges: [...d.edges, ['A', 'C']] });
    expect([0, 1, 2].map((row) => sameMatrixRow(adjacencyMatrix(d), after, row))).toEqual([false, true, false]);
  });

  it('otras etiquetas o columnas cambian todas las filas', () => {
    const renamed = adjacencyMatrix({ ...g, vertices: ['A', 'B', 'C', 'E'], edges: [['A', 'B'], ['B', 'C'], ['C', 'E']] });
    expect(sameMatrixRow(before, renamed, 0)).toBe(false);
    const grown = adjacencyMatrix({ ...g, vertices: [...g.vertices, 'E'] });
    expect(sameMatrixRow(before, grown, 0)).toBe(false);
  });
});
