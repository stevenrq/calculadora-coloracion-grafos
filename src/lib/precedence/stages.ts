import { joinSpanish, plural } from '@/lib/format';
import type { VertexId } from '@/lib/graph/types';
import type { Activity } from './types';

export interface StageStep {
  /** Etapa que se identifica en este paso (desde 1); `null` en el último paso, cuando ya no quedan actividades. */
  stage: number | null;
  /** Actividades de esa etapa (vacío en el último paso). */
  vertices: readonly VertexId[];
  message: string;
}

export interface StageAnalysis {
  /** `stages[k]`: actividades de la etapa k + 1, en el orden de la lista. */
  stages: VertexId[][];
  /** Etapa de cada actividad, desde 1. */
  stageOf: Record<VertexId, number>;
  /** Un orden topológico: las etapas una tras otra. */
  order: VertexId[];
  /** Sin predecesoras. */
  initial: VertexId[];
  /** No son predecesoras de ninguna otra. */
  final: VertexId[];
  /** El algoritmo de Kahn contado paso a paso, para el reproductor. */
  steps: StageStep[];
}

const verb = (items: readonly string[], one: string, many: string) => (items.length === 1 ? one : many);

/**
 * Etapas por niveles con el algoritmo de Kahn: la etapa 1 son las actividades sin predecesoras; al retirarlas, las
 * que quedan sin predecesoras forman la etapa 2, y así. Equivale a etapa = 1 + máx(etapa de sus predecesoras).
 * Precondición: las actividades son válidas (sin ciclos ni predecesoras inexistentes).
 */
export function computeStages(acts: readonly Activity[]): StageAnalysis {
  const pending = new Map(acts.map((a) => [a.code, new Set(a.predecessors)]));
  const successors = new Map<VertexId, VertexId[]>(acts.map((a) => [a.code, []]));
  for (const a of acts) for (const p of a.predecessors) successors.get(p)?.push(a.code);

  const stages: VertexId[][] = [];
  const placed = new Set<VertexId>();
  let ready = acts.filter((a) => a.predecessors.length === 0).map((a) => a.code);
  while (ready.length > 0) {
    stages.push(ready);
    for (const v of ready) {
      placed.add(v);
      for (const s of successors.get(v) ?? []) pending.get(s)?.delete(v);
    }
    ready = acts.filter((a) => !placed.has(a.code) && pending.get(a.code)?.size === 0).map((a) => a.code);
  }

  const stageOf: Record<VertexId, number> = {};
  stages.forEach((group, k) => group.forEach((v) => (stageOf[v] = k + 1)));

  const steps: StageStep[] = stages.map((group, k) =>
    k === 0
      ? {
          stage: 1,
          vertices: group,
          message: `Etapa 1: ${joinSpanish(group)} ${verb(group, 'no tiene', 'no tienen')} predecesoras.`,
        }
      : {
          stage: k + 1,
          vertices: group,
          message: `Se ${verb(stages[k - 1], 'retira', 'retiran')} ${joinSpanish(stages[k - 1])}; ahora ${joinSpanish(group)} ${verb(group, 'queda', 'quedan')} sin predecesoras → etapa ${k + 1}.`,
        },
  );
  if (stages.length > 0) {
    const last = stages[stages.length - 1];
    steps.push({
      stage: null,
      vertices: [],
      message: `Se ${verb(last, 'retira', 'retiran')} ${joinSpanish(last)}; no quedan actividades. Total: ${plural(stages.length, 'etapa', 'etapas')}.`,
    });
  }

  const hasSuccessor = new Set(acts.flatMap((a) => a.predecessors));
  return {
    stages,
    stageOf,
    order: stages.flat(),
    initial: acts.filter((a) => a.predecessors.length === 0).map((a) => a.code),
    final: acts.filter((a) => !hasSuccessor.has(a.code)).map((a) => a.code),
    steps,
  };
}

/**
 * Un camino con una actividad en cada etapa, de la primera a la última: el camino más largo del grafo. Termina en la
 * primera actividad de la última etapa y retrocede por la primera predecesora (en el orden de la lista) de la etapa
 * anterior.
 */
export function longestPath(acts: readonly Activity[], stageOf: Readonly<Record<VertexId, number>>): VertexId[] {
  const byCode = new Map(acts.map((a) => [a.code, a]));
  const order = new Map(acts.map((a, i) => [a.code, i]));
  const deepest = Math.max(0, ...Object.values(stageOf));
  let current = acts.find((a) => stageOf[a.code] === deepest);
  const path: VertexId[] = [];
  while (current) {
    path.unshift(current.code);
    const wanted = stageOf[current.code] - 1;
    const previous = [...current.predecessors]
      .filter((p) => stageOf[p] === wanted)
      .sort((x, y) => (order.get(x) ?? 0) - (order.get(y) ?? 0))[0];
    current = previous === undefined ? undefined : byCode.get(previous);
  }
  return path;
}
