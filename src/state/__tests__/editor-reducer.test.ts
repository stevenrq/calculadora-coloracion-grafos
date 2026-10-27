import { addVertex, emptyGraph } from '@/lib/graph/graph';
import type { Point } from '@/lib/graph/types';
import { type EditorAction, editorReducer, type EditorState, HISTORY_LIMIT, initialEditorState } from '../editor-reducer';

const run = (s: EditorState, ...as: EditorAction[]) => as.reduce(editorReducer, s);
const P = (x: number, y = 0) => ({ x, y });
const abc = () =>
  run(
    initialEditorState(),
    { type: 'tapEmpty', point: P(0) },
    { type: 'tapEmpty', point: P(100) },
    { type: 'tapEmpty', point: P(200) },
  );

it('tocar vacío crea A, B, C en su posición', () => {
  const s = abc();
  expect(s.doc.graph.vertices).toEqual(['A', 'B', 'C']);
  expect(s.doc.positions.B).toEqual(P(100));
  expect(s.past).toHaveLength(3);
});

it('encadenar: A, B, C crea A-B y B-C y deja C seleccionado', () => {
  const s = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'tapVertex', id: 'B' }, { type: 'tapVertex', id: 'C' });
  expect(s.doc.graph.edges).toEqual([
    ['A', 'B'],
    ['B', 'C'],
  ]);
  expect(s.selection).toEqual({ kind: 'vertex', id: 'C' });
});

it('tocar el vértice seleccionado lo deselecciona; tocar vacío con selección solo deselecciona', () => {
  expect(run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'tapVertex', id: 'A' }).selection).toEqual({ kind: 'none' });
  const s = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'tapEmpty', point: P(300) });
  expect(s.doc.graph.vertices).toHaveLength(3);
  expect(s.selection).toEqual({ kind: 'none' });
});

it('límite de 60 vértices produce aviso de error', () => {
  let g = emptyGraph();
  const positions: Record<string, Point> = {};
  for (let i = 0; i < 60; i++) {
    const r = addVertex(g, `v${i}`);
    if (r.ok) g = r.graph;
    positions[`v${i}`] = P(i);
  }
  const s = run(initialEditorState({ graph: g, positions }), { type: 'tapEmpty', point: P(999) });
  expect(s.doc.graph.vertices).toHaveLength(60);
  expect(s.notice).toEqual({ kind: 'error', message: 'Llegaste al máximo de 60 vértices.' });
});

it('borrar vértice quita aristas y posición; deshacer lo restaura', () => {
  const linked = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'tapVertex', id: 'B' }, { type: 'tapEmpty', point: P(0) });
  const del = run(linked, { type: 'tapVertex', id: 'A' }, { type: 'deleteSelection' });
  expect(del.doc.graph.edges).toEqual([]);
  expect(del.doc.positions.A).toBeUndefined();
  expect(del.notice).toEqual({ kind: 'info', message: 'Se borró el vértice A.', undoable: true });
  expect(run(del, { type: 'undo' }).doc).toEqual(linked.doc);
});

it('un arrastre completo se deshace en un solo paso', () => {
  const s = run(
    abc(),
    { type: 'dragStart' },
    { type: 'dragMove', id: 'A', point: P(5, 5) },
    { type: 'dragMove', id: 'A', point: P(9, 9) },
  );
  expect(s.doc.positions.A).toEqual(P(9, 9));
  expect(run(s, { type: 'undo' }).doc.positions.A).toEqual(P(0));
});

it('rehacer y una nueva edición borra el futuro', () => {
  const u = run(abc(), { type: 'undo' });
  expect(run(u, { type: 'redo' }).doc.graph.vertices).toEqual(['A', 'B', 'C']);
  expect(run(u, { type: 'tapEmpty', point: P(7) }).future).toEqual([]);
});

it('renombrar: éxito actualiza posiciones; duplicado da aviso', () => {
  const ok = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'renameSelected', to: 'Inicio' });
  expect(ok.doc.graph.vertices[0]).toBe('Inicio');
  expect(ok.doc.positions.Inicio).toEqual(P(0));
  const dup = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'renameSelected', to: 'B' });
  expect(dup.notice).toEqual({ kind: 'error', message: 'Ya existe un vértice con ese nombre.' });
});

it('replaceDoc se puede deshacer y pide encuadre', () => {
  const s0 = abc();
  const s = run(s0, { type: 'replaceDoc', doc: { graph: emptyGraph(), positions: {} }, message: 'Se cargó «K₃».' });
  expect(s.fitRequest).toBe(s0.fitRequest + 1);
  expect(s.notice).toEqual({ kind: 'info', message: 'Se cargó «K₃».', undoable: true });
  expect(run(s, { type: 'undo' }).doc).toEqual(s0.doc);
});

it('el historial se limita a 100', () => {
  let s = initialEditorState();
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) s = run(s, { type: 'tapEmpty', point: P(i) }, { type: 'dragStart' });
  expect(s.past.length).toBe(HISTORY_LIMIT);
});

