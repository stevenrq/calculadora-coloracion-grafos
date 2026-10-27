import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { dsaturColoring } from '../dsatur';
import { exactColoringSync } from '../exact';
import { greedyColoring } from '../greedy';
import {
  chromaticLabel,
  colorsUsedWarning,
  keepProven,
  knownChromatic,
  needsExactSearch,
  selectDisplayedResult,
} from '../present';
import { welshPowellColoring } from '../welsh-powell';

const g = exampleGraph(findExample('w5'));
const h = { dsatur: dsaturColoring(g), greedy: greedyColoring(g), 'welsh-powell': welshPowellColoring(g) };
const exact = { status: 'exact' as const, ...exactColoringSync(g) };

it('etiquetas de χ', () => {
  expect(chromaticLabel({ status: 'running', k: 4 })).toEqual({
    value: '…',
    badge: 'Calculando…',
    detail: 'Probando con 4 colores…',
  });
  expect(chromaticLabel(exact)).toEqual({ value: '4', badge: 'Exacto', detail: null });
  expect(chromaticLabel({ status: 'timeout', lower: 3, upper: 4, result: h.dsatur })).toEqual({
    value: '≤ 4',
    badge: 'Cota superior',
    detail: 'χ(G) ≤ 4 (cota superior). Cota inferior: 3.',
  });
});

it('resultado mostrado según algoritmo', () => {
  expect(selectDisplayedResult('greedy', h, exact)).toBe(h.greedy);
  expect(selectDisplayedResult('auto', h, { status: 'running', k: 3 })).toBe(h.dsatur);
  expect(selectDisplayedResult('exact', h, exact)).toBe(exact.result);
});

it('aviso cuando un algoritmo usa más colores que χ', () => {
  const wp = { ...h['welsh-powell'], colorsUsed: 5 };
  expect(colorsUsedWarning(wp, exact)).toBe('Welsh-Powell usó 5 colores; el mínimo es 4.');
  expect(colorsUsedWarning(h.dsatur, exact)).toBeNull();
  expect(colorsUsedWarning(wp, { status: 'running', k: 3 })).toBeNull();
});

describe('keepProven', () => {
  const running = { status: 'running' as const, k: 3 };
  const cancelled = { status: 'cancelled' as const, lower: 3, upper: 4, result: h.dsatur };

  it('un χ demostrado del mismo grafo no se degrada', () => {
    const prev = { key: 'g1', state: exact };
    expect(keepProven(prev, { key: 'g1', state: running })).toBe(prev);
    expect(keepProven(prev, { key: 'g1', state: cancelled })).toBe(prev);
  });

  it('otro grafo, o un estado previo sin demostrar, se reemplaza', () => {
    const next = { key: 'g2', state: running };
    expect(keepProven({ key: 'g1', state: exact }, next)).toBe(next);
    expect(keepProven({ key: 'g2', state: cancelled }, next)).toBe(next);
    expect(keepProven(null, next)).toBe(next);
  });
});

describe('keepProven sin cambios', () => {
  it('el mismo progreso (misma clave y mismo k) devuelve el estado previo, así React no vuelve a renderizar', () => {
    const prev = { key: 'g1', state: { status: 'running' as const, k: 4 } };
    expect(keepProven(prev, { key: 'g1', state: { status: 'running', k: 4 } })).toBe(prev);
    const next = { key: 'g1', state: { status: 'running' as const, k: 5 } };
    expect(keepProven(prev, next)).toBe(next);
  });
});

describe('needsExactSearch', () => {
  const timeout = { status: 'timeout' as const, lower: 3, upper: 4, result: h.dsatur };
  const cancelled = { status: 'cancelled' as const, lower: 3, upper: 4, result: h.dsatur };

  it('relanza solo si no hay un resultado definitivo para este grafo', () => {
    expect(needsExactSearch(null, 'k')).toBe(true);
    expect(needsExactSearch({ key: 'k', state: { status: 'running', k: 3 } }, 'k')).toBe(true);
    expect(needsExactSearch({ key: 'otro', state: exact }, 'k')).toBe(true);
  });

  it('no repite una búsqueda demostrada ni una que ya agotó el tiempo', () => {
    expect(needsExactSearch({ key: 'k', state: exact }, 'k')).toBe(false);
    expect(needsExactSearch({ key: 'k', state: timeout }, 'k')).toBe(false);
  });

  it('tras cancelar, reabrir la hoja reintenta', () => {
    expect(needsExactSearch({ key: 'k', state: cancelled }, 'k')).toBe(true);
  });
});

describe('knownChromatic', () => {
  const running = { key: 'k', state: { status: 'running' as const, k: 3 } };
  const cancelled = { key: 'k', state: { status: 'cancelled' as const, lower: 3, upper: 4, result: h.dsatur } };
  const solved = { key: 'k', state: exact };

  it('lo que ya resolvió la otra instancia (hoja o "Colorea tú") manda sobre la búsqueda propia', () => {
    expect(knownChromatic(running, solved, 'k')).toBe(solved);
    expect(knownChromatic(cancelled, solved, 'k')).toBe(solved);
    expect(knownChromatic(null, solved, 'k')).toBe(solved);
  });

  it('sin nada compartido de este grafo, vale el estado propio; si tampoco es de este grafo, nada', () => {
    expect(knownChromatic(running, { key: 'otro', state: exact }, 'k')).toBe(running);
    expect(knownChromatic(running, null, 'k')).toBe(running);
    expect(knownChromatic({ key: 'otro', state: exact }, null, 'k')).toBeNull();
  });
});
