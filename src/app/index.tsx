import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdjacencyMatrixView } from '@/components/adjacency-matrix';
import { EditorToolbar } from '@/components/editor-toolbar';
import { GraphCanvas } from '@/components/graph-canvas/graph-canvas';
import { GraphTextEditor } from '@/components/graph-text-editor';
import { NameDialog } from '@/components/name-dialog';
import { NoticeSnackbar } from '@/components/notice-snackbar';
import { PracticeBar } from '@/components/practice-bar';
import { RenameDialog } from '@/components/rename-dialog';
import { ResultsPanel } from '@/components/results/results-panel';
import { ResultsSheet, SHEET_PEEK } from '@/components/results/results-sheet';
import { type BridgePaint, StageBridgeCard } from '@/components/results/stage-bridge-card';
import { SegmentedControl } from '@/components/segmented-control';
import { SettingsButton } from '@/components/settings-button';
import { SelectionBar } from '@/components/selection-bar';
import { coloringColors, coloringNumbers } from '@/constants/palette';
import { Spacing } from '@/constants/theme';
import { useColoringAnalysis } from '@/hooks/use-coloring-analysis';
import { useResultsView } from '@/hooks/use-results-view';
import { useTheme } from '@/hooks/use-theme';
import { paintVertex, practiceVerdict, prunePractice } from '@/lib/coloring/practice';
import type { Coloring } from '@/lib/coloring/types';
import { conflictingEdges } from '@/lib/coloring/validate';
import { countsLabel } from '@/lib/format';
import { IDENTITY_VIEWPORT, type Viewport, WORLD_BOX } from '@/lib/geometry';
import type { Graph, VertexId } from '@/lib/graph/types';
import { autoLayout, fitViewport, mergePositions } from '@/lib/layout/layouts';
import { activeBridge, type StageBridge } from '@/lib/precedence/bridge';
import { useColoringEditor } from '@/state/editor-context';
import type { Notice } from '@/state/editor-reducer';
import { newSavedId, uniqueName } from '@/state/saved-graphs';
import { useSavedGraphs } from '@/state/saved-graphs-context';
import { useSettings } from '@/state/settings-context';
import { useStageBridge } from '@/state/stage-bridge';

const FIT_PADDING = 24;
const NO_SELECTION = { kind: 'none' } as const;

type Mode = 'draw' | 'text' | 'matrix';
const MODE_OPTIONS = [
  { value: 'draw', label: 'Dibujo' },
  { value: 'text', label: 'Texto' },
  { value: 'matrix', label: 'Matriz' },
] as const satisfies readonly { value: Mode; label: string }[];

