import { coloringColors, contrastText, GRAPH_COLORS, graphColor } from '../palette';

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
