import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  // T se infiere solo de `options`, así `onChange` acepta un setState del tipo exacto.
  value: NoInfer<T>;
  onChange(v: NoInfer<T>): void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            // 40 dp + el relleno de 4 dp del riel arriba y abajo = 48 dp; en horizontal pisaría al vecino.
            hitSlop={{ top: 4, bottom: 4 }}
            style={[styles.segment, selected && [styles.selected, { backgroundColor: theme.background }]]}>
            <Text
              style={[styles.label, { color: selected ? theme.text : theme.textSecondary }]}
              numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 24, padding: Spacing.one },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    // Los segmentos se reparten el ancho (flex 1): el relleno solo cuenta cuando el control se encoge.
    paddingHorizontal: Spacing.two,
  },
  selected: { elevation: 2 },
  label: { fontSize: 14, fontWeight: '700' },
});
