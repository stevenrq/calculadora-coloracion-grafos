import * as Sharing from 'expo-sharing';
import { type ComponentRef, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { GraphThumbnail } from '@/components/graph-thumbnail';
import { coloringColors, graphColor } from '@/constants/palette';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChromaticState } from '@/lib/coloring/present';
import { shareCardText } from '@/lib/coloring/share-card';
import type { ColoringResult } from '@/lib/coloring/types';
import type { Graph, Positions } from '@/lib/graph/types';

const DRAWING_SIZE = 260;

/**
 * Vista previa de la imagen y botón para compartirla como PNG con el menú de Android.
 * La tarjeta se captura tal como se ve: en pantalla, Android sí la dibuja (fuera de pantalla puede salir en blanco).
 */
export function ShareDialog({
  visible,
  graph,
  positions,
  result,
  chromatic,
  onClose,
  onError,
}: {
  visible: boolean;
  graph: Graph;
  positions: Positions;
  result: ColoringResult | null;
  chromatic: ChromaticState | null;
  onClose(): void;
  onError(message: string): void;
}) {
  const theme = useTheme();
  const card = useRef<ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  const ready = visible && result !== null && chromatic !== null;

  const share = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Compartir no está disponible');
      // Cerrar el menú de compartir sin elegir una app no es un error: la promesa se resuelve igual.
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir grafo coloreado' });
      onClose();
    } catch (error) {
      console.warn('No se pudo compartir la imagen', error);
      onError('No se pudo compartir la imagen.');
    } finally {
      setBusy(false);
    }
  };

  const text = ready ? shareCardText(graph, result, chromatic) : null;

  return (
    <Modal visible={ready} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: theme.background }]}>
          <Text style={[styles.dialogTitle, { color: theme.text }]} accessibilityRole="header">
            Compartir imagen
          </Text>
          {text && result && (
            // collapsable={false}: Android no debe aplanar la vista, o la captura sale vacía.
            <View
              ref={card}
              collapsable={false}
              style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
              accessible
              accessibilityLabel={[text.chromatic, text.used, ...text.legend.map((l) => l.text), text.more]
                .filter(Boolean)
                .join('. ')}>
              <Text style={[styles.brand, { color: theme.primary }]}>{text.title}</Text>
              <Text style={[styles.chromatic, { color: theme.text }]}>{text.chromatic}</Text>
              <View style={[styles.drawing, { backgroundColor: theme.canvas }]}>
                <GraphThumbnail
                  graph={graph}
                  positions={positions}
                  size={DRAWING_SIZE}
                  vertexColors={coloringColors(result.coloring)}
                  showLabels
                />
              </View>
              <Text style={[styles.used, { color: theme.textSecondary }]}>{text.used}</Text>
              <View style={styles.legend}>
                {text.legend.map((line) => (
                  <View key={line.color} style={styles.legendRow}>
                    <View style={[styles.swatch, { backgroundColor: graphColor(line.color), borderColor: theme.edge }]} />
                    <Text style={[styles.legendText, { color: theme.text }]} numberOfLines={2}>
                      {line.text}
                    </Text>
                  </View>
                ))}
                {text.more && <Text style={[styles.legendText, { color: theme.textSecondary }]}>{text.more}</Text>}
              </View>
            </View>
          )}
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              style={({ pressed }) => [styles.button, pressed && { backgroundColor: theme.backgroundSelected }]}>
              <Text style={[styles.buttonLabel, { color: theme.primary }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={share}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
                busy && styles.disabled,
              ]}>
              {busy ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Text style={[styles.buttonLabel, { color: theme.onPrimary }]}>Compartir</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.three },
  dialog: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three, elevation: 8 },
  dialogTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three, gap: Spacing.two },
  brand: { fontSize: 13, lineHeight: 18, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  chromatic: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  drawing: { alignSelf: 'center', borderRadius: 12, overflow: 'hidden' },
  used: { fontSize: 14, lineHeight: 20 },
  legend: { gap: Spacing.one },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  legendText: { flex: 1, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  button: {
    minHeight: 48,
    minWidth: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: Spacing.three,
  },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});
