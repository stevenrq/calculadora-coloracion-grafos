import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cleanName, NAME_MAX } from '@/state/saved-graphs';

/** Diálogo para poner nombre a un grafo guardado (al guardar o al renombrar). */
export function NameDialog({
  visible,
  title,
  initial,
  confirmLabel,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  title: string;
  initial: string;
  confirmLabel: string;
  onSubmit(name: string): void;
  onCancel(): void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      {/* Montar el formulario solo al abrir: así arranca siempre con el nombre sugerido. */}
      {visible && (
        <NameForm title={title} initial={initial} confirmLabel={confirmLabel} onSubmit={onSubmit} onCancel={onCancel} />
      )}
    </Modal>
  );
}

function NameForm({
  title,
  initial,
  confirmLabel,
  onSubmit,
  onCancel,
}: {
  title: string;
  initial: string;
  confirmLabel: string;
  onSubmit(name: string): void;
  onCancel(): void;
}) {
  const theme = useTheme();
  // El campo corta en NAME_MAX lo que se le da: el estado arranca igual, no con un texto más largo que no se ve.
  const [text, setText] = useState(initial.slice(0, NAME_MAX));
  const name = cleanName(text);
  const valid = name !== null;

  const submit = () => {
    if (name !== null) onSubmit(name);
  };

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          autoFocus
          selectTextOnFocus
          autoCapitalize="sentences"
          maxLength={NAME_MAX}
          returnKeyType="done"
          accessibilityLabel="Nombre del grafo"
          style={[styles.input, { color: theme.text, borderColor: valid ? theme.primary : theme.danger }]}
        />
        <Text style={[styles.help, { color: valid ? theme.textSecondary : theme.danger }]}>
          {valid ? `Máximo ${NAME_MAX} caracteres.` : `Escribe un nombre de 1 a ${NAME_MAX} caracteres.`}
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
            <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>{confirmLabel}</Text>
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
