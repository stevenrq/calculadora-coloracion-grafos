import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ReactNode, useEffect } from 'react';
import { BackHandler, type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Alturas de la hoja como fracción del espacio disponible. */
export const SHEET_PEEK = 0.4;
const PEEK = SHEET_PEEK;
const EXPANDED = 0.85;
/** Soltarla por debajo de esta fracción de `peek` la cierra. */
const CLOSE_BELOW = 0.5;
const FLING_VELOCITY = 800;
const SPRING = { damping: 22, stiffness: 220 };

export function ResultsSheet({
  visible,
  onClose,
  actions,
  children,
}: {
  visible: boolean;
  onClose(): void;
  /** Botones extra de la cabecera, a la izquierda de cerrar (p. ej. compartir). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  if (!visible) return null;
  // Montar el cuerpo en cada apertura: arranca siempre en `peek`.
  return (
    <SheetBody onClose={onClose} actions={actions}>
      {children}
    </SheetBody>
  );
}

function SheetBody({ onClose, actions, children }: { onClose(): void; actions?: ReactNode; children: ReactNode }) {
  const theme = useTheme();
  const height = useSharedValue(0);
  const limits = useSharedValue({ peek: 0, expanded: 0 });
  const dragStart = useSharedValue(0);

  // En Android, "Atrás" cierra la hoja en vez de salir de la app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const available = e.nativeEvent.layout.height;
    const peek = available * PEEK;
    const expanded = available * EXPANDED;
    const firstLayout = limits.get().peek === 0;
    limits.set({ peek, expanded });
    height.set(firstLayout ? peek : Math.min(Math.max(height.get(), peek), expanded));
  };

  const pan = usePanGesture({
    onBegin: () => {
      'worklet';
      dragStart.set(height.get());
    },
    onUpdate: (e) => {
      'worklet';
      height.set(Math.min(limits.get().expanded, Math.max(0, dragStart.get() - e.translationY)));
    },
    onDeactivate: (e) => {
      'worklet';
      const { peek, expanded } = limits.get();
      const h = height.get();
      if (h < peek * CLOSE_BELOW || (e.velocityY > FLING_VELOCITY && h < peek)) {
        scheduleOnRN(onClose);
        return;
      }
      const middle = (peek + expanded) / 2;
      const target =
        e.velocityY < -FLING_VELOCITY ? expanded : e.velocityY > FLING_VELOCITY ? peek : h > middle ? expanded : peek;
      height.set(withSpring(target, SPRING));
    },
  });

  const tap = useTapGesture({
    onActivate: () => {
      'worklet';
      const { peek, expanded } = limits.get();
      height.set(withSpring(height.get() < (peek + expanded) / 2 ? expanded : peek, SPRING));
    },
  });

  const handleGesture = useExclusiveGestures(pan, tap);
  const sheetStyle = useAnimatedStyle(() => ({ height: height.get() }));

  return (
    <View style={styles.overlay} onLayout={handleLayout}>
      <Animated.View
        style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }, sheetStyle]}>
        <GestureDetector gesture={handleGesture}>
          <View
            style={styles.handleArea}
            accessible
            accessibilityLabel="Asa de la hoja de resultados: toca para expandirla o reducirla">
            <View style={[styles.grabber, { backgroundColor: theme.textSecondary }]} />
          </View>
        </GestureDetector>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Resultados</Text>
          <View style={styles.actions}>
            {actions}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar resultados y volver a editar"
              style={({ pressed }) => [styles.close, pressed && { backgroundColor: theme.backgroundSelected }]}>
              <MaterialIcons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // box-none: el lienzo de arriba sigue recibiendo zoom y desplazamiento.
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', pointerEvents: 'box-none' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 16,
  },
  handleArea: { height: 28, alignItems: 'center', justifyContent: 'center' },
  grabber: { width: 40, height: 5, borderRadius: 3, opacity: 0.5 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  content: { padding: Spacing.three, paddingTop: Spacing.one, gap: Spacing.three },
});
