import { findPrecedenceExample } from '@/lib/examples/precedence-examples';
import { analyzePrecedence } from '@/lib/precedence/analyze';
import { graphFromActivities } from '@/lib/precedence/model';
import { type EditorState, initialEditorState } from '../editor-reducer';
import { emptyPrecedenceDoc, type PrecedenceAction, precedenceReducer, stageLayout } from '../precedence-reducer';

const run = (s: EditorState, ...actions: PrecedenceAction[]) => actions.reduce(precedenceReducer, s);
const save = (
  code: string,
  predecessors: string[] = [],
  extra: Partial<Extract<PrecedenceAction, { type: 'saveActivity' }>> = {},
): PrecedenceAction => ({ type: 'saveActivity', original: null, code, name: `Actividad ${code}`, duration: 1, predecessors, ...extra });
const fresh = () => initialEditorState(emptyPrecedenceDoc());

function homework(): EditorState {
  const { graph, info } = graphFromActivities(findPrecedenceExample('homework').activities);
  return initialEditorState({ graph, positions: stageLayout(graph, {}), activities: info, unit: 'semanas' });
}

describe('saveActivity', () => {
  it('crea una actividad con su nombre (sin espacios sobrantes) y su duración', () => {
    const s = run(fresh(), save('A', [], { name: '  Requisitos ', duration: 2 }));
    expect(s.doc.graph.vertices).toEqual(['A']);
    expect(s.doc.activities?.A).toEqual({ name: 'Requisitos', duration: 2 });
    expect(Object.keys(s.doc.positions)).toEqual(['A']);
    expect(s.past).toHaveLength(1);
  });

  it('las predecesoras elegidas son exactamente las flechas que entran', () => {
    const s = run(fresh(), save('A'), save('B'), save('B', ['A'], { original: 'B' }));
    expect(s.doc.graph.edges).toEqual([['A', 'B']]);
    expect(run(s, save('B', [], { original: 'B' })).doc.graph.edges).toEqual([]);
  });

  it('renombrar conserva nombre, duración y las flechas; deshacer lo revierte en un paso', () => {
    const before = run(fresh(), save('A'), save('B', ['A'], { duration: 4 }), save('C', ['B']));
    const s = run(before, save('X', ['A'], { original: 'B', name: 'Actividad B', duration: 4 }));
    expect(s.doc.graph.edges).toEqual(
      expect.arrayContaining([
        ['A', 'X'],
        ['X', 'C'],
      ]),
    );
    expect(s.doc.graph.edges).toHaveLength(2);
    expect(s.doc.activities?.X).toEqual({ name: 'Actividad B', duration: 4 });
    expect(s.doc.activities?.B).toBeUndefined();
    expect(run(s, { type: 'undo' }).doc).toBe(before.doc);
  });

  it('un código repetido no cambia nada y avisa', () => {
    const s = run(fresh(), save('A'), save('A'));
    expect(s.doc.graph.vertices).toEqual(['A']);
    expect(s.notice?.kind).toBe('error');
  });

  it('cerrar un ciclo se guarda igual (la validación lo muestra) y todas las actividades tienen posición', () => {
    const s = run(fresh(), save('A'), save('B', ['A']), save('A', ['B'], { original: 'A' }));
    expect(s.doc.graph.edges).toHaveLength(2);
    expect(Object.keys(s.doc.positions).sort()).toEqual(['A', 'B']);
  });
});

