import { COLORING_EXAMPLES, exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { WORLD_BOX, worldToScreen } from '@/lib/geometry';
import { parseGraphText } from '@/lib/graph/text';
import type { Edge, Graph, Point, VertexId } from '@/lib/graph/types';
import { autoLayout, circleLayout, EDGE_CLEARANCE, fitViewport, mergePositions, MIN_SEPARATION } from '../layouts';
import { boundingBox, edgeCrossings, edgeIntrusions, minVertexDistance } from '../quality';

// --- Familias de grafos para probar tamaños de 1 a 60 vértices (el límite de la app) ---

const ids = (n: number) => Array.from({ length: n }, (_, i) => `v${i}`);
const make = (vertices: VertexId[], edges: Edge[]): Graph => ({ directed: false, vertices, edges });
const path = (n: number) => {
  const v = ids(n);
  return make(v, v.slice(1).map((x, i) => [v[i], x] as const));
};
const cycle = (n: number) => {
  const g = path(n);
  return make([...g.vertices], [...g.edges, [g.vertices[n - 1], g.vertices[0]]]);
};
const star = (n: number) => {
  const v = ids(n);
  return make(v, v.slice(1).map((x) => [v[0], x] as const));
};
const binaryTree = (n: number) => {
  const v = ids(n);
  return make(v, v.slice(1).map((x, i) => [v[Math.floor(i / 2)], x] as const));
};
const grid = (rows: number, cols: number) => {
  const v = ids(rows * cols);
  const edges: Edge[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) edges.push([v[r * cols + c], v[r * cols + c + 1]]);
      if (r + 1 < rows) edges.push([v[r * cols + c], v[(r + 1) * cols + c]]);
    }
  }
  return make(v, edges);
};
const complete = (n: number) => {
  const v = ids(n);
  return make(v, v.flatMap((a, i) => v.slice(i + 1).map((b) => [a, b] as const)));
};
/** Conexo y reproducible: un árbol aleatorio más aristas extra, con un generador con semilla. */
const randomGraph = (n: number, m: number, seed: number) => {
  let s = seed;
  const rand = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const v = ids(n);
  const keys = new Set<string>();
  const edges: Edge[] = [];
  const add = (a: number, b: number) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || keys.has(k)) return;
    keys.add(k);
    edges.push([v[a], v[b]]);
  };
  for (let i = 1; i < n; i++) add(i, Math.floor(rand() * i));
  while (edges.length < m) add(Math.floor(rand() * n), Math.floor(rand() * n));
  return make(v, edges);
};

const homework = exampleGraph(findExample('homework'));
/** El lienzo del celular, más o menos (vertical). */
const PHONE = { width: 360, height: 560 };
const FIT_PADDING = 24;

function expectReadable(g: Graph, pos: ReturnType<typeof autoLayout>) {
  expect(Object.keys(pos).sort()).toEqual([...g.vertices].sort());
  for (const p of Object.values(pos)) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
  expect(minVertexDistance(pos)).toBeGreaterThanOrEqual(MIN_SEPARATION - 0.01);
}

describe('autoLayout: grafos dispersos de cualquier tamaño', () => {
  const cases: [string, Graph, number][] = [
    ['tarea de 13 actividades', homework, 0],
    ['camino de 12', path(12), 0],
    ['camino de 60', path(60), 0],
    ['ciclo de 20', cycle(20), 0],
    ['ciclo de 60', cycle(60), 0],
    ['estrella de 30', star(30), 0],
    ['árbol binario de 31', binaryTree(31), 0],
    ['árbol binario de 60', binaryTree(60), 0],
    ['cuadrícula 5×5', grid(5, 5), 0],
    ['cuadrícula 6×10', grid(6, 10), 0],
  ];

  it.each(cases)('%s: sin solapes, ninguna arista pasa por un vértice y sin cruces', (_, g, maxCrossings) => {
    const pos = autoLayout(g, WORLD_BOX);
    expectReadable(g, pos);
    expect(edgeIntrusions(g, pos, EDGE_CLEARANCE)).toBe(0);
    expect(edgeCrossings(g, pos)).toBeLessThanOrEqual(maxCrossings);
  });

  it.each(cases)('%s: cabe entero en el celular sin quedar diminuto', (_, g) => {
    expect(fitViewport(autoLayout(g, WORLD_BOX), PHONE, FIT_PADDING).scale).toBeGreaterThanOrEqual(0.45);
  });

  it('aleatorio disperso de 40 vértices: sin solapes ni aristas sobre vértices', () => {
    const g = randomGraph(40, 60, 7);
    const pos = autoLayout(g, WORLD_BOX);
    expectReadable(g, pos);
    expect(edgeIntrusions(g, pos, EDGE_CLEARANCE)).toBe(0);
  });
});

