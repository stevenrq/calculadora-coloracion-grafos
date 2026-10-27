import type { Activity, DurationUnit } from '@/lib/precedence/types';

export interface PrecedenceExample {
  id: string;
  name: string;
  description: string;
  unit: DurationUnit;
  activities: readonly Activity[];
}

const activity = (code: string, name: string, predecessors: string[], duration: number): Activity => ({
  code,
  name,
  predecessors,
  duration,
});

export const PRECEDENCE_EXAMPLES: readonly PrecedenceExample[] = [
  {
    id: 'homework',
    name: 'Tarea: plataforma para construir una casa',
    description: 'Las 13 actividades del proyecto de software: 8 etapas y ruta crítica de 14 semanas.',
    unit: 'semanas',
    // Apéndice A del diseño, tal cual.
    activities: [
      activity('A', 'Levantamiento de requisitos (entrevistas con constructores y clientes)', [], 2),
      activity('B', 'Planificación del proyecto (alcance, cronograma, presupuesto)', ['A'], 1),
      activity('C', 'Diseño de la arquitectura del software', ['B'], 2),
      activity('D', 'Diseño de interfaz UI/UX (prototipos de pantallas)', ['B'], 2),
      activity('E', 'Diseño de la base de datos (obras, etapas, materiales)', ['C'], 1),
      activity('F', 'Configuración del servidor en la nube', ['C'], 1),
      activity('G', 'Módulo de etapas de obra (cronograma y avance de la casa)', ['E'], 3),
      activity('H', 'Módulo de presupuesto y materiales', ['E'], 2),
      activity('I', 'Desarrollo de la interfaz de la app móvil', ['D'], 3),
      activity('J', 'Integración de módulos con la interfaz', ['G', 'H', 'I'], 2),
      activity('K', 'Pruebas del sistema', ['J', 'F'], 2),
      activity('L', 'Manual de usuario y capacitación', ['J'], 1),
      activity('M', 'Despliegue y entrega final', ['K', 'L'], 1),
    ],
  },
  {
    id: 'presentation',
    name: 'Preparar una exposición',
    description: 'Ejemplo corto de 6 actividades para explicar etapas y holgura.',
    unit: 'días',
    activities: [
      activity('A', 'Elegir el tema', [], 1),
      activity('B', 'Investigar el tema', ['A'], 3),
      activity('C', 'Diseñar las diapositivas', ['A'], 2),
      activity('D', 'Escribir el guion', ['B'], 2),
      activity('E', 'Preparar la demostración', ['B', 'C'], 1),
      activity('F', 'Ensayar la exposición', ['D', 'E'], 1),
    ],
  },
];

export function findPrecedenceExample(id: string): PrecedenceExample {
  const example = PRECEDENCE_EXAMPLES.find((e) => e.id === id);
  if (!example) throw new Error(`No existe el ejemplo de precedencias "${id}"`);
  return example;
}
