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
