import { COLORING_EXAMPLES, exampleGraph } from '@/lib/examples/coloring-examples';
import { estimateLabelWidth, fitLabel, LABEL_FONT, LABEL_MAX_WIDTH } from '@/lib/label';

describe('estimateLabelWidth', () => {
  it('las letras angostas ocupan menos que las anchas', () => {
    expect(estimateLabelWidth('iiii', 10)).toBeLessThan(estimateLabelWidth('mmmm', 10));
  });

  it('todas las cifras miden lo mismo (Roboto usa cifras tabulares)', () => {
    expect(estimateLabelWidth('1111', 10)).toBe(estimateLabelWidth('8888', 10));
  });

  it('crece en proporción al tamaño de fuente', () => {
    expect(estimateLabelWidth('Química', 20)).toBeCloseTo(2 * estimateLabelWidth('Química', 10));
  });
});

describe('fitLabel', () => {
  it('una etiqueta corta conserva la fuente máxima', () => {
    expect(fitLabel('A')).toEqual({ text: 'A', fontSize: LABEL_FONT.max });
  });

  it('los nombres de materias de 6 o 7 letras caben completos', () => {
    for (const label of ['Física', 'Inglés', 'Álgebra', 'Química', 'Cálculo']) {
      expect(fitLabel(label).text).toBe(label);
    }
  });

  it('si ni con la fuente mínima cabe, se recorta con puntos suspensivos', () => {
    const { text, fontSize } = fitLabel('Programación');
    expect(fontSize).toBe(LABEL_FONT.min);
    expect(text.endsWith('…')).toBe(true);
    expect('Programación'.startsWith(text.slice(0, -1))).toBe(true);
    expect(text.length).toBeGreaterThan(2);
  });

  it('la fuente nunca crece al alargar la etiqueta', () => {
    const sizes = ['AB', 'ABCD', 'ABCDEF', 'ABCDEFGH'].map((label) => fitLabel(label).fontSize);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });

  it('ninguna etiqueta se sale del círculo', () => {
    const labels = [
      ...COLORING_EXAMPLES.flatMap((example) => exampleGraph(example).vertices),
      'WWWWWWWWWWWW',
      'iiiiiiiiiiii',
      'Estadística',
      'Programación',
      'ÁÉÍÓÚÑáéíóúñ',
      '123456789012',
    ];
    for (const label of labels) {
      const { text, fontSize } = fitLabel(label);
      expect(fontSize).toBeGreaterThanOrEqual(LABEL_FONT.min);
      expect(fontSize).toBeLessThanOrEqual(LABEL_FONT.max);
      expect(estimateLabelWidth(text, fontSize)).toBeLessThanOrEqual(LABEL_MAX_WIDTH);
    }
  });
});
