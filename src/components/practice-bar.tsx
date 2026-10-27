import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { contrastText, GRAPH_COLORS } from '@/constants/palette';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Barra del modo "Colorea tú": paleta (con goma), Comprobar y Salir. `null` es la goma. */
export function PracticeBar({
  color,
  onColorChange,
  onCheck,
  onExit,
}: {
  color: number | null;
  onColorChange(color: number | null): void;
  onCheck(): void;
  onExit(): void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
        {GRAPH_COLORS.map((fill, i) => {
          const selected = color === i;
          return (
            <Pressable
              key={fill}
              onPress={() => onColorChange(i)}
              accessibilityRole="radio"
              accessibilityLabel={`Color ${i + 1}`}
              accessibilityState={{ selected }}
              style={[styles.swatchTarget, selected && { borderColor: theme.text }]}>
              <View style={[styles.swatch, { backgroundColor: fill }]}>
                <Text style={[styles.swatchNumber, { color: contrastText(fill) }]}>{i + 1}</Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => onColorChange(null)}
          accessibilityRole="radio"
          accessibilityLabel="Goma: quitar el color"
          accessibilityState={{ selected: color === null }}
          style={[styles.swatchTarget, color === null && { borderColor: theme.text }]}>
          <View style={[styles.swatch, styles.eraser, { borderColor: theme.border }]}>
            <MaterialIcons name="auto-fix-normal" size={20} color={theme.text} />
          </View>
        </Pressable>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          onPress={onExit}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.backgroundSelected }]}>
          <Text style={[styles.actionLabel, { color: theme.text }]}>Salir</Text>
        </Pressable>
        <Pressable
          onPress={onCheck}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, styles.primary, { backgroundColor: theme.primary }, pressed && { opacity: 0.85 }]}>
          <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>Comprobar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.two, gap: Spacing.two },
  swatches: { paddingHorizontal: Spacing.three, gap: Spacing.one, alignItems: 'center' },
  // 48 dp de objetivo; el borde marca el color elegido.
  swatchTarget: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchNumber: { fontSize: 14, fontWeight: '700' },
  eraser: { borderWidth: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, paddingHorizontal: Spacing.three },
  action: { minHeight: 48, minWidth: 96, borderRadius: 24, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  primary: {},
  actionLabel: { fontSize: 15, fontWeight: '700' },
});
