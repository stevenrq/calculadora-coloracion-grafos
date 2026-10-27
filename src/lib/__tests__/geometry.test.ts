import { parseGraphText } from '@/lib/graph/text';
import { clampScale, distanceToSegment, hitTestEdge, hitTestVertex, screenToWorld, worldToScreen } from '../geometry';

const g = parseGraphText('A-B', 'edges', false).graph!;
const pos = { A: { x: 0, y: 0 }, B: { x: 100, y: 0 } };

it('conversión pantalla↔mundo es inversa', () => {
  const vp = { scale: 2, tx: 10, ty: -5 };
  expect(screenToWorld(worldToScreen({ x: 3, y: 4 }, vp), vp)).toEqual({ x: 3, y: 4 });
});

it('hit test de vértice: el más cercano dentro del radio', () => {
  expect(hitTestVertex({ x: 5, y: 5 }, pos, g.vertices)).toBe('A');
  expect(hitTestVertex({ x: 50, y: 50 }, pos, g.vertices)).toBeNull();
});

it('hit test de arista', () => {
  expect(hitTestEdge({ x: 50, y: 6 }, g, pos)).toEqual(['A', 'B']);
  expect(hitTestEdge({ x: 50, y: 40 }, g, pos)).toBeNull();
  expect(distanceToSegment({ x: 50, y: 3 }, pos.A, pos.B)).toBeCloseTo(3);
});

it('zoom limitado', () => {
  expect(clampScale(10)).toBe(3);
  expect(clampScale(0.1)).toBe(0.3);
});
