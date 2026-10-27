import { useState } from 'react';
import { FlatList, type LayoutChangeEvent, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type AdjacencyMatrix, adjacencyMatrix, cellLabel } from '@/lib/graph/matrix';
import type { Graph, VertexId } from '@/lib/graph/types';
import { fitLabel } from '@/lib/label';

/** Celdas de 48 dp: objetivo táctil mínimo. */
const CELL = 48;

/**
 * Matriz de adyacencia editable: tocar una celda agrega o quita la arista. Los encabezados quedan fijos sin sincronizar
 * dos scrolls por el hilo de JS: la fila de encabezado está fuera de la lista vertical, y la columna de etiquetas se
 * traslada con el desplazamiento horizontal. Las filas están virtualizadas (con 60 × 60 solo se montan las visibles).
 */
export function AdjacencyMatrixView({
  graph,
  onToggle,
  emptyText,
}: {
  graph: Graph;
  onToggle(a: VertexId, b: VertexId): void;
  emptyText: string;
}) {
  const theme = useTheme();
  const [listHeight, setListHeight] = useState(0);
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });
  // Lo que debe quedar fijo a la izquierda se mueve lo mismo que se desplazó el contenido.
  const sticky = useAnimatedStyle(() => ({ transform: [{ translateX: scrollX.value }] }));

  if (graph.vertices.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{emptyText}</Text>
      </View>
    );
  }

  const m = adjacencyMatrix(graph);
  const directed = graph.directed;
  const extraColumns = directed ? 2 : 0;
  const width = CELL * (m.labels.length + 1 + extraColumns);
  const headerStyle: StyleProp<ViewStyle> = [styles.cell, { backgroundColor: theme.backgroundElement, borderColor: theme.border }];

  return (
    <View style={styles.screen}>
      <Text style={[styles.help, { color: theme.textSecondary }]}>
        {directed
          ? 'Fila → columna: la fila es predecesora de la columna. Toca una celda para agregar o quitar la flecha.'
          : 'Toca una celda para agregar o quitar la arista.'}
      </Text>
      <Animated.ScrollView horizontal onScroll={onScroll} scrollEventThrottle={16} style={styles.screen}>
        <View style={{ width }}>
          <View style={styles.row}>
            <Animated.View style={[headerStyle, styles.sticky, sticky]} />
            {m.labels.map((label) => (
              <HeaderCell key={label} label={label} style={headerStyle} />
            ))}
            {directed && (
              <>
                <HeaderCell label="Ent." style={headerStyle} accessibilityLabel="Grado de entrada" />
                <HeaderCell label="Sal." style={headerStyle} accessibilityLabel="Grado de salida" />
              </>
            )}
          </View>
          <View style={styles.screen} onLayout={(e: LayoutChangeEvent) => setListHeight(e.nativeEvent.layout.height)}>
            {listHeight > 0 && (
              <FlatList
                style={{ height: listHeight }}
                data={m.labels}
                keyExtractor={(label) => label}
                getItemLayout={(_, index) => ({ length: CELL, offset: CELL * index, index })}
                initialNumToRender={14}
                maxToRenderPerBatch={10}
                windowSize={5}
                renderItem={({ index }) => (
                  <MatrixRow
                    matrix={m}
                    row={index}
                    directed={directed}
                    onToggle={onToggle}
                    headerStyle={headerStyle}
                    sticky={sticky}
                  />
                )}
              />
            )}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function HeaderCell({
  label,
  style,
  accessibilityLabel,
}: {
  label: string;
  style: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const { text, fontSize } = fitLabel(label);
  return (
    // Con etiqueta propia ("Grado de entrada"), TalkBack la lee en vez del texto corto ("Ent.").
    <View style={style} accessible={accessibilityLabel !== undefined} accessibilityLabel={accessibilityLabel}>
      <Text style={[styles.headerText, { color: theme.text, fontSize: Math.min(fontSize, 15) }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function MatrixRow({
  matrix: m,
  row,
  directed,
  onToggle,
  headerStyle,
  sticky,
}: {
  matrix: AdjacencyMatrix;
  row: number;
  directed: boolean;
  onToggle(a: VertexId, b: VertexId): void;
  headerStyle: StyleProp<ViewStyle>;
  sticky: ReturnType<typeof useAnimatedStyle>;
}) {
  const theme = useTheme();
  const from = m.labels[row];
  const { text, fontSize } = fitLabel(from);
  return (
    <View style={styles.row}>
      <Animated.View style={[headerStyle, styles.sticky, sticky]}>
        <Text style={[styles.headerText, { color: theme.text, fontSize: Math.min(fontSize, 15) }]} numberOfLines={1}>
          {text}
        </Text>
      </Animated.View>
      {m.labels.map((to, col) => {
        const diagonal = col === row;
        const on = m.cells[row][col];
        return (
          <Pressable
            key={to}
            disabled={diagonal}
            onPress={() => onToggle(from, to)}
            accessibilityRole="button"
            accessibilityLabel={cellLabel(m, row, col, directed)}
            accessibilityState={{ disabled: diagonal, checked: on }}
            style={({ pressed }) => [
              styles.cell,
              { borderColor: theme.border, backgroundColor: on ? theme.primary : theme.background },
              pressed && { backgroundColor: theme.backgroundSelected },
            ]}>
            <Text style={[styles.value, { color: on ? theme.onPrimary : theme.textSecondary }]}>
              {diagonal ? '—' : on ? '1' : '0'}
            </Text>
          </Pressable>
        );
      })}
      {directed && (
        <>
          <DegreeCell value={m.inDegree[row]} label={`${from}: grado de entrada ${m.inDegree[row]}`} />
          <DegreeCell value={m.outDegree[row]} label={`${from}: grado de salida ${m.outDegree[row]}`} />
        </>
      )}
    </View>
  );
}

function DegreeCell({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.cell, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
      accessible
      accessibilityLabel={label}>
      <Text style={[styles.value, styles.degree, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  help: { fontSize: 13, lineHeight: 18, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  row: { flexDirection: 'row' },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Por encima de las celdas que pasan por debajo al desplazar en horizontal.
  sticky: { zIndex: 1 },
  headerText: { fontWeight: '700' },
  value: { fontSize: 16, fontWeight: '600' },
  degree: { fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  emptyText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
