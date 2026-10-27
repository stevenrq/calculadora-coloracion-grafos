import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Selection } from '@/state/editor-reducer';

export function SelectionBar({ selection, onRename, onDelete }: { selection: Selection; onRename(): void; onDelete(): void }) {
  const theme = useTheme();
  if (selection.kind === 'none') return null;

  const isVertex = selection.kind === 'vertex';
  const name = isVertex ? selection.id : `${selection.edge[0]}–${selection.edge[1]}`;
  const title = isVertex ? `Vértice ${name}` : `Arista ${name}`;

  return (
    <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
      <View style={styles.info}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        {isVertex && (
          <Text style={[styles.hint, { color: theme.textSecondary }]} numberOfLines={1}>
            Toca otro vértice para unirlos
          </Text>
        )}
      </View>
      {isVertex && (
        <Pressable
          onPress={onRename}
          accessibilityRole="button"
          accessibilityLabel={`Renombrar el vértice ${selection.id}`}
          style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.backgroundSelected }]}>
          <MaterialIcons name="edit" size={20} color={theme.text} />
          <Text style={[styles.actionLabel, { color: theme.text }]}>Renombrar</Text>
        </Pressable>
      )}
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={isVertex ? `Borrar el vértice ${name}` : `Borrar la arista ${name}`}
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
