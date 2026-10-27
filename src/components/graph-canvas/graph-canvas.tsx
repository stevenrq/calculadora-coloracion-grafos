import { useEffect, useRef } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
  GestureDetector,
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { contrastText } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import {
  clampScale,
  EDGE_HIT_TOLERANCE,
  hitTestEdge,
  hitTestVertex,
  screenToWorld,
  VERTEX_HIT_RADIUS,
  VERTEX_RADIUS,
  type Viewport,
} from '@/lib/geometry';
import type { Edge, Point, VertexId } from '@/lib/graph/types';
import type { EditorAction, EditorDoc, Selection } from '@/state/editor-reducer';

export interface CanvasHighlight {
  vertices?: readonly VertexId[];
  edges?: readonly Edge[];
  tone: 'focus' | 'warning';
}

export interface GraphCanvasProps {
  doc: EditorDoc;
  selection: Selection;
  dispatch: (a: EditorAction) => void;
  /** false: solo zoom y desplazamiento. */
  editable: boolean;
  viewport: Viewport;
  onViewportChange: (vp: Viewport) => void;
  onLayout?: (size: { width: number; height: number }) => void;
  vertexColors?: Readonly<Record<VertexId, string>>;
  highlight?: CanvasHighlight;
}

/** Radio táctil mínimo en pantalla (48 dp de diámetro), sin importar el zoom. */
const MIN_TOUCH_RADIUS = 24;
const MIN_EDGE_TOUCH = 12;
const RING_GAP = 5;

type Drag = { kind: 'vertex'; id: VertexId; offset: Point } | { kind: 'pan' };

const vertexHitRadius = (vp: Viewport) => Math.max(VERTEX_HIT_RADIUS, MIN_TOUCH_RADIUS / vp.scale);
const edgeHitTolerance = (vp: Viewport) => Math.max(EDGE_HIT_TOLERANCE, MIN_EDGE_TOUCH / vp.scale);

function sameEdge(a: Edge, b: Edge, directed: boolean): boolean {
  if (a[0] === b[0] && a[1] === b[1]) return true;
  return !directed && a[0] === b[1] && a[1] === b[0];
}

function labelFontSize(label: string): number {
  if (label.length <= 2) return 15;
  if (label.length <= 4) return 12;
  return 10;
}

