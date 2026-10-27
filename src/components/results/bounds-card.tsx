import { StyleSheet, Text } from 'react-native';

import { HighlightRow, ResultCard } from '@/components/results/result-card';
import { useTheme } from '@/hooks/use-theme';
import type { Bounds } from '@/lib/analysis/bounds';
import { plural } from '@/lib/format';
import type { VertexId } from '@/lib/graph/types';

export function BoundsCard({
  clique,
  bounds,
  cliqueHighlighted,
  onToggleClique,
}: {
  clique: readonly VertexId[];
  bounds: Bounds;
  cliqueHighlighted: boolean;
  onToggleClique(): void;
}) {
  const theme = useTheme();
  const text = [styles.text, { color: theme.text }];

  return (
    <ResultCard title="Cotas">
      <HighlightRow
        active={cliqueHighlighted}
        onPress={onToggleClique}
        accessibilityLabel={`Cota inferior: clique de ${clique.length} vértices. Toca para resaltarla.`}>
        <Text style={text}>
          <Text style={styles.strong}>Cota inferior:</Text> el grafo contiene una clique de{' '}
          {plural(clique.length, 'vértice', 'vértices')}, y todos necesitan colores distintos.
        </Text>
      </HighlightRow>
      <Text style={text}>
        <Text style={styles.strong}>Cota superior Δ+1 = {bounds.deltaPlusOne}:</Text> un algoritmo voraz nunca necesita
        más de Δ+1 colores.
      </Text>
      <Text style={text}>
        <Text style={styles.strong}>Brooks:</Text> si un grafo conexo no es completo ni un ciclo impar, χ ≤ Δ. Aquí da χ
        ≤ {bounds.brooks}.
      </Text>
    </ResultCard>
  );
}

const styles = StyleSheet.create({
  text: { flex: 1, fontSize: 15, lineHeight: 22 },
  strong: { fontWeight: '700' },
});
