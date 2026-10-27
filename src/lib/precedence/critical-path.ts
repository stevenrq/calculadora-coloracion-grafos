import type { Edge, VertexId } from '@/lib/graph/types';
import type { Activity } from './types';

export interface ScheduleRow {
  /** Inicio y fin tempranos. */
  es: number;
  ef: number;
  /** Inicio y fin tardíos. */
  ls: number;
  lf: number;
  slack: number;
}

export interface Schedule {
  rows: Record<VertexId, ScheduleRow>;
  /** Duración total del proyecto. */
  total: number;
  /** Actividades con holgura 0, en orden topológico. */
  critical: VertexId[];
  /** Flechas `[p, a]` entre críticas en las que `a` empieza justo cuando termina `p`. */
  criticalEdges: Edge[];
  /** Todas las rutas críticas de principio a fin (hasta `MAX_CRITICAL_PATHS`). */
  paths: VertexId[][];
  pathsTruncated: boolean;
}

export const MAX_CRITICAL_PATHS = 20;

/** Redondea a 1e-9: con duraciones decimales, 0,1 + 0,2 debe dar 0,3 y una holgura de 1e-16 debe ser 0. */
const clean = (x: number) => Math.round(x * 1e9) / 1e9;

export function missingDurations(acts: readonly Activity[]): VertexId[] {
  return acts.filter((a) => a.duration === null).map((a) => a.code);
}

/**
 * Método de la ruta crítica: una pasada hacia adelante en orden topológico (inicio temprano = máximo fin temprano de
 * las predecesoras) y otra hacia atrás (fin tardío = mínimo inicio tardío de las sucesoras). `null` si falta alguna
 * duración. Precondición: `order` es un orden topológico de `acts`.
 */
export function criticalPath(acts: readonly Activity[], order: readonly VertexId[]): Schedule | null {
  if (missingDurations(acts).length > 0) return null;
  const byCode = new Map(acts.map((a) => [a.code, a]));
  const successors = new Map<VertexId, VertexId[]>(acts.map((a) => [a.code, []]));
  for (const code of order) for (const p of byCode.get(code)?.predecessors ?? []) successors.get(p)?.push(code);
  const duration = (code: VertexId) => byCode.get(code)?.duration ?? 0;

  const es: Record<VertexId, number> = {};
  const ef: Record<VertexId, number> = {};
  for (const code of order) {
    es[code] = Math.max(0, ...(byCode.get(code)?.predecessors ?? []).map((p) => ef[p]));
    ef[code] = clean(es[code] + duration(code));
  }
  const total = Math.max(0, ...order.map((code) => ef[code]));

  const rows: Record<VertexId, ScheduleRow> = {};
  for (const code of [...order].reverse()) {
    const next = successors.get(code) ?? [];
    const lf = next.length === 0 ? total : Math.min(...next.map((s) => rows[s].ls));
    const ls = clean(lf - duration(code));
    rows[code] = { es: es[code], ef: ef[code], ls, lf, slack: clean(ls - es[code]) };
  }

  const critical = order.filter((code) => rows[code].slack === 0);
  const isCritical = new Set(critical);
  const criticalEdges: Edge[] = [];
  for (const code of order) {
    for (const p of byCode.get(code)?.predecessors ?? []) {
      if (isCritical.has(p) && isCritical.has(code) && rows[p].ef === rows[code].es) criticalEdges.push([p, code]);
    }
  }

  // Una ruta va de una crítica sin flecha crítica que entre a una sin flecha crítica que salga. Con hitos de duración 0
  // no basta con mirar es = 0 o ef = total: un hito al inicio o al final comparte esos valores con su vecina.
  const criticalNext = new Map<VertexId, VertexId[]>(critical.map((code) => [code, []]));
  const hasCriticalIn = new Set<VertexId>();
  for (const [p, a] of criticalEdges) {
    criticalNext.get(p)?.push(a);
    hasCriticalIn.add(a);
  }
  const paths: VertexId[][] = [];
  let pathsTruncated = false;
  const walk = (path: VertexId[]) => {
    if (paths.length >= MAX_CRITICAL_PATHS) {
      pathsTruncated = true;
      return;
    }
    const next = criticalNext.get(path[path.length - 1]) ?? [];
    if (next.length === 0) {
      paths.push(path);
      return;
    }
    for (const a of next) walk([...path, a]);
  };
  for (const code of critical) if (!hasCriticalIn.has(code)) walk([code]);

  return { rows, total, critical, criticalEdges, paths, pathsTruncated };
}
