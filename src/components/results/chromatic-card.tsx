import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ResultCard } from '@/components/results/result-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ChromaticState, chromaticLabel, colorsUsedWarning } from '@/lib/coloring/present';
import { ALGORITHM_SHORT_LABELS, type ColoringResult } from '@/lib/coloring/types';

export function ChromaticCard({
  chromatic,
  displayed,
  onCancel,
}: {
  chromatic: ChromaticState;
  displayed: ColoringResult;
  onCancel(): void;
}) {
  const theme = useTheme();
  const { value, badge, detail } = chromaticLabel(chromatic);
  const running = chromatic.status === 'running';
  const badgeColor = badge === 'Exacto' ? theme.success : badge === 'Cota superior' ? theme.warning : theme.textSecondary;
  const warning = colorsUsedWarning(displayed, chromatic);

  return (
    <ResultCard>
      <View style={styles.topRow}>
        <Text style={[styles.symbol, { color: theme.textSecondary }]}>χ(G)</Text>
        <View style={[styles.badge, { borderColor: badgeColor }]} accessibilityLiveRegion="polite">
          {running && <ActivityIndicator size="small" color={badgeColor} />}
          <Text style={[styles.badgeLabel, { color: badgeColor }]}>{badge}</Text>
        </View>
      </View>
      <Text style={[styles.value, { color: theme.text }]} accessibilityLabel={`Número cromático ${value}`}>
        {value}
      </Text>
      {detail && <Text style={[styles.detail, { color: theme.textSecondary }]}>{detail}</Text>}
      {running && (
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancelar la búsqueda exacta"
          style={({ pressed }) => [
            styles.cancel,
            { borderColor: theme.border },
            pressed && { backgroundColor: theme.backgroundSelected },
          ]}>
          <Text style={[styles.cancelLabel, { color: theme.text }]}>Cancelar</Text>
        </Pressable>
      )}
      <Text style={[styles.used, { color: theme.text }]}>
        Colores usados ({ALGORITHM_SHORT_LABELS[displayed.algorithm]}): {displayed.colorsUsed}
      </Text>
      {warning && <Text style={[styles.detail, { color: theme.warning }]}>{warning}</Text>}
    </ResultCard>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  symbol: { fontSize: 16, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  badgeLabel: { fontSize: 13, fontWeight: '700' },
  value: { fontSize: 44, lineHeight: 52, fontWeight: '800' },
  detail: { fontSize: 14, lineHeight: 20 },
  cancel: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  cancelLabel: { fontSize: 15, fontWeight: '700' },
  used: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
});
