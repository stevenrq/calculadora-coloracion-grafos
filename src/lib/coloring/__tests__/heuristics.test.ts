import { degreeStats } from '@/lib/analysis/degrees';
import { COLORING_EXAMPLES, exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { emptyGraph } from '@/lib/graph/graph';
import { parseGraphText } from '@/lib/graph/text';
import { dsaturColoring } from '../dsatur';
import { greedyColoring } from '../greedy';
import { coloringAtStep } from '../replay';
import { colorClasses, conflictingEdges, isProperColoring } from '../validate';
import { welshPowellColoring } from '../welsh-powell';

const ex = (id: string) => exampleGraph(findExample(id));
// Orden de entrada A, D, B, C sobre el camino A-B-C-D: greedy cae en la trampa.
const trap = parseGraphText('A\nD\nA-B\nB-C\nC-D', 'edges', false).graph!;
const algos = { greedy: greedyColoring, 'welsh-powell': welshPowellColoring, dsatur: dsaturColoring };

describe.each(Object.entries(algos))('%s', (_name, run) => {
  it.each(COLORING_EXAMPLES.map((e) => e.id))('coloración propia y χ ≤ colores ≤ Δ+1 en %s', (id) => {
    const r = run(ex(id));
    expect(isProperColoring(ex(id), r.coloring)).toBe(true);
    expect(r.colorsUsed).toBeGreaterThanOrEqual(findExample(id).chromaticNumber);
    expect(r.colorsUsed).toBeLessThanOrEqual(degreeStats(ex(id)).max + 1);
  });
  it('replay del último paso reproduce la coloración final', () => {
    const r = run(ex('petersen'));
    expect(coloringAtStep(r.steps, r.steps.length - 1)).toEqual(r.coloring);
  });
  it('grafo vacío → 0 colores; sin aristas → 1', () => {
    expect(run(emptyGraph()).colorsUsed).toBe(0);
    expect(run(parseGraphText('A\nB\nC', 'edges', false).graph!).colorsUsed).toBe(1);
  });
});

it('DSATUR es óptimo en bipartitos, ciclos, ruedas y completos', () => {
  for (const id of ['c4', 'k3', 'k5', 'c5', 'w6', 'k33', 'tree', 'q3', 'w5'])
    expect(dsaturColoring(ex(id)).colorsUsed).toBe(findExample(id).chromaticNumber);
});

it('Greedy depende del orden: la trampa usa 3; Welsh-Powell usa 2', () => {
  expect(greedyColoring(trap).colorsUsed).toBe(3);
  expect(welshPowellColoring(trap).colorsUsed).toBe(2);
});

it('mensajes de Greedy', () => {
  const s = greedyColoring(trap).steps;
  expect(s[0].message).toBe('A (siguiente en orden de entrada): no tiene vecinos coloreados. Recibe el color 1.');
  expect(s[3].message).toBe('C (siguiente en orden de entrada): sus vecinos ya coloreados usan 1, 2. Recibe el color 3.');
});

it('mensajes de Welsh-Powell', () => {
  const m = welshPowellColoring(trap).steps.map((x) => x.message);
  expect(m[0]).toBe('Orden por grado descendente: B(2), C(2), A(1), D(1).');
  expect(m).toContain('Color 1: se recorre la lista ordenada.');
  expect(m).toContain('B (grado 2) no es vecino de ningún vértice con color 1. Recibe el color 1.');
  expect(m).toContain('C es vecino de B (color 1); se salta.');
});

it('mensajes y saturación de DSATUR', () => {
  const s = dsaturColoring(ex('k3')).steps;
  expect(s[0].message).toBe('Se elige A: ve 0 colores distintos y tiene grado 2. Recibe el color 1, el menor libre.');
  expect(s[1].message).toBe('Se elige B: ve 1 color distinto y tiene grado 2. Recibe el color 2, el menor libre.');
  expect(s[1].saturation).toEqual({ B: 1, C: 1 });
});

it('validación', () => {
  const g = ex('k3');
  expect(conflictingEdges(g, { A: 0, B: 0, C: 1 })).toEqual([['A', 'B']]);
  expect(isProperColoring(g, { A: 0, B: 1 })).toBe(false);
  expect(colorClasses(g, { A: 0, B: 1, C: 0 })).toEqual([['A', 'C'], ['B']]);
});
