import { isProperColoring } from '@/lib/coloring/validate';
import { exampleGraph, findExample } from '@/lib/examples/coloring-examples';
import { addEdge, graphKey } from '@/lib/graph/graph';
import { activeBridge, stageBridge } from '../bridge';
import { graphFromActivities } from '../model';
import { computeStages } from '../stages';
import { HOMEWORK } from '../__fixtures__/activities';

describe('stageBridge: la tarea', () => {
  const { graph: directed } = graphFromActivities(HOMEWORK);
  const { graph, bridge } = stageBridge(directed, computeStages(HOMEWORK), HOMEWORK);

  it('es el grafo sin direcciones del ejemplo de coloración', () => {
    expect(graph.directed).toBe(false);
    expect(graph.edges).toHaveLength(16);
    expect(graphKey(graph)).toBe(graphKey(exampleGraph(findExample('homework'))));
    expect(bridge.key).toBe(graphKey(graph));
  });

  it('las etapas son una coloración propia con 8 colores', () => {
    expect(isProperColoring(graph, bridge.coloring)).toBe(true);
    expect(new Set(Object.values(bridge.coloring)).size).toBe(8);
    expect(bridge.stageCount).toBe(8);
    expect(bridge.longestPath).toEqual(['A', 'B', 'C', 'E', 'G', 'J', 'K', 'M']);
  });

  it('solo vale mientras el grafo de Colorear no cambie', () => {
    expect(activeBridge(bridge, graph)).toBe(bridge);
    const edited = addEdge(graph, 'A', 'M');
    if (!edited.ok) throw new Error('arista inválida');
    expect(activeBridge(bridge, edited.graph)).toBeNull();
    expect(activeBridge(null, graph)).toBeNull();
  });
});
