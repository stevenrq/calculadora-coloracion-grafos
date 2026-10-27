import type { VertexId } from '@/lib/graph/types';
import type { Coloring } from './types';

/** Colores (desde 0) que ya usan los vecinos, sin repetir y en orden ascendente. */
export function neighborColors(neighbors: Iterable<VertexId>, coloring: Coloring): number[] {
  const used = new Set<number>();
  for (const w of neighbors) if (coloring[w] !== undefined) used.add(coloring[w]);
  return [...used].sort((a, b) => a - b);
}

export function smallestFreeColor(used: Iterable<number>): number {
  const taken = new Set(used);
  let color = 0;
  while (taken.has(color)) color++;
  return color;
}

export function countColors(coloring: Coloring): number {
  return new Set(Object.values(coloring)).size;
}

/** Lista de colores para los mensajes: [0, 1] → "1, 2". */
export const humanColors = (colors: readonly number[]) => colors.map((c) => c + 1).join(', ');
