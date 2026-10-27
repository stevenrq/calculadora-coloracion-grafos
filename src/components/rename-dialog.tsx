import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isValidLabel } from '@/lib/graph/graph';
import { LIMITS } from '@/lib/graph/types';

export function RenameDialog({
  visible,
  initial,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  initial: string;
  onSubmit(to: string): void;
  onCancel(): void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      {/* Montar el formulario solo al abrir: así arranca siempre con la etiqueta actual. */}
      {visible && <RenameForm initial={initial} onSubmit={onSubmit} onCancel={onCancel} />}
    </Modal>
  );
}

function RenameForm({ initial, onSubmit, onCancel }: { initial: string; onSubmit(to: string): void; onCancel(): void }) {
  const theme = useTheme();
  const [text, setText] = useState(initial);
  const trimmed = text.trim();
  const valid = isValidLabel(trimmed);

  const submit = () => {
    if (valid) onSubmit(trimmed);
  };

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Renombrar vértice</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          autoFocus
          selectTextOnFocus
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={LIMITS.maxLabelLength}
          returnKeyType="done"
          accessibilityLabel="Nuevo nombre del vértice"
          style={[styles.input, { color: theme.text, borderColor: valid ? theme.primary : theme.danger }]}
        />
        <Text style={[styles.help, { color: valid ? theme.textSecondary : theme.danger }]}>
          Letras, dígitos o _ (máximo {LIMITS.maxLabelLength}).
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && { backgroundColor: theme.backgroundSelected }]}>
            <Text style={[styles.buttonLabel, { color: theme.primary }]}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={!valid}
            accessibilityRole="button"
            accessibilityState={{ disabled: !valid }}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
              !valid && styles.disabled,
            ]}>
            <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>Guardar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: { borderRadius: 20, padding: Spacing.four, gap: Spacing.two, elevation: 8 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  input: {
    minHeight: 48,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 18,
  },
  help: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.two },
  button: { minHeight: 48, minWidth: 96, alignItems: 'center', justifyContent: 'center', borderRadius: 24, paddingHorizontal: Spacing.three },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.38 },
});