describe('autoLayout: la tarea de 13 actividades', () => {
  const pos = autoLayout(homework, WORLD_BOX);

  it('es vertical, como la pantalla del celular', () => {
    const box = boundingBox(pos);
    expect(box.height).toBeGreaterThanOrEqual(box.width);
  });

  it('se ve a buen tamaño en el celular', () => {
    expect(fitViewport(pos, PHONE, FIT_PADDING).scale).toBeGreaterThanOrEqual(0.8);
  });
});

describe('autoLayout: ejemplos de la app', () => {
  // Cruces máximos: 0 en los planares; en los demás, los de su dibujo clásico.
  const MAX_CROSSINGS: Record<string, number> = { k5: 5, k33: 3, petersen: 5 };

  it.each(COLORING_EXAMPLES.map((e) => [e.id]))('%s', (id) => {
    const g = exampleGraph(findExample(id));
    const pos = autoLayout(g, WORLD_BOX);
    expectReadable(g, pos);
    expect(edgeIntrusions(g, pos, EDGE_CLEARANCE)).toBe(0);
    expect(edgeCrossings(g, pos)).toBeLessThanOrEqual(MAX_CROSSINGS[id] ?? 0);
  });
});

describe('autoLayout: casos límite', () => {
  it('grafo vacío', () => {
    expect(autoLayout(make([], []), WORLD_BOX)).toEqual({});
  });

  it('un vértice queda en el centro de la caja', () => {
    expect(autoLayout(make(['A'], []), WORLD_BOX)).toEqual({ A: { x: WORLD_BOX.width / 2, y: WORLD_BOX.height / 2 } });
  });

  it('vértices sueltos y componentes separadas no se encimen', () => {
    const g = make(
      ['A', 'B', 'C', 'D', 'E', 'F', 'P', 'Q', 'R', 'S', 'X', 'Y', 'Z'],
      [
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'A'],
        ['D', 'E'],
        ['E', 'F'],
        ['F', 'D'],
        ['P', 'Q'],
        ['Q', 'R'],
        ['R', 'S'],
      ],
    );
    const pos = autoLayout(g, WORLD_BOX);
    expectReadable(g, pos);
    expect(edgeIntrusions(g, pos, EDGE_CLEARANCE)).toBe(0);
    expect(edgeCrossings(g, pos)).toBe(0);
  });

  it('60 vértices sin aristas forman una cuadrícula que cabe en el celular', () => {
    const g = make(ids(60), []);
    const pos = autoLayout(g, WORLD_BOX);
    expectReadable(g, pos);
    expect(fitViewport(pos, PHONE, FIT_PADDING).scale).toBeGreaterThanOrEqual(0.45);
  });

  it('es determinista: mismo grafo, mismas posiciones', () => {
    const g = randomGraph(30, 45, 3);
    expect(autoLayout(g, WORLD_BOX)).toEqual(autoLayout(g, WORLD_BOX));
  });
});

describe('autoLayout: grafos densos', () => {
  it('K₁₂: sin solapes', () => {
    expectReadable(complete(12), autoLayout(complete(12), WORLD_BOX));
  });

  it('60 vértices y 600 aristas (el máximo): sin solapes y en menos de un segundo', () => {
    const g = randomGraph(60, 600, 11);
    // Tiempo de CPU, no de reloj: con los workers de Jest en paralelo el reloj mide también la carga de la máquina.
    const before = process.cpuUsage();
    const pos = autoLayout(g, WORLD_BOX);
    const cpu = process.cpuUsage(before);
    expect((cpu.user + cpu.system) / 1000).toBeLessThan(1000);
    expectReadable(g, pos);
  });
});

// --- Lo que ya existía ---

const inside = (p: Point) =>
  p.x >= WORLD_BOX.padding &&
  p.x <= WORLD_BOX.width - WORLD_BOX.padding &&
  p.y >= WORLD_BOX.padding &&
  p.y <= WORLD_BOX.height - WORLD_BOX.padding;

it('círculo: todos dentro de la caja', () => {
  expect(Object.values(circleLayout(['A', 'B', 'C', 'D'], WORLD_BOX)).every(inside)).toBe(true);
});

it('fitViewport deja todo visible', () => {
  const p = circleLayout(['A', 'B', 'C'], WORLD_BOX);
  const vp = fitViewport(p, { width: 400, height: 300 }, 20);
  for (const q of Object.values(p).map((x) => worldToScreen(x, vp))) {
    expect(q.x).toBeGreaterThanOrEqual(0);
    expect(q.x).toBeLessThanOrEqual(400);
    expect(q.y).toBeGreaterThanOrEqual(0);
    expect(q.y).toBeLessThanOrEqual(300);
  }
});

it('mergePositions conserva las posiciones existentes y ubica las nuevas', () => {
  const g = parseGraphText('A-B, B-C', 'edges', false).graph!;
  const merged = mergePositions({ A: { x: 1, y: 2 } }, g, WORLD_BOX);
  expect(merged.A).toEqual({ x: 1, y: 2 });
  expect(Object.keys(merged).sort()).toEqual(['A', 'B', 'C']);
});
