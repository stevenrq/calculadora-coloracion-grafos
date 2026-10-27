import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { VERTEX_RADIUS, WORLD_BOX, worldToScreen } from '@/lib/geometry';
import { parseGraphText } from '@/lib/graph/text';
import type { Point } from '@/lib/graph/types';
import { circleLayout, fitViewport, forceLayout, mergePositions } from '../layouts';

const inside = (p: Point) =>
  p.x >= WORLD_BOX.padding &&
  p.x <= WORLD_BOX.width - WORLD_BOX.padding &&
  p.y >= WORLD_BOX.padding &&
  p.y <= WORLD_BOX.height - WORLD_BOX.padding;
const minDist = (ps: Point[]) =>
  Math.min(...ps.flatMap((a, i) => ps.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));

it('círculo: todos dentro de la caja', () => {
  expect(Object.values(circleLayout(['A', 'B', 'C', 'D'], WORLD_BOX)).every(inside)).toBe(true);
});

it.each(['homework', 'petersen'])('fuerzas en %s: determinista, dentro de la caja y sin solaparse', (id) => {
  const g = exampleGraph(findExample(id));
  const p = forceLayout(g, WORLD_BOX);
  expect(forceLayout(g, WORLD_BOX)).toEqual(p);
  expect(Object.values(p).every(inside)).toBe(true);
  expect(minDist(Object.values(p))).toBeGreaterThanOrEqual(2 * VERTEX_RADIUS);
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
