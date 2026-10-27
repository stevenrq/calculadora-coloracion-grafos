import { computeStages } from '../stages';
import { criticalPath, missingDurations } from '../critical-path';
import type { Activity } from '../types';
import { act, HOMEWORK } from '../__fixtures__/activities';

const schedule = (acts: Activity[]) => criticalPath(acts, computeStages(acts).order);

describe('criticalPath: la tarea del Apéndice A', () => {
  const result = schedule(HOMEWORK)!;

  it('dura 14 semanas y tiene una sola ruta crítica', () => {
    expect(result.total).toBe(14);
    expect(result.paths).toEqual([['A', 'B', 'C', 'E', 'G', 'J', 'K', 'M']]);
    expect(result.pathsTruncated).toBe(false);
    expect(result.critical).toEqual(['A', 'B', 'C', 'E', 'G', 'J', 'K', 'M']);
  });

  it('reproduce la tabla IT/FT/IL/FL/holgura', () => {
    const expected: Record<string, [number, number, number, number, number]> = {
      A: [0, 2, 0, 2, 0],
      B: [2, 3, 2, 3, 0],
      C: [3, 5, 3, 5, 0],
      D: [3, 5, 4, 6, 1],
      E: [5, 6, 5, 6, 0],
      F: [5, 6, 10, 11, 5],
      G: [6, 9, 6, 9, 0],
      H: [6, 8, 7, 9, 1],
      I: [5, 8, 6, 9, 1],
      J: [9, 11, 9, 11, 0],
      K: [11, 13, 11, 13, 0],
      L: [11, 12, 12, 13, 1],
      M: [13, 14, 13, 14, 0],
    };
    for (const [code, [es, ef, ls, lf, slack]] of Object.entries(expected)) {
      expect([code, result.rows[code]]).toEqual([code, { es, ef, ls, lf, slack }]);
    }
  });

  it('las flechas críticas unen actividades críticas sin espera', () => {
    expect(result.criticalEdges).toContainEqual(['A', 'B']);
    expect(result.criticalEdges).toContainEqual(['K', 'M']);
    expect(result.criticalEdges).not.toContainEqual(['F', 'K']);
  });
});

describe('criticalPath: casos especiales', () => {
  it('con empate se devuelven todas las rutas críticas', () => {
    const result = schedule([act('A', [], 1), act('B', ['A'], 2), act('C', ['A'], 2), act('D', ['B', 'C'], 1)])!;
    expect(result.paths).toEqual([
      ['A', 'B', 'D'],
      ['A', 'C', 'D'],
    ]);
    expect(result.critical).toEqual(['A', 'B', 'C', 'D']);
  });

  it('las duraciones decimales no dejan restos de coma flotante', () => {
    const result = schedule([act('A', [], 0.1), act('B', ['A'], 0.2)])!;
    expect(result.total).toBe(0.3);
    expect(result.rows.A.slack).toBe(0);
    expect(result.rows.B.slack).toBe(0);
  });

  it('si falta alguna duración no hay ruta crítica', () => {
    const acts = [act('A', [], 1), act('B', ['A'], 1), act('C', ['A'], null)];
    expect(schedule(acts)).toBeNull();
    expect(missingDurations(acts)).toEqual(['C']);
  });
});
