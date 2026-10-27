import { Fragment } from 'react';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { contrastText } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import { VERTEX_RADIUS } from '@/lib/geometry';
import type { Graph, Positions, VertexId } from '@/lib/graph/types';
import { fitLabel } from '@/lib/label';

/** Radio del vértice como fracción del lado mayor del dibujo. */
const VERTEX_FRACTION = 0.06;

/**
 * Dibujo estático y sin interacción. Usa viewBox: `fitViewport` limita la escala y no cabe en 64 px.
 * Con `vertexColors` pinta la coloración y con `showLabels` escribe el nombre de cada vértice (imagen para compartir).
 */
export function GraphThumbnail({
  graph,
  positions,
  size,
  vertexColors,
  showLabels = false,
}: {
  graph: Graph;
  positions: Positions;
  size: number;
  vertexColors?: Readonly<Record<VertexId, string>>;
  showLabels?: boolean;
}) {
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
        const fill = vertexColors?.[v] ?? theme.primary;
        // Las etiquetas se ajustan al radio del lienzo; aquí se escalan al radio de la miniatura.
        const label = showLabels ? fitLabel(v) : null;
        return (
          <Fragment key={v}>
            {/* Con colores, un borde separa los claros (amarillo) del fondo. */}
            <Circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill={fill}
              stroke={vertexColors ? theme.edge : undefined}
              strokeWidth={r * 0.08}
            />
            {label && (
              <SvgText
                x={p.x}
                y={p.y + label.fontSize * (r / VERTEX_RADIUS) * 0.35}
                fill={contrastText(fill)}
                fontSize={label.fontSize * (r / VERTEX_RADIUS)}
                fontWeight="600"
                textAnchor="middle">
                {label.text}
              </SvgText>
            )}
          </Fragment>
        );
      })}
    </Svg>
  );
}
