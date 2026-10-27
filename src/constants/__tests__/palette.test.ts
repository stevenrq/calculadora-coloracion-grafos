import { contrastText, GRAPH_COLORS, graphColor } from '../palette';

it('60 colores distintos', () => expect(new Set(Array.from({ length: 60 }, (_, i) => graphColor(i))).size).toBe(60));

it('los primeros salen de la paleta base', () => expect(graphColor(0)).toBe(GRAPH_COLORS[0]));

it('texto con contraste', () => {
  expect(contrastText('#FFFFFF')).toBe('#000000');
  expect(contrastText('#000000')).toBe('#FFFFFF');
});
