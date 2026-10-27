import { parseGraphText } from '@/lib/graph/text';
import {
  ARROW_LENGTH,
  ARROW_WIDTH,
  arrowGeometry,
  canvasSize,
  clampScale,
  distanceToSegment,
  hitTestEdge,
  hitTestVertex,
  screenToWorld,
  worldToScreen,
} from '../geometry';

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

describe('arrowGeometry', () => {
  it('la línea sale del borde del círculo de origen y la punta toca el borde del destino', () => {
    const g = arrowGeometry({ x: 0, y: 0 }, { x: 100, y: 0 }, 22)!;
    expect(g.head[0]).toEqual({ x: 78, y: 0 });
    expect(g.x1).toBe(22);
    expect(g.x2).toBe(78 - ARROW_LENGTH);
    expect(g.head[1].x).toBeCloseTo(66);
    expect(Math.abs(g.head[1].y - g.head[2].y)).toBeCloseTo(ARROW_WIDTH);
  });

  it('funciona en cualquier dirección', () => {
    const g = arrowGeometry({ x: 0, y: 100 }, { x: 0, y: 0 }, 22)!;
    expect(g.head[0].x).toBeCloseTo(0);
    expect(g.head[0].y).toBeCloseTo(22);
    expect(g.y1).toBeCloseTo(78);
  });

  it('si la punta no cabe entera, se encoge para llenar el hueco y la dirección se sigue viendo', () => {
    const g = arrowGeometry({ x: 0, y: 0 }, { x: 50, y: 0 }, 22)!;
    expect(g.head[0]).toEqual({ x: 28, y: 0 });
    expect(g.head[1].x).toBeCloseTo(22);
    expect(Math.abs(g.head[1].y - g.head[2].y)).toBeCloseTo((ARROW_WIDTH * 6) / ARROW_LENGTH);
    expect(g.x2).toBeCloseTo(g.x1);
  });

  it('con los círculos encimados no hay flecha (los vértices la tapan, como a una arista)', () => {
    expect(arrowGeometry({ x: 0, y: 0 }, { x: 30, y: 0 }, 22)).toBeNull();
    expect(arrowGeometry({ x: 0, y: 0 }, { x: 44, y: 0 }, 22)).toBeNull();
  });
});

describe('canvasSize', () => {
  it('un lienzo oculto (0×0) no cuenta como medido: encuadrar con eso deja el grafo diminuto', () => {
    expect(canvasSize({ width: 0, height: 0 })).toBeNull();
    expect(canvasSize({ width: 412, height: 0 })).toBeNull();
  });

  it('un lienzo visible devuelve su tamaño', () => {
    expect(canvasSize({ width: 412, height: 786 })).toEqual({ width: 412, height: 786 });
  });
});
