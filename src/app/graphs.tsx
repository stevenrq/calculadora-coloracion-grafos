import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GraphThumbnail } from '@/components/graph-thumbnail';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { COLORING_EXAMPLES, type ColoringExample, exampleGraph } from '@/lib/examples/coloring-examples';
import { countsLabel } from '@/lib/format';
import { WORLD_BOX } from '@/lib/geometry';
import type { Graph, Positions } from '@/lib/graph/types';
import { autoLayout, fromNormalized } from '@/lib/layout/layouts';
import { useColoringEditor } from '@/state/editor-context';

const THUMBNAIL_SIZE = 64;

interface ExampleCard {
  example: ColoringExample;
  graph: Graph;
  positions: Positions;
}

function buildCards(): ExampleCard[] {
  return COLORING_EXAMPLES.map((example) => {
    const graph = exampleGraph(example);
    const positions = example.layout ? fromNormalized(example.layout, WORLD_BOX) : autoLayout(graph, WORLD_BOX);
    return { example, graph, positions };
  });
}

export default function GraphsScreen() {
  const theme = useTheme();
  const { dispatch } = useColoringEditor();
  const cards = buildCards();

  const load = ({ example, graph, positions }: ExampleCard) => {
    dispatch({ type: 'replaceDoc', doc: { graph, positions }, message: `Se cargó «${example.name}».` });
    router.navigate('/');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Mis grafos</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Toca un ejemplo para abrirlo en Colorear.</Text>

        <Text style={[styles.section, { color: theme.textSecondary }]}>Ejemplos</Text>
        {cards.map((card) => {
          const { example, graph } = card;
          const counts = countsLabel(graph.vertices.length, graph.edges.length);
          return (
            <Pressable
              key={example.id}
              onPress={() => load(card)}
              accessibilityRole="button"
              accessibilityLabel={`${example.name}. ${example.description}. ${counts}. Número cromático ${example.chromaticNumber}.`}
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
