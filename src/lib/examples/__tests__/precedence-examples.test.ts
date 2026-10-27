import { findPrecedenceExample, PRECEDENCE_EXAMPLES } from '../precedence-examples';
import { analyzePrecedence } from '@/lib/precedence/analyze';
import { graphFromActivities } from '@/lib/precedence/model';

const analyze = (id: string) => {
  const { graph, info } = graphFromActivities(findPrecedenceExample(id).activities);
  const result = analyzePrecedence(graph, info);
  if (!result.valid) throw new Error(`El ejemplo ${id} tiene errores`);
  return result;
};

describe('ejemplos de precedencias', () => {
  it('hay dos: la tarea y uno pequeño', () => {
    expect(PRECEDENCE_EXAMPLES.map((e) => e.id)).toEqual(['homework', 'presentation']);
  });

  it('la tarea: 8 etapas, 14 semanas y la ruta del Apéndice A', () => {
    const example = findPrecedenceExample('homework');
    expect(example.unit).toBe('semanas');
    expect(example.activities).toHaveLength(13);
    expect(example.activities.every((a) => a.name.length > 0)).toBe(true);
    expect(example.activities[0].name).toBe('Levantamiento de requisitos (entrevistas con constructores y clientes)');
    const result = analyze('homework');
    expect(result.stages.stages).toHaveLength(8);
    expect(result.schedule?.total).toBe(14);
    expect(result.schedule?.paths).toEqual([['A', 'B', 'C', 'E', 'G', 'J', 'K', 'M']]);
  });

  it('preparar una exposición: 4 etapas, 7 días y holguras de 2 y 1', () => {
    expect(findPrecedenceExample('presentation').unit).toBe('días');
    const result = analyze('presentation');
    expect(result.stages.stages).toEqual([['A'], ['B', 'C'], ['D', 'E'], ['F']]);
    expect(result.schedule?.total).toBe(7);
    expect(result.schedule?.paths).toEqual([['A', 'B', 'D', 'F']]);
    expect(result.schedule?.rows.C.slack).toBe(2);
    expect(result.schedule?.rows.E.slack).toBe(1);
  });

  it('un id desconocido lanza', () => {
    expect(() => findPrecedenceExample('nada')).toThrow();
  });
});
