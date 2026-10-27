import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GraphThumbnail } from '@/components/graph-thumbnail';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { countsLabel, formatSavedDate, plural, sentences } from '@/lib/format';
import type { SavedGraph } from '@/state/saved-graphs';

const THUMBNAIL_SIZE = 64;

const MODULE_LABELS = { coloring: 'Coloración', precedence: 'Precedencias' } as const;

function savedCounts({ module, doc }: SavedGraph): string {
  const { vertices, edges } = doc.graph;
  if (module === 'coloring') return countsLabel(vertices.length, edges.length);
  return `${plural(vertices.length, 'actividad', 'actividades')} · ${plural(edges.length, 'precedencia', 'precedencias')}`;
}

/** Tarjeta de un grafo guardado: tocarla lo abre; el botón ⋮ abre el menú de acciones. */
export function SavedGraphCard({
  item,
  now,
  onOpen,
  onMore,
}: {
  item: SavedGraph;
  now: Date;
  onOpen(): void;
  onMore(): void;
}) {
  const theme = useTheme();
  const counts = savedCounts(item);
  const date = formatSavedDate(item.savedAt, now);
  const module = MODULE_LABELS[item.module];
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={sentences(item.name, module, counts, `Guardado: ${date}`)}
        style={({ pressed }) => [styles.main, pressed && { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.thumbnail, { backgroundColor: theme.canvas }]}>
          <GraphThumbnail graph={item.doc.graph} positions={item.doc.positions} size={THUMBNAIL_SIZE} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.detail, { color: theme.textSecondary }]} numberOfLines={2}>
            {module} · {counts}
          </Text>
          <Text style={[styles.date, { color: theme.textSecondary }]}>{date}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel={`Más acciones para ${item.name}`}
        hitSlop={4}
        style={({ pressed }) => [styles.more, pressed && { backgroundColor: theme.backgroundSelected }]}>
        <MaterialIcons name="more-vert" size={24} color={theme.text} />
      </Pressable>
    </View>
  );
}

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Menú modal de un guardado: Renombrar, Duplicar y Borrar. */
export function SavedGraphMenu({
  item,
  onRename,
  onDuplicate,
  onRemove,
  onClose,
}: {
  item: SavedGraph | null;
  onRename(): void;
  onDuplicate(): void;
  onRemove(): void;
  onClose(): void;
}) {
  const theme = useTheme();
  const option = (icon: IconName, label: string, onPress: () => void, danger = false) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <MaterialIcons name={icon} size={24} color={danger ? theme.danger : theme.text} />
      <Text style={[styles.optionLabel, { color: danger ? theme.danger : theme.text }]}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal visible={item !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar el menú">
        {/* Los toques dentro del menú no lo cierran. */}
        <Pressable style={[styles.menu, { backgroundColor: theme.background }]} onPress={() => {}} accessible={false}>
          <Text style={[styles.menuTitle, { color: theme.text }]} numberOfLines={1}>
            {item?.name}
          </Text>
          {option('edit', 'Renombrar', onRename)}
          {option('content-copy', 'Duplicar', onDuplicate)}
          {option('delete-outline', 'Borrar', onRemove, true)}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, overflow: 'hidden' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: Spacing.half },
  name: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  detail: { fontSize: 13, lineHeight: 18 },
  date: { fontSize: 12, lineHeight: 16 },
  more: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.two },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.four },
  menu: { borderRadius: 20, paddingVertical: Spacing.two, elevation: 8 },
  menuTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four },
  optionLabel: { fontSize: 16, fontWeight: '600' },
});
