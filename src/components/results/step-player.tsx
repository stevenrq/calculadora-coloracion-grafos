import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Host, Slider } from '@expo/ui/jetpack-compose';
import { type ComponentProps, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ResultCard } from '@/components/results/result-card';
import { graphColor } from '@/constants/palette';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PLAYBACK_SPEEDS, saturationRows, speedLabel, stepIntervalMs } from '@/lib/coloring/replay';
import type { ColoringStep, ConcreteAlgorithm } from '@/lib/coloring/types';
import type { VertexId } from '@/lib/graph/types';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const DEFAULT_SPEED_INDEX = PLAYBACK_SPEEDS.indexOf(1);

function ControlButton({
  icon,
  label,
  onPress,
  disabled = false,
  primary = false,
}: {
  icon: IconName;
  label: string;
  onPress(): void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.control,
        primary && { backgroundColor: theme.primary },
        pressed && { opacity: 0.7 },
        disabled && styles.disabled,
      ]}>
      <MaterialIcons name={icon} size={primary ? 30 : 26} color={primary ? theme.onPrimary : theme.text} />
    </Pressable>
  );
}

export function StepPlayer({
  steps,
  truncated,
  index,
  onIndexChange,
  algorithm,
  degrees = {},
}: {
  steps: readonly ColoringStep[];
  truncated: boolean;
  index: number;
  onIndexChange(i: number): void;
  algorithm: ConcreteAlgorithm;
  /** Para la columna "Grado" de la tabla de saturación (solo DSATUR). */
  degrees?: Readonly<Record<VertexId, number>>;
}) {
  const theme = useTheme();
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);
  const [showSaturation, setShowSaturation] = useState(false);

  const last = steps.length - 1;
  const atStart = index <= -1;
  const atEnd = index >= last;
  const speed = PLAYBACK_SPEEDS[speedIndex];
  // Al llegar al final (también cuando un resaltado lo lleva ahí desde afuera) deja de contar como reproduciendo.
  const isPlaying = playing && !atEnd;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      const next = index + 1;
      onIndexChange(next);
      if (next >= last) setPlaying(false);
    }, stepIntervalMs(speed));
    return () => clearTimeout(timer);
  }, [isPlaying, index, last, speed, onIndexChange]);

  const togglePlay = () => {
    if (isPlaying) return setPlaying(false);
    if (atEnd) onIndexChange(-1);
    setPlaying(true);
  };
  const restart = () => {
    setPlaying(false);
    onIndexChange(-1);
  };
  const back = () => {
    setPlaying(false);
    onIndexChange(Math.max(-1, index - 1));
  };
  const forward = () => {
    setPlaying(false);
    onIndexChange(Math.min(last, index + 1));
  };
  const toEnd = () => {
    setPlaying(false);
    onIndexChange(last);
  };

  const step = index >= 0 ? steps[index] : undefined;
  const rows = algorithm === 'dsatur' && step?.saturation ? saturationRows(step.saturation, degrees) : null;

  return (
    <ResultCard title="Paso a paso">
      <View style={styles.message} accessibilityLiveRegion="polite">
        {step ? (
          <>
            <Text style={[styles.counter, { color: theme.textSecondary }]}>
              Paso {index + 1} de {steps.length}
            </Text>
            <View style={styles.messageRow}>
              {step.kind === 'assign' && step.color !== undefined && (
                <View style={[styles.swatch, { backgroundColor: graphColor(step.color), borderColor: theme.edge }]} />
              )}
              <Text style={[styles.text, { color: theme.text }]}>{step.message}</Text>
            </View>
          </>
        ) : (
          <Text style={[styles.text, { color: theme.text }]}>Pulsa reproducir para ver el algoritmo paso a paso.</Text>
        )}
      </View>

      <View style={styles.controls}>
        <ControlButton icon="replay" label="Reiniciar" onPress={restart} disabled={atStart} />
        <ControlButton icon="skip-previous" label="Atrás" onPress={back} disabled={atStart} />
        <ControlButton
          icon={isPlaying ? 'pause' : 'play-arrow'}
          label={isPlaying ? 'Pausa' : 'Reproducir'}
          onPress={togglePlay}
          disabled={steps.length === 0}
          primary
        />
        <ControlButton icon="skip-next" label="Siguiente" onPress={forward} disabled={atEnd} />
        <ControlButton icon="last-page" label="Ir al final" onPress={toEnd} disabled={atEnd} />
      </View>

      <View style={styles.speedRow}>
        <Text style={[styles.speedLabel, { color: theme.textSecondary }]}>Velocidad</Text>
        <Host matchContents={{ vertical: true }} style={styles.slider}>
          <Slider
            value={speedIndex}
            min={0}
            max={PLAYBACK_SPEEDS.length - 1}
            steps={PLAYBACK_SPEEDS.length - 2}
            onValueChange={(v) => setSpeedIndex(Math.round(v))}
            colors={{ thumbColor: theme.primary, activeTrackColor: theme.primary, inactiveTrackColor: theme.border }}
          />
        </Host>
        <Text style={[styles.speedValue, { color: theme.text }]}>{speedLabel(speed)}</Text>
      </View>

      {truncated && (
        <Text style={[styles.note, { color: theme.textSecondary }]}>Se omitieron pasos intermedios del backtracking.</Text>
      )}

      {rows && (
        <View>
          <Pressable
            onPress={() => setShowSaturation((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showSaturation }}
            style={styles.disclosure}>
            <Text style={[styles.disclosureLabel, { color: theme.primary }]}>Ver saturación</Text>
            <MaterialIcons name={showSaturation ? 'expand-less' : 'expand-more'} size={22} color={theme.primary} />
          </Pressable>
          {showSaturation && (
            <View style={[styles.table, { borderColor: theme.border }]}>
              <View style={[styles.tableRow, { backgroundColor: theme.backgroundSelected }]}>
                <Text style={[styles.cell, styles.headerCell, { color: theme.text }]}>Vértice</Text>
                <Text style={[styles.cell, styles.headerCell, { color: theme.text }]}>Saturación</Text>
                <Text style={[styles.cell, styles.headerCell, { color: theme.text }]}>Grado</Text>
              </View>
              {rows.map((row) => {
                const chosen = row.vertex === step?.vertex;
                const color = chosen ? theme.primary : theme.text;
                return (
                  <View key={row.vertex} style={[styles.tableRow, { borderTopColor: theme.border }, styles.bodyRow]}>
                    <Text style={[styles.cell, { color }, chosen && styles.headerCell]}>{row.vertex}</Text>
                    <Text style={[styles.cell, { color }]}>{row.saturation}</Text>
                    <Text style={[styles.cell, { color }]}>{row.degree}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ResultCard>
  );
}

const styles = StyleSheet.create({
  message: { minHeight: 48, gap: Spacing.half },
  counter: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, marginTop: 2 },
  text: { flex: 1, fontSize: 15, lineHeight: 22 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  control: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26 },
  disabled: { opacity: 0.35 },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  speedLabel: { fontSize: 13, fontWeight: '600' },
  slider: { flex: 1 },
  speedValue: { width: 48, textAlign: 'right', fontSize: 14, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  disclosure: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  disclosureLabel: { fontSize: 15, fontWeight: '700' },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  bodyRow: { borderTopWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, fontSize: 14 },
  headerCell: { fontWeight: '700' },
});
