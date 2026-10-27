import { joinSpanish, plural } from '@/lib/format';
import type { Graph, VertexId } from '@/lib/graph/types';
import { countColors } from './helpers';
import type { ChromaticState } from './present';
import type { Coloring } from './types';
import { conflictingEdges } from './validate';

/** Pinta `v` con `color`, o le quita el color con `null`. */
export function paintVertex(c: Coloring, v: VertexId, color: number | null): Coloring {
  if (color === null) {
    const { [v]: _removed, ...rest } = c;
    return rest;
  }
  return { ...c, [v]: color };
}

/** Quita los colores de vértices que ya no existen (deshacer, otro ejemplo…). Sin cambios, el mismo objeto. */
export function prunePractice(c: Coloring, g: Graph): Coloring {
  const present = new Set(g.vertices);
  const keys = Object.keys(c);
  if (keys.every((v) => present.has(v))) return c;
  return Object.fromEntries(keys.filter((v) => present.has(v)).map((v) => [v, c[v]]));
}

/** Veredicto de "Comprobar" en el modo Colorea tú: completa, sin conflictos y comparada con χ(G). */
export function practiceVerdict(g: Graph, c: Coloring, chromatic: ChromaticState): { ok: boolean; message: string } {
  if (g.vertices.length === 0) return { ok: false, message: 'Dibuja un grafo para colorearlo.' };
  const missing = g.vertices.filter((v) => c[v] === undefined);
  if (missing.length > 0) return { ok: false, message: `Faltan por colorear: ${joinSpanish(missing)}.` };
  const conflicts = conflictingEdges(g, c);
  if (conflicts.length > 0) {
    const count = plural(conflicts.length, 'arista', 'aristas');
    const list = joinSpanish(conflicts.map(([a, b]) => `${a}–${b}`));
    return { ok: false, message: `Hay ${count} con el mismo color en sus extremos: ${list}.` };
  }

  const k = countColors(c);
  const used = plural(k, 'color', 'colores');
  const optimal = (chi: number) => `¡Coloración válida con ${used}! Es óptima: χ(G) = ${chi}.`;
  if (chromatic.status === 'running') return { ok: true, message: `Coloración válida con ${used}. Calculando χ(G)…` };
  if (chromatic.status === 'exact') {
    const chi = chromatic.chromaticNumber;
    return {
      ok: true,
      message: k === chi ? optimal(chi) : `Coloración válida con ${used}, pero se puede con ${chi} (χ(G) = ${chi}).`,
    };
  }
  // Sin demostración: si alcanza la cota inferior, igual es óptima.
  if (k <= chromatic.lower) return { ok: true, message: optimal(k) };
  return { ok: true, message: `Coloración válida con ${used}. χ(G) está entre ${chromatic.lower} y ${chromatic.upper}.` };
}
