import { router } from 'expo-router';

import { DEFAULT_UNIT } from '@/lib/precedence/types';
import { useColoringEditor, usePrecedenceEditor } from '@/state/editor-context';
import type { EditorDoc } from '@/state/editor-reducer';
import { useStageBridge } from '@/state/stage-bridge';
import type { DocKey } from '@/state/storage';

let openCount = 0;

/**
 * Abre un documento (ejemplo o guardado) en su módulo y navega hasta él. El parámetro `open` cambia en cada apertura:
 * la pantalla lo usa para volver a su vista principal aunque se hubiera quedado en Texto o en Matriz.
 */
export function useModuleLoader(): { open(module: DocKey, doc: EditorDoc, message: string): void } {
  const coloring = useColoringEditor();
  const precedence = usePrecedenceEditor();
  const { dismissBridge } = useStageBridge();

  const open = (module: DocKey, doc: EditorDoc, message: string) => {
    if (module === 'coloring') {
      // Un grafo con los mismos vértices que el puente de etapas se vería pintado por etapas.
      dismissBridge();
      coloring.dispatch({ type: 'replaceDoc', doc, message });
      router.navigate({ pathname: '/', params: { open: String(++openCount) } });
      return;
    }
    const full = { ...doc, activities: doc.activities ?? {}, unit: doc.unit ?? DEFAULT_UNIT };
    precedence.dispatch({ type: 'replaceDoc', doc: full, message });
    router.navigate({ pathname: '/precedence', params: { open: String(++openCount) } });
  };
  return { open };
}
