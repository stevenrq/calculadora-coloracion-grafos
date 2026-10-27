import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useSettingsOpen } from '@/state/settings-context';

/** Ícono de Ajustes para el extremo derecho de la cabecera de cada pestaña. */
export function SettingsButton() {
  const theme = useTheme();
  const { setOpen } = useSettingsOpen();
  return (
    <Pressable
      onPress={() => setOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Ajustes"
      // 44 dp + 2 de cada lado = 48 dp de objetivo táctil sin quitarle espacio a la cabecera.
      hitSlop={2}
      style={({ pressed }) => [styles.button, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <MaterialIcons name="settings" size={24} color={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
});
