import type { Point } from '@/lib/graph/types';

/** Arista entre índices de vértices (los motores trabajan con arreglos, no con etiquetas). */
export type IndexEdge = readonly [number, number];

// Nota de rendimiento: estos ciclos corren en Hermes, que no tiene JIT. Por eso usan arreglos tipados, Math.sqrt en
// vez de Math.hypot y, en los ciclos internos, comparaciones en vez de llamadas a Math.min/Math.max (cada llamada
// cuesta en un intérprete: separar vértices pasó de 340 ms a 20 ms al quitarlas).

/**
 * Distancia más corta entre cada par de vértices (Floyd–Warshall), con el largo deseado de cada arista.
 * El grafo debe ser conexo. Devuelve una matriz plana n×n.
 */
export function graphDistances(n: number, edges: readonly IndexEdge[], lengths: readonly number[]): Float64Array {
  const dist = new Float64Array(n * n).fill(Infinity);
  for (let i = 0; i < n; i++) dist[i * n + i] = 0;
  edges.forEach(([a, b], e) => {
    const l = Math.min(dist[a * n + b], lengths[e]);
    dist[a * n + b] = l;
    dist[b * n + a] = l;
  });
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      const ik = dist[i * n + k];
      if (ik === Infinity) continue;
      for (let j = 0; j < n; j++) {
        const through = ik + dist[k * n + j];
        if (through < dist[i * n + j]) dist[i * n + j] = through;
      }
    }
  }
  return dist;
}

/** Generador pseudoaleatorio con semilla (mulberry32): mismos inicios en cada corrida. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mayorización de estrés (Gansner, Koren y North): busca que la distancia en el dibujo se parezca a la distancia
 * en el grafo (`dist`, matriz plana n×n). En grafos dispersos da dibujos ordenados y casi sin cruces.
 */
export function stressLayout(dist: Float64Array, init: readonly Point[], iterations = 200): Point[] {
  const n = init.length;
  const xs = Float64Array.from(init, (p) => p.x);
  const ys = Float64Array.from(init, (p) => p.y);
  // Peso 1/d² por par; se guardan también peso·distancia y la suma de pesos de cada fila para ahorrar cuentas.
  const weight = dist.map((d) => (d > 0 ? 1 / (d * d) : 0));
  const weightedDist = dist.map((d) => (d > 0 ? 1 / d : 0));
  const rowWeight = new Float64Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) rowWeight[i] += weight[i * n + j];
  for (let iter = 0; iter < iterations; iter++) {
    let maxMove = 0;
    for (let i = 0; i < n; i++) {
      let sx = 0;
      let sy = 0;
      const row = i * n;
      const xi = xs[i];
      const yi = ys[i];
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        let dx = xi - xs[j];
        let dy = yi - ys[j];
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1e-9) {
          dx = 1e-3 * (i - j);
          dy = 1e-3;
          d = Math.sqrt(dx * dx + dy * dy);
        }
        const w = weight[row + j];
        const pull = weightedDist[row + j] / d;
        sx += w * xs[j] + pull * dx;
        sy += w * ys[j] + pull * dy;
      }
      const x = sx / rowWeight[i];
      const y = sy / rowWeight[i];
      maxMove = Math.max(maxMove, Math.abs(x - xs[i]) + Math.abs(y - ys[i]));
      xs[i] = x;
      ys[i] = y;
    }
    if (maxMove < 0.5) break;
  }
  return Array.from(xs, (x, i) => ({ x, y: ys[i] }));
}

/**
 * Fruchterman–Reingold dentro de un marco de `width`×`height` centrado en el origen. El marco obliga a plegar los
 * caminos y ciclos largos para que el dibujo quepa. Con `startFrame`, las paredes empiezan ahí y se cierran poco a
 * poco hasta `frame` durante el primer 70 % de las iteraciones: el dibujo se pliega como un resorte, sin enredarse.
 */
