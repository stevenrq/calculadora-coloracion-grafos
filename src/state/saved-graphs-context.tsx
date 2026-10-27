import Storage from 'expo-sqlite/kv-store';
import { createContext, type Dispatch, type ReactNode, use, useEffect, useReducer, useRef } from 'react';

import { deserializeSaved, type SavedAction, type SavedGraph, savedReducer, type SavedState, serializeSaved } from './saved-graphs';

const SAVED_KEY = 'saved:v1';

interface SavedGraphsValue {
  items: SavedGraph[];
  dispatch: Dispatch<SavedAction>;
  lastRemoved: SavedState['lastRemoved'];
}

const SavedGraphsContext = createContext<SavedGraphsValue | null>(null);

function initialSaved(): SavedState {
  try {
    return { items: deserializeSaved(Storage.getItemSync(SAVED_KEY)), lastRemoved: null };
  } catch {
    return { items: [], lastRemoved: null };
  }
}

/** Grafos que la persona guardó con nombre (de los dos módulos), persistidos tras cada cambio. */
export function SavedGraphsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(savedReducer, undefined, initialSaved);
  // Lo que se leyó al abrir no se reescribe: si la lectura falló, no se pisa lo guardado con una lista vacía.
  const loaded = useRef(state.items);

  useEffect(() => {
    if (state.items === loaded.current) return;
    try {
      Storage.setItemSync(SAVED_KEY, serializeSaved(state.items));
    } catch (error) {
      // Igual que el autoguardado: nunca tumba la app; la lista sigue en memoria.
      console.warn('No se pudieron guardar los grafos guardados', error);
    }
  }, [state.items]);

  return (
    <SavedGraphsContext value={{ items: state.items, dispatch, lastRemoved: state.lastRemoved }}>
      {children}
    </SavedGraphsContext>
  );
}

export function useSavedGraphs(): SavedGraphsValue {
  const value = use(SavedGraphsContext);
  if (!value) throw new Error('useSavedGraphs debe usarse dentro de <SavedGraphsProvider>');
  return value;
}
