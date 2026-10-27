import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditorToolbar } from '@/components/editor-toolbar';
import { GraphCanvas } from '@/components/graph-canvas/graph-canvas';
import { GraphTextEditor } from '@/components/graph-text-editor';
import { NoticeSnackbar } from '@/components/notice-snackbar';
import { RenameDialog } from '@/components/rename-dialog';
import { ResultsPanel } from '@/components/results/results-panel';
import { ResultsSheet, SHEET_PEEK } from '@/components/results/results-sheet';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectionBar } from '@/components/selection-bar';
import { Spacing } from '@/constants/theme';
import { useResultsView } from '@/hooks/use-results-view';
import { useTheme } from '@/hooks/use-theme';
import { countsLabel } from '@/lib/format';
import { IDENTITY_VIEWPORT, type Viewport, WORLD_BOX } from '@/lib/geometry';
import type { Graph } from '@/lib/graph/types';
import { autoLayout, fitViewport, mergePositions } from '@/lib/layout/layouts';
import { useColoringEditor } from '@/state/editor-context';

const FIT_PADDING = 24;
const NO_SELECTION = { kind: 'none' } as const;

type Mode = 'draw' | 'text';
const MODE_OPTIONS = [
  { value: 'draw', label: 'Dibujo' },
  { value: 'text', label: 'Texto' },
] as const satisfies readonly { value: Mode; label: string }[];

export default function ColorScreen() {
  const theme = useTheme();
  const { state, dispatch } = useColoringEditor();
  const { doc, selection, notice, fitRequest } = state;
  const [viewport, setViewport] = useState<Viewport>(IDENTITY_VIEWPORT);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [fittedKey, setFittedKey] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [mode, setMode] = useState<Mode>('draw');
  const results = useResultsView(doc.graph, mode === 'draw');

  // Encuadrar al conocer el tamaño del lienzo, cada vez que el reducer lo pide y al abrir/cerrar los resultados
  // (con la hoja abierta, solo en la parte de arriba que queda visible). Ajuste de estado durante el render.
  const fitKey = `${fitRequest}|${results.open}`;
  if (size && fittedKey !== fitKey) {
    setFittedKey(fitKey);
    const view = results.open ? { width: size.width, height: size.height * (1 - SHEET_PEEK) } : size;
    setViewport(fitViewport(doc.positions, view, FIT_PADDING));
  }

  const vertexCount = doc.graph.vertices.length;
  const edgeCount = doc.graph.edges.length;

  const relayout = () => {
    if (vertexCount > 0) dispatch({ type: 'setPositions', positions: autoLayout(doc.graph, WORLD_BOX) });
  };
  const changeMode = (next: Mode) => {
    if (next === 'text') results.closeResults();
    setMode(next);
  };
  const submitRename = (to: string) => {
    dispatch({ type: 'renameSelected', to });
    setRenaming(false);
  };
  const applyText = (graph: Graph) => {
    dispatch({
      type: 'replaceDoc',
      doc: { graph, positions: mergePositions(doc.positions, graph, WORLD_BOX) },
      message: 'Se aplicó el texto.',
    });
  };
  const snackbar = (
    <NoticeSnackbar
      notice={notice}
      onUndo={() => dispatch({ type: 'undo' })}
      onDismiss={() => dispatch({ type: 'dismissNotice' })}
    />
  );

  if (mode === 'text') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.modeSwitch}>
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={changeMode} />
          </View>
        </View>
        <View style={styles.canvasArea}>
          <GraphTextEditor graph={doc.graph} directed={doc.graph.directed} onApply={applyText} />
          {snackbar}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.modeSwitch}>
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={changeMode} />
        </View>
        <Text style={[styles.counts, { color: theme.textSecondary }]} numberOfLines={2}>
          {countsLabel(vertexCount, edgeCount)}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.canvasArea}>
          <GraphCanvas
            doc={doc}
            selection={results.open ? NO_SELECTION : selection}
            dispatch={dispatch}
            editable={!results.open}
            viewport={viewport}
            onViewportChange={setViewport}
            onLayout={setSize}
            vertexColors={results.vertexColors}
            highlight={results.highlight}
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
          {snackbar}
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
          onColor={results.openResults}
        />

        <ResultsSheet visible={results.open} onClose={results.closeResults}>
          <ResultsPanel graph={doc.graph} view={results} />
        </ResultsSheet>
      </View>

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
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modeSwitch: { flexBasis: 220, flexShrink: 1 },
  counts: { flex: 1, fontSize: 13, lineHeight: 18, textAlign: 'right' },
  body: { flex: 1 },
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
