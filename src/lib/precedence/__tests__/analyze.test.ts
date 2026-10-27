import type { Graph } from '@/lib/graph/types';
import { analyzePrecedence } from '../analyze';
import { graphFromActivities } from '../model';
import { HOMEWORK } from '../__fixtures__/activities';

describe('analyzePrecedence', () => {
  it('con un ciclo no calcula etapas', () => {
    const g: Graph = { directed: true, vertices: ['A', 'B', 'C'], edges: [['A', 'B'], ['B', 'C'], ['C', 'A']] };
    const result = analyzePrecedence(g);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues).toEqual([{ kind: 'cycle', cycle: ['A', 'B', 'C'] }]);
  });

  it('la tarea: 8 etapas y 14 semanas', () => {
    const { graph, info } = graphFromActivities(HOMEWORK);
    const result = analyzePrecedence(graph, info);
    if (!result.valid) throw new Error('debería ser válida');
    expect(result.stages.stages).toHaveLength(8);
    expect(result.schedule?.total).toBe(14);
    expect(result.missing).toEqual([]);
  });

  it('sin duraciones calcula etapas pero no la ruta crítica', () => {
    const { graph } = graphFromActivities(HOMEWORK);
    const result = analyzePrecedence(graph);
    if (!result.valid) throw new Error('debería ser válida');
    expect(result.stages.stages).toHaveLength(8);
    expect(result.schedule).toBeNull();
    expect(result.missing).toHaveLength(13);
  });
});
