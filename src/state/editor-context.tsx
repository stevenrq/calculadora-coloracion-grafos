import { createContext, type Dispatch, type ReactNode, use, useEffect, useReducer } from 'react';

import { type EditorAction, editorReducer, type EditorState, initialEditorState } from './editor-reducer';
import { type DocKey, loadDoc, saveDoc } from './storage';

const AUTOSAVE_DELAY_MS = 500;
const DOC_KEY: DocKey = 'coloring';

interface EditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}

const ColoringEditorContext = createContext<EditorContextValue | null>(null);

/** Estado del editor de coloración, compartido entre pestañas y autoguardado. */
export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, DOC_KEY, (key) => initialEditorState(loadDoc(key)));

  useEffect(() => {
    const timer = setTimeout(() => saveDoc(DOC_KEY, state.doc), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.doc]);

  return <ColoringEditorContext value={{ state, dispatch }}>{children}</ColoringEditorContext>;
}

export function useColoringEditor(): EditorContextValue {
  const value = use(ColoringEditorContext);
  if (!value) throw new Error('useColoringEditor debe usarse dentro de <EditorProvider>');
  return value;
}
