import { VERTEX_RADIUS } from '@/lib/geometry';

/** Tamaños de fuente (en unidades del mundo) para la etiqueta dentro del vértice. */
export const LABEL_FONT = { max: 15, min: 8 } as const;

/** Ancho disponible dentro del círculo: el diámetro menos un margen para el borde. */
export const LABEL_MAX_WIDTH = 2 * VERTEX_RADIUS - 8;

const ELLIPSIS = '…';
const NARROW = new Set('iíìïjlI|.,:;!¡\'');
const SEMI_NARROW = new Set('frtJ');
const WIDE = new Set('mwMW');

/** Ancho aproximado de un carácter, en em, para Roboto en seminegrita (la fuente del lienzo en Android). */
function charWidthEm(ch: string): number {
  if (ch === ELLIPSIS) return 0.85;
  if (NARROW.has(ch)) return 0.28;
  if (SEMI_NARROW.has(ch)) return 0.38;
  if (WIDE.has(ch)) return 0.92;
  if (ch >= '0' && ch <= '9') return 0.6;
  if (ch !== ch.toLowerCase()) return 0.7;
  return 0.58;
}

/** Estimación del ancho del texto: sin medirlo en pantalla, que en SVG no se puede hacer de forma síncrona. */
export function estimateLabelWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) em += charWidthEm(ch);
  return em * fontSize;
}

/**
 * Etiqueta que cabe dentro del vértice: la fuente más grande con la que entra completa y, si ni con la mínima
 * cabe, el prefijo más largo seguido de «…». El nombre completo sigue visible en las vistas Texto y de resultados.
 */
export function fitLabel(label: string): { text: string; fontSize: number } {
  for (let fontSize = LABEL_FONT.max; fontSize >= LABEL_FONT.min; fontSize--) {
    if (estimateLabelWidth(label, fontSize) <= LABEL_MAX_WIDTH) return { text: label, fontSize };
  }
  const chars = Array.from(label);
  let length = chars.length - 1;
  while (length > 1 && estimateLabelWidth(chars.slice(0, length).join('') + ELLIPSIS, LABEL_FONT.min) > LABEL_MAX_WIDTH) {
    length--;
  }
  return { text: chars.slice(0, length).join('') + ELLIPSIS, fontSize: LABEL_FONT.min };
}
