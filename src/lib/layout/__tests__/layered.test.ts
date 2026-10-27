import { findPrecedenceExample } from '@/lib/examples/precedence-examples';
import { WORLD_BOX } from '@/lib/geometry';
import type { Edge, Graph, Positions, VertexId } from '@/lib/graph/types';
import { analyzePrecedence } from '@/lib/precedence/analyze';
import { graphFromActivities } from '@/lib/precedence/model';
import { layeredLayout } from '../layered';
import { EDGE_CLEARANCE, fitViewport, MIN_SEPARATION } from '../layouts';
import { edgeCrossings, edgeIntrusions, minVertexDistance } from '../quality';

function stagesOf(g: Graph): Record<VertexId, number> {
  const result = analyzePrecedence(g);
  if (!result.valid) throw new Error('el grafo de prueba tiene ciclos');
  return result.stages.stageOf;
}

const exampleGraph = (id: string) => graphFromActivities(findPrecedenceExample(id).activities).graph;

const chain = (n: number): Graph => {
  const v = Array.from({ length: n }, (_, i) => `v${i}`);
  return { directed: true, vertices: v, edges: v.slice(1).map((x, i) => [v[i], x] as const) };
};

/** DAG reproducible: cada flecha va de un vértice anterior a uno posterior. */
const randomDag = (n: number, m: number, seed: number): Graph => {
  let s = seed;
  const rand = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const v = Array.from({ length: n }, (_, i) => `v${i}`);
  const keys = new Set<string>();
  const edges: Edge[] = [];
  while (edges.length < m) {
    const a = Math.floor(rand() * n);
    const b = Math.floor(rand() * n);
    if (a === b) continue;
    const [from, to] = a < b ? [a, b] : [b, a];
    if (keys.has(`${from}-${to}`)) continue;
    keys.add(`${from}-${to}`);
    edges.push([v[from], v[to]]);
  }
  return { directed: true, vertices: v, edges };
};

function expectColumns(g: Graph, pos: Positions, stageOf: Record<VertexId, number>) {
  expect(Object.keys(pos).sort()).toEqual([...g.vertices].sort());
  const xByStage = new Map<number, number>();
  for (const v of g.vertices) {
    const x = xByStage.get(stageOf[v]);
    if (x === undefined) xByStage.set(stageOf[v], pos[v].x);
    else expect(pos[v].x).toBeCloseTo(x);
  }
  const stages = [...xByStage.keys()].sort((a, b) => a - b);
  for (let i = 1; i < stages.length; i++) expect(xByStage.get(stages[i])!).toBeGreaterThan(xByStage.get(stages[i - 1])!);
  expect(minVertexDistance(pos)).toBeGreaterThanOrEqual(MIN_SEPARATION - 0.01);
}

describe('layeredLayout', () => {
  const cases: [string, Graph][] = [
    ['la tarea', exampleGraph('homework')],
    ['preparar una exposición', exampleGraph('presentation')],
    ['un camino de 10', chain(10)],
  ];

  it.each(cases)('%s: una columna por etapa, sin solapes ni flechas sobre vértices', (_, g) => {
    const stageOf = stagesOf(g);
    const pos = layeredLayout(g, stageOf, WORLD_BOX);
    expectColumns(g, pos, stageOf);
    expect(edgeIntrusions(g, pos, EDGE_CLEARANCE)).toBe(0);
  });

  it.each(cases.slice(0, 2))('%s: sin cruces', (_, g) => {
    expect(edgeCrossings(g, layeredLayout(g, stagesOf(g), WORLD_BOX))).toBe(0);
  });

  it('la tarea se ve a buen tamaño en el celular', () => {
    const g = exampleGraph('homework');
    const pos = layeredLayout(g, stagesOf(g), WORLD_BOX);
    expect(fitViewport(pos, { width: 360, height: 560 }, 24).scale).toBeGreaterThanOrEqual(0.5);
  });

  it('DAG aleatorio de 40 vértices: columnas por etapa y sin solapes', () => {
    const g = randomDag(40, 70, 5);
    const stageOf = stagesOf(g);
    expectColumns(g, layeredLayout(g, stageOf, WORLD_BOX), stageOf);
  });

  it('60 actividades y 600 flechas (el máximo): columnas por etapa en menos de un segundo', () => {
    const g = randomDag(60, 600, 3);
    const stageOf = stagesOf(g);
    // Tiempo de CPU, no de reloj: con los workers de Jest en paralelo el reloj mide también la carga de la máquina.
    const before = process.cpuUsage();
    const pos = layeredLayout(g, stageOf, WORLD_BOX);
    const cpu = process.cpuUsage(before);
    expect((cpu.user + cpu.system) / 1000).toBeLessThan(1000);
    expectColumns(g, pos, stageOf);
  });

  it('es determinista', () => {
    const g = randomDag(30, 50, 9);
    const stageOf = stagesOf(g);
    expect(layeredLayout(g, stageOf, WORLD_BOX)).toEqual(layeredLayout(g, stageOf, WORLD_BOX));
  });

  it('un vértice sin etapa va a la primera columna', () => {
    const g: Graph = { directed: true, vertices: ['A', 'B'], edges: [] };
    const pos = layeredLayout(g, { A: 1 }, WORLD_BOX);
    expect(pos.B.x).toBeCloseTo(pos.A.x);
  });
});