export function forceLayout(
  edges: readonly IndexEdge[],
  init: readonly Point[],
  frame: { width: number; height: number },
  startFrame: { width: number; height: number } = frame,
): Point[] {
  const iterations = 200;
  const initialTemperature = frame.width / 8;
  const n = init.length;
  const xs = Float64Array.from(init, (p) => p.x);
  const ys = Float64Array.from(init, (p) => p.y);
  const k2 = (frame.width * frame.height) / n;
  const k = Math.sqrt(k2);
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);

  for (let iter = 0; iter < iterations; iter++) {
    const closing = Math.min(1, iter / (0.7 * iterations));
    const halfW = (startFrame.width + (frame.width - startFrame.width) * closing) / 2;
    const halfH = (startFrame.height + (frame.height - startFrame.height) * closing) / 2;
    fx.fill(0);
    fy.fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = xs[i] - xs[j];
        let dy = ys[i] - ys[j];
        if (dx === 0 && dy === 0) {
          dx = 0.01 * (i - j);
          dy = 0.01;
        }
        const d2 = dx * dx + dy * dy;
        // Repulsión k²/d en la dirección (dx, dy)/d: k²·(dx, dy)/d².
        const f = k2 / d2;
        fx[i] += dx * f;
        fy[i] += dy * f;
        fx[j] -= dx * f;
        fy[j] -= dy * f;
      }
    }
    for (const [a, b] of edges) {
      const dx = xs[a] - xs[b];
      const dy = ys[a] - ys[b];
      // Atracción d²/k en la dirección (dx, dy)/d: (dx, dy)·d/k.
      const f = Math.sqrt(dx * dx + dy * dy) / k;
      fx[a] -= dx * f;
      fy[a] -= dy * f;
      fx[b] += dx * f;
      fy[b] += dy * f;
    }
    const temperature = initialTemperature * (1 - iter / iterations);
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt(fx[i] * fx[i] + fy[i] * fy[i]);
      if (d === 0) continue;
      const step = Math.min(d, temperature) / d;
      xs[i] = Math.max(-halfW, Math.min(halfW, xs[i] + fx[i] * step));
      ys[i] = Math.max(-halfH, Math.min(halfH, ys[i] + fy[i] * step));
    }
  }
  return Array.from(xs, (x, i) => ({ x, y: ys[i] }));
}

/**
 * Repara el dibujo moviendo lo mínimo: aparta los vértices que una arista ajena roza a menos de `clearance` (si es
 * > 0) y separa los vértices a menos de `minSeparation`. Cada pasada termina separando vértices, porque encimarlos es
 * lo peor. Modifica `pos` y devuelve si quedó todo en regla (una pasada completa sin mover nada).
 */
export function separate(
  pos: Point[],
  edges: readonly IndexEdge[],
  minSeparation: number,
  clearance: number,
  passes = 30,
): boolean {
  const n = pos.length;
  const xs = Float64Array.from(pos, (p) => p.x);
  const ys = Float64Array.from(pos, (p) => p.y);
  let settled = false;
  for (let pass = 0; pass < passes && !settled; pass++) {
    settled = true;
    if (clearance > 0) {
      for (let e = 0; e < edges.length; e++) {
        const a = edges[e][0];
        const b = edges[e][1];
        // Rectángulo de la arista ampliado en `clearance`: un vértice fuera de él no puede estar cerca. Si un empujón
        // mueve la arista queda un poco desfasado, pero la pasada siguiente lo corrige.
        const loX = (xs[a] < xs[b] ? xs[a] : xs[b]) - clearance;
        const hiX = (xs[a] < xs[b] ? xs[b] : xs[a]) + clearance;
        const loY = (ys[a] < ys[b] ? ys[a] : ys[b]) - clearance;
        const hiY = (ys[a] < ys[b] ? ys[b] : ys[a]) + clearance;
        for (let v = 0; v < n; v++) {
          if (v === a || v === b || xs[v] < loX || xs[v] > hiX || ys[v] < loY || ys[v] > hiY) continue;
          const ex = xs[b] - xs[a];
          const ey = ys[b] - ys[a];
          const lengthSq = ex * ex + ey * ey;
          if (lengthSq === 0) continue;
          const t = Math.max(0, Math.min(1, ((xs[v] - xs[a]) * ex + (ys[v] - ys[a]) * ey) / lengthSq));
          let dx = xs[v] - (xs[a] + t * ex);
          let dy = ys[v] - (ys[a] + t * ey);
          let d = Math.sqrt(dx * dx + dy * dy);
          if (d >= clearance) continue;
          if (d < 1e-9) {
            // Justo sobre la arista: se aparta en perpendicular.
            dx = -ey;
            dy = ex;
            d = Math.sqrt(dx * dx + dy * dy);
          }
          // El vértice y la arista se reparten el empujón; la arista lo reparte entre sus extremos según t.
          const push = (clearance - d) / 2 + 0.01;
          const ux = (dx / d) * push;
          const uy = (dy / d) * push;
          xs[v] += ux;
          ys[v] += uy;
          xs[a] -= ux * (1 - t);
          ys[a] -= uy * (1 - t);
          xs[b] -= ux * t;
          ys[b] -= uy * t;
          settled = false;
        }
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = xs[j] - xs[i];
        let dy = ys[j] - ys[i];
        if (dx >= minSeparation || dx <= -minSeparation || dy >= minSeparation || dy <= -minSeparation) continue;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d >= minSeparation) continue;
        if (d < 1e-9) {
          dx = 1;
          dy = (i - j) * 1e-3;
          d = Math.sqrt(dx * dx + dy * dy);
        }
        const push = (minSeparation - d) / 2 + 0.01;
        xs[i] -= (dx / d) * push;
        ys[i] -= (dy / d) * push;
        xs[j] += (dx / d) * push;
        ys[j] += (dy / d) * push;
        settled = false;
      }
    }
  }
  for (let i = 0; i < n; i++) pos[i] = { x: xs[i], y: ys[i] };
  return settled;
}
