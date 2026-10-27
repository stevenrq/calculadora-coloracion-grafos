import {
  formatDuration,
  formatNumber,
  issueHighlight,
  parseDuration,
  pathLabel,
  stageColoringAtStep,
} from '../present';
import { computeStages } from '../stages';
import { HOMEWORK } from '../__fixtures__/activities';

describe('reproductor de etapas', () => {
  const { steps } = computeStages(HOMEWORK);

  it('pinta las etapas identificadas hasta el paso', () => {
    expect(stageColoringAtStep(steps, -1)).toEqual({});
    expect(stageColoringAtStep(steps, 0)).toEqual({ A: 0 });
    expect(stageColoringAtStep(steps, 3)).toMatchObject({ A: 0, B: 1, C: 2, D: 2, E: 3, F: 3, I: 3 });
    expect(Object.keys(stageColoringAtStep(steps, steps.length - 1))).toHaveLength(13);
  });
});

describe('issueHighlight', () => {
  it('resalta el ciclo en rojo, cerrándolo', () => {
    expect(issueHighlight([{ kind: 'cycle', cycle: ['A', 'B', 'C'] }])).toEqual({
      vertices: ['A', 'B', 'C'],
      edges: [
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'A'],
      ],
      tone: 'warning',
    });
  });

  it('sin ciclo no resalta nada', () => {
    expect(issueHighlight([])).toBeUndefined();
  });
});

describe('formato', () => {
  it('duraciones con su unidad', () => {
    expect(formatDuration(14, 'semanas')).toBe('14 semanas');
    expect(formatDuration(1, 'meses')).toBe('1 mes');
    expect(formatDuration(2.5, 'días')).toBe('2,5 días');
    expect(formatNumber(0.30000000000000004)).toBe('0,3');
  });

  it('parseDuration acepta coma o punto y rechaza lo que no es una duración', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('   ')).toBeNull();
    expect(parseDuration(' 2,5 ')).toBe(2.5);
    expect(parseDuration('3.25')).toBe(3.25);
    expect(parseDuration('0')).toBe(0);
    expect(parseDuration('-1')).toBe('invalid');
    expect(parseDuration('abc')).toBe('invalid');
    expect(parseDuration('10000')).toBe('invalid');
  });

  it('pathLabel', () => {
    expect(pathLabel(['A', 'B'])).toBe('A → B');
  });
});
