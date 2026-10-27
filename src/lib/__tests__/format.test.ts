import { countsLabel, plural, sentences } from '@/lib/format';

describe('plural', () => {
  it('usa el singular solo para 1', () => {
    expect(plural(1, 'vértice', 'vértices')).toBe('1 vértice');
    expect(plural(0, 'vértice', 'vértices')).toBe('0 vértices');
    expect(plural(5, 'arista', 'aristas')).toBe('5 aristas');
  });
});

describe('countsLabel', () => {
  it('resume vértices y aristas', () => {
    expect(countsLabel(5, 5)).toBe('5 vértices · 5 aristas');
    expect(countsLabel(1, 0)).toBe('1 vértice · 0 aristas');
    expect(countsLabel(2, 1)).toBe('2 vértices · 1 arista');
  });
});

describe('sentences', () => {
  it('une frases con un solo punto, aunque alguna ya lo traiga', () => {
    expect(sentences('Ciclo C₄', 'Un cuadrado: basta con 2 colores.', '4 vértices · 4 aristas', 'Número cromático 2')).toBe(
      'Ciclo C₄. Un cuadrado: basta con 2 colores. 4 vértices · 4 aristas. Número cromático 2.',
    );
  });

  it('respeta los signos de cierre que ya terminan la frase', () => {
    expect(sentences('¿Es bipartito?', '¡Sí!', 'Listo')).toBe('¿Es bipartito? ¡Sí! Listo.');
  });
});
