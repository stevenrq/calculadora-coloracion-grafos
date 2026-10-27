import type { Graph, VertexId } from './types';

export interface AdjacencyMatrix {
  labels: VertexId[];
  /** `cells[i][j]`: hay arista de `labels[i]` a `labels[j]` (en no dirigido, en los dos sentidos). */
  cells: boolean[][];
  outDegree: number[];
  inDegree: number[];
}

/** Matriz de adyacencia en el orden de los vértices. En no dirigido es simétrica y los dos grados coinciden. */
export function adjacencyMatrix(g: Graph): AdjacencyMatrix {
  const n = g.vertices.length;
  const index = new Map(g.vertices.map((v, i) => [v, i]));
  const cells = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const outDegree = new Array<number>(n).fill(0);
  const inDegree = new Array<number>(n).fill(0);
  for (const [a, b] of g.edges) {
    const i = index.get(a);
    const j = index.get(b);
    if (i === undefined || j === undefined) continue;
    cells[i][j] = true;
    outDegree[i]++;
    inDegree[j]++;
    if (!g.directed) {
      cells[j][i] = true;
      outDegree[j]++;
      inDegree[i]++;
    }
  }
  return { labels: [...g.vertices], cells, outDegree, inDegree };
}

/** Descripción de una celda para TalkBack. */
export function cellLabel(m: AdjacencyMatrix, i: number, j: number, directed: boolean): string {
  const a = m.labels[i];
  const b = m.labels[j];
  if (i === j) return `${a}: no se permiten lazos`;
  if (directed) return `${a} → ${b}: ${m.cells[i][j] ? 'sí' : 'no'}`;
  return `${a} – ${b}: ${m.cells[i][j] ? 'arista' : 'sin arista'}`;
}

/** ¿La fila `row` se dibuja igual en las dos matrices? (mismas columnas, mismas celdas y mismos grados) */
export function sameMatrixRow(a: AdjacencyMatrix, b: AdjacencyMatrix, row: number): boolean {
  if (a.labels.length !== b.labels.length || a.labels.some((label, i) => label !== b.labels[i])) return false;
  if (a.inDegree[row] !== b.inDegree[row] || a.outDegree[row] !== b.outDegree[row]) return false;
  return a.cells[row].every((on, col) => on === b.cells[row][col]);
}
