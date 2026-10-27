import { StyleSheet, Text, View } from 'react-native';

import { HighlightRow, ResultCard } from '@/components/results/result-card';
import { graphColor } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import type { Coloring } from '@/lib/coloring/types';
import { colorClasses } from '@/lib/coloring/validate';
import type { Graph } from '@/lib/graph/types';

export function ColorClasses({
  graph,
  coloring,
  selected,
  onSelect,
}: {
  graph: Graph;
  coloring: Coloring;
  selected: number | null;
  onSelect(color: number): void;
}) {
  const theme = useTheme();
  const classes = colorClasses(graph, coloring);

  return (
    <ResultCard title="Clases de color (toca para resaltar)">
      {classes.map((members, i) => (
        <HighlightRow
          key={i}
          active={selected === i}
          onPress={() => onSelect(i)}
          accessibilityLabel={`Color ${i + 1}: ${members.join(', ')}`}>
          <View style={[styles.swatch, { backgroundColor: graphColor(i), borderColor: theme.edge }]} />
          <Text style={[styles.label, { color: theme.text }]}>
            <Text style={styles.colorName}>Color {i + 1}:</Text> {members.join(', ')}
          </Text>
        </HighlightRow>
      ))}
    </ResultCard>
  );
}

const styles = StyleSheet.create({
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 1 },
  label: { flex: 1, fontSize: 15, lineHeight: 22 },
  colorName: { fontWeight: '700' },
});
