import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdjacencyMatrixView } from '@/components/adjacency-matrix';
import { EditorHeader } from '@/components/editor-header';
import { EditorToolbar } from '@/components/editor-toolbar';
import { GraphCanvas } from '@/components/graph-canvas/graph-canvas';
import { NameDialog } from '@/components/name-dialog';
import { NoticeSnackbar } from '@/components/notice-snackbar';
import { ActivityDialog, type ActivityInput } from '@/components/precedence/activity-dialog';
import { ActivityTable } from '@/components/precedence/activity-table';
import { IssuesBanner } from '@/components/precedence/issues-banner';
import { PrecedencePanel } from '@/components/precedence/precedence-panel';
import { RenameDialog } from '@/components/rename-dialog';
import { ResultsSheet, SHEET_PEEK } from '@/components/results/results-sheet';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectionBar } from '@/components/selection-bar';
import { Spacing } from '@/constants/theme';
import { usePrecedenceView } from '@/hooks/use-precedence-view';
import { useTheme } from '@/hooks/use-theme';
import { plural } from '@/lib/format';
import { IDENTITY_VIEWPORT, type Viewport } from '@/lib/geometry';
import { nextLabel } from '@/lib/graph/graph';
import type { VertexId } from '@/lib/graph/types';
import { fitViewport } from '@/lib/layout/layouts';
import { stageBridge } from '@/lib/precedence/bridge';
import { DEFAULT_UNIT } from '@/lib/precedence/types';
import { useColoringEditor, usePrecedenceEditor } from '@/state/editor-context';
import { stageLayout } from '@/state/precedence-reducer';
import { newSavedId, uniqueName } from '@/state/saved-graphs';
import { useSavedGraphs } from '@/state/saved-graphs-context';
import { useStageBridge } from '@/state/stage-bridge';

const FIT_PADDING = 24;
const NO_SELECTION = { kind: 'none' } as const;
const CODE_TEXTS = { title: 'Cambiar código', inputLabel: 'Nuevo código de la actividad' };

type Mode = 'table' | 'graph' | 'matrix';
const MODE_OPTIONS = [
  { value: 'table', label: 'Tabla' },
  { value: 'graph', label: 'Grafo' },
  { value: 'matrix', label: 'Matriz' },
] as const satisfies readonly { value: Mode; label: string }[];

/** La fila que se está editando: `code` null es una actividad nueva. */
type Editing = { code: VertexId | null } | null;

