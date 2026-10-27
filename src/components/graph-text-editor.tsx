import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SegmentedControl } from '@/components/segmented-control';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { countsLabel } from '@/lib/format';
import { graphKey } from '@/lib/graph/graph';
import { graphToText, parseGraphText, resyncDraft, type TextDraft, type TextFormat } from '@/lib/graph/text';
import type { Graph } from '@/lib/graph/types';

const PARSE_DELAY_MS = 250;

const FORMAT_OPTIONS = [
  { value: 'edges', label: 'Lista de aristas' },
  { value: 'adjacency', label: 'Lista de adyacencia' },
] as const satisfies readonly { value: TextFormat; label: string }[];

const FORMAT_HELP: Record<TextFormat, { hint: string; placeholder: string }> = {
  edges: { hint: 'Pares unidos con guion, separados por comas o líneas.', placeholder: 'A-B, B-C, C-A' },
  adjacency: { hint: 'Un vértice por línea, seguido de sus vecinos.', placeholder: 'A: B, C\nB: C' },
};

export function GraphTextEditor({
  graph,
  directed,
  onApply,
}: {
  graph: Graph;
  directed: boolean;
  onApply(graph: Graph): void;
}) {
  const theme = useTheme();
  const [format, setFormat] = useState<TextFormat>('edges');
  const [draft, setDraft] = useState<TextDraft>(() => ({ key: graphKey(graph), text: graphToText(graph, 'edges') }));
  // Texto ya analizado: va 250 ms por detrás de lo que se escribe.
  const [parsedText, setParsedText] = useState(draft.text);

  // Vistas siempre sincronizadas: si el grafo cambió desde afuera (ejemplo, deshacer), se regenera el texto.
  const synced = resyncDraft(draft, graph, format);
  if (synced !== draft) {
    setDraft(synced);
    setParsedText(synced.text);
  }
  const text = synced.text;
  const setText = (next: string) => setDraft({ key: synced.key, text: next });

  useEffect(() => {
    const timer = setTimeout(() => setParsedText(text), PARSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const result = parseGraphText(parsedText, format, directed);
  const changed = result.graph !== null && graphKey(result.graph) !== graphKey(graph);

  const changeFormat = (next: TextFormat) => {
    if (next === format) return;
    const source = parseGraphText(text, format, directed).graph ?? graph;
    const regenerated = graphToText(source, next);
    setFormat(next);
    setDraft({ key: synced.key, text: regenerated });
    setParsedText(regenerated);
  };

  const apply = () => {
    // Analizar lo que está escrito ahora, no lo de hace 250 ms.
    const fresh = parseGraphText(text, format, directed);
    setParsedText(text);
    if (!fresh.graph || graphKey(fresh.graph) === graphKey(graph)) return;
    // El borrador ya corresponde al grafo aplicado: conservar lo escrito en vez de regenerarlo.
    setDraft({ key: graphKey(fresh.graph), text });
    onApply(fresh.graph);
  };

  const summary = result.graph ? countsLabel(result.graph.vertices.length, result.graph.edges.length) : 'Revisa los errores';

  return (
    <View style={styles.container}>
      <SegmentedControl options={FORMAT_OPTIONS} value={format} onChange={changeFormat} />
      <Text style={[styles.hint, { color: theme.textSecondary }]}>{FORMAT_HELP[format].hint}</Text>

      <View style={styles.statusRow}>
        <Text
          style={[styles.summary, { color: result.graph ? theme.text : theme.danger }]}
          accessibilityLiveRegion="polite">
          {summary}
        </Text>
        <Pressable
          onPress={apply}
          disabled={!changed}
          accessibilityRole="button"
          accessibilityLabel="Aplicar el texto al grafo"
          accessibilityState={{ disabled: !changed }}
          style={({ pressed }) => [
            styles.apply,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
            !changed && styles.disabled,
          ]}>
          <Text style={[styles.applyLabel, { color: theme.onPrimary }]}>Aplicar</Text>
        </Pressable>
      </View>

      {(result.errors.length > 0 || result.warnings.length > 0) && (
        <ScrollView style={styles.issues} nestedScrollEnabled>
          {result.errors.map((issue, i) => (
            <Text key={`e${i}`} style={[styles.issue, { color: theme.danger }]}>
              {issue.message}
            </Text>
          ))}
          {result.warnings.map((issue, i) => (
            <Text key={`w${i}`} style={[styles.issue, { color: theme.warning }]}>
              {issue.message}
            </Text>
          ))}
        </ScrollView>
      )}

      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
        placeholder={FORMAT_HELP[format].placeholder}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Texto del grafo"
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.two, padding: Spacing.three },
  hint: { fontSize: 13, lineHeight: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  summary: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  apply: { minHeight: 48, minWidth: 104, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  applyLabel: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.38 },
  issues: { maxHeight: 96, flexGrow: 0 },
  issue: { fontSize: 13, lineHeight: 18 },
  input: {
    flex: 1,
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    fontFamily: Fonts.mono,
    fontSize: 16,
    lineHeight: 24,
  },
});
