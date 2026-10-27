import type { Activity } from '../types';

export const act = (code: string, predecessors: string[] = [], duration: number | null = 1, name = ''): Activity => ({
  code,
  name,
  predecessors,
  duration,
});

/** La tarea del Apéndice A del diseño: predecesoras y duraciones en semanas. */
export const HOMEWORK: Activity[] = [
  act('A', [], 2),
  act('B', ['A'], 1),
  act('C', ['B'], 2),
  act('D', ['B'], 2),
  act('E', ['C'], 1),
  act('F', ['C'], 1),
  act('G', ['E'], 3),
  act('H', ['E'], 2),
  act('I', ['D'], 3),
  act('J', ['G', 'H', 'I'], 2),
  act('K', ['J', 'F'], 2),
  act('L', ['J'], 1),
  act('M', ['K', 'L'], 1),
];
