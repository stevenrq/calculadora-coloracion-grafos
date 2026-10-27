import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { contrastText } from '@/constants/palette';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Notice } from '@/state/editor-reducer';

const NOTICE_DURATION_MS = 4000;
/** Superficie oscura de Material: se lee igual en tema claro y oscuro. */
const SNACKBAR_SURFACE = '#323232';
const SNACKBAR_ACTION = '#8AB4F8';

export function NoticeSnackbar({ notice, onUndo, onDismiss }: { notice: Notice | null; onUndo(): void; onDismiss(): void }) {
  const theme = useTheme();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(onDismiss, NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;

  const isError = notice.kind === 'error';
  const surface = isError ? theme.danger : SNACKBAR_SURFACE;
  const textColor = isError ? contrastText(theme.danger) : '#FFFFFF';

  return (
    <View
      style={[styles.snackbar, { backgroundColor: surface }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Text style={[styles.message, { color: textColor }]}>{notice.message}</Text>
      {notice.undoable && (
        <Pressable
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel="Deshacer"
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={[styles.actionLabel, { color: isError ? textColor : SNACKBAR_ACTION }]}>Deshacer</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    borderRadius: 8,
    elevation: 6,
  },
  message: { flex: 1, fontSize: 14, lineHeight: 20, paddingVertical: Spacing.two },
  action: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: 8 },
  pressed: { opacity: 0.6 },
  actionLabel: { fontSize: 14, fontWeight: '700' },
});
