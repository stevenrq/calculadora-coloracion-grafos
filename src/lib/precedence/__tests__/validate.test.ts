import type { Graph } from '@/lib/graph/types';
import { graphFromActivities, toActivities } from '../model';
import { findCycle, issueMessage, validateActivities } from '../validate';
import { act, HOMEWORK } from '../__fixtures__/activities';

describe('findCycle', () => {
  it('devuelve el ciclo en el sentido predecesora → actividad', () => {
    expect(findCycle([act('A', ['C']), act('B', ['A']), act('C', ['B'])])).toEqual(['A', 'B', 'C']);
  });

  it('empieza por la actividad del ciclo que aparece primero en la lista', () => {
    expect(findCycle([act('X'), act('C', ['B']), act('A', ['C']), act('B', ['A'])])).toEqual(['C', 'A', 'B']);
  });

  it('la tarea no tiene ciclos', () => {
    expect(findCycle(HOMEWORK)).toBeNull();
  });
});

describe('validateActivities', () => {
  it('detecta una autodependencia', () => {
    expect(validateActivities([act('A', ['A'])])).toEqual([{ kind: 'self-dependency', code: 'A' }]);
  });

  it('detecta una predecesora inexistente', () => {
    expect(validateActivities([act('A', ['Z'])])).toEqual([
      { kind: 'unknown-predecessor', code: 'A', predecessor: 'Z' },
    ]);
  });

  it('informa primero las autodependencias y después el ciclo', () => {
    expect(validateActivities([act('A', ['B']), act('B', ['A']), act('C', ['C'])])).toEqual([
      { kind: 'self-dependency', code: 'C' },
      { kind: 'cycle', cycle: ['A', 'B'] },
    ]);
  });

  it('la tarea es válida', () => {
    expect(validateActivities(HOMEWORK)).toEqual([]);
  });
});

describe('issueMessage', () => {
  it('ciclo', () => {
    expect(issueMessage({ kind: 'cycle', cycle: ['A', 'B', 'C'] })).toBe(
      'A → B → C → A: una actividad no puede depender de sí misma, directa o indirectamente.',
    );
  });

  it('autodependencia', () => {
    expect(issueMessage({ kind: 'self-dependency', code: 'A' })).toBe(
      'A → A: una actividad no puede ser su propia predecesora.',
    );
  });

  it('predecesora inexistente', () => {
    expect(issueMessage({ kind: 'unknown-predecessor', code: 'A', predecessor: 'Z' })).toBe(
      'A tiene como predecesora a Z, que no existe.',
    );
  });
});

describe('modelo: grafo ↔ actividades', () => {
  it('las predecesoras son los orígenes de las flechas que entran, en el orden de las flechas', () => {
    const g: Graph = { directed: true, vertices: ['A', 'B', 'C'], edges: [['B', 'C'], ['A', 'C']] };
    const acts = toActivities(g);
    expect(acts.map((a) => a.code)).toEqual(['A', 'B', 'C']);
    expect(acts[2]).toEqual({ code: 'C', name: '', predecessors: ['B', 'A'], duration: null });
  });

  it('ida y vuelta conserva códigos, predecesoras, nombres y duraciones', () => {
    const named = HOMEWORK.map((a) => ({ ...a, name: `Actividad ${a.code}` }));
    const { graph, info } = graphFromActivities(named);
    expect(graph.directed).toBe(true);
    expect(toActivities(graph, info)).toEqual(named);
  });

  it('omite predecesoras inexistentes y autodependencias al construir el grafo', () => {
    const { graph } = graphFromActivities([act('A', ['A', 'Z']), act('B', ['A'])]);
    expect(graph.edges).toEqual([['A', 'B']]);
  });
});
