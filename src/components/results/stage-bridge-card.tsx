import { StyleSheet, Text, View } from 'react-native';

import { ResultCard } from '@/components/results/result-card';
import { SegmentedControl } from '@/components/segmented-control';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ChromaticState, chromaticLabel } from '@/lib/coloring/present';
import { plural } from '@/lib/format';
import type { StageBridge } from '@/lib/precedence/bridge';
import { pathLabel } from '@/lib/precedence/present';

export type BridgePaint = 'stages' | 'optimal';

const PAINT_OPTIONS = [
  { value: 'stages', label: 'Por etapas' },
  { value: 'optimal', label: 'Óptima' },
] as const satisfies readonly { value: BridgePaint; label: string }[];

/** Las etapas de Precedencias como coloración, frente al número cromático, con el teorema que las une. */
export function StageBridgeCard({
  bridge,
  chromatic,
  paint,
  onPaintChange,
}: {
  bridge: StageBridge;
  chromatic: ChromaticState;
  paint: BridgePaint;
  onPaintChange(paint: BridgePaint): void;
}) {
  const theme = useTheme();
  const chi = chromaticLabel(chromatic);
  const n = bridge.longestPath.length;

  return (
    <ResultCard title="Etapas como coloración">
      <View style={styles.tiles}>
        <View style={[styles.tile, { backgroundColor: theme.background }]} accessible accessibilityLabel={`Etapas: ${plural(bridge.stageCount, 'color', 'colores')}`}>
          <Text style={[styles.tileLabel, { color: theme.textSecondary }]}>Etapas</Text>
          <Text style={[styles.tileValue, { color: theme.text }]}>{plural(bridge.stageCount, 'color', 'colores')}</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: theme.background }]} accessible accessibilityLabel={`Número cromático ${chi.value}, ${chi.badge}`}>
          <Text style={[styles.tileLabel, { color: theme.textSecondary }]}>χ(G)</Text>
          <Text style={[styles.tileValue, { color: theme.text }]}>{chi.value}</Text>
          <Text style={[styles.tileBadge, { color: theme.textSecondary }]}>{chi.badge}</Text>
        </View>
      </View>

      <SegmentedControl options={PAINT_OPTIONS} value={paint} onChange={onPaintChange} />

      <Text style={[styles.body, { color: theme.text }]}>
        • Toda flecha une actividades de etapas distintas, así que pintar cada etapa de un color da una coloración
        válida: número de etapas ≥ χ(G).
      </Text>
      <Text style={[styles.body, { color: theme.text }]}>
        • En esta orientación el camino más largo tiene {plural(n, 'actividad', 'actividades')} (
        {pathLabel(bridge.longestPath)}); por eso hay {plural(bridge.stageCount, 'etapa', 'etapas')}.
      </Text>
      <Text style={[styles.body, { color: theme.text }]}>
        • Teorema de Gallai–Hasse–Roy–Vitaver: χ(G) es el mínimo, entre todas las orientaciones sin ciclos de G, del
        número de vértices del camino más largo.
      </Text>
    </ResultCard>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: Spacing.two },
  tile: { flex: 1, borderRadius: 12, padding: Spacing.three, gap: Spacing.half },
  tileLabel: { fontSize: 13, fontWeight: '700' },
  tileValue: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  tileBadge: { fontSize: 12, lineHeight: 16 },
  body: { fontSize: 14, lineHeight: 21 },
});
