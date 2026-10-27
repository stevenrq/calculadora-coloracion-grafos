import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { VertexId } from '@/lib/graph/types';
import type { Schedule } from '@/lib/precedence/critical-path';
import { formatNumber } from '@/lib/precedence/present';

const HEADERS = ['Act.', 'IT', 'FT', 'IL', 'FL', 'Holgura'] as const;

/** Tabla de inicios y fines tempranos/tardíos y holgura; las actividades críticas en negrita. */
export function ScheduleTable({ schedule, order }: { schedule: Schedule; order: readonly VertexId[] }) {
  const theme = useTheme();
  const critical = new Set(schedule.critical);
  return (
    <View style={styles.wrapper}>
      <View style={[styles.table, { borderColor: theme.border }]}>
        <View style={[styles.row, { backgroundColor: theme.backgroundSelected }]} accessibilityRole="header">
          {HEADERS.map((h, i) => (
            <Text key={h} style={[styles.cell, i === 5 && styles.wide, styles.bold, { color: theme.text }]}>
              {h}
            </Text>
          ))}
        </View>
        {order.map((code) => {
          const row = schedule.rows[code];
          const isCritical = critical.has(code);
          const color = isCritical ? theme.primary : theme.text;
          const values = [row.es, row.ef, row.ls, row.lf, row.slack].map(formatNumber);
          return (
            <View
              key={code}
              style={[styles.row, styles.bodyRow, { borderTopColor: theme.border }]}
              accessible
              accessibilityLabel={`${code}: inicio temprano ${values[0]}, fin temprano ${values[1]}, inicio tardío ${values[2]}, fin tardío ${values[3]}, holgura ${values[4]}${isCritical ? ', crítica' : ''}`}>
              <Text style={[styles.cell, styles.bold, { color }]}>{code}</Text>
              {values.map((v, i) => (
                <Text key={i} style={[styles.cell, i === 4 && styles.wide, isCritical && styles.bold, { color }]}>
                  {v}
                </Text>
              ))}
            </View>
          );
        })}
      </View>
      <Text style={[styles.note, { color: theme.textSecondary }]}>
        IT/FT: inicio y fin temprano · IL/FL: inicio y fin tardío
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.two },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', paddingVertical: Spacing.one + Spacing.half, paddingHorizontal: Spacing.two },
  bodyRow: { borderTopWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  wide: { flex: 1.6 },
  bold: { fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 16 },
});
