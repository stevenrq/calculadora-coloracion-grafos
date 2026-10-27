import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SegmentedControl } from '@/components/segmented-control';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PLAYBACK_SPEEDS, speedLabel } from '@/lib/coloring/replay';
import type { ThemePreference } from '@/state/settings';
import { useSettings } from '@/state/settings-context';

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
] as const satisfies readonly { value: ThemePreference; label: string }[];

const SPEED_OPTIONS = PLAYBACK_SPEEDS.map((speed) => ({ value: String(speed), label: speedLabel(speed) }));

/** Pantalla de Ajustes, a pantalla completa sobre la pestaña actual; atrás la cierra. */
export function SettingsSheet() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, update, open, setOpen } = useSettings();
  const close = () => setOpen(false);

  const changeSpeed = (value: string) => {
    const speed = PLAYBACK_SPEEDS.find((s) => String(s) === value);
    if (speed !== undefined) update({ speed });
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent>
      <View
        style={[
          styles.screen,
          { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            Ajustes
          </Text>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Cerrar ajustes"
            hitSlop={2}
            style={({ pressed }) => [styles.close, pressed && { backgroundColor: theme.backgroundSelected }]}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.section, { color: theme.textSecondary }]} accessibilityRole="header">
            Tema
          </Text>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={settings.theme}
            onChange={(value) => update({ theme: value })}
          />

          <Text style={[styles.section, { color: theme.textSecondary }]} accessibilityRole="header">
            Velocidad de la animación
          </Text>
          <SegmentedControl options={SPEED_OPTIONS} value={String(settings.speed)} onChange={changeSpeed} />
          <Text style={[styles.help, { color: theme.textSecondary }]}>
            Velocidad con la que empieza el paso a paso. En el reproductor se puede cambiar.
          </Text>

          <Text style={[styles.section, { color: theme.textSecondary }]} accessibilityRole="header">
            Grafo
          </Text>
          <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
            <SwitchRow
              label="Mostrar el número de color en los vértices"
              help="Ayuda a distinguir colores parecidos."
              value={settings.showColorNumbers}
              onChange={(showColorNumbers) => update({ showColorNumbers })}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SwitchRow
              label="Vibrar al crear vértices y aristas"
              help="Una vibración breve confirma cada vértice o arista nueva."
              value={settings.haptics}
              onChange={(haptics) => update({ haptics })}
            />
          </View>

          <Text style={[styles.footer, { color: theme.textSecondary }]}>
            ColorGrafos {Constants.expoConfig?.version ?? ''} · Funciona sin internet.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Fila entera tocable con su interruptor; TalkBack la lee como un solo interruptor. */
function SwitchRow({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: boolean;
  onChange(value: boolean): void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={help}
      accessibilityState={{ checked: value }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.help, { color: theme.textSecondary }]}>{help}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={value ? theme.onPrimary : theme.textSecondary}
        accessible={false}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  title: { flex: 1, fontSize: 28, lineHeight: 36, fontWeight: '700' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  section: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.three,
  },
  help: { fontSize: 13, lineHeight: 18 },
  group: { borderRadius: 16, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.three },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: { flex: 1, gap: Spacing.half },
  rowLabel: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  footer: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: Spacing.five },
});