it('en modo dirigido B luego A crea B→A', () => {
  const s = run(
    initialEditorState(null, true),
    { type: 'tapEmpty', point: P(0) },
    { type: 'tapEmpty', point: P(1) },
    { type: 'tapVertex', id: 'B' },
    { type: 'tapVertex', id: 'A' },
  );
  expect(s.doc.graph.edges).toEqual([['B', 'A']]);
});

it('en coloración, renombrar y borrar no crean datos de actividades', () => {
  const renamed = run(abc(), { type: 'tapVertex', id: 'A' }, { type: 'renameSelected', to: 'X' });
  expect('activities' in renamed.doc).toBe(false);
  const deleted = run(renamed, { type: 'tapVertex', id: 'X' }, { type: 'deleteSelection' });
  expect('activities' in deleted.doc).toBe(false);
});

describe('toggleEdge (vista Matriz)', () => {
  it('agrega la arista que falta y la quita en cualquier sentido, un paso de deshacer cada vez', () => {
    const added = run(abc(), { type: 'toggleEdge', a: 'A', b: 'B' });
    expect(added.doc.graph.edges).toEqual([['A', 'B']]);
    expect(added.past).toHaveLength(4);
    expect(added.notice).toBeNull();

    const removed = run(added, { type: 'toggleEdge', a: 'B', b: 'A' });
    expect(removed.doc.graph.edges).toEqual([]);
    expect(removed.past).toHaveLength(5);
    expect(removed.notice).toEqual({ kind: 'info', message: 'Se quitó la arista A–B.', undoable: true });

    expect(run(removed, { type: 'undo' }).doc.graph.edges).toEqual([['A', 'B']]);
  });

  it('la diagonal no crea lazos y avisa', () => {
    const s = abc();
    const next = run(s, { type: 'toggleEdge', a: 'A', b: 'A' });
    expect(next.doc).toBe(s.doc);
    expect(next.notice?.message).toBe('No se permiten lazos (una arista de un vértice a sí mismo).');
  });

  it('respeta el máximo de 600 aristas', () => {
    let g = emptyGraph();
    const labels = Array.from({ length: 36 }, (_, i) => `v${i}`);
    for (const label of labels) {
      const r = addVertex(g, label);
      if (r.ok) g = r.graph;
    }
    const edges = labels.flatMap((a, i) => labels.slice(i + 1).map((b) => [a, b] as const)).slice(0, 600);
    const full = initialEditorState({ graph: { ...g, edges }, positions: {} });
    const next = run(full, { type: 'toggleEdge', a: 'v34', b: 'v35' });
    expect(next.doc.graph.edges).toHaveLength(600);
    expect(next.notice?.message).toBe('Llegaste al máximo de 600 aristas.');
  });
});

describe('notify', () => {
  it('muestra un aviso sin tocar el doc ni el historial', () => {
    const s = run(initialEditorState(), { type: 'tapEmpty', point: P(0) });
    const notified = editorReducer(s, { type: 'notify', message: 'Se guardó «X» en Mis grafos.' });
    expect(notified.notice).toEqual({ kind: 'info', message: 'Se guardó «X» en Mis grafos.' });
    expect(notified.doc).toBe(s.doc);
    expect(notified.past).toBe(s.past);
    expect(notified.future).toBe(s.future);
  });
});

describe('created: sube solo cuando el usuario crea un vértice o una arista (vibración)', () => {
  it('tocar vacío sin selección crea un vértice; con selección solo deselecciona', () => {
    const s0 = initialEditorState();
    expect(s0.created).toBe(0);
    const s1 = run(s0, { type: 'tapEmpty', point: P(0) });
    expect(s1.created).toBe(1);
    const s2 = run(s1, { type: 'tapVertex', id: 'A' }, { type: 'tapEmpty', point: P(50) });
    expect(s2.created).toBe(1);
  });

  it('unir dos vértices crea la arista; repetida o el mismo vértice no', () => {
    const s0 = abc();
    const joined = run(s0, { type: 'tapVertex', id: 'A' }, { type: 'tapVertex', id: 'B' });
    expect(joined.created).toBe(s0.created + 1);
    const repeated = run(joined, { type: 'tapVertex', id: 'A' });
    expect(repeated.created).toBe(joined.created);
    const same = run(s0, { type: 'tapVertex', id: 'A' }, { type: 'tapVertex', id: 'A' });
    expect(same.created).toBe(s0.created);
  });

  it('una celda de la matriz que agrega sube; la que quita no', () => {
    const s0 = abc();
    const added = run(s0, { type: 'toggleEdge', a: 'A', b: 'C' });
    expect(added.created).toBe(s0.created + 1);
    const removed = run(added, { type: 'toggleEdge', a: 'A', b: 'C' });
    expect(removed.created).toBe(added.created);
  });

  it('deshacer, rehacer, reemplazar el documento y mover no cuentan', () => {
    const s0 = abc();
    const s = run(
      s0,
      { type: 'undo' },
      { type: 'redo' },
      { type: 'dragStart' },
      { type: 'dragMove', id: 'A', point: P(5) },
      { type: 'replaceDoc', doc: initialEditorState().doc, message: 'Se cargó «C₄».' },
    );
    expect(s.created).toBe(s0.created);
  });
});
