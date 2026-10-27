import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { dsaturColoring } from '../dsatur';
import { exactColoringSync } from '../exact';
import { greedyColoring } from '../greedy';
import { chromaticLabel, colorsUsedWarning, selectDisplayedResult } from '../present';
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
