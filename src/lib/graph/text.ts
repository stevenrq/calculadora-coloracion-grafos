import { isValidLabel, undirectedAdjacency } from './graph';
import { type Edge, type Graph, LIMITS, type VertexId } from './types';

export type TextFormat = 'edges' | 'adjacency';

/** `line` empieza en 1; 0 significa un problema de todo el texto (por ejemplo, límites). */
export interface ParseIssue {
  line: number;
  message: string;
}

export interface ParseResult {
  graph: Graph | null;
  errors: ParseIssue[];
  warnings: ParseIssue[];
}

const EDGE_SEPARATOR = /\s*(?:->|→|-)\s*|\s+/u;

const invalidLabel = (n: number, label: string) =>
  `Línea ${n}: '${label}' no es una etiqueta válida (usa letras, dígitos o _, máximo ${LIMITS.maxLabelLength} caracteres).`;

/** Acumula vértices y aristas en orden de aparición, sin aplicar límites hasta el final. */
class GraphBuilder {
  readonly vertices: VertexId[] = [];
  readonly edges: Edge[] = [];
  private readonly vertexSet = new Set<VertexId>();
  private readonly edgeKeys = new Set<string>();

  constructor(private readonly directed: boolean) {}

  addVertex(v: VertexId): void {
    if (this.vertexSet.has(v)) return;
    this.vertexSet.add(v);
    this.vertices.push(v);
  }

  /** Devuelve false si la arista ya existía (se fusiona). */
  addEdge(a: VertexId, b: VertexId): boolean {
    this.addVertex(a);
    this.addVertex(b);
    const key = this.directed || a < b ? `${a}>${b}` : `${b}>${a}`;
    if (this.edgeKeys.has(key)) return false;
    this.edgeKeys.add(key);
    this.edges.push([a, b]);
    return true;
  }
}

function parseEdgeLine(line: string, n: number, builder: GraphBuilder, errors: ParseIssue[], warnings: ParseIssue[]) {
  for (const raw of line.split(',')) {
    const token = raw.trim();
    if (token === '') continue;
    const parts = token.split(EDGE_SEPARATOR);
    if (parts.length > 2 || parts.some((p) => p === '')) {
      errors.push({ line: n, message: `Línea ${n}: no se entiende '${token}'.` });
      continue;
    }
    const invalid = parts.find((p) => !isValidLabel(p));
    if (invalid !== undefined) {
      errors.push({ line: n, message: invalidLabel(n, invalid) });
      continue;
    }
    if (parts.length === 1) {
      builder.addVertex(parts[0]);
      continue;
    }
    const [a, b] = parts;
    if (a === b) {
      errors.push({ line: n, message: `Línea ${n}: '${a}-${a}' es un lazo; no se permiten.` });
      continue;
    }
    if (!builder.addEdge(a, b)) {
      warnings.push({ line: n, message: `Línea ${n}: la arista ${a}-${b} está repetida; se fusionó.` });
    }
  }
}

function parseAdjacencyLine(
  line: string,
  n: number,
  builder: GraphBuilder,
  errors: ParseIssue[],
  warnings: ParseIssue[],
) {
  const trimmed = line.trim();
  if (trimmed === '') return;
  const colon = trimmed.indexOf(':');
  if (colon === -1) {
    errors.push({ line: n, message: `Línea ${n}: falta ':' después del vértice (ejemplo: A: B, C).` });
    return;
  }
  const head = trimmed.slice(0, colon).trim();
  if (!isValidLabel(head)) {
    errors.push({ line: n, message: invalidLabel(n, head) });
    return;
  }
  builder.addVertex(head);
  const seenInLine = new Set<VertexId>();
  for (const neighbor of trimmed.slice(colon + 1).split(/[\s,]+/u).filter(Boolean)) {
    if (!isValidLabel(neighbor)) {
      errors.push({ line: n, message: invalidLabel(n, neighbor) });
      continue;
    }
    if (neighbor === head) {
      errors.push({ line: n, message: `Línea ${n}: '${head}-${head}' es un lazo; no se permiten.` });
      continue;
    }
    if (seenInLine.has(neighbor)) {
      warnings.push({ line: n, message: `Línea ${n}: la arista ${head}-${neighbor} está repetida; se fusionó.` });
      continue;
    }
    seenInLine.add(neighbor);
    // La simetría entre líneas (A: B y B: A) es lo normal en este formato: se fusiona sin aviso.
    builder.addEdge(head, neighbor);
  }
}

export function parseGraphText(text: string, format: TextFormat, directed: boolean): ParseResult {
  const builder = new GraphBuilder(directed);
  const errors: ParseIssue[] = [];
  const warnings: ParseIssue[] = [];
  const parseLine = format === 'edges' ? parseEdgeLine : parseAdjacencyLine;

  text.split(/\r?\n/).forEach((line, i) => parseLine(line, i + 1, builder, errors, warnings));

  if (builder.vertices.length > LIMITS.maxVertices) {
    errors.push({
      line: 0,
      message: `El grafo tiene ${builder.vertices.length} vértices; el máximo es ${LIMITS.maxVertices}.`,
    });
  }
  if (builder.edges.length > LIMITS.maxEdges) {
    errors.push({ line: 0, message: `El grafo tiene ${builder.edges.length} aristas; el máximo es ${LIMITS.maxEdges}.` });
  }

  const graph = errors.length > 0 ? null : { directed, vertices: builder.vertices, edges: builder.edges };
  return { graph, errors, warnings };
}

export function graphToText(g: Graph, format: TextFormat): string {
  if (format === 'edges') {
    const arrow = g.directed ? '->' : '-';
    const connected = new Set(g.edges.flat());
    return [
      ...g.edges.map(([a, b]) => `${a}${arrow}${b}`),
      ...g.vertices.filter((v) => !connected.has(v)),
    ].join('\n');
  }
  const adjacency = undirectedAdjacency(g);
  return g.vertices
    .map((v) => {
      const neighbors = g.directed ? g.edges.filter(([a]) => a === v).map(([, b]) => b) : [...adjacency.get(v)!];
      return neighbors.length > 0 ? `${v}: ${neighbors.join(', ')}` : `${v}:`;
    })
    .join('\n');
}
