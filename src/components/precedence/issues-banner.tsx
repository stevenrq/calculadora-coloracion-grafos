import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PrecedenceIssue } from '@/lib/precedence/types';
import { issueMessage } from '@/lib/precedence/validate';

/** Errores de las precedencias (ciclos, autodependencias…): mientras existan, no se calculan etapas. */
export function IssuesBanner({ issues }: { issues: readonly PrecedenceIssue[] }) {
  const theme = useTheme();
  if (issues.length === 0) return null;
  return (
    <View
      style={[styles.banner, { backgroundColor: theme.backgroundElement, borderLeftColor: theme.danger }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      {issues.map((issue) => (
        <Text key={issueMessage(issue)} style={[styles.message, { color: theme.danger }]}>
          {issueMessage(issue)}
        </Text>
      ))}
      <Text style={[styles.note, { color: theme.textSecondary }]}>Corrige esto para calcular las etapas.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: Spacing.one,
  },
  message: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18 },
});
