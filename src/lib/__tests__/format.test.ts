import { countsLabel, formatSavedDate, joinSpanish, plural, sentences } from '@/lib/format';

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

describe('joinSpanish', () => {
  it('une con comas e "y", y usa "e" ante sonido i', () => {
    expect(joinSpanish([])).toBe('');
    expect(joinSpanish(['A'])).toBe('A');
    expect(joinSpanish(['A', 'B'])).toBe('A y B');
    expect(joinSpanish(['C', 'D', 'E'])).toBe('C, D y E');
    expect(joinSpanish(['E', 'F', 'I'])).toBe('E, F e I');
    expect(joinSpanish(['Pan', 'hielo'])).toBe('Pan y hielo');
  });
});

describe('formatSavedDate', () => {
  const now = new Date(2026, 9, 27, 18, 0);

  it('el mismo día dice "Hoy" con la hora', () => {
    expect(formatSavedDate(new Date(2026, 9, 27, 14, 5).toISOString(), now)).toBe('Hoy, 14:05');
  });

  it('el día anterior dice "Ayer"', () => {
    expect(formatSavedDate(new Date(2026, 9, 26, 9, 30).toISOString(), now)).toBe('Ayer, 09:30');
    // Primero de mes: el día anterior es del mes pasado.
    expect(formatSavedDate(new Date(2026, 9, 31, 23, 59).toISOString(), new Date(2026, 10, 1, 8, 0))).toBe('Ayer, 23:59');
  });

  it('otro día muestra la fecha con el mes abreviado', () => {
    expect(formatSavedDate(new Date(2026, 9, 25, 8, 0).toISOString(), now)).toBe('25 oct 2026');
    expect(formatSavedDate(new Date(2025, 8, 3, 8, 0).toISOString(), now)).toBe('3 sept 2025');
  });
});
