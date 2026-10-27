import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ALGORITHM_LABELS, type AlgorithmId } from '@/lib/coloring/types';

const ALGORITHMS = Object.keys(ALGORITHM_LABELS) as AlgorithmId[];

export function AlgorithmPicker({ value, onChange }: { value: AlgorithmId; onChange(a: AlgorithmId): void }) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ALGORITHMS.map((algorithm) => {
        const selected = algorithm === value;
        return (
          <Pressable
            key={algorithm}
            onPress={() => onChange(algorithm)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Algoritmo ${ALGORITHM_LABELS[algorithm]}`}
            hitSlop={4}
            style={({ pressed }) => [
              styles.chip,
              selected
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { borderColor: theme.border, backgroundColor: pressed ? theme.backgroundSelected : 'transparent' },
            ]}>
            <Text style={[styles.label, { color: selected ? theme.onPrimary : theme.text }]}>
              {ALGORITHM_LABELS[algorithm]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  label: { fontSize: 14, fontWeight: '600' },
});
