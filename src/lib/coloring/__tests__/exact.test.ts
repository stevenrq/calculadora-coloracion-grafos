import { COLORING_EXAMPLES, exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { emptyGraph } from '@/lib/graph/graph';
import { parseGraphText } from '@/lib/graph/text';
import * as exactModule from '../exact';
import { exactColoringSync, exactSearch } from '../exact';
import { runExact } from '../run-exact';
import { isProperColoring } from '../validate';

const ex = (id: string) => exampleGraph(findExample(id));

it.each(COLORING_EXAMPLES.map((e) => e.id))('χ exacto de %s coincide con el esperado', (id) => {
  const s = exactColoringSync(ex(id));
  expect(s.chromaticNumber).toBe(findExample(id).chromaticNumber);
  expect(s.result.colorsUsed).toBe(s.chromaticNumber);
  expect(s.result.algorithm).toBe('exact');
  expect(isProperColoring(ex(id), s.result.coloring)).toBe(true);
});

it('vacío → 0; sin aristas → 1; trampa de greedy → 2', () => {
  expect(exactColoringSync(emptyGraph()).chromaticNumber).toBe(0);
  expect(exactColoringSync(parseGraphText('A\nB\nC', 'edges', false).graph!).chromaticNumber).toBe(1);
  expect(exactColoringSync(parseGraphText('A\nD\nA-B\nB-C\nC-D', 'edges', false).graph!).chromaticNumber).toBe(2);
});

it('W₅ registra el intento fallido con k = 3', () => {
  const msgs = exactColoringSync(ex('w5')).result.steps.map((s) => s.message);
  expect(msgs).toContain('Probando con 3 colores…');
  expect(msgs.some((m) => m.startsWith('k = 3: imposible'))).toBe(true);
});

it('el generador cede progreso por trozos', () => {
  const search = exactSearch(ex('w5'), { nodesPerChunk: 1 });
  const first = search.next();
  expect(first.done).toBe(false);
  expect(first.value).toMatchObject({ k: 3 });
});

describe('runExact', () => {
  it('resuelve exacto con presupuesto suficiente', async () => {
    await expect(runExact(ex('petersen'), { budgetMs: 3000 })).resolves.toMatchObject({
      status: 'exact',
      chromaticNumber: 3,
    });
  });
  it('presupuesto 0 en un grafo que exige búsqueda → timeout con cotas', async () => {
    await expect(runExact(ex('w5'), { budgetMs: 0 })).resolves.toMatchObject({ status: 'timeout', lower: 3, upper: 4 });
  });
  it('se cancela a mitad de la búsqueda', async () => {
    let calls = 0;
    const out = await runExact(ex('w5'), { budgetMs: 3000, nodesPerChunk: 1, isCancelled: () => calls++ >= 1 });
    expect(out).toMatchObject({ status: 'cancelled', lower: 3, upper: 4 });
    expect(out.result.algorithm).toBe('dsatur');
  });
});

describe('runExact con cotas ya calculadas', () => {
  it('no vuelve a calcular clique, bipartición ni DSATUR', async () => {
    const g = ex('petersen');
    const bounds = exactModule.exactBounds(g);
    const spy = jest.spyOn(exactModule, 'exactBounds');
    try {
      const out = await runExact(g, { budgetMs: 3000, bounds });
      expect(spy).not.toHaveBeenCalled();
      expect(out).toMatchObject({ status: 'exact', chromaticNumber: 3 });
    } finally {
      spy.mockRestore();
    }
  });
});
