import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditorToolbar } from '@/components/editor-toolbar';
import { GraphCanvas } from '@/components/graph-canvas/graph-canvas';
import { NoticeSnackbar } from '@/components/notice-snackbar';
import { RenameDialog } from '@/components/rename-dialog';
import { SelectionBar } from '@/components/selection-bar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IDENTITY_VIEWPORT, type Viewport, WORLD_BOX } from '@/lib/geometry';
import { autoLayout, fitViewport } from '@/lib/layout/layouts';
import { useColoringEditor } from '@/state/editor-context';

const FIT_PADDING = 24;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function ColorScreen() {
  const theme = useTheme();
  const { state, dispatch } = useColoringEditor();
  const { doc, selection, notice, fitRequest } = state;
  const [viewport, setViewport] = useState<Viewport>(IDENTITY_VIEWPORT);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [fittedRequest, setFittedRequest] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);

  // Encuadrar al conocer el tamaño del lienzo y cada vez que el reducer lo pide (ajuste de estado durante el render).
  if (size && fittedRequest !== fitRequest) {
    setFittedRequest(fitRequest);
    setViewport(fitViewport(doc.positions, size, FIT_PADDING));
  }

  const vertexCount = doc.graph.vertices.length;
  const edgeCount = doc.graph.edges.length;

  const relayout = () => {
    if (vertexCount > 0) dispatch({ type: 'setPositions', positions: autoLayout(doc.graph, WORLD_BOX) });
  };
  // La hoja de resultados se conecta en la Tarea 12.
  const openResults = () => {};
  const submitRename = (to: string) => {
    dispatch({ type: 'renameSelected', to });
    setRenaming(false);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Colorear</Text>
        <Text style={[styles.counts, { color: theme.textSecondary }]}>
          {plural(vertexCount, 'vértice', 'vértices')} · {plural(edgeCount, 'arista', 'aristas')}
        </Text>
      </View>

      <View style={styles.canvasArea}>
        <GraphCanvas
          doc={doc}
          selection={selection}
          dispatch={dispatch}
          editable
          viewport={viewport}
          onViewportChange={setViewport}
          onLayout={setSize}
        />
        {vertexCount === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyText}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Toca para crear un vértice</Text>
              <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                Luego toca dos vértices para unirlos con una arista.
              </Text>
            </View>
            <Pressable
              onPress={() => router.navigate('/graphs')}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.exampleButton,
                { borderColor: theme.primary },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}>
              <Text style={[styles.exampleLabel, { color: theme.primary }]}>Cargar ejemplo</Text>
            </Pressable>
          </View>
        )}
        <NoticeSnackbar
          notice={notice}
          onUndo={() => dispatch({ type: 'undo' })}
          onDismiss={() => dispatch({ type: 'dismissNotice' })}
        />
      </View>

      <SelectionBar
        selection={selection}
        onRename={() => setRenaming(true)}
        onDelete={() => dispatch({ type: 'deleteSelection' })}
      />
      <EditorToolbar
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        canColor={vertexCount > 0}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onRelayout={relayout}
        onClear={() => dispatch({ type: 'clear' })}
        onColor={openResults}
      />

      <RenameDialog
        visible={renaming && selection.kind === 'vertex'}
        initial={selection.kind === 'vertex' ? selection.id : ''}
        onSubmit={submitRename}
        onCancel={() => setRenaming(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  counts: { fontSize: 14, lineHeight: 20 },
  canvasArea: { flex: 1 },
  // box-none: los toques fuera del botón llegan al lienzo y crean el vértice.
  empty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    pointerEvents: 'box-none',
  },
  emptyText: { alignItems: 'center', gap: Spacing.one, pointerEvents: 'none' },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  emptyHint: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  exampleButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  exampleLabel: { fontSize: 15, fontWeight: '700' },
});
