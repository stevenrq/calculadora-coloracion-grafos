import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GraphThumbnail } from '@/components/graph-thumbnail';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { COLORING_EXAMPLES, type ColoringExample, exampleGraph } from '@/lib/examples/coloring-examples';
import { PRECEDENCE_EXAMPLES, type PrecedenceExample } from '@/lib/examples/precedence-examples';
import { countsLabel, plural, sentences } from '@/lib/format';
import { WORLD_BOX } from '@/lib/geometry';
import type { Graph, Positions } from '@/lib/graph/types';
import { layeredLayout } from '@/lib/layout/layered';
import { autoLayout, fromNormalized } from '@/lib/layout/layouts';
import { analyzePrecedence } from '@/lib/precedence/analyze';
import { graphFromActivities } from '@/lib/precedence/model';
import type { ActivityInfo } from '@/lib/precedence/types';
import { useColoringEditor, usePrecedenceEditor } from '@/state/editor-context';
import { useStageBridge } from '@/state/stage-bridge';

const THUMBNAIL_SIZE = 64;

interface ExampleCard {
  example: ColoringExample;
  graph: Graph;
  positions: Positions;
}

interface PrecedenceCard {
  example: PrecedenceExample;
  graph: Graph;
  positions: Positions;
  activities: Record<string, ActivityInfo>;
  stageCount: number;
}

function buildCards(): ExampleCard[] {
  return COLORING_EXAMPLES.map((example) => {
    const graph = exampleGraph(example);
    const positions = example.layout ? fromNormalized(example.layout, WORLD_BOX) : autoLayout(graph, WORLD_BOX);
    return { example, graph, positions };
  });
}

function buildPrecedenceCards(): PrecedenceCard[] {
  return PRECEDENCE_EXAMPLES.map((example) => {
    const { graph, info } = graphFromActivities(example.activities);
    const analysis = analyzePrecedence(graph, info);
    if (!analysis.valid) throw new Error(`Ejemplo de precedencias inválido "${example.id}"`);
    const positions = layeredLayout(graph, analysis.stages.stageOf, WORLD_BOX);
    return { example, graph, positions, activities: info, stageCount: analysis.stages.stages.length };
  });
}

export default function GraphsScreen() {
  const theme = useTheme();
  const { dispatch } = useColoringEditor();
  const precedence = usePrecedenceEditor();
  const { dismissBridge } = useStageBridge();
  const cards = buildCards();
  const precedenceCards = buildPrecedenceCards();

  const load = ({ example, graph, positions }: ExampleCard) => {
    // El ejemplo de la tarea tiene el mismo grafo que el puente de etapas: sin esto se vería pintado por etapas.
    dismissBridge();
    dispatch({ type: 'replaceDoc', doc: { graph, positions }, message: `Se cargó «${example.name}».` });
    router.navigate('/');
  };
  const loadPrecedence = ({ example, graph, positions, activities }: PrecedenceCard) => {
    precedence.dispatch({
      type: 'replaceDoc',
      doc: { graph, positions, activities, unit: example.unit },
      message: `Se cargó «${example.name}».`,
    });
    router.navigate('/precedence');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Mis grafos</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Toca un ejemplo para abrirlo.</Text>

        <Text style={[styles.section, { color: theme.textSecondary }]}>Ejemplos de coloración</Text>
        {cards.map((card) => {
          const { example, graph } = card;
          const counts = countsLabel(graph.vertices.length, graph.edges.length);
          return (
            <Pressable
              key={example.id}
              onPress={() => load(card)}
              accessibilityRole="button"
              accessibilityLabel={sentences(
                example.name,
                example.description,
                counts,
                `Número cromático ${example.chromaticNumber}`,
              )}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
              ]}>
              <View style={[styles.thumbnail, { backgroundColor: theme.canvas }]}>
                <GraphThumbnail graph={graph} positions={card.positions} size={THUMBNAIL_SIZE} />
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {example.name}
                  </Text>
                  <View style={[styles.badge, { borderColor: theme.primary }]}>
                    <Text style={[styles.badgeLabel, { color: theme.primary }]}>χ = {example.chromaticNumber}</Text>
                  </View>
                </View>
                <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
                  {example.description}
                </Text>
                <Text style={[styles.counts, { color: theme.textSecondary }]}>{counts}</Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={[styles.section, { color: theme.textSecondary }]}>Ejemplos de precedencias</Text>
        {precedenceCards.map((card) => {
          const { example, graph, stageCount } = card;
          const counts = `${plural(graph.vertices.length, 'actividad', 'actividades')} · ${plural(graph.edges.length, 'precedencia', 'precedencias')}`;
          const stages = plural(stageCount, 'etapa', 'etapas');
          return (
            <Pressable
              key={example.id}
              onPress={() => loadPrecedence(card)}
              accessibilityRole="button"
              accessibilityLabel={sentences(example.name, example.description, counts, stages)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
              ]}>
              <View style={[styles.thumbnail, { backgroundColor: theme.canvas }]}>
                <GraphThumbnail graph={graph} positions={card.positions} size={THUMBNAIL_SIZE} />
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {example.name}
                  </Text>
                  <View style={[styles.badge, { borderColor: theme.primary }]}>
                    <Text style={[styles.badgeLabel, { color: theme.primary }]}>{stages}</Text>
                  </View>
                </View>
                <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
                  {example.description}
                </Text>
                <Text style={[styles.counts, { color: theme.textSecondary }]}>{counts}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  section: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.three,
  },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: 16 },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: Spacing.half },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  badge: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  badgeLabel: { fontSize: 13, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 18 },
  counts: { fontSize: 12, lineHeight: 16 },
});
