/** `1 vértice`, `0 vértices`, `5 vértices`: el singular solo para 1. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Resumen de tamaño, p. ej. `5 vértices · 5 aristas`. */
export function countsLabel(vertices: number, edges: number): string {
  return `${plural(vertices, 'vértice', 'vértices')} · ${plural(edges, 'arista', 'aristas')}`;
}

/** Une frases en un texto para lectores de pantalla, cada una con un solo signo de cierre (`.`, `?` o `!`). */
export function sentences(...parts: string[]): string {
  return parts.map((part) => (/[.?!]$/.test(part) ? part : `${part}.`)).join(' ');
}

/** `A`, `A y B`, `A, B y C`. Ante sonido i la conjunción es "e" (`E, F e I`), como pide la RAE. */
export function joinSpanish(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  const last = items[items.length - 1];
  const conjunction = /^(?:[iíIÍ]|[hH][iíIÍ](?![aeoáéó]))/.test(last) ? 'e' : 'y';
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${last}`;
}
