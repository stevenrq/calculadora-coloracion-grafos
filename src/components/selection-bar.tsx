import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Selection } from '@/state/editor-reducer';

export function SelectionBar({
  selection,
  onRename,
  onDelete,
  directed = false,
}: {
  selection: Selection;
  onRename(): void;
  onDelete(): void;
  /** En Precedencias los vértices son actividades y las aristas, flechas. */
  directed?: boolean;
}) {
  const theme = useTheme();
  if (selection.kind === 'none') return null;

  const isVertex = selection.kind === 'vertex';
  const name = isVertex
    ? selection.id
    : `${selection.edge[0]}${directed ? ' → ' : '–'}${selection.edge[1]}`;
  const noun = isVertex ? (directed ? 'actividad' : 'vértice') : directed ? 'flecha' : 'arista';
  const title = `${noun[0].toUpperCase()}${noun.slice(1)} ${name}`;

  return (
    <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        {isVertex && (
          <Text style={[styles.hint, { color: theme.textSecondary }]} numberOfLines={1}>
            {directed ? 'Toca la actividad que depende de esta' : 'Toca otro vértice para unirlos'}
          </Text>
        )}
      </View>
      {isVertex && (
        <Pressable
          onPress={onRename}
          accessibilityRole="button"
          accessibilityLabel={directed ? `Cambiar el código de la actividad ${selection.id}` : `Renombrar el vértice ${selection.id}`}
          style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.backgroundSelected }]}>
          <MaterialIcons name="edit" size={20} color={theme.text} />
          <Text style={[styles.actionLabel, { color: theme.text }]}>Renombrar</Text>
        </Pressable>
      )}
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`Borrar ${noun === 'vértice' ? 'el' : 'la'} ${noun} ${name}`}
        style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.backgroundSelected }]}>
        <MaterialIcons name="delete-outline" size={20} color={theme.danger} />
        <Text style={[styles.actionLabel, { color: theme.danger }]}>Borrar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, paddingVertical: Spacing.two },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 18 },
  action: {
    minHeight: 48,
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  actionLabel: { fontSize: 14, fontWeight: '600' },
});
