import type { VertexId } from '@/lib/graph/types';

export type DurationUnit = 'semanas' | 'días' | 'horas' | 'meses';

export const DURATION_UNITS: readonly DurationUnit[] = ['semanas', 'días', 'horas', 'meses'];
export const UNIT_SINGULAR: Record<DurationUnit, string> = { semanas: 'semana', días: 'día', horas: 'hora', meses: 'mes' };
export const DEFAULT_UNIT: DurationUnit = 'semanas';

export const NAME_MAX_LENGTH = 80;
export const MAX_DURATION = 9999;

/** Lo que el grafo no guarda de una actividad: el código es el vértice y las predecesoras son las flechas. */
export interface ActivityInfo {
  name: string;
  /** `null`: sin duración (no se puede calcular la ruta crítica). */
  duration: number | null;
}

export type ActivityInfoMap = Readonly<Record<VertexId, ActivityInfo>>;

export interface Activity {
  code: VertexId;
  name: string;
  predecessors: readonly VertexId[];
  duration: number | null;
}

export type PrecedenceIssue =
  | { kind: 'self-dependency'; code: VertexId }
  | { kind: 'unknown-predecessor'; code: VertexId; predecessor: VertexId }
  /** `[A, B, C]` es A → B → C → A (de la predecesora a la actividad). */
  | { kind: 'cycle'; cycle: readonly VertexId[] };
