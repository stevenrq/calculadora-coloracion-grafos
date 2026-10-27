import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SettingsButton } from '@/components/settings-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Cabecera de los editores: el control de modo (o un título) y Ajustes en una fila, y debajo los conteos del grafo.
 * Los conteos van en su propia línea: junto al control, en un teléfono de 360 dp les quedan unos 28 dp de ancho.
 */
export function EditorHeader({ counts, children }: { counts: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        {children}
        <SettingsButton />
      </View>
      <Text style={[styles.counts, { color: theme.textSecondary }]} numberOfLines={1}>
        {counts}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.one },
  // 48 dp en todos los modos (control de modo o título): la cabecera no cambia de alto al pasar de uno a otro.
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  counts: { fontSize: 12, lineHeight: 16, textAlign: 'right' },
});