describe('borrar actividades', () => {
  it('removeActivity la quita de las predecesoras de las demás, con aviso y deshacer', () => {
    const before = homework();
    const s = run(before, { type: 'removeActivity', code: 'D' });
    expect(s.doc.graph.vertices).not.toContain('D');
    expect(s.doc.graph.edges).not.toContainEqual(['D', 'I']);
    expect(s.doc.activities?.D).toBeUndefined();
    expect(s.notice).toEqual({
      kind: 'info',
      message: 'Se borró la actividad D y se quitó de las predecesoras de I.',
      undoable: true,
    });
    const undone = run(s, { type: 'undo' });
    expect(undone.doc.graph.edges).toContainEqual(['D', 'I']);
    expect(undone.doc.activities?.D).toEqual(before.doc.activities?.D);
  });

  it('sin sucesoras el aviso es corto', () => {
    expect(run(homework(), { type: 'removeActivity', code: 'M' }).notice?.message).toBe('Se borró la actividad M.');
  });

  it('borrar el vértice seleccionado en el dibujo da el mismo aviso y no mueve a las demás', () => {
    const before = homework();
    const s = run(before, { type: 'tapVertex', id: 'D' }, { type: 'deleteSelection' });
    expect(s.notice?.message).toBe('Se borró la actividad D y se quitó de las predecesoras de I.');
    expect(s.doc.positions.A).toEqual(before.doc.positions.A);
  });

  it('borrar una flecha seleccionada explica qué predecesora se quitó', () => {
    const s = run(homework(), { type: 'tapEdge', edge: ['A', 'B'] }, { type: 'deleteSelection' });
    expect(s.doc.graph.edges).not.toContainEqual(['A', 'B']);
    expect(s.notice?.message).toBe('Se quitó A de las predecesoras de B.');
  });
});

describe('dibujo, limpiar y unidad', () => {
  it('tocar B y luego A con A → B crea B → A sin mover vértices ni lanzar', () => {
    const before = homework();
    const s = run(before, { type: 'tapVertex', id: 'B' }, { type: 'tapVertex', id: 'A' });
    expect(s.doc.graph.edges).toContainEqual(['B', 'A']);
    expect(s.doc.positions.A).toEqual(before.doc.positions.A);
    expect(s.doc.positions.B).toEqual(before.doc.positions.B);
  });

  it('limpiar conserva la unidad', () => {
    const s = run(fresh(), { type: 'setUnit', unit: 'días' }, save('A'), { type: 'clear' });
    expect(s.doc.graph.vertices).toEqual([]);
    expect(s.doc.unit).toBe('días');
    expect(s.notice?.undoable).toBe(true);
  });

  it('setUnit solo hace commit si cambia', () => {
    const s = run(fresh(), { type: 'setUnit', unit: 'semanas' });
    expect(s.past).toHaveLength(0);
    expect(run(s, { type: 'setUnit', unit: 'horas' }).doc.unit).toBe('horas');
  });
});

describe('stageLayout', () => {
  it('con un ciclo conserva las posiciones conocidas y ubica las nuevas', () => {
    const graph = { directed: true, vertices: ['A', 'B', 'C'], edges: [['A', 'B'], ['B', 'A']] as const };
    const pos = stageLayout({ ...graph, edges: [...graph.edges] }, { A: { x: 1, y: 2 } });
    expect(pos.A).toEqual({ x: 1, y: 2 });
    expect(Object.keys(pos).sort()).toEqual(['A', 'B', 'C']);
  });
});

describe('toggleEdge en precedencias (vista Matriz)', () => {
  it('B → A con A → B ya puesta cierra un ciclo, conserva las actividades y la validación lo marca', () => {
    const s = run(fresh(), save('A'), save('B', ['A']));
    const next = run(s, { type: 'toggleEdge', a: 'B', b: 'A' });
    expect(next.doc.graph.edges).toEqual([
      ['A', 'B'],
      ['B', 'A'],
    ]);
    expect(next.doc.activities).toEqual(s.doc.activities);
    expect(analyzePrecedence(next.doc.graph, next.doc.activities).valid).toBe(false);
  });

  it('quitar una flecha lo dice en términos de predecesoras', () => {
    const s = run(fresh(), save('A'), save('B', ['A']));
    const next = run(s, { type: 'toggleEdge', a: 'A', b: 'B' });
    expect(next.doc.graph.edges).toEqual([]);
    expect(next.notice?.message).toBe('Se quitó A de las predecesoras de B.');
  });
});
