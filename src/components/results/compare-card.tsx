import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ResultCard } from '@/components/results/result-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HeuristicId } from '@/lib/analysis/analyze';
import { compareRows, type CompareRow } from '@/lib/coloring/compare';
import type { ChromaticState } from '@/lib/coloring/present';
import type { AlgorithmId, ColoringResult } from '@/lib/coloring/types';
import { plural } from '@/lib/format';

/** Tabla plegable con los cinco algoritmos; tocar una fila aplica esa coloración. */
export function CompareCard({
  heuristics,
  chromatic,
  selected,
  onApply,
}: {
  heuristics: Record<HeuristicId, ColoringResult>;
  chromatic: ChromaticState;
  selected: AlgorithmId;
  onApply(id: AlgorithmId): void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <ResultCard title="Comparar algoritmos">
      {!open ? (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { borderColor: theme.primary },
            pressed && { backgroundColor: theme.backgroundSelected },
          ]}>
          <Text style={[styles.buttonLabel, { color: theme.primary }]}>Comparar los 5 algoritmos</Text>
        </Pressable>
      ) : (
        <View>
          <View style={[styles.row, styles.headerRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.header, styles.name, { color: theme.text }]}>Algoritmo</Text>
            <Text style={[styles.header, styles.number, { color: theme.text }]}>Colores</Text>
            <Text style={[styles.header, styles.number, { color: theme.text }]}>Pasos</Text>
            <Text style={[styles.header, styles.time, { color: theme.text }]}>Tiempo</Text>
          </View>
          {compareRows(heuristics, chromatic).map((row) => (
            <Row key={row.id} row={row} active={row.id === selected} onApply={onApply} />
          ))}
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Toca una fila para pintar esa coloración.</Text>
        </View>
      )}
    </ResultCard>
  );
}

function Row({ row, active, onApply }: { row: CompareRow; active: boolean; onApply(id: AlgorithmId): void }) {
  const theme = useTheme();
  const colors = row.colorsUsed === null ? '—' : String(row.colorsUsed);
  // "400+": el exacto omitió pasos intermedios y solo se cuentan los grabados.
  const steps = row.steps === null ? '—' : `${row.steps}${row.stepsTruncated ? '+' : ''}`;
  const stepsSummary = row.stepsTruncated ? `más de ${row.steps} pasos` : plural(row.steps ?? 0, 'paso', 'pasos');
  const summary =
    row.colorsUsed === null
      ? row.note ?? row.time
      : `${plural(row.colorsUsed, 'color', 'colores')}, ${stepsSummary}, ${row.time}${row.note ? `, ${row.note}` : ''}`;
  return (
    <Pressable
      onPress={() => onApply(row.id)}
      disabled={!row.applicable}
      accessibilityRole="button"
      accessibilityLabel={`${row.label}: ${summary}.${row.applicable ? ' Toca para aplicarlo.' : ''}`}
      accessibilityState={{ selected: active, disabled: !row.applicable }}
      style={({ pressed }) => [
        styles.row,
        styles.dataRow,
        { borderColor: active ? theme.primary : 'transparent' },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <View style={styles.name}>
        <Text style={[styles.label, { color: theme.text }]}>{row.label}</Text>
        {row.note && <Text style={[styles.note, { color: theme.textSecondary }]}>{row.note}</Text>}
      </View>
      <Text style={[styles.value, styles.number, { color: theme.text }]}>{colors}</Text>
      <Text style={[styles.value, styles.number, { color: theme.text }]}>{steps}</Text>
      <Text style={[styles.value, styles.time, { color: theme.textSecondary }]}>{row.time}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // Mismo sangrado que las filas (relleno + borde) para que las columnas queden alineadas.
  headerRow: { paddingBottom: Spacing.two, paddingHorizontal: Spacing.one + 1.5, borderBottomWidth: StyleSheet.hairlineWidth },
  dataRow: { minHeight: 48, paddingVertical: Spacing.one, paddingHorizontal: Spacing.one, borderWidth: 1.5, borderRadius: 10 },
  header: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  name: { flex: 1 },
  number: { width: 56, textAlign: 'center' },
  time: { width: 72, textAlign: 'right' },
  label: { fontSize: 15, fontWeight: '600' },
  note: { fontSize: 12, lineHeight: 16 },
  value: { fontSize: 15 },
  hint: { fontSize: 12, lineHeight: 16, marginTop: Spacing.two },
});
