import { plural } from '@/lib/format';
import type { Graph } from '@/lib/graph/types';

import { type ChromaticState, chromaticLabel } from './present';
import { ALGORITHM_SHORT_LABELS, type ColoringResult } from './types';
import { colorClasses } from './validate';

/** Colores que caben en la leyenda de la imagen; el resto se resume en una línea. */
export const SHARE_LEGEND_MAX = 8;
/** Vértices que se nombran por color antes de decir cuántos faltan. */
export const SHARE_CLASS_VERTICES_MAX = 12;

export interface ShareCardText {
  title: string;
  chromatic: string;
  used: string;
  legend: { color: number; text: string }[];
  more: string | null;
}

function classText(color: number, vertices: readonly string[]): string {
  const shown = vertices.slice(0, SHARE_CLASS_VERTICES_MAX).join(', ');
  const rest = vertices.length - SHARE_CLASS_VERTICES_MAX;
  return `Color ${color + 1}: ${shown}${rest > 0 ? ` y ${rest} más` : ''}`;
}

function chromaticLine(chromatic: ChromaticState): string {
  if (chromatic.status === 'running') return 'χ(G): calculando…';
  const { badge } = chromaticLabel(chromatic);
  if (chromatic.status === 'exact') return `χ(G) = ${chromatic.chromaticNumber} · ${badge}`;
  return `χ(G) ≤ ${chromatic.upper} · ${badge}`;
}

/** Textos de la imagen para compartir: χ con su insignia, la coloración mostrada y su leyenda. */
export function shareCardText(graph: Graph, result: ColoringResult, chromatic: ChromaticState): ShareCardText {
  const classes = colorClasses(graph, result.coloring)
    .map((vertices, color) => ({ color, vertices }))
    .filter((c) => c.vertices.length > 0);
  const hidden = classes.length - SHARE_LEGEND_MAX;
  return {
    title: 'ColorGrafos',
    chromatic: chromaticLine(chromatic),
    used: `${ALGORITHM_SHORT_LABELS[result.algorithm]} usó ${plural(result.colorsUsed, 'color', 'colores')}`,
    legend: classes.slice(0, SHARE_LEGEND_MAX).map((c) => ({ color: c.color, text: classText(c.color, c.vertices) })),
    more: hidden > 0 ? `y ${plural(hidden, 'color', 'colores')} más` : null,
  };
}
