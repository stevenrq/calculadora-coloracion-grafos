import Svg, { Circle, Line } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { Graph, Positions } from '@/lib/graph/types';

/** Radio del vértice como fracción del lado mayor del dibujo. */
const VERTEX_FRACTION = 0.06;

/** Dibujo estático y sin interacción. Usa viewBox: `fitViewport` limita la escala y no cabe en 64 px. */
export function GraphThumbnail({ graph, positions, size }: { graph: Graph; positions: Positions; size: number }) {
  const theme = useTheme();
  const points = graph.vertices.map((v) => positions[v]).filter((p) => p !== undefined);

  if (points.length === 0) return <Svg width={size} height={size} />;

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const side = Math.max(maxX - minX, maxY - minY, 1);
  const r = side * VERTEX_FRACTION;
  const pad = r * 2;
  const viewBox = `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;

  return (
    <Svg width={size} height={size} viewBox={viewBox}>
      {graph.edges.map(([a, b]) => {
        const p = positions[a];
        const q = positions[b];
        if (!p || !q) return null;
        return <Line key={`${a}|${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={theme.edge} strokeWidth={r * 0.45} />;
      })}
      {graph.vertices.map((v) => {
        const p = positions[v];
        if (!p) return null;
        return <Circle key={v} cx={p.x} cy={p.y} r={r} fill={theme.primary} />;
      })}
    </Svg>
  );
}
