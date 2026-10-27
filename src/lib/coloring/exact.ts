import { checkBipartite } from '@/lib/analysis/bipartite';
import { chromaticBounds } from '@/lib/analysis/bounds';
import { findMaximumClique } from '@/lib/analysis/clique';
import { undirectedAdjacency } from '@/lib/graph/graph';
import type { Graph, VertexId } from '@/lib/graph/types';
import { dsaturColoring } from './dsatur';
import { countColors } from './helpers';
import type { ColoringResult, ColoringStep } from './types';

export interface ExactProgress {
  k: number;
  nodesExplored: number;
}

export interface ExactSolution {
  chromaticNumber: number;
  /** Siempre con `algorithm: 'exact'`. */
  result: ColoringResult;
}

export interface ExactBounds {
  lower: number;
  upper: number;
  dsatur: ColoringResult;
}

/** Cota inferior (clique / ciclo impar) y superior (colores de DSATUR). */
export function exactBounds(g: Graph): ExactBounds {
  const dsatur = dsaturColoring(g);
  const { clique } = findMaximumClique(g);
  const { lower } = chromaticBounds(g, clique.length, checkBipartite(g).bipartite);
  return { lower, upper: dsatur.colorsUsed, dsatur };
}

/**
 * Número cromático exacto: prueba k = cota inferior, k+1, … < DSATUR con búsqueda en profundidad.
 * Es un generador para que quien lo ejecute pueda ceder el control a la interfaz entre trozos
 * (ver `runExact`): cada `nodesPerChunk` asignaciones hace `yield` con el progreso.
 */
export function* exactSearch(
  g: Graph,
  opts: { maxRecordedSteps?: number; nodesPerChunk?: number; bounds?: ExactBounds } = {},
): Generator<ExactProgress, ExactSolution, void> {
  const maxRecordedSteps = opts.maxRecordedSteps ?? 400;
  const nodesPerChunk = opts.nodesPerChunk ?? 2000;
  const start = Date.now();
  const { lower, upper, dsatur } = opts.bounds ?? exactBounds(g);
  const steps: ColoringStep[] = [];

  const solution = (k: number, coloring: Record<VertexId, number>, truncated: boolean): ExactSolution => ({
    chromaticNumber: k,
    result: {
      algorithm: 'exact',
      coloring,
      colorsUsed: countColors(coloring),
      steps,
      stepsTruncated: truncated,
      elapsedMs: Date.now() - start,
    },
  });

  if (lower === upper) {
    steps.push({ kind: 'info', message: `La cota inferior coincide con la coloración DSATUR: χ(G) = ${upper}.` });
    steps.push(...dsatur.steps);
    return solution(upper, { ...dsatur.coloring }, false);
  }

  const vertices = g.vertices;
  const n = vertices.length;
  const adjMap = undirectedAdjacency(g);
  const index = new Map(vertices.map((v, i) => [v, i]));
  const neighbors = vertices.map((v) => [...adjMap.get(v)!].map((w) => index.get(w)!));
  const degree = neighbors.map((ns) => ns.length);
  let nodes = 0;

  for (let k = lower; k < upper; k++) {
    steps.push({ kind: 'info', message: `Probando con ${k} colores…` });
    const attemptStart = steps.length;
    let truncated = false;
    let attemptNodes = 0;
    const color = new Array<number>(n).fill(-1);
    // seen[v][c] = cuántos vecinos de v tienen el color c; saturation[v] = colores distintos que ve v.
    const seen = vertices.map(() => new Array<number>(k).fill(0));
    const saturation = new Array<number>(n).fill(0);

    const record = (step: ColoringStep) => {
      if (steps.length - attemptStart < maxRecordedSteps) steps.push(step);
      else truncated = true;
    };
    const paint = (v: number, c: number, delta: 1 | -1) => {
      color[v] = delta === 1 ? c : -1;
      for (const w of neighbors[v]) {
        const before = seen[w][c];
        seen[w][c] += delta;
        if (before === 0 && delta === 1) saturation[w]++;
        if (before === 1 && delta === -1) saturation[w]--;
      }
    };
    // Vértice más restringido: mayor saturación, luego mayor grado, luego orden de entrada.
    const pick = () => {
      let best = -1;
      for (let v = 0; v < n; v++) {
        if (color[v] !== -1) continue;
        if (
          best === -1 ||
          saturation[v] > saturation[best] ||
          (saturation[v] === saturation[best] && degree[v] > degree[best])
        )
          best = v;
      }
      return best;
    };

    function* dfs(colored: number, maxUsed: number): Generator<ExactProgress, boolean, void> {
      if (colored === n) return true;
      const v = pick();
      // Romper simetrías: un color nuevo solo puede ser el siguiente al mayor ya usado.
      const limit = Math.min(k - 1, maxUsed + 1);
      for (let c = 0; c <= limit; c++) {
        if (seen[v][c] > 0) continue;
        nodes++;
        attemptNodes++;
        if (nodes % nodesPerChunk === 0) yield { k, nodesExplored: nodes };
        paint(v, c, 1);
        record({ kind: 'assign', vertex: vertices[v], color: c, message: `${vertices[v]} recibe el color ${c + 1}.` });
        if (yield* dfs(colored + 1, Math.max(maxUsed, c))) return true;
        paint(v, c, -1);
        record({ kind: 'unassign', vertex: vertices[v], message: `Retroceso: ${vertices[v]} pierde su color.` });
      }
      return false;
    }

    if (yield* dfs(0, -1)) {
      steps.push({ kind: 'info', message: `Con ${k} colores alcanza: χ(G) = ${k}.` });
      return solution(k, Object.fromEntries(vertices.map((v, i) => [v, color[i]])), truncated);
    }
    steps.length = attemptStart;
    steps.push({ kind: 'info', message: `k = ${k}: imposible (se exploraron ${attemptNodes} asignaciones).` });
  }

  steps.push({ kind: 'info', message: `Con ${upper - 1} colores no alcanza: χ(G) = ${upper}.` });
  steps.push(...dsatur.steps);
  return solution(upper, { ...dsatur.coloring }, false);
}

export function exactColoringSync(g: Graph): ExactSolution {
  const search = exactSearch(g);
  for (;;) {
    const r = search.next();
    if (r.done) return r.value;
  }
}
