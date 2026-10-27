import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { saturationRows } from '@/lib/coloring/replay';
import type { ColoringStep } from '@/lib/coloring/types';
import type { VertexId } from '@/lib/graph/types';

/** Desplegable "Ver saturación" del paso actual de DSATUR (la primera fila es la elegida). */
export function SaturationTable({
  step,
  degrees,
}: {
  step: ColoringStep | undefined;
  degrees: Readonly<Record<VertexId, number>>;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  if (!step?.saturation) return null;
  const rows = saturationRows(step.saturation, degrees);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.disclosure}>
        <Text style={[styles.disclosureLabel, { color: theme.primary }]}>Ver saturación</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color={theme.primary} />
      </Pressable>
      {open && (
        <View style={[styles.table, { borderColor: theme.border }]}>
          <View style={[styles.tableRow, { backgroundColor: theme.backgroundSelected }]}>
            <Text style={[styles.cell, styles.headerCell, { color: theme.text }]}>Vértice</Text>
            <Text style={[styles.cell, styles.headerCell, { color: theme.text }]}>Saturación</Text>
            <Text style={[styles.cell, styles.headerCell, { color: theme.text }]}>Grado</Text>
          </View>
          {rows.map((row) => {
            const chosen = row.vertex === step.vertex;
            const color = chosen ? theme.primary : theme.text;
            return (
              <View key={row.vertex} style={[styles.tableRow, styles.bodyRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.cell, { color }, chosen && styles.headerCell]}>{row.vertex}</Text>
                <Text style={[styles.cell, { color }]}>{row.saturation}</Text>
                <Text style={[styles.cell, { color }]}>{row.degree}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  disclosure: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  disclosureLabel: { fontSize: 15, fontWeight: '700' },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  bodyRow: { borderTopWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, fontSize: 14 },
  headerCell: { fontWeight: '700' },
});
