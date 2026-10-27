import Storage from 'expo-sqlite/kv-store';

import { deserializeDoc, serializeDoc } from './doc-serialization';
import type { EditorDoc } from './editor-reducer';

export type DocKey = 'coloring';

const storageKey = (key: DocKey) => `doc:${key}`;

/** Documento autoguardado, o `null` si no hay o está corrupto (la app arranca con un grafo vacío). */
export function loadDoc(key: DocKey): EditorDoc | null {
  try {
    return deserializeDoc(Storage.getItemSync(storageKey(key)));
  } catch {
    return null;
  }
}

export function saveDoc(key: DocKey, doc: EditorDoc): void {
  try {
    Storage.setItemSync(storageKey(key), serializeDoc(doc));
  } catch (error) {
    // El autoguardado nunca debe tumbar la app; el trabajo sigue en memoria.
    console.warn('No se pudo autoguardar el grafo', error);
  }
}
