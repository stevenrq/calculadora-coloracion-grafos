/** `1 vértice`, `0 vértices`, `5 vértices`: el singular solo para 1. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Resumen de tamaño, p. ej. `5 vértices · 5 aristas`. */
export function countsLabel(vertices: number, edges: number): string {
  return `${plural(vertices, 'vértice', 'vértices')} · ${plural(edges, 'arista', 'aristas')}`;
}
