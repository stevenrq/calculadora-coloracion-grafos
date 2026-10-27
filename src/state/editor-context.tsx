import { createContext, type Dispatch, type ReactNode, use, useEffect, useReducer, useState } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_UNIT } from '@/lib/precedence/types';
import { createAutosaver } from './autosaver';
import { type EditorAction, type EditorDoc, editorReducer, type EditorState, initialEditorState } from './editor-reducer';
import { emptyPrecedenceDoc, type PrecedenceAction, precedenceReducer } from './precedence-reducer';
import { StageBridgeProvider } from './stage-bridge';
import { type DocKey, loadDoc, saveDoc } from './storage';

const AUTOSAVE_DELAY_MS = 500;

interface EditorContextValue<A> {
  state: EditorState;
  dispatch: Dispatch<A>;
}

const ColoringEditorContext = createContext<EditorContextValue<EditorAction> | null>(null);
const PrecedenceEditorContext = createContext<EditorContextValue<PrecedenceAction> | null>(null);

function initialColoring(): EditorState {
  return initialEditorState(loadDoc('coloring'));
}

function initialPrecedence(): EditorState {
  const saved = loadDoc('precedence');
  // Un documento no dirigido no es de este módulo: se empieza de cero.
  if (!saved?.graph.directed) return initialEditorState(emptyPrecedenceDoc());
  return initialEditorState({ ...saved, activities: saved.activities ?? {}, unit: saved.unit ?? DEFAULT_UNIT });
}

/** Guarda el documento medio segundo después del último cambio, y al instante si la app pasa a segundo plano. */
function useAutosave(key: DocKey, state: EditorState) {
  const [saver] = useState(() => createAutosaver((doc: EditorDoc) => saveDoc(key, doc), AUTOSAVE_DELAY_MS));

  useEffect(() => {
    saver.schedule(state.doc);
  }, [saver, state.doc]);

  useEffect(() => {
    // Android puede cerrar la app en segundo plano sin avisar: lo pendiente se guarda antes.
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') saver.flush();
    });
    return () => {
      subscription.remove();
      saver.flush();
    };
  }, [saver]);
}

/** Estado de los dos editores (Colorear y Precedencias), compartido entre pestañas y autoguardado. */
export function EditorProvider({ children }: { children: ReactNode }) {
  const [coloring, dispatchColoring] = useReducer(editorReducer, undefined, initialColoring);
  const [precedence, dispatchPrecedence] = useReducer(precedenceReducer, undefined, initialPrecedence);
  useAutosave('coloring', coloring);
  useAutosave('precedence', precedence);

  return (
    <ColoringEditorContext value={{ state: coloring, dispatch: dispatchColoring }}>
      <PrecedenceEditorContext value={{ state: precedence, dispatch: dispatchPrecedence }}>
        <StageBridgeProvider>{children}</StageBridgeProvider>
      </PrecedenceEditorContext>
    </ColoringEditorContext>
  );
}

export function useColoringEditor(): EditorContextValue<EditorAction> {
  const value = use(ColoringEditorContext);
  if (!value) throw new Error('useColoringEditor debe usarse dentro de <EditorProvider>');
  return value;
}

export function usePrecedenceEditor(): EditorContextValue<PrecedenceAction> {
  const value = use(PrecedenceEditorContext);
  if (!value) throw new Error('usePrecedenceEditor debe usarse dentro de <EditorProvider>');
  return value;
}
