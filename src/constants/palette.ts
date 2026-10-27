/**
 * Colores de vértice: Okabe-Ito (apta para daltonismo, sin el negro) + extras distinguibles de Paul Tol.
 * El orden pone primero los más fáciles de distinguir entre sí.
 */
export const GRAPH_COLORS: readonly string[] = [
  '#D55E00', // bermellón
  '#0072B2', // azul
  '#009E73', // verde azulado
  '#E69F00', // naranja
  '#CC79A7', // púrpura rojizo
  '#56B4E9', // celeste
  '#F0E442', // amarillo
  '#882255', // vino
  '#44AA99', // turquesa
  '#999933', // oliva
  '#332288', // índigo
  '#EE8866', // salmón
];

const GOLDEN_ANGLE = 137.508;

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

/** Color del índice dado (desde 0). Más allá de la paleta base, tonos repartidos por el ángulo áureo. */
export function graphColor(index: number): string {
  if (index < GRAPH_COLORS.length) return GRAPH_COLORS[index];
  const hue = (index * GOLDEN_ANGLE) % 360;
  return hslToHex(hue, 0.65, index % 2 === 0 ? 0.45 : 0.6);
}

/** Negro o blanco, el que se lea mejor sobre `hex` (luminancia relativa WCAG). */
export function contrastText(hex: string): '#000000' | '#FFFFFF' {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

/** Coloración (índices) → color de relleno de cada vértice. */
export function coloringColors(coloring: Readonly<Record<string, number>>): Record<string, string> {
  return Object.fromEntries(Object.entries(coloring).map(([v, c]) => [v, graphColor(c)]));
}

/** Número de color que se muestra en cada vértice (desde 1, como "Color 1" en la hoja de resultados). */
export function coloringNumbers(coloring: Readonly<Record<string, number>>): Record<string, number> {
  return Object.fromEntries(Object.entries(coloring).map(([v, c]) => [v, c + 1]));
}
