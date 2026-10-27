import type { Edge, Graph, VertexId } from '@/lib/graph/types';
import type { Activity, ActivityInfo, ActivityInfoMap } from './types';

/** Lee las actividades del grafo dirigido: la flecha `[p, a]` dice que `p` es predecesora de `a`. */
export function toActivities(g: Graph, info: ActivityInfoMap = {}): Activity[] {
  // En el orden de las flechas: así se conserva cómo se escribieron (la tarea pone "J, F" para K).
  const incoming = new Map<VertexId, VertexId[]>(g.vertices.map((v) => [v, []]));
  for (const [p, a] of g.edges) incoming.get(a)?.push(p);
  return g.vertices.map((code) => ({
    code,
    name: info[code]?.name ?? '',
    predecessors: incoming.get(code) ?? [],
    duration: info[code]?.duration ?? null,
  }));
}

/** El grafo dirigido de unas actividades. Omite predecesoras inexistentes y autodependencias (no son aristas). */
export function graphFromActivities(acts: readonly Activity[]): { graph: Graph; info: Record<VertexId, ActivityInfo> } {
  const codes = new Set(acts.map((a) => a.code));
  const edges: Edge[] = acts.flatMap((a) =>
    a.predecessors.filter((p) => p !== a.code && codes.has(p)).map((p) => [p, a.code] as const),
  );
  const info = Object.fromEntries(acts.map((a) => [a.code, { name: a.name, duration: a.duration }]));
  return { graph: { directed: true, vertices: acts.map((a) => a.code), edges }, info };
}
