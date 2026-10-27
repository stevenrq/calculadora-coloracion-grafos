import type { VertexId } from '@/lib/graph/types';
import type { Activity, PrecedenceIssue } from './types';

/**
 * Un ciclo de dependencias, en el sentido predecesora → actividad, o `null`. Recorre en profundidad en el orden de
 * la lista y rota el ciclo para que empiece por su actividad que aparece primero. Ignora autodependencias y
 * predecesoras inexistentes: esos errores se informan aparte.
 */
export function findCycle(acts: readonly Activity[]): VertexId[] | null {
  const index = new Map(acts.map((a, i) => [a.code, i]));
  // Sucesoras de cada actividad: si p es predecesora de a, hay una flecha p → a.
  const successors = new Map<VertexId, VertexId[]>(acts.map((a) => [a.code, []]));
  for (const a of acts) {
    for (const p of a.predecessors) if (p !== a.code && index.has(p)) successors.get(p)?.push(a.code);
  }
  for (const list of successors.values()) list.sort((x, y) => (index.get(x) ?? 0) - (index.get(y) ?? 0));

  const state = new Map<VertexId, 'open' | 'done'>();
  const stack: VertexId[] = [];
  const visit = (v: VertexId): VertexId[] | null => {
    state.set(v, 'open');
    stack.push(v);
    for (const next of successors.get(v) ?? []) {
      if (state.get(next) === 'open') return stack.slice(stack.indexOf(next));
      if (!state.has(next)) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(v, 'done');
    return null;
  };

  for (const a of acts) {
    if (state.has(a.code)) continue;
    const cycle = visit(a.code);
    if (cycle) {
      const first = cycle.reduce((best, v, i) => ((index.get(v) ?? 0) < (index.get(cycle[best]) ?? 0) ? i : best), 0);
      return [...cycle.slice(first), ...cycle.slice(0, first)];
    }
  }
  return null;
}

export function validateActivities(acts: readonly Activity[]): PrecedenceIssue[] {
  const codes = new Set(acts.map((a) => a.code));
  const issues: PrecedenceIssue[] = [];
  for (const a of acts) {
    for (const p of a.predecessors) {
      if (p === a.code) issues.push({ kind: 'self-dependency', code: a.code });
      else if (!codes.has(p)) issues.push({ kind: 'unknown-predecessor', code: a.code, predecessor: p });
    }
  }
  const cycle = findCycle(acts);
  if (cycle) issues.push({ kind: 'cycle', cycle });
  return issues;
}

export function issueMessage(issue: PrecedenceIssue): string {
  switch (issue.kind) {
    case 'cycle':
      return `${[...issue.cycle, issue.cycle[0]].join(' → ')}: una actividad no puede depender de sí misma, directa o indirectamente.`;
    case 'self-dependency':
      return `${issue.code} → ${issue.code}: una actividad no puede ser su propia predecesora.`;
    case 'unknown-predecessor':
      return `${issue.code} tiene como predecesora a ${issue.predecessor}, que no existe.`;
  }
}
