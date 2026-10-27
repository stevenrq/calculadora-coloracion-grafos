import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScheduleTable } from '@/components/precedence/schedule-table';
import { HighlightRow, ResultCard } from '@/components/results/result-card';
import { StepPlayer } from '@/components/results/step-player';
import { graphColor } from '@/constants/palette';
import { Spacing } from '@/constants/theme';
import type { usePrecedenceView } from '@/hooks/use-precedence-view';
import { useTheme } from '@/hooks/use-theme';
import { joinSpanish, plural } from '@/lib/format';
import { MAX_CRITICAL_PATHS } from '@/lib/precedence/critical-path';
import { formatDuration, pathLabel } from '@/lib/precedence/present';
import type { DurationUnit } from '@/lib/precedence/types';
import { issueMessage } from '@/lib/precedence/validate';

/** Contenido de la hoja de resultados de Precedencias. */
export function PrecedencePanel({
  view,
  unit,
  onShowBridge,
}: {
  view: ReturnType<typeof usePrecedenceView>;
  unit: DurationUnit;
  onShowBridge(): void;
}) {
  const theme = useTheme();
  const { analysis, target, steps } = view;

  if (!analysis.valid) {
    return (
      <ResultCard title="Errores">
        {analysis.issues.map((issue) => (
          <Text key={issueMessage(issue)} style={[styles.error, { color: theme.danger }]}>
            {issueMessage(issue)}
          </Text>
        ))}
        <Text style={[styles.body, { color: theme.textSecondary }]}>Corrige esto para calcular las etapas.</Text>
      </ResultCard>
    );
  }

  const { stages, schedule, missing } = analysis;
  return (
    <>
      <ResultCard title="Etapas">
        <Text style={[styles.big, { color: theme.text }]}>{plural(stages.stages.length, 'etapa', 'etapas')}</Text>
        {stages.stages.map((group, k) => {
          const active = target?.kind === 'stage' && target.stage === k + 1;
          return (
            <HighlightRow
              key={k}
              active={active}
              onPress={() => view.toggleTarget({ kind: 'stage', stage: k + 1 })}
              accessibilityLabel={`Etapa ${k + 1}: ${joinSpanish(group)}. ${active ? 'Quitar resaltado' : 'Resaltar en el grafo'}.`}>
              <View style={[styles.swatch, { backgroundColor: graphColor(k), borderColor: theme.edge }]} />
              <Text style={[styles.rowTitle, { color: theme.text }]}>Etapa {k + 1}</Text>
              <Text style={[styles.rowValue, { color: theme.text }]}>{group.join(', ')}</Text>
            </HighlightRow>
          );
        })}
      </ResultCard>

      <StepPlayer
        steps={steps}
        index={view.stepIndex}
        onIndexChange={view.changeStep}
        resetKey={view.key}
        swatchColor={(i) => {
          const stage = steps[i].stage;
          return stage === null ? undefined : graphColor(stage - 1);
        }}
      />

      <ResultCard title="Orden topológico">
        <Text style={[styles.body, { color: theme.text }]}>{stages.order.join(', ')}</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Iniciales: {stages.initial.join(', ')} · Finales: {stages.final.join(', ')}
        </Text>
      </ResultCard>

      <ResultCard title="Ruta crítica">
        {schedule ? (
          <>
            <Text style={[styles.big, { color: theme.text }]}>Duración total: {formatDuration(schedule.total, unit)}</Text>
            <HighlightRow
              active={target?.kind === 'critical'}
              onPress={() => view.toggleTarget({ kind: 'critical' })}
              accessibilityLabel={`${schedule.paths.length === 1 ? 'Ruta crítica' : 'Rutas críticas'}: ${schedule.paths.map(pathLabel).join('; ')}. Resaltar en el grafo.`}>
              <View style={styles.paths}>
                {schedule.paths.map((path) => (
                  <Text key={path.join()} style={[styles.rowValue, styles.path, { color: theme.primary }]}>
                    {pathLabel(path)}
                  </Text>
                ))}
              </View>
            </HighlightRow>
            {schedule.pathsTruncated && (
              <Text style={[styles.note, { color: theme.textSecondary }]}>
                Hay más rutas críticas; se muestran las primeras {MAX_CRITICAL_PATHS}.
              </Text>
            )}
            <ScheduleTable schedule={schedule} order={stages.order} />
          </>
        ) : (
          <Text style={[styles.body, { color: theme.text }]}>
            Agrega la duración de todas las actividades para calcular la ruta crítica. Faltan: {joinSpanish(missing)}.
          </Text>
        )}
      </ResultCard>

      <ResultCard title="Etapas como coloración">
        <Text style={[styles.body, { color: theme.text }]}>
          Las etapas también son una coloración del grafo sin direcciones. Compáralas con el número cromático.
        </Text>
        <Pressable
          onPress={onShowBridge}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && { opacity: 0.85 }]}>
          <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>Ver etapas como coloración</Text>
        </Pressable>
      </ResultCard>
    </>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  error: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', width: 72 },
  rowValue: { flex: 1, fontSize: 15, lineHeight: 22 },
  paths: { flex: 1, gap: Spacing.half },
  path: { fontWeight: '700' },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, paddingHorizontal: Spacing.four },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
});