export default function PrecedenceScreen() {
  const theme = useTheme();
  const { state, dispatch } = usePrecedenceEditor();
  const coloring = useColoringEditor();
  const { showBridge } = useStageBridge();
  const { doc, selection, notice, fitRequest } = state;
  const [mode, setMode] = useState<Mode>('table');
  const [viewport, setViewport] = useState<Viewport>(IDENTITY_VIEWPORT);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [fittedKey, setFittedKey] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [naming, setNaming] = useState(false);
  const saved = useSavedGraphs();
  const [editing, setEditing] = useState<Editing>(null);
  const view = usePrecedenceView(doc);
  // Abrir un ejemplo o un guardado desde otra pestaña vuelve a la Tabla.
  const { open: openRequest } = useLocalSearchParams<{ open?: string }>();
  const [seenOpen, setSeenOpen] = useState(openRequest);
  if (openRequest !== seenOpen) {
    setSeenOpen(openRequest);
    setMode('table');
  }
  const { analysis } = view;
  const unit = doc.unit ?? DEFAULT_UNIT;

  // Encuadrar al mostrar el grafo, cuando el reducer lo pide y al abrir/cerrar los resultados (ajuste en render).
  const fitKey = `${fitRequest}|${view.open}|${mode}`;
  if (mode === 'graph' && size && fittedKey !== fitKey) {
    setFittedKey(fitKey);
    const visible = view.open ? { width: size.width, height: size.height * (1 - SHEET_PEEK) } : size;
    setViewport(fitViewport(doc.positions, visible, FIT_PADDING));
  }

  const activityCount = doc.graph.vertices.length;
  const counts = `${plural(activityCount, 'actividad', 'actividades')} · ${plural(doc.graph.edges.length, 'precedencia', 'precedencias')}`;

  const changeMode = (next: Mode) => {
    if (next !== 'graph') view.closeResults();
    setMode(next);
  };
  const analyze = () => {
    setMode('graph');
    view.openResults();
  };
  const saveActivity = (input: ActivityInput) => {
    dispatch({ type: 'saveActivity', ...input });
    setEditing(null);
  };
  const removeActivity = (code: VertexId) => {
    dispatch({ type: 'removeActivity', code });
    setEditing(null);
  };
  const submitRename = (to: string) => {
    dispatch({ type: 'renameSelected', to });
    setRenaming(false);
  };
  const saveGraph = (name: string) => {
    const unique = uniqueName(name, saved.items);
    saved.dispatch({ type: 'save', name: unique, module: 'precedence', doc, id: newSavedId(), now: new Date().toISOString() });
    dispatch({ type: 'notify', message: `Se guardó «${unique}» en Mis grafos.` });
    setNaming(false);
  };
  const openBridge = () => {
    if (!analysis.valid) return;
    const { graph, bridge } = stageBridge(doc.graph, analysis.stages, analysis.activities);
    coloring.dispatch({
      type: 'replaceDoc',
      doc: { graph, positions: doc.positions },
      message: 'Se abrió el grafo de etapas en Colorear.',
    });
    showBridge(bridge);
    view.closeResults();
    router.navigate('/');
  };

  const editingActivity = editing?.code ? analysis.activities.find((a) => a.code === editing.code) ?? null : null;
  const toolbar = (
    <EditorToolbar
      canUndo={state.past.length > 0}
      canRedo={state.future.length > 0}
      onUndo={() => dispatch({ type: 'undo' })}
      onRedo={() => dispatch({ type: 'redo' })}
      onRelayout={
        mode === 'graph' && activityCount > 0
          ? () => dispatch({ type: 'setPositions', positions: stageLayout(doc.graph, doc.positions) })
          : undefined
      }
      onClear={() => dispatch({ type: 'clear' })}
      onSave={() => setNaming(true)}
      saveDisabled={activityCount === 0}
      primary={{
        icon: 'account-tree',
        label: 'Analizar',
        accessibilityLabel: 'Analizar las precedencias: etapas y ruta crítica',
        onPress: analyze,
        disabled: activityCount === 0,
      }}
    />
  );
  const snackbar = (
    <NoticeSnackbar
      notice={notice}
      onUndo={() => dispatch({ type: 'undo' })}
      onDismiss={() => dispatch({ type: 'dismissNotice' })}
    />
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <EditorHeader counts={counts}>
        <View style={styles.modeSwitch}>
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={changeMode} />
        </View>
      </EditorHeader>
      {!analysis.valid && <IssuesBanner issues={analysis.issues} />}

      <View style={styles.body}>
        {mode === 'table' ? (
          <View style={styles.area}>
            <ActivityTable
              activities={analysis.activities}
              stageOf={analysis.valid ? analysis.stages.stageOf : null}
              critical={analysis.valid && analysis.schedule ? new Set(analysis.schedule.critical) : null}
              unit={unit}
              onUnitChange={(next) => dispatch({ type: 'setUnit', unit: next })}
              onEdit={(code) => setEditing({ code })}
              onAdd={() => setEditing({ code: null })}
              onLoadExample={() => router.navigate('/graphs')}
            />
            {snackbar}
          </View>
        ) : mode === 'matrix' ? (
          <View style={styles.area}>
            <AdjacencyMatrixView
              graph={doc.graph}
              onToggle={(a, b) => dispatch({ type: 'toggleEdge', a, b })}
              emptyText="Todavía no hay actividades. Agrégalas en la Tabla o en el Grafo."
            />
            {snackbar}
          </View>
        ) : (
          <View style={styles.area}>
            <GraphCanvas
              doc={doc}
              selection={view.open ? NO_SELECTION : selection}
              dispatch={dispatch}
              editable={!view.open}
              viewport={viewport}
              onViewportChange={setViewport}
              onLayout={setSize}
              vertexColors={view.vertexColors}
              highlight={view.highlight}
            />
            {activityCount === 0 && (
              <View style={styles.empty}>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Toca para crear una actividad</Text>
                <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  Luego toca la predecesora y después la actividad para unirlas con una flecha.
                </Text>
              </View>
            )}
            {snackbar}
          </View>
        )}

        {mode === 'graph' && (
          <SelectionBar
            selection={selection}
            directed
            onRename={() => setRenaming(true)}
            onDelete={() => dispatch({ type: 'deleteSelection' })}
          />
        )}
        {toolbar}

        <ResultsSheet visible={mode === 'graph' && view.open} onClose={view.closeResults}>
          <PrecedencePanel view={view} unit={unit} onShowBridge={openBridge} />
        </ResultsSheet>
      </View>

      <ActivityDialog
        visible={editing !== null}
        activity={editingActivity}
        suggestedCode={nextLabel(doc.graph.vertices)}
        others={analysis.activities.filter((a) => a.code !== editing?.code)}
        unit={unit}
        onSave={saveActivity}
        onDelete={removeActivity}
        onCancel={() => setEditing(null)}
      />
      <RenameDialog
        visible={renaming && selection.kind === 'vertex'}
        initial={selection.kind === 'vertex' ? selection.id : ''}
        onSubmit={submitRename}
        onCancel={() => setRenaming(false)}
        texts={CODE_TEXTS}
      />
      <NameDialog
        visible={naming}
        title="Guardar en Mis grafos"
        initial="Proyecto de precedencias"
        confirmLabel="Guardar"
        onSubmit={saveGraph}
        onCancel={() => setNaming(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  modeSwitch: { flexBasis: 240, flexShrink: 1 },
  body: { flex: 1 },
  area: { flex: 1 },
  // none: el texto de ayuda no tapa los toques; el lienzo crea la actividad debajo.
  empty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
    pointerEvents: 'none',
  },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  emptyHint: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
