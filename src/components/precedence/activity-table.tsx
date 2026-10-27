import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { VertexId } from '@/lib/graph/types';
import { formatDuration, formatNumber } from '@/lib/precedence/present';
import { type Activity, DURATION_UNITS, type DurationUnit } from '@/lib/precedence/types';

const COLUMNS = { code: 44, predecessors: 86, duration: 60, stage: 44 } as const;

export function ActivityTable({
  activities,
  stageOf,
  critical,
  unit,
  onUnitChange,
  onEdit,
  onAdd,
  onLoadExample,
}: {
  activities: readonly Activity[];
  /** `null` mientras haya errores: la columna Etapa muestra "—". */
  stageOf: Readonly<Record<VertexId, number>> | null;
  /** Actividades de la ruta crítica, o `null` si no se puede calcular. */
  critical: ReadonlySet<VertexId> | null;
  unit: DurationUnit;
  onUnitChange(unit: DurationUnit): void;
  onEdit(code: VertexId): void;
  onAdd(): void;
  onLoadExample(): void;
}) {
  const theme = useTheme();

  if (activities.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Todavía no hay actividades.</Text>
        <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
          Agrega la primera o abre la tarea de 13 actividades.
        </Text>
        <AddButton onPress={onAdd} />
        <Pressable
          onPress={onLoadExample}
          accessibilityRole="button"
          style={({ pressed }) => [styles.outlined, { borderColor: theme.primary }, pressed && { backgroundColor: theme.backgroundSelected }]}>
          <Text style={[styles.outlinedLabel, { color: theme.primary }]}>Cargar ejemplo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.unitRow}>
        <Text style={[styles.unitLabel, { color: theme.textSecondary }]}>Duración en</Text>
        {DURATION_UNITS.map((u) => {
          const selected = u === unit;
          return (
            <Pressable
              key={u}
              onPress={() => onUnitChange(u)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Duración en ${u}`}
              hitSlop={6}
              style={[
                styles.unitChip,
                { borderColor: selected ? theme.primary : theme.border },
                selected && { backgroundColor: theme.primary },
              ]}>
              <Text style={[styles.unitChipLabel, { color: selected ? theme.onPrimary : theme.text }]}>{u}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.table, { borderColor: theme.border }]}>
        <View style={[styles.row, { backgroundColor: theme.backgroundSelected }]} accessibilityRole="header">
          <Text style={[styles.header, styles.code, { color: theme.text }]}>Código</Text>
          <Text style={[styles.header, styles.name, { color: theme.text }]}>Actividad</Text>
          <Text style={[styles.header, styles.predecessors, { color: theme.text }]}>Predecesoras</Text>
          <Text style={[styles.header, styles.duration, { color: theme.text }]}>Duración</Text>
          <Text style={[styles.header, styles.stage, { color: theme.text }]}>Etapa</Text>
        </View>
        {activities.map((a) => {
          const isCritical = critical?.has(a.code) ?? false;
          const stage = stageOf?.[a.code];
          const predecessors = a.predecessors.length > 0 ? a.predecessors.join(', ') : '—';
          const duration = a.duration === null ? '—' : formatNumber(a.duration);
          return (
            <Pressable
              key={a.code}
              onPress={() => onEdit(a.code)}
              accessibilityRole="button"
              accessibilityLabel={[
                `Actividad ${a.code}`,
                a.name || 'sin nombre',
                `predecesoras: ${a.predecessors.length > 0 ? a.predecessors.join(', ') : 'ninguna'}`,
                a.duration === null ? 'sin duración' : `duración ${formatDuration(a.duration, unit)}`,
                stage ? `etapa ${stage}` : 'sin etapa',
                isCritical ? 'en la ruta crítica' : '',
                'toca para editar',
              ]
                .filter(Boolean)
                .join(', ')}
              style={({ pressed }) => [
                styles.row,
                styles.bodyRow,
                { borderTopColor: theme.border, borderLeftColor: isCritical ? theme.primary : 'transparent' },
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}>
              <Text style={[styles.cell, styles.code, styles.codeText, { color: isCritical ? theme.primary : theme.text }]}>
                {a.code}
              </Text>
              <Text
                style={[styles.cell, styles.name, { color: a.name ? theme.text : theme.textSecondary }]}
                numberOfLines={3}>
                {a.name || 'Sin nombre'}
              </Text>
              <Text style={[styles.cell, styles.predecessors, { color: theme.text }]}>{predecessors}</Text>
              <Text style={[styles.cell, styles.duration, { color: theme.text }]}>{duration}</Text>
              <Text style={[styles.cell, styles.stage, styles.codeText, { color: theme.text }]}>{stage ?? '—'}</Text>
            </Pressable>
          );
        })}
      </View>

      {critical && (
        <View style={styles.legend}>
          <View style={[styles.legendBar, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Ruta crítica (holgura 0)</Text>
        </View>
      )}
      <AddButton onPress={onAdd} />
    </ScrollView>
  );
}

function AddButton({ onPress }: { onPress(): void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.add, { backgroundColor: theme.primary }, pressed && { opacity: 0.85 }]}>
      <MaterialIcons name="add" size={22} color={theme.onPrimary} />
      <Text style={[styles.addLabel, { color: theme.onPrimary }]}>Agregar actividad</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingTop: 0, gap: Spacing.three },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  unitLabel: { fontSize: 13, fontWeight: '600' },
  unitChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: 18, borderWidth: 1.5 },
  unitChipLabel: { fontSize: 13, fontWeight: '700' },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two, paddingRight: Spacing.one },
  bodyRow: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: 4 },
  header: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
  cell: { fontSize: 13, lineHeight: 18 },
  codeText: { fontSize: 15, fontWeight: '700' },
  code: { width: COLUMNS.code, textAlign: 'center' },
  name: { flex: 1, paddingRight: Spacing.one },
  predecessors: { width: COLUMNS.predecessors, paddingRight: Spacing.one },
  duration: { width: COLUMNS.duration, textAlign: 'center' },
  stage: { width: COLUMNS.stage, textAlign: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: -Spacing.one },
  legendBar: { width: 4, height: 18, borderRadius: 2 },
  legendText: { fontSize: 13 },
  add: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: 24,
    paddingHorizontal: Spacing.four,
    alignSelf: 'center',
  },
  addLabel: { fontSize: 15, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  emptyHint: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  outlined: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.four, borderRadius: 24, borderWidth: 1.5 },
  outlinedLabel: { fontSize: 15, fontWeight: '700' },
});
