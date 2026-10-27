import { COLORING_EXAMPLES } from '../coloring-examples';
import { coloringExampleDoc, precedenceExampleDoc } from '../example-docs';
import { findPrecedenceExample } from '../precedence-examples';

describe('documentos de los ejemplos', () => {
  it.each(COLORING_EXAMPLES.map((ex) => [ex.id, ex] as const))('%s: una posición por vértice', (_, ex) => {
    const doc = coloringExampleDoc(ex);
    expect(Object.keys(doc.positions).sort()).toEqual([...doc.graph.vertices].sort());
    expect(doc.activities).toBeUndefined();
  });

  it('la tarea de precedencias: dirigida, 13 actividades y en semanas', () => {
    const doc = precedenceExampleDoc(findPrecedenceExample('homework'));
    expect(doc.graph.directed).toBe(true);
    expect(Object.keys(doc.activities ?? {})).toHaveLength(13);
    expect(doc.unit).toBe('semanas');
    expect(Object.keys(doc.positions)).toHaveLength(13);
  });
});
