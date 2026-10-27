import { WORLD_BOX } from '@/lib/geometry';
import { layeredLayout } from '@/lib/layout/layered';
import { autoLayout, fromNormalized } from '@/lib/layout/layouts';
import { analyzePrecedence } from '@/lib/precedence/analyze';
import { graphFromActivities } from '@/lib/precedence/model';
import type { EditorDoc } from '@/state/editor-reducer';
import { type ColoringExample, exampleGraph } from './coloring-examples';
import type { PrecedenceExample } from './precedence-examples';

/** Documento listo para Colorear: el dibujo del ejemplo si lo trae, o la distribución automática. */
export function coloringExampleDoc(ex: ColoringExample): EditorDoc {
  const graph = exampleGraph(ex);
  const positions = ex.layout ? fromNormalized(ex.layout, WORLD_BOX) : autoLayout(graph, WORLD_BOX);
  return { graph, positions };
}

/** Documento listo para Precedencias, dibujado por etapas. Lanza si el ejemplo tiene errores. */
export function precedenceExampleDoc(ex: PrecedenceExample): EditorDoc {
  const { graph, info } = graphFromActivities(ex.activities);
  const analysis = analyzePrecedence(graph, info);
  if (!analysis.valid) throw new Error(`Ejemplo de precedencias inválido "${ex.id}"`);
  const positions = layeredLayout(graph, analysis.stages.stageOf, WORLD_BOX);
  return { graph, positions, activities: info, unit: ex.unit };
}
