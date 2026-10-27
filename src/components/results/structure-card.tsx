import { StyleSheet, Text } from 'react-native';

import { HighlightRow, ResultCard } from '@/components/results/result-card';
import { useTheme } from '@/hooks/use-theme';
import type { BipartiteResult } from '@/lib/analysis/bipartite';
import type { DegreeStats } from '@/lib/analysis/degrees';

const decimal = (n: number) => n.toFixed(2).replace('.', ',');

export function StructureCard({
  bipartite,
  componentCount,
  degrees,
  cycleHighlighted,
  onToggleCycle,
}: {
  bipartite: BipartiteResult;
  componentCount: number;
  degrees: DegreeStats;
  cycleHighlighted: boolean;
  onToggleCycle(): void;
}) {
  const theme = useTheme();
  const text = [styles.text, { color: theme.text }];

  return (
    <ResultCard title="Estructura">
      {bipartite.bipartite ? (
        <Text style={text}>
          <Text style={styles.strong}>Es bipartito:</Text> sus vértices se dividen en dos grupos sin aristas internas,
          así que χ ≤ 2 (König).
        </Text>
      ) : (
        <HighlightRow
          active={cycleHighlighted}
          onPress={onToggleCycle}
          accessibilityLabel={`No es bipartito: ciclo impar de ${bipartite.oddCycle.length} vértices. Toca para verlo.`}>
          <Text style={text}>
            <Text style={styles.strong}>No es bipartito:</Text> contiene un ciclo impar de {bipartite.oddCycle.length}{' '}
            vértices (toca para verlo), así que χ ≥ 3.
          </Text>
        </HighlightRow>
      )}
      <Text style={text}>
        <Text style={styles.strong}>Componentes conexas:</Text> {componentCount}
      </Text>
      <Text style={text}>
        <Text style={styles.strong}>Grados:</Text> mínimo {degrees.min}, máximo {degrees.max}, promedio{' '}
        {decimal(degrees.average)}
      </Text>
      <Text style={[styles.sequence, { color: theme.textSecondary }]}>
        Secuencia de grados: {degrees.sequence.join(', ')}
      </Text>
    </ResultCard>
  );
}

const styles = StyleSheet.create({
  text: { flex: 1, fontSize: 15, lineHeight: 22 },
  strong: { fontWeight: '700' },
  sequence: { fontSize: 13, lineHeight: 18 },
});
