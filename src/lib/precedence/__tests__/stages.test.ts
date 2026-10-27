import { computeStages, longestPath } from '../stages';
import { act, HOMEWORK } from '../__fixtures__/activities';

describe('computeStages: la tarea del Apéndice A', () => {
  const result = computeStages(HOMEWORK);

  it('da las 8 etapas esperadas', () => {
    expect(result.stages).toEqual([['A'], ['B'], ['C', 'D'], ['E', 'F', 'I'], ['G', 'H'], ['J'], ['K', 'L'], ['M']]);
    expect(result.stageOf.J).toBe(6);
  });

  it('orden topológico, iniciales y finales', () => {
    expect(result.order).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'I', 'G', 'H', 'J', 'K', 'L', 'M']);
    expect(result.initial).toEqual(['A']);
    expect(result.final).toEqual(['M']);
  });

  it('explica el algoritmo de Kahn paso a paso', () => {
    const { steps } = result;
    expect(steps).toHaveLength(9);
    expect(steps[0]).toEqual({ stage: 1, vertices: ['A'], message: 'Etapa 1: A no tiene predecesoras.' });
    expect(steps[1].message).toBe('Se retira A; ahora B queda sin predecesoras → etapa 2.');
    expect(steps[3].message).toBe('Se retiran C y D; ahora E, F e I quedan sin predecesoras → etapa 4.');
    expect(steps[8]).toEqual({ stage: null, vertices: [], message: 'Se retira M; no quedan actividades. Total: 8 etapas.' });
  });

  it('el camino más largo tiene una actividad por etapa', () => {
    expect(longestPath(HOMEWORK, result.stageOf)).toEqual(['A', 'B', 'C', 'E', 'G', 'J', 'K', 'M']);
  });
});

describe('computeStages: casos pequeños', () => {
  it('dos actividades sueltas forman una sola etapa', () => {
    const { stages, steps } = computeStages([act('A'), act('B')]);
    expect(stages).toEqual([['A', 'B']]);
    expect(steps[0].message).toBe('Etapa 1: A y B no tienen predecesoras.');
    expect(steps[steps.length - 1].message).toBe('Se retiran A y B; no quedan actividades. Total: 1 etapa.');
  });

  it('sin actividades no hay etapas ni pasos', () => {
    expect(computeStages([])).toEqual({ stages: [], stageOf: {}, order: [], initial: [], final: [], steps: [] });
  });
});