export default function ColorScreen() {
  const theme = useTheme();
  const { settings } = useSettings();
  const { state, dispatch } = useColoringEditor();
  const { doc, selection, notice, fitRequest } = state;
  const [viewport, setViewport] = useState<Viewport>(IDENTITY_VIEWPORT);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [fittedKey, setFittedKey] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [naming, setNaming] = useState(false);
  const saved = useSavedGraphs();
  const [mode, setMode] = useState<Mode>('draw');
  const results = useResultsView(doc.graph, mode === 'draw');
  const { bridge } = useStageBridge();
  const stageBridge = activeBridge(bridge, doc.graph);
  const [seenBridge, setSeenBridge] = useState<StageBridge | null>(null);
  const [paint, setPaint] = useState<BridgePaint>('stages');
  // "Colorea tú": coloración propia fuera del doc y del historial; `null` es que no se está practicando.
  const [practice, setPractice] = useState<Coloring | null>(null);
  const [brush, setBrush] = useState<number | null>(0);
  const [verdictShown, setVerdictShown] = useState(false);
  const practicing = practice !== null && mode === 'draw';
  // Abrir un ejemplo o un guardado desde otra pestaña muestra el dibujo, sin el modo práctica.
  const { open: openRequest } = useLocalSearchParams<{ open?: string }>();
  const [seenOpen, setSeenOpen] = useState(openRequest);
  if (openRequest !== seenOpen) {
    setSeenOpen(openRequest);
    setMode('draw');
    setPractice(null);
  }
  const { analysis: practiceAnalysis } = useColoringAnalysis(doc.graph, practicing);

  // Al llegar desde "Ver etapas como coloración" se abren los resultados con la comparación (una vez por puente).
  if (stageBridge && stageBridge !== seenBridge) {
    setSeenBridge(stageBridge);
    setPractice(null);
    setPaint('stages');
    setMode('draw');
    results.openResults();
  }
  // Pintar por etapas, salvo mientras el reproductor recorre los pasos de otro algoritmo.
  const stagePaint = stageBridge !== null && paint === 'stages' && !results.replaying;
  const vertexColoring = stagePaint ? stageBridge.coloring : results.vertexColoring;
  // Una clase de color de la coloración mostrada no corresponde a la pintura por etapas.
  const resultsHighlight = stagePaint && results.highlightTarget?.kind === 'class' ? undefined : results.highlight;
  // Se poda en cada render: un vértice que ya no existe no debe contar como coloreado.
  const practiceColoring = practicing ? prunePractice(practice, doc.graph) : null;
  const conflicts = practiceColoring ? conflictingEdges(doc.graph, practiceColoring) : [];
  // Lo que pinta el lienzo: la práctica manda sobre el resultado y las etapas.
  const canvasColoring = practiceColoring ?? vertexColoring;
  const highlight = practiceColoring
    ? conflicts.length > 0
      ? { edges: conflicts, tone: 'warning' as const }
      : undefined
    : resultsHighlight;
  // El veredicto se recalcula mientras se ve: si χ seguía calculándose, el aviso se actualiza al terminar.
  const verdict =
    practiceColoring && verdictShown && practiceAnalysis
      ? practiceVerdict(doc.graph, practiceColoring, practiceAnalysis.chromatic)
      : null;
  const practiceNotice: Notice | null = verdict && { kind: verdict.ok ? 'info' : 'error', message: verdict.message };

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
    if (next !== 'draw') results.closeResults();
    setMode(next);
  };
  const colorGraph = () => {
    setMode('draw');
    results.openResults();
  };
  const startPractice = () => {
    results.closeResults();
    setPractice({});
    setBrush(0);
    setVerdictShown(false);
  };
  const exitPractice = () => {
    setPractice(null);
    setVerdictShown(false);
  };
  const paintPractice = (id: VertexId) => {
    setPractice((c) => (c ? paintVertex(c, id, brush) : c));
    setVerdictShown(false);
  };
  const submitRename = (to: string) => {
    dispatch({ type: 'renameSelected', to });
    setRenaming(false);
  };
  const saveGraph = (name: string) => {
    const unique = uniqueName(name, saved.items);
    saved.dispatch({ type: 'save', name: unique, module: 'coloring', doc, id: newSavedId(), now: new Date().toISOString() });
    dispatch({ type: 'notify', message: `Se guardó «${unique}» en Mis grafos.` });
    setNaming(false);
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

  const toolbar = (
    <EditorToolbar
      canUndo={state.past.length > 0}
      canRedo={state.future.length > 0}
      onUndo={() => dispatch({ type: 'undo' })}
      onRedo={() => dispatch({ type: 'redo' })}
      onRelayout={mode === 'draw' ? relayout : undefined}
      onClear={() => dispatch({ type: 'clear' })}
      onSave={() => setNaming(true)}
      saveDisabled={vertexCount === 0}
      primary={{
        icon: 'palette',
        label: 'Colorear',
        accessibilityLabel: 'Colorear el grafo',
        onPress: colorGraph,
        disabled: vertexCount === 0,
      }}
    />
  );

  const nameDialog = (
    <NameDialog
      visible={naming}
      title="Guardar en Mis grafos"
      initial="Grafo de coloración"
      confirmLabel="Guardar"
      onSubmit={saveGraph}
      onCancel={() => setNaming(false)}
    />
  );

  if (mode === 'matrix') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.modeSwitch}>
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={changeMode} />
          </View>
          <Text style={[styles.counts, { color: theme.textSecondary }]} numberOfLines={2}>
            {countsLabel(vertexCount, edgeCount)}
          </Text>
          <SettingsButton />
        </View>
        <View style={styles.canvasArea}>
          <AdjacencyMatrixView
            graph={doc.graph}
            onToggle={(a, b) => dispatch({ type: 'toggleEdge', a, b })}
            emptyText="Todavía no hay vértices. Créalos en Dibujo o en Texto."
          />
          {snackbar}
        </View>
        {toolbar}
        {nameDialog}
      </SafeAreaView>
    );
  }

  if (mode === 'text') {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.modeSwitch}>
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={changeMode} />
          </View>
          <SettingsButton />
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
      {practicing ? (
        <View style={[styles.header, styles.practiceHeader]}>
          <Text style={[styles.practiceTitle, { color: theme.text }]} accessibilityRole="header">
            Colorea tú: elige un color y toca vértices
          </Text>
          <SettingsButton />
        </View>
      ) : (
        <View style={styles.header}>
          <View style={styles.modeSwitch}>
            <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={changeMode} />
          </View>
          <Text style={[styles.counts, { color: theme.textSecondary }]} numberOfLines={2}>
            {countsLabel(vertexCount, edgeCount)}
          </Text>
          <SettingsButton />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.canvasArea}>
          <GraphCanvas
            doc={doc}
            selection={results.open || practicing ? NO_SELECTION : selection}
            dispatch={dispatch}
            editable={!results.open && !practicing}
            viewport={viewport}
            onViewportChange={setViewport}
            onLayout={setSize}
            vertexColors={canvasColoring && coloringColors(canvasColoring)}
            vertexNumbers={settings.showColorNumbers && canvasColoring ? coloringNumbers(canvasColoring) : undefined}
            highlight={highlight}
            onPaintVertex={practicing ? paintPractice : undefined}
          />
          {!practicing && vertexCount > 0 && (
            <Pressable
              onPress={startPractice}
              accessibilityRole="button"
              accessibilityLabel="Colorea tú: pinta los vértices a mano"
              style={({ pressed }) => [
                styles.practiceButton,
                { backgroundColor: theme.background, borderColor: theme.border },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}>
              <MaterialIcons name="brush" size={20} color={theme.primary} />
              <Text style={[styles.practiceButtonLabel, { color: theme.primary }]}>Colorea tú</Text>
            </Pressable>
          )}
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
          {practicing ? (
            <NoticeSnackbar notice={practiceNotice} onUndo={() => {}} onDismiss={() => setVerdictShown(false)} />
          ) : (
            snackbar
          )}
        </View>

        {practicing ? (
          <PracticeBar
            color={brush}
            onColorChange={setBrush}
            onCheck={() => setVerdictShown(true)}
            onExit={exitPractice}
          />
        ) : (
          <>
            <SelectionBar
              selection={selection}
              onRename={() => setRenaming(true)}
              onDelete={() => dispatch({ type: 'deleteSelection' })}
            />
            {toolbar}
          </>
        )}

        <ResultsSheet visible={results.open} onClose={results.closeResults}>
          <ResultsPanel
            graph={doc.graph}
            view={results}
            header={
              stageBridge &&
              results.analysis && (
                <StageBridgeCard
                  bridge={stageBridge}
                  chromatic={results.analysis.chromatic}
                  paint={paint}
                  onPaintChange={setPaint}
                />
              )
            }
          />
        </ResultsSheet>
      </View>

      <RenameDialog
        visible={renaming && selection.kind === 'vertex'}
        initial={selection.kind === 'vertex' ? selection.id : ''}
        onSubmit={submitRename}
        onCancel={() => setRenaming(false)}
      />
      {nameDialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modeSwitch: { flexBasis: 240, flexShrink: 1 },
  counts: { flex: 1, fontSize: 12, lineHeight: 16, textAlign: 'right' },
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
  practiceHeader: { minHeight: 56 },
  practiceTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  practiceButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.three,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
  },
  practiceButtonLabel: { fontSize: 15, fontWeight: '700' },
});
