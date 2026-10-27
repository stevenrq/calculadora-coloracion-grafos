import {
  addEdge,
  addVertex,
  emptyGraph,
  nextLabel,
  removeEdge,
  removeVertex,
  renameVertex,
} from '@/lib/graph/graph';
import type { Edge, EditError, Graph, Point, Positions, VertexId } from '@/lib/graph/types';

export interface EditorDoc {
  graph: Graph;
  positions: Positions;
}

export type Selection = { kind: 'none' } | { kind: 'vertex'; id: VertexId } | { kind: 'edge'; edge: Edge };

export interface Notice {
  kind: 'error' | 'info';
  message: string;
  undoable?: boolean;
}

export interface EditorState {
  doc: EditorDoc;
  past: EditorDoc[];
  future: EditorDoc[];
  selection: Selection;
  notice: Notice | null;
  /** Sube con replaceDoc y setPositions: la pantalla vuelve a encuadrar el lienzo. */
  fitRequest: number;
}

export type EditorAction =
  | { type: 'tapEmpty'; point: Point }
  | { type: 'tapVertex'; id: VertexId }
  | { type: 'tapEdge'; edge: Edge }
  | { type: 'dragStart' }
  | { type: 'dragMove'; id: VertexId; point: Point }
  | { type: 'deleteSelection' }
  | { type: 'renameSelected'; to: string }
  | { type: 'replaceDoc'; doc: EditorDoc; message?: string }
  | { type: 'setPositions'; positions: Positions }
  | { type: 'clear' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'dismissNotice' };

export const HISTORY_LIMIT = 100;

export const EDIT_ERROR_MESSAGES: Record<EditError, string> = {
  'limit-vertices': 'Llegaste al máximo de 60 vértices.',
  'limit-edges': 'Llegaste al máximo de 600 aristas.',
  'invalid-label': 'Etiqueta no válida: usa letras, dígitos o _ (máximo 12).',
  'duplicate-vertex': 'Ya existe un vértice con ese nombre.',
  'self-loop': 'No se permiten lazos (una arista de un vértice a sí mismo).',
  'unknown-vertex': 'Ese vértice no existe.',
};

const NO_SELECTION: Selection = { kind: 'none' };

export function emptyDoc(directed = false): EditorDoc {
  return { graph: emptyGraph(directed), positions: {} };
}

export function initialEditorState(doc?: EditorDoc | null, directed = false): EditorState {
  return { doc: doc ?? emptyDoc(directed), past: [], future: [], selection: NO_SELECTION, notice: null, fitRequest: 0 };
}

const pushPast = (state: EditorState) => [...state.past, state.doc].slice(-HISTORY_LIMIT);

/** Aplica un documento nuevo guardando el anterior en el historial. */
function commit(state: EditorState, doc: EditorDoc, extra: Partial<EditorState> = {}): EditorState {
  return { ...state, doc, past: pushPast(state), future: [], ...extra };
}

const errorNotice = (error: EditError): Notice => ({ kind: 'error', message: EDIT_ERROR_MESSAGES[error] });
const undoableNotice = (message: string): Notice => ({ kind: 'info', message, undoable: true });

function withoutKey(positions: Positions, id: VertexId): Positions {
  const { [id]: _removed, ...rest } = positions;
  return rest;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { doc, selection } = state;

  switch (action.type) {
    case 'tapEmpty': {
      if (selection.kind !== 'none') return { ...state, selection: NO_SELECTION };
      const label = nextLabel(doc.graph.vertices);
      const r = addVertex(doc.graph, label);
      if (!r.ok) return { ...state, notice: errorNotice(r.error) };
      return commit(state, { graph: r.graph, positions: { ...doc.positions, [label]: action.point } });
    }

    case 'tapVertex': {
      if (selection.kind !== 'vertex') return { ...state, selection: { kind: 'vertex', id: action.id } };
      if (selection.id === action.id) return { ...state, selection: NO_SELECTION };
      const r = addEdge(doc.graph, selection.id, action.id);
      if (!r.ok) return { ...state, notice: errorNotice(r.error) };
      // Encadenar: la selección pasa al vértice tocado para seguir dibujando.
      const next: Selection = { kind: 'vertex', id: action.id };
      if (r.graph === doc.graph) return { ...state, selection: next };
      return commit(state, { ...doc, graph: r.graph }, { selection: next });
    }

    case 'tapEdge':
      return { ...state, selection: { kind: 'edge', edge: action.edge } };

    case 'dragStart':
      return { ...state, past: pushPast(state), future: [] };

    case 'dragMove':
      if (!doc.positions[action.id]) return state;
      return { ...state, doc: { ...doc, positions: { ...doc.positions, [action.id]: action.point } } };

    case 'deleteSelection': {
      if (selection.kind === 'vertex') {
        const graph = removeVertex(doc.graph, selection.id);
        return commit(
          state,
          { graph, positions: withoutKey(doc.positions, selection.id) },
          { selection: NO_SELECTION, notice: undoableNotice(`Se borró el vértice ${selection.id}.`) },
        );
      }
      if (selection.kind === 'edge') {
        const [a, b] = selection.edge;
        return commit(
          state,
          { ...doc, graph: removeEdge(doc.graph, a, b) },
          { selection: NO_SELECTION, notice: undoableNotice(`Se borró la arista ${a}-${b}.`) },
        );
      }
      return state;
    }

    case 'renameSelected': {
      if (selection.kind !== 'vertex') return state;
      const to = action.to.trim();
      const r = renameVertex(doc.graph, selection.id, to);
      if (!r.ok) return { ...state, notice: errorNotice(r.error) };
      if (r.graph === doc.graph) return state;
      const positions = Object.fromEntries(
        Object.entries(doc.positions).map(([v, p]) => [v === selection.id ? to : v, p]),
      );
      return commit(state, { graph: r.graph, positions }, { selection: { kind: 'vertex', id: to } });
    }

    case 'replaceDoc':
      return commit(state, action.doc, {
        selection: NO_SELECTION,
        fitRequest: state.fitRequest + 1,
        notice: action.message ? undoableNotice(action.message) : null,
      });

    case 'setPositions':
      return commit(state, { ...doc, positions: action.positions }, { fitRequest: state.fitRequest + 1 });

    case 'clear':
      if (doc.graph.vertices.length === 0) return state;
      return commit(state, emptyDoc(doc.graph.directed), {
        selection: NO_SELECTION,
        notice: undoableNotice('Se limpió el grafo.'),
      });

    case 'undo': {
      const previous = state.past[state.past.length - 1];
      if (!previous) return state;
      return {
        ...state,
        doc: previous,
        past: state.past.slice(0, -1),
        future: [doc, ...state.future],
        selection: NO_SELECTION,
        notice: null,
      };
    }

    case 'redo': {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { ...state, doc: next, past: pushPast(state), future: rest, selection: NO_SELECTION, notice: null };
    }

    case 'dismissNotice':
      return { ...state, notice: null };
  }
}