export function GraphCanvas({
  doc,
  selection,
  dispatch,
  editable,
  viewport,
  onViewportChange,
  onLayout,
  vertexColors,
  highlight,
}: GraphCanvasProps) {
  const theme = useTheme();

  // Los gestos leen estos valores en vivo: si sus callbacks cambiaran en cada cuadro,
  // RNGH re-enviaría la configuración al lado nativo durante el gesto.
  const live = useRef({ doc, editable, dispatch, onViewportChange });
  const vpRef = useRef(viewport);
  const drag = useRef<Drag | null>(null);
  const pinch = useRef<{ start: Viewport; focal: Point } | null>(null);

  useEffect(() => {
    live.current = { doc, editable, dispatch, onViewportChange };
  });
  useEffect(() => {
    // Durante un gesto manda vpRef (va por delante del estado); fuera de él, manda la pantalla (p. ej. al encuadrar).
    if (!drag.current && !pinch.current) vpRef.current = viewport;
  }, [viewport]);

  const setViewport = (vp: Viewport) => {
    vpRef.current = vp;
    live.current.onViewportChange(vp);
  };

  const tap = useTapGesture({
    runOnJS: true,
    enabled: editable,
    onActivate: (e) => {
      const { doc: d, dispatch: send } = live.current;
      const vp = vpRef.current;
      const p = screenToWorld({ x: e.x, y: e.y }, vp);
      const id = hitTestVertex(p, d.positions, d.graph.vertices, vertexHitRadius(vp));
      if (id) return send({ type: 'tapVertex', id });
      const edge = hitTestEdge(p, d.graph, d.positions, edgeHitTolerance(vp));
      if (edge) return send({ type: 'tapEdge', edge });
      send({ type: 'tapEmpty', point: p });
    },
  });

  const pan = usePanGesture({
    runOnJS: true,
    maxPointers: 1,
    minDistance: 8,
    onActivate: (e) => {
      const { doc: d, editable: canEdit, dispatch: send } = live.current;
      const vp = vpRef.current;
      const start = screenToWorld({ x: e.x - e.translationX, y: e.y - e.translationY }, vp);
      const id = canEdit ? hitTestVertex(start, d.positions, d.graph.vertices, vertexHitRadius(vp)) : null;
      const grabbed = id ? d.positions[id] : undefined;
      if (!id || !grabbed) {
        drag.current = { kind: 'pan' };
        return;
      }
      // Conservar el punto de agarre para que el vértice no salte bajo el dedo.
      const offset = { x: grabbed.x - start.x, y: grabbed.y - start.y };
      drag.current = { kind: 'vertex', id, offset };
      send({ type: 'dragStart' });
      const now = screenToWorld({ x: e.x, y: e.y }, vp);
      send({ type: 'dragMove', id, point: { x: now.x + offset.x, y: now.y + offset.y } });
    },
    onUpdate: (e) => {
      const current = drag.current;
      if (!current || pinch.current) return;
      const vp = vpRef.current;
      if (current.kind === 'vertex') {
        const p = screenToWorld({ x: e.x, y: e.y }, vp);
        live.current.dispatch({
          type: 'dragMove',
          id: current.id,
          point: { x: p.x + current.offset.x, y: p.y + current.offset.y },
        });
      } else {
        setViewport({ ...vp, tx: vp.tx + e.changeX, ty: vp.ty + e.changeY });
      }
    },
    onFinalize: () => {
      drag.current = null;
    },
  });

  const zoom = usePinchGesture({
    runOnJS: true,
    onActivate: (e) => {
      pinch.current = { start: vpRef.current, focal: { x: e.focalX, y: e.focalY } };
    },
    onUpdate: (e) => {
      const current = pinch.current;
      if (!current) return;
      const scale = clampScale(current.start.scale * e.scale);
      // El punto del mundo que estaba bajo el foco inicial sigue al foco actual: zoom y desplazamiento a la vez.
      const anchor = screenToWorld(current.focal, current.start);
      setViewport({ scale, tx: e.focalX - anchor.x * scale, ty: e.focalY - anchor.y * scale });
    },
    onFinalize: () => {
      pinch.current = null;
    },
  });

  const panOrTap = useExclusiveGestures(pan, tap);
  const gesture = useSimultaneousGestures(zoom, panOrTap);

  const { graph, positions } = doc;
  const selectedVertex = selection.kind === 'vertex' ? selection.id : null;
  const selectedEdge = selection.kind === 'edge' ? selection.edge : null;
  const highlightVertices = new Set(highlight?.vertices ?? []);
  const highlightEdges = highlight?.edges ?? [];
  const highlightColor = highlight?.tone === 'warning' ? theme.danger : theme.primary;
  const highlightDash = highlight?.tone === 'focus' ? '6 4' : undefined;
  const transform = `matrix(${viewport.scale} 0 0 ${viewport.scale} ${viewport.tx} ${viewport.ty})`;

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    onLayout?.({ width, height });
  };

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.canvas, { backgroundColor: theme.canvas }]} onLayout={handleLayout} collapsable={false}>
        <Svg width="100%" height="100%">
          <G transform={transform}>
            {graph.edges.map((edge) => {
              const a = positions[edge[0]];
              const b = positions[edge[1]];
              if (!a || !b) return null;
              const isSelected = selectedEdge !== null && sameEdge(edge, selectedEdge, graph.directed);
              const isHighlighted = highlightEdges.some((h) => sameEdge(edge, h, graph.directed));
              const stroke = isSelected ? theme.primary : isHighlighted ? highlightColor : theme.edge;
              return (
                <Line
                  key={`${edge[0]}|${edge[1]}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={stroke}
                  strokeWidth={isSelected ? 5 : isHighlighted ? 4 : 2.5}
                  strokeDasharray={isHighlighted && !isSelected ? highlightDash : undefined}
                  strokeLinecap="round"
                />
              );
            })}
            {graph.vertices.map((v) => {
              const p = positions[v];
              if (!p) return null;
              const fill = vertexColors?.[v] ?? theme.vertex;
              const fontSize = labelFontSize(v);
              return (
                <G key={v}>
                  {highlightVertices.has(v) && (
                    <Circle
                      cx={p.x}
                      cy={p.y}
                      r={VERTEX_RADIUS + RING_GAP}
                      fill="none"
                      stroke={highlightColor}
                      strokeWidth={highlight?.tone === 'warning' ? 4 : 3}
                      strokeDasharray={highlightDash}
                    />
                  )}
                  {selectedVertex === v && (
                    <Circle cx={p.x} cy={p.y} r={VERTEX_RADIUS + RING_GAP} fill="none" stroke={theme.primary} strokeWidth={4} />
                  )}
                  <Circle cx={p.x} cy={p.y} r={VERTEX_RADIUS} fill={fill} stroke={theme.edge} strokeWidth={2} />
                  <SvgText
                    x={p.x}
                    y={p.y + fontSize * 0.35}
                    fill={contrastText(fill)}
                    fontSize={fontSize}
                    fontWeight="600"
                    textAnchor="middle">
                    {v}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, overflow: 'hidden' },
});
