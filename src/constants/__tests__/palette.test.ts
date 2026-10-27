import { coloringColors, coloringNumbers, contrastText, GRAPH_COLORS, graphColor } from '../palette';

it('60 colores distintos', () => expect(new Set(Array.from({ length: 60 }, (_, i) => graphColor(i))).size).toBe(60));

it('los primeros salen de la paleta base', () => expect(graphColor(0)).toBe(GRAPH_COLORS[0]));

it('texto con contraste', () => {
  expect(contrastText('#FFFFFF')).toBe('#000000');
  expect(contrastText('#000000')).toBe('#FFFFFF');
});

describe('coloringColors', () => {
  it('convierte índices de color en colores de la paleta', () => {
    expect(coloringColors({ A: 0, B: 1, C: 0 })).toEqual({ A: GRAPH_COLORS[0], B: GRAPH_COLORS[1], C: GRAPH_COLORS[0] });
    expect(coloringColors({})).toEqual({});
  });
});

describe('coloringNumbers', () => {
  it('el color c se muestra como el número c + 1', () => {
    expect(coloringNumbers({ A: 0, B: 2 })).toEqual({ A: 1, B: 3 });
    expect(coloringNumbers({})).toEqual({});
  });
});
