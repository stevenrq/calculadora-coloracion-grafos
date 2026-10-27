import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Bloque común de la hoja de resultados. */
export function ResultCard({ title, children }: { title?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      {title && <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>}
      {children}
    </View>
  );
}

/** Fila tocable que resalta algo en el lienzo; el borde indica que está activa. */
export function HighlightRow({
  active,
  onPress,
  accessibilityLabel,
  children,
}: {
  active: boolean;
  onPress(): void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.row,
        { borderColor: active ? theme.primary : 'transparent' },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  title: { fontSize: 12, lineHeight: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    marginHorizontal: -Spacing.two,
    borderRadius: 12,
    borderWidth: 2,
  },
});
