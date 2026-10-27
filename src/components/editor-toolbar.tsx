import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface ToolButtonProps {
  icon: IconName;
  label: string;
  accessibilityLabel: string;
  onPress(): void;
  disabled?: boolean;
  primary?: boolean;
}

function ToolButton({ icon, label, accessibilityLabel, onPress, disabled = false, primary = false }: ToolButtonProps) {
  const theme = useTheme();
  const color = primary ? theme.onPrimary : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        primary && [styles.primary, { backgroundColor: theme.primary }],
        pressed && { backgroundColor: primary ? theme.primary : theme.backgroundSelected, opacity: 0.85 },
        disabled && styles.disabled,
      ]}>
      <MaterialIcons name={icon} size={24} color={color} />
      <Text style={[styles.label, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </Pressable>
  );
}

export function EditorToolbar(props: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  /** Sin él no se muestra "Reorganizar" (p. ej. en la vista Tabla). */
  onRelayout?(): void;
  onClear(): void;
  /** Sin él no se muestra "Guardar". */
  onSave?(): void;
  saveDisabled?: boolean;
  /** Acción principal del módulo: Colorear, Analizar… */
  primary: { icon: IconName; label: string; accessibilityLabel: string; onPress(): void; disabled?: boolean };
}) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
      <ToolButton
        icon="undo"
        label="Deshacer"
        accessibilityLabel="Deshacer el último cambio"
        onPress={props.onUndo}
        disabled={!props.canUndo}
      />
      <ToolButton
        icon="redo"
        label="Rehacer"
        accessibilityLabel="Rehacer el cambio deshecho"
        onPress={props.onRedo}
        disabled={!props.canRedo}
      />
      {props.onRelayout && (
        <ToolButton
          icon="auto-fix-high"
          label="Reorganizar"
          accessibilityLabel="Reorganizar los vértices"
          onPress={props.onRelayout}
        />
      )}
      <ToolButton icon="delete-sweep" label="Limpiar" accessibilityLabel="Limpiar el grafo" onPress={props.onClear} />
      {props.onSave && (
        <ToolButton
          icon="save"
          label="Guardar"
          accessibilityLabel="Guardar el grafo en Mis grafos"
          onPress={props.onSave}
          disabled={props.saveDisabled}
        />
      )}
      <ToolButton {...props.primary} primary />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    flex: 1,
    minHeight: 56,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: Spacing.half,
  },
  primary: { flex: 1.3 },
  disabled: { opacity: 0.38 },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '600', marginTop: Spacing.half },
});
