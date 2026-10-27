import { joinSpanish } from '@/lib/format';
import { WORLD_BOX } from '@/lib/geometry';
import { addEdge, addVertex, emptyGraph, removeEdge, removeVertex, renameVertex } from '@/lib/graph/graph';
import type { Graph, Positions, VertexId } from '@/lib/graph/types';
import { layeredLayout } from '@/lib/layout/layered';
import { mergePositions } from '@/lib/layout/layouts';
import { analyzePrecedence } from '@/lib/precedence/analyze';
import { DEFAULT_UNIT, type DurationUnit } from '@/lib/precedence/types';
import {
  commit,
  type EditorAction,
  type EditorDoc,
  editorReducer,
  type EditorState,
  errorNotice,
  NO_SELECTION,
  renameKey,
  undoableNotice,
  withoutKey,
} from './editor-reducer';

export type PrecedenceAction =
  | EditorAction
  /** Guardar la fila de la tabla: crea (`original` null) o edita la actividad, en un solo paso de deshacer. */
  | {
      type: 'saveActivity';
      original: VertexId | null;
      code: VertexId;
      name: string;
      duration: number | null;
      predecessors: readonly VertexId[];
    }
  | { type: 'removeActivity'; code: VertexId }
  | { type: 'setUnit'; unit: DurationUnit };

export function emptyPrecedenceDoc(unit: DurationUnit = DEFAULT_UNIT): EditorDoc {
  return { graph: emptyGraph(true), positions: {}, activities: {}, unit };
}

/** Dibujo por etapas si las actividades son válidas; con errores, conserva lo que hay y ubica lo nuevo. */
export function stageLayout(graph: Graph, previous: Positions): Positions {
  const analysis = analyzePrecedence(graph);
  return analysis.valid
    ? layeredLayout(graph, analysis.stages.stageOf, WORLD_BOX)
    : mergePositions(previous, graph, WORLD_BOX);
}

function saveActivity(state: EditorState, action: Extract<PrecedenceAction, { type: 'saveActivity' }>): EditorState {
  const { doc } = state;
  const code = action.code.trim();
  let graph = doc.graph;
  let positions = doc.positions;
  let activities = { ...doc.activities };

  if (action.original === null) {
    const r = addVertex(graph, code);
    if (!r.ok) return { ...state, notice: errorNotice(r.error) };
    graph = r.graph;
  } else if (action.original !== code) {
    const r = renameVertex(graph, action.original, code);
    if (!r.ok) return { ...state, notice: errorNotice(r.error) };
    graph = r.graph;
    positions = renameKey(positions, action.original, code);
    activities = renameKey(activities, action.original, code);
  }

  // Las flechas que entran a la actividad quedan exactamente en las predecesoras elegidas.
  const wanted = action.predecessors.filter((p) => p !== code && graph.vertices.includes(p));
  const stale = graph.edges.filter(([p, a]) => a === code && !wanted.includes(p));
  for (const [p] of stale) graph = removeEdge(graph, p, code);
  for (const p of wanted) {
    const r = addEdge(graph, p, code);
    if (!r.ok) return { ...state, notice: errorNotice(r.error) };
    graph = r.graph;
  }
  activities[code] = { name: action.name.trim(), duration: action.duration };

  return commit(
    state,
    { ...doc, graph, activities, positions: stageLayout(graph, positions) },
    { selection: NO_SELECTION, fitRequest: state.fitRequest + 1 },
  );
}

/** Desde la tabla se reacomoda por etapas; desde el dibujo, el resto se queda donde el usuario lo puso. */
function removeActivity(state: EditorState, code: VertexId, relayout: boolean): EditorState {
  const { doc } = state;
  if (!doc.graph.vertices.includes(code)) return state;
  const successors = doc.graph.edges.filter(([p]) => p === code).map(([, a]) => a);
  const graph = removeVertex(doc.graph, code);
  const positions = withoutKey(doc.positions, code);
  const message =
    successors.length > 0
      ? `Se borró la actividad ${code} y se quitó de las predecesoras de ${joinSpanish(successors)}.`
      : `Se borró la actividad ${code}.`;
  return commit(
    state,
    {
      ...doc,
      graph,
      activities: withoutKey(doc.activities ?? {}, code),
      positions: relayout ? stageLayout(graph, positions) : positions,
    },
    {
      selection: NO_SELECTION,
      notice: undoableNotice(message),
      fitRequest: relayout ? state.fitRequest + 1 : state.fitRequest,
    },
  );
}

export function precedenceReducer(state: EditorState, action: PrecedenceAction): EditorState {
  const { doc, selection } = state;
  switch (action.type) {
    case 'saveActivity':
      return saveActivity(state, action);

    case 'removeActivity':
      return removeActivity(state, action.code, true);

    case 'setUnit':
      return doc.unit === action.unit ? state : commit(state, { ...doc, unit: action.unit });

    case 'deleteSelection':
      if (selection.kind === 'vertex') return removeActivity(state, selection.id, false);
      if (selection.kind === 'edge') {
        const [p, a] = selection.edge;
        return commit(
          state,
          { ...doc, graph: removeEdge(doc.graph, p, a) },
          { selection: NO_SELECTION, notice: undoableNotice(`Se quitó ${p} de las predecesoras de ${a}.`) },
        );
      }
      return state;

    case 'clear':
      if (doc.graph.vertices.length === 0) return state;
      return commit(state, emptyPrecedenceDoc(doc.unit), {
        selection: NO_SELECTION,
        notice: undoableNotice('Se borraron todas las actividades.'),
      });

    default:
      return editorReducer(state, action);
  }
}
