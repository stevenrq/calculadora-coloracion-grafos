import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isValidLabel } from '@/lib/graph/graph';
import { LIMITS, type VertexId } from '@/lib/graph/types';
import { formatNumber, parseDuration } from '@/lib/precedence/present';
import { type Activity, type DurationUnit, MAX_DURATION, NAME_MAX_LENGTH } from '@/lib/precedence/types';

export interface ActivityInput {
  original: VertexId | null;
  code: VertexId;
  name: string;
  duration: number | null;
  predecessors: VertexId[];
}

/**
 * Formulario de una fila de la tabla. Con `activity` null crea una nueva con el código sugerido. Las predecesoras
 * se eligen tocando chips con los códigos de las demás actividades, sin escribir.
 */
export function ActivityDialog({
  visible,
  activity,
  suggestedCode,
  others,
  unit,
  onSave,
  onDelete,
  onCancel,
}: {
  visible: boolean;
  activity: Activity | null;
  suggestedCode: VertexId;
  /** Las demás actividades (posibles predecesoras). */
  others: readonly Activity[];
  unit: DurationUnit;
  onSave(input: ActivityInput): void;
  onDelete(code: VertexId): void;
  onCancel(): void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      {/* Montar el formulario solo al abrir: así arranca siempre con los datos de la fila. */}
      {visible && (
        <ActivityForm
          activity={activity}
          suggestedCode={suggestedCode}
          others={others}
          unit={unit}
          onSave={onSave}
          onDelete={onDelete}
          onCancel={onCancel}
        />
      )}
    </Modal>
  );
}

function ActivityForm({
  activity,
  suggestedCode,
  others,
  unit,
  onSave,
  onDelete,
  onCancel,
}: Omit<Parameters<typeof ActivityDialog>[0], 'visible'>) {
  const theme = useTheme();
  const [code, setCode] = useState(activity?.code ?? suggestedCode);
  const [name, setName] = useState(activity?.name ?? '');
  const [durationText, setDurationText] = useState(
    activity?.duration === null || activity?.duration === undefined ? '' : formatNumber(activity.duration),
  );
  const [predecessors, setPredecessors] = useState<VertexId[]>([...(activity?.predecessors ?? [])]);

  const trimmed = code.trim();
  const codeError = !isValidLabel(trimmed)
    ? `Usa letras, dígitos o _ (máximo ${LIMITS.maxLabelLength}).`
    : others.some((o) => o.code === trimmed)
      ? 'Ya existe una actividad con ese código.'
      : null;
  const duration = parseDuration(durationText);
  const durationError = duration === 'invalid' ? `Escribe un número entre 0 y ${MAX_DURATION}, o déjalo vacío.` : null;
  const valid = codeError === null && durationError === null;

  const togglePredecessor = (p: VertexId) =>
    setPredecessors((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]));
  const submit = () => {
    if (!valid || duration === 'invalid') return;
    onSave({ original: activity?.code ?? null, code: trimmed, name, duration, predecessors });
  };

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.text }]}>{activity ? 'Editar actividad' : 'Nueva actividad'}</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Código</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={LIMITS.maxLabelLength}
            accessibilityLabel="Código de la actividad"
            style={[styles.input, { color: theme.text, borderColor: codeError ? theme.danger : theme.border }]}
          />
          {codeError && <Text style={[styles.error, { color: theme.danger }]}>{codeError}</Text>}

          <Text style={[styles.label, { color: theme.textSecondary }]}>Actividad</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            multiline
            maxLength={NAME_MAX_LENGTH}
            placeholder="Ej.: Diseño de la base de datos"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Nombre de la actividad"
            style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.border }]}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>Duración ({unit})</Text>
          <TextInput
            value={durationText}
            onChangeText={setDurationText}
            keyboardType="decimal-pad"
            placeholder="Opcional"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={`Duración en ${unit}`}
            style={[styles.input, { color: theme.text, borderColor: durationError ? theme.danger : theme.border }]}
          />
          {durationError && <Text style={[styles.error, { color: theme.danger }]}>{durationError}</Text>}

          <Text style={[styles.label, { color: theme.textSecondary }]}>Predecesoras</Text>
          {others.length === 0 ? (
            <Text style={[styles.help, { color: theme.textSecondary }]}>Todavía no hay otras actividades.</Text>
          ) : (
            <View style={styles.chips}>
              {others.map((o) => {
                const selected = predecessors.includes(o.code);
                return (
                  <Pressable
                    key={o.code}
                    onPress={() => togglePredecessor(o.code)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${o.code}${o.name ? `: ${o.name}` : ''}`}
                    hitSlop={4}
                    style={[
                      styles.chip,
                      { borderColor: selected ? theme.primary : theme.border },
                      selected && { backgroundColor: theme.primary },
                    ]}>
                    <Text style={[styles.chipLabel, { color: selected ? theme.onPrimary : theme.text }]}>{o.code}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {activity && (
            <Pressable
              onPress={() => onDelete(activity.code)}
              accessibilityRole="button"
              accessibilityLabel={`Borrar la actividad ${activity.code}`}
              style={({ pressed }) => [styles.button, pressed && { backgroundColor: theme.backgroundSelected }]}>
              <Text style={[styles.buttonLabel, { color: theme.danger }]}>Borrar</Text>
            </Pressable>
          )}
          <View style={styles.spacer} />
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.three },
  card: { maxHeight: '90%', borderRadius: 20, elevation: 8, overflow: 'hidden' },
  form: { padding: Spacing.four, paddingBottom: Spacing.two, gap: Spacing.one },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700', marginBottom: Spacing.two },
  label: { fontSize: 13, fontWeight: '700', marginTop: Spacing.two },
  input: { minHeight: 48, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: Spacing.three, fontSize: 16 },
  multiline: { minHeight: 72, paddingVertical: Spacing.two, textAlignVertical: 'top' },
  error: { fontSize: 13, lineHeight: 18 },
  help: { fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  chip: { minWidth: 48, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1.5, paddingHorizontal: Spacing.three },
  chipLabel: { fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, paddingTop: Spacing.two },
  spacer: { flex: 1 },
  button: { minHeight: 48, minWidth: 88, alignItems: 'center', justifyContent: 'center', borderRadius: 24, paddingHorizontal: Spacing.three },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.38 },
});
