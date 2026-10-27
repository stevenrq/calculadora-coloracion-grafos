import { parseGraphText, type TextFormat } from '@/lib/graph/text';
import type { Graph, Point, Positions } from '@/lib/graph/types';

export interface ColoringExample {
  id: string;
  name: string;
  description: string;
  format: TextFormat;
  text: string;
  chromaticNumber: number;
  /** Posiciones normalizadas a [0,1]×[0,1] para que se vea como en los libros. */
  layout?: Positions;
}

/** Vértices repartidos en un círculo, empezando arriba y en sentido horario. */
function ring(labels: string[], radius: number, phase = 0): Record<string, Point> {
  return Object.fromEntries(
    labels.map((label, i) => {
      const angle = -Math.PI / 2 + phase + (2 * Math.PI * i) / labels.length;
      return [label, { x: 0.5 + radius * Math.cos(angle), y: 0.5 + radius * Math.sin(angle) }];
    }),
  );
}

const wheel = (rim: string[]): Positions => ({ O: { x: 0.5, y: 0.5 }, ...ring(rim, 0.45) });

export const COLORING_EXAMPLES: readonly ColoringExample[] = [
  {
    id: 'c4',
    name: 'Ciclo C₄',
    description: 'Un cuadrado: ciclo par, así que basta con 2 colores.',
    format: 'edges',
    text: 'A-B, B-C, C-D, D-A',
    chromaticNumber: 2,
  },
  {
    id: 'k3',
    name: 'Triángulo K₃',
    description: 'Tres vértices todos conectados: cada uno necesita su propio color.',
    format: 'edges',
    text: 'A-B, B-C, C-A',
    chromaticNumber: 3,
  },
  {
    id: 'k5',
    name: 'Completo K₅',
    description: 'Cinco vértices todos conectados entre sí: χ(Kₙ) = n.',
    format: 'edges',
    text: 'A-B, A-C, A-D, A-E, B-C, B-D, B-E, C-D, C-E, D-E',
    chromaticNumber: 5,
  },
  {
    id: 'c5',
    name: 'Pentágono C₅',
    description: 'Ciclo impar: no es bipartito y necesita 3 colores.',
    format: 'edges',
    text: 'A-B, B-C, C-D, D-E, E-A',
    chromaticNumber: 3,
  },
  {
    id: 'w6',
    name: 'Rueda W₆',
    description: 'Un centro unido a un ciclo de 6: el borde par usa 2 colores y el centro 1 más.',
    format: 'edges',
    text: 'O-A, O-B, O-C, O-D, O-E, O-F, A-B, B-C, C-D, D-E, E-F, F-A',
    chromaticNumber: 3,
    layout: wheel(['A', 'B', 'C', 'D', 'E', 'F']),
  },
  {
    id: 'k33',
    name: 'Bipartito completo K₃,₃',
    description: 'Dos grupos de 3 donde cada vértice se une con todos los del otro grupo.',
    format: 'edges',
    text: 'A-X, A-Y, A-Z, B-X, B-Y, B-Z, C-X, C-Y, C-Z',
    chromaticNumber: 2,
    layout: {
      A: { x: 0.15, y: 0.15 },
      B: { x: 0.5, y: 0.15 },
      C: { x: 0.85, y: 0.15 },
      X: { x: 0.15, y: 0.85 },
      Y: { x: 0.5, y: 0.85 },
      Z: { x: 0.85, y: 0.85 },
    },
  },
  {
    id: 'adjacency-sample',
    name: 'Ejemplo con lista de adyacencia',
    description: 'Escrito vértice por vértice con sus vecinos. Contiene un ciclo impar de 5.',
    format: 'adjacency',
    text: 'A: B, C\nB: A, D, E\nC: A, F\nD: B\nE: B, F\nF: C, E',
    chromaticNumber: 3,
  },
  {
    id: 'exams',
    name: 'Horario de exámenes',
    description: 'Materias como vértices; una arista indica que comparten estudiantes. Cada color es una franja horaria.',
    format: 'edges',
    text:
      'Cálculo-Física, Cálculo-Álgebra, Cálculo-Programación, Física-Química, Física-Álgebra, ' +
      'Álgebra-Estadística, Programación-Estadística, Programación-Inglés, Química-Inglés, Estadística-Inglés',
    chromaticNumber: 3,
  },
  {
    id: 'petersen',
    name: 'Grafo de Petersen',
    description: 'Famoso contraejemplo: 3-regular, sin triángulos y con χ = 3.',
    format: 'edges',
    text: 'A-B, B-C, C-D, D-E, E-A, A-F, B-G, C-H, D-I, E-J, F-H, H-J, J-G, G-I, I-F',
    chromaticNumber: 3,
    layout: { ...ring(['A', 'B', 'C', 'D', 'E'], 0.45), ...ring(['F', 'G', 'H', 'I', 'J'], 0.22) },
  },
  {
    id: 'tree',
    name: 'Árbol',
    description: 'Todo árbol con al menos una arista es bipartito: χ = 2.',
    format: 'edges',
    text: 'A-B, A-C, B-D, B-E, C-F, C-G',
    chromaticNumber: 2,
    layout: {
      A: { x: 0.5, y: 0.1 },
      B: { x: 0.25, y: 0.45 },
      C: { x: 0.75, y: 0.45 },
      D: { x: 0.1, y: 0.85 },
      E: { x: 0.38, y: 0.85 },
      F: { x: 0.62, y: 0.85 },
      G: { x: 0.9, y: 0.85 },
    },
  },
  {
    id: 'q3',
    name: 'Cubo Q₃',
    description: 'Los vértices y aristas de un cubo. Es bipartito: χ = 2.',
    format: 'edges',
    text: 'A-B, B-C, C-D, D-A, E-F, F-G, G-H, H-E, A-E, B-F, C-G, D-H',
    chromaticNumber: 2,
    layout: {
      A: { x: 0.1, y: 0.1 },
      B: { x: 0.9, y: 0.1 },
      C: { x: 0.9, y: 0.9 },
      D: { x: 0.1, y: 0.9 },
      E: { x: 0.32, y: 0.32 },
      F: { x: 0.68, y: 0.32 },
      G: { x: 0.68, y: 0.68 },
      H: { x: 0.32, y: 0.68 },
    },
  },
  {
    id: 'w5',
    name: 'Rueda W₅',
    description: 'Un centro unido a un ciclo impar de 5: el borde necesita 3 colores y el centro un 4.º.',
    format: 'edges',
    text: 'O-A, O-B, O-C, O-D, O-E, A-B, B-C, C-D, D-E, E-A',
    chromaticNumber: 4,
    layout: wheel(['A', 'B', 'C', 'D', 'E']),
  },
  {
    id: 'homework',
    name: 'Tarea: plataforma para construir una casa',
    description: 'El grafo de precedencia de 13 actividades, sin direcciones. Tiene un ciclo impar de 7: χ = 3.',
    format: 'edges',
    text: 'A-B, B-C, B-D, C-E, C-F, D-I, E-G, E-H, G-J, H-J, I-J, F-K, J-K, J-L, K-M, L-M',
    chromaticNumber: 3,
  },
];

export function exampleGraph(ex: ColoringExample): Graph {
  const { graph, errors } = parseGraphText(ex.text, ex.format, false);
  if (!graph) throw new Error(`Ejemplo inválido "${ex.id}": ${errors.map((e) => e.message).join(' ')}`);
  return graph;
}

export function findExample(id: string): ColoringExample {
  const ex = COLORING_EXAMPLES.find((e) => e.id === id);
  if (!ex) throw new Error(`No existe el ejemplo "${id}"`);
  return ex;
}
