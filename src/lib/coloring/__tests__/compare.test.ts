import { analyzeGraph } from '@/lib/analysis/analyze';
import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { compareRows, formatElapsed } from '../compare';
import { exactColoringSync } from '../exact';

const g = exampleGraph(findExample('petersen'));
const { heuristics } = analyzeGraph(g);
const exact = { status: 'exact' as const, ...exactColoringSync(g) };
const byId = (rows: ReturnType<typeof compareRows>) => Object.fromEntries(rows.map((r) => [r.id, r]));

describe('compareRows', () => {
  it('los cinco algoritmos en orden, con el exacto terminado', () => {
    const rows = compareRows(heuristics, exact);
    expect(rows.map((r) => r.id)).toEqual(['auto', 'dsatur', 'welsh-powell', 'greedy', 'exact']);
    const r = byId(rows);
    expect(r.exact.colorsUsed).toBe(3);
    expect(r.exact.steps).toBe(exact.result.steps.length);
    expect(r.exact.applicable).toBe(true);
    expect(r.auto).toMatchObject({ colorsUsed: 3, note: 'usó Exacto', applicable: true });
    expect(r.dsatur).toMatchObject({
      colorsUsed: heuristics.dsatur.colorsUsed,
      steps: heuristics.dsatur.steps.length,
      applicable: true,
    });
  });

  it('mientras el exacto corre, su fila no se puede aplicar y Auto muestra DSATUR', () => {
    const r = byId(compareRows(heuristics, { status: 'running', k: 3 }));
    expect(r.exact).toMatchObject({ colorsUsed: null, steps: null, time: 'Calculando…', applicable: false });
    expect(r.auto).toMatchObject({
      colorsUsed: heuristics.dsatur.colorsUsed,
      note: 'usa DSATUR mientras tanto',
      applicable: true,
    });
  });

  it('si se agotó el tiempo, el exacto da la cota y no un número de colores', () => {
    const timeout = { status: 'timeout' as const, lower: 3, upper: 4, result: heuristics.dsatur };
    const r = byId(compareRows(heuristics, timeout));
    expect(r.exact).toMatchObject({ colorsUsed: null, note: 'se agotó el tiempo: χ ≤ 4', applicable: false });
    expect(r.auto).toMatchObject({ colorsUsed: heuristics.dsatur.colorsUsed, note: 'usó DSATUR' });
  });
});

it('formatElapsed', () => {
  expect(formatElapsed(0.3)).toBe('< 1 ms');
  expect(formatElapsed(12.4)).toBe('12 ms');
  expect(formatElapsed(1234)).toBe('1,2 s');
});
