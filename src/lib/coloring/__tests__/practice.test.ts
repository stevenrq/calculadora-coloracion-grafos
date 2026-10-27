import { emptyGraph, removeVertex } from '@/lib/graph/graph';
import { parseGraphText } from '@/lib/graph/text';
import { paintVertex, practiceVerdict, prunePractice } from '../practice';
import type { ColoringResult } from '../types';

const c4 = parseGraphText('A-B, B-C, C-D, D-A', 'edges', false).graph!;
const c5 = parseGraphText('A-B, B-C, C-D, D-E, E-A', 'edges', false).graph!;
const result = { algorithm: 'exact', coloring: {}, colorsUsed: 0, steps: [], stepsTruncated: false, elapsedMs: 0 } as ColoringResult;
const exactly = (n: number) => ({ status: 'exact' as const, chromaticNumber: n, result });

describe('practiceVerdict', () => {
  it('dice qué vértices faltan por colorear', () => {
    expect(practiceVerdict(c4, { A: 0, C: 0 }, exactly(2))).toEqual({ ok: false, message: 'Faltan por colorear: B y D.' });
  });

  it('cuenta y nombra las aristas en conflicto', () => {
    expect(practiceVerdict(c4, { A: 0, B: 0, C: 1, D: 2 }, exactly(2))).toEqual({
      ok: false,
      message: 'Hay 1 arista con el mismo color en sus extremos: A–B.',
    });
    expect(practiceVerdict(c4, { A: 0, B: 0, C: 1, D: 1 }, exactly(2)).message).toBe(
      'Hay 2 aristas con el mismo color en sus extremos: A–B y C–D.',
    );
  });

  it('válida y óptima', () => {
    expect(practiceVerdict(c5, { A: 0, B: 1, C: 0, D: 1, E: 2 }, exactly(3))).toEqual({
      ok: true,
      message: '¡Coloración válida con 3 colores! Es óptima: χ(G) = 3.',
    });
  });

  it('válida pero con más colores que χ', () => {
    expect(practiceVerdict(c4, { A: 0, B: 1, C: 0, D: 2 }, exactly(2))).toEqual({
      ok: true,
      message: 'Coloración válida con 3 colores, pero se puede con 2 (χ(G) = 2).',
    });
  });

  it('sin χ demostrado: compara con las cotas', () => {
    const timeout = { status: 'timeout' as const, lower: 3, upper: 4, result };
    const four = { A: 0, B: 1, C: 0, D: 1, E: 3 };
    expect(practiceVerdict(c5, { ...four, C: 2 }, timeout).message).toBe(
      'Coloración válida con 4 colores. χ(G) está entre 3 y 4.',
    );
    expect(practiceVerdict(c5, { A: 0, B: 1, C: 0, D: 1, E: 2 }, timeout).message).toBe(
      '¡Coloración válida con 3 colores! Es óptima: χ(G) = 3.',
    );
  });

  it('mientras se calcula χ', () => {
    expect(practiceVerdict(c5, { A: 0, B: 1, C: 0, D: 1, E: 2 }, { status: 'running', k: 3 }).message).toBe(
      'Coloración válida con 3 colores. Calculando χ(G)…',
    );
  });

  it('grafo vacío', () => {
    expect(practiceVerdict(emptyGraph(), {}, exactly(0))).toEqual({ ok: false, message: 'Dibuja un grafo para colorearlo.' });
  });
});

describe('paintVertex y prunePractice', () => {
  it('pintar y borrar', () => {
    expect(paintVertex({ A: 0 }, 'B', 2)).toEqual({ A: 0, B: 2 });
    expect(paintVertex({ A: 0, B: 2 }, 'B', null)).toEqual({ A: 0 });
  });

  it('descarta los vértices que ya no están y devuelve el mismo objeto si nada cambió', () => {
    const c = { A: 0, B: 1 };
    expect(prunePractice(c, c4)).toBe(c);
    expect(prunePractice(c, removeVertex(c4, 'B'))).toEqual({ A: 0 });
  });
});
